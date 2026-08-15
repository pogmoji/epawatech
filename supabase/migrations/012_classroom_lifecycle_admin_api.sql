-- ============================================================
-- Migration 012 — Classroom lifecycle and Admin classroom API
-- ePawatech — Stage 2
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Required schema change:
-- - Add the classroom pending state.
-- - Allow trainer_assignments to represent Trainer -> Centre + Cohort before
--   a classroom exists.
-- - Replace automatic active classroom lead assignment with controlled RPCs.
--
-- Why required:
-- Trainer-created classrooms must wait for Admin activation, and Trainers must
-- be authorized for a Centre/Cohort before creating classroom records.

-- ─── Classroom status: add pending safely ───────────────────
ALTER TABLE classrooms
  ALTER COLUMN status DROP DEFAULT;

ALTER TYPE classroom_status RENAME TO classroom_status_old;

CREATE TYPE classroom_status AS ENUM (
  'pending',
  'active',
  'completed',
  'archived'
);

ALTER TABLE classrooms
  ALTER COLUMN status TYPE classroom_status
  USING status::TEXT::classroom_status;

ALTER TABLE classrooms
  ALTER COLUMN status SET DEFAULT 'pending';

DROP TYPE classroom_status_old;

-- ─── Trainer assignment scope ───────────────────────────────
ALTER TABLE trainer_assignments
  ADD COLUMN centre_id UUID REFERENCES centres(id) ON DELETE RESTRICT,
  ADD COLUMN cohort_id UUID REFERENCES cohorts(id) ON DELETE RESTRICT;

ALTER TABLE trainer_assignments
  ALTER COLUMN classroom_id DROP NOT NULL;

ALTER TABLE trainer_assignments
  ADD CONSTRAINT chk_trainer_assignment_scope
  CHECK (
    classroom_id IS NOT NULL
    OR (centre_id IS NOT NULL AND cohort_id IS NOT NULL)
  );

CREATE INDEX idx_ta_centre_id ON trainer_assignments (centre_id);
CREATE INDEX idx_ta_cohort_id ON trainer_assignments (cohort_id);

CREATE UNIQUE INDEX uidx_one_active_trainer_cohort_assignment
  ON trainer_assignments (trainer_id, cohort_id, role)
  WHERE classroom_id IS NULL AND status = 'active';

COMMENT ON COLUMN trainer_assignments.centre_id IS
  'Organizational Trainer -> Centre assignment scope used before a classroom exists.';

COMMENT ON COLUMN trainer_assignments.cohort_id IS
  'Organizational Trainer -> Cohort assignment scope used before a classroom exists.';

COMMENT ON COLUMN trainer_assignments.classroom_id IS
  'Classroom placement. NULL means this row is a pre-classroom Centre/Cohort assignment.';

CREATE OR REPLACE FUNCTION public.guard_trainer_assignment_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_centre_id UUID;
BEGIN
  IF NEW.cohort_id IS NOT NULL THEN
    SELECT centre_id INTO expected_centre_id
    FROM public.cohorts
    WHERE id = NEW.cohort_id;

    IF expected_centre_id IS NULL THEN
      RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002';
    END IF;

    IF NEW.centre_id IS NULL THEN
      NEW.centre_id := expected_centre_id;
    ELSIF NEW.centre_id <> expected_centre_id THEN
      RAISE EXCEPTION 'Trainer assignment centre must match cohort centre'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.classroom_id IS NULL
     AND (NEW.centre_id IS NULL OR NEW.cohort_id IS NULL) THEN
    RAISE EXCEPTION 'Pre-classroom assignments require centre_id and cohort_id'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_trainer_assignment_scope
  BEFORE INSERT OR UPDATE ON trainer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_trainer_assignment_scope();

-- ─── RLS helpers aware of pre-classroom assignments ─────────
CREATE OR REPLACE FUNCTION public.is_active_trainer_for_cohort(p_cohort_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_assignments ta
    JOIN public.profiles p ON p.id = ta.trainer_id
    WHERE ta.trainer_id = auth.uid()
      AND ta.cohort_id = p_cohort_id
      AND ta.classroom_id IS NULL
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_trainer_for_centre(p_centre_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_assignments ta
    JOIN public.profiles p ON p.id = ta.trainer_id
    WHERE ta.trainer_id = auth.uid()
      AND ta.centre_id = p_centre_id
      AND ta.classroom_id IS NULL
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.trainer_assignments ta
    JOIN public.classrooms c ON c.id = ta.classroom_id
    JOIN public.cohorts co ON co.id = c.cohort_id
    JOIN public.profiles p ON p.id = ta.trainer_id
    WHERE ta.trainer_id = auth.uid()
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
      AND co.centre_id = p_centre_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_trainer_for_cohort(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_trainer_for_cohort(UUID) TO authenticated;

-- ─── Replace unsafe automatic lead assignment ───────────────
DROP TRIGGER IF EXISTS on_classroom_created ON classrooms;
DROP FUNCTION IF EXISTS public.create_lead_assignment_for_classroom();

CREATE OR REPLACE FUNCTION public.guard_classroom_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND current_setting('app.allow_classroom_lifecycle', TRUE) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Use the classroom lifecycle RPCs to change classroom status'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an active admin can move a classroom to another cohort'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.join_code_hash IS DISTINCT FROM OLD.join_code_hash
       AND current_setting('app.allow_join_code_rotation', TRUE) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Use rotate_classroom_join_code to change a join code'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS classrooms_insert_active_trainer ON classrooms;
DROP POLICY IF EXISTS classrooms_insert_authorized_trainer_pending ON classrooms;

CREATE OR REPLACE FUNCTION public.new_classroom_join_code()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
$$;

CREATE OR REPLACE FUNCTION public.hash_classroom_join_code(p_join_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(digest(upper(trim(p_join_code)), 'sha256'), 'hex');
$$;

-- ─── Admin: assign trainer to Centre + Cohort ───────────────
CREATE OR REPLACE FUNCTION public.admin_assign_trainer_to_cohort(
  p_trainer_id UUID,
  p_cohort_id UUID,
  p_role assignment_role DEFAULT 'lead'
)
RETURNS trainer_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_assignment public.trainer_assignments;
  target_centre_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can assign trainers to cohorts'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_trainer_id AND role = 'trainer' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Trainer must be active before assignment'
      USING ERRCODE = '22023';
  END IF;

  SELECT centre_id INTO target_centre_id
  FROM public.cohorts
  WHERE id = p_cohort_id;

  IF target_centre_id IS NULL THEN
    RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.trainer_assignments (
    trainer_id, centre_id, cohort_id, classroom_id, role, status, start_date
  )
  VALUES (
    p_trainer_id, target_centre_id, p_cohort_id, NULL, p_role, 'active', CURRENT_DATE
  )
  RETURNING * INTO target_assignment;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'trainer_assigned_to_cohort', 'trainer_assignment', target_assignment.id,
    to_jsonb(target_assignment),
    jsonb_build_object('trainer_id', p_trainer_id, 'cohort_id', p_cohort_id, 'centre_id', target_centre_id)
  );

  RETURN target_assignment;
END;
$$;

-- ─── Admin: create classroom ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_classroom(
  p_cohort_id UUID,
  p_name TEXT,
  p_initial_status classroom_status DEFAULT 'pending',
  p_trainer_id UUID DEFAULT NULL
)
RETURNS TABLE (classroom_id UUID, join_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  plain_code TEXT := public.new_classroom_join_code();
  target_classroom public.classrooms;
  target_assignment public.trainer_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can create classrooms'
      USING ERRCODE = '42501';
  END IF;

  IF p_initial_status NOT IN ('pending', 'active') THEN
    RAISE EXCEPTION 'Classrooms can only be created as pending or active'
      USING ERRCODE = '22023';
  END IF;

  IF trim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Classroom name is required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cohorts WHERE id = p_cohort_id) THEN
    RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_trainer_id IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM public.trainer_assignments ta
      JOIN public.profiles p ON p.id = ta.trainer_id
      WHERE ta.trainer_id = p_trainer_id
        AND ta.cohort_id = p_cohort_id
        AND ta.classroom_id IS NULL
        AND ta.status = 'active'
        AND p.role = 'trainer'
        AND p.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Trainer must have an active Centre/Cohort assignment first'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.classrooms (cohort_id, name, status, join_code_hash, created_by)
  VALUES (p_cohort_id, trim(p_name), p_initial_status, public.hash_classroom_join_code(plain_code), auth.uid())
  RETURNING * INTO target_classroom;

  IF p_trainer_id IS NOT NULL THEN
    INSERT INTO public.trainer_assignments (
      trainer_id, classroom_id, role, status, start_date
    )
    VALUES (
      p_trainer_id, target_classroom.id, 'lead',
      CASE WHEN p_initial_status = 'active' THEN 'active'::assignment_status ELSE 'pending'::assignment_status END,
      CASE WHEN p_initial_status = 'active' THEN CURRENT_DATE ELSE NULL END
    )
    RETURNING * INTO target_assignment;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'classroom_created_by_admin', 'classroom', target_classroom.id,
    to_jsonb(target_classroom),
    jsonb_build_object('cohort_id', p_cohort_id, 'trainer_id', p_trainer_id, 'assignment_id', target_assignment.id)
  );

  classroom_id := target_classroom.id;
  join_code := plain_code;
  RETURN NEXT;
END;
$$;

-- ─── Trainer: create pending classroom from assignment ──────
CREATE OR REPLACE FUNCTION public.trainer_create_classroom(
  p_cohort_id UUID,
  p_name TEXT
)
RETURNS TABLE (classroom_id UUID, join_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  plain_code TEXT := public.new_classroom_join_code();
  target_classroom public.classrooms;
  target_assignment public.trainer_assignments;
BEGIN
  IF NOT public.is_active_trainer_for_cohort(p_cohort_id) THEN
    RAISE EXCEPTION 'Trainer is not assigned to this cohort'
      USING ERRCODE = '42501';
  END IF;

  IF trim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Classroom name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.classrooms (cohort_id, name, status, join_code_hash, created_by)
  VALUES (p_cohort_id, trim(p_name), 'pending', public.hash_classroom_join_code(plain_code), auth.uid())
  RETURNING * INTO target_classroom;

  INSERT INTO public.trainer_assignments (
    trainer_id, classroom_id, role, status
  )
  VALUES (
    auth.uid(), target_classroom.id, 'lead', 'pending'
  )
  RETURNING * INTO target_assignment;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'classroom_created_by_trainer', 'classroom', target_classroom.id,
    to_jsonb(target_classroom),
    jsonb_build_object('cohort_id', p_cohort_id, 'assignment_id', target_assignment.id)
  );

  classroom_id := target_classroom.id;
  join_code := plain_code;
  RETURN NEXT;
END;
$$;

-- ─── Admin lifecycle and assignment RPCs ────────────────────
CREATE OR REPLACE FUNCTION public.admin_activate_classroom(
  p_classroom_id UUID,
  p_trainer_id UUID DEFAULT NULL
)
RETURNS classrooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_classroom public.classrooms;
  pending_assignment public.trainer_assignments;
  target_assignment public.trainer_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can activate classrooms'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_classroom
  FROM public.classrooms
  WHERE id = p_classroom_id;

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_classroom.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending classrooms can be activated'
      USING ERRCODE = '22023';
  END IF;

  IF p_trainer_id IS NOT NULL THEN
    SELECT * INTO pending_assignment
    FROM public.trainer_assignments
    WHERE classroom_id = p_classroom_id
      AND trainer_id = p_trainer_id
      AND role = 'lead'
      AND status = 'pending'
    ORDER BY created_at
    LIMIT 1;

    IF pending_assignment.id IS NOT NULL THEN
      UPDATE public.trainer_assignments
      SET status = 'active', start_date = CURRENT_DATE, end_date = NULL
      WHERE id = pending_assignment.id
      RETURNING * INTO target_assignment;
    END IF;
  ELSE
    SELECT * INTO pending_assignment
    FROM public.trainer_assignments
    WHERE classroom_id = p_classroom_id AND role = 'lead' AND status = 'pending'
    ORDER BY created_at
    LIMIT 1;

    IF pending_assignment.id IS NOT NULL THEN
      UPDATE public.trainer_assignments
      SET status = 'active', start_date = CURRENT_DATE, end_date = NULL
      WHERE id = pending_assignment.id
      RETURNING * INTO target_assignment;
    END IF;
  END IF;

  PERFORM set_config('app.allow_classroom_lifecycle', 'true', TRUE);
  UPDATE public.classrooms
  SET status = 'active'
  WHERE id = p_classroom_id
  RETURNING * INTO target_classroom;

  IF p_trainer_id IS NOT NULL AND target_assignment.id IS NULL THEN
    PERFORM public.admin_assign_trainer_to_classroom(p_classroom_id, p_trainer_id, 'lead');
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, after_data, metadata
  )
  VALUES (
    auth.uid(), 'classroom_activated', 'classroom', p_classroom_id,
    jsonb_build_object('status', 'pending'),
    to_jsonb(target_classroom),
    jsonb_build_object('trainer_id', p_trainer_id)
  );

  RETURN target_classroom;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_trainer_to_classroom(
  p_classroom_id UUID,
  p_trainer_id UUID,
  p_role assignment_role DEFAULT 'lead'
)
RETURNS trainer_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_classroom public.classrooms;
  new_assignment public.trainer_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can assign trainers to classrooms'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_classroom
  FROM public.classrooms
  WHERE id = p_classroom_id;

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_classroom.status = 'archived' THEN
    RAISE EXCEPTION 'Archived classrooms cannot receive new trainer assignments'
      USING ERRCODE = '22023';
  END IF;

  IF p_role = 'lead'
     AND EXISTS (
      SELECT 1 FROM public.trainer_assignments
      WHERE classroom_id = p_classroom_id AND role = 'lead' AND status = 'active'
     ) THEN
    RAISE EXCEPTION 'Use reassign when a classroom already has an active lead trainer'
      USING ERRCODE = '23505';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trainer_assignments ta
    JOIN public.profiles p ON p.id = ta.trainer_id
    WHERE ta.trainer_id = p_trainer_id
      AND ta.cohort_id = target_classroom.cohort_id
      AND ta.classroom_id IS NULL
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Trainer must have an active Centre/Cohort assignment first'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.trainer_assignments (
    trainer_id, classroom_id, role, status, start_date
  )
  VALUES (
    p_trainer_id, p_classroom_id, p_role,
    CASE WHEN target_classroom.status = 'active' THEN 'active'::assignment_status ELSE 'pending'::assignment_status END,
    CASE WHEN target_classroom.status = 'active' THEN CURRENT_DATE ELSE NULL END
  )
  RETURNING * INTO new_assignment;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'trainer_assigned_to_classroom', 'trainer_assignment', new_assignment.id,
    to_jsonb(new_assignment),
    jsonb_build_object('trainer_id', p_trainer_id, 'classroom_id', p_classroom_id, 'role', p_role)
  );

  RETURN new_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reassign_trainer_to_classroom(
  p_classroom_id UUID,
  p_trainer_id UUID
)
RETURNS trainer_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  old_assignment JSONB;
  new_assignment public.trainer_assignments;
  target_classroom public.classrooms;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can reassign trainers'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_classroom
  FROM public.classrooms
  WHERE id = p_classroom_id;

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT to_jsonb(ta) INTO old_assignment
  FROM public.trainer_assignments ta
  WHERE ta.classroom_id = p_classroom_id
    AND ta.role = 'lead'
    AND ta.status = 'active'
  ORDER BY ta.created_at
  LIMIT 1;

  UPDATE public.trainer_assignments
  SET status = 'completed', end_date = CURRENT_DATE
  WHERE classroom_id = p_classroom_id
    AND role = 'lead'
    AND status = 'active';

  SELECT * INTO new_assignment
  FROM public.admin_assign_trainer_to_classroom(p_classroom_id, p_trainer_id, 'lead');

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, after_data, metadata
  )
  VALUES (
    auth.uid(), 'trainer_reassigned', 'trainer_assignment', new_assignment.id,
    old_assignment,
    to_jsonb(new_assignment),
    jsonb_build_object('classroom_id', p_classroom_id, 'trainer_id', p_trainer_id)
  );

  RETURN new_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_classroom(p_classroom_id UUID)
RETURNS classrooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_classroom JSONB;
  target_classroom public.classrooms;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can complete classrooms'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_classroom
  FROM public.classrooms
  WHERE id = p_classroom_id;

  before_classroom := to_jsonb(target_classroom);

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_classroom.status <> 'active' THEN
    RAISE EXCEPTION 'Only active classrooms can be completed'
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.allow_classroom_lifecycle', 'true', TRUE);
  UPDATE public.classrooms
  SET status = 'completed'
  WHERE id = p_classroom_id
  RETURNING * INTO target_classroom;

  UPDATE public.trainer_assignments
  SET status = 'completed', end_date = CURRENT_DATE
  WHERE classroom_id = p_classroom_id AND status = 'active';

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, after_data
  )
  VALUES (
    auth.uid(), 'classroom_completed', 'classroom', p_classroom_id,
    before_classroom, to_jsonb(target_classroom)
  );

  RETURN target_classroom;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_classroom(p_classroom_id UUID)
RETURNS classrooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_classroom JSONB;
  target_classroom public.classrooms;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can archive classrooms'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_classroom
  FROM public.classrooms
  WHERE id = p_classroom_id;

  before_classroom := to_jsonb(target_classroom);

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_classroom.status NOT IN ('completed', 'active') THEN
    RAISE EXCEPTION 'Only active or completed classrooms can be archived'
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.allow_classroom_lifecycle', 'true', TRUE);
  UPDATE public.classrooms
  SET status = 'archived'
  WHERE id = p_classroom_id
  RETURNING * INTO target_classroom;

  UPDATE public.trainer_assignments
  SET status = 'completed', end_date = CURRENT_DATE
  WHERE classroom_id = p_classroom_id AND status = 'active';

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, after_data
  )
  VALUES (
    auth.uid(), 'classroom_archived', 'classroom', p_classroom_id,
    before_classroom, to_jsonb(target_classroom)
  );

  RETURN target_classroom;
END;
$$;

REVOKE ALL ON FUNCTION public.new_classroom_join_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hash_classroom_join_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_assign_trainer_to_cohort(UUID, UUID, assignment_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_classroom(UUID, TEXT, classroom_status, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trainer_create_classroom(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_activate_classroom(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_assign_trainer_to_classroom(UUID, UUID, assignment_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reassign_trainer_to_classroom(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_complete_classroom(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_archive_classroom(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_assign_trainer_to_cohort(UUID, UUID, assignment_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_classroom(UUID, TEXT, classroom_status, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trainer_create_classroom(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_classroom(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_trainer_to_classroom(UUID, UUID, assignment_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_trainer_to_classroom(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_classroom(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_classroom(UUID) TO authenticated;

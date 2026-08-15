-- ============================================================
-- Migration 021 — Multi-trainer classroom management
-- ePawatech — Phase 2 trainer operations support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- The existing trainer_assignments table already models classroom trainers as
-- a relationship table and already enforces one active Lead Trainer per
-- classroom. This migration keeps that model and adds admin-safe operations for
-- multiple trainers:
--
-- - add a classroom trainer without replacing the Lead Trainer;
-- - promote an assigned trainer to Lead while keeping the previous Lead active
--   as a co-teacher;
-- - remove a trainer assignment without deleting classroom history.

CREATE UNIQUE INDEX IF NOT EXISTS uidx_one_active_trainer_per_classroom
  ON trainer_assignments (classroom_id, trainer_id)
  WHERE classroom_id IS NOT NULL
    AND status = 'active';

CREATE OR REPLACE FUNCTION public.admin_assign_trainer_to_classroom(
  p_classroom_id UUID,
  p_trainer_id UUID,
  p_role assignment_role DEFAULT 'co_teacher'
)
RETURNS trainer_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_classroom public.classrooms;
  existing_assignment public.trainer_assignments;
  saved_assignment public.trainer_assignments;
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
    RAISE EXCEPTION 'Use Make Lead when a classroom already has an active lead trainer'
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

  SELECT * INTO existing_assignment
  FROM public.trainer_assignments
  WHERE classroom_id = p_classroom_id
    AND trainer_id = p_trainer_id
    AND status IN ('active', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_assignment.id IS NOT NULL THEN
    UPDATE public.trainer_assignments
    SET role = p_role,
        status = CASE WHEN target_classroom.status = 'active'
          THEN 'active'::assignment_status
          ELSE 'pending'::assignment_status
        END,
        start_date = CASE WHEN target_classroom.status = 'active'
          THEN COALESCE(start_date, CURRENT_DATE)
          ELSE start_date
        END,
        end_date = NULL
    WHERE id = existing_assignment.id
    RETURNING * INTO saved_assignment;
  ELSE
    INSERT INTO public.trainer_assignments (
      trainer_id, classroom_id, role, status, start_date
    )
    VALUES (
      p_trainer_id,
      p_classroom_id,
      p_role,
      CASE WHEN target_classroom.status = 'active'
        THEN 'active'::assignment_status
        ELSE 'pending'::assignment_status
      END,
      CASE WHEN target_classroom.status = 'active' THEN CURRENT_DATE ELSE NULL END
    )
    RETURNING * INTO saved_assignment;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'trainer_assigned_to_classroom', 'trainer_assignment', saved_assignment.id,
    to_jsonb(saved_assignment),
    jsonb_build_object('trainer_id', p_trainer_id, 'classroom_id', p_classroom_id, 'role', p_role)
  );

  RETURN saved_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_classroom_lead(
  p_classroom_id UUID,
  p_trainer_id UUID
)
RETURNS trainer_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_lead JSONB;
  next_lead public.trainer_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can change the Lead Trainer'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND status <> 'archived'
  ) THEN
    RAISE EXCEPTION 'Classroom not found or archived' USING ERRCODE = 'P0002';
  END IF;

  SELECT to_jsonb(ta) INTO before_lead
  FROM public.trainer_assignments ta
  WHERE ta.classroom_id = p_classroom_id
    AND ta.role = 'lead'
    AND ta.status = 'active'
  ORDER BY ta.created_at
  LIMIT 1;

  UPDATE public.trainer_assignments
  SET role = 'co_teacher'::assignment_role
  WHERE classroom_id = p_classroom_id
    AND role = 'lead'
    AND status = 'active';

  SELECT * INTO next_lead
  FROM public.trainer_assignments
  WHERE classroom_id = p_classroom_id
    AND trainer_id = p_trainer_id
    AND status IN ('active', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  IF next_lead.id IS NULL THEN
    SELECT * INTO next_lead
    FROM public.admin_assign_trainer_to_classroom(p_classroom_id, p_trainer_id, 'lead');
  ELSE
    UPDATE public.trainer_assignments
    SET role = 'lead'::assignment_role,
        status = 'active'::assignment_status,
        start_date = COALESCE(start_date, CURRENT_DATE),
        end_date = NULL
    WHERE id = next_lead.id
    RETURNING * INTO next_lead;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, after_data, metadata
  )
  VALUES (
    auth.uid(), 'classroom_lead_changed', 'trainer_assignment', next_lead.id,
    before_lead,
    to_jsonb(next_lead),
    jsonb_build_object('classroom_id', p_classroom_id, 'trainer_id', p_trainer_id)
  );

  RETURN next_lead;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_trainer_from_classroom(
  p_classroom_id UUID,
  p_trainer_id UUID
)
RETURNS trainer_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  removed_assignment public.trainer_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can remove classroom trainers'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.trainer_assignments
    WHERE classroom_id = p_classroom_id
      AND trainer_id = p_trainer_id
      AND role = 'lead'
      AND status = 'active'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.trainer_assignments
    WHERE classroom_id = p_classroom_id
      AND trainer_id <> p_trainer_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Assign another Lead Trainer before removing the only active trainer'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.trainer_assignments
  SET status = 'completed'::assignment_status,
      end_date = CURRENT_DATE
  WHERE classroom_id = p_classroom_id
    AND trainer_id = p_trainer_id
    AND status = 'active'
  RETURNING * INTO removed_assignment;

  IF removed_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Active classroom trainer assignment not found'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'trainer_removed_from_classroom', 'trainer_assignment', removed_assignment.id,
    to_jsonb(removed_assignment),
    jsonb_build_object('classroom_id', p_classroom_id, 'trainer_id', p_trainer_id)
  );

  RETURN removed_assignment;
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
BEGIN
  RETURN public.admin_change_classroom_lead(p_classroom_id, p_trainer_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_classroom_lead(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_remove_trainer_from_classroom(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_classroom_lead(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_trainer_from_classroom(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_change_classroom_lead(UUID, UUID) IS
  'Promotes an assigned classroom trainer to Lead Trainer and keeps the previous Lead active as co-teacher.';

COMMENT ON FUNCTION public.admin_remove_trainer_from_classroom(UUID, UUID) IS
  'Completes a trainer classroom assignment without deleting classroom operational history.';

-- ============================================================
-- Migration 009 — Auth, timestamps, and safe join-code RPCs
-- ePawatech — Stage 2
-- ============================================================
-- This migration is deliberately named after RLS (008). The auth trigger and
-- SECURITY DEFINER functions bypass table RLS only after performing their own
-- actor and relationship checks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep updated_at accurate without trusting a browser-provided timestamp.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_centres_updated_at
  BEFORE UPDATE ON centres FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_cohorts_updated_at
  BEFORE UPDATE ON cohorts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_classrooms_updated_at
  BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_trainer_assignments_updated_at
  BEFORE UPDATE ON trainer_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_student_enrollments_updated_at
  BEFORE UPDATE ON student_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_classroom_curriculum_items_updated_at
  BEFORE UPDATE ON classroom_curriculum_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_classroom_curriculum_overrides_updated_at
  BEFORE UPDATE ON classroom_curriculum_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_challenge_assignments_updated_at
  BEFORE UPDATE ON challenge_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_hardware_sessions_updated_at
  BEFORE UPDATE ON hardware_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_hardware_session_outcomes_updated_at
  BEFORE UPDATE ON hardware_session_outcomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_weekly_student_comments_updated_at
  BEFORE UPDATE ON weekly_student_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS controls which rows may be changed. These trigger guards protect the
-- sensitive columns that row policies alone cannot make column-specific.
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Only an active admin can change profile role or status'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.guard_classroom_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.cohort_id IS DISTINCT FROM OLD.cohort_id THEN
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

CREATE TRIGGER guard_classrooms_sensitive_columns
  BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION public.guard_classroom_update();

-- Students may save drafts and submit their own project, but must never be
-- able to approve/reject it themselves. Trainer review is handled by the RPC
-- below, after its classroom-assignment check.
CREATE OR REPLACE FUNCTION public.guard_project_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND current_setting('app.allow_project_review', TRUE) IS DISTINCT FROM 'true'
     AND NEW.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Only an authorized trainer or admin can approve or reject a project'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_projects_status
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION public.guard_project_status_update();

-- Auth is the only source of profile IDs. Public sign-up can choose trainer or
-- student, but can never self-assign the admin role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'student');
BEGIN
  INSERT INTO public.profiles (id, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN requested_role = 'trainer' THEN 'trainer'::app_role ELSE 'student'::app_role END,
    CASE WHEN requested_role = 'trainer' THEN 'pending'::profile_status ELSE 'active'::profile_status END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- A trainer-created classroom receives its active lead assignment atomically.
CREATE OR REPLACE FUNCTION public.create_lead_assignment_for_classroom()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.created_by AND role = 'trainer' AND status = 'active'
  ) THEN
    INSERT INTO public.trainer_assignments (trainer_id, classroom_id, role, status, start_date)
    VALUES (NEW.created_by, NEW.id, 'lead', 'active', CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_classroom_created
  AFTER INSERT ON classrooms
  FOR EACH ROW EXECUTE FUNCTION public.create_lead_assignment_for_classroom();

-- Join codes are SHA-256 digests of a high-entropy, server-generated code.
-- Plain codes are returned only by rotate_classroom_join_code and are never stored.
CREATE OR REPLACE FUNCTION public.rotate_classroom_join_code(p_classroom_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  plain_code TEXT := upper(encode(gen_random_bytes(12), 'hex'));
BEGIN
  IF NOT public.is_active_trainer_for_classroom(p_classroom_id) THEN
    RAISE EXCEPTION 'Not authorized to rotate this classroom join code'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.allow_join_code_rotation', 'true', TRUE);
  UPDATE public.classrooms
  SET join_code_hash = encode(digest(plain_code, 'sha256'), 'hex')
  WHERE id = p_classroom_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN plain_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_classroom_by_code(p_join_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_classroom_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active students can join a classroom' USING ERRCODE = '42501';
  END IF;

  SELECT c.id INTO target_classroom_id
  FROM public.classrooms c
  JOIN public.cohorts co ON co.id = c.cohort_id
  WHERE c.join_code_hash = encode(digest(upper(trim(p_join_code)), 'sha256'), 'hex')
    AND c.status = 'active'
    AND co.status = 'active';

  IF target_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive classroom join code' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.student_enrollments (student_id, classroom_id, status, joined_via_code, start_date)
  VALUES (auth.uid(), target_classroom_id, 'active', TRUE, CURRENT_DATE);

  RETURN target_classroom_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_project(p_project_id UUID, p_status project_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  project_classroom_id UUID;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Project reviews must be approved or rejected' USING ERRCODE = '22023';
  END IF;

  SELECT classroom_id INTO project_classroom_id
  FROM public.projects
  WHERE id = p_project_id;

  IF project_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Project not found or is not assigned to a classroom' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_active_trainer_for_classroom(project_classroom_id) THEN
    RAISE EXCEPTION 'Not authorized to review this project' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.allow_project_review', 'true', TRUE);
  UPDATE public.projects SET status = p_status WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_classroom_join_code(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_classroom_by_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_project(UUID, project_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_classroom_join_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_project(UUID, project_status) TO authenticated;

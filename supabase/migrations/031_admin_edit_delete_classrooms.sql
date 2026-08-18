-- ============================================================
-- Migration 031 — Admin edit and delete classrooms
-- ePawatech
-- ============================================================
-- Adds admin-safe RPCs for editing classroom/cohort details and permanently
-- deleting a classroom created in error.

CREATE OR REPLACE FUNCTION public.admin_update_classroom_details(
  p_classroom_id UUID,
  p_classroom_name TEXT,
  p_classroom_status classroom_status,
  p_cohort_name TEXT,
  p_cohort_status cohort_status,
  p_cohort_start_date DATE DEFAULT NULL,
  p_cohort_end_date DATE DEFAULT NULL
)
RETURNS classrooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_classroom JSONB;
  before_cohort JSONB;
  target_classroom public.classrooms;
  target_cohort public.cohorts;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can edit classroom details'
      USING ERRCODE = '42501';
  END IF;

  IF trim(COALESCE(p_classroom_name, '')) = '' THEN
    RAISE EXCEPTION 'Classroom name is required' USING ERRCODE = '22023';
  END IF;

  IF trim(COALESCE(p_cohort_name, '')) = '' THEN
    RAISE EXCEPTION 'Cohort name is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target_classroom
  FROM public.classrooms
  WHERE id = p_classroom_id;

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO target_cohort
  FROM public.cohorts
  WHERE id = target_classroom.cohort_id;

  IF target_cohort.id IS NULL THEN
    RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002';
  END IF;

  before_classroom := to_jsonb(target_classroom);
  before_cohort := to_jsonb(target_cohort);

  UPDATE public.cohorts
  SET name = trim(p_cohort_name),
      status = p_cohort_status,
      start_date = p_cohort_start_date,
      end_date = p_cohort_end_date
  WHERE id = target_cohort.id
  RETURNING * INTO target_cohort;

  PERFORM set_config('app.allow_classroom_lifecycle', 'true', TRUE);
  UPDATE public.classrooms
  SET name = trim(p_classroom_name),
      status = p_classroom_status
  WHERE id = p_classroom_id
  RETURNING * INTO target_classroom;

  UPDATE public.trainer_assignments
  SET status = CASE
        WHEN p_classroom_status = 'active' THEN 'active'::assignment_status
        WHEN p_classroom_status = 'pending' THEN 'pending'::assignment_status
        ELSE 'completed'::assignment_status
      END,
      start_date = CASE
        WHEN p_classroom_status = 'active' THEN COALESCE(start_date, CURRENT_DATE)
        ELSE start_date
      END,
      end_date = CASE
        WHEN p_classroom_status IN ('completed', 'archived') THEN CURRENT_DATE
        ELSE NULL
      END
  WHERE classroom_id = p_classroom_id
    AND status IN ('active', 'pending');

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, after_data, metadata
  )
  VALUES (
    auth.uid(), 'classroom_details_updated', 'classroom', p_classroom_id,
    jsonb_build_object('classroom', before_classroom, 'cohort', before_cohort),
    jsonb_build_object('classroom', to_jsonb(target_classroom), 'cohort', to_jsonb(target_cohort)),
    jsonb_build_object('cohort_id', target_cohort.id)
  );

  RETURN target_classroom;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_classroom(p_classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_classroom JSONB;
  before_assignments JSONB;
  before_enrollments JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can delete classrooms'
      USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(c) INTO before_classroom
  FROM public.classrooms c
  WHERE c.id = p_classroom_id;

  IF before_classroom IS NULL THEN
    RAISE EXCEPTION 'Classroom not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(ta)), '[]'::jsonb) INTO before_assignments
  FROM public.trainer_assignments ta
  WHERE ta.classroom_id = p_classroom_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(se)), '[]'::jsonb) INTO before_enrollments
  FROM public.student_enrollments se
  WHERE se.classroom_id = p_classroom_id;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, before_data, metadata
  )
  VALUES (
    auth.uid(), 'classroom_deleted', 'classroom', p_classroom_id,
    before_classroom,
    jsonb_build_object(
      'trainer_assignments', before_assignments,
      'student_enrollments', before_enrollments
    )
  );

  DELETE FROM public.trainer_assignments
  WHERE classroom_id = p_classroom_id;

  DELETE FROM public.student_enrollments
  WHERE classroom_id = p_classroom_id;

  DELETE FROM public.classrooms
  WHERE id = p_classroom_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_classroom_details(UUID, TEXT, classroom_status, TEXT, cohort_status, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_classroom(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_classroom_details(UUID, TEXT, classroom_status, TEXT, cohort_status, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_classroom(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_update_classroom_details(UUID, TEXT, classroom_status, TEXT, cohort_status, DATE, DATE) IS
  'Admin classroom editor for classroom name/status and its cohort name/status/start/end dates.';

COMMENT ON FUNCTION public.admin_delete_classroom(UUID) IS
  'Admin permanent classroom deletion for records created in error. Deletes trainer assignments and student enrollments first; classroom child records cascade or null by FK policy.';

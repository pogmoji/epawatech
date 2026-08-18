-- ============================================================
-- Migration 030 — Admin trainer email support and full assignment removal
-- ePawatech
-- ============================================================
-- Trainer login email remains in auth.users and is edited through the
-- service-role-backed Next.js admin route. This migration updates the
-- classroom remove RPC so one admin mistake-removal closes the trainer's
-- classroom placement and the matching centre/cohort assignment.

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
  target_classroom public.classrooms;
  target_cohort public.cohorts;
  removed_assignment public.trainer_assignments;
  removed_assignment_ids UUID[];
  removed_rows JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an active admin can remove classroom trainers'
      USING ERRCODE = '42501';
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

  WITH changed AS (
    UPDATE public.trainer_assignments
    SET status = 'completed'::assignment_status,
        end_date = CURRENT_DATE
    WHERE trainer_id = p_trainer_id
      AND status IN ('active', 'pending')
      AND (
        classroom_id = p_classroom_id
        OR (
          classroom_id IS NULL
          AND cohort_id = target_classroom.cohort_id
          AND centre_id = target_cohort.centre_id
        )
      )
    RETURNING *
  )
  SELECT array_agg(changed.id ORDER BY changed.classroom_id IS NULL, changed.created_at DESC),
         jsonb_agg(to_jsonb(changed) ORDER BY changed.created_at)
  INTO removed_assignment_ids, removed_rows
  FROM changed;

  SELECT * INTO removed_assignment
  FROM public.trainer_assignments
  WHERE id = removed_assignment_ids[1];

  IF removed_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Active or pending trainer assignment not found for this classroom, cohort, and centre'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, metadata
  )
  VALUES (
    auth.uid(), 'trainer_removed_from_classroom_cohort_centre', 'trainer_assignment', removed_assignment.id,
    to_jsonb(removed_assignment),
    jsonb_build_object(
      'classroom_id', p_classroom_id,
      'cohort_id', target_classroom.cohort_id,
      'centre_id', target_cohort.centre_id,
      'trainer_id', p_trainer_id,
      'removed_assignments', COALESCE(removed_rows, '[]'::jsonb)
    )
  );

  RETURN removed_assignment;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_trainer_from_classroom(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_trainer_from_classroom(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_remove_trainer_from_classroom(UUID, UUID) IS
  'Admin mistake-correction helper: completes active/pending trainer assignment rows for the classroom and its matching centre/cohort scope.';

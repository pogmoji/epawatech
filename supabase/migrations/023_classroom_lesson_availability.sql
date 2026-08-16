-- ============================================================
-- Migration 023 — Classroom lesson availability
-- ePawatech — Quick adjustments before Phase 2 Part C
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Core rule:
-- Modules are always visible/open. Individual lessons are locked/unlocked per
-- classroom. This state belongs to classroom curriculum records, not trainers.
--
-- Existing classrooms are preserved safely: current curriculum remains
-- unlocked until a trainer explicitly locks lessons.

ALTER TABLE classroom_curriculum_overrides
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE classroom_curriculum_items
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN classroom_curriculum_overrides.is_unlocked IS
  'Classroom-level availability for a master curriculum lesson. FALSE means students can see the roadmap item but cannot open the activity.';

COMMENT ON COLUMN classroom_curriculum_items.is_unlocked IS
  'Classroom-level availability for trainer-added lessons. FALSE means students can see the roadmap item but cannot open the activity.';

CREATE OR REPLACE FUNCTION public.is_classroom_lesson_unlocked(
  p_classroom_id UUID,
  p_curriculum_activity_id UUID DEFAULT NULL,
  p_classroom_curriculum_item_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN p_curriculum_activity_id IS NOT NULL THEN EXISTS (
      SELECT 1
      FROM public.lesson_activities la
      LEFT JOIN public.classroom_curriculum_overrides cco
        ON cco.classroom_id = p_classroom_id
       AND cco.master_activity_id = la.id
      WHERE la.id = p_curriculum_activity_id
        AND COALESCE(cco.removed, FALSE) = FALSE
        AND COALESCE(cco.is_unlocked, TRUE) = TRUE
    )
    WHEN p_classroom_curriculum_item_id IS NOT NULL THEN EXISTS (
      SELECT 1
      FROM public.classroom_curriculum_items cci
      WHERE cci.id = p_classroom_curriculum_item_id
        AND cci.classroom_id = p_classroom_id
        AND cci.removed = FALSE
        AND cci.state IN ('live', 'completed')
        AND cci.is_unlocked = TRUE
    )
    ELSE FALSE
  END;
$$;

REVOKE ALL ON FUNCTION public.is_classroom_lesson_unlocked(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_classroom_lesson_unlocked(UUID, UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS lesson_progress_student_write ON lesson_progress;

CREATE POLICY lesson_progress_student_write
  ON lesson_progress
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      student_id = auth.uid()
      AND public.is_active_student_in_classroom(classroom_id)
      AND (
        (
          curriculum_activity_id IS NOT NULL
          AND classroom_curriculum_item_id IS NULL
          AND public.is_classroom_lesson_unlocked(classroom_id, curriculum_activity_id, NULL)
        )
        OR (
          curriculum_activity_id IS NULL
          AND classroom_curriculum_item_id IS NOT NULL
          AND public.is_classroom_lesson_unlocked(classroom_id, NULL, classroom_curriculum_item_id)
        )
      )
    )
  );

COMMENT ON FUNCTION public.is_classroom_lesson_unlocked(UUID, UUID, UUID) IS
  'Returns whether a student may currently access/save progress for a classroom lesson. Modules are intentionally not part of this check.';

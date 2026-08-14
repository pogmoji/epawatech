-- ============================================================
-- Migration 013 — Student Learn, Join Codes, and Custom Progress
-- ePawatech — Stage 2 completion
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Scope:
-- - Allow enrolled students to read classroom curriculum overrides so the
--   effective classroom curriculum can include Trainer edits.
-- - Extend lesson_progress so one row can reference either a master
--   lesson_activities row or a classroom_curriculum_items row.
-- - Recreate secure join-code rotation for active Trainers and Admins.
--   Plain codes are returned only from this function and are never stored.

-- ─── Effective curriculum visibility for enrolled Students ───
DROP POLICY IF EXISTS classroom_curriculum_overrides_select ON classroom_curriculum_overrides;

CREATE POLICY classroom_curriculum_overrides_select
  ON classroom_curriculum_overrides
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(classroom_id)
    OR public.is_active_student_in_classroom(classroom_id)
  );

-- ─── Progress source model ───────────────────────────────────
ALTER TABLE lesson_progress
  ADD COLUMN IF NOT EXISTS classroom_curriculum_item_id UUID
    REFERENCES classroom_curriculum_items(id) ON DELETE RESTRICT;

ALTER TABLE lesson_progress
  ALTER COLUMN curriculum_activity_id DROP NOT NULL;

ALTER TABLE lesson_progress
  DROP CONSTRAINT IF EXISTS chk_lesson_progress_one_curriculum_source;

ALTER TABLE lesson_progress
  ADD CONSTRAINT chk_lesson_progress_one_curriculum_source
  CHECK (
    (
      curriculum_activity_id IS NOT NULL
      AND classroom_curriculum_item_id IS NULL
    )
    OR (
      curriculum_activity_id IS NULL
      AND classroom_curriculum_item_id IS NOT NULL
    )
  );

ALTER TABLE lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_student_classroom_custom_item_key;

ALTER TABLE lesson_progress
  ADD CONSTRAINT lesson_progress_student_classroom_custom_item_key
  UNIQUE (student_id, classroom_id, classroom_curriculum_item_id);

CREATE INDEX IF NOT EXISTS idx_lp_classroom_curriculum_item_id
  ON lesson_progress (classroom_curriculum_item_id);

COMMENT ON COLUMN lesson_progress.curriculum_activity_id IS
  'Master curriculum lesson activity. NULL when progress is for a classroom-specific curriculum item.';

COMMENT ON COLUMN lesson_progress.classroom_curriculum_item_id IS
  'Trainer-added classroom curriculum item. NULL when progress is for a master curriculum activity.';

-- Replace the broad student write policy with one that validates custom item
-- ownership/visibility at the database boundary.
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
        )
        OR (
          curriculum_activity_id IS NULL
          AND classroom_curriculum_item_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.classroom_curriculum_items cci
            WHERE cci.id = lesson_progress.classroom_curriculum_item_id
              AND cci.classroom_id = lesson_progress.classroom_id
              AND cci.origin = 'custom'
              AND cci.removed = FALSE
              AND cci.state IN ('live', 'completed')
          )
        )
      )
    )
  );

-- ─── Join-code rotation ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rotate_classroom_join_code(p_classroom_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  plain_code TEXT := public.new_classroom_join_code();
  target_classroom public.classrooms;
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(p_classroom_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to rotate this classroom join code'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.allow_join_code_rotation', 'true', TRUE);

  UPDATE public.classrooms
  SET join_code_hash = public.hash_classroom_join_code(plain_code)
  WHERE id = p_classroom_id
    AND status = 'active'
  RETURNING * INTO target_classroom;

  IF target_classroom.id IS NULL THEN
    RAISE EXCEPTION 'Active classroom not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  )
  VALUES (
    auth.uid(), 'classroom_join_code_rotated', 'classroom', p_classroom_id,
    jsonb_build_object('classroom_id', p_classroom_id)
  );

  RETURN plain_code;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_classroom_join_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_classroom_join_code(UUID) TO authenticated;

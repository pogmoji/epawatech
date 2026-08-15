-- ============================================================
-- Migration 019 — Student feedback / reflection history
-- ePawatech — Student dashboard revamp support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Students need a persistent private reflection history. Trainers and admins
-- may read it for support and oversight, but only students author and edit
-- their own entries.
--
-- This is intentionally separate from weekly_student_comments. Trainer comments
-- are trainer-authored evaluation notes; student_feedback is student-authored
-- reflection.

CREATE TABLE IF NOT EXISTS student_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  feedback_text TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_student_feedback_text
    CHECK (char_length(trim(feedback_text)) BETWEEN 2 AND 1200)
);

CREATE INDEX IF NOT EXISTS idx_student_feedback_student_id
  ON student_feedback (student_id);

CREATE INDEX IF NOT EXISTS idx_student_feedback_classroom_id
  ON student_feedback (classroom_id);

CREATE INDEX IF NOT EXISTS idx_student_feedback_created_at
  ON student_feedback (created_at DESC);

DROP TRIGGER IF EXISTS set_student_feedback_updated_at ON student_feedback;
CREATE TRIGGER set_student_feedback_updated_at
  BEFORE UPDATE ON student_feedback FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_feedback_select ON student_feedback;
DROP POLICY IF EXISTS student_feedback_insert_own ON student_feedback;
DROP POLICY IF EXISTS student_feedback_update_own ON student_feedback;

CREATE POLICY student_feedback_select
  ON student_feedback
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR (
      classroom_id IS NOT NULL
      AND public.is_active_trainer_for_classroom(classroom_id)
    )
  );

CREATE POLICY student_feedback_insert_own
  ON student_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND public.is_active_student()
    AND (
      classroom_id IS NULL
      OR public.is_active_student_in_classroom(classroom_id)
    )
  );

CREATE POLICY student_feedback_update_own
  ON student_feedback
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND public.is_active_student()
  )
  WITH CHECK (
    student_id = auth.uid()
    AND public.is_active_student()
    AND (
      classroom_id IS NULL
      OR public.is_active_student_in_classroom(classroom_id)
    )
  );

COMMENT ON TABLE student_feedback IS
  'Student-authored private learning reflections. Students can create/read/edit their own history; authorized trainers and admins have read-only access.';

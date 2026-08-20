-- ============================================================
-- Migration 032 - Student mood check-ins
-- ePawatech
-- ============================================================
-- Stores every student Happy/Sad response while allowing trainers to view
-- classroom wellbeing signals for students they actively teach.

CREATE TABLE IF NOT EXISTS student_mood_checkins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  mood         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_student_mood_checkins_mood
    CHECK (mood IN ('happy', 'sad'))
);

CREATE INDEX IF NOT EXISTS idx_student_mood_checkins_student_created
  ON student_mood_checkins (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_mood_checkins_classroom_created
  ON student_mood_checkins (classroom_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_mood_checkins_classroom_mood_created
  ON student_mood_checkins (classroom_id, mood, created_at DESC);

ALTER TABLE student_mood_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_mood_checkins_select ON student_mood_checkins;
DROP POLICY IF EXISTS student_mood_checkins_insert_own ON student_mood_checkins;

CREATE POLICY student_mood_checkins_select
  ON student_mood_checkins
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

CREATE POLICY student_mood_checkins_insert_own
  ON student_mood_checkins
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

GRANT SELECT, INSERT ON student_mood_checkins TO authenticated;

COMMENT ON TABLE student_mood_checkins IS
  'Student Happy/Sad wellbeing check-ins. Every response is stored; trainers and admins can read classroom-scoped history.';

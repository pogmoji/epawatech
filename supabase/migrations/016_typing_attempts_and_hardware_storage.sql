-- ============================================================
-- Migration 016 — Typing Attempts and Hardware Storage Policies
-- ePawatech — Hardware/WPM batch
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.

CREATE TABLE IF NOT EXISTS typing_attempts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  classroom_id           UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  curriculum_activity_id UUID REFERENCES lesson_activities(id) ON DELETE RESTRICT,
  classroom_curriculum_item_id UUID REFERENCES classroom_curriculum_items(id) ON DELETE RESTRICT,
  wpm                    INTEGER NOT NULL CHECK (wpm >= 0),
  accuracy               INTEGER NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  duration_seconds       INTEGER,
  attempted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_typing_attempt_one_source CHECK (
    (
      curriculum_activity_id IS NOT NULL
      AND classroom_curriculum_item_id IS NULL
    )
    OR (
      curriculum_activity_id IS NULL
      AND classroom_curriculum_item_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_ta_student_classroom
  ON typing_attempts (student_id, classroom_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ta_classroom_wpm
  ON typing_attempts (classroom_id, wpm DESC, accuracy DESC);

ALTER TABLE typing_attempts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON typing_attempts TO authenticated;

DROP POLICY IF EXISTS typing_attempts_select ON typing_attempts;
DROP POLICY IF EXISTS typing_attempts_student_insert ON typing_attempts;

CREATE POLICY typing_attempts_select
  ON typing_attempts
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR public.is_active_trainer_for_classroom(classroom_id)
  );

CREATE POLICY typing_attempts_student_insert
  ON typing_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
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
          WHERE cci.id = typing_attempts.classroom_curriculum_item_id
            AND cci.classroom_id = typing_attempts.classroom_id
            AND cci.removed = FALSE
            AND cci.state IN ('live', 'completed')
        )
      )
    )
  );

COMMENT ON TABLE typing_attempts IS
  'Append-only typing-test attempts. Every attempt is preserved for history, summaries, and classroom leaderboard.';

CREATE OR REPLACE FUNCTION public.get_classroom_typing_leaderboard(
  p_classroom_id UUID,
  p_min_accuracy INTEGER DEFAULT 85
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  classroom_id UUID,
  wpm INTEGER,
  accuracy INTEGER,
  duration_seconds INTEGER,
  attempted_at TIMESTAMPTZ,
  student_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(p_classroom_id)
    OR public.is_active_student_in_classroom(p_classroom_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this classroom leaderboard'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (ta.student_id)
    ta.id,
    ta.student_id,
    ta.classroom_id,
    ta.wpm,
    ta.accuracy,
    ta.duration_seconds,
    ta.attempted_at,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), p.username, 'Student') AS student_name
  FROM public.typing_attempts ta
  LEFT JOIN public.profiles p ON p.id = ta.student_id
  WHERE ta.classroom_id = p_classroom_id
    AND ta.accuracy >= p_min_accuracy
  ORDER BY ta.student_id, ta.wpm DESC, ta.accuracy DESC, ta.attempted_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_classroom_typing_leaderboard(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_classroom_typing_leaderboard(UUID, INTEGER) TO authenticated;

-- Storage bucket and policies for hardware evidence. Supabase Storage policy
-- syntax depends on the Storage schema being available in the project.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hardware-evidence', 'hardware-evidence', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS hardware_evidence_storage_select ON storage.objects;
DROP POLICY IF EXISTS hardware_evidence_storage_insert ON storage.objects;

CREATE POLICY hardware_evidence_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'hardware-evidence'
    AND (
      public.is_admin()
      OR public.is_active_trainer_for_classroom((storage.foldername(name))[1]::UUID)
      OR public.is_active_student_in_classroom((storage.foldername(name))[1]::UUID)
    )
  );

CREATE POLICY hardware_evidence_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hardware-evidence'
    AND public.is_active_trainer_for_classroom((storage.foldername(name))[1]::UUID)
  );

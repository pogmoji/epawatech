-- ============================================================
-- Migration 029 — Universal challenge submission expectations
-- ePawatech — admin-defined student submission flow
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Admin needs to define what kind of evidence a Universal Challenge expects,
-- and students need somewhere to submit that evidence.

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS submission_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS submission_prompt TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_file_size INTEGER NOT NULL DEFAULT 5242880;

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS chk_challenges_submission_type;

ALTER TABLE challenges
  ADD CONSTRAINT chk_challenges_submission_type
  CHECK (submission_type IN ('none', 'text', 'link', 'file', 'code', 'image'));

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS chk_challenges_submission_prompt;

ALTER TABLE challenges
  ADD CONSTRAINT chk_challenges_submission_prompt
  CHECK (char_length(submission_prompt) <= 1000);

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS chk_challenges_max_file_size;

ALTER TABLE challenges
  ADD CONSTRAINT chk_challenges_max_file_size
  CHECK (max_file_size BETWEEN 1 AND 10485760);

CREATE TABLE IF NOT EXISTS student_challenge_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  text_response TEXT,
  url_response  TEXT,
  file_path     TEXT,
  file_name     TEXT,
  file_type     TEXT,
  file_size     INTEGER,
  status        TEXT NOT NULL DEFAULT 'submitted',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, challenge_id),
  CONSTRAINT chk_student_challenge_submissions_status
    CHECK (status IN ('submitted', 'reviewed', 'accepted', 'needs_revision')),
  CONSTRAINT chk_student_challenge_submissions_text
    CHECK (text_response IS NULL OR char_length(text_response) <= 10000),
  CONSTRAINT chk_student_challenge_submissions_url
    CHECK (url_response IS NULL OR char_length(url_response) <= 500),
  CONSTRAINT chk_student_challenge_submissions_file_path
    CHECK (file_path IS NULL OR char_length(file_path) <= 500),
  CONSTRAINT chk_student_challenge_submissions_file_size
    CHECK (file_size IS NULL OR file_size <= 10485760)
);

CREATE INDEX IF NOT EXISTS idx_scs_student_id
  ON student_challenge_submissions (student_id);

CREATE INDEX IF NOT EXISTS idx_scs_challenge_id
  ON student_challenge_submissions (challenge_id);

DROP TRIGGER IF EXISTS set_student_challenge_submissions_updated_at ON student_challenge_submissions;
CREATE TRIGGER set_student_challenge_submissions_updated_at
  BEFORE UPDATE ON student_challenge_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE student_challenge_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON student_challenge_submissions TO authenticated;

DROP POLICY IF EXISTS student_challenge_submissions_select ON student_challenge_submissions;
DROP POLICY IF EXISTS student_challenge_submissions_insert ON student_challenge_submissions;
DROP POLICY IF EXISTS student_challenge_submissions_update ON student_challenge_submissions;
DROP POLICY IF EXISTS student_challenge_submissions_delete ON student_challenge_submissions;

CREATE POLICY student_challenge_submissions_select
  ON student_challenge_submissions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
  );

CREATE POLICY student_challenge_submissions_insert
  ON student_challenge_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND public.is_active_student()
    AND EXISTS (
      SELECT 1
      FROM public.challenges c
      JOIN public.challenge_levels cl ON cl.id = c.level_id
      WHERE c.id = student_challenge_submissions.challenge_id
        AND c.is_published = TRUE
        AND cl.is_active = TRUE
    )
  );

CREATE POLICY student_challenge_submissions_update
  ON student_challenge_submissions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (student_id = auth.uid() AND public.is_active_student())
  )
  WITH CHECK (
    public.is_admin()
    OR (student_id = auth.uid() AND public.is_active_student())
  );

CREATE POLICY student_challenge_submissions_delete
  ON student_challenge_submissions
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('universal-challenge-submissions', 'universal-challenge-submissions', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS universal_challenge_submissions_select ON storage.objects;
DROP POLICY IF EXISTS universal_challenge_submissions_insert ON storage.objects;
DROP POLICY IF EXISTS universal_challenge_submissions_update ON storage.objects;
DROP POLICY IF EXISTS universal_challenge_submissions_delete ON storage.objects;

CREATE POLICY universal_challenge_submissions_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'universal-challenge-submissions'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

CREATE POLICY universal_challenge_submissions_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'universal-challenge-submissions'
    AND public.is_active_student()
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY universal_challenge_submissions_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'universal-challenge-submissions'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    bucket_id = 'universal-challenge-submissions'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

CREATE POLICY universal_challenge_submissions_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'universal-challenge-submissions'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

COMMENT ON COLUMN challenges.submission_type IS
  'Admin-selected evidence type expected from students: none, text, link, file, code, or image.';

COMMENT ON TABLE student_challenge_submissions IS
  'Student evidence submitted for admin-published Universal Challenges.';

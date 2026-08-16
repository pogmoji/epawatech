-- ============================================================
-- Migration 024 — Weekly Inputs and trainer submissions
-- ePawatech — Phase 2 Part C
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Admin posts Weekly Inputs/tasks. Every active trainer submits individually.
-- This is separate from the Lead Trainer classroom weekly report.

CREATE TABLE IF NOT EXISTS weekly_topics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  instructions        TEXT NOT NULL,
  week_key            TEXT NOT NULL,
  starts_at           DATE,
  due_at              TIMESTAMPTZ NOT NULL,
  published           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_weekly_topics_title
    CHECK (char_length(trim(title)) BETWEEN 3 AND 140),
  CONSTRAINT chk_weekly_topics_instructions
    CHECK (char_length(trim(instructions)) BETWEEN 10 AND 4000),
  CONSTRAINT chk_weekly_topics_week_key
    CHECK (char_length(trim(week_key)) BETWEEN 2 AND 40)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_weekly_topics_week_key
  ON weekly_topics (week_key);

CREATE INDEX IF NOT EXISTS idx_weekly_topics_due_at
  ON weekly_topics (due_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_topics_published
  ON weekly_topics (published);

CREATE TABLE IF NOT EXISTS trainer_weekly_topic_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_topic_id UUID NOT NULL REFERENCES weekly_topics(id) ON DELETE CASCADE,
  trainer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  text_response   TEXT,
  file_path       TEXT,
  file_name       TEXT,
  file_type       TEXT,
  file_size       INTEGER,
  status          TEXT NOT NULL DEFAULT 'submitted',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (weekly_topic_id, trainer_id),
  CONSTRAINT chk_twts_status
    CHECK (status IN ('submitted', 'reviewed')),
  CONSTRAINT chk_twts_response_or_file
    CHECK (
      char_length(trim(COALESCE(text_response, ''))) >= 2
      OR file_path IS NOT NULL
    ),
  CONSTRAINT chk_twts_text_length
    CHECK (text_response IS NULL OR char_length(trim(text_response)) <= 5000),
  CONSTRAINT chk_twts_file_size
    CHECK (file_size IS NULL OR file_size <= 5242880)
);

CREATE INDEX IF NOT EXISTS idx_twts_weekly_topic_id
  ON trainer_weekly_topic_submissions (weekly_topic_id);

CREATE INDEX IF NOT EXISTS idx_twts_trainer_id
  ON trainer_weekly_topic_submissions (trainer_id);

DROP TRIGGER IF EXISTS set_weekly_topics_updated_at ON weekly_topics;
CREATE TRIGGER set_weekly_topics_updated_at
  BEFORE UPDATE ON weekly_topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_trainer_weekly_topic_submissions_updated_at ON trainer_weekly_topic_submissions;
CREATE TRIGGER set_trainer_weekly_topic_submissions_updated_at
  BEFORE UPDATE ON trainer_weekly_topic_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE weekly_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_weekly_topic_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON weekly_topics, trainer_weekly_topic_submissions TO authenticated;

DROP POLICY IF EXISTS weekly_topics_select ON weekly_topics;
DROP POLICY IF EXISTS weekly_topics_admin_write ON weekly_topics;
DROP POLICY IF EXISTS twts_select ON trainer_weekly_topic_submissions;
DROP POLICY IF EXISTS twts_trainer_write_own ON trainer_weekly_topic_submissions;
DROP POLICY IF EXISTS twts_admin_update ON trainer_weekly_topic_submissions;

CREATE POLICY weekly_topics_select
  ON weekly_topics
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (published = TRUE AND public.is_active_trainer())
  );

CREATE POLICY weekly_topics_admin_write
  ON weekly_topics
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY twts_select
  ON trainer_weekly_topic_submissions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR trainer_id = auth.uid()
  );

CREATE POLICY twts_trainer_write_own
  ON trainer_weekly_topic_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid()
    AND public.is_active_trainer()
    AND EXISTS (
      SELECT 1
      FROM public.weekly_topics wt
      WHERE wt.id = weekly_topic_id
        AND wt.published = TRUE
    )
  );

CREATE POLICY twts_trainer_update_own
  ON trainer_weekly_topic_submissions
  FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid()
    AND public.is_active_trainer()
    AND status = 'submitted'
  )
  WITH CHECK (
    trainer_id = auth.uid()
    AND public.is_active_trainer()
    AND EXISTS (
      SELECT 1
      FROM public.weekly_topics wt
      WHERE wt.id = weekly_topic_id
        AND wt.published = TRUE
    )
  );

CREATE POLICY twts_admin_update
  ON trainer_weekly_topic_submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('weekly-topic-submissions', 'weekly-topic-submissions', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS weekly_topic_submissions_storage_select ON storage.objects;
DROP POLICY IF EXISTS weekly_topic_submissions_storage_insert ON storage.objects;

CREATE POLICY weekly_topic_submissions_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'weekly-topic-submissions'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

CREATE POLICY weekly_topic_submissions_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'weekly-topic-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_trainer()
  );

COMMENT ON TABLE weekly_topics IS
  'Admin-published Weekly Inputs/tasks for individual trainer responses.';

COMMENT ON TABLE trainer_weekly_topic_submissions IS
  'Individual trainer submissions for Weekly Inputs. Separate from classroom weekly reports.';

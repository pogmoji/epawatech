-- ============================================================
-- Migration 022 — Trainer admin reports
-- ePawatech — Phase 2 trainer operations support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Trainers need a persistent channel for reporting operational concerns to
-- Admin. Email notification is only a convenience/status field; the database
-- row is the canonical record so reports are not lost if SMTP is unavailable.

CREATE TABLE IF NOT EXISTS trainer_admin_reports (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  trainer_email             TEXT,
  classroom_id              UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  category                  TEXT NOT NULL,
  priority                  TEXT NOT NULL DEFAULT 'normal',
  subject                   TEXT NOT NULL,
  message                   TEXT NOT NULL,
  attachment_path           TEXT,
  attachment_file_name      TEXT,
  attachment_mime_type      TEXT,
  attachment_file_size      INTEGER,
  status                    TEXT NOT NULL DEFAULT 'submitted',
  email_notification_status TEXT,
  email_sent_at             TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_trainer_admin_reports_category
    CHECK (category IN ('classroom', 'student', 'equipment', 'schedule', 'platform', 'centre', 'administrative', 'other')),
  CONSTRAINT chk_trainer_admin_reports_priority
    CHECK (priority IN ('normal', 'important', 'urgent')),
  CONSTRAINT chk_trainer_admin_reports_status
    CHECK (status IN ('submitted', 'reviewed', 'resolved')),
  CONSTRAINT chk_trainer_admin_reports_subject
    CHECK (char_length(trim(subject)) BETWEEN 3 AND 140),
  CONSTRAINT chk_trainer_admin_reports_message
    CHECK (char_length(trim(message)) BETWEEN 10 AND 3000),
  CONSTRAINT chk_trainer_admin_reports_attachment_size
    CHECK (attachment_file_size IS NULL OR attachment_file_size <= 5242880)
);

CREATE INDEX IF NOT EXISTS idx_trainer_admin_reports_trainer_id
  ON trainer_admin_reports (trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_admin_reports_classroom_id
  ON trainer_admin_reports (classroom_id);

CREATE INDEX IF NOT EXISTS idx_trainer_admin_reports_status
  ON trainer_admin_reports (status);

CREATE INDEX IF NOT EXISTS idx_trainer_admin_reports_created_at
  ON trainer_admin_reports (created_at DESC);

DROP TRIGGER IF EXISTS set_trainer_admin_reports_updated_at ON trainer_admin_reports;
CREATE TRIGGER set_trainer_admin_reports_updated_at
  BEFORE UPDATE ON trainer_admin_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE trainer_admin_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON trainer_admin_reports TO authenticated;

DROP POLICY IF EXISTS trainer_admin_reports_select ON trainer_admin_reports;
DROP POLICY IF EXISTS trainer_admin_reports_insert_own ON trainer_admin_reports;
DROP POLICY IF EXISTS trainer_admin_reports_update_admin ON trainer_admin_reports;

CREATE POLICY trainer_admin_reports_select
  ON trainer_admin_reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR trainer_id = auth.uid()
  );

CREATE POLICY trainer_admin_reports_insert_own
  ON trainer_admin_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid()
    AND public.is_active_trainer()
    AND (
      classroom_id IS NULL
      OR public.is_active_trainer_for_classroom(classroom_id)
    )
  );

CREATE POLICY trainer_admin_reports_update_admin
  ON trainer_admin_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-report-attachments', 'trainer-report-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS trainer_report_attachments_select ON storage.objects;
DROP POLICY IF EXISTS trainer_report_attachments_insert ON storage.objects;

CREATE POLICY trainer_report_attachments_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'trainer-report-attachments'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

CREATE POLICY trainer_report_attachments_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trainer-report-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_trainer()
  );

COMMENT ON TABLE trainer_admin_reports IS
  'Trainer-authored operational reports to Admin. The database row is canonical; email status is only notification metadata.';

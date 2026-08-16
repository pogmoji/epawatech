-- ============================================================
-- Migration 025 — Classroom weekly reports
-- ePawatech — Phase 2 Part D
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Weekly Inputs are individual trainer submissions. Classroom Weekly Reports
-- are the official classroom-level weekly accountability report, submitted by
-- the active Lead Trainer and visible to other assigned classroom trainers.

CREATE TABLE IF NOT EXISTS classroom_weekly_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id            UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  week_key                TEXT NOT NULL,
  submitted_by_trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  report_text             TEXT,
  file_path               TEXT,
  file_name               TEXT,
  file_type               TEXT,
  file_size               INTEGER,
  status                  TEXT NOT NULL DEFAULT 'submitted',
  submitted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (classroom_id, week_key),
  CONSTRAINT chk_cwr_week_key
    CHECK (char_length(trim(week_key)) BETWEEN 2 AND 40),
  CONSTRAINT chk_cwr_status
    CHECK (status IN ('submitted', 'reviewed')),
  CONSTRAINT chk_cwr_text_or_file
    CHECK (
      char_length(trim(COALESCE(report_text, ''))) >= 2
      OR file_path IS NOT NULL
    ),
  CONSTRAINT chk_cwr_text_length
    CHECK (report_text IS NULL OR char_length(trim(report_text)) <= 5000),
  CONSTRAINT chk_cwr_file_size
    CHECK (file_size IS NULL OR file_size <= 5242880)
);

CREATE INDEX IF NOT EXISTS idx_cwr_classroom_id
  ON classroom_weekly_reports (classroom_id);

CREATE INDEX IF NOT EXISTS idx_cwr_submitted_by_trainer_id
  ON classroom_weekly_reports (submitted_by_trainer_id);

CREATE INDEX IF NOT EXISTS idx_cwr_status
  ON classroom_weekly_reports (status);

CREATE INDEX IF NOT EXISTS idx_cwr_submitted_at
  ON classroom_weekly_reports (submitted_at DESC);

DROP TRIGGER IF EXISTS set_classroom_weekly_reports_updated_at ON classroom_weekly_reports;
CREATE TRIGGER set_classroom_weekly_reports_updated_at
  BEFORE UPDATE ON classroom_weekly_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_active_lead_trainer_for_classroom(
  p_classroom_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_assignments ta
    JOIN public.profiles p ON p.id = ta.trainer_id
    WHERE ta.classroom_id = p_classroom_id
      AND ta.trainer_id = auth.uid()
      AND ta.role = 'lead'
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
  );
$$;

ALTER TABLE classroom_weekly_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON classroom_weekly_reports TO authenticated;

DROP POLICY IF EXISTS classroom_weekly_reports_select ON classroom_weekly_reports;
DROP POLICY IF EXISTS classroom_weekly_reports_insert_lead ON classroom_weekly_reports;
DROP POLICY IF EXISTS classroom_weekly_reports_update_lead ON classroom_weekly_reports;
DROP POLICY IF EXISTS classroom_weekly_reports_admin_update ON classroom_weekly_reports;

CREATE POLICY classroom_weekly_reports_select
  ON classroom_weekly_reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(classroom_id)
  );

CREATE POLICY classroom_weekly_reports_insert_lead
  ON classroom_weekly_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by_trainer_id = auth.uid()
    AND public.is_active_lead_trainer_for_classroom(classroom_id)
  );

CREATE POLICY classroom_weekly_reports_update_lead
  ON classroom_weekly_reports
  FOR UPDATE
  TO authenticated
  USING (
    status = 'submitted'
    AND submitted_by_trainer_id = auth.uid()
    AND public.is_active_lead_trainer_for_classroom(classroom_id)
  )
  WITH CHECK (
    status = 'submitted'
    AND submitted_by_trainer_id = auth.uid()
    AND public.is_active_lead_trainer_for_classroom(classroom_id)
  );

CREATE POLICY classroom_weekly_reports_admin_update
  ON classroom_weekly_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('classroom-weekly-report-attachments', 'classroom-weekly-report-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS classroom_weekly_report_attachments_select ON storage.objects;
DROP POLICY IF EXISTS classroom_weekly_report_attachments_insert ON storage.objects;

CREATE POLICY classroom_weekly_report_attachments_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'classroom-weekly-report-attachments'
    AND (
      public.is_admin()
      OR public.is_active_trainer_for_classroom((storage.foldername(name))[1]::UUID)
    )
  );

CREATE POLICY classroom_weekly_report_attachments_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'classroom-weekly-report-attachments'
    AND public.is_active_lead_trainer_for_classroom((storage.foldername(name))[1]::UUID)
  );

REVOKE ALL ON FUNCTION public.is_active_lead_trainer_for_classroom(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_lead_trainer_for_classroom(UUID) TO authenticated;

COMMENT ON TABLE classroom_weekly_reports IS
  'Official classroom-level weekly reports. One per classroom/week, submitted by the active Lead Trainer.';

COMMENT ON FUNCTION public.is_active_lead_trainer_for_classroom(UUID) IS
  'Returns whether the current authenticated user is the active Lead Trainer for a classroom.';

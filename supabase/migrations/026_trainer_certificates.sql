-- ============================================================
-- Migration 026 — Trainer certificate verification PDFs
-- ePawatech — trainer profile and approval support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Adjunct trainers need to submit a PDF certificate for admin verification
-- during sign-up and from their trainer profile.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS certificate_path TEXT,
  ADD COLUMN IF NOT EXISTS certificate_file_name TEXT,
  ADD COLUMN IF NOT EXISTS certificate_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS certificate_file_size INTEGER,
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at TIMESTAMPTZ;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_trainer_certificate;

ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_trainer_certificate
  CHECK (
    (certificate_path IS NULL OR char_length(certificate_path) <= 500)
    AND (certificate_file_name IS NULL OR char_length(certificate_file_name) <= 180)
    AND (certificate_mime_type IS NULL OR certificate_mime_type = 'application/pdf')
    AND (certificate_file_size IS NULL OR certificate_file_size <= 5242880)
  );

COMMENT ON COLUMN profiles.certificate_path IS
  'Private Supabase Storage path for an adjunct trainer verification certificate PDF.';

COMMENT ON COLUMN profiles.certificate_file_name IS
  'Original file name for the trainer verification certificate PDF.';

COMMENT ON COLUMN profiles.certificate_uploaded_at IS
  'Timestamp of the current trainer verification certificate upload.';

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.username IS DISTINCT FROM OLD.username THEN
      RAISE EXCEPTION 'Only an active admin can change profile role, status, or username'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.role IS DISTINCT FROM 'trainer'::app_role THEN
      IF NEW.phone_number IS DISTINCT FROM OLD.phone_number
         OR NEW.certificate_path IS DISTINCT FROM OLD.certificate_path
         OR NEW.certificate_file_name IS DISTINCT FROM OLD.certificate_file_name
         OR NEW.certificate_mime_type IS DISTINCT FROM OLD.certificate_mime_type
         OR NEW.certificate_file_size IS DISTINCT FROM OLD.certificate_file_size
         OR NEW.certificate_uploaded_at IS DISTINCT FROM OLD.certificate_uploaded_at THEN
        RAISE EXCEPTION 'Only trainer profiles can change trainer contact or certificate details'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-certificates', 'trainer-certificates', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS trainer_certificates_select ON storage.objects;
DROP POLICY IF EXISTS trainer_certificates_insert ON storage.objects;
DROP POLICY IF EXISTS trainer_certificates_update ON storage.objects;
DROP POLICY IF EXISTS trainer_certificates_delete ON storage.objects;

CREATE POLICY trainer_certificates_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'trainer-certificates'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

CREATE POLICY trainer_certificates_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trainer-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'trainer'
        AND p.status IN ('pending', 'active')
    )
  );

CREATE POLICY trainer_certificates_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'trainer-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'trainer'
        AND p.status IN ('pending', 'active')
    )
  )
  WITH CHECK (
    bucket_id = 'trainer-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY trainer_certificates_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'trainer-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

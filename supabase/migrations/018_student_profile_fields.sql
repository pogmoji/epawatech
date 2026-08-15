-- ============================================================
-- Migration 018 — Student profile fields and avatars
-- ePawatech — Student dashboard revamp support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Students need a real profile page with safe, student-editable fields:
-- display name, bio, grade/class, term goals, and avatar.
--
-- This extends the existing profiles table rather than creating a separate
-- student-profile system. Role, status, username, phone number, classroom,
-- cohort, and centre assignment remain protected by existing ownership/RLS
-- rules and the profile guard below.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS grade_class TEXT,
  ADD COLUMN IF NOT EXISTS term_goals TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path TEXT;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_student_profile_lengths;

ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_student_profile_lengths
  CHECK (
    (bio IS NULL OR char_length(bio) <= 500)
    AND (grade_class IS NULL OR char_length(grade_class) <= 80)
    AND (term_goals IS NULL OR char_length(term_goals) <= 500)
    AND (avatar_path IS NULL OR char_length(avatar_path) <= 500)
  );

COMMENT ON COLUMN profiles.bio IS
  'Student-editable short profile bio. Optional.';

COMMENT ON COLUMN profiles.grade_class IS
  'Student-editable school grade or class label. Optional.';

COMMENT ON COLUMN profiles.term_goals IS
  'Student-editable term expectations or learning goals. Optional.';

COMMENT ON COLUMN profiles.avatar_path IS
  'Path to the student avatar object in the student-avatars storage bucket. Optional.';

-- Preserve existing protected fields and explicitly protect trainer-only phone
-- numbers from non-admin self edits. Students can still edit only whitelisted
-- fields from the application UI.
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
       OR NEW.username IS DISTINCT FROM OLD.username
       OR NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
      RAISE EXCEPTION 'Only an active admin can change profile role, status, username, or phone number'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Avatar storage bucket ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-avatars', 'student-avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS student_avatars_storage_select ON storage.objects;
DROP POLICY IF EXISTS student_avatars_storage_insert ON storage.objects;
DROP POLICY IF EXISTS student_avatars_storage_update ON storage.objects;
DROP POLICY IF EXISTS student_avatars_storage_delete ON storage.objects;

CREATE POLICY student_avatars_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'student-avatars');

CREATE POLICY student_avatars_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_student()
  );

CREATE POLICY student_avatars_storage_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'student-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_student()
  )
  WITH CHECK (
    bucket_id = 'student-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_student()
  );

CREATE POLICY student_avatars_storage_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_student()
  );

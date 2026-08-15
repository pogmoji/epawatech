-- ============================================================
-- Migration 010 — Student usernames
-- ePawatech — Stage 2
-- ============================================================
-- Students authenticate through a username in the UI. Supabase Auth still
-- stores a deterministic internal email address for password authentication;
-- trainers and admins continue to use their real email addresses.

ALTER TABLE profiles
  ADD COLUMN username TEXT;

-- Example valid username: KE0476-213
-- Normalization to uppercase happens in the application and auth trigger.
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_username_format
  CHECK (
    username IS NULL
    OR username = upper(username)
       AND username ~ '^[A-Z][A-Z0-9-]{2,29}$'
  );

CREATE UNIQUE INDEX uidx_profiles_username_lower
  ON profiles (lower(username))
  WHERE username IS NOT NULL;

COMMENT ON COLUMN profiles.username IS
  'Student-facing login name. Uppercase, 3–30 characters, starts with a letter, '
  'and uses only A–Z, 0–9, and hyphen. Trainers and admins use email and leave this NULL.';

-- Only an admin can correct an existing student username. A student can still
-- update their own full_name under the existing profile RLS policy.
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
  END IF;
  RETURN NEW;
END;
$$;

-- The unique index is the final authority. This RPC provides a friendly,
-- unauthenticated availability check during student signup only.
CREATE OR REPLACE FUNCTION public.is_student_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_username TEXT := upper(trim(COALESCE(p_username, '')));
BEGIN
  IF normalized_username !~ '^[A-Z][A-Z0-9-]{2,29}$' THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(normalized_username)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_student_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student_username_available(TEXT) TO anon, authenticated;

-- Replaces the original 009 trigger function so new students receive the
-- checked, normalized username supplied in Auth metadata. The database check
-- handles races even if two browser availability checks both say available.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'student');
  requested_username TEXT := upper(trim(COALESCE(NEW.raw_user_meta_data ->> 'username', '')));
BEGIN
  IF requested_role = 'student'
     AND requested_username !~ '^[A-Z][A-Z0-9-]{2,29}$' THEN
    RAISE EXCEPTION 'Student username must be 3–30 characters: A–Z, numbers, and hyphen; it must start with a letter'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id, full_name, username, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN requested_role = 'student' THEN requested_username ELSE NULL END,
    CASE WHEN requested_role = 'trainer' THEN 'trainer'::app_role ELSE 'student'::app_role END,
    CASE WHEN requested_role = 'trainer' THEN 'pending'::profile_status ELSE 'active'::profile_status END
  );
  RETURN NEW;
END;
$$;

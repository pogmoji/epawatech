-- ============================================================
-- Migration 014 — Trainer visibility for enrolled student names
-- ePawatech — Stage 2 completion
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Trainer attendance and student roster screens need enrolled student profile
-- names/usernames. The existing profile SELECT policy only allows self/admin,
-- so joined student profile rows can be hidden by RLS and appear as fallback
-- labels in the Trainer Dashboard.

DROP POLICY IF EXISTS profiles_select_self_or_admin ON profiles;

CREATE POLICY profiles_select_self_admin_or_classroom_trainer
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR (
      role = 'student'
      AND EXISTS (
        SELECT 1
        FROM public.student_enrollments se
        WHERE se.student_id = profiles.id
          AND se.status = 'active'
          AND public.is_active_trainer_for_classroom(se.classroom_id)
      )
    )
  );

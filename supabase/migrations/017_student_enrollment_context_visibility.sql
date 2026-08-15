-- ============================================================
-- Migration 017 — Student enrollment context visibility
-- ePawatech — Student dashboard revamp support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- The Student Dashboard needs to show the enrolled student's classroom context:
-- classroom, cohort, centre, and lead trainer name.
--
-- Current RLS lets students read their own enrollment and classroom, but not the
-- linked cohort, centre, trainer assignment, or trainer profile. That causes UI
-- fallbacks such as "Unknown Centre", "Unknown Cohort", and "Trainer".
--
-- This migration grants read-only visibility only for records connected to the
-- student's active classroom enrollment.

-- ─── Centres visible to enrolled students ───────────────────
DROP POLICY IF EXISTS centres_select ON centres;

CREATE POLICY centres_select ON centres FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_centre(id)
    OR (status = 'active' AND public.is_active_trainer())
    OR EXISTS (
      SELECT 1
      FROM public.student_enrollments se
      JOIN public.classrooms cl ON cl.id = se.classroom_id
      JOIN public.cohorts co ON co.id = cl.cohort_id
      JOIN public.profiles p ON p.id = se.student_id
      WHERE se.student_id = auth.uid()
        AND se.status = 'active'
        AND p.role = 'student'
        AND p.status = 'active'
        AND co.centre_id = centres.id
    )
  );

-- ─── Cohorts visible to enrolled students ───────────────────
DROP POLICY IF EXISTS cohorts_select ON cohorts;

CREATE POLICY cohorts_select ON cohorts FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_cohort(id)
    OR (status = 'active' AND public.is_active_trainer())
    OR EXISTS (
      SELECT 1
      FROM public.student_enrollments se
      JOIN public.classrooms cl ON cl.id = se.classroom_id
      JOIN public.profiles p ON p.id = se.student_id
      WHERE se.student_id = auth.uid()
        AND se.status = 'active'
        AND p.role = 'student'
        AND p.status = 'active'
        AND cl.cohort_id = cohorts.id
    )
  );

-- ─── Trainer assignments visible to students in that classroom ───────────
DROP POLICY IF EXISTS trainer_assignments_select ON trainer_assignments;

CREATE POLICY trainer_assignments_select ON trainer_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR trainer_id = auth.uid()
    OR (
      classroom_id IS NOT NULL
      AND public.is_active_student_in_classroom(classroom_id)
    )
  );

-- ─── Profiles visible across active student/trainer classroom relationships
DROP POLICY IF EXISTS profiles_select_self_or_admin ON profiles;
DROP POLICY IF EXISTS profiles_select_self_admin_or_classroom_trainer ON profiles;

CREATE POLICY profiles_select_self_admin_or_classroom_relationship
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
    OR (
      role = 'trainer'
      AND EXISTS (
        SELECT 1
        FROM public.trainer_assignments ta
        WHERE ta.trainer_id = profiles.id
          AND ta.classroom_id IS NOT NULL
          AND ta.status = 'active'
          AND public.is_active_student_in_classroom(ta.classroom_id)
      )
    )
  );

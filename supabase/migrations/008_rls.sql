-- ============================================================
-- Migration 008 — Row Level Security
-- ePawatech — Stage 2
-- ============================================================
-- Relationship checks live in SECURITY DEFINER helpers so policies do not
-- recursively query RLS-protected relationship tables. All helpers pin their
-- search path to prevent object-shadowing attacks.

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_trainer_for_classroom(p_classroom_id UUID)
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
    WHERE ta.trainer_id = auth.uid()
      AND ta.classroom_id = p_classroom_id
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_student_in_classroom(p_classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_enrollments se
    JOIN public.profiles p ON p.id = se.student_id
    WHERE se.student_id = auth.uid()
      AND se.classroom_id = p_classroom_id
      AND se.status = 'active'
      AND p.role = 'student'
      AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_trainer_for_centre(p_centre_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_assignments ta
    JOIN public.classrooms c ON c.id = ta.classroom_id
    JOIN public.cohorts co ON co.id = c.cohort_id
    JOIN public.profiles p ON p.id = ta.trainer_id
    WHERE ta.trainer_id = auth.uid()
      AND ta.status = 'active'
      AND p.role = 'trainer'
      AND p.status = 'active'
      AND co.centre_id = p_centre_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_trainer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'trainer' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student' AND status = 'active'
  );
$$;

-- Restrict client-facing database privileges first; RLS below then decides
-- which rows the anon/authenticated API roles may access.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, centres, cohorts, classrooms,
  trainer_assignments, student_enrollments, curriculum_weeks, curriculum_modules,
  curriculum_lessons, lesson_activities, classroom_curriculum_items,
  classroom_curriculum_overrides, attendance_sessions, attendance_records,
  challenge_assignments, hardware_sessions, hardware_session_outcomes,
  hardware_evidence, weekly_student_comments, lesson_progress, projects
  TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT SELECT ON projects TO anon;

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_trainer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_student() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_trainer_for_classroom(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_student_in_classroom(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_trainer_for_centre(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user(), public.is_admin(), public.is_active_trainer(), public.is_active_student(),
  public.is_active_trainer_for_classroom(UUID), public.is_active_student_in_classroom(UUID),
  public.is_active_trainer_for_centre(UUID) TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_curriculum_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_curriculum_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_session_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_student_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles -----------------------------------------------------------------
CREATE POLICY profiles_select_self_or_admin ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update_self_or_admin ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Organisation -------------------------------------------------------------
CREATE POLICY centres_select ON centres FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_centre(id)
    OR (status = 'active' AND public.is_active_trainer())
  );
CREATE POLICY centres_admin_write ON centres FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY cohorts_select ON cohorts FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (status = 'active' AND public.is_active_trainer())
  );
CREATE POLICY cohorts_admin_write ON cohorts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY classrooms_select ON classrooms FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(id)
    OR public.is_active_student_in_classroom(id)
  );
CREATE POLICY classrooms_insert_active_trainer ON classrooms FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_active_trainer()
    AND EXISTS (
      SELECT 1 FROM public.cohorts co
      WHERE co.id = cohort_id AND co.status = 'active'
    )
  );
CREATE POLICY classrooms_update_owner_or_admin ON classrooms FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(id))
  WITH CHECK (public.is_admin() OR public.is_active_trainer_for_classroom(id));
CREATE POLICY classrooms_delete_admin ON classrooms FOR DELETE TO authenticated
  USING (public.is_admin());

-- Relationships ------------------------------------------------------------
CREATE POLICY trainer_assignments_select ON trainer_assignments FOR SELECT TO authenticated
  USING (public.is_admin() OR trainer_id = auth.uid());
CREATE POLICY trainer_assignments_admin_write ON trainer_assignments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY student_enrollments_select ON student_enrollments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR public.is_active_trainer_for_classroom(classroom_id)
  );
CREATE POLICY student_enrollments_admin_write ON student_enrollments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Master curriculum --------------------------------------------------------
CREATE POLICY curriculum_weeks_read ON curriculum_weeks FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY curriculum_weeks_admin_write ON curriculum_weeks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY curriculum_modules_read ON curriculum_modules FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY curriculum_modules_admin_write ON curriculum_modules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY curriculum_lessons_read ON curriculum_lessons FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY curriculum_lessons_admin_write ON curriculum_lessons FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY lesson_activities_read ON lesson_activities FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY lesson_activities_admin_write ON lesson_activities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Classroom curriculum -----------------------------------------------------
CREATE POLICY classroom_curriculum_items_select ON classroom_curriculum_items FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(classroom_id)
    OR (
      public.is_active_student_in_classroom(classroom_id)
      AND NOT removed
      AND state IN ('live', 'completed')
    )
  );
CREATE POLICY classroom_curriculum_items_trainer_write ON classroom_curriculum_items FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id))
  WITH CHECK (
    public.is_admin()
    OR (
      created_by = auth.uid()
      AND public.is_active_trainer_for_classroom(classroom_id)
    )
  );

CREATE POLICY classroom_curriculum_overrides_select ON classroom_curriculum_overrides FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id));
CREATE POLICY classroom_curriculum_overrides_trainer_write ON classroom_curriculum_overrides FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id))
  WITH CHECK (
    public.is_admin()
    OR (
      created_by = auth.uid()
      AND public.is_active_trainer_for_classroom(classroom_id)
    )
  );

-- Attendance, challenges, and hardware ------------------------------------
CREATE POLICY attendance_sessions_select ON attendance_sessions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(classroom_id)
    OR public.is_active_student_in_classroom(classroom_id)
  );
CREATE POLICY attendance_sessions_trainer_write ON attendance_sessions FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id))
  WITH CHECK (
    public.is_admin()
    OR (created_by = auth.uid() AND public.is_active_trainer_for_classroom(classroom_id))
  );

CREATE POLICY attendance_records_select ON attendance_records FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = attendance_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  );
CREATE POLICY attendance_records_trainer_write ON attendance_records FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = attendance_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = attendance_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  );

CREATE POLICY challenge_assignments_select ON challenge_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(classroom_id)
    OR public.is_active_student_in_classroom(classroom_id)
  );
CREATE POLICY challenge_assignments_trainer_write ON challenge_assignments FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id))
  WITH CHECK (
    public.is_admin()
    OR (assigned_by = auth.uid() AND public.is_active_trainer_for_classroom(classroom_id))
  );

CREATE POLICY hardware_sessions_select ON hardware_sessions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_active_trainer_for_classroom(classroom_id)
    OR public.is_active_student_in_classroom(classroom_id)
  );
CREATE POLICY hardware_sessions_trainer_write ON hardware_sessions FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id))
  WITH CHECK (
    public.is_admin()
    OR (created_by = auth.uid() AND public.is_active_trainer_for_classroom(classroom_id))
  );

CREATE POLICY hardware_session_outcomes_select ON hardware_session_outcomes FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.hardware_sessions s
      WHERE s.id = hardware_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  );
CREATE POLICY hardware_session_outcomes_trainer_write ON hardware_session_outcomes FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.hardware_sessions s
      WHERE s.id = hardware_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.hardware_sessions s
      WHERE s.id = hardware_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  );

CREATE POLICY hardware_evidence_select ON hardware_evidence FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      student_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.hardware_sessions s
        WHERE s.id = hardware_session_id
          AND public.is_active_student_in_classroom(s.classroom_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.hardware_sessions s
      WHERE s.id = hardware_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  );
CREATE POLICY hardware_evidence_trainer_write ON hardware_evidence FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.hardware_sessions s
      WHERE s.id = hardware_session_id
        AND public.is_active_trainer_for_classroom(s.classroom_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.hardware_sessions s
        WHERE s.id = hardware_session_id
          AND public.is_active_trainer_for_classroom(s.classroom_id)
      )
    )
  );

CREATE POLICY weekly_student_comments_select ON weekly_student_comments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR public.is_active_trainer_for_classroom(classroom_id)
  );
CREATE POLICY weekly_student_comments_trainer_write ON weekly_student_comments FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_active_trainer_for_classroom(classroom_id))
  WITH CHECK (
    public.is_admin()
    OR (trainer_id = auth.uid() AND public.is_active_trainer_for_classroom(classroom_id))
  );

-- Student-owned learning records ------------------------------------------
CREATE POLICY lesson_progress_select ON lesson_progress FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR public.is_active_trainer_for_classroom(classroom_id)
  );
CREATE POLICY lesson_progress_student_write ON lesson_progress FOR ALL TO authenticated
  USING (public.is_admin() OR student_id = auth.uid())
  WITH CHECK (
    public.is_admin()
    OR (
      student_id = auth.uid()
      AND public.is_active_student_in_classroom(classroom_id)
    )
  );

-- Approved projects are deliberately public for the showcase. Students can
-- manage only their own records; trainers can read classroom records, while
-- status changes are further guarded by a trigger in 009.
CREATE POLICY projects_public_approved_read ON projects FOR SELECT TO anon
  USING (status = 'approved');
CREATE POLICY projects_authenticated_read ON projects FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR public.is_admin()
    OR student_id = auth.uid()
    OR (classroom_id IS NOT NULL AND public.is_active_trainer_for_classroom(classroom_id))
  );
CREATE POLICY projects_student_write ON projects FOR ALL TO authenticated
  USING (public.is_admin() OR (student_id = auth.uid() AND public.is_active_student()))
  WITH CHECK (
    public.is_admin()
    OR (
      student_id = auth.uid()
      AND public.is_active_student()
      AND (classroom_id IS NULL OR public.is_active_student_in_classroom(classroom_id))
    )
  );

-- Audit logs are intentionally write-only for active administrators. There
-- is no SELECT, UPDATE, or DELETE policy for browser roles.
CREATE POLICY audit_logs_admin_insert ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND actor_id = auth.uid());

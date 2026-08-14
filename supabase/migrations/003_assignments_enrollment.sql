-- ============================================================
-- Migration 003 — Trainer Assignments & Student Enrollments
-- ePawatech — Stage 2
-- ============================================================

-- ─── trainer_assignments ─────────────────────────────────────
-- Models the historical relationship between a Trainer and a Classroom.
-- A trainer may have many assignments across their career (current + historical).
CREATE TABLE trainer_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  classroom_id  UUID NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
  role          assignment_role NOT NULL DEFAULT 'lead',
  status        assignment_status NOT NULL DEFAULT 'active',
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ta_trainer_id   ON trainer_assignments (trainer_id);
CREATE INDEX idx_ta_classroom_id ON trainer_assignments (classroom_id);
CREATE INDEX idx_ta_status       ON trainer_assignments (status);

-- BUSINESS RULE: one active lead trainer per classroom
CREATE UNIQUE INDEX uidx_one_active_lead_per_classroom
  ON trainer_assignments (classroom_id)
  WHERE role = 'lead' AND status = 'active';

COMMENT ON TABLE trainer_assignments IS
  'Historical Trainer ↔ Classroom placements. '
  'A trainer may have multiple assignments over time. '
  'At most one active lead is permitted per classroom '
  '(enforced by uidx_one_active_lead_per_classroom). '
  'Trainer who creates a classroom gets an automatic lead assignment.';

COMMENT ON COLUMN trainer_assignments.role IS
  'lead: primary classroom trainer. co_teacher: secondary trainer (requires admin approval).';

-- ─── student_enrollments ─────────────────────────────────────
-- Models the historical relationship between a Student and a Classroom.
CREATE TABLE student_enrollments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  classroom_id     UUID NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
  status           enrollment_status NOT NULL DEFAULT 'active',
  joined_via_code  BOOLEAN NOT NULL DEFAULT TRUE,
  start_date       DATE,
  end_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_se_student_id   ON student_enrollments (student_id);
CREATE INDEX idx_se_classroom_id ON student_enrollments (classroom_id);
CREATE INDEX idx_se_status       ON student_enrollments (status);

-- BUSINESS RULE: one active classroom enrollment per student at a time
CREATE UNIQUE INDEX uidx_one_active_enrollment_per_student
  ON student_enrollments (student_id)
  WHERE status = 'active';

COMMENT ON TABLE student_enrollments IS
  'Historical Student ↔ Classroom enrollments. '
  'A student normally has one active enrollment at a time '
  '(enforced by uidx_one_active_enrollment_per_student). '
  'Historical enrollments are retained when a cohort ends.';

COMMENT ON COLUMN student_enrollments.joined_via_code IS
  'TRUE when student enrolled using a classroom join code. '
  'FALSE when an admin/trainer manually enrolled the student.';

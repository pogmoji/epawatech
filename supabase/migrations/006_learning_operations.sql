-- ============================================================
-- Migration 006 — Learning Operations
-- ePawatech — Stage 2
-- ============================================================

-- ─── attendance_sessions ─────────────────────────────────────
CREATE TABLE attendance_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id        UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  curriculum_item_id  UUID REFERENCES classroom_curriculum_items(id) ON DELETE SET NULL,
  session_date        DATE NOT NULL,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_as_classroom_id ON attendance_sessions (classroom_id);
CREATE INDEX idx_as_session_date ON attendance_sessions (session_date);

COMMENT ON TABLE attendance_sessions IS
  'A dated classroom session for which attendance is recorded. '
  'Simple Present/Absent model — no check-in/check-out. '
  'curriculum_item_id optionally links the session to a curriculum item.';

-- ─── attendance_records ──────────────────────────────────────
CREATE TABLE attendance_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status                attendance_status NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- one record per student per session
  UNIQUE (attendance_session_id, student_id)
);

CREATE INDEX idx_ar_session_id ON attendance_records (attendance_session_id);
CREATE INDEX idx_ar_student_id ON attendance_records (student_id);

-- ─── challenge_assignments ───────────────────────────────────
-- Links a master challenge to a classroom. Does not duplicate the challenge definition.
CREATE TABLE challenge_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES curriculum_lessons(id) ON DELETE RESTRICT,
  classroom_id  UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  assigned_by   UUID NOT NULL REFERENCES profiles(id),
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (classroom_id, challenge_id)
);

CREATE INDEX idx_ca_classroom_id ON challenge_assignments (classroom_id);

COMMENT ON TABLE challenge_assignments IS
  'Assignment of a master challenge lesson to a classroom. '
  'challenge_id must reference a curriculum_lessons row where is_challenge=true.';

-- ─── hardware_sessions ───────────────────────────────────────
CREATE TABLE hardware_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id       UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  curriculum_item_id UUID REFERENCES classroom_curriculum_items(id) ON DELETE SET NULL,
  session_date       DATE NOT NULL,
  notes              TEXT,
  created_by         UUID NOT NULL REFERENCES profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hs_classroom_id ON hardware_sessions (classroom_id);

COMMENT ON TABLE hardware_sessions IS
  'Trainer-recorded physical hardware/Arduino session (Weeks 6–8). '
  'Trainer outcomes are the source of truth for hardware activity completion.';

-- ─── hardware_session_outcomes ───────────────────────────────
CREATE TABLE hardware_session_outcomes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_session_id UUID NOT NULL REFERENCES hardware_sessions(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  outcome             hw_outcome NOT NULL DEFAULT 'not_attempted',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hardware_session_id, student_id)
);

CREATE INDEX idx_hso_student_id ON hardware_session_outcomes (student_id);

-- ─── hardware_evidence ───────────────────────────────────────
-- Metadata for Supabase Storage objects. No binary blobs in PostgreSQL.
CREATE TABLE hardware_evidence (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_session_id UUID REFERENCES hardware_sessions(id) ON DELETE SET NULL,
  student_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_by         UUID NOT NULL REFERENCES profiles(id),
  -- Supabase Storage path: hardware-evidence/{classroom_id}/{student_id}/{session_id}/{filename}
  storage_path        TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hardware_evidence IS
  'Metadata record for hardware evidence files stored in Supabase Storage bucket "hardware-evidence". '
  'storage_path follows the pattern: {classroom_id}/{student_id}/{session_id}/{file_name}. '
  'Binary data is never stored in PostgreSQL.';

-- ─── weekly_student_comments ─────────────────────────────────
-- One comment per trainer per student per week — never overwritten.
CREATE TABLE weekly_student_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  trainer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  week_number  INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  comment      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (student_id, classroom_id, trainer_id, week_number)
);

CREATE INDEX idx_wsc_student_id   ON weekly_student_comments (student_id);
CREATE INDEX idx_wsc_classroom_id ON weekly_student_comments (classroom_id);
CREATE INDEX idx_wsc_week_number  ON weekly_student_comments (week_number);

COMMENT ON TABLE weekly_student_comments IS
  'Trainer free-text comment for a student for a given week. '
  'Unique constraint prevents overwriting a comment for the same week. '
  'Historical comments are always retained.';

-- ─── lesson_progress ─────────────────────────────────────────
CREATE TABLE lesson_progress (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  classroom_id           UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  curriculum_activity_id UUID NOT NULL REFERENCES lesson_activities(id) ON DELETE RESTRICT,
  status                 progress_status NOT NULL DEFAULT 'not_started',
  -- Stores activity-specific result data: score, wpm, accuracy, attempts, etc.
  progress_data          JSONB NOT NULL DEFAULT '{}',
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (student_id, classroom_id, curriculum_activity_id)
);

CREATE INDEX idx_lp_student_id   ON lesson_progress (student_id);
CREATE INDEX idx_lp_classroom_id ON lesson_progress (classroom_id);

COMMENT ON TABLE lesson_progress IS
  'Student progress on a specific curriculum activity within a classroom. '
  'progress_data stores activity-specific results (score, wpm, accuracy, etc.). '
  'Replaces localStorage pygolfers_lesson_progress and challenge_attempts from lib/supabase.ts.';

-- ─── projects ────────────────────────────────────────────────
-- Week 8 student project submissions. Referenced by lib/supabase.ts and
-- components/projects/project-showcase.tsx.
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  -- Public URL if using Supabase Storage; base64 data URI in localStorage fallback
  image_url    TEXT,
  video_url    TEXT,
  -- Supabase Storage path in 'project-images' bucket
  storage_path TEXT,
  status       project_status NOT NULL DEFAULT 'submitted',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_student_id ON projects (student_id);
CREATE INDEX idx_projects_status     ON projects (status);
CREATE INDEX idx_projects_classroom  ON projects (classroom_id);

COMMENT ON TABLE projects IS
  'Week 8 student project submissions. '
  'image_url stores the public URL from Supabase Storage bucket "project-images". '
  'status=approved makes the project visible in the public showcase. '
  'Aligns with the existing projects table referenced in lib/supabase.ts.';

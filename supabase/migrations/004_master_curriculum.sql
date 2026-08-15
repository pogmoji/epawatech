-- ============================================================
-- Migration 004 — Master Curriculum Tables
-- ePawatech — Stage 2
-- ============================================================
-- These tables represent the MASTER curriculum owned by the platform/admin.
-- Trainer classroom customizations NEVER modify these records.
-- See 005_classroom_curriculum.sql for the classroom override model.
-- ============================================================

-- ─── curriculum_weeks ────────────────────────────────────────
CREATE TABLE curriculum_weeks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL UNIQUE CHECK (week_number > 0),
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,           -- lucide icon name, e.g. 'Monitor', 'FileText'
  sort_order  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE curriculum_weeks IS
  'Master curriculum weeks (Week 1 through Week 8+). '
  'Owned by the platform. Never modified by a Trainer.';

-- ─── curriculum_modules ──────────────────────────────────────
-- In the existing TypeScript model, a Track = a Module within a Week.
CREATE TABLE curriculum_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     UUID NOT NULL REFERENCES curriculum_weeks(id) ON DELETE RESTRICT,
  slug        TEXT NOT NULL UNIQUE,   -- stable identifier, e.g. 'computer-fundamentals'
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cm_week_id ON curriculum_modules (week_id);

COMMENT ON TABLE curriculum_modules IS
  'Master curriculum modules (= TypeScript Track). One module per week in the current design. '
  'slug is stable and must not change after seeding.';

-- ─── curriculum_lessons ──────────────────────────────────────
CREATE TABLE curriculum_lessons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id            UUID NOT NULL REFERENCES curriculum_modules(id) ON DELETE RESTRICT,
  slug                 TEXT NOT NULL,       -- stable: 'lesson-1', 'lesson-2', 'challenge'
  title                TEXT NOT NULL,
  topics               TEXT[] NOT NULL DEFAULT '{}',
  sort_order           INTEGER NOT NULL,
  is_challenge         BOOLEAN NOT NULL DEFAULT FALSE,
  time_limit_seconds   INTEGER,             -- populated for challenge lessons
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_id, slug)
);

CREATE INDEX idx_cl_module_id ON curriculum_lessons (module_id);

COMMENT ON TABLE curriculum_lessons IS
  'Master curriculum lessons within a module. '
  'is_challenge=true denotes the end-of-module challenge/assessment. '
  'slug is stable within its module.';

-- ─── lesson_activities ───────────────────────────────────────
-- One activity per lesson (current architecture).
-- configuration stores the full type-specific JSON payload,
-- matching the LessonActivity union type from lib/curriculum.ts.
CREATE TABLE lesson_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
  activity_type   activity_type NOT NULL,
  configuration   JSONB NOT NULL DEFAULT '{}',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_la_lesson_id      ON lesson_activities (lesson_id);
CREATE INDEX idx_la_activity_type  ON lesson_activities (activity_type);

COMMENT ON TABLE lesson_activities IS
  'Activity payload for a curriculum lesson. '
  'configuration contains the full activity-specific JSON '
  '(questions, items/zones, videoId, src, url, initialCode, etc.) '
  'matching all 14 LessonActivity variants from lib/curriculum.ts. '
  'Master records are never modified by classroom customizations.';

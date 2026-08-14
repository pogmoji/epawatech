-- ============================================================
-- Migration 005 — Classroom Curriculum
-- ePawatech — Stage 2
-- ============================================================
-- These tables represent each classroom's customized view of
-- the master curriculum. Master records are NEVER mutated.
-- ============================================================

-- ─── classroom_curriculum_items ──────────────────────────────
-- One row per item in the classroom's ordered curriculum list.
-- origin='master' → references a master lesson_activity
-- origin='custom' → trainer-created, classroom-only (master_activity_id IS NULL)
CREATE TABLE classroom_curriculum_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id        UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  master_activity_id  UUID REFERENCES lesson_activities(id) ON DELETE RESTRICT,
  origin              curriculum_origin NOT NULL DEFAULT 'master',
  title               TEXT NOT NULL,
  configuration       JSONB,             -- NULL = inherit from master; set for custom items
  sort_order          INTEGER NOT NULL,
  state               curriculum_state NOT NULL DEFAULT 'draft',
  removed             BOOLEAN NOT NULL DEFAULT FALSE,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- custom items must not reference a master activity
  CONSTRAINT chk_custom_no_master CHECK (
    origin = 'master' OR master_activity_id IS NULL
  ),
  -- master items must reference a master activity
  CONSTRAINT chk_master_has_activity CHECK (
    origin = 'custom' OR master_activity_id IS NOT NULL
  )
);

CREATE INDEX idx_cci_classroom_id       ON classroom_curriculum_items (classroom_id);
CREATE INDEX idx_cci_master_activity_id ON classroom_curriculum_items (master_activity_id);
CREATE INDEX idx_cci_state              ON classroom_curriculum_items (state);
CREATE INDEX idx_cci_sort_order         ON classroom_curriculum_items (classroom_id, sort_order);

COMMENT ON TABLE classroom_curriculum_items IS
  'Ordered curriculum items for a specific classroom. '
  'origin=master rows shadow a master lesson_activity (customizable). '
  'origin=custom rows are trainer-created and classroom-scoped only. '
  'removed=true soft-removes the item from the classroom view. '
  'state is future-ready for the "Make Module Live" feature. '
  'Master curriculum records are never modified by this table.';

COMMENT ON COLUMN classroom_curriculum_items.configuration IS
  'For custom items: the full activity JSON payload. '
  'For master items: NULL means inherit from lesson_activities.configuration.';

-- ─── classroom_curriculum_overrides ──────────────────────────
-- Field-level overrides a trainer applies to a master curriculum item.
-- The master record remains unchanged.
CREATE TABLE classroom_curriculum_overrides (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id             UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  master_activity_id       UUID NOT NULL REFERENCES lesson_activities(id) ON DELETE RESTRICT,
  title_override           TEXT,             -- NULL = keep master title
  configuration_override   JSONB,            -- NULL = keep master configuration
  sort_order_override      INTEGER,          -- NULL = keep master/default order
  removed                  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by               UUID NOT NULL REFERENCES profiles(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- one override row per master item per classroom
  UNIQUE (classroom_id, master_activity_id)
);

CREATE INDEX idx_cco_classroom_id ON classroom_curriculum_overrides (classroom_id);

COMMENT ON TABLE classroom_curriculum_overrides IS
  'Field-level overrides for master curriculum items within a classroom. '
  'Master + Override = Classroom Version (master record is never mutated). '
  'removed=true marks the item as excluded from this classroom''s curriculum. '
  'Maps to the localStorage CurriculumItem.masterTitle/masterInstruction pattern '
  'from trainer-dashboard.tsx.';

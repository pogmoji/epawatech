-- ============================================================
-- Migration 002 — Profiles and Organisation
-- ePawatech — Stage 2
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────
-- id mirrors auth.users.id — set by the trigger in 009_seed_compatibility.sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY,
  full_name   TEXT NOT NULL DEFAULT '',
  role        app_role NOT NULL DEFAULT 'student',
  status      profile_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role   ON profiles (role);
CREATE INDEX idx_profiles_status ON profiles (status);

COMMENT ON TABLE profiles IS
  'Application-level user profile. id = auth.users.id. '
  'Trainers start as pending until an admin sets status=active. '
  'Students start as active. Admins are created out-of-band.';

-- ─── centres ─────────────────────────────────────────────────
CREATE TABLE centres (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  status      centre_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE centres IS
  'Physical learning centres. Created and managed by Admins only.';

-- ─── cohorts ─────────────────────────────────────────────────
CREATE TABLE cohorts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id   UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  status      cohort_status NOT NULL DEFAULT 'planned',
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cohorts_centre_id ON cohorts (centre_id);
CREATE INDEX idx_cohorts_status    ON cohorts (status);

-- BUSINESS RULE: only one active cohort per centre (enforced at DB level)
CREATE UNIQUE INDEX uidx_one_active_cohort_per_centre
  ON cohorts (centre_id)
  WHERE status = 'active';

COMMENT ON TABLE cohorts IS
  'Time-bounded cohort within a centre. '
  'At most one active cohort is permitted per centre at any time '
  '(enforced by partial unique index uidx_one_active_cohort_per_centre).';

-- ─── classrooms ──────────────────────────────────────────────
CREATE TABLE classrooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  status          classroom_status NOT NULL DEFAULT 'active',
  -- The plain join code is only ever shown to the trainer.
  -- bcrypt hash (or sha256 hex) of the plain code is stored here.
  join_code_hash  TEXT NOT NULL UNIQUE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classrooms_cohort_id ON classrooms (cohort_id);
CREATE INDEX idx_classrooms_status    ON classrooms (status);

COMMENT ON TABLE classrooms IS
  'A classroom belongs to a cohort (and transitively to a centre). '
  'join_code_hash stores the hashed classroom join code. '
  'Centre and cohort are derived through classroom → cohort → centre.';

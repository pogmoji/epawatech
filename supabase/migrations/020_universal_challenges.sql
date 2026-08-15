-- ============================================================
-- Migration 020 — Universal challenge levels and progress
-- ePawatech — Student dashboard revamp support
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Universal Challenges are admin-published platform challenges with ordered
-- difficulty levels and student-owned progress. They are separate from
-- challenge_assignments, which remains trainer-posted classroom homework and
-- continues to power the student Assignments tab.

CREATE TABLE IF NOT EXISTS challenge_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  difficulty  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_challenge_levels_slug
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT chk_challenge_levels_name
    CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  CONSTRAINT chk_challenge_levels_difficulty
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme'))
);

CREATE TABLE IF NOT EXISTS challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id            UUID NOT NULL REFERENCES challenge_levels(id) ON DELETE RESTRICT,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  instructions        TEXT NOT NULL DEFAULT '',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_required         BOOLEAN NOT NULL DEFAULT TRUE,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_challenges_title
    CHECK (char_length(trim(title)) BETWEEN 2 AND 120),
  CONSTRAINT chk_challenges_description
    CHECK (char_length(description) <= 600),
  CONSTRAINT chk_challenges_instructions
    CHECK (char_length(instructions) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_challenges_level_id
  ON challenges (level_id);

CREATE INDEX IF NOT EXISTS idx_challenges_published
  ON challenges (is_published);

CREATE INDEX IF NOT EXISTS idx_challenges_level_order
  ON challenges (level_id, sort_order);

CREATE TABLE IF NOT EXISTS student_challenge_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'available',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, challenge_id),
  CONSTRAINT chk_student_challenge_progress_status
    CHECK (status IN ('available', 'in_progress', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_scp_student_id
  ON student_challenge_progress (student_id);

CREATE INDEX IF NOT EXISTS idx_scp_challenge_id
  ON student_challenge_progress (challenge_id);

DROP TRIGGER IF EXISTS set_challenge_levels_updated_at ON challenge_levels;
CREATE TRIGGER set_challenge_levels_updated_at
  BEFORE UPDATE ON challenge_levels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_challenges_updated_at ON challenges;
CREATE TRIGGER set_challenges_updated_at
  BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_student_challenge_progress_updated_at ON student_challenge_progress;
CREATE TRIGGER set_student_challenge_progress_updated_at
  BEFORE UPDATE ON student_challenge_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE challenge_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenge_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON challenge_levels, challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_levels, challenges, student_challenge_progress TO authenticated;

DROP POLICY IF EXISTS challenge_levels_select ON challenge_levels;
DROP POLICY IF EXISTS challenge_levels_admin_write ON challenge_levels;
DROP POLICY IF EXISTS challenges_select ON challenges;
DROP POLICY IF EXISTS challenges_admin_write ON challenges;
DROP POLICY IF EXISTS student_challenge_progress_select ON student_challenge_progress;

CREATE POLICY challenge_levels_select
  ON challenge_levels
  FOR SELECT
  TO anon, authenticated
  USING (
    public.is_admin()
    OR is_active = TRUE
  );

CREATE POLICY challenge_levels_admin_write
  ON challenge_levels
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY challenges_select
  ON challenges
  FOR SELECT
  TO anon, authenticated
  USING (
    public.is_admin()
    OR (
      is_published = TRUE
      AND EXISTS (
        SELECT 1
        FROM public.challenge_levels cl
        WHERE cl.id = challenges.level_id
          AND cl.is_active = TRUE
      )
    )
  );

CREATE POLICY challenges_admin_write
  ON challenges
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY student_challenge_progress_select
  ON student_challenge_progress
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR student_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.is_challenge_level_unlocked_for_student(
  p_student_id UUID,
  p_level_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_order INTEGER;
  previous_level RECORD;
BEGIN
  SELECT sort_order INTO target_order
  FROM public.challenge_levels
  WHERE id = p_level_id
    AND is_active = TRUE;

  IF target_order IS NULL THEN
    RETURN FALSE;
  END IF;

  IF target_order = (
    SELECT MIN(sort_order)
    FROM public.challenge_levels
    WHERE is_active = TRUE
  ) THEN
    RETURN TRUE;
  END IF;

  FOR previous_level IN
    SELECT id
    FROM public.challenge_levels
    WHERE is_active = TRUE
      AND sort_order < target_order
    ORDER BY sort_order
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.challenges c
      WHERE c.level_id = previous_level.id
        AND c.is_published = TRUE
        AND c.is_required = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM public.student_challenge_progress scp
          WHERE scp.student_id = p_student_id
            AND scp.challenge_id = c.id
            AND scp.status = 'completed'
        )
    ) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_student_challenge_progress(
  p_challenge_id UUID,
  p_status TEXT
)
RETURNS student_challenge_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_student_id UUID := auth.uid();
  target_challenge public.challenges;
  next_progress public.student_challenge_progress;
  normalized_status TEXT := lower(trim(COALESCE(p_status, '')));
BEGIN
  IF current_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_active_student() THEN
    RAISE EXCEPTION 'Only active students can update challenge progress'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Unsupported challenge progress status'
      USING ERRCODE = '22023';
  END IF;

  SELECT c.* INTO target_challenge
  FROM public.challenges c
  JOIN public.challenge_levels cl ON cl.id = c.level_id
  WHERE c.id = p_challenge_id
    AND c.is_published = TRUE
    AND cl.is_active = TRUE;

  IF target_challenge.id IS NULL THEN
    RAISE EXCEPTION 'Challenge not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_challenge_level_unlocked_for_student(current_student_id, target_challenge.level_id) THEN
    RAISE EXCEPTION 'Complete the previous challenge level first'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.student_challenge_progress (
    student_id,
    challenge_id,
    status,
    started_at,
    completed_at
  )
  VALUES (
    current_student_id,
    p_challenge_id,
    normalized_status,
    NOW(),
    CASE WHEN normalized_status = 'completed' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (student_id, challenge_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    started_at = COALESCE(student_challenge_progress.started_at, EXCLUDED.started_at),
    completed_at = CASE
      WHEN EXCLUDED.status = 'completed' THEN NOW()
      ELSE student_challenge_progress.completed_at
    END,
    updated_at = NOW()
  RETURNING * INTO next_progress;

  RETURN next_progress;
END;
$$;

REVOKE ALL ON FUNCTION public.is_challenge_level_unlocked_for_student(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_student_challenge_progress(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_challenge_level_unlocked_for_student(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_student_challenge_progress(UUID, TEXT) TO authenticated;

INSERT INTO challenge_levels (name, slug, difficulty, sort_order, is_active)
VALUES
  ('Easy', 'easy', 'easy', 1, TRUE),
  ('Medium', 'medium', 'medium', 2, TRUE),
  ('Hard', 'hard', 'hard', 3, TRUE),
  ('Extreme', 'extreme', 'extreme', 4, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  difficulty = EXCLUDED.difficulty,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

COMMENT ON TABLE challenge_levels IS
  'Ordered universal challenge difficulty levels. These are platform-wide and admin-managed.';

COMMENT ON TABLE challenges IS
  'Admin-created universal challenges. Separate from trainer classroom challenge_assignments/homework.';

COMMENT ON TABLE student_challenge_progress IS
  'Student-owned universal challenge progress. Written through set_student_challenge_progress to enforce unlock rules.';

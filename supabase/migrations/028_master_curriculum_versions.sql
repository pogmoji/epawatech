-- ============================================================
-- Migration 028 — Master curriculum version awareness
-- ePawatech — master update notices for trainer overrides
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- If Admin updates a master lesson that a trainer already customized, the
-- classroom should keep the trainer's customized version while clearly showing
-- that a newer master version exists.

ALTER TABLE lesson_activities
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE classroom_curriculum_overrides
  ADD COLUMN IF NOT EXISTS based_on_master_version INTEGER;

UPDATE classroom_curriculum_overrides cco
SET based_on_master_version = la.version
FROM lesson_activities la
WHERE cco.master_activity_id = la.id
  AND cco.based_on_master_version IS NULL;

DROP TRIGGER IF EXISTS set_lesson_activities_updated_at ON lesson_activities;
CREATE TRIGGER set_lesson_activities_updated_at
  BEFORE UPDATE ON lesson_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN lesson_activities.version IS
  'Incremented when Admin changes the master activity payload or activity type.';

COMMENT ON COLUMN classroom_curriculum_overrides.based_on_master_version IS
  'Master lesson activity version the classroom override was based on. '
  'If lower than lesson_activities.version, trainer UI can show that Admin has updated the master.';

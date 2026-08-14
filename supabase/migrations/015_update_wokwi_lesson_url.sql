-- ============================================================
-- Migration 015 — Update Week 6 Lesson 3 Wokwi URL
-- ePawatech — Stage 2 content correction
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.

UPDATE lesson_activities
SET configuration = jsonb_set(
  configuration,
  '{src}',
  to_jsonb('https://wokwi.com/'::TEXT),
  TRUE
)
WHERE id = '04060300-0000-0000-0000-000000000001'
  AND lesson_id = '03060000-0000-0000-0000-000000000003'
  AND activity_type = 'wokwi-embed';

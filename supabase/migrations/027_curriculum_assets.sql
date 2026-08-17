-- ============================================================
-- Migration 027 — Classroom curriculum image assets
-- ePawatech — trainer-editable lesson images
-- ============================================================
-- Review this file before running it in the Supabase SQL editor.
-- It is intentionally not executed by Codex.
--
-- Why:
-- Trainers can add images to drag/drop lesson items and target zones. These
-- are learner-facing curriculum assets, so the bucket is public-read while
-- writes are limited to active trainers and admins.

INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculum-assets', 'curriculum-assets', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS curriculum_assets_select ON storage.objects;
DROP POLICY IF EXISTS curriculum_assets_insert ON storage.objects;
DROP POLICY IF EXISTS curriculum_assets_update ON storage.objects;
DROP POLICY IF EXISTS curriculum_assets_delete ON storage.objects;

CREATE POLICY curriculum_assets_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'curriculum-assets');

CREATE POLICY curriculum_assets_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'curriculum-assets'
    AND (
      public.is_admin()
      OR public.is_active_trainer()
    )
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY curriculum_assets_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'curriculum-assets'
    AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::TEXT)
  )
  WITH CHECK (
    bucket_id = 'curriculum-assets'
    AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::TEXT)
  );

CREATE POLICY curriculum_assets_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'curriculum-assets'
    AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::TEXT)
  );

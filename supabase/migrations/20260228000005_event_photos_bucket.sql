-- =====================================================================================
-- Event Photos Storage Bucket
-- =====================================================================================
-- Migration: 20260228000005_event_photos_bucket.sql
-- Description: Creates the event-photos private Supabase Storage bucket.
--   PRIVATE bucket — all reads require signed URLs generated server-side.
--   10MB limit per file. Images only (JPEG, PNG, HEIC, HEIF, WebP).
--
-- Path format: {tenant_id}/{event_id}/{photo_id}.{ext}
-- The tenant_id as the first path segment enables efficient storage-level RLS.
--
-- Companion table migration: 20260228000004_event_photo_gallery.sql
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Create the bucket
-- =====================================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-photos',
  'event-photos',
  false,          -- PRIVATE: signed URLs required for all reads
  10485760,       -- 10MB per file
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- =====================================================================================
-- STEP 2: Storage RLS policies on storage.objects
--
-- Path structure: event-photos/{tenant_id}/{event_id}/{photo_id}.{ext}
--   segment 1 (split_part(name, '/', 1)) = tenant_id
--   segment 2 (split_part(name, '/', 2)) = event_id
--
-- These policies complement the event_photos table RLS. They ensure that
-- even direct storage API calls are tenant-scoped and client-ownership-verified.
-- =====================================================================================

-- Chefs: upload objects where segment 1 matches their tenant
CREATE POLICY "event_photos_chef_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
-- Chefs: read objects in their tenant prefix (needed for signed URL generation)
CREATE POLICY "event_photos_chef_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
-- Chefs: delete objects in their tenant prefix
-- (Hard delete in storage is triggered by server action after soft-deleting in DB)
CREATE POLICY "event_photos_chef_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
-- Clients: read objects for events that belong to them.
-- segment 2 = event_id; verified via events.client_id join.
-- Path construction is always server-controlled so the UUID cast is safe.
CREATE POLICY "event_photos_client_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND get_current_user_role() = 'client'
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = split_part(name, '/', 2)::uuid
      AND e.client_id = get_current_client_id()
  )
);

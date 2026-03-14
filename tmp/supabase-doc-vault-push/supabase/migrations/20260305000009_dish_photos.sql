-- =====================================================================================
-- Dish Photos
-- =====================================================================================
-- Migration: 20260305000009_dish_photos.sql
-- Description:
--   1. Adds photo_url column to the dishes table (recipes.photo_url already exists
--      from Layer 4 — this migration activates it by creating the storage bucket).
--   2. Creates the dish-photos PUBLIC storage bucket.
--      Public = permanent URLs, no signed URLs needed. These are portfolio/showcase
--      images the chef may share with clients and for social content.
--
-- Path structure:
--   {tenant_id}/recipes/{recipe_id}.{ext}   — canonical recipe photo
--   {tenant_id}/dishes/{dish_id}.{ext}      — per-dish plating photo (specific event)
--
-- Related files:
--   lib/dishes/photo-actions.ts   — upload / remove server actions
--   components/dishes/dish-photo-upload.tsx — upload UI component
-- =====================================================================================

-- ─── 1. Add photo_url to dishes ────────────────────────────────────────────────

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
-- ─── 2. Create dish-photos storage bucket (PUBLIC) ─────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dish-photos',
  'dish-photos',
  true,         -- PUBLIC: permanent public URLs, no signed URLs required
  10485760,     -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- ─── 3. Storage RLS policies ────────────────────────────────────────────────────
--
-- Path structure:
--   segment 1 (split_part(name, '/', 1)) = tenant_id
--   segment 2 (split_part(name, '/', 2)) = 'recipes' | 'dishes'
--   segment 3 (split_part(name, '/', 3)) = {entity_id}.{ext}
--
-- Chefs can upload objects only to their own tenant prefix.
-- Everyone can read (public bucket).
-- ────────────────────────────────────────────────────────────────────────────────

-- Chefs: upload objects to their tenant prefix
CREATE POLICY "dish_photos_chef_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dish-photos'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
-- Chefs: replace objects in their tenant prefix (upsert path)
CREATE POLICY "dish_photos_chef_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dish-photos'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
-- Chefs: delete objects in their tenant prefix
CREATE POLICY "dish_photos_chef_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dish-photos'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
-- Everyone (including unauthenticated): read all dish photos
-- Public bucket = portfolio images safe to share publicly
CREATE POLICY "dish_photos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dish-photos');

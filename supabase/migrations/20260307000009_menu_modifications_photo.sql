-- Phase 4.5: Modification Photo Proof
-- Adds photo_url to menu_modifications so chefs can attach a photo showing
-- what was actually served (e.g., the substituted dish plated and ready).
-- Additive only — no existing columns are altered.

ALTER TABLE menu_modifications
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN menu_modifications.photo_url IS
  'Optional proof photo URL (Supabase Storage) showing the actual dish as served. Supports post-service accountability.';

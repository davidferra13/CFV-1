-- =====================================================================================
-- Event Photos: Portfolio Builder Extension
-- =====================================================================================
-- Migration: 20260401000025_event_photos.sql
-- Description: Adds portfolio/photo-type columns to existing event_photos table.
--   Enables photo categorization (plating, setup, process, etc.), portfolio flagging,
--   and public visibility for chef website/marketing use.
--
-- This migration is purely additive. No existing columns or data are modified.
-- Dependencies:
--   20260228000004_event_photo_gallery.sql (event_photos table)
-- =====================================================================================

-- =====================================================================================
-- ADD COLUMNS to event_photos
-- =====================================================================================

-- Photo category for organization and filtering
ALTER TABLE event_photos
  ADD COLUMN IF NOT EXISTS photo_type text
  CHECK (photo_type IS NULL OR photo_type IN (
    'plating', 'setup', 'process', 'ingredients', 'ambiance', 'team', 'other'
  ));

-- Portfolio flag: chef marks their best work for marketing
ALTER TABLE event_photos
  ADD COLUMN IF NOT EXISTS is_portfolio boolean NOT NULL DEFAULT false;

-- Public visibility: controls whether photo appears on chef's public portfolio page
ALTER TABLE event_photos
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Optional thumbnail storage path (same bucket, /thumbnails/ prefix)
ALTER TABLE event_photos
  ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- When the photo was actually taken (vs when it was uploaded)
ALTER TABLE event_photos
  ADD COLUMN IF NOT EXISTS taken_at timestamptz;

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Portfolio queries: all portfolio photos for a chef
CREATE INDEX IF NOT EXISTS idx_event_photos_portfolio
  ON event_photos (tenant_id, is_portfolio)
  WHERE deleted_at IS NULL AND is_portfolio = true;

-- Public portfolio queries: public photos for chef website
CREATE INDEX IF NOT EXISTS idx_event_photos_public
  ON event_photos (tenant_id, is_public)
  WHERE deleted_at IS NULL AND is_public = true;

-- Photo type filtering within an event
CREATE INDEX IF NOT EXISTS idx_event_photos_type
  ON event_photos (tenant_id, event_id, photo_type)
  WHERE deleted_at IS NULL;

-- =====================================================================================
-- RLS: Public read policy for is_public photos
-- =====================================================================================

-- Anyone can view public portfolio photos (for chef website embedding)
CREATE POLICY event_photos_public_select ON event_photos
  FOR SELECT
  USING (
    is_public = true
    AND deleted_at IS NULL
  );

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON COLUMN event_photos.photo_type IS
  'Category tag: plating, setup, process, ingredients, ambiance, team, other. '
  'Used for filtering in portfolio view and photo organization.';

COMMENT ON COLUMN event_photos.is_portfolio IS
  'Chef-curated flag. When true, photo appears in the portfolio management view. '
  'Portfolio photos are the chef''s best work for marketing purposes.';

COMMENT ON COLUMN event_photos.is_public IS
  'Public visibility flag. When true, photo is accessible without authentication '
  'for use on the chef''s public portfolio/website page.';

COMMENT ON COLUMN event_photos.thumbnail_path IS
  'Optional thumbnail in the event-photos bucket. Path format: thumbnails/{tenant_id}/{event_id}/{photo_id}.{ext}. '
  'Generated during upload for faster gallery loading.';

COMMENT ON COLUMN event_photos.taken_at IS
  'When the photo was actually taken (from EXIF or manual entry), vs created_at (upload time).';

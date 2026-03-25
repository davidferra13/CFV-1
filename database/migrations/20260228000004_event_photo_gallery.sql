-- =====================================================================================
-- Event Photo Gallery
-- =====================================================================================
-- Migration: 20260228000004_event_photo_gallery.sql
-- Description: Adds event_photos table to store chef-uploaded dish/dinner photos.
--   Photos are tenant-scoped chef assets permanently linked to a specific event.
--   Chefs can upload, caption, reorder, and soft-delete photos.
--   Clients can view photos for their own completed events.
--
-- Storage bucket: event-photos (private, requires signed URLs — see 20260228000005)
-- Storage path format: {tenant_id}/{event_id}/{photo_id}.{ext}
--
-- This migration is purely additive. No existing tables are modified.
-- Dependencies:
--   20260215000001_layer_1_foundation.sql  (chefs, update_updated_at_column fn)
--   20260215000003_layer_3_events_quotes_financials.sql  (events)
-- =====================================================================================

-- =====================================================================================
-- TABLE: event_photos
-- =====================================================================================

CREATE TABLE event_photos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant scoping (mandatory on every table)
  tenant_id         UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Event association — photos belong to a specific dinner
  event_id          UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Storage reference — relative path in the 'event-photos' bucket
  -- NEVER store signed URLs here; generate on-demand via createSignedUrl
  storage_path      TEXT        NOT NULL,

  -- Original filename (display only — extension always derived from MIME type)
  filename_original TEXT        NOT NULL DEFAULT '',

  -- MIME type stored so extension can be re-derived if needed
  content_type      TEXT        NOT NULL,

  -- File size in bytes (for display and future quota enforcement)
  size_bytes        BIGINT      NOT NULL DEFAULT 0,

  -- Optional chef-added caption per photo
  caption           TEXT,

  -- Display ordering within an event gallery (lower = first)
  display_order     INTEGER     NOT NULL DEFAULT 0,

  -- Who uploaded this photo (chef auth user)
  uploaded_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft delete: NULL = active, set by deleteEventPhoto server action
  -- Storage object is also removed when this is set
  deleted_at        TIMESTAMPTZ
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Primary read pattern: all active photos for an event in display order
CREATE INDEX idx_event_photos_event_id
  ON event_photos (event_id, display_order)
  WHERE deleted_at IS NULL;

-- Cross-event asset library queries (future chef portfolio page)
CREATE INDEX idx_event_photos_tenant_id
  ON event_photos (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- =====================================================================================
-- TRIGGER: auto-update updated_at
-- =====================================================================================

CREATE TRIGGER event_photos_updated_at
  BEFORE UPDATE ON event_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Chefs: full read access to their tenant
DROP POLICY IF EXISTS event_photos_chef_select ON event_photos;
CREATE POLICY event_photos_chef_select ON event_photos
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Chefs: insert photos in their tenant
DROP POLICY IF EXISTS event_photos_chef_insert ON event_photos;
CREATE POLICY event_photos_chef_insert ON event_photos
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Chefs: update caption, display_order, deleted_at in their tenant
DROP POLICY IF EXISTS event_photos_chef_update ON event_photos;
CREATE POLICY event_photos_chef_update ON event_photos
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Clients: read active photos for their own events only
-- Join: event_photos.event_id → events.id → events.client_id = get_current_client_id()
DROP POLICY IF EXISTS event_photos_client_select ON event_photos;
CREATE POLICY event_photos_client_select ON event_photos
  FOR SELECT
  USING (
    get_current_user_role() = 'client'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
        AND e.client_id = get_current_client_id()
    )
  );

-- Hard DELETE is intentionally not allowed via RLS.
-- All deletion is soft-delete via UPDATE setting deleted_at.
-- The server action also cleans up the storage object independently.

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE event_photos IS
  'Chef-uploaded photos of dishes and dinners, permanently linked to a specific event. '
  'Serves as chef portfolio asset library and client post-dinner gallery. '
  'Storage bucket: event-photos (private). Uses soft delete only (deleted_at).';

COMMENT ON COLUMN event_photos.storage_path IS
  'Relative path in the event-photos bucket: {tenant_id}/{event_id}/{photo_id}.{ext}. '
  'Never store signed URLs here — always generate on demand.';

COMMENT ON COLUMN event_photos.display_order IS
  'Sort order within the event gallery. Lower values display first. '
  'Managed by reorderEventPhotos server action.';

COMMENT ON COLUMN event_photos.deleted_at IS
  'Soft delete. NULL = active photo. Set by deleteEventPhoto server action, '
  'which also removes the corresponding storage object.';

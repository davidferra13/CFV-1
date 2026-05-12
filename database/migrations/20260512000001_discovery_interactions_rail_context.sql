-- Migration: 20260512000001_discovery_interactions_rail_context.sql
-- Purpose: Store enough homepage discovery rail click context to optimize ordering,
--          mobile density, and location-aware destinations.

ALTER TABLE discovery_interactions
  ADD COLUMN IF NOT EXISTS base_href TEXT,
  ADD COLUMN IF NOT EXISTS destination_path TEXT,
  ADD COLUMN IF NOT EXISTS row_role TEXT,
  ADD COLUMN IF NOT EXISTS row_position INTEGER,
  ADD COLUMN IF NOT EXISTS row_item_count INTEGER,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_attached BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS presentation TEXT;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
    INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'discovery_interactions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%item_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE discovery_interactions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE discovery_interactions
  ADD CONSTRAINT discovery_interactions_item_type_check
  CHECK (item_type IN (
    'cuisine', 'food_type', 'craving', 'service', 'occasion', 'dietary',
    'featured_chef', 'chef_pick', 'combo', 'story', 'surprise', 'seasonal',
    'location', 'mood', 'price', 'time', 'group_size', 'saved',
    'special_dining', 'culinary_signal'
  ));

ALTER TABLE discovery_interactions
  ADD CONSTRAINT discovery_interactions_row_role_check
  CHECK (row_role IS NULL OR row_role IN ('cuisine', 'mobile', 'craving', 'intent'));

ALTER TABLE discovery_interactions
  ADD CONSTRAINT discovery_interactions_presentation_check
  CHECK (presentation IS NULL OR presentation IN ('pill', 'story'));

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_user_row
  ON discovery_interactions (auth_user_id, row_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_destination
  ON discovery_interactions (destination_path);

-- Client Preference History
-- Tracks liked/disliked dishes, ingredients, cuisines, and techniques per client.
-- Builds a cumulative taste profile over time (SevenRooms pattern).
--
-- NOTE: client_preferences table already exists from migration 20260330000052
-- (dashboard widget preferences). This migration adds taste-tracking columns
-- to the same table.

-- Create the rating enum
DO $$ BEGIN
  CREATE TYPE client_preference_rating AS ENUM ('loved', 'liked', 'neutral', 'disliked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create the item type enum
DO $$ BEGIN
  CREATE TYPE client_preference_item_type AS ENUM ('dish', 'ingredient', 'cuisine', 'technique');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add taste-tracking columns to existing table (idempotent)
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS item_type client_preference_item_type;
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS rating client_preference_rating DEFAULT 'neutral';
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE client_preferences ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_preferences_item_type ON client_preferences(item_type);
CREATE INDEX IF NOT EXISTS idx_client_preferences_rating ON client_preferences(rating);
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_type ON client_preferences(client_id, item_type);

-- RLS (table already has RLS enabled from earlier migration)
-- Add chef-scoped policies for the taste-tracking use case
DROP POLICY IF EXISTS "chef_read_own_preferences" ON client_preferences;
CREATE POLICY "chef_read_own_preferences"
  ON client_preferences FOR SELECT
  USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "chef_insert_own_preferences" ON client_preferences;
CREATE POLICY "chef_insert_own_preferences"
  ON client_preferences FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

DROP POLICY IF EXISTS "chef_update_own_preferences" ON client_preferences;
CREATE POLICY "chef_update_own_preferences"
  ON client_preferences FOR UPDATE
  USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "chef_delete_own_preferences" ON client_preferences;
CREATE POLICY "chef_delete_own_preferences"
  ON client_preferences FOR DELETE
  USING (tenant_id = auth.uid());

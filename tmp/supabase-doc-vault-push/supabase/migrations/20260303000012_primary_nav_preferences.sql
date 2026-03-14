-- Primary Navigation Preferences
-- Adds per-chef configurable primary shortcut href order.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS primary_nav_hrefs JSONB NOT NULL DEFAULT '[]'::jsonb;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chef_preferences_primary_nav_hrefs_array'
  ) THEN
    ALTER TABLE chef_preferences
      ADD CONSTRAINT chef_preferences_primary_nav_hrefs_array
      CHECK (jsonb_typeof(primary_nav_hrefs) = 'array');
  END IF;
END $$;

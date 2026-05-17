-- Venue Recon Intelligence
-- Extends the existing venue_profiles table with full recon columns:
-- address, venue_type, equipment lists, counter/parking/access/power/water notes,
-- photos array, quirks, visit_count.
-- Purely additive ALTER TABLE. No data loss.

ALTER TABLE venue_profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS venue_type TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS equipment_available TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS oven_type TEXT,
  ADD COLUMN IF NOT EXISTS counter_space_rating INTEGER,
  ADD COLUMN IF NOT EXISTS refrigeration_notes TEXT,
  ADD COLUMN IF NOT EXISTS parking_notes TEXT,
  ADD COLUMN IF NOT EXISTS access_instructions TEXT,
  ADD COLUMN IF NOT EXISTS power_outlets TEXT,
  ADD COLUMN IF NOT EXISTS water_access TEXT,
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quirks TEXT,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kitchen_notes TEXT;

-- Constraints on new columns
ALTER TABLE venue_profiles
  ADD CONSTRAINT venue_profiles_counter_space_rating_check
    CHECK (counter_space_rating IS NULL OR (counter_space_rating >= 1 AND counter_space_rating <= 5));

ALTER TABLE venue_profiles
  ADD CONSTRAINT venue_profiles_venue_type_check
    CHECK (venue_type IS NULL OR venue_type IN (
      'residential', 'commercial_kitchen', 'outdoor', 'venue_hall',
      'restaurant', 'office', 'other'
    ));

-- Address lookup index
CREATE INDEX IF NOT EXISTS idx_venue_profiles_address
  ON venue_profiles(tenant_id, address)
  WHERE address IS NOT NULL;

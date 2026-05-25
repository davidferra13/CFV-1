-- Event Intelligence Panel
-- Adds venue profile link, travel fields, and equipment rentals to events.
-- Additive only. No drops, no renames.

-- Link events to reusable venue profiles
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_profile_id UUID REFERENCES venue_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_venue_profile
  ON events(venue_profile_id) WHERE venue_profile_id IS NOT NULL;

-- Travel fields on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS travel_mode TEXT
    CHECK (travel_mode IS NULL OR travel_mode IN ('drive', 'fly', 'train', 'other')),
  ADD COLUMN IF NOT EXISTS travel_departure_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_return_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_notes TEXT,
  ADD COLUMN IF NOT EXISTS travel_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS accommodation_name TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_address TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_confirmation TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_cost_cents INTEGER;

-- Equipment rentals table
CREATE TABLE IF NOT EXISTS event_equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT,
  vendor_email TEXT,
  items TEXT[] NOT NULL DEFAULT '{}',
  pickup_at TIMESTAMPTZ,
  return_at TIMESTAMPTZ,
  cost_cents INTEGER,
  deposit_cents INTEGER,
  confirmation_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_equipment_rentals_event
  ON event_equipment_rentals(event_id);
CREATE INDEX IF NOT EXISTS idx_event_equipment_rentals_tenant
  ON event_equipment_rentals(tenant_id);

ALTER TABLE event_equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_equipment_rentals_tenant
  ON event_equipment_rentals
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::uuid);

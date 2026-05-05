-- Venue Details for Co-Hosted Events
-- Farmer/venue host manages property logistics: parking, access, rules, setup.

CREATE TABLE IF NOT EXISTS event_venue_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Parking
  parking_capacity INTEGER,
  parking_instructions TEXT,
  overflow_plan TEXT,

  -- Access
  gate_code TEXT,
  access_instructions TEXT,
  directions_from_road TEXT,

  -- Property Rules
  property_rules TEXT[], -- array of rule strings
  no_smoking_areas TEXT,
  pet_policy TEXT,
  off_limits_areas TEXT,

  -- Weather Contingency
  rain_backup_plan TEXT,
  cancel_weather_threshold TEXT,

  -- Infrastructure
  power_access_notes TEXT,
  water_access_notes TEXT,
  restroom_info TEXT,
  portable_restrooms_needed BOOLEAN DEFAULT false,

  -- Setup Zones
  kitchen_zone TEXT,
  dining_zone TEXT,
  bar_zone TEXT,
  other_zones JSONB DEFAULT '[]',

  -- Guest Arrival
  welcome_message TEXT,
  arrival_window_minutes INTEGER DEFAULT 30,
  stagger_arrivals BOOLEAN DEFAULT false,

  -- Farmer Profile (shown on public event page)
  farm_name TEXT,
  farm_bio TEXT,
  farm_photo_url TEXT,
  farm_website TEXT,
  farm_social_url TEXT,
  farm_logo_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_venue_details_event ON event_venue_details(event_id);

ALTER TABLE event_venue_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_venue_details_tenant ON event_venue_details
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::uuid);

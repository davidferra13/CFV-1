-- Migration: Food Truck Locations and Schedule
-- Two new tables for food truck location roster and rotation scheduling.
-- Additive only - no drops, no type changes.

-- Table: truck_locations
-- Stores the roster of spots a food truck regularly visits.
CREATE TABLE IF NOT EXISTS truck_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  contact_name TEXT,
  contact_phone TEXT,
  permit_required BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE truck_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage their own truck locations"
  ON truck_locations
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
CREATE INDEX idx_truck_locations_tenant ON truck_locations(tenant_id);
COMMENT ON TABLE truck_locations IS 'Food truck location roster - spots the truck regularly visits';
-- Table: truck_schedule
-- Tracks which location a truck is visiting on which date and time.
CREATE TABLE IF NOT EXISTS truck_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES truck_locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  expected_covers INTEGER,
  actual_covers INTEGER,
  revenue_cents INTEGER,
  weather_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, date, location_id)
);
ALTER TABLE truck_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage their own truck schedule"
  ON truck_schedule
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
CREATE INDEX idx_truck_schedule_tenant ON truck_schedule(tenant_id);
CREATE INDEX idx_truck_schedule_date ON truck_schedule(tenant_id, date);
CREATE INDEX idx_truck_schedule_location ON truck_schedule(location_id);
-- Validate status values
ALTER TABLE truck_schedule
  ADD CONSTRAINT truck_schedule_status_check
  CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));
COMMENT ON TABLE truck_schedule IS 'Food truck daily schedule - which location to visit, when, and post-service metrics';
COMMENT ON COLUMN truck_schedule.revenue_cents IS 'Revenue in cents (minor units) - filled after service';
COMMENT ON COLUMN truck_schedule.expected_covers IS 'Estimated number of customers';
COMMENT ON COLUMN truck_schedule.actual_covers IS 'Actual number of customers served - filled after service';

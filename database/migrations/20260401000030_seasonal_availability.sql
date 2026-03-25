-- Seasonal Availability Management
-- Allows chefs who travel seasonally to manage location-based availability periods

CREATE TABLE IF NOT EXISTS seasonal_availability_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  period_name text NOT NULL,
  location text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_accepting_bookings boolean DEFAULT true,
  max_events_per_week int DEFAULT 5,
  travel_radius_miles int,
  notes text,
  recurring_yearly boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT end_after_start CHECK (end_date > start_date)
);

-- Index for efficient lookups by chef and date range
CREATE INDEX IF NOT EXISTS idx_seasonal_availability_chef_dates
  ON seasonal_availability_periods (chef_id, start_date, end_date);

-- RLS
ALTER TABLE seasonal_availability_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own seasonal periods" ON seasonal_availability_periods;
CREATE POLICY "Chefs manage own seasonal periods"
  ON seasonal_availability_periods
  FOR ALL
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

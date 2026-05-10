-- Recurring Schedule Auto-Generation
-- Adds lead_time_days and auto_generate flag to recurring_schedules,
-- plus quarterly frequency support. Enables automatic draft event creation
-- when (next_occurrence - lead_time_days) <= today.

-- Add auto-generation columns
ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 21,
  ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_zip TEXT,
  ADD COLUMN IF NOT EXISTS occasion TEXT,
  ADD COLUMN IF NOT EXISTS service_style TEXT;

-- Expand frequency check to include quarterly
ALTER TABLE recurring_schedules DROP CONSTRAINT IF EXISTS recurring_schedules_frequency_check;
ALTER TABLE recurring_schedules
  ADD CONSTRAINT recurring_schedules_frequency_check
  CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly'));

-- Track which auto-generated events came from which schedule
CREATE TABLE IF NOT EXISTS recurring_auto_generated_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recurring_auto_gen_tenant
  ON recurring_auto_generated_events(tenant_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_recurring_auto_gen_schedule
  ON recurring_auto_generated_events(schedule_id);

-- RLS
ALTER TABLE recurring_auto_generated_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rage_select ON recurring_auto_generated_events;
CREATE POLICY rage_select ON recurring_auto_generated_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS rage_insert ON recurring_auto_generated_events;
CREATE POLICY rage_insert ON recurring_auto_generated_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS rage_update ON recurring_auto_generated_events;
CREATE POLICY rage_update ON recurring_auto_generated_events FOR UPDATE
  USING (true);

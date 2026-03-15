-- Floor Plans & Multi-Day Event Support
-- Additive migration: new table + new columns only

-- ============================================
-- Feature 1: Event Floor Plans
-- ============================================
CREATE TABLE IF NOT EXISTS event_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Floor Plan',
  canvas_width INTEGER NOT NULL DEFAULT 800,
  canvas_height INTEGER NOT NULL DEFAULT 600,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_floor_plans_event_id ON event_floor_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_event_floor_plans_chef_id ON event_floor_plans(chef_id);
ALTER TABLE event_floor_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage own floor plans" ON event_floor_plans;
CREATE POLICY "Chefs manage own floor plans"
  ON event_floor_plans
  FOR ALL
  USING (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_event_floor_plans_updated_at
  BEFORE UPDATE ON event_floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- Feature 2: Multi-Day Event Support
-- ============================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_multi_day BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS day_schedules JSONB;

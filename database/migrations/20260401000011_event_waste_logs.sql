-- Post-Event Waste Tracking
-- Logs food waste per event with cost impact for trend analysis.
-- No competitor offers this. Low-hanging fruit for chef sustainability insights.

CREATE TABLE IF NOT EXISTS event_waste_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_name             TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('protein', 'produce', 'dairy', 'grain', 'prepared_dish', 'other')),
  quantity_description  TEXT,
  estimated_cost_cents  INTEGER CHECK (estimated_cost_cents IS NULL OR estimated_cost_cents >= 0),
  reason                TEXT NOT NULL CHECK (reason IN ('overproduction', 'spoilage', 'guest_no_show', 'dietary_change', 'quality_issue', 'other')),
  notes                 TEXT,
  logged_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_waste_logs_tenant ON event_waste_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_waste_logs_event ON event_waste_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_waste_logs_logged_at ON event_waste_logs(logged_at);

-- RLS
ALTER TABLE event_waste_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ewl_chef_all ON event_waste_logs;
CREATE POLICY ewl_chef_all ON event_waste_logs
  FOR ALL
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_event_waste_logs_updated_at ON event_waste_logs;
CREATE TRIGGER trg_event_waste_logs_updated_at
  BEFORE UPDATE ON event_waste_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

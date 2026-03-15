-- New: Track which vendor supplied which event.
-- Currently vendors exist but have no event linkage. A chef needs to know
-- "I got the fish from X for the Johnson wedding."

CREATE TABLE vendor_event_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  notes           TEXT,
  amount_cents    INTEGER CHECK (amount_cents IS NULL OR amount_cents >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (vendor_id, event_id)
);
-- Indexes
CREATE INDEX idx_vendor_event_assignments_tenant ON vendor_event_assignments(tenant_id);
CREATE INDEX idx_vendor_event_assignments_event ON vendor_event_assignments(event_id);
CREATE INDEX idx_vendor_event_assignments_vendor ON vendor_event_assignments(vendor_id);
-- RLS
ALTER TABLE vendor_event_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vea_chef_all ON vendor_event_assignments;
CREATE POLICY vea_chef_all ON vendor_event_assignments
  FOR ALL
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
-- Updated_at trigger
CREATE TRIGGER trg_vendor_event_assignments_updated_at
  BEFORE UPDATE ON vendor_event_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Event Vendor Deliveries
-- Tracks when each vendor arrives/delivers for a specific event.
-- Supports both linked vendors (from vendors table) and one-off vendors.

-- Delivery type enum
DO $$ BEGIN
  CREATE TYPE delivery_type AS ENUM (
    'food', 'equipment', 'rentals', 'flowers', 'av', 'linen', 'ice', 'beverage', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Delivery status enum
DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'scheduled', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE event_vendor_deliveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Vendor reference (nullable for one-off vendors)
  vendor_id             UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name           TEXT NOT NULL,  -- denormalized or for one-offs

  -- Delivery details
  delivery_type         delivery_type NOT NULL DEFAULT 'other',
  scheduled_time        TIMESTAMPTZ,
  actual_arrival_time   TIMESTAMPTZ,
  contact_name          TEXT,
  contact_phone         TEXT,
  items_description     TEXT,          -- what's being delivered
  special_instructions  TEXT,          -- "use loading dock", "needs refrigeration immediately"

  -- Status tracking
  status                delivery_status NOT NULL DEFAULT 'scheduled',
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vendor_deliveries_event ON event_vendor_deliveries(event_id);
CREATE INDEX idx_vendor_deliveries_chef  ON event_vendor_deliveries(chef_id);
CREATE INDEX idx_vendor_deliveries_vendor ON event_vendor_deliveries(vendor_id);
CREATE INDEX idx_vendor_deliveries_status ON event_vendor_deliveries(event_id, status);

-- Updated_at trigger
CREATE TRIGGER trg_vendor_deliveries_updated_at
  BEFORE UPDATE ON event_vendor_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE event_vendor_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY evd_chef_select ON event_vendor_deliveries
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY evd_chef_insert ON event_vendor_deliveries
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY evd_chef_update ON event_vendor_deliveries
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY evd_chef_delete ON event_vendor_deliveries
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

COMMENT ON TABLE event_vendor_deliveries IS 'Tracks vendor delivery schedules per event. Supports linked and one-off vendors.';

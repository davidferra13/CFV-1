-- Vendor Communication Foundation
-- Additive companion tables for deterministic vendor order drafting and history.

CREATE TABLE IF NOT EXISTS vendor_communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  preferred_channel TEXT NOT NULL DEFAULT 'email'
    CHECK (preferred_channel IN ('email', 'phone', 'sms', 'portal', 'in_person')),
  order_cutoff_time TIME,
  lead_time_hours INTEGER CHECK (lead_time_hours IS NULL OR lead_time_hours >= 0),
  minimum_order_cents INTEGER CHECK (minimum_order_cents IS NULL OR minimum_order_cents >= 0),
  ingredient_categories TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_comm_preferences_chef
  ON vendor_communication_preferences(chef_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_comm_preferences_categories
  ON vendor_communication_preferences USING gin(ingredient_categories);

CREATE TABLE IF NOT EXISTS vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready_to_send', 'sent', 'confirmed', 'received', 'cancelled')),
  channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'phone', 'sms', 'portal', 'in_person')),
  order_summary TEXT NOT NULL DEFAULT '',
  estimated_total_cents INTEGER CHECK (estimated_total_cents IS NULL OR estimated_total_cents >= 0),
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_chef_created
  ON vendor_orders(chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor_created
  ON vendor_orders(chef_id, vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_event
  ON vendor_orders(chef_id, event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vendor_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES vendor_orders(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  ingredient_category TEXT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  estimated_unit_cost_cents INTEGER CHECK (estimated_unit_cost_cents IS NULL OR estimated_unit_cost_cents >= 0),
  estimated_total_cents INTEGER CHECK (estimated_total_cents IS NULL OR estimated_total_cents >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_order_items_order
  ON vendor_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_vendor_order_items_chef_ingredient
  ON vendor_order_items(chef_id, lower(ingredient_name));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendor_communication_preferences_updated_at'
  ) THEN
    CREATE TRIGGER trg_vendor_communication_preferences_updated_at
      BEFORE UPDATE ON vendor_communication_preferences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendor_orders_updated_at'
  ) THEN
    CREATE TRIGGER trg_vendor_orders_updated_at
      BEFORE UPDATE ON vendor_orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE vendor_communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_communication_preferences'
      AND policyname = 'vendor_communication_preferences_chef_all'
  ) THEN
    CREATE POLICY vendor_communication_preferences_chef_all
      ON vendor_communication_preferences
      FOR ALL USING (chef_id = get_current_tenant_id())
      WITH CHECK (chef_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_orders'
      AND policyname = 'vendor_orders_chef_all'
  ) THEN
    CREATE POLICY vendor_orders_chef_all
      ON vendor_orders
      FOR ALL USING (chef_id = get_current_tenant_id())
      WITH CHECK (chef_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_order_items'
      AND policyname = 'vendor_order_items_chef_all'
  ) THEN
    CREATE POLICY vendor_order_items_chef_all
      ON vendor_order_items
      FOR ALL USING (chef_id = get_current_tenant_id())
      WITH CHECK (chef_id = get_current_tenant_id());
  END IF;
END $$;

COMMENT ON TABLE vendor_communication_preferences IS 'Per-chef vendor communication settings used for deterministic order grouping.';
COMMENT ON TABLE vendor_orders IS 'Deterministic vendor order drafts and history generated from shopping lists.';
COMMENT ON TABLE vendor_order_items IS 'Ingredient line items attached to vendor order records.';

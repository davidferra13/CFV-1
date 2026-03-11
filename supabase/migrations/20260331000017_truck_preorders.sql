-- Migration: Food Truck Pre-Orders
-- Allows customers to pre-order for pickup at scheduled truck stops.
-- Additive only - no drops, no type changes.

CREATE TABLE IF NOT EXISTS truck_preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  schedule_id UUID REFERENCES truck_schedule(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME,
  items JSONB NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE truck_preorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage their own truck preorders"
  ON truck_preorders
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
CREATE INDEX idx_truck_preorders_tenant_date ON truck_preorders(tenant_id, pickup_date);
CREATE INDEX idx_truck_preorders_schedule ON truck_preorders(schedule_id);
ALTER TABLE truck_preorders
  ADD CONSTRAINT truck_preorders_status_check
  CHECK (status IN ('pending', 'confirmed', 'ready', 'picked_up', 'cancelled', 'no_show'));
ALTER TABLE truck_preorders
  ADD CONSTRAINT truck_preorders_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
COMMENT ON TABLE truck_preorders IS 'Food truck pre-orders - customers order ahead for pickup at a scheduled stop';
COMMENT ON COLUMN truck_preorders.items IS 'JSONB array of {name, quantity, price_cents, notes}';
COMMENT ON COLUMN truck_preorders.total_cents IS 'Total in cents (minor units)';

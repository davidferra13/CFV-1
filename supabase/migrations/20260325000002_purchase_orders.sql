-- Migration: Purchase Orders + Receiving
-- Full PO lifecycle: draft -> submit -> receive -> match to invoice
-- Receiving creates inventory_transactions (type: receive)

-- ============================================
-- ENUM: Purchase order status
-- ============================================
DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft',
    'submitted',
    'partially_received',
    'received',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ============================================
-- TABLE: purchase_orders
-- ============================================
CREATE TABLE purchase_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id              UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id            UUID REFERENCES vendors(id) ON DELETE SET NULL,
  event_id             UUID REFERENCES events(id) ON DELETE SET NULL,

  po_number            TEXT,
  status               purchase_order_status NOT NULL DEFAULT 'draft',
  order_date           DATE,
  expected_delivery    DATE,
  delivery_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,

  estimated_total_cents INTEGER NOT NULL DEFAULT 0,
  actual_total_cents    INTEGER,

  photo_url            TEXT,
  notes                TEXT,
  submitted_at         TIMESTAMPTZ,
  received_at          TIMESTAMPTZ,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_chef_status ON purchase_orders(chef_id, status);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_po_event ON purchase_orders(event_id) WHERE event_id IS NOT NULL;
CREATE TRIGGER trg_po_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE: purchase_order_items
-- ============================================
CREATE TABLE purchase_order_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id         UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id             UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name           TEXT NOT NULL,

  -- Ordered
  ordered_qty               NUMERIC(10,3) NOT NULL,
  unit                      TEXT NOT NULL,
  estimated_unit_price_cents INTEGER,
  estimated_total_cents      INTEGER,

  -- Received (filled during receiving workflow)
  received_qty              NUMERIC(10,3),
  actual_unit_price_cents    INTEGER,
  actual_total_cents         INTEGER,
  received_at               TIMESTAMPTZ,

  -- Status
  is_received               BOOLEAN NOT NULL DEFAULT false,
  is_shorted                BOOLEAN NOT NULL DEFAULT false,
  is_damaged                BOOLEAN NOT NULL DEFAULT false,
  damage_notes              TEXT,
  damage_photo_url          TEXT,

  -- Batch info (filled on receiving)
  expiry_date               DATE,
  lot_number                TEXT,

  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_ingredient ON purchase_order_items(ingredient_id) WHERE ingredient_id IS NOT NULL;
-- ============================================
-- RLS
-- ============================================
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
-- purchase_orders: chef-only CRUD
CREATE POLICY po_chef_select ON purchase_orders FOR SELECT
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY po_chef_insert ON purchase_orders FOR INSERT
  WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY po_chef_update ON purchase_orders FOR UPDATE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY po_chef_delete ON purchase_orders FOR DELETE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
-- purchase_order_items: via parent PO join
CREATE POLICY poi_chef_select ON purchase_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = purchase_order_id
    AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
CREATE POLICY poi_chef_insert ON purchase_order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = purchase_order_id
    AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
CREATE POLICY poi_chef_update ON purchase_order_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = purchase_order_id
    AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
CREATE POLICY poi_chef_delete ON purchase_order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = purchase_order_id
    AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));

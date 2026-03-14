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
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  po_number TEXT,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  order_date DATE,
  expected_delivery DATE,
  delivery_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  estimated_total_cents INTEGER NOT NULL DEFAULT 0,
  actual_total_cents INTEGER,
  photo_url TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS estimated_total_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS actual_total_cents INTEGER;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'expected_delivery_date'
  ) THEN
    UPDATE purchase_orders
    SET expected_delivery = expected_delivery_date
    WHERE expected_delivery IS NULL AND expected_delivery_date IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_po_chef_status ON purchase_orders(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_po_event ON purchase_orders(event_id) WHERE event_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_po_updated_at ON purchase_orders;
CREATE TRIGGER trg_po_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: purchase_order_items
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL,
  ordered_qty NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL,
  estimated_unit_price_cents INTEGER,
  estimated_total_cents INTEGER,
  received_qty NUMERIC(10,3),
  actual_unit_price_cents INTEGER,
  actual_total_cents INTEGER,
  received_at TIMESTAMPTZ,
  is_received BOOLEAN NOT NULL DEFAULT false,
  is_shorted BOOLEAN NOT NULL DEFAULT false,
  is_damaged BOOLEAN NOT NULL DEFAULT false,
  damage_notes TEXT,
  damage_photo_url TEXT,
  expiry_date DATE,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS ingredient_name TEXT;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC(10,3);
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS estimated_unit_price_cents INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS estimated_total_cents INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS received_qty NUMERIC(10,3);
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS actual_unit_price_cents INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS actual_total_cents INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS is_received BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS is_shorted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS is_damaged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS damage_notes TEXT;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS damage_photo_url TEXT;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS lot_number TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'po_id'
  ) THEN
    UPDATE purchase_order_items
    SET purchase_order_id = po_id
    WHERE purchase_order_id IS NULL AND po_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'item_name'
  ) THEN
    UPDATE purchase_order_items
    SET ingredient_name = item_name
    WHERE ingredient_name IS NULL AND item_name IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'quantity'
  ) THEN
    UPDATE purchase_order_items
    SET ordered_qty = quantity
    WHERE ordered_qty IS NULL AND quantity IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'received_quantity'
  ) THEN
    UPDATE purchase_order_items
    SET received_qty = received_quantity
    WHERE received_qty IS NULL AND received_quantity IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_ingredient ON purchase_order_items(ingredient_id) WHERE ingredient_id IS NOT NULL;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY po_chef_select ON purchase_orders FOR SELECT
    USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY po_chef_insert ON purchase_orders FOR INSERT
    WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY po_chef_update ON purchase_orders FOR UPDATE
    USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY po_chef_delete ON purchase_orders FOR DELETE
    USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY poi_chef_select ON purchase_order_items FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
      AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY poi_chef_insert ON purchase_order_items FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
      AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY poi_chef_update ON purchase_order_items FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
      AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY poi_chef_delete ON purchase_order_items FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
      AND po.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

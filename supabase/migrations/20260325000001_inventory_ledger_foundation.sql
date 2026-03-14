-- Migration: Inventory Ledger Foundation
-- The single source of truth for all inventory movements — append-only, like the financial ledger.
-- Adopts Restaurant365's transaction architecture adapted for private chef workflow.

-- ============================================
-- ENUM: Inventory transaction types
-- ============================================
DO $$ BEGIN
  CREATE TYPE inventory_transaction_type AS ENUM (
    'receive',           -- Goods received from vendor (PO or ad-hoc)
    'event_deduction',   -- Auto-deduction when event starts/completes
    'waste',             -- Food waste (links to waste_logs)
    'staff_meal',        -- Staff meal deduction
    'transfer_out',      -- Transfer to another location (negative at source)
    'transfer_in',       -- Transfer from another location (positive at dest)
    'audit_adjustment',  -- Correction from physical count
    'return_from_event', -- Unused ingredients brought back
    'return_to_vendor',  -- Returned damaged/wrong goods
    'manual_adjustment', -- Chef override
    'opening_balance'    -- Initial stock entry
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ENUM: Storage location types
-- ============================================
DO $$ BEGIN
  CREATE TYPE storage_location_type AS ENUM (
    'home_fridge',
    'home_freezer',
    'home_pantry',
    'home_dry_storage',
    'walk_in_cooler',
    'walk_in_freezer',
    'commercial_kitchen',
    'vehicle',
    'event_site',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLE: storage_locations
-- ============================================
CREATE TABLE storage_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  location_type   storage_location_type NOT NULL DEFAULT 'home_pantry',
  address         TEXT,
  temperature_zone TEXT CHECK (temperature_zone IS NULL OR temperature_zone IN ('ambient', 'refrigerated', 'frozen')),
  notes           TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_locations_chef ON storage_locations(chef_id, is_active);
CREATE UNIQUE INDEX idx_storage_locations_default ON storage_locations(chef_id) WHERE is_default = true;

CREATE TRIGGER trg_storage_locations_updated_at
  BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: inventory_transactions (THE LEDGER)
-- Append-only. Never update or delete rows.
-- Current quantity = SUM(quantity) grouped by ingredient.
-- ============================================
CREATE TABLE inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id     UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name   TEXT NOT NULL,

  -- Transaction details
  transaction_type  inventory_transaction_type NOT NULL,
  quantity          NUMERIC(10,3) NOT NULL,  -- Positive = add, negative = remove
  unit              TEXT NOT NULL,
  cost_cents        INTEGER,

  -- Location tracking
  location_id       UUID REFERENCES storage_locations(id) ON DELETE SET NULL,

  -- Linked entities (all optional)
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  purchase_order_id UUID,
  vendor_invoice_id UUID REFERENCES vendor_invoices(id) ON DELETE SET NULL,
  waste_log_id      UUID REFERENCES waste_logs(id) ON DELETE SET NULL,
  audit_id          UUID,
  transfer_pair_id  UUID,

  -- Batch tracking
  batch_id          UUID,
  expiry_date       DATE,

  -- Photo evidence
  photo_url         TEXT,

  -- Metadata
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (quantity != 0)
);

COMMENT ON TABLE inventory_transactions IS
  'Append-only inventory ledger. Every movement is a transaction. Current qty = SUM(quantity). Never delete rows.';

-- Indexes for common query patterns
CREATE INDEX idx_inv_tx_chef_ingredient ON inventory_transactions(chef_id, ingredient_id, created_at DESC);
CREATE INDEX idx_inv_tx_chef_type ON inventory_transactions(chef_id, transaction_type, created_at DESC);
CREATE INDEX idx_inv_tx_event ON inventory_transactions(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_inv_tx_location ON inventory_transactions(location_id, ingredient_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_inv_tx_batch ON inventory_transactions(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_inv_tx_created ON inventory_transactions(chef_id, created_at DESC);
CREATE INDEX idx_inv_tx_po ON inventory_transactions(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX idx_inv_tx_audit ON inventory_transactions(audit_id) WHERE audit_id IS NOT NULL;

-- ============================================
-- VIEW: inventory_current_stock
-- Derives current quantity from transaction ledger
-- ============================================
CREATE OR REPLACE VIEW inventory_current_stock AS
SELECT
  it.chef_id,
  it.ingredient_id,
  MAX(it.ingredient_name) AS ingredient_name,
  it.unit,
  SUM(it.quantity) AS current_qty,
  ic.par_level,
  ic.vendor_id,
  MAX(it.created_at) AS last_movement_at,
  COUNT(*) AS transaction_count
FROM inventory_transactions it
LEFT JOIN inventory_counts ic
  ON ic.chef_id = it.chef_id
  AND ic.ingredient_id = it.ingredient_id
GROUP BY it.chef_id, it.ingredient_id, it.unit, ic.par_level, ic.vendor_id;

-- ============================================
-- VIEW: inventory_by_location
-- Per-location stock levels
-- ============================================
CREATE OR REPLACE VIEW inventory_by_location AS
SELECT
  it.chef_id,
  it.location_id,
  sl.name AS location_name,
  sl.location_type,
  it.ingredient_id,
  MAX(it.ingredient_name) AS ingredient_name,
  it.unit,
  SUM(it.quantity) AS current_qty
FROM inventory_transactions it
LEFT JOIN storage_locations sl ON sl.id = it.location_id
WHERE it.location_id IS NOT NULL
GROUP BY it.chef_id, it.location_id, sl.name, sl.location_type,
         it.ingredient_id, it.unit
HAVING SUM(it.quantity) != 0;

-- ============================================
-- FUNCTION: get_ingredient_stock
-- Returns current quantity for a single ingredient
-- ============================================
CREATE OR REPLACE FUNCTION get_ingredient_stock(
  p_chef_id UUID,
  p_ingredient_id UUID
) RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(quantity), 0)
  FROM inventory_transactions
  WHERE chef_id = p_chef_id AND ingredient_id = p_ingredient_id;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- storage_locations: chef-only CRUD
CREATE POLICY sl_chef_select ON storage_locations FOR SELECT
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY sl_chef_insert ON storage_locations FOR INSERT
  WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY sl_chef_update ON storage_locations FOR UPDATE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY sl_chef_delete ON storage_locations FOR DELETE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));

-- inventory_transactions: chef-only SELECT + INSERT (NO UPDATE, NO DELETE — append-only)
CREATE POLICY it_chef_select ON inventory_transactions FOR SELECT
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY it_chef_insert ON inventory_transactions FOR INSERT
  WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));

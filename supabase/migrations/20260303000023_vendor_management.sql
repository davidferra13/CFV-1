-- Vendor / Supplier Management
-- Chef-facing directory of grocery stores, specialty purveyors, farms, etc.
-- Includes price history tracking per ingredient/vendor for cost comparison.

-- ============================================
-- TABLE 1: VENDORS
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name         TEXT NOT NULL,
  vendor_type  TEXT NOT NULL DEFAULT 'grocery'
               CHECK (vendor_type IN (
                 'grocery',
                 'specialty',
                 'butcher',
                 'fishmonger',
                 'farm',
                 'liquor',
                 'equipment',
                 'bakery',
                 'produce',
                 'dairy',
                 'other'
               )),

  phone        TEXT,
  email        TEXT,
  address      TEXT,
  website      TEXT,
  notes        TEXT,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_chef        ON vendors(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_chef_type   ON vendors(chef_id, vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_preferred   ON vendors(chef_id, is_preferred) WHERE is_preferred = true;

COMMENT ON TABLE vendors IS 'Chef supplier and vendor directory with contact info and preferred status.';

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: VENDOR PRICE POINTS
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_price_points (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id        UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id      UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Optional link to a recipe ingredient; otherwise free-text
  ingredient_id  UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  item_name      TEXT NOT NULL,   -- always store a name even if ingredient_id set

  price_cents    INTEGER NOT NULL CHECK (price_cents >= 0),
  unit           TEXT NOT NULL,   -- 'lb', 'each', 'case of 12', etc.
  recorded_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_points_vendor      ON vendor_price_points(vendor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_points_ingredient  ON vendor_price_points(chef_id, ingredient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_points_chef        ON vendor_price_points(chef_id, recorded_at DESC);

COMMENT ON TABLE vendor_price_points IS 'Price point log per item per vendor. Tracks cost trends over time for purchasing decisions.';
COMMENT ON COLUMN vendor_price_points.ingredient_id IS 'Optional FK to ingredients table. item_name always stored for standalone price points.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE vendors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_price_points ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY vendor_chef_select ON vendors FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vendor_chef_insert ON vendors FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vendor_chef_update ON vendors FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vendor_chef_delete ON vendors FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vpp_chef_select ON vendor_price_points FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vpp_chef_insert ON vendor_price_points FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vpp_chef_update ON vendor_price_points FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY vpp_chef_delete ON vendor_price_points FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

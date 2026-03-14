-- Vendor Management Hub + Smart Reorder Triggers
-- Adds reliability tracking, per-ingredient vendor preferences, and reorder settings.

-- ============================================
-- 1. ADD COLUMNS TO VENDORS
-- ============================================

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reliability_score NUMERIC(5,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS minimum_order_cents INTEGER;

COMMENT ON COLUMN vendors.reliability_score IS 'Computed as on_time_deliveries / total_deliveries * 100. Updated deterministically.';
COMMENT ON COLUMN vendors.minimum_order_cents IS 'Minimum order amount in cents for this vendor.';

-- ============================================
-- 2. VENDOR PREFERRED INGREDIENTS
-- Per-ingredient vendor preference (which vendor to buy X from).
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_preferred_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, ingredient_name)
);

CREATE INDEX IF NOT EXISTS idx_vpi_chef ON vendor_preferred_ingredients(chef_id);
CREATE INDEX IF NOT EXISTS idx_vpi_vendor ON vendor_preferred_ingredients(vendor_id);

COMMENT ON TABLE vendor_preferred_ingredients IS 'Maps each ingredient to its preferred vendor for reordering.';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vpi_updated_at') THEN
    CREATE TRIGGER trg_vpi_updated_at BEFORE UPDATE ON vendor_preferred_ingredients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE vendor_preferred_ingredients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY vpi_chef_select ON vendor_preferred_ingredients
    FOR SELECT USING (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vpi_chef_insert ON vendor_preferred_ingredients
    FOR INSERT WITH CHECK (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vpi_chef_update ON vendor_preferred_ingredients
    FOR UPDATE USING (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vpi_chef_delete ON vendor_preferred_ingredients
    FOR DELETE USING (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 3. REORDER SETTINGS
-- Per-ingredient configuration for smart reorder triggers.
-- ============================================

CREATE TABLE IF NOT EXISTS reorder_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name     TEXT NOT NULL,
  par_level           NUMERIC(10,2) NOT NULL DEFAULT 0,
  reorder_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  preferred_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  unit                TEXT NOT NULL DEFAULT 'each',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, ingredient_name)
);

CREATE INDEX IF NOT EXISTS idx_reorder_settings_chef ON reorder_settings(chef_id, is_active);

COMMENT ON TABLE reorder_settings IS 'Per-ingredient reorder configuration: par level, reorder quantity, preferred vendor.';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reorder_settings_updated_at') THEN
    CREATE TRIGGER trg_reorder_settings_updated_at BEFORE UPDATE ON reorder_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE reorder_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY rs_chef_select ON reorder_settings
    FOR SELECT USING (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rs_chef_insert ON reorder_settings
    FOR INSERT WITH CHECK (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rs_chef_update ON reorder_settings
    FOR UPDATE USING (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rs_chef_delete ON reorder_settings
    FOR DELETE USING (chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

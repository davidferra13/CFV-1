-- Feature U19: FIFO / Shelf Life Tracking
-- Feature U21: Multi-Location Awareness
-- Additive only: new tables + new nullable columns on existing tables

-- ============================================
-- U19: inventory_lots (FIFO / shelf life)
-- ============================================

CREATE TABLE inventory_lots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name     TEXT NOT NULL,
  quantity            NUMERIC NOT NULL CHECK (quantity >= 0),
  unit                TEXT NOT NULL,
  received_date       DATE NOT NULL,
  expiry_date         DATE,
  shelf_life_days     INTEGER,
  storage_location    TEXT CHECK (storage_location IS NULL OR storage_location IN ('walk_in', 'freezer', 'dry_storage', 'prep_area')),
  supplier            TEXT,
  lot_number          TEXT,
  cost_per_unit_cents INTEGER,
  status              TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'partially_used', 'consumed', 'expired', 'discarded')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_lots_ingredient_expiry ON inventory_lots(tenant_id, ingredient_name, expiry_date);
CREATE INDEX idx_inventory_lots_expiry ON inventory_lots(tenant_id, expiry_date);
CREATE INDEX idx_inventory_lots_status ON inventory_lots(tenant_id, status);

CREATE TRIGGER trg_inventory_lots_updated_at
  BEFORE UPDATE ON inventory_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY il_select ON inventory_lots FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY il_insert ON inventory_lots FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY il_update ON inventory_lots FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY il_delete ON inventory_lots FOR DELETE USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE inventory_lots IS 'Tracks individual ingredient lots for FIFO rotation and shelf-life management.';

-- Default shelf life settings per ingredient
CREATE TABLE ingredient_shelf_life_defaults (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  shelf_life_days INTEGER NOT NULL CHECK (shelf_life_days > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ingredient_name)
);

ALTER TABLE ingredient_shelf_life_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY isld_select ON ingredient_shelf_life_defaults FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY isld_insert ON ingredient_shelf_life_defaults FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY isld_update ON ingredient_shelf_life_defaults FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY isld_delete ON ingredient_shelf_life_defaults FOR DELETE USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE ingredient_shelf_life_defaults IS 'Default shelf life settings per ingredient for automatic expiry calculation.';


-- ============================================
-- U21: business_locations (multi-location)
-- ============================================

CREATE TABLE business_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  location_type   TEXT NOT NULL CHECK (location_type IN ('kitchen', 'storefront', 'truck', 'commissary', 'warehouse', 'office')),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  timezone        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_locations_tenant ON business_locations(tenant_id);

CREATE TRIGGER trg_business_locations_updated_at
  BEFORE UPDATE ON business_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY bl_select ON business_locations FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY bl_insert ON business_locations FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY bl_update ON business_locations FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY bl_delete ON business_locations FOR DELETE USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE business_locations IS 'Physical business locations for multi-location operations.';


-- ============================================
-- U21: Add location_id to existing tables
-- ============================================

-- staff_members uses chef_id
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL;

-- scheduled_shifts uses tenant_id
ALTER TABLE scheduled_shifts ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL;

-- inventory_counts uses chef_id
ALTER TABLE inventory_counts ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL;

-- sales uses tenant_id
ALTER TABLE sales ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL;

-- daily_checklist_completions uses chef_id
ALTER TABLE daily_checklist_completions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL;

-- Also add location_id to inventory_lots (cross-feature link)
ALTER TABLE inventory_lots ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL;

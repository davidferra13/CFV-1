-- Migration: 20260320000008_equipment_depreciation
-- Adds depreciation tracking to equipment_items and creates a schedule table.
-- All new columns on equipment_items are nullable — backward compatible.

-- Add depreciation metadata to equipment_items
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS depreciation_method TEXT DEFAULT NULL
    CHECK (depreciation_method IS NULL OR depreciation_method IN ('section_179', 'straight_line')),
  ADD COLUMN IF NOT EXISTS useful_life_years INTEGER CHECK (useful_life_years IS NULL OR useful_life_years > 0),
  ADD COLUMN IF NOT EXISTS salvage_value_cents INTEGER DEFAULT 0 CHECK (salvage_value_cents IS NULL OR salvage_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS tax_year_placed_in_service INTEGER;

COMMENT ON COLUMN equipment_items.depreciation_method IS
  'section_179 = full deduction in year of purchase. straight_line = cost/useful_life per year.';
COMMENT ON COLUMN equipment_items.useful_life_years IS
  'IRS GDS useful life years. Required for straight_line. Defaults: knives/cookware=5, appliances=7.';
COMMENT ON COLUMN equipment_items.tax_year_placed_in_service IS
  'Tax year placed in service. Defaults to purchase year if not specified.';

-- New table: per-asset, per-year depreciation schedule
CREATE TABLE equipment_depreciation_schedules (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  equipment_item_id             UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,

  tax_year                      INTEGER NOT NULL,
  depreciation_method           TEXT NOT NULL
                                CHECK (depreciation_method IN ('section_179', 'straight_line')),
  depreciable_basis_cents       INTEGER NOT NULL CHECK (depreciable_basis_cents >= 0),
  annual_depreciation_cents     INTEGER NOT NULL CHECK (annual_depreciation_cents >= 0),
  cumulative_depreciation_cents INTEGER NOT NULL DEFAULT 0,

  claimed                       BOOLEAN NOT NULL DEFAULT false,
  claimed_at                    TIMESTAMPTZ,
  notes                         TEXT,

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (equipment_item_id, tax_year)
);

CREATE INDEX idx_equip_deprec_chef_year ON equipment_depreciation_schedules(chef_id, tax_year);
CREATE INDEX idx_equip_deprec_item ON equipment_depreciation_schedules(equipment_item_id);

CREATE TRIGGER trg_equip_deprec_updated_at
  BEFORE UPDATE ON equipment_depreciation_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE equipment_depreciation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY edd_chef_select ON equipment_depreciation_schedules FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY edd_chef_insert ON equipment_depreciation_schedules FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY edd_chef_update ON equipment_depreciation_schedules FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY edd_chef_delete ON equipment_depreciation_schedules FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

COMMENT ON TABLE equipment_depreciation_schedules IS
  'Per-asset, per-year depreciation records for Schedule C Line 13 / Form 4562.';

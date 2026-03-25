-- =====================================================================================
-- ChefFlow V1 — Seasonal Palettes
-- =====================================================================================
-- Migration: 20260217000002_seasonal_palettes.sql
-- Description: Seasonal Palette definition engine. One palette per season per chef.
--              Stores sensory anchor, micro-windows, context profiles, pantry, energy, wins.
-- Dependencies: Layer 1 (chefs table, get_current_tenant_id(), update_updated_at_column())
-- =====================================================================================

-- Seasonal Palettes table
CREATE TABLE seasonal_palettes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Season definition
  season_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Date range (MM-DD format, cross-year boundary allowed for Winter)
  start_month_day TEXT NOT NULL,
  end_month_day TEXT NOT NULL,

  -- Layer 1: Sensory Anchor (creative thesis)
  sensory_anchor TEXT,

  -- Layer 2: Micro-Windows (JSONB array)
  -- [{name, ingredient, start_date, end_date, urgency, notes}]
  micro_windows JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Layer 3: Context Profiles (JSONB array)
  -- [{name, kitchen_reality, menu_guardrails, notes}]
  context_profiles JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Additional guidance fields
  pantry_and_preserve TEXT,
  chef_energy_reality TEXT,
  proven_wins JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT seasonal_palettes_tenant_season UNIQUE (tenant_id, season_name),
  CONSTRAINT seasonal_palettes_start_format CHECK (start_month_day ~ '^\d{2}-\d{2}$'),
  CONSTRAINT seasonal_palettes_end_format CHECK (end_month_day ~ '^\d{2}-\d{2}$')
);

COMMENT ON TABLE seasonal_palettes IS 'Seasonal definition engine — one palette per season per chef.';
COMMENT ON COLUMN seasonal_palettes.micro_windows IS 'Array: [{name, ingredient, start_date (MM-DD), end_date (MM-DD), urgency (high|normal), notes}]';
COMMENT ON COLUMN seasonal_palettes.context_profiles IS 'Array: [{name, kitchen_reality, menu_guardrails, notes}]';
COMMENT ON COLUMN seasonal_palettes.proven_wins IS 'Array: [{dish_name, notes, recipe_id (nullable)}]';

-- Indexes
CREATE INDEX idx_seasonal_palettes_tenant ON seasonal_palettes(tenant_id);
CREATE INDEX idx_seasonal_palettes_active ON seasonal_palettes(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_seasonal_palettes_dates ON seasonal_palettes(tenant_id, start_month_day, end_month_day);

-- RLS
ALTER TABLE seasonal_palettes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seasonal_palettes_tenant_select ON seasonal_palettes;
CREATE POLICY seasonal_palettes_tenant_select ON seasonal_palettes
  FOR SELECT USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS seasonal_palettes_tenant_insert ON seasonal_palettes;
CREATE POLICY seasonal_palettes_tenant_insert ON seasonal_palettes
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS seasonal_palettes_tenant_update ON seasonal_palettes;
CREATE POLICY seasonal_palettes_tenant_update ON seasonal_palettes
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS seasonal_palettes_tenant_delete ON seasonal_palettes;
CREATE POLICY seasonal_palettes_tenant_delete ON seasonal_palettes
  FOR DELETE USING (tenant_id = get_current_tenant_id());

-- Updated_at trigger
CREATE TRIGGER seasonal_palettes_updated_at
  BEFORE UPDATE ON seasonal_palettes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

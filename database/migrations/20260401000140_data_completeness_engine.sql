-- Data Completeness Engine
-- Spec: docs/specs/openclaw-data-completeness-engine.md
-- Adds: volatility tracking, USDA linking, region preferences, scaling data,
--        sale cycle detection, substitute mapping, package optimization,
--        trend forecasting, source URL tracking, and flyer archiving.
-- All changes are additive. No drops, no renames.

-- ============================================================================
-- Phase B: USDA linking on chef ingredients
-- ============================================================================
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS system_ingredient_id UUID REFERENCES system_ingredients(id) ON DELETE SET NULL;

-- Phase B: Source URL tracking on price history
ALTER TABLE ingredient_price_history
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- ============================================================================
-- Phase C: Volatility tracking on ingredients
-- ============================================================================
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS price_volatility_score NUMERIC(5,2);
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS price_volatility_band TEXT;
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS volatility_updated_at TIMESTAMPTZ;

-- ============================================================================
-- Phase E: Chef region preference
-- ============================================================================
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS preferred_region TEXT DEFAULT 'haverhill-ma';

-- ============================================================================
-- Phase G: Scaling metadata on system_ingredients
-- ============================================================================
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS scales_linearly BOOLEAN DEFAULT true;
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS scaling_notes TEXT;
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS cooking_yield_pct NUMERIC(5,2);
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS serving_size_grams NUMERIC(8,2);

-- ============================================================================
-- Phase G: Portion measures per system ingredient
-- ============================================================================
CREATE TABLE IF NOT EXISTS ingredient_portions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id UUID NOT NULL REFERENCES system_ingredients(id) ON DELETE CASCADE,
  measure_description TEXT NOT NULL,
  gram_weight NUMERIC(10,2) NOT NULL,
  sequence_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (system_ingredient_id, measure_description)
);

CREATE INDEX IF NOT EXISTS idx_portions_ingredient
  ON ingredient_portions (system_ingredient_id);

-- ============================================================================
-- Phase G: Cooking retention factors
-- ============================================================================
CREATE TABLE IF NOT EXISTS cooking_retention_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_group TEXT NOT NULL,
  cooking_method TEXT NOT NULL,
  nutrient_name TEXT NOT NULL,
  retention_pct NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (food_group, cooking_method, nutrient_name)
);

CREATE INDEX IF NOT EXISTS idx_retention_group
  ON cooking_retention_factors (food_group);
CREATE INDEX IF NOT EXISTS idx_retention_method
  ON cooking_retention_factors (cooking_method);

-- ============================================================================
-- Phase H: Sale cycle detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS ingredient_sale_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  avg_cycle_days INTEGER,
  last_sale_date DATE,
  predicted_next_sale DATE,
  confidence NUMERIC(3,2),
  avg_sale_discount_pct NUMERIC(5,2),
  data_points INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ingredient_id, tenant_id, store_name)
);

CREATE INDEX IF NOT EXISTS idx_sale_cycles_next
  ON ingredient_sale_cycles (predicted_next_sale)
  WHERE predicted_next_sale IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_cycles_tenant
  ON ingredient_sale_cycles (tenant_id);

-- ============================================================================
-- Phase I: Substitute mapping
-- ============================================================================
CREATE TABLE IF NOT EXISTS ingredient_substitutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  substitute_ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  reason TEXT,
  price_difference_pct NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ingredient_id, tenant_id, substitute_ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_substitutes_lookup
  ON ingredient_substitutes (ingredient_id, tenant_id, rank);

-- Phase I: Package optimization on openclaw.store_products
ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS price_per_standard_unit_cents INTEGER;
ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS is_best_value BOOLEAN DEFAULT false;

-- ============================================================================
-- Phase J: Trend forecasting on ingredients
-- ============================================================================
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS price_forecast_30d_cents INTEGER;
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS price_forecast_direction TEXT;
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS price_forecast_pct NUMERIC(5,2);
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS forecast_updated_at TIMESTAMPTZ;

-- ============================================================================
-- Phase K: Flyer archive
-- ============================================================================
CREATE TABLE IF NOT EXISTS openclaw.flyer_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_slug TEXT NOT NULL,
  store_name TEXT,
  flyer_date DATE NOT NULL,
  product_name TEXT NOT NULL,
  regular_price_cents INTEGER,
  sale_price_cents INTEGER,
  discount_pct NUMERIC(5,2),
  category TEXT,
  captured_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (chain_slug, flyer_date, product_name)
);

CREATE INDEX IF NOT EXISTS idx_flyer_archive_chain_date
  ON openclaw.flyer_archive (chain_slug, flyer_date DESC);
CREATE INDEX IF NOT EXISTS idx_flyer_archive_product
  ON openclaw.flyer_archive (product_name, flyer_date DESC);

-- ============================================================================
-- Indexes on new columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ingredients_volatility
  ON ingredients (price_volatility_band) WHERE price_volatility_band IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingredients_system_link
  ON ingredients (system_ingredient_id) WHERE system_ingredient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingredients_forecast
  ON ingredients (price_forecast_direction) WHERE price_forecast_direction IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_best_value
  ON openclaw.store_products (product_id) WHERE is_best_value = true;

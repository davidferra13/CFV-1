-- Pricing Regions: National Market Areas with Cost Indices
--
-- Every US ZIP maps to a pricing region (~400 metro/micro/rural areas).
-- Prices don't vary meaningfully within a metro; they vary between metros.
-- This table is the geographic backbone of national pricing.
--
-- Data sources:
--   - Census Bureau CBSA (Core-Based Statistical Areas) for metro definitions
--   - BLS Regional Price Parities for cost_index
--   - Census ZCTA-to-CBSA crosswalk for ZIP mapping

-- ======================================================================
-- 1. PRICING REGIONS TABLE
-- ======================================================================

CREATE TABLE IF NOT EXISTS openclaw.pricing_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                              -- "Boston-Cambridge-Newton, MA-NH"
  slug TEXT NOT NULL,                              -- "boston-cambridge-newton"
  cbsa_code TEXT,                                  -- Census CBSA code (e.g. "14460")
  state TEXT NOT NULL,                             -- primary state
  states TEXT[] DEFAULT '{}',                      -- all states in this region
  region_type TEXT NOT NULL DEFAULT 'metro',        -- metro, micro, rural
  cost_index NUMERIC(5,3) NOT NULL DEFAULT 1.000,  -- BLS RPP (national avg = 1.000)
  population INT,                                  -- for prioritization
  lat NUMERIC(10,7),                               -- centroid
  lng NUMERIC(10,7),                               -- centroid
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_regions_slug
  ON openclaw.pricing_regions(slug);
CREATE INDEX IF NOT EXISTS idx_pricing_regions_cbsa
  ON openclaw.pricing_regions(cbsa_code) WHERE cbsa_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_regions_state
  ON openclaw.pricing_regions(state);
CREATE INDEX IF NOT EXISTS idx_pricing_regions_type
  ON openclaw.pricing_regions(region_type);

COMMENT ON TABLE openclaw.pricing_regions IS
  'US market areas (~400) for national pricing. Each ZIP maps to exactly one region.';
COMMENT ON COLUMN openclaw.pricing_regions.cost_index IS
  'BLS Regional Price Parity. 1.000 = national average. 1.12 = 12% above average.';

-- ======================================================================
-- 2. LINK ZIP CENTROIDS TO PRICING REGIONS
-- ======================================================================

ALTER TABLE openclaw.zip_centroids
  ADD COLUMN IF NOT EXISTS pricing_region_id UUID REFERENCES openclaw.pricing_regions(id);

CREATE INDEX IF NOT EXISTS idx_zc_pricing_region_id
  ON openclaw.zip_centroids(pricing_region_id) WHERE pricing_region_id IS NOT NULL;

-- ======================================================================
-- 3. RESOLVED PRICES TABLE (pre-computed chef-facing prices)
-- ======================================================================
-- Materialized "what does ingredient X cost in region Y?"
-- Updated by background worker after each sync cycle.
-- Chef requests read from here first (fast, indexed, pre-validated).

CREATE TABLE IF NOT EXISTS openclaw.resolved_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id TEXT NOT NULL,
  pricing_region_id UUID NOT NULL REFERENCES openclaw.pricing_regions(id),

  -- The price ChefFlow shows
  price_cents INT NOT NULL,
  price_unit TEXT NOT NULL,                        -- "per_lb", "per_oz", "per_each"

  -- Price range
  price_low_cents INT,
  price_high_cents INT,
  price_median_cents INT,

  -- Confidence and freshness
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.000,
  observation_count INT NOT NULL DEFAULT 0,
  source_count INT NOT NULL DEFAULT 0,
  freshest_observation TIMESTAMPTZ,
  oldest_observation TIMESTAMPTZ,

  -- Classification
  price_type TEXT NOT NULL DEFAULT 'retail',        -- retail, wholesale, organic
  computation_method TEXT NOT NULL DEFAULT 'pending', -- median_multistore, single_source, usda_adjusted, cost_index_estimate, seasonal_adjusted

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT resolved_prices_unique
    UNIQUE(canonical_ingredient_id, pricing_region_id, price_type)
);

CREATE INDEX IF NOT EXISTS idx_rp_region
  ON openclaw.resolved_prices(pricing_region_id);
CREATE INDEX IF NOT EXISTS idx_rp_ingredient
  ON openclaw.resolved_prices(canonical_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_rp_confidence
  ON openclaw.resolved_prices(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_rp_freshness
  ON openclaw.resolved_prices(freshest_observation DESC);

COMMENT ON TABLE openclaw.resolved_prices IS
  'Pre-computed per-ingredient, per-region prices. The chef-facing pricing cache.';

-- ======================================================================
-- 4. SEASONAL FACTORS TABLE
-- ======================================================================
-- Monthly price multipliers per ingredient per region.
-- 1.000 = matches annual average. 1.30 = 30% above average (winter tomatoes).
-- Seeded from USDA terminal market historical data.

CREATE TABLE IF NOT EXISTS openclaw.seasonal_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id TEXT NOT NULL,
  pricing_region_id UUID REFERENCES openclaw.pricing_regions(id), -- NULL = national default
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  factor NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  source TEXT NOT NULL DEFAULT 'usda_historical',  -- usda_historical, computed, manual
  sample_years INT DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT seasonal_factors_unique
    UNIQUE(canonical_ingredient_id, pricing_region_id, month)
);

CREATE INDEX IF NOT EXISTS idx_sf_ingredient
  ON openclaw.seasonal_factors(canonical_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_sf_month
  ON openclaw.seasonal_factors(month);

COMMENT ON TABLE openclaw.seasonal_factors IS
  'Monthly price adjustment multipliers. Produce swings 40-200% seasonally.';

-- ======================================================================
-- 5. PRICE RESOLUTION AUDIT LOG
-- ======================================================================
-- Track resolved_prices refresh runs for monitoring.

CREATE TABLE IF NOT EXISTS openclaw.resolve_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',           -- running, completed, failed
  regions_processed INT DEFAULT 0,
  ingredients_processed INT DEFAULT 0,
  prices_upserted INT DEFAULT 0,
  prices_skipped INT DEFAULT 0,
  duration_ms INT,
  error TEXT,
  metadata JSONB DEFAULT '{}'
);

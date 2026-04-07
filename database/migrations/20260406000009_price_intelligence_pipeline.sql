-- Price Intelligence Pipeline
--
-- The structural layer that makes raw price observations usable.
-- Every price that enters the system passes through this pipeline:
--   Raw → Normalize → Map → Weight → Store → Track Over Time
--
-- This migration adds the missing pieces:
--   1. Ingredient hierarchy (parent/child tree)
--   2. Yield factors on system_ingredients
--   3. Promotion vs baseline separation
--   4. Price time-series in PostgreSQL (not just Pi SQLite)
--   5. Coverage gaps detection view
--   6. Geographic pricing regions

-- ══════════════════════════════════════════════════════════════════════
-- 1. INGREDIENT HIERARCHY (parent/child tree)
-- ══════════════════════════════════════════════════════════════════════
-- Ingredients are not flat. Tomato -> cherry/roma/heirloom.
-- Beef -> chuck/ribeye/trim. Prices roll up and down the tree.

ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES system_ingredients(id),
  ADD COLUMN IF NOT EXISTS hierarchy_depth int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_leaf boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN system_ingredients.parent_id IS
  'Parent ingredient for hierarchy. NULL = top-level. Enables roll-up/down pricing.';

CREATE INDEX IF NOT EXISTS idx_sys_ingredients_parent
  ON system_ingredients(parent_id) WHERE parent_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════
-- 2. YIELD FACTORS on system_ingredients
-- ══════════════════════════════════════════════════════════════════════
-- Raw price != usable price. Trim loss, peel loss, cook shrinkage.
-- yield_pct = what percentage of the raw product is usable.
-- e.g., whole chicken = 0.65 (35% bone/trim), onion = 0.90 (10% peel)

ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS yield_pct numeric(5,4) DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS trim_loss_pct numeric(5,4) DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS cook_shrinkage_pct numeric(5,4) DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS density_g_per_ml numeric(7,4);

COMMENT ON COLUMN system_ingredients.yield_pct IS
  'Usable percentage after trim/peel (0.0-1.0). 1.0 = no waste. 0.65 = 35% trim loss.';
COMMENT ON COLUMN system_ingredients.density_g_per_ml IS
  'Density for volume-to-weight conversion. NULL = use category default.';

-- ══════════════════════════════════════════════════════════════════════
-- 3. PROMOTION vs BASELINE SEPARATION
-- ══════════════════════════════════════════════════════════════════════
-- store_products already has sale_price_cents and sale_ends_at.
-- Add a flag to mark whether the current price_cents IS a sale price,
-- and a baseline_price_cents that represents the "normal" price.

ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS is_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS baseline_price_cents integer;

COMMENT ON COLUMN openclaw.store_products.is_sale IS
  'True if price_cents reflects a temporary promotion, not the regular price.';
COMMENT ON COLUMN openclaw.store_products.baseline_price_cents IS
  'Regular (non-sale) price. NULL = price_cents is already the baseline.';

-- ══════════════════════════════════════════════════════════════════════
-- 4. PRICE TIME-SERIES in PostgreSQL
-- ══════════════════════════════════════════════════════════════════════
-- The Pi has price_changes, price_trends, price_anomalies in SQLite.
-- Mirror the critical ones in PG for the ChefFlow app to query.

-- Price snapshots: daily observations per product per store
CREATE TABLE IF NOT EXISTS openclaw.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id uuid NOT NULL REFERENCES openclaw.store_products(id) ON DELETE CASCADE,
  price_cents integer NOT NULL,
  is_sale boolean NOT NULL DEFAULT false,
  observed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_product
  ON openclaw.price_snapshots(store_product_id, observed_at DESC);

COMMENT ON TABLE openclaw.price_snapshots IS
  'Daily price observations. Enables time-series analysis: volatility, seasonality, trend detection.';

-- Price trends: pre-computed aggregates per ingredient
CREATE TABLE IF NOT EXISTS openclaw.price_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid REFERENCES openclaw.chains(id),
  product_id uuid REFERENCES openclaw.products(id),
  state text,
  avg_7d_cents integer,
  avg_30d_cents integer,
  avg_90d_cents integer,
  min_90d_cents integer,
  max_90d_cents integer,
  volatility_pct numeric(5,2),
  trend_direction text CHECK (trend_direction IN ('rising', 'falling', 'stable', 'volatile')),
  cheapest_source text,
  most_expensive_source text,
  data_points integer NOT NULL DEFAULT 0,
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(chain_id, product_id, state)
);

CREATE INDEX IF NOT EXISTS idx_price_trends_product
  ON openclaw.price_trends(product_id);

COMMENT ON TABLE openclaw.price_trends IS
  'Pre-computed price trend aggregates. Updated by sync pipeline. Enables volatility analysis.';

-- Price anomalies: significant price changes
CREATE TABLE IF NOT EXISTS openclaw.price_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id uuid NOT NULL REFERENCES openclaw.store_products(id) ON DELETE CASCADE,
  old_price_cents integer NOT NULL,
  new_price_cents integer NOT NULL,
  change_pct numeric(7,2) NOT NULL,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  anomaly_type text NOT NULL DEFAULT 'spike'
    CHECK (anomaly_type IN ('spike', 'drop', 'new_product', 'price_return', 'out_of_stock'))
);

CREATE INDEX IF NOT EXISTS idx_price_anomalies_unacked
  ON openclaw.price_anomalies(acknowledged, detected_at DESC)
  WHERE acknowledged = false;

COMMENT ON TABLE openclaw.price_anomalies IS
  'Significant price changes (>25% delta). Enables alert system and sale detection.';

-- ══════════════════════════════════════════════════════════════════════
-- 5. COVERAGE GAPS DETECTION VIEW
-- ══════════════════════════════════════════════════════════════════════
-- Shows what we know and what we don't know.

CREATE OR REPLACE VIEW openclaw.coverage_gaps AS
WITH state_chains AS (
  SELECT DISTINCT s.state, c.id as chain_id, c.name as chain_name, c.source_type
  FROM openclaw.stores s
  JOIN openclaw.chains c ON c.id = s.chain_id
  WHERE s.is_active = true
),
state_products AS (
  SELECT s.state, count(DISTINCT sp.product_id) as product_count,
         count(DISTINCT sp.id) as price_count,
         max(sp.last_seen_at) as last_price_date,
         count(DISTINCT s.chain_id) as chains_with_data
  FROM openclaw.stores s
  JOIN openclaw.store_products sp ON sp.store_id = s.id
  WHERE s.is_active = true
  GROUP BY s.state
)
SELECT
  sc.state,
  count(DISTINCT sc.chain_id) as chains_present,
  COALESCE(sp.chains_with_data, 0) as chains_with_prices,
  COALESCE(sp.product_count, 0) as products_priced,
  COALESCE(sp.price_count, 0) as total_prices,
  sp.last_price_date,
  CASE
    WHEN sp.price_count IS NULL OR sp.price_count = 0 THEN 'no_data'
    WHEN sp.price_count < 100 THEN 'sparse'
    WHEN sp.price_count < 1000 THEN 'partial'
    WHEN sp.price_count < 5000 THEN 'moderate'
    ELSE 'good'
  END as coverage_level
FROM state_chains sc
LEFT JOIN state_products sp ON sp.state = sc.state
GROUP BY sc.state, sp.chains_with_data, sp.product_count, sp.price_count, sp.last_price_date
ORDER BY COALESCE(sp.price_count, 0) ASC;

-- ══════════════════════════════════════════════════════════════════════
-- 6. GEOGRAPHIC PRICING REGIONS
-- ══════════════════════════════════════════════════════════════════════
-- Group zips into pricing regions for sparse-data estimation.

ALTER TABLE openclaw.zip_centroids
  ADD COLUMN IF NOT EXISTS pricing_region text;

-- Set pricing regions based on census divisions (if table exists)
-- These will be populated by the sync pipeline based on state groupings.
-- Northeast, Southeast, Midwest, Southwest, West, Pacific, Mountain, Plains

-- ══════════════════════════════════════════════════════════════════════
-- 7. SEED COMMON YIELD FACTORS
-- ══════════════════════════════════════════════════════════════════════
-- Real chef math. Raw price / yield_pct = true usable cost.

UPDATE system_ingredients SET yield_pct = 0.65 WHERE name ILIKE '%whole chicken%';
UPDATE system_ingredients SET yield_pct = 0.75 WHERE name ILIKE '%chicken breast%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.80 WHERE name ILIKE '%chicken thigh%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.85 WHERE name ILIKE '%beef tenderloin%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.80 WHERE name ILIKE '%beef chuck%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.50 WHERE name ILIKE '%beef ribs%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.75 WHERE name ILIKE '%pork loin%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.45 WHERE name ILIKE '%whole fish%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.90 WHERE name ILIKE '%salmon fillet%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.85 WHERE name ILIKE '%shrimp%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.90 WHERE name ILIKE '%onion%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.80 WHERE name ILIKE '%garlic%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.78 WHERE name ILIKE '%potato%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.75 WHERE name ILIKE '%carrot%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.50 WHERE name ILIKE '%artichoke%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.65 WHERE name ILIKE '%pineapple%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.65 WHERE name ILIKE '%watermelon%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.90 WHERE name ILIKE '%bell pepper%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.75 WHERE name ILIKE '%broccoli%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.60 WHERE name ILIKE '%cauliflower%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.85 WHERE name ILIKE '%celery%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.70 WHERE name ILIKE '%asparagus%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.95 WHERE name ILIKE '%mushroom%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.55 WHERE name ILIKE '%corn on the cob%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.75 WHERE name ILIKE '%leek%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.95 WHERE name ILIKE '%tomato%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.65 WHERE name ILIKE '%mango%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.70 WHERE name ILIKE '%avocado%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.60 WHERE name ILIKE '%pomegranate%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.50 WHERE name ILIKE '%coconut%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.85 WHERE name ILIKE '%lamb rack%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.75 WHERE name ILIKE '%lamb leg%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.55 WHERE name ILIKE '%lobster%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.40 WHERE name ILIKE '%crab%' AND yield_pct = 1.0;
UPDATE system_ingredients SET yield_pct = 0.80 WHERE name ILIKE '%scallop%' AND yield_pct = 1.0;

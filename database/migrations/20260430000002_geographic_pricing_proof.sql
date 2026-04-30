-- Geographic Pricing Proof Harness
--
-- Additive only. Do not apply without a fresh database backup.
-- Creates the proof-run tables that distinguish local observed prices from
-- regional, national, public baseline, category baseline, modeled fallback,
-- and unresolved pricing evidence.

CREATE TABLE IF NOT EXISTS openclaw.geographic_pricing_proof_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  requested_by TEXT,
  total_geographies INTEGER NOT NULL DEFAULT 56,
  total_basket_items INTEGER NOT NULL DEFAULT 16,
  expected_result_rows INTEGER NOT NULL DEFAULT 896,
  actual_result_rows INTEGER NOT NULL DEFAULT 0,
  safe_to_quote_count INTEGER NOT NULL DEFAULT 0,
  verify_first_count INTEGER NOT NULL DEFAULT 0,
  planning_only_count INTEGER NOT NULL DEFAULT 0,
  not_usable_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.geographic_pricing_basket_items (
  ingredient_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  preferred_system_ingredient_id UUID REFERENCES system_ingredients(id),
  category TEXT NOT NULL,
  target_unit TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  seasonal_month INTEGER,
  aliases TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.geographic_pricing_proof_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES openclaw.geographic_pricing_proof_runs(id),
  geography_code TEXT NOT NULL,
  geography_name TEXT NOT NULL,
  ingredient_key TEXT NOT NULL REFERENCES openclaw.geographic_pricing_basket_items(ingredient_key),
  system_ingredient_id UUID REFERENCES system_ingredients(id),
  canonical_ingredient_id TEXT,
  source_class TEXT NOT NULL
    CHECK (source_class IN (
      'local_observed',
      'regional_observed',
      'national_observed',
      'chef_owned',
      'USDA_or_public_baseline',
      'category_baseline',
      'modeled_fallback',
      'unresolved'
    )),
  quote_safety TEXT NOT NULL
    CHECK (quote_safety IN ('safe_to_quote', 'verify_first', 'planning_only', 'not_usable')),
  failure_reason TEXT,
  price_cents INTEGER,
  normalized_price_cents INTEGER,
  normalized_unit TEXT,
  low_cents INTEGER,
  high_cents INTEGER,
  store_id UUID,
  store_name TEXT,
  store_city TEXT,
  store_state TEXT,
  store_zip TEXT,
  product_id UUID,
  product_name TEXT,
  product_brand TEXT,
  product_size TEXT,
  source_name TEXT,
  source_type TEXT,
  observed_at TIMESTAMPTZ,
  freshness_days INTEGER,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  match_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  unit_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  data_points INTEGER NOT NULL DEFAULT 0,
  missing_proof TEXT[] NOT NULL DEFAULT '{}'::text[],
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, geography_code, ingredient_key)
);

CREATE INDEX IF NOT EXISTS idx_gpp_results_geo
  ON openclaw.geographic_pricing_proof_results(run_id, geography_code);

CREATE INDEX IF NOT EXISTS idx_gpp_results_safety
  ON openclaw.geographic_pricing_proof_results(run_id, quote_safety);

CREATE INDEX IF NOT EXISTS idx_gpp_results_source_class
  ON openclaw.geographic_pricing_proof_results(run_id, source_class);

ALTER TABLE ingredient_price_history
  ADD COLUMN IF NOT EXISTS store_state TEXT,
  ADD COLUMN IF NOT EXISTS store_zip TEXT,
  ADD COLUMN IF NOT EXISTS openclaw_store_id UUID REFERENCES openclaw.stores(id),
  ADD COLUMN IF NOT EXISTS source_class TEXT,
  ADD COLUMN IF NOT EXISTS normalized_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS normalized_unit TEXT;

CREATE INDEX IF NOT EXISTS idx_iph_geographic_lookup
  ON ingredient_price_history (store_state, ingredient_id, purchase_date DESC)
  WHERE store_state IS NOT NULL
    AND price_per_unit_cents IS NOT NULL
    AND price_per_unit_cents > 0;

ALTER TABLE openclaw.stores
  ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geography_scope TEXT NOT NULL DEFAULT 'local'
    CHECK (geography_scope IN ('local', 'regional', 'national', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_openclaw_stores_scope_state
  ON openclaw.stores (geography_scope, state);

UPDATE openclaw.stores
SET is_virtual = true,
    geography_scope = 'regional'
WHERE zip = '00000'
  OR lower(city) = 'regional';

INSERT INTO openclaw.geographic_pricing_basket_items
  (ingredient_key, display_name, category, target_unit, seasonal_month, aliases)
VALUES
  ('chicken_breast', 'Chicken Breast (Boneless, Skinless)', 'protein', 'lb', NULL, ARRAY['chicken breast', 'boneless skinless chicken breast']),
  ('salmon', 'Salmon Fillet', 'protein', 'lb', NULL, ARRAY['salmon', 'salmon fillet']),
  ('rice', 'Long Grain White Rice', 'pantry', 'lb', NULL, ARRAY['rice', 'white rice', 'long grain rice']),
  ('potatoes', 'Potatoes', 'produce', 'lb', NULL, ARRAY['potatoes', 'potato']),
  ('butter', 'Butter (Dairy)', 'dairy', 'lb', NULL, ARRAY['butter', 'unsalted butter', 'salted butter']),
  ('olive_oil', 'Extra Virgin Olive Oil', 'oil', 'fl oz', NULL, ARRAY['olive oil', 'extra virgin olive oil']),
  ('garlic', 'Garlic', 'produce', 'lb', NULL, ARRAY['garlic', 'fresh garlic']),
  ('onion', 'Onions', 'produce', 'lb', NULL, ARRAY['onion', 'onions']),
  ('lemon', 'lemons', 'produce', 'lb', NULL, ARRAY['lemon', 'lemons']),
  ('parsley', 'Parsley', 'produce', 'lb', NULL, ARRAY['parsley', 'fresh parsley']),
  ('heavy_cream', 'Heavy Cream', 'dairy', 'fl oz', NULL, ARRAY['heavy cream', 'whipping cream']),
  ('flour', 'Flour (Pantry)', 'pantry', 'lb', NULL, ARRAY['flour', 'all purpose flour']),
  ('eggs', 'Eggs', 'dairy', 'each', NULL, ARRAY['eggs', 'large eggs']),
  ('seasonal_vegetable', 'Asparagus', 'produce', 'lb', 4, ARRAY['asparagus', 'seasonal vegetable']),
  ('chocolate', 'Chocolate (Baking)', 'baking', 'lb', NULL, ARRAY['chocolate', 'baking chocolate']),
  ('berries', 'Blueberries', 'produce', 'lb', NULL, ARRAY['berries', 'blueberries'])
ON CONFLICT (ingredient_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  target_unit = EXCLUDED.target_unit,
  seasonal_month = EXCLUDED.seasonal_month,
  aliases = EXCLUDED.aliases,
  updated_at = now();

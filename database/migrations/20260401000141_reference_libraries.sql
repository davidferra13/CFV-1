-- 20260401000141_reference_libraries.sql
-- Four reference library tables for OpenCLAW intelligence:
-- shelf life, seasonality, waste factors, store accuracy scoring.
-- All additive: 4 new tables, 0 altered, 0 drops.

-- Library 1: Shelf Life Database (USDA FoodKeeper)
CREATE TABLE IF NOT EXISTS ingredient_shelf_life (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  category text,
  pantry_days_min integer,
  pantry_days_max integer,
  fridge_days_min integer,
  fridge_days_max integer,
  freezer_days_min integer,
  freezer_days_max integer,
  storage_tips text,
  after_opening_days integer,
  source text DEFAULT 'usda_foodkeeper',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_shelf_life_name ON ingredient_shelf_life USING gin (to_tsvector('english', ingredient_name));
CREATE INDEX IF NOT EXISTS idx_shelf_life_category ON ingredient_shelf_life (category);

-- Library 2: Seasonal Availability Calendar
CREATE TABLE IF NOT EXISTS ingredient_seasonality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  region text DEFAULT 'northeast',
  peak_months integer[] NOT NULL,
  available_months integer[] NOT NULL,
  price_low_months integer[],
  price_high_months integer[],
  is_year_round boolean DEFAULT false,
  notes text,
  source text DEFAULT 'computed',
  confidence numeric(3,2),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id, region)
);

CREATE INDEX IF NOT EXISTS idx_seasonality_ingredient ON ingredient_seasonality (system_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_seasonality_peak ON ingredient_seasonality USING gin (peak_months);
CREATE INDEX IF NOT EXISTS idx_seasonality_region ON ingredient_seasonality (region);

-- Library 3: Waste Factor Database (USDA Yields)
CREATE TABLE IF NOT EXISTS ingredient_waste_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  as_purchased_to_edible_pct numeric(5,2) NOT NULL,
  waste_type text,
  prep_method text,
  cooked_yield_pct numeric(5,2),
  notes text,
  source text DEFAULT 'usda_yields',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id, prep_method)
);

CREATE INDEX IF NOT EXISTS idx_waste_factors_ingredient ON ingredient_waste_factors (system_ingredient_id);

-- Library 4: Store Accuracy Scoring
CREATE TABLE IF NOT EXISTS store_accuracy_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  chain_slug text,
  region text,
  accuracy_pct numeric(5,2),
  avg_deviation_pct numeric(5,2),
  comparison_count integer DEFAULT 0,
  last_compared_at timestamptz,
  trend text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (store_name, region)
);

CREATE INDEX IF NOT EXISTS idx_store_accuracy_chain ON store_accuracy_scores (chain_slug);
CREATE INDEX IF NOT EXISTS idx_store_accuracy_region ON store_accuracy_scores (region);

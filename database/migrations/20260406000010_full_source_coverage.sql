-- Full Source Coverage: every category in the US food pricing network.
--
-- Category 1: Grocery chains (~200) - DONE (212 in chains table)
-- Category 2: Independent grocery stores (~25K) - estimation model
-- Category 3: Convenience stores (~100K) - add verified chains
-- Category 4: Warehouse clubs (~1.5K) - DONE (Costco, BJ's, Sam's)
-- Category 5: Dollar stores (~38K) - DONE (in chains table)
-- Category 6: Ethnic/specialty (~15K) - PARTIALLY DONE
-- Category 7: Farmers markets (~8.5K) - new table
-- Category 8: Distributors (~2K) - DONE (in chains table)
-- Category 9: Online/delivery - Instacart IS our scraping layer

-- ══════════════════════════════════════════════════════════════════════
-- 1. CONVENIENCE STORES (verified on Instacart: sheetz, caseys)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO openclaw.chains (slug, name, scraper_type, source_type, reliability_weight, is_active) VALUES
  ('sheetz',        'Sheetz',               'instacart', 'convenience', 0.60, true),
  ('caseys',        'Casey''s General Store','instacart', 'convenience', 0.60, true),
  ('wawa',          'Wawa',                 'manual',    'convenience', 0.60, true),
  ('quiktrip',      'QuikTrip',             'manual',    'convenience', 0.60, true),
  ('racetrac',      'RaceTrac',             'manual',    'convenience', 0.60, true),
  ('kwik_trip',     'Kwik Trip',            'manual',    'convenience', 0.60, true),
  ('buc_ees',       'Buc-ee''s',            'manual',    'convenience', 0.60, true),
  ('royal_farms',   'Royal Farms',          'manual',    'convenience', 0.60, true),
  ('7_eleven',      '7-Eleven',             'manual',    'convenience', 0.55, true),
  ('circle_k',      'Circle K',             'manual',    'convenience', 0.55, true),
  ('speedway',      'Speedway',             'manual',    'convenience', 0.55, true),
  ('cumberland_farms','Cumberland Farms',   'manual',    'convenience', 0.60, true)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- 2. FARMERS MARKETS table
-- ══════════════════════════════════════════════════════════════════════
-- ~8,500 markets in the US. Seasonal, but highest "true cost" signal.
-- USDA publishes a directory. We store locations + seasonal availability.

CREATE TABLE IF NOT EXISTS openclaw.farmers_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text NOT NULL,
  state text NOT NULL,
  zip text,
  lat numeric(10,7),
  lng numeric(10,7),
  website text,
  schedule text,  -- e.g., "Saturdays 8am-1pm, May-October"
  season_start int,  -- month number (1-12), NULL if year-round
  season_end int,
  products_available text[], -- e.g., {'produce','meat','dairy','baked goods','honey'}
  usda_id text UNIQUE,  -- USDA directory ID for dedup
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farmers_markets_geo
  ON openclaw.farmers_markets(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_farmers_markets_state
  ON openclaw.farmers_markets(state);
CREATE INDEX IF NOT EXISTS idx_farmers_markets_season
  ON openclaw.farmers_markets(season_start, season_end);

COMMENT ON TABLE openclaw.farmers_markets IS
  'USDA Farmers Market Directory. ~8,500 markets. Seasonal produce pricing signal.';

-- ══════════════════════════════════════════════════════════════════════
-- 3. INDEPENDENT STORE PRICE ESTIMATION MODEL
-- ══════════════════════════════════════════════════════════════════════
-- Independents buy from wholesalers (Sysco, US Foods, etc).
-- We can estimate their retail prices as: wholesale_baseline * markup_factor.
-- The markup factor varies by store type and region.

CREATE TABLE IF NOT EXISTS openclaw.price_estimation_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL UNIQUE,
  description text,
  -- What type of store this model applies to
  store_type text NOT NULL,  -- independent, convenience, farm, etc.
  -- Regional adjustments
  region text,  -- NULL = national default
  -- Markup model
  base_markup_pct numeric(5,2) NOT NULL,  -- e.g., 35.00 = 35% markup over wholesale
  category_adjustments jsonb,  -- e.g., {"produce": 1.50, "meat": 1.20, "dairy": 1.10}
  -- Confidence
  confidence numeric(3,2) NOT NULL DEFAULT 0.50,
  -- Active flag
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed estimation models
INSERT INTO openclaw.price_estimation_models (model_name, description, store_type, region, base_markup_pct, category_adjustments, confidence) VALUES
  ('independent_national',
   'National average: independent grocery store markup over wholesale baseline',
   'independent', NULL, 35.00,
   '{"produce": 1.50, "meat": 1.25, "dairy": 1.10, "bakery": 1.40, "seafood": 1.35, "pantry": 1.20}',
   0.55),
  ('independent_urban',
   'Urban independent markup (higher rent = higher prices)',
   'independent', 'urban', 42.00,
   '{"produce": 1.60, "meat": 1.30, "dairy": 1.15, "bakery": 1.50, "seafood": 1.40, "pantry": 1.25}',
   0.50),
  ('independent_rural',
   'Rural independent markup (lower rent, less competition)',
   'independent', 'rural', 30.00,
   '{"produce": 1.40, "meat": 1.20, "dairy": 1.10, "bakery": 1.35, "seafood": 1.30, "pantry": 1.15}',
   0.50),
  ('convenience_national',
   'Convenience store markup over retail chain baseline',
   'convenience', NULL, 25.00,
   '{"produce": 1.80, "meat": 1.50, "dairy": 1.30, "beverages": 1.20, "snacks": 1.15}',
   0.45),
  ('farm_direct',
   'Farmers market pricing vs retail (often lower for produce, higher for specialty)',
   'farm', NULL, -10.00,
   '{"produce": 0.85, "meat": 1.20, "dairy": 1.10, "honey": 1.50, "baked_goods": 1.30}',
   0.60)
ON CONFLICT (model_name) DO NOTHING;

COMMENT ON TABLE openclaw.price_estimation_models IS
  'Pricing estimation models for store types without direct scrape data. Used to generate synthetic prices from wholesale baselines or chain averages.';

-- ══════════════════════════════════════════════════════════════════════
-- 4. ESTIMATED PRICES VIEW
-- ══════════════════════════════════════════════════════════════════════
-- For any ingredient + location + store type, estimate a price
-- using the closest available real data + the estimation model.

CREATE OR REPLACE VIEW openclaw.estimated_prices AS
SELECT
  ub.item_name,
  ub.price_cents AS baseline_cents,
  ub.unit,
  ub.region,
  ub.category,
  pem.store_type,
  pem.model_name,
  pem.base_markup_pct,
  ROUND(ub.price_cents * (1 + pem.base_markup_pct / 100)) AS estimated_retail_cents,
  -- Category-specific adjustment (if available)
  ROUND(ub.price_cents * COALESCE(
    (pem.category_adjustments->ub.category)::numeric,
    (1 + pem.base_markup_pct / 100)
  )) AS category_adjusted_cents,
  pem.confidence,
  'estimated' AS price_type,
  ub.observation_date
FROM openclaw.usda_price_baselines ub
CROSS JOIN openclaw.price_estimation_models pem
WHERE pem.is_active = true
  AND ub.region = 'us_average';

COMMENT ON VIEW openclaw.estimated_prices IS
  'Synthetic prices for store types without direct data. Combines USDA baselines with markup models. Used as fallback when no scraped prices exist for a store type + ingredient.';

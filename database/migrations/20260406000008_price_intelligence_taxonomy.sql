-- Price Intelligence Taxonomy
--
-- Chains are Layer 1. This migration adds the full 3-layer structure:
--   Layer 1: Retail (visible prices) - chains, independents, convenience, dollar, specialty
--   Layer 2: Supply (true cost) - distributors, farms, wholesale markets
--   Layer 3: Aggregation (normalized reality) - Instacart, scraped platforms, OpenClaw normalization
--
-- Every price observation is tagged by source_type so the system can:
--   1. Normalize per ingredient across source types
--   2. Weight by reliability + volume
--   3. Store all raw observations without losing provenance

-- ══════════════════════════════════════════════════════════════════════
-- 1. Add source_type to chains (what KIND of source is this chain?)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE openclaw.chains
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'chain';

COMMENT ON COLUMN openclaw.chains.source_type IS
  'Price intelligence source category: chain, independent, distributor, farm, convenience, specialty, dollar, club, online';

-- ══════════════════════════════════════════════════════════════════════
-- 2. Expand store_type enum to cover the full taxonomy
-- ══════════════════════════════════════════════════════════════════════

-- Drop and recreate the constraint with all needed types
ALTER TABLE openclaw.stores DROP CONSTRAINT IF EXISTS stores_store_type_check;
ALTER TABLE openclaw.stores ADD CONSTRAINT stores_store_type_check
  CHECK (store_type = ANY (ARRAY[
    'retail',        -- standard grocery chain store
    'wholesale',     -- wholesale distributor (Sysco, US Foods)
    'club',          -- warehouse club (Costco, BJ's, Sam's)
    'online',        -- online-only (Amazon Fresh, Instacart)
    'farm',          -- farm stand, farmers market vendor
    'distributor',   -- food distributor/broadliner
    'convenience',   -- convenience store (7-Eleven, Circle K)
    'specialty',     -- ethnic/specialty market
    'independent',   -- non-chain independent grocery
    'dollar'         -- dollar/discount store
  ]));

-- ══════════════════════════════════════════════════════════════════════
-- 3. Expand price_type enum on store_products
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE openclaw.store_products DROP CONSTRAINT IF EXISTS store_products_price_type_check;
ALTER TABLE openclaw.store_products ADD CONSTRAINT store_products_price_type_check
  CHECK (price_type = ANY (ARRAY[
    'retail',        -- consumer retail price
    'wholesale',     -- wholesale/distributor price
    'commodity',     -- commodity index / BLS / USDA baseline
    'farm_direct',   -- direct from farm/producer
    'club',          -- warehouse club price (bulk)
    'convenience',   -- convenience store markup
    'estimated'      -- estimated/interpolated (no direct observation)
  ]));

-- ══════════════════════════════════════════════════════════════════════
-- 4. Add reliability_weight to chains
--    Higher = more reliable price signal. Used in weighted normalization.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE openclaw.chains
  ADD COLUMN IF NOT EXISTS reliability_weight numeric(3,2) NOT NULL DEFAULT 1.00;

COMMENT ON COLUMN openclaw.chains.reliability_weight IS
  'Price reliability weight (0.00-1.00). Higher = more trusted signal. '
  'Chains: 0.90, Wholesale: 0.95, Farm: 0.85, Convenience: 0.60, Dollar: 0.50, Independent: 0.70';

-- ══════════════════════════════════════════════════════════════════════
-- 5. Set source_type and reliability_weight for existing chains
-- ══════════════════════════════════════════════════════════════════════

-- Wholesale / Distributors
UPDATE openclaw.chains SET source_type = 'distributor', reliability_weight = 0.95
WHERE slug IN ('us_foods', 'chefstore', 'sysco', 'gfs', 'jetro', 'chefs_warehouse', 'performance_food');

-- Warehouse clubs
UPDATE openclaw.chains SET source_type = 'club', reliability_weight = 0.90
WHERE slug IN ('costco', 'bjs', 'sams_club');

-- Dollar / discount
UPDATE openclaw.chains SET source_type = 'dollar', reliability_weight = 0.50
WHERE slug IN ('dollar_general', 'dollar_tree', 'family_dollar', 'five_below', 'ocean_state',
               'sharp_shopper', 'ollies', 'save_a_lot');

-- Convenience
UPDATE openclaw.chains SET source_type = 'convenience', reliability_weight = 0.60
WHERE slug IN ('seven_eleven', 'cvs', 'walgreens');

-- Specialty / Ethnic
UPDATE openclaw.chains SET source_type = 'specialty', reliability_weight = 0.80
WHERE slug IN ('hmart', '99_ranch', 'mitsuwa', 'uwajimaya', 'lotte_plaza', 'patel_brothers',
               'super_g_mart', 'el_super', 'cardenas', 'vallarta', 'northgate', 'sedanos',
               'la_michoacana', 'ranch_market', 'el_rancho', 'fiesta_mart', 'compare_foods',
               'bravo', 'presidente', 'la_bodega', 'el_ahorro', 'market_168',
               'great_wall', 'good_fortune', 'hana_world', 'kam_man', 'apna_bazaar',
               'intl_fresh', 'super_king', 'jons', 'super_a_foods');

-- Premium / specialty retail (high accuracy, niche)
UPDATE openclaw.chains SET source_type = 'specialty', reliability_weight = 0.85
WHERE slug IN ('whole_foods', 'erewhon', 'gelsons', 'bristol_farms', 'balducci',
               'dorothy_lane', 'jungle_jims', 'stew_leonards', 'uncle_giuseppes',
               'deciccos', 'eataly', 'central_market', 'mom_organic',
               'earth_fare', 'the_fresh_market', 'fresh_market', 'natural_grocers',
               'sprouts', 'fresh_thyme', 'lazy_acres', 'nugget_markets',
               'new_seasons', 'pcc', 'metropolitan_market', 'lunds_byerlys',
               'kowalskis', 'kings_food');

-- Standard chains (the bulk) - already defaulted to 'chain' / 1.00
-- Set explicit weight
UPDATE openclaw.chains SET source_type = 'chain', reliability_weight = 0.90
WHERE source_type = 'chain' AND reliability_weight = 1.00;

-- Restaurant Depot is wholesale but accessible to chefs
UPDATE openclaw.chains SET source_type = 'wholesale', reliability_weight = 0.93
WHERE slug = 'restaurant_depot';

-- ══════════════════════════════════════════════════════════════════════
-- 6. Add source_observation_type to store_products
--    Tracks HOW the price was obtained (scrape, receipt, manual, estimate)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS observation_method text NOT NULL DEFAULT 'scrape';

COMMENT ON COLUMN openclaw.store_products.observation_method IS
  'How this price was obtained: scrape (automated), receipt (uploaded receipt), manual (hand-entered), estimate (interpolated), api (official API), commodity (USDA/BLS)';

-- ══════════════════════════════════════════════════════════════════════
-- 7. Price confidence view
--    Weighted price per ingredient considering source reliability
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW openclaw.weighted_ingredient_prices AS
SELECT
  prod.id AS product_id,
  prod.name AS product_name,
  sp.price_cents,
  sp.price_per_standard_unit_cents,
  sp.price_type,
  sp.observation_method,
  s.store_type,
  s.state,
  s.zip,
  c.slug AS chain_slug,
  c.name AS chain_name,
  c.source_type,
  c.reliability_weight,
  ROUND(sp.price_cents * c.reliability_weight) AS weighted_price_cents,
  ROUND(COALESCE(sp.price_per_standard_unit_cents, sp.price_cents) * c.reliability_weight) AS weighted_unit_price_cents,
  sp.last_seen_at,
  CASE
    WHEN sp.last_seen_at > now() - interval '7 days' THEN 1.0
    WHEN sp.last_seen_at > now() - interval '30 days' THEN 0.8
    WHEN sp.last_seen_at > now() - interval '90 days' THEN 0.5
    ELSE 0.2
  END AS freshness_factor
FROM openclaw.store_products sp
JOIN openclaw.stores s ON s.id = sp.store_id
JOIN openclaw.chains c ON c.id = s.chain_id
JOIN openclaw.products prod ON prod.id = sp.product_id
WHERE sp.price_cents > 0;

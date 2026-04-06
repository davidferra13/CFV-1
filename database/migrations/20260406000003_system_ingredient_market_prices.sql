-- System Ingredient Market Prices
-- Aggregated price data per system_ingredient from OpenClaw product matching.
-- This is the bridge between OpenClaw's 9.8M store_product prices and ChefFlow's
-- 5,435 canonical system_ingredients. Updated periodically by the sync pipeline.
--
-- When a chef normalizes their ingredient to a system_ingredient (via ingredient_aliases),
-- they automatically gain access to market pricing through this table.

CREATE TABLE IF NOT EXISTS openclaw.system_ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id UUID NOT NULL REFERENCES system_ingredients(id) ON DELETE CASCADE,

  -- Aggregated price data
  avg_price_cents INT NOT NULL,
  min_price_cents INT NOT NULL,
  max_price_cents INT NOT NULL,
  median_price_cents INT,
  price_unit TEXT NOT NULL DEFAULT 'each',

  -- Coverage metadata
  store_count INT NOT NULL DEFAULT 0,
  product_count INT NOT NULL DEFAULT 0,
  state_count INT NOT NULL DEFAULT 0,
  states TEXT[],                           -- e.g. {'MA','NH','ME'}

  -- Freshness
  newest_price_at TIMESTAMPTZ,
  oldest_price_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Confidence (0.0 to 1.0, based on store count + freshness + price spread)
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0.5,

  UNIQUE (system_ingredient_id)
);

CREATE INDEX idx_sip_system_ingredient ON openclaw.system_ingredient_prices(system_ingredient_id);
CREATE INDEX idx_sip_confidence ON openclaw.system_ingredient_prices(confidence DESC);

COMMENT ON TABLE openclaw.system_ingredient_prices IS
  'Aggregated market prices per system_ingredient, bridging OpenClaw product data to ChefFlow normalization layer.';

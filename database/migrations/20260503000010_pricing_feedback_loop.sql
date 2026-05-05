-- Pricing Intelligence Engine: Feedback Loop Tables
--
-- Closes the feedback loop: chefs can confirm, dispute, and override prices.
-- Chef overrides become Tier 0 in the resolution chain (above receipts).
-- Feedback signals improve confidence scoring for all chefs in the region.

-- ======================================================================
-- 1. CHEF INGREDIENT PRICES (standing overrides, Tier 0)
-- ======================================================================
-- When a chef says "I always pay $X for this ingredient," it lives here.
-- Resolution chain checks this FIRST, before the 10-tier waterfall.
-- Also feeds back into ingredient_price_history as a confirmed observation.

CREATE TABLE IF NOT EXISTS chef_ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_cents INT NOT NULL CHECK (price_cents > 0),
  price_unit TEXT NOT NULL DEFAULT 'lb',
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'receipt', 'invoice', 'shopping_list')),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  market_price_at_confirm INT,          -- what engine showed when chef overrode
  market_confidence_at_confirm NUMERIC(4,3), -- engine confidence at override time
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, ingredient_id)
);

ALTER TABLE chef_ingredient_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_ingredient_prices_tenant ON chef_ingredient_prices
  USING (chef_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_cip_chef ON chef_ingredient_prices(chef_id);
CREATE INDEX idx_cip_ingredient ON chef_ingredient_prices(ingredient_id);
CREATE INDEX idx_cip_confirmed ON chef_ingredient_prices(confirmed_at DESC);

COMMENT ON TABLE chef_ingredient_prices IS
  'Standing chef price overrides. Tier 0 in the resolution chain, above all market data.';

-- ======================================================================
-- 2. PRICE FEEDBACK (lightweight confirm/dispute signals)
-- ======================================================================
-- Quick "thumbs up/down" on any price the engine shows.
-- Aggregated to calibrate regional confidence over time.

CREATE TABLE IF NOT EXISTS price_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  pricing_region_id UUID REFERENCES openclaw.pricing_regions(id),
  shown_price_cents INT NOT NULL,
  shown_confidence NUMERIC(4,3),
  shown_source TEXT,                     -- what resolution tier produced this price
  feedback TEXT NOT NULL
    CHECK (feedback IN ('confirmed', 'too_high', 'too_low', 'wrong_item')),
  actual_price_cents INT,               -- if they provide a correction
  store_name TEXT,                       -- where they actually saw this price
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE price_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_feedback_tenant ON price_feedback
  USING (chef_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_pf_chef ON price_feedback(chef_id);
CREATE INDEX idx_pf_ingredient ON price_feedback(ingredient_id);
CREATE INDEX idx_pf_region ON price_feedback(pricing_region_id) WHERE pricing_region_id IS NOT NULL;
CREATE INDEX idx_pf_feedback ON price_feedback(feedback);
CREATE INDEX idx_pf_created ON price_feedback(created_at DESC);

COMMENT ON TABLE price_feedback IS
  'Chef feedback on shown prices. Aggregated to calibrate regional confidence.';

-- ======================================================================
-- 3. ADD price_context TO resolved_prices
-- ======================================================================
-- Differentiates retail shelf vs wholesale vs delivery pricing.
-- Default 'retail_shelf' for all existing rows.

ALTER TABLE openclaw.resolved_prices
  ADD COLUMN IF NOT EXISTS price_context TEXT NOT NULL DEFAULT 'retail_shelf'
    CHECK (price_context IN (
      'retail_shelf', 'retail_sale', 'wholesale_case', 'wholesale_each',
      'delivery_marked_up', 'government_average', 'estimated'
    ));

CREATE INDEX IF NOT EXISTS idx_rp_context
  ON openclaw.resolved_prices(price_context);

COMMENT ON COLUMN openclaw.resolved_prices.price_context IS
  'Price channel: retail_shelf, wholesale_case, delivery_marked_up, etc. Chefs see context-appropriate prices based on archetype.';

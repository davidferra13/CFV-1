-- PIE Reliability Suite: anonymous price contributions + grocery spend tier
-- Additive only. No destructive changes.

-- 1. Anonymous price contributions (Feature 3: crowd-sourced pricing)
-- Chef overrides/confirmations are anonymized and aggregated into regional pools.
-- No tenant_id stored; contributions are fully anonymous.
CREATE TABLE IF NOT EXISTS anonymous_price_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  unit TEXT NOT NULL DEFAULT 'lb',
  feedback_type TEXT NOT NULL DEFAULT 'confirmed' CHECK (feedback_type IN ('confirmed', 'override')),
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_price_contrib_ingredient
  ON anonymous_price_contributions(ingredient_id, state);

CREATE INDEX IF NOT EXISTS idx_anon_price_contrib_state
  ON anonymous_price_contributions(state, contributed_at);

-- 2. Grocery spend tier on chef_pricing_config (Feature 5: onboarding calibration)
-- Adjusts synthetic price estimates based on chef's market positioning.
-- Values: 'budget' (0.8x), 'mid' (1.0x), 'premium' (1.3x), 'luxury' (1.6x)
ALTER TABLE chef_pricing_config
  ADD COLUMN IF NOT EXISTS grocery_spend_tier TEXT DEFAULT 'mid'
  CHECK (grocery_spend_tier IN ('budget', 'mid', 'premium', 'luxury'));

COMMENT ON TABLE anonymous_price_contributions IS 'Anonymized chef price confirmations/overrides for regional aggregation. No tenant_id.';
COMMENT ON COLUMN chef_pricing_config.grocery_spend_tier IS 'Chef market positioning tier. Adjusts synthetic price estimates.';

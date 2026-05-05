-- PIE Law 7: Compound Learning
--
-- Tracks synthetic/estimated price predictions alongside the actual prices
-- that arrive later. Enables month-over-month accuracy measurement so PIE
-- gets smarter over time.

-- ======================================================================
-- 1. PRICE PREDICTIONS (snapshot of what PIE estimated)
-- ======================================================================
-- Every time the synthetic engine or freshness enforcer produces an estimate,
-- record what was predicted. When a real observation later arrives for the
-- same ingredient+region, we can measure accuracy.

CREATE TABLE IF NOT EXISTS openclaw.price_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id TEXT NOT NULL,
  pricing_region_id UUID REFERENCES openclaw.pricing_regions(id),
  predicted_cents INT NOT NULL CHECK (predicted_cents > 0),
  predicted_unit TEXT NOT NULL DEFAULT 'lb',
  derivation_method TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Filled in later when a real observation arrives
  actual_cents INT,
  actual_source TEXT,
  actual_observed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  -- Accuracy metrics (computed on resolution)
  error_pct NUMERIC(6,3),  -- (predicted - actual) / actual * 100
  abs_error_pct NUMERIC(6,3),
  CONSTRAINT valid_error CHECK (
    (actual_cents IS NULL AND error_pct IS NULL)
    OR (actual_cents IS NOT NULL AND error_pct IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pp_ingredient
  ON openclaw.price_predictions(canonical_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pp_region
  ON openclaw.price_predictions(pricing_region_id);
CREATE INDEX IF NOT EXISTS idx_pp_predicted_at
  ON openclaw.price_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pp_unresolved
  ON openclaw.price_predictions(canonical_ingredient_id, pricing_region_id)
  WHERE actual_cents IS NULL;
CREATE INDEX IF NOT EXISTS idx_pp_resolved
  ON openclaw.price_predictions(resolved_at DESC)
  WHERE resolved_at IS NOT NULL;

COMMENT ON TABLE openclaw.price_predictions IS
  'PIE Law 7: tracks synthetic price estimates so accuracy can be measured when real prices arrive.';

-- ======================================================================
-- 2. LEARNING ACCURACY (monthly rollups)
-- ======================================================================
-- Aggregated accuracy metrics per month, per derivation method.
-- This is what the compliance dashboard reads.

CREATE TABLE IF NOT EXISTS openclaw.learning_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,  -- first of month
  derivation_method TEXT NOT NULL,
  total_predictions INT NOT NULL DEFAULT 0,
  resolved_predictions INT NOT NULL DEFAULT 0,
  mean_abs_error_pct NUMERIC(6,3),
  median_abs_error_pct NUMERIC(6,3),
  p90_abs_error_pct NUMERIC(6,3),
  accuracy_pct NUMERIC(5,2),  -- % within 15% of actual
  improved_vs_prior BOOLEAN,  -- better than previous month?
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(month, derivation_method)
);

CREATE INDEX IF NOT EXISTS idx_la_month
  ON openclaw.learning_accuracy(month DESC);

COMMENT ON TABLE openclaw.learning_accuracy IS
  'PIE Law 7: monthly accuracy rollups per derivation method. Measures compound learning.';

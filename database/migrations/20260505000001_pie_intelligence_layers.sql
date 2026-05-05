-- PIE Intelligence Layers: Coverage Gaps, Auto-Expansion, Trends,
-- Compound Learning Accelerator, Wholesale, Market Positioning,
-- Supply Risk, and Offline Cache
--
-- These tables power PIE's self-improving, self-expanding intelligence system.

-- ============================================================================
-- 1. COVERAGE GAP DETECTOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.coverage_gaps (
  pricing_region_id UUID PRIMARY KEY REFERENCES openclaw.pricing_regions(id),
  state TEXT NOT NULL,
  coverage_score INT NOT NULL DEFAULT 0,
  freshness_score INT NOT NULL DEFAULT 0,
  diversity_score INT NOT NULL DEFAULT 0,
  priority_score INT NOT NULL DEFAULT 0,
  missing_ingredients INT NOT NULL DEFAULT 0,
  synthetic_only INT NOT NULL DEFAULT 0,
  days_since_freshest INT,
  active_sources INT NOT NULL DEFAULT 0,
  population_estimate BIGINT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coverage_gaps_priority ON openclaw.coverage_gaps(priority_score DESC);
CREATE INDEX idx_coverage_gaps_state ON openclaw.coverage_gaps(state);

-- ============================================================================
-- 2. AUTO-EXPANSION ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.expansion_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_region_id UUID NOT NULL REFERENCES openclaw.pricing_regions(id),
  state TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  reason TEXT,
  suggested_store_count INT NOT NULL DEFAULT 5,
  suggested_categories TEXT[] DEFAULT '{}',
  stores_dispatched INT DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  notes TEXT
);

CREATE UNIQUE INDEX idx_expansion_targets_pending
  ON openclaw.expansion_targets(pricing_region_id) WHERE status = 'pending';
CREATE INDEX idx_expansion_targets_status ON openclaw.expansion_targets(status, priority DESC);

CREATE TABLE IF NOT EXISTS openclaw.scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  store_name TEXT,
  chain TEXT,
  state TEXT,
  city TEXT,
  target_categories TEXT[] DEFAULT '{}',
  expansion_target_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result_count INT DEFAULT 0,
  error TEXT
);

CREATE UNIQUE INDEX idx_scrape_jobs_store_queued
  ON openclaw.scrape_jobs(store_id, status) WHERE status = 'queued';
CREATE INDEX idx_scrape_jobs_status ON openclaw.scrape_jobs(status, priority DESC);

-- ============================================================================
-- 3. TREND INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.ingredient_trends (
  ingredient_id TEXT NOT NULL,
  state TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('rising', 'falling', 'stable', 'volatile', 'insufficient_data')),
  change_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  volatility NUMERIC(8,4) NOT NULL DEFAULT 0,
  current_cents INT NOT NULL DEFAULT 0,
  prior_cents INT NOT NULL DEFAULT 0,
  observation_count INT NOT NULL DEFAULT 0,
  window_days INT NOT NULL DEFAULT 30,
  forecast_14d INT,
  forecast_30d INT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ingredient_id, COALESCE(state, '__null__'))
);

CREATE INDEX idx_ingredient_trends_direction ON openclaw.ingredient_trends(direction);
CREATE INDEX idx_ingredient_trends_volatility ON openclaw.ingredient_trends(volatility DESC);

-- Use a unique index instead of PK with COALESCE for the conflict target
DROP INDEX IF EXISTS openclaw.ingredient_trends_pkey;
ALTER TABLE openclaw.ingredient_trends DROP CONSTRAINT IF EXISTS ingredient_trends_pkey;
ALTER TABLE openclaw.ingredient_trends ADD PRIMARY KEY (ingredient_id, state);

-- Handle null state: use empty string as sentinel
ALTER TABLE openclaw.ingredient_trends ALTER COLUMN state SET DEFAULT '';

CREATE TABLE IF NOT EXISTS openclaw.volatility_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  state TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('spike', 'crash', 'unstable', 'supply_risk')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT,
  current_cents INT NOT NULL DEFAULT 0,
  normal_cents INT NOT NULL DEFAULT 0,
  deviation_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  suggestion TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX idx_volatility_alerts_unique
  ON openclaw.volatility_alerts(ingredient_id, COALESCE(state, ''), alert_type)
  WHERE is_active = true;
CREATE INDEX idx_volatility_alerts_active ON openclaw.volatility_alerts(is_active, severity);

CREATE TABLE IF NOT EXISTS openclaw.seasonal_patterns (
  ingredient_id TEXT PRIMARY KEY,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  cheapest_month INT NOT NULL,
  expensive_month INT NOT NULL,
  seasonal_swing_pct INT NOT NULL DEFAULT 0,
  current_seasonal_index INT NOT NULL DEFAULT 100,
  in_season BOOLEAN NOT NULL DEFAULT false,
  monthly_indices INT[] NOT NULL DEFAULT '{100,100,100,100,100,100,100,100,100,100,100,100}',
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. COMPOUND LEARNING ACCELERATOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.method_weights (
  derivation_method TEXT NOT NULL,
  category TEXT NOT NULL,
  weight NUMERIC(6,4) NOT NULL DEFAULT 0,
  mean_error_pct NUMERIC(8,3),
  sample_size INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (derivation_method, category)
);

CREATE TABLE IF NOT EXISTS openclaw.regional_bias_corrections (
  pricing_region_id UUID PRIMARY KEY REFERENCES openclaw.pricing_regions(id),
  state TEXT NOT NULL,
  bias_direction TEXT NOT NULL CHECK (bias_direction IN ('over', 'under', 'neutral')),
  bias_magnitude_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  correction_factor NUMERIC(6,4) NOT NULL DEFAULT 1.0,
  sample_size INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.confidence_calibration (
  confidence_bucket NUMERIC(3,2) PRIMARY KEY,
  expected_accuracy NUMERIC(6,2) NOT NULL,
  actual_accuracy NUMERIC(6,2) NOT NULL,
  calibration_gap NUMERIC(6,2) NOT NULL DEFAULT 0,
  adjustment_factor NUMERIC(6,4) NOT NULL DEFAULT 1.0,
  sample_size INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.chef_price_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('confirmed', 'too_high', 'too_low', 'wrong_item')),
  chef_reported_cents INT,
  system_showed_cents INT NOT NULL,
  state TEXT,
  processed_for_learning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_price_feedback_unprocessed
  ON openclaw.chef_price_feedback(processed_for_learning, created_at)
  WHERE processed_for_learning = false;

-- ============================================================================
-- 5. WHOLESALE INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.wholesale_distributors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('broadline', 'specialty', 'cash_and_carry', 'club')),
  coverage_states TEXT[] NOT NULL DEFAULT '{}',
  product_count INT NOT NULL DEFAULT 0,
  avg_savings_pct INT NOT NULL DEFAULT 0,
  markup_base NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  markup_volume_discount NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  membership_required BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.wholesale_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  retail_cents INT NOT NULL,
  wholesale_cents INT NOT NULL,
  distributor TEXT NOT NULL,
  savings_pct INT NOT NULL DEFAULT 0,
  savings_cents_per_unit INT NOT NULL DEFAULT 0,
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  available_states TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_wholesale_comparisons_unique
  ON openclaw.wholesale_comparisons(canonical_ingredient_id, distributor);
CREATE INDEX idx_wholesale_comparisons_savings
  ON openclaw.wholesale_comparisons(savings_pct DESC);

-- ============================================================================
-- 6. MARKET POSITIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.market_benchmarks (
  state TEXT NOT NULL,
  event_type TEXT NOT NULL,
  p25_cents INT NOT NULL,
  p50_cents INT NOT NULL,
  p75_cents INT NOT NULL,
  p90_cents INT NOT NULL,
  regional_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (state, event_type)
);

-- ============================================================================
-- 7. PREDICTIVE SUPPLY CHAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS openclaw.supply_risk_scores (
  ingredient_id TEXT PRIMARY KEY,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  risk_score INT NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  top_factor TEXT,
  has_substitutes BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supply_risk_scores_level ON openclaw.supply_risk_scores(risk_level, risk_score DESC);

-- ============================================================================
-- 8. OFFLINE CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_cache_snapshots (
  tenant_id TEXT PRIMARY KEY,
  version INT NOT NULL DEFAULT 1,
  snapshot_json JSONB NOT NULL,
  ingredient_count INT NOT NULL DEFAULT 0,
  size_bytes INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- ============================================================================
-- INDEXES for JOIN performance
-- ============================================================================

-- Trend lookups by ingredient list (for menu economics)
CREATE INDEX IF NOT EXISTS idx_ingredient_trends_lookup
  ON openclaw.ingredient_trends(ingredient_id);

-- Supply risk by ingredient list (for event assessment)
CREATE INDEX IF NOT EXISTS idx_supply_risk_ingredient
  ON openclaw.supply_risk_scores(ingredient_id);

-- Seasonal patterns by ingredient list
CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_lookup
  ON openclaw.seasonal_patterns(ingredient_id);

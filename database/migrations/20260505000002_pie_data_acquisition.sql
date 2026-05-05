-- PIE Data Acquisition Layer: API Keys, Ground Truth, Government Feed,
-- Regional Observations, and Prediction Resolutions.
--
-- Powers: rate limiting, receipt-to-PIE bridge, BLS/USDA feed, accuracy tracking.

-- ============================================================================
-- 1. PIE API KEYS (Rate Limiting + External Access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pie_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id TEXT,
  tier TEXT NOT NULL DEFAULT 'authenticated' CHECK (tier IN ('anonymous', 'authenticated', 'pro', 'internal')),
  hashed_key TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  requests_today INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pie_api_keys_hashed ON pie_api_keys(hashed_key) WHERE active = true;
CREATE INDEX idx_pie_api_keys_user ON pie_api_keys(user_id) WHERE user_id IS NOT NULL;

-- Reset daily counter (called by cron at midnight)
-- Example: UPDATE pie_api_keys SET requests_today = 0;

-- ============================================================================
-- 2. PIE GROUND TRUTH (Receipt Price Signals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pie_ground_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL,
  price_cents INT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  store_name TEXT,
  store_state TEXT,
  store_zip TEXT,
  purchase_date TEXT,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pie_ground_truth_ingredient ON pie_ground_truth(ingredient_id, created_at DESC);
CREATE INDEX idx_pie_ground_truth_state ON pie_ground_truth(store_state) WHERE store_state IS NOT NULL;
CREATE INDEX idx_pie_ground_truth_date ON pie_ground_truth(purchase_date DESC);

-- ============================================================================
-- 3. PIE GOVERNMENT PRICES (BLS/USDA Feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pie_government_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INT NOT NULL,
  unit TEXT NOT NULL,
  period TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'bls_cpi',
  series_id TEXT,
  region TEXT NOT NULL DEFAULT 'national',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pie_government_prices_series_period
  ON pie_government_prices(series_id, period) WHERE series_id IS NOT NULL;
CREATE INDEX idx_pie_government_prices_item ON pie_government_prices(item_name, period DESC);
CREATE INDEX idx_pie_government_prices_category ON pie_government_prices(category, region);

-- ============================================================================
-- 4. PIE REGIONAL OBSERVATIONS (Anonymized Receipt Aggregates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pie_regional_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL,
  price_cents INT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  store_name TEXT,
  state TEXT,
  zip TEXT,
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'receipt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pie_regional_obs_unique
  ON pie_regional_observations(ingredient_id, store_name, observed_at)
  WHERE store_name IS NOT NULL;
CREATE INDEX idx_pie_regional_obs_state ON pie_regional_observations(state, ingredient_id);
CREATE INDEX idx_pie_regional_obs_recent ON pie_regional_observations(observed_at DESC);

-- ============================================================================
-- 5. PIE PREDICTION RESOLUTIONS (Accuracy Tracking for Compound Learning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pie_prediction_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL,
  predicted_cents INT NOT NULL,
  actual_cents INT NOT NULL,
  deviation_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  resolution_tier TEXT,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'receipt'
);

CREATE INDEX idx_pie_resolutions_ingredient ON pie_prediction_resolutions(ingredient_id, resolved_at DESC);
CREATE INDEX idx_pie_resolutions_tier ON pie_prediction_resolutions(resolution_tier);
CREATE INDEX idx_pie_resolutions_recent ON pie_prediction_resolutions(resolved_at DESC);

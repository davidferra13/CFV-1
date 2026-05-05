-- Pricing Intelligence Engine: Supplier Preferences + Source Health
--
-- chef_supplier_preferences: where this chef actually shops (weights resolution)
-- source_health_log: uptime/freshness monitoring for scrape sources
-- price_anomaly_verdicts: persist anomaly reviews so they're not re-flagged

-- ======================================================================
-- 1. CHEF SUPPLIER PREFERENCES
-- ======================================================================
-- When a chef says "I shop at Restaurant Depot and Stop & Shop,"
-- those stores get weighted higher in their price resolution.

CREATE TABLE IF NOT EXISTS chef_supplier_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,              -- freeform store name
  chain_slug TEXT,                       -- links to openclaw.chains.slug if known
  vendor_id UUID REFERENCES vendors(id), -- links to ChefFlow vendor if applicable
  preference_rank INT NOT NULL DEFAULT 1, -- 1 = primary, 2 = secondary, etc.
  is_wholesale BOOLEAN NOT NULL DEFAULT false,
  zip TEXT,                              -- store ZIP if known
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, store_name)
);

ALTER TABLE chef_supplier_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_supplier_preferences_tenant ON chef_supplier_preferences
  USING (chef_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_csp_chef ON chef_supplier_preferences(chef_id);
CREATE INDEX idx_csp_chain ON chef_supplier_preferences(chain_slug) WHERE chain_slug IS NOT NULL;
CREATE INDEX idx_csp_rank ON chef_supplier_preferences(chef_id, preference_rank);

COMMENT ON TABLE chef_supplier_preferences IS
  'Where this chef actually shops. Preferred stores get weighted higher in price resolution.';

-- ======================================================================
-- 2. SOURCE HEALTH LOG
-- ======================================================================
-- Tracks uptime, latency, and data quality of each scrape source.
-- Cron job writes one row per check. Dashboard reads aggregates.

CREATE TABLE IF NOT EXISTS openclaw.source_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,             -- e.g. 'instacart_walmart', 'usda_bls', 'flipp'
  source_type TEXT NOT NULL DEFAULT 'scraper'
    CHECK (source_type IN ('scraper', 'api', 'government', 'wholesale', 'manual')),
  check_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'degraded', 'down', 'stale')),
  latency_ms INT,
  records_returned INT DEFAULT 0,
  records_expected INT,                  -- for staleness detection
  freshest_record_at TIMESTAMPTZ,        -- age of newest data from this source
  error TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_shl_source ON openclaw.source_health_log(source_name, check_time DESC);
CREATE INDEX idx_shl_status ON openclaw.source_health_log(status) WHERE status != 'ok';
CREATE INDEX idx_shl_time ON openclaw.source_health_log(check_time DESC);

COMMENT ON TABLE openclaw.source_health_log IS
  'Per-source uptime and freshness tracking. One row per health check run.';

-- ======================================================================
-- 3. PRICE ANOMALY VERDICTS
-- ======================================================================
-- Persist anomaly reviews so the same outlier is not re-flagged.
-- Reviewed anomalies feed back into confidence scoring.

CREATE TABLE IF NOT EXISTS openclaw.price_anomaly_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  pricing_region_id UUID REFERENCES openclaw.pricing_regions(id),
  store_name TEXT,
  anomaly_type TEXT NOT NULL
    CHECK (anomaly_type IN ('price_spike', 'price_drop', 'unit_mismatch', 'stale_data', 'outlier')),
  detected_price_cents INT,
  expected_price_cents INT,
  deviation_pct NUMERIC(6,2),
  verdict TEXT
    CHECK (verdict IN ('confirmed_deal', 'data_error', 'market_event', 'seasonal', 'unit_error', 'pending')),
  reviewed_by TEXT,                      -- 'system', 'admin', or chef_id
  reviewed_at TIMESTAMPTZ,
  auto_resolved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pav_ingredient ON openclaw.price_anomaly_verdicts(ingredient_name);
CREATE INDEX idx_pav_region ON openclaw.price_anomaly_verdicts(pricing_region_id) WHERE pricing_region_id IS NOT NULL;
CREATE INDEX idx_pav_verdict ON openclaw.price_anomaly_verdicts(verdict);
CREATE INDEX idx_pav_pending ON openclaw.price_anomaly_verdicts(created_at DESC) WHERE verdict = 'pending';

COMMENT ON TABLE openclaw.price_anomaly_verdicts IS
  'Persisted anomaly reviews. Prevents re-flagging and feeds confidence calibration.';

-- ======================================================================
-- 4. REGION CONFIDENCE CALIBRATION
-- ======================================================================
-- Self-correcting regional cost index from real chef feedback.
-- Compares BLS RPP to actual chef-confirmed prices over time.

CREATE TABLE IF NOT EXISTS openclaw.region_confidence_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_region_id UUID NOT NULL REFERENCES openclaw.pricing_regions(id) ON DELETE CASCADE,
  bls_cost_index NUMERIC(5,3) NOT NULL,
  observed_cost_index NUMERIC(5,3),      -- computed from chef feedback
  sample_size INT NOT NULL DEFAULT 0,
  deviation_pct NUMERIC(5,2),            -- how much observed differs from BLS
  calibrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pricing_region_id)
);

CREATE INDEX idx_rcc_region ON openclaw.region_confidence_calibration(pricing_region_id);

COMMENT ON TABLE openclaw.region_confidence_calibration IS
  'Self-correcting regional cost index. Chef feedback calibrates BLS RPP over time.';

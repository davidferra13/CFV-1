-- Migration: 20260320000013_chef_tax_config
-- Adds per-chef, per-state sales tax rate overrides.
-- Falls back to hardcoded constants in lib/finance/sales-tax-constants.ts when no override exists.
-- Rates in basis points (bps): 625 bps = 6.25%.

CREATE TABLE IF NOT EXISTS chef_tax_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL,
  rate_bps        INTEGER NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  local_rate_bps  INTEGER NOT NULL DEFAULT 0 CHECK (local_rate_bps >= 0 AND local_rate_bps <= 10000),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, state_code)
);

-- Indexes
CREATE INDEX idx_chef_tax_config_chef ON chef_tax_config(chef_id);
CREATE INDEX idx_chef_tax_config_state ON chef_tax_config(chef_id, state_code);

-- Updated_at trigger
CREATE TRIGGER trg_chef_tax_config_updated_at
  BEFORE UPDATE ON chef_tax_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE chef_tax_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ctc_chef_select ON chef_tax_config;
CREATE POLICY ctc_chef_select ON chef_tax_config FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS ctc_chef_insert ON chef_tax_config;
CREATE POLICY ctc_chef_insert ON chef_tax_config FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS ctc_chef_update ON chef_tax_config;
CREATE POLICY ctc_chef_update ON chef_tax_config FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS ctc_chef_delete ON chef_tax_config;
CREATE POLICY ctc_chef_delete ON chef_tax_config FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

COMMENT ON TABLE chef_tax_config IS
  'Per-chef, per-state sales tax rate overrides. Falls back to hardcoded constants when no row exists.';
COMMENT ON COLUMN chef_tax_config.rate_bps IS
  'State-level sales tax rate in basis points. 625 bps = 6.25%.';
COMMENT ON COLUMN chef_tax_config.local_rate_bps IS
  'Local/county rate in basis points. Combined rate = rate_bps + local_rate_bps.';

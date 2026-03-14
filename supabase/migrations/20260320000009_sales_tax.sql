-- Migration: 20260320000009_sales_tax
-- Adds sales tax configuration, per-event collection, and remittance tracking.
-- Rates stored in basis points (bps): 625 bps = 6.25%. Avoids float arithmetic.

-- TABLE 1: Sales tax configuration (one per chef)
CREATE TABLE sales_tax_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  enabled               BOOLEAN NOT NULL DEFAULT false,
  state                 TEXT,
  state_rate_bps        INTEGER NOT NULL DEFAULT 0
                        CHECK (state_rate_bps >= 0 AND state_rate_bps <= 10000),
  local_rate_bps        INTEGER NOT NULL DEFAULT 0
                        CHECK (local_rate_bps >= 0 AND local_rate_bps <= 10000),
  registration_number   TEXT,
  filing_frequency      TEXT NOT NULL DEFAULT 'quarterly'
                        CHECK (filing_frequency IN ('monthly', 'quarterly', 'annually')),
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chef_id)
);

-- TABLE 2: Sales tax collected per event
CREATE TABLE event_sales_tax (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  taxable_amount_cents  INTEGER NOT NULL DEFAULT 0 CHECK (taxable_amount_cents >= 0),
  tax_rate_bps          INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps >= 0),
  -- tax_collected_cents computed as: ROUND(taxable_amount_cents * tax_rate_bps / 10000)
  tax_collected_cents   INTEGER NOT NULL DEFAULT 0 CHECK (tax_collected_cents >= 0),

  is_exempt             BOOLEAN NOT NULL DEFAULT false,
  exemption_reason      TEXT,

  remitted              BOOLEAN NOT NULL DEFAULT false,
  remitted_at           TIMESTAMPTZ,
  remittance_period     TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id)
);

-- TABLE 3: Sales tax remittance records
CREATE TABLE sales_tax_remittances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  period                TEXT NOT NULL,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  amount_remitted_cents INTEGER NOT NULL CHECK (amount_remitted_cents >= 0),
  remitted_at           DATE NOT NULL,
  confirmation_number   TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sales_tax_settings_chef ON sales_tax_settings(chef_id);
CREATE INDEX idx_event_sales_tax_chef    ON event_sales_tax(chef_id, remitted);
CREATE INDEX idx_event_sales_tax_event   ON event_sales_tax(event_id);
CREATE INDEX idx_sales_tax_remit_chef    ON sales_tax_remittances(chef_id, period_start DESC);

-- Triggers
CREATE TRIGGER trg_sales_tax_settings_updated_at
  BEFORE UPDATE ON sales_tax_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_event_sales_tax_updated_at
  BEFORE UPDATE ON event_sales_tax
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: sales_tax_settings
ALTER TABLE sales_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY sts_chef_select ON sales_tax_settings FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sts_chef_insert ON sales_tax_settings FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sts_chef_update ON sales_tax_settings FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sts_chef_delete ON sales_tax_settings FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- RLS: event_sales_tax
ALTER TABLE event_sales_tax ENABLE ROW LEVEL SECURITY;

CREATE POLICY est_chef_select ON event_sales_tax FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY est_chef_insert ON event_sales_tax FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY est_chef_update ON event_sales_tax FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY est_chef_delete ON event_sales_tax FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- RLS: sales_tax_remittances
ALTER TABLE sales_tax_remittances ENABLE ROW LEVEL SECURITY;

CREATE POLICY str_chef_select ON sales_tax_remittances FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY str_chef_insert ON sales_tax_remittances FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY str_chef_update ON sales_tax_remittances FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY str_chef_delete ON sales_tax_remittances FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

COMMENT ON COLUMN sales_tax_settings.state_rate_bps IS
  'State sales tax rate in basis points. 625 bps = 6.25%.';
COMMENT ON COLUMN sales_tax_settings.local_rate_bps IS
  'Local/county sales tax rate in basis points. Add to state_rate_bps for combined rate.';
COMMENT ON COLUMN event_sales_tax.tax_rate_bps IS
  'Combined rate (state + local) in basis points at time of collection.';

-- Tax Workflow
-- IRS-compliant mileage log and tax settings storage.
-- Provides the raw data needed for Schedule C preparation, quarterly estimates,
-- and accountant exports without doing actual tax calculation (which requires a CPA).

-- ============================================
-- TABLE 1: MILEAGE LOGS
-- ============================================

CREATE TABLE mileage_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  log_date                DATE NOT NULL,
  from_address            TEXT NOT NULL,
  to_address              TEXT NOT NULL,
  miles                   NUMERIC(7,2) NOT NULL CHECK (miles > 0),
  purpose                 TEXT NOT NULL DEFAULT 'other'
                          CHECK (purpose IN (
                            'shopping', 'event', 'meeting',
                            'admin', 'equipment', 'other'
                          )),

  -- Optional event linkage
  event_id                UUID REFERENCES events(id) ON DELETE SET NULL,

  -- IRS rate and computed deduction (stored at log time to preserve historical rates)
  irs_rate_cents_per_mile INTEGER NOT NULL DEFAULT 70,  -- 2025 IRS rate = $0.70/mile = 70 cents
  deduction_cents         INTEGER GENERATED ALWAYS AS
                          (ROUND(miles * irs_rate_cents_per_mile)) STORED,

  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mileage_chef_date  ON mileage_logs(chef_id, log_date DESC);
CREATE INDEX idx_mileage_event      ON mileage_logs(event_id);

COMMENT ON TABLE mileage_logs IS 'IRS-compliant mileage log. deduction_cents is computed from miles × irs_rate_cents_per_mile at log time.';
COMMENT ON COLUMN mileage_logs.irs_rate_cents_per_mile IS 'Standard IRS mileage rate in cents at time of entry. 2025 = 70 cents/mile.';
COMMENT ON COLUMN mileage_logs.deduction_cents IS 'Computed deduction = miles × rate. Stored to preserve historical accuracy when rate changes.';

-- ============================================
-- TABLE 2: TAX SETTINGS (per chef, per year)
-- ============================================

CREATE TABLE tax_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tax_year                  INTEGER NOT NULL,

  filing_status             TEXT NOT NULL DEFAULT 'single'
                            CHECK (filing_status IN (
                              'single', 'married_jointly',
                              'married_separately', 'head_of_household'
                            )),

  -- Home office deduction inputs
  home_office_sqft          INTEGER,
  home_total_sqft           INTEGER,

  -- Quarterly estimated tax due dates (JSONB array of {quarter, due_date, amount_paid_cents})
  quarterly_payments        JSONB NOT NULL DEFAULT '[]',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chef_id, tax_year)
);

CREATE INDEX idx_tax_settings_chef ON tax_settings(chef_id, tax_year DESC);

COMMENT ON TABLE tax_settings IS 'Per-chef, per-year tax configuration. Used to personalize quarterly estimates and accountant export.';

CREATE TRIGGER trg_tax_settings_updated_at
  BEFORE UPDATE ON tax_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE mileage_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings  ENABLE ROW LEVEL SECURITY;

CREATE POLICY ml_chef_select ON mileage_logs FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ml_chef_insert ON mileage_logs FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ml_chef_update ON mileage_logs FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ml_chef_delete ON mileage_logs FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

CREATE POLICY ts_chef_select ON tax_settings FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ts_chef_insert ON tax_settings FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ts_chef_update ON tax_settings FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ts_chef_delete ON tax_settings FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- Commerce Engine V1 — Wave 3: Reconciliation, Settlement, Tax Summary
-- Daily financial reconciliation, Stripe payout tracking, tax reporting.

-- ─── Reconciliation Flag Status ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE reconciliation_flag_status AS ENUM ('open', 'resolved', 'ignored');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ─── Daily Reconciliation Reports ───────────────────────────────
-- Per-day financial snapshot: totals, cash variance, flags, ledger cross-check.
CREATE TABLE IF NOT EXISTS daily_reconciliation_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Period
  report_date       DATE NOT NULL,

  -- Revenue totals (from commerce_payments)
  total_sales_count       INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents     INTEGER NOT NULL DEFAULT 0,
  total_tips_cents        INTEGER NOT NULL DEFAULT 0,
  total_tax_cents         INTEGER NOT NULL DEFAULT 0,
  total_refunds_cents     INTEGER NOT NULL DEFAULT 0,
  net_revenue_cents       INTEGER NOT NULL DEFAULT 0,

  -- Payment method breakdown
  cash_total_cents        INTEGER NOT NULL DEFAULT 0,
  card_total_cents        INTEGER NOT NULL DEFAULT 0,
  other_total_cents       INTEGER NOT NULL DEFAULT 0,

  -- Cash drawer (from register sessions)
  opening_cash_cents      INTEGER,
  closing_cash_cents      INTEGER,
  expected_cash_cents     INTEGER,
  cash_variance_cents     INTEGER,

  -- Ledger cross-check
  ledger_total_cents      INTEGER,   -- sum from ledger_entries for this day
  payment_ledger_diff_cents INTEGER, -- commerce_payments total - ledger total (should be 0 or explainable)

  -- Flags
  flags                   JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{"type": "cash_variance", "severity": "warning", "message": "...", "status": "open"}]

  -- Status
  reviewed                BOOLEAN NOT NULL DEFAULT false,
  reviewed_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at             TIMESTAMPTZ,
  notes                   TEXT,

  UNIQUE (tenant_id, report_date)
);
-- ─── Settlement Records ─────────────────────────────────────────
-- Tracks Stripe payouts and maps them to individual payments.
CREATE TABLE IF NOT EXISTS settlement_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Stripe payout info
  stripe_payout_id      TEXT NOT NULL,
  stripe_transfer_id    TEXT,
  payout_amount_cents   INTEGER NOT NULL,
  payout_currency       TEXT NOT NULL DEFAULT 'usd',
  payout_status         TEXT NOT NULL DEFAULT 'pending', -- pending, in_transit, paid, failed, canceled
  payout_arrival_date   DATE,

  -- Breakdown
  gross_amount_cents    INTEGER NOT NULL DEFAULT 0,
  fee_amount_cents      INTEGER NOT NULL DEFAULT 0,
  refund_amount_cents   INTEGER NOT NULL DEFAULT 0,
  net_amount_cents      INTEGER NOT NULL DEFAULT 0,

  -- Linked payments (JSONB array of payment IDs settled in this payout)
  payment_ids           JSONB NOT NULL DEFAULT '[]',
  payment_count         INTEGER NOT NULL DEFAULT 0,

  -- Period covered
  period_start          DATE,
  period_end            DATE,

  -- Metadata
  notes                 TEXT,

  UNIQUE (tenant_id, stripe_payout_id)
);
-- ─── Daily Tax Summary ──────────────────────────────────────────
-- Tax collected per jurisdiction per day per tax class.
CREATE TABLE IF NOT EXISTS daily_tax_summary (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Period
  report_date       DATE NOT NULL,

  -- Jurisdiction
  tax_jurisdiction  TEXT NOT NULL,  -- e.g. "NY-Kings" or zip code
  state             TEXT,
  county            TEXT,
  city              TEXT,

  -- Tax class
  tax_class         TEXT NOT NULL DEFAULT 'standard',

  -- Amounts
  taxable_amount_cents    INTEGER NOT NULL DEFAULT 0,
  tax_collected_cents     INTEGER NOT NULL DEFAULT 0,
  tax_rate                NUMERIC(8,6) NOT NULL DEFAULT 0,  -- e.g. 0.088750

  -- Breakdown by component
  state_tax_cents         INTEGER NOT NULL DEFAULT 0,
  county_tax_cents        INTEGER NOT NULL DEFAULT 0,
  city_tax_cents          INTEGER NOT NULL DEFAULT 0,

  -- Transaction count
  transaction_count       INTEGER NOT NULL DEFAULT 0,

  UNIQUE (tenant_id, report_date, tax_jurisdiction, tax_class)
);
-- ─── Auto-update timestamps ─────────────────────────────────────
DROP TRIGGER IF EXISTS update_daily_reconciliation_reports_updated_at ON daily_reconciliation_reports;
CREATE TRIGGER update_daily_reconciliation_reports_updated_at
  BEFORE UPDATE ON daily_reconciliation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE daily_reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tax_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_reconciliation_chef_all ON daily_reconciliation_reports;
CREATE POLICY daily_reconciliation_chef_all ON daily_reconciliation_reports
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS settlement_records_chef_all ON settlement_records;
CREATE POLICY settlement_records_chef_all ON settlement_records
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS daily_tax_summary_chef_all ON daily_tax_summary;
CREATE POLICY daily_tax_summary_chef_all ON daily_tax_summary
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ─── Indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_recon_tenant_date
  ON daily_reconciliation_reports(tenant_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_settlement_tenant_date
  ON settlement_records(tenant_id, payout_arrival_date DESC);
CREATE INDEX IF NOT EXISTS idx_settlement_stripe_payout
  ON settlement_records(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_daily_tax_tenant_date
  ON daily_tax_summary(tenant_id, report_date DESC);

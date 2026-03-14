-- Payment Plans, Mileage Logs, and Tip Log
-- Three additive tables for financial tracking improvements.

-- ── Payment Plans ──────────────────────────────────────────────────────────────
-- Installment schedules for large events. Each row is one scheduled installment.

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  installment_num INTEGER NOT NULL,          -- 1 = deposit, 2 = mid, 3 = balance, etc.
  label           TEXT NOT NULL,             -- e.g. "Deposit", "Final Balance"
  amount_cents    INTEGER NOT NULL CHECK (amount_cents > 0),
  due_date        DATE NOT NULL,
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppi_event    ON payment_plan_installments(event_id);
CREATE INDEX IF NOT EXISTS idx_ppi_tenant   ON payment_plan_installments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ppi_due_date ON payment_plan_installments(due_date)
  WHERE paid_at IS NULL;

ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own installments"
  ON payment_plan_installments
  FOR ALL
  TO authenticated
  USING  (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));


-- ── Mileage Logs ───────────────────────────────────────────────────────────────
-- Per-event mileage entries for tax deduction tracking.

CREATE TABLE IF NOT EXISTS mileage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  trip_date       DATE NOT NULL,
  description     TEXT NOT NULL,             -- e.g. "Drive to venue", "Grocery run"
  miles           NUMERIC(8,1) NOT NULL CHECK (miles > 0),
  irs_rate_cents  INTEGER NOT NULL DEFAULT 67, -- 67¢/mile (2024 rate, update annually)
  deduction_cents INTEGER GENERATED ALWAYS AS (ROUND(miles * irs_rate_cents)) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already existed with different schema (chef_id/log_date), backfill columns
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  trip_date DATE;
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  description TEXT;

CREATE INDEX IF NOT EXISTS idx_mileage_event  ON mileage_logs(event_id);
-- Wrap in DO blocks so missing columns don't abort the whole migration
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_mileage_tenant ON mileage_logs(tenant_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_mileage_date ON mileage_logs(tenant_id, trip_date);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Chefs manage own mileage"
    ON mileage_logs
    FOR ALL
    TO authenticated
    USING  (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Tip Log ────────────────────────────────────────────────────────────────────
-- Dedicated tip entries per event (cash, Venmo, etc.) separate from the ledger.
-- Aggregated annually for tax reporting.

CREATE TABLE IF NOT EXISTS event_tips (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  amount_cents   INTEGER NOT NULL CHECK (amount_cents > 0),
  method         TEXT NOT NULL DEFAULT 'cash',  -- cash | venmo | zelle | other
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_event  ON event_tips(event_id);
CREATE INDEX IF NOT EXISTS idx_tips_tenant ON event_tips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tips_year   ON event_tips(tenant_id, received_at);

ALTER TABLE event_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own tips"
  ON event_tips
  FOR ALL
  TO authenticated
  USING  (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

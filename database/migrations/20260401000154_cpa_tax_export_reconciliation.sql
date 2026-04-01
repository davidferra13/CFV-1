-- Migration: CPA Tax Export and Reconciliation
-- Fixes event_financial_summary double-count, widens Schedule C constraint,
-- adds accounting_period_locks, tax_export_runs, and owner_draws tables,
-- and re-enables RLS on finance tables used by the export.

-- ============================================================
-- 1. Corrected event_financial_summary view
--    Aggregates ledger and expenses separately before joining to events.
--    Preserves all existing output column names for downstream compatibility.
-- ============================================================

CREATE OR REPLACE VIEW event_financial_summary AS
WITH ledger_totals AS (
  SELECT
    tenant_id,
    event_id,
    COALESCE(SUM(CASE
      WHEN (NOT is_refund) AND entry_type <> 'tip' THEN amount_cents
      ELSE 0
    END), 0) AS total_paid_cents,
    COALESCE(SUM(CASE
      WHEN (NOT is_refund) AND entry_type = 'tip' THEN amount_cents
      ELSE 0
    END), 0) AS tip_amount_cents,
    COALESCE(SUM(CASE
      WHEN is_refund OR entry_type = 'refund' THEN ABS(amount_cents)
      ELSE 0
    END), 0) AS total_refunded_cents,
    COALESCE(SUM(CASE
      WHEN NOT is_refund THEN amount_cents
      ELSE -ABS(amount_cents)
    END), 0) AS net_revenue_cents
  FROM ledger_entries
  GROUP BY tenant_id, event_id
),
expense_totals AS (
  SELECT
    tenant_id,
    event_id,
    COALESCE(SUM(CASE WHEN is_business THEN amount_cents ELSE 0 END), 0) AS total_expenses_cents,
    COALESCE(SUM(CASE
      WHEN is_business AND category IN ('groceries', 'alcohol', 'specialty_items') THEN amount_cents
      ELSE 0
    END), 0) AS cogs_expense_cents
  FROM expenses
  GROUP BY tenant_id, event_id
)
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.quoted_price_cents,
  e.payment_status,
  COALESCE(lt.total_paid_cents, 0) AS total_paid_cents,
  COALESCE(lt.total_refunded_cents, 0) AS total_refunded_cents,
  COALESCE(lt.net_revenue_cents, 0) AS net_revenue_cents,
  COALESCE(et.total_expenses_cents, 0) AS total_expenses_cents,
  COALESCE(lt.tip_amount_cents, 0) AS tip_amount_cents,
  COALESCE(lt.net_revenue_cents, 0) - COALESCE(et.total_expenses_cents, 0) AS profit_cents,
  CASE
    WHEN COALESCE(lt.net_revenue_cents, 0) > 0
      THEN (COALESCE(lt.net_revenue_cents, 0) - COALESCE(et.total_expenses_cents, 0))::numeric
        / COALESCE(lt.net_revenue_cents, 1)::numeric
    ELSE 0::numeric
  END AS profit_margin,
  CASE
    WHEN COALESCE(lt.net_revenue_cents, 0) > 0
      THEN COALESCE(et.cogs_expense_cents, 0)::numeric
        / COALESCE(lt.net_revenue_cents, 1)::numeric
    ELSE 0::numeric
  END AS food_cost_percentage,
  GREATEST(e.quoted_price_cents - COALESCE(lt.total_paid_cents, 0), 0) AS outstanding_balance_cents
FROM events e
LEFT JOIN ledger_totals lt
  ON lt.event_id = e.id AND lt.tenant_id = e.tenant_id
LEFT JOIN expense_totals et
  ON et.event_id = e.id AND et.tenant_id = e.tenant_id;

-- ============================================================
-- 2. Widen expense_tax_categories Schedule C constraint
--    Adds lines needed by the live expense model.
-- ============================================================

ALTER TABLE expense_tax_categories
  DROP CONSTRAINT IF EXISTS expense_tax_categories_schedule_c_line_check;

ALTER TABLE expense_tax_categories
  ADD CONSTRAINT expense_tax_categories_schedule_c_line_check
  CHECK (
    schedule_c_line IN (
      'line_8',
      'line_9',
      'line_11',
      'line_13',
      'line_15',
      'line_17',
      'line_18',
      'line_20b',
      'line_22',
      'line_24a',
      'line_24b',
      'line_25',
      'line_26',
      'line_27a',
      'cogs'
    )
  );

-- Unique index: one authoritative mapping per expense row per year
CREATE UNIQUE INDEX IF NOT EXISTS idx_etc_unique_expense_source_per_year
  ON expense_tax_categories(tenant_id, source, source_id, tax_year)
  WHERE source = 'expense' AND source_id IS NOT NULL;

-- ============================================================
-- 3. New tables: accounting_period_locks, tax_export_runs, owner_draws
-- ============================================================

CREATE TABLE IF NOT EXISTS accounting_period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('tax_year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period_type, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS tax_export_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year >= 2020 AND tax_year <= 2035),
  export_number INTEGER NOT NULL CHECK (export_number > 0),
  schema_version TEXT NOT NULL,
  locked_period_id UUID REFERENCES accounting_period_locks(id) ON DELETE SET NULL,
  checksum TEXT NOT NULL,
  filename TEXT NOT NULL,
  detail_row_count INTEGER NOT NULL DEFAULT 0,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (tenant_id, tax_year, export_number)
);

CREATE TABLE IF NOT EXISTS owner_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  draw_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payment_method payment_method NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounting_period_locks_tenant_period
  ON accounting_period_locks(tenant_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_tax_export_runs_tenant_year
  ON tax_export_runs(tenant_id, tax_year DESC, export_number DESC);

CREATE INDEX IF NOT EXISTS idx_owner_draws_tenant_date
  ON owner_draws(tenant_id, draw_date DESC);

-- ============================================================
-- 4. Re-enable RLS on finance tables used by the CPA export
-- ============================================================

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_tax_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_quarterly_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sales_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_tax_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tax_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_export_runs ENABLE ROW LEVEL SECURITY;

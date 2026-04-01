# Spec: CPA-Ready Tax Export and Reconciliation

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-04-01

## Timeline

| Event         | Date                 | Agent/Session | Commit                   |
| ------------- | -------------------- | ------------- | ------------------------ |
| Created       | 2026-04-01 01:18 EST | Codex planner | pending at planning time |
| Status: ready | 2026-04-01 01:18 EST | Codex planner | pending at planning time |

---

## Citation Note

- Runtime audit numbers in this spec came from the local seeded ChefFlow demo tenant used during planning. Repo citations below anchor the code and schema that currently produce or expose those behaviors.
- When a current behavior was verified both in live seeded data and in code, the runtime observation is paired with the current file that wires it.

---

## Developer Notes

### Transcript Outline / Raw Signal

The developer's instruction was not "design a tax product." It was "audit the real system, prove what exists, prove what is broken, and then close only the verified gaps."

This is explicitly not a brainstorming exercise. The developer rejected speculative feature design and wanted reality-check work: identify what ChefFlow already does correctly, keep that, and repair only the seams that stop a CPA from filing directly from one export.

The proof standard is intentionally harsh. If a capability cannot be verified in code, schema, or seeded data, it does not count. If real or seeded data cannot be accessed, the answer is NO. If anything requires spreadsheet cleanup, off-system reconstruction, reclassification, multi-page navigation, or accountant guesswork, the system fails the standard.

The developer framed the audit around one concrete question: if a chef used ChefFlow for a full year, could a CPA take a single export and file taxes immediately with little to no clarification or reconstruction?

The work had to validate the full operational chain, not just isolated screens: inquiry -> event -> menu -> recipes -> costing -> invoice -> payment -> reporting -> export.

The developer also forced a broad accounting-reality pass. Revenue integrity, expense integrity, COGS separation, profit math, ledger completeness, tax classification, reporting/export structure, multi-source normalization, continuous operations support, payroll and POS ingestion, refunds and cancellations, explainability, sales-tax separation, owner-draw separation, immutable auditability, and control surfaces all had to be judged against real evidence.

The audit had to use real or seeded data for at least three events or an equivalent dataset, generate actual revenue, COGS, categorized expenses, and net profit numbers, produce a real export, and verify that totals reconcile exactly with no missing or duplicate rows.

After the audit, the developer wanted an immediate conversion into a minimal build spec. No feature expansion, no "future nice-to-haves," no replacement system unless the existing system truly lacks a required control. The path had to be direct: confirm what works, isolate what fails, define the smallest production-ready repair set.

The developer then added a second demand: preserve the reasoning itself. The builder must understand why each rule exists, not just what file to change. The conversation, especially the audit-first framing and zero-friction standard, had to be attached permanently to the spec in a way that survives handoff.

### Developer Intent

- **Audit first, build second:** the developer wanted evidence before design. Builder scope must come from verified failures, not from intuition or generic accounting-product ideas.
- **Preserve working reality:** ChefFlow already has real finance, tax, event, menu, and commerce primitives. The goal is not to replace them with a new accounting subsystem. The goal is to make the existing truth reliable and exportable.
- **One export, one truth source:** the system must converge on one authoritative CPA-facing dataset and one year-end export path. Multiple accountant outputs, mixed revenue definitions, or parallel total calculators violate the intent even if each path looks plausible in isolation.
- **Explainability is part of correctness:** every number must be traceable back to raw rows, source tables, and normalization logic. A mathematically correct number with no explanation path still fails the developer's standard.
- **Visible failure is better than fake completeness:** missing mappings, unresolved categories, missing receipts, missing source rows, or incomplete historical data should block or warn explicitly. They must never be hidden behind zero values, vague labels, or optimistic exports.
- **The spec must carry the why:** the builder needs the reasoning behind the rules because most of the risk in this area comes from seemingly reasonable shortcuts, such as using quoted price as revenue, keeping duplicate export paths alive, or letting unresolved tax categories slide through to CSV.
- **Success means no reconstruction:** from the developer's perspective, a builder succeeds only when a full-year ChefFlow export can be handed to a CPA without reclassification, spreadsheet fixing, or off-platform reconciliation for the covered accounting model.

### Execution Translation

- **Requirements:** the build must produce one full-year, CPA-facing export package backed by one canonical dataset; that dataset must reconcile revenue, tips, refunds, COGS, categorized expenses, net profit, source/channel metadata, and audit detail directly to source tables.
- **Requirements:** the build must preserve end-to-end traceability from inquiry-linked event work through payment, reporting, and export, with exact reconciliation on the seeded audit baseline before UI claims of readiness are allowed.
- **Requirements:** the build must translate current finance data into builder-usable rules, including how to treat sales tax, fees, discretionary tips, service revenue, owner draws, payroll, contractor payments, mileage, and ambiguous expense categories.
- **Constraints:** no speculative feature expansion; no parallel accounting system; no claimed capability without verified code or data support; no fallback zeros or reference-only numbers presented as accounting truth.
- **Constraints:** scope stays surgical. Add new tables or controls only where the current repo truly lacks required accounting infrastructure, such as period locks, export snapshots, and owner-draw separation.
- **Constraints:** existing operational exports may survive only if they are clearly not CPA-facing and do not rely on broken finance logic that would misstate numbers elsewhere.
- **Behaviors:** `/finance/year-end`, `/finance/tax`, and `/finance/export` must converge on the same canonical export builder and readiness logic.
- **Behaviors:** expense writes must maintain authoritative tax classification state, unresolved mappings must block export, and accountant-facing pages must surface blockers honestly.
- **Behaviors:** revenue must come from realized cash and normalized settlement/refund data, not from quoted prices, event status, or completed-event counts.
- **Behaviors:** the builder must treat the spec as an audit repair plan, not as permission to invent adjacent accounting workflows that were not proven necessary here.

---

## What This Does (Plain English)

This spec turns ChefFlow's existing finance data into one authoritative, cash-basis year-end export. After it is built, `/finance/year-end`, `/finance/tax`, and the finance export link all route to the same reconciled package, generated from raw ledger entries, business expenses, existing tax mappings, commerce sales and refunds, sales tax liabilities, payroll, contractor payments, mileage, and owner draws. The export blocks when required tax data is still unresolved, and when it succeeds it produces one versioned package with a Schedule C-style summary and a transaction-level detail file that ties every total back to a source row.

---

## Why It Matters

ChefFlow already stores enough finance data to look complete, but the current accounting outputs do not reconcile cleanly. The main event finance view double-counts payments and expenses, the tax surfaces disagree with each other, and the export layer mixes quoted prices, raw ledger cash, and stale schema assumptions, which forces manual reconstruction before filing. Current anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003-1029`, `lib/exports/actions.ts:225-426`, `lib/finance/tax-package.ts:52-150`, `lib/tax/actions.ts:219-298`, `app/(chef)/finance/year-end/year-end-client.tsx:53-95`.

---

## Current Verified Failures

| Area                                                                 | Current Behavior                                                                                                                                                                                                                                                         | Current Anchors                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Required Fix                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Event financial aggregation                                          | `event_financial_summary` joins `ledger_entries` and `expenses` in the same grouped rowset, which multiplies totals when an event has multiple rows on both sides. It also uses `events.tip_amount_cents` instead of tip ledger rows.                                    | `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003-1029`; `lib/ledger/compute.ts:11-45`; `lib/events/financial-summary-actions.ts:187-210`; `lib/finance/invoice-payment-link-actions.ts:62-82`                                                                                                                                                                                                                                        | Replace the view with separately aggregated ledger and expense subqueries while preserving the current output columns.               |
| Export surfaces disagree on revenue truth                            | The reporting export route downloads only ledger rows, the all-events CSV trusts the broken view, and year-end/tax pages mix ledger cash, quoted event prices, and status-based filters.                                                                                 | `app/(chef)/finance/export/route.ts:15-59`; `lib/exports/actions.ts:225-426`; `app/(chef)/finance/reporting/page.tsx:96-101`; `app/(chef)/financials/financials-client.tsx:190-205`; `lib/finance/tax-package.ts:63-97`; `app/(chef)/finance/year-end/page.tsx:49-58`                                                                                                                                                                                             | Create one canonical year-end export package and repoint all CPA-facing export buttons and routes to it.                             |
| Expense classification layer is unsafe                               | `expense_tax_categories` exists, but `getScheduleCBreakdown()` sums manual categorization rows and raw expense rows together, which can double count the same expense. The allowed Schedule C values also omit lines needed by live categories such as contractor labor. | `database/migrations/20260401000013_expense_tax_categories.sql:9-32`; `lib/finance/tax-prep-actions.ts:124-181`; `lib/finance/tax-prep-actions.ts:359-427`; `lib/finance/tax-prep-constants.ts:5-69`; `lib/constants/expense-categories.ts:5-117`                                                                                                                                                                                                                 | Make `expense_tax_categories` authoritative per expense row, widen the allowed Schedule C set, and stop the dual-source aggregation. |
| Old finance helpers are schema-drifted                               | Some finance modules still query `chef_id`, `date`, `vendor`, and `receipt_url`, while the live expenses table uses `tenant_id`, `expense_date`, `vendor_name`, and `receipt_photo_url`.                                                                                 | `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:392-445`; `lib/expenses/actions.ts:75-177`; `lib/finance/expense-actions.ts:25-180`; `lib/finance/export-actions.ts:168-185`; `lib/finance/tax-package.ts:71-76`                                                                                                                                                                                                                         | Remove or repoint stale finance helpers so every tax/export surface uses the current schema.                                         |
| Reporting pages still use quoted prices or inconsistent dates        | Profit by Event, Reconciliation, Revenue by Month, Tax Summary, and Year-End all use mixed accounting dates or quoted prices instead of realized cash-basis amounts.                                                                                                     | `app/(chef)/finance/reporting/profit-by-event/page.tsx:36-48`; `app/(chef)/finance/payouts/reconciliation/page.tsx:48-63`; `app/(chef)/finance/reporting/revenue-by-month/page.tsx:35-44`; `app/(chef)/finance/reporting/tax-summary/page.tsx:27-45`; `lib/ledger/actions.ts:33-57`; `app/(chef)/finance/year-end/year-end-client.tsx:55-95`                                                                                                                      | Standardize cash-basis date rules and realized-amount logic in one shared export/read model.                                         |
| Continuous ops data exists but is not normalized into the tax export | Commerce has `sales`, `sale_items`, `commerce_payments`, `commerce_refunds`, `daily_reconciliation_reports`, `settlement_records`, and `daily_tax_summary`, but the CPA-facing export path does not include them.                                                        | `database/migrations/20260328000001_commerce_engine_foundation.sql:126-265`; `database/migrations/20260328000003_commerce_reconciliation.sql:12-125`; `lib/commerce/payment-actions.ts:34-143`; `lib/commerce/refund-actions.ts:29-170`; `lib/commerce/reconciliation-actions.ts:152-320`; `lib/finance/profit-loss-report-actions.ts:45-174`                                                                                                                     | Normalize event revenue, POS revenue, refunds, sales tax, and settlement fees into the same year-end export dataset.                 |
| Finance controls are not sufficient for a filing artifact            | Finance RLS was originally enabled, but a later migration disables it across finance tables. There is also no accounting-period lock or versioned tax export snapshot in the inspected finance surface.                                                                  | `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:883-980`; `database/migrations/20260401000098_disable_rls_all_tables.sql:181-201`; `database/migrations/20260401000098_disable_rls_all_tables.sql:289-310`; `database/migrations/20260401000098_disable_rls_all_tables.sql:409-471`; `database/migrations/20260401000098_disable_rls_all_tables.sql:565-633`; `app/(chef)/finance/page.tsx:67-170`; `docs/app-complete-audit.md:662-719` | Re-enable RLS on finance tables used by the export, add tax-year locks, and persist export runs with checksum and schema version.    |
| Owner draws are not modeled separately from revenue/expense data     | The ledger enum has no owner-draw type, ledger rows require a client, and no owner-draw surface exists in the current finance route inventory.                                                                                                                           | `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:76-87`; `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:339-344`; `lib/ledger/append.ts:22-38`; `app/(chef)/finance/ledger/page.tsx:11-24`; `docs/app-complete-audit.md:662-719`                                                                                                                                                                                | Add a separate owner-draw table and a minimal finance UI so draws are tracked in-product and excluded from P&L.                      |

---

## Files to Create

| File                                                                   | Purpose                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260401000150_cpa_tax_export_reconciliation.sql` | Adds accounting locks, export runs, owner draws, expense-tax constraints, and the corrected `event_financial_summary` view. |
| `lib/finance/cpa-export-actions.ts`                                    | Canonical server-side read model, validation, reconciliation, and export-package builder for tax-year exports.              |
| `app/(chef)/finance/year-end/export/route.ts`                          | Streams the canonical export package as one download.                                                                       |
| `lib/finance/owner-draw-actions.ts`                                    | Chef-only CRUD for owner draws, kept outside revenue and expense totals.                                                    |
| `app/(chef)/finance/ledger/owner-draws/page.tsx`                       | Minimal owner-draw capture and review surface so the system no longer requires off-platform tracking.                       |

---

## Files to Modify

| File                                                    | What to Change                                                                                                                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ledger/compute.ts`                                 | Stop treating `event_financial_summary` as trustworthy until the corrected view is in place; standardize cash-basis date use and make yearly P&L consume the new canonical export dataset for CPA-facing totals. |
| `lib/ledger/actions.ts`                                 | Add support for filtering and exporting by canonical accounting date instead of `created_at` only.                                                                                                               |
| `lib/expenses/actions.ts`                               | On create/update/delete, upsert or remove the matching authoritative `expense_tax_categories` row for deterministic categories and revalidate export surfaces.                                                   |
| `lib/exports/actions.ts`                                | Keep operational exports, but stop using the broken view and stale tip logic; use the corrected event summary.                                                                                                   |
| `lib/finance/export-actions.ts`                         | Remove stale `receipt_url` and quoted-price assumptions; either repoint report CSVs to current data or narrow them to non-CPA operational exports only.                                                          |
| `lib/finance/tax-prep-actions.ts`                       | Make `expense_tax_categories` the authoritative source per expense row, eliminate double counting, and widen supported Schedule C lines.                                                                         |
| `lib/finance/tax-prep-constants.ts`                     | Add the Schedule C lines the live finance model currently cannot encode but needs for export.                                                                                                                    |
| `lib/finance/tax-package.ts`                            | Replace quoted-price and stale-column logic with the canonical export dataset or delete this duplicate path from the UI.                                                                                         |
| `lib/tax/actions.ts`                                    | Replace the JSON accountant export and quarterly estimate revenue logic with the canonical cash-basis dataset.                                                                                                   |
| `app/(chef)/finance/year-end/page.tsx`                  | Load the new readiness summary and canonical export state instead of mixed P&L plus event-count logic.                                                                                                           |
| `app/(chef)/finance/year-end/year-end-client.tsx`       | Replace the current inaccurate CSV builder with a download link to the canonical export route and display blocking readiness issues.                                                                             |
| `app/(chef)/finance/tax/page.tsx`                       | Use the same readiness summary used by Year-End, not a separate approximation path.                                                                                                                              |
| `app/(chef)/finance/tax/tax-center-client.tsx`          | Replace the JSON export button with the canonical package download and readiness/error states.                                                                                                                   |
| `app/(chef)/finance/tax/year-end/page.tsx`              | Read from the canonical export dataset or remove duplicate year-end figures that can diverge from Year-End Summary.                                                                                              |
| `app/(chef)/finance/export/route.ts`                    | Replace the current ledger-only CSV with a redirect or stream from the canonical export route.                                                                                                                   |
| `app/(chef)/finance/reporting/page.tsx`                 | Point "Export Financials CSV" to the canonical export route and rename it so it stops claiming truth it does not currently provide.                                                                              |
| `app/(chef)/finance/reporting/tax-summary/page.tsx`     | Stop mixing all-time revenue with current-year expenses; render only canonical current-year tax summary data.                                                                                                    |
| `app/(chef)/finance/reporting/profit-by-event/page.tsx` | Use realized cash and corrected event financial summary data instead of `quoted_price_cents`.                                                                                                                    |
| `app/(chef)/finance/payouts/reconciliation/page.tsx`    | Reconcile against realized payments and refunds, not quoted event value.                                                                                                                                         |
| `app/(chef)/financials/financials-client.tsx`           | Keep operational event export separate from CPA export and relabel buttons so users cannot confuse the two.                                                                                                      |
| `app/(chef)/finance/ledger/page.tsx`                    | Add the owner-draw route entry to the ledger section.                                                                                                                                                            |
| `app/(chef)/finance/ledger/adjustments/page.tsx`        | Fence credits/add-ons from owner draws so they are not treated as the same concept.                                                                                                                              |

---

## Database Changes

### New Tables

```sql
CREATE TABLE accounting_period_locks (
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

CREATE TABLE tax_export_runs (
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

CREATE TABLE owner_draws (
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

CREATE INDEX idx_accounting_period_locks_tenant_period
  ON accounting_period_locks(tenant_id, period_start DESC);

CREATE INDEX idx_tax_export_runs_tenant_year
  ON tax_export_runs(tenant_id, tax_year DESC, export_number DESC);

CREATE INDEX idx_owner_draws_tenant_date
  ON owner_draws(tenant_id, draw_date DESC);
```

### New Columns on Existing Tables

None.

### New Constraints, Indexes, and View Changes

```sql
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

CREATE UNIQUE INDEX idx_etc_unique_expense_source_per_year
  ON expense_tax_categories(tenant_id, source, source_id, tax_year)
  WHERE source = 'expense' AND source_id IS NOT NULL;

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
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/`. As of planning, the highest visible timestamp is `20260401000149_add_missing_chains.sql`, so the builder must choose the next free timestamp after that. Current anchor: existing migration inventory in this planning session.
- Do not edit the historical finance migrations in place. The new migration must `CREATE OR REPLACE VIEW`, alter constraints additively, and re-enable RLS in a forward-only way.
- Preserve the current `event_financial_summary` column names so downstream consumers continue to compile while they are repointed. Current anchors: `lib/ledger/compute.ts:31-44`, `lib/client-portal/actions.ts:251-269`, `lib/dashboard/actions.ts:17-57`, `lib/finance/invoice-payment-link-actions.ts:62-82`.

---

## Data Model

### Existing Authoritative Sources

```text
inquiries
  -> events
  -> quotes

events
  -> ledger_entries
  -> expenses
  -> menu_cost_summary (validation only, not booked tax COGS)

sales
  -> sale_items
  -> commerce_payments
  -> commerce_refunds
  -> settlement_records
  -> daily_tax_summary

expenses
  -> expense_tax_categories

payroll_records
contractor_payments
mileage_logs
owner_draws (new)
```

Current anchors for the existing chain:

- `events`, `quotes`, `ledger_entries`, `expenses`: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:104-445`
- `menus`, `recipes`, `ingredients`: `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:83-345`
- `sales`, `sale_items`, `commerce_payments`, `commerce_refunds`: `database/migrations/20260328000001_commerce_engine_foundation.sql:126-297`
- `daily_reconciliation_reports`, `settlement_records`, `daily_tax_summary`: `database/migrations/20260328000003_commerce_reconciliation.sql:12-125`
- `event_sales_tax`, `sales_tax_remittances`: `database/migrations/20260320000009_sales_tax.sql:27-65`
- `payroll_records`: `database/migrations/20260320000010_payroll_system.sql:46-81`
- `contractor_payments`: `database/migrations/20260312000001_financial_infrastructure.sql:91-105`
- `expense_tax_categories`: `database/migrations/20260401000013_expense_tax_categories.sql:9-32`

### Canonical Accounting Rules

- **Accounting method:** cash basis for tax export. Use one canonical accounting date per source row:
  - ledger revenue/refunds/tips: `COALESCE(received_at, created_at)`
  - expenses: `expense_date`
  - commerce payments: `COALESCE(settled_at, captured_at, created_at)`
  - commerce refunds: `COALESCE(processed_at, created_at)`
  - payroll: `pay_date`
  - contractor payments: `payment_date`
  - mileage: `log_date`
  - owner draws: `draw_date`
- **Revenue:** service revenue, deposits, installments, final payments, add-ons, POS sales, and service charges count as revenue. Tips remain separate and are not merged into service revenue. Current anchors showing current mixed behavior: `lib/ledger/compute.ts:164-175`, `lib/tax/actions.ts:226-247`, `lib/finance/tax-prep-actions.ts:367-408`, `app/(chef)/finance/export/route.ts:15-40`.
- **Refunds:** export as separate negative rows tied to the original payment source where possible, never as silent reductions of quoted price. Current anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:359-374`, `lib/commerce/refund-actions.ts:29-170`.
- **COGS:** event-side COGS comes from actual business expense rows in categories `groceries`, `alcohol`, and `specialty_items`; POS-side COGS comes from `sale_items.unit_cost_cents * quantity`. Existing menu and recipe costing is validation-only and should block export when it proves an event should have COGS but no realized COGS rows were captured. Current anchors: `lib/expenses/actions.ts:342-387`, `database/migrations/20260328000001_commerce_engine_foundation.sql:190-202`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:192-345`.
- **Tax classification:** `expense_tax_categories` becomes the one authoritative tax-line mapping per expense row per tax year. Deterministic categories are auto-created and kept in sync; ambiguous categories such as `equipment` and `other` require explicit mapping before export generation succeeds. Current anchors: `database/migrations/20260401000013_expense_tax_categories.sql:9-32`, `lib/finance/tax-prep-actions.ts:138-181`.
- **Sales tax:** collected sales tax is liability-only and must never be counted as revenue. Current anchors: `database/migrations/20260320000009_sales_tax.sql:27-49`, `database/migrations/20260328000003_commerce_reconciliation.sql:94-125`.
- **Owner draws:** owner draws are detail-only equity movements, excluded from revenue, expense, COGS, and net profit. No existing model supports this today. Current anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:76-87`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:339-344`.

### Export Package Entities

The canonical package has two data grains:

1. `schedule_c_summary.csv`
   One row per tax year with final totals for filing.

2. `accounting_detail.csv`
   One row per source transaction with enough fields to trace any summary number back to a source table row.

Every detail row must include:

- source table and source id
- accounting date
- source/channel
- client/event/invoice/location context when available
- gross, fee, refund, net, tip, sales-tax, COGS, and expense amounts in cents
- tax classification when the row is deductible
- receipt flag for expense rows
- owner-draw indicator for equity rows

---

## Server Actions

| Action                                   | Auth            | Input                                                                                                          | Output                                                                           | Side Effects                                                                                                     |
| ---------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `buildCpaExportDataset(year: number)`    | `requireChef()` | `year: number`                                                                                                 | `{ readiness, summaryRows, detailRows, manifest }`                               | None. Pure read + validation.                                                                                    |
| `generateCpaExportPackage(year: number)` | `requireChef()` | `year: number`                                                                                                 | `{ filename: string, bytes: Uint8Array, checksum: string, exportRunId: string }` | Creates or confirms tax-year lock, writes `tax_export_runs`, revalidates `/finance/year-end` and `/finance/tax`. |
| `recordOwnerDraw(input)`                 | `requireChef()` | `{ drawDate: string, amountCents: number, paymentMethod: PaymentMethod, description: string, notes?: string }` | `{ success: true, ownerDraw }`                                                   | Inserts `owner_draws`, revalidates ledger and export surfaces.                                                   |
| `getOwnerDraws(year?: number)`           | `requireChef()` | `{ year?: number }`                                                                                            | `OwnerDraw[]`                                                                    | None.                                                                                                            |
| `deleteOwnerDraw(id: string)`            | `requireChef()` | `id: string`                                                                                                   | `{ success: true }`                                                              | Deletes one owner draw and revalidates ledger/export surfaces.                                                   |
| `createExpense(input)`                   | `requireChef()` | Existing `CreateExpenseInput`                                                                                  | Existing result plus `taxMappingStatus` metadata                                 | Upserts authoritative `expense_tax_categories` row for deterministic categories.                                 |
| `updateExpense(id, input)`               | `requireChef()` | Existing `UpdateExpenseInput`                                                                                  | Existing result plus `taxMappingStatus` metadata                                 | Updates or removes authoritative `expense_tax_categories` row for the expense.                                   |
| `deleteExpense(id)`                      | `requireChef()` | `id: string`                                                                                                   | Existing result                                                                  | Removes linked `expense_tax_categories` rows for that expense.                                                   |

### `buildCpaExportDataset(year)`

This action is the new canonical read model. It must query:

- `ledger_entries`
- `expenses`
- `expense_tax_categories`
- `events`
- `quotes` only for reference metadata, never revenue truth
- `sales`
- `sale_items`
- `commerce_payments`
- `commerce_refunds`
- `settlement_records`
- `daily_tax_summary`
- `event_sales_tax`
- `payroll_records`
- `contractor_payments`
- `mileage_logs`
- `owner_draws`

It must return:

- `readiness.blockers[]`
- `readiness.warnings[]`
- `scheduleCSummary`
- `accountingDetailRows`
- `manifest`

It must fail closed. If required rows are missing or unreconciled, it returns blockers instead of an export package.

### `generateCpaExportPackage(year)`

This action must:

1. Call `buildCpaExportDataset(year)`.
2. Reject the export when `readiness.blockers.length > 0`.
3. Create or reuse the tax-year lock for a past year.
4. Persist a `tax_export_runs` snapshot with checksum, schema version, summary JSON, and detail row count.
5. Package `schedule_c_summary.csv`, `accounting_detail.csv`, and `manifest.json` into one download.

Use a small zip dependency such as `fflate` if no existing zip writer is present in `package.json`.

### `createExpense`, `updateExpense`, `deleteExpense`

These existing actions remain the only expense-write path. They must also maintain the authoritative tax mapping:

- deterministic categories auto-upsert a linked `expense_tax_categories` row
- ambiguous categories remove any stale auto-map and mark the expense unresolved until the user supplies an explicit mapping
- delete removes the linked authoritative mapping

Do not keep the current model where `expense_tax_categories` and raw expense rows are both aggregated independently.

---

## UI / Component Spec

### Page Layout

- **`/finance/year-end`:** keep the existing summary page shell, but replace the current "ready for your accountant" claim with a readiness card above the summary. The page shows:
  - current-year readiness status
  - blocking issues with direct links to the fixing surfaces
  - last export run metadata if one exists
  - one primary button: `Download CPA Export`
- **`/finance/tax`:** replace the current JSON-export behavior with the same readiness summary and the same download action used by Year-End. Keep mileage logging and quarterly estimate cards, but do not let them define a competing export path. Current anchors: `app/(chef)/finance/tax/page.tsx:17-41`, `app/(chef)/finance/tax/tax-center-client.tsx:97-113`.
- **`/finance/reporting`:** rename the current top-right export CTA to `Download CPA Export` and route it to the year-end export route. Current anchor: `app/(chef)/finance/reporting/page.tsx:96-101`.
- **`/finance/export`:** stop returning a ledger-only CSV for a link that implies full finance export. The route should stream the canonical package or redirect to the year-end export route. Current anchor: `app/(chef)/finance/export/route.ts:15-59`.
- **`/finance/ledger/owner-draws`:** minimal new page with one inline form and a table of recorded draws. Link it from `/finance/ledger`. Current ledger anchors: `app/(chef)/finance/ledger/page.tsx:11-24`.

### States

- **Loading:** show current route shell plus a neutral loading card. Never synthesize zero totals.
- **Empty:** if a year has no data, show a factual empty state: no export yet because there is no financial activity in that tax year.
- **Error:** show a blocking error card with the failing source group. Do not catch and replace with empty arrays or zero objects on CPA-facing surfaces.
- **Populated:** show readiness, lock/version state, and the download button only when blockers are clear.

### Interactions

- Clicking `Download CPA Export` calls the export route and downloads one package.
- If blockers exist, clicking the button does nothing and the page scrolls to the blocker list.
- Blocker rows link to the exact repair surface:
  - unresolved tax category -> `/expenses`
  - missing owner draws -> `/finance/ledger/owner-draws`
  - payroll gap -> `/finance/payroll`
  - contractor gap -> `/finance/contractors`
  - sales-tax gap -> `/finance/sales-tax`
- Recording an owner draw revalidates Year-End, Tax Center, and Ledger immediately.

---

## Edge Cases and Error Handling

| Scenario                                                             | Correct Behavior                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Event has multiple payments and multiple expenses                    | `event_financial_summary` returns one correct set of totals with no multiplication.                              |
| Tip exists only in `ledger_entries`                                  | Tip is included in detail and summary even when `events.tip_amount_cents` is `0` or `NULL`.                      |
| Refund is processed through commerce                                 | Refund row appears as a negative revenue row tied to `commerce_refunds`, not hidden inside quoted-price math.    |
| Expense has `category = equipment` with no explicit tax mapping      | Export is blocked and names the unresolved expense id and description.                                           |
| Expense has a manual `expense_tax_categories` row                    | That mapping is authoritative and the raw expense is not auto-counted a second time.                             |
| Event has linked menu cost but zero realized ingredient expense rows | Export is blocked with a COGS-capture issue for that event.                                                      |
| Sales tax exists                                                     | It is exported as liability-only detail and summary data, never as revenue.                                      |
| Commerce settlement record has fees                                  | Fees reduce net and appear in detail, using proportional allocation across settled payments in the payout batch. |
| Payroll tables fail to load                                          | Year-End and Tax Center show a blocking error, not a silent zero.                                                |
| Owner draw exists                                                    | It appears in `accounting_detail.csv` with `row_type = owner_draw` and is excluded from Schedule C totals.       |
| Export generated for a locked past year                              | Create a new `tax_export_runs` version and keep prior runs intact.                                               |
| Current year still has open blockers                                 | No export package is generated. The page stays interactive and lists blockers.                                   |

---

## Verification Steps

1. Sign in with the demo chef account and open `/finance/year-end?year=2026`.
2. Verify the page does not claim accountant-readiness until the new readiness check passes.
3. Download the CPA export package for 2026.
4. Open `schedule_c_summary.csv` and verify the summary matches the planner audit baseline for the seeded demo tenant:
   - service revenue: `1117500`
   - tips: `70000`
   - business expenses: `274000`
   - net profit including tips: `913500`
5. Open `accounting_detail.csv` and verify there are no duplicate `(source_table, source_id, row_type)` rows.
6. Verify `Winter Dinner Party` detail totals reconcile to `240000` paid, `40000` tips, and `60500` business expenses, not the doubled values produced by the old view.
7. Verify `Q4 Team Celebration` detail totals reconcile to `450000` paid and `103000` business expenses.
8. Add one `equipment` expense with no explicit tax mapping and re-run the export. Verify the export is blocked and the blocker points to the unresolved expense.
9. Add one owner draw and re-run the export. Verify the owner draw appears in detail but does not change Schedule C totals.
10. Run a smoke test on current consumers of `event_financial_summary`:
    - `/finance/invoices/sent`
    - dashboard outstanding payments
    - client portal pending payments
11. Verify a second export run for the same past year increments `export_number` and preserves the prior run.

---

## Out of Scope

- Not replacing ChefFlow's invoice model with a new `invoices` table. Current invoice metadata remains on `events`. Current anchors: `lib/events/invoice-actions.ts:3-7`, `app/api/v2/invoices/route.ts:1-6`.
- Not redesigning the finance information architecture or creating a full general ledger.
- Not implementing new third-party POS, payroll-provider, or tax-service integrations in this spec. This spec only normalizes already-ingested tables.
- Not converting ChefFlow to accrual accounting. This spec is cash-basis only.
- Not rebuilding non-CPA operational exports that do not claim tax-readiness, except where they currently read broken finance views or stale schema.

---

## Notes for Builder Agent

- Treat this as an audit repair pass, not a greenfield finance redesign. Reuse current tables and flows unless the spec names a control or data structure the repo truly does not have.
- The biggest regression risk is `event_financial_summary`. Keep the output column names stable and smoke-test every current consumer that reads it. Current anchors: `lib/client-portal/actions.ts:251-269`, `lib/dashboard/actions.ts:17-57`, `lib/finance/invoice-payment-link-actions.ts:47-82`.
- Do not use `quoted_price_cents`, event status, or completed-event counts as the source of revenue truth in any CPA-facing surface. Current anti-pattern anchors: `app/(chef)/finance/reporting/profit-by-event/page.tsx:36-48`, `app/(chef)/finance/payouts/reconciliation/page.tsx:53-63`, `lib/finance/tax-package.ts:63-97`.
- Do not keep multiple accountant export paths. After this work, `/finance/year-end`, `/finance/tax`, and `/finance/export` must all hit the same canonical export builder.
- Keep existing operational surfaces honest. If a page still loads a fallback value, it must be clearly labeled as unavailable, not valid zero data. Current anti-pattern anchors: `app/(chef)/finance/sales-tax/page.tsx:19-32`, `app/(chef)/finance/payroll/page.tsx:20-23`, `app/(chef)/finance/contractors/page.tsx:15-23`, `app/(chef)/finance/reporting/profit-loss/page.tsx:15-38`.
- Use `settlement_records` for payout fee totals instead of adding duplicate fee columns to `commerce_payments`. Current anchor: `database/migrations/20260328000003_commerce_reconciliation.sql:57-90`.
- Use `sale_items.unit_cost_cents` for POS-side COGS. Current anchor: `database/migrations/20260328000001_commerce_engine_foundation.sql:190-202`.

---

## Spec Validation

### 1. What exists today that this touches?

- Finance route inventory and current export claims exist on the finance hub and reporting pages. Current anchors: `docs/app-complete-audit.md:662-719`, `app/(chef)/finance/page.tsx:67-170`, `app/(chef)/finance/reporting/page.tsx:13-101`.
- CPA-facing pages already exist at Year-End and Tax Center. Current anchors: `app/(chef)/finance/year-end/page.tsx:35-108`, `app/(chef)/finance/year-end/year-end-client.tsx:39-111`, `app/(chef)/finance/tax/page.tsx:12-41`, `app/(chef)/finance/tax/tax-center-client.tsx:97-113`, `app/(chef)/finance/tax/year-end/page.tsx:20-86`.
- Current export and reporting logic lives in `lib/exports/actions.ts`, `app/(chef)/finance/export/route.ts`, `lib/finance/export-actions.ts`, `lib/tax/actions.ts`, `lib/finance/tax-package.ts`, `lib/finance/tax-prep-actions.ts`, and `lib/ledger/compute.ts`. Current anchors: `lib/exports/actions.ts:23-426`, `app/(chef)/finance/export/route.ts:9-59`, `lib/finance/export-actions.ts:18-185`, `lib/tax/actions.ts:145-298`, `lib/finance/tax-package.ts:52-150`, `lib/finance/tax-prep-actions.ts:124-427`, `lib/ledger/compute.ts:11-209`.
- Current schemas involved are `events`, `quotes`, `ledger_entries`, `expenses`, `expense_tax_categories`, `sales`, `sale_items`, `commerce_payments`, `commerce_refunds`, `settlement_records`, `daily_tax_summary`, `event_sales_tax`, `payroll_records`, `contractor_payments`, and `mileage_logs`. Current anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:104-445`, `database/migrations/20260401000013_expense_tax_categories.sql:9-32`, `database/migrations/20260328000001_commerce_engine_foundation.sql:126-297`, `database/migrations/20260328000003_commerce_reconciliation.sql:12-125`, `database/migrations/20260320000009_sales_tax.sql:27-65`, `database/migrations/20260320000010_payroll_system.sql:46-81`, `database/migrations/20260312000001_financial_infrastructure.sql:91-105`, `database/migrations/20260303000009_tax_workflow.sql:10-41`.

### 2. What exactly changes?

- Add one new migration that:
  - corrects `event_financial_summary`
  - extends `expense_tax_categories`
  - adds `accounting_period_locks`, `tax_export_runs`, and `owner_draws`
  - re-enables RLS on finance tables.
- Add one canonical export builder and one download route.
- Repoint Year-End, Tax Center, and the finance export link to that canonical builder.
- Remove duplicate/stale tax-export logic from `lib/finance/tax-package.ts` and the current JSON accountant export path in `lib/tax/actions.ts`.
- Update existing expense actions so authoritative tax-line mappings are maintained at write time.

Current anchors proving those seams exist today: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003-1029`, `database/migrations/20260401000013_expense_tax_categories.sql:9-32`, `lib/tax/actions.ts:219-298`, `lib/finance/tax-package.ts:52-150`, `app/(chef)/finance/export/route.ts:9-59`, `app/(chef)/finance/year-end/year-end-client.tsx:39-111`, `app/(chef)/finance/tax/tax-center-client.tsx:97-113`.

### 3. What assumptions are you making?

- **Verified:** the product currently has no trustworthy single CPA export path. The reporting CTA hits a ledger-only route while other pages generate different accountant outputs. Anchors: `app/(chef)/finance/reporting/page.tsx:96-101`, `app/(chef)/finance/export/route.ts:15-59`, `app/(chef)/finance/year-end/year-end-client.tsx:53-95`, `app/(chef)/finance/tax/tax-center-client.tsx:97-113`.
- **Verified:** current expense tax mapping can double count. Anchors: `lib/finance/tax-prep-actions.ts:138-181`.
- **Verified:** the current Schedule C value set is incomplete for the live expense model. Anchors: `database/migrations/20260401000013_expense_tax_categories.sql:14-18`, `lib/finance/tax-prep-constants.ts:9-69`, `lib/constants/expense-categories.ts:5-117`.
- **Verified:** owner draws are not modeled in the current finance schema or ledger contract. Anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:76-87`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:339-344`, `app/(chef)/finance/ledger/page.tsx:11-24`.
- **Verified:** settlement fee totals exist at payout level, so we can allocate or surface fees without adding new payment columns. Anchors: `database/migrations/20260328000003_commerce_reconciliation.sql:57-90`.
- **Verified:** POS-side unit cost already exists, so continuous-ops COGS can use existing data. Anchor: `database/migrations/20260328000001_commerce_engine_foundation.sql:190-202`.
- **Unverified at runtime:** how often real tenants will need split tax-line mapping from one raw expense into multiple deductible treatments. This spec intentionally chooses one authoritative mapping row per expense per year to stay minimal. If split treatment becomes a real operator need, that is a follow-up spec, not part of this one.

### 4. Where will this most likely break?

- **`event_financial_summary` consumers:** dashboard outstanding balances, client portal pending payments, invoice payment status summaries, and any other page that trusts the view. Anchors: `lib/dashboard/actions.ts:17-57`, `lib/client-portal/actions.ts:251-269`, `lib/finance/invoice-payment-link-actions.ts:47-82`.
- **Duplicate tax logic that will drift unless deleted or repointed:** `lib/tax/actions.ts`, `lib/finance/tax-package.ts`, and `lib/finance/tax-prep-actions.ts` currently compute overlapping totals from different rules. Anchors: `lib/tax/actions.ts:145-298`, `lib/finance/tax-package.ts:52-150`, `lib/finance/tax-prep-actions.ts:359-427`.
- **Pages that still present quoted-price or `created_at` totals as accounting truth:** `profit-by-event`, `reconciliation`, `revenue-by-month`, and `tax-summary`. Anchors: `app/(chef)/finance/reporting/profit-by-event/page.tsx:36-48`, `app/(chef)/finance/payouts/reconciliation/page.tsx:53-63`, `app/(chef)/finance/reporting/revenue-by-month/page.tsx:35-44`, `app/(chef)/finance/reporting/tax-summary/page.tsx:27-45`.

### 5. What is underspecified?

- Fee allocation from `settlement_records` to individual `commerce_payments` would be guesswork unless explicitly defined. This spec defines proportional allocation across `payment_ids` in a payout batch and falls back to payout-level fee rows if payment ids are missing.
- COGS would be guesswork unless we say whether projected menu cost or actual spend wins. This spec explicitly uses actual expense rows and POS item cost snapshots for booked COGS, and uses `menu_cost_summary` only as a blocking validation signal.
- Ambiguous expense categories would still require builder guessing unless we define deterministic vs manual behavior. This spec explicitly auto-maps deterministic categories and blocks export on unresolved ambiguous ones.

Current anchors for the current underspecification: `database/migrations/20260328000003_commerce_reconciliation.sql:72-80`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:192-345`, `lib/finance/tax-prep-actions.ts:138-181`, `lib/constants/expense-categories.ts:5-117`.

### 6. What dependencies or prerequisites exist?

- The corrected view depends on the existing finance tables staying named as they are.
- The canonical export depends on the existing demo data or an equivalent seed set that includes at least the audited event, expense, and ledger rows.
- If the builder ships one downloadable package with multiple files instead of separate CSV responses, they need either a small zip-packaging dependency or an equivalent server-side archive writer. The current dependency list includes finance, PDF, and spreadsheet helpers, but no dedicated zip library.

Current anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:339-445`, `database/migrations/20260328000001_commerce_engine_foundation.sql:126-297`, `database/migrations/20260328000003_commerce_reconciliation.sql:57-125`, `database/migrations/20260320000010_payroll_system.sql:46-81`, `package.json:214-300`, `docs/build-state.md:15-20`.

### 7. What existing logic could this conflict with?

- Existing dashboard, client portal, invoice, and analytics reads against `event_financial_summary`. Anchors: `lib/dashboard/actions.ts:17-57`, `lib/client-portal/actions.ts:251-269`, `lib/finance/invoice-payment-link-actions.ts:47-82`.
- Existing export/report helpers that reuse `getLedgerEntries()` and `getEvents()` but still treat `quoted_price_cents` as revenue. Anchors: `lib/finance/export-actions.ts:105-158`, `app/(chef)/finance/reporting/profit-by-event/page.tsx:36-48`.
- Existing tax pages that currently promise reference-only outputs while still displaying hard numbers. Anchors: `app/(chef)/finance/tax/page.tsx:17-41`, `app/(chef)/finance/year-end/page.tsx:97-100`, `app/(chef)/finance/payroll/page.tsx:72-76`.

### 8. What is the end-to-end data flow?

**CPA export generation**

1. User opens `/finance/year-end` or `/finance/tax`.
2. Page calls `buildCpaExportDataset(year)` server-side.
3. Server action reads raw rows from ledger, expenses, expense-tax mappings, commerce, sales tax, payroll, contractor, mileage, owner draws, and events.
4. Server action validates reconciliation and returns blockers/warnings plus summary/detail rows.
5. If the user clicks `Download CPA Export` and blockers are clear, `generateCpaExportPackage(year)` writes `tax_export_runs`, creates or confirms the year lock, and returns the package bytes.
6. The route streams the package back to the browser.
7. The page revalidates and shows the latest export run metadata.

**Expense write path**

1. User creates or edits an expense via existing expense UI.
2. `createExpense()` or `updateExpense()` writes the `expenses` row.
3. The same action upserts or removes the authoritative `expense_tax_categories` row for that expense.
4. Export readiness pages revalidate.

**Owner draw write path**

1. User records an owner draw in `/finance/ledger/owner-draws`.
2. `recordOwnerDraw()` writes `owner_draws`.
3. Year-End, Tax Center, and Ledger revalidate.

Current anchors for the existing comparable seams: `lib/expenses/actions.ts:75-135`, `lib/expenses/actions.ts:210-239`, `app/(chef)/finance/year-end/page.tsx:49-58`, `app/(chef)/finance/tax/page.tsx:17-37`, `app/(chef)/finance/export/route.ts:9-59`.

### 9. What is the correct implementation order?

1. Add the migration for locks, export runs, owner draws, expense-tax constraints, and the corrected view.
2. Build `lib/finance/cpa-export-actions.ts` and prove it reconciles against the audited seed data before touching the UI.
3. Repoint Year-End, Tax Center, and `/finance/export` to the canonical export builder.
4. Update `createExpense()`, `updateExpense()`, and `deleteExpense()` to maintain authoritative tax mappings.
5. Remove or repoint duplicate tax/export paths (`lib/tax/actions.ts`, `lib/finance/tax-package.ts`, stale finance export helpers).
6. Add the owner-draw page and ledger link.
7. Smoke-test current `event_financial_summary` consumers.

Current anchors: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003-1029`, `lib/expenses/actions.ts:75-177`, `lib/tax/actions.ts:219-298`, `lib/finance/tax-package.ts:52-150`, `app/(chef)/finance/export/route.ts:9-59`, `app/(chef)/finance/year-end/page.tsx:49-58`, `app/(chef)/finance/tax/page.tsx:17-37`, `lib/dashboard/actions.ts:17-57`, `lib/client-portal/actions.ts:251-269`, `lib/finance/invoice-payment-link-actions.ts:47-82`.

### 10. What are the exact success criteria?

- One click from `/finance/year-end` downloads one package that includes `schedule_c_summary.csv`, `accounting_detail.csv`, and `manifest.json`.
- The package reconciles exactly to the audited seed totals for 2026:
  - service revenue `1117500`
  - tips `70000`
  - business expenses `274000`
  - net profit including tips `913500`
- No current CPA-facing surface computes revenue from `quoted_price_cents`.
- No current CPA-facing surface silently replaces failed finance fetches with zero totals.
- `expense_tax_categories` no longer double counts raw expenses.
- Finance RLS is enabled for every finance table used by the export.
- Owner draws can be recorded in-product and never appear in revenue or expense totals.

Current anchors motivating these criteria: `app/(chef)/finance/year-end/year-end-client.tsx:53-95`, `app/(chef)/finance/export/route.ts:15-59`, `lib/finance/tax-prep-actions.ts:124-181`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:883-980`, `database/migrations/20260401000098_disable_rls_all_tables.sql:181-201`, `database/migrations/20260401000098_disable_rls_all_tables.sql:289-310`, `database/migrations/20260401000098_disable_rls_all_tables.sql:409-471`, `database/migrations/20260401000098_disable_rls_all_tables.sql:565-633`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:76-87`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:339-344`.

### 11. What are the non-negotiable constraints?

- `requireChef()` remains the auth gate for all write and export actions. Current anchor: `lib/auth/get-user.ts:122-143`.
- Every finance query must remain tenant-scoped.
- Sales tax is liability-only, not revenue.
- Tips stay separate from service revenue.
- Cash-basis date rules must be consistent across the export.
- Owner draws remain outside P&L.
- Export generation fails closed when blockers exist.

Current anchors: `lib/events/actions.ts:249-280`, `lib/expenses/actions.ts:140-177`, `lib/ledger/actions.ts:19-57`, `database/migrations/20260320000009_sales_tax.sql:27-65`.

### 12. What should NOT be touched?

- Do not replace the event invoice model with a new invoice table in this spec. Current anchors: `lib/events/invoice-actions.ts:3-7`, `app/api/v2/invoices/route.ts:1-6`.
- Do not redesign inquiry, event, menu, or recipe creation. Those systems are only read here for metadata and COGS validation. Current anchors: `lib/events/actions.ts:249-280`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:83-345`.
- Do not build new external POS or payroll integrations. Normalize the existing tables only.
- Do not convert operational exports into a different accounting model unless they currently claim CPA readiness.

### 13. Is this the simplest complete version?

Yes. It fixes the existing broken accounting seams using current tables wherever possible:

- one corrected finance view instead of a new ledger system
- one canonical export builder instead of multiple parallel report engines
- existing `expense_tax_categories` reused as the authoritative mapping layer
- existing commerce, sales tax, payroll, contractor, and mileage tables reused instead of new ingestion models
- only three new tables, all for missing accounting controls the current repo does not already provide

Current anchors: `database/migrations/20260401000013_expense_tax_categories.sql:9-32`, `database/migrations/20260328000001_commerce_engine_foundation.sql:126-297`, `database/migrations/20260328000003_commerce_reconciliation.sql:12-125`, `database/migrations/20260320000009_sales_tax.sql:27-65`, `database/migrations/20260320000010_payroll_system.sql:46-81`, `database/migrations/20260312000001_financial_infrastructure.sql:91-105`, `database/migrations/20260303000009_tax_workflow.sql:10-41`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:76-87`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:339-445`.

### 14. If implemented exactly as written, what would still be wrong?

- ChefFlow would still be a cash-basis export system, not an accrual accounting system.
- It would still rely on users to enter missing real-world records. If a chef never recorded an expense, owner draw, refund, or payroll run, no export can reconstruct that from code alone.
- Equipment depreciation still requires an explicit mapped amount for the tax year. The spec solves this by blocking export on unresolved ambiguous rows; it does not invent depreciation schedules automatically.

Current anchors: `app/(chef)/finance/year-end/page.tsx:97-100`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:392-445`, `database/migrations/20260320000010_payroll_system.sql:46-81`, `database/migrations/20260328000001_commerce_engine_foundation.sql:247-297`, `lib/constants/expense-categories.ts:5-117`, `lib/finance/tax-prep-actions.ts:138-181`.

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the verified repo state. The current broken paths are identified, the replacement surfaces are explicit, and the risky dependencies are named with current anchors.

**If uncertain: where specifically, and what would resolve it?**

The only remaining uncertainty is operational, not architectural: if historical tenant data is incomplete, the canonical export will correctly block and surface what is missing. That is expected behavior, not a spec gap. Current anchors: `app/(chef)/finance/year-end/page.tsx:97-100`, `lib/expenses/actions.ts:75-177`, `database/migrations/20260320000010_payroll_system.sql:46-81`.

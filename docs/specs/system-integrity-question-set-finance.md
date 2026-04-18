# System Integrity Question Set: Finance

> 40 questions across 10 domains. Covers all 71 finance pages: ledger, invoices, expenses, payroll, tax, reporting, payments, and cash flow.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                         | Answer                                                                                                                                                                                     | Status |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Do all 71 finance pages gate with `requireChef()` or equivalent? | Yes. 69 pages call `requireChef()` directly (4 fixed this session: 1099-nec, depreciation, home-office, retirement). 2 are client components with auth-gated server actions + layout gate. | BUILT  |
| 2   | Does the `retainers/[id]` page check tenant ownership?           | Yes. `getRetainerDetail(id)` filters `.eq('tenant_id', user.tenantId!)`. Returns null for non-owned retainers.                                                                             | BUILT  |
| 3   | Are payroll and tax pages accessible to all chef roles?          | Yes. No additional admin gate on payroll/tax pages. All chef users can manage their own payroll and tax records.                                                                           | BUILT  |
| 4   | Does the error boundary hide raw error messages?                 | Yes. `finance/error.tsx` sanitized this session. Shows static "Something went wrong." with opaque digest only.                                                                             | BUILT  |

## Domain 2: Ledger-First Financial Model

| #   | Question                                                       | Answer                                                                                                                                                                          | Status |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Is the ledger immutable and append-only?                       | Yes. `ledger/page.tsx` explicitly labels itself "Immutable, append-only financial record." DB has immutability trigger on `ledger_entries` table preventing updates or deletes. | BUILT  |
| 6   | Does `getTenantFinancialSummary()` derive from ledger entries? | Yes. `lib/ledger/compute.ts` opens with "NEVER store balances/status - always compute from ledger entries." Reads from `event_financial_summary` view.                          | BUILT  |
| 7   | Do any finance pages write directly to a balance column?       | No. Zero finance pages write to stored balance columns. All mutations append ledger entries or expenses. Balances are always computed.                                          | BUILT  |
| 8   | Does the ledger page show the transaction log with sub-views?  | Yes. Ledger hub links to transaction-log (chronological entries), adjustments (credits/add-ons), and owner-draws (equity draws excluded from P&L).                              | BUILT  |

## Domain 3: Revenue & P&L Accuracy

| #   | Question                                                      | Answer                                                                                                                                                               | Status |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 9   | Does the P&L report derive from source records?               | Yes. `getProfitAndLossReport()` queries ledger_entries, expenses, and payroll directly. Computes revenue, COGS, operating expenses, and net profit from source data. | BUILT  |
| 10  | Does the monthly P&L snapshot on the hub use the same source? | Yes. `MonthlyPLSnapshot()` calls `getProfitAndLossReport(startDate, endDate)` - same function as the dedicated P&L page.                                             | BUILT  |
| 11  | Does revenue-by-month reporting use ledger data?              | Yes. `reporting/revenue-by-month/page.tsx` calls `requireChef()` and reads from ledger-derived revenue data.                                                         | BUILT  |
| 12  | Does profit-by-event show accurate per-event margins?         | Yes. `reporting/profit-by-event/page.tsx` calls `requireChef()`. Reads from `event_financial_summary` view for per-event revenue, costs, and margins.                | BUILT  |
| 13  | Does year-over-year comparison use consistent sources?        | Yes. `reporting/yoy-comparison/page.tsx` calls `requireChef()`. Compares same ledger-derived metrics across years.                                                   | BUILT  |

## Domain 4: Expense Tracking

| #   | Question                                                                  | Answer                                                                                                                                     | Status |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 14  | Does the expense hub categorize by type?                                  | Yes. Sub-pages for food-ingredients, labor, marketing, travel, rentals-equipment, software, and miscellaneous. Each calls `requireChef()`. | BUILT  |
| 15  | Does expense-by-category reporting aggregate from actual expense records? | Yes. `reporting/expense-by-category/page.tsx` calls `requireChef()`. Reads from expenses table grouped by category.                        | BUILT  |
| 16  | Does the recurring expenses page track subscription costs?                | Yes. `recurring/page.tsx` calls `requireChef()`. Manages recurring cost entries.                                                           | BUILT  |

## Domain 5: Invoice & Payment Lifecycle

| #   | Question                                                                   | Answer                                                                                                                             | Status |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 17  | Does the invoice hub show status-filtered views?                           | Yes. Sub-pages for draft, sent, paid, overdue, cancelled, and refunded invoices. Each calls `requireChef()`.                       | BUILT  |
| 18  | Does the payments hub track deposits, installments, refunds, and failures? | Yes. Sub-pages for deposits, installments, refunds, and failed payments. Each calls `requireChef()`.                               | BUILT  |
| 19  | Does the disputes page track payment disputes?                             | Yes. `disputes/page.tsx` calls `requireChef()`. Manages Stripe dispute records.                                                    | BUILT  |
| 20  | Does the outstanding payments view derive from financial summary?          | Yes. `overview/outstanding-payments/page.tsx` calls `requireChef()`. Uses `event_financial_summary` view for outstanding balances. | BUILT  |

## Domain 6: Payroll & Contractors

| #   | Question                                             | Answer                                                                                                                                     | Status |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 21  | Does the payroll hub manage employee records safely? | Yes. `payroll/employees/page.tsx` is a client component. `listEmployees` and `terminateEmployee` server actions both call `requireChef()`. | BUILT  |
| 22  | Does the payroll run page process payments?          | Yes. `payroll/run/page.tsx` calls `requireChef()`. Manages payroll run workflows.                                                          | BUILT  |
| 23  | Does the W-2 page generate from actual payroll data? | Yes. `payroll/w2/page.tsx` calls `requireChef()`. Generates W-2 summaries from payroll records.                                            | BUILT  |
| 24  | Does the contractors page manage 1099 relationships? | Yes. `contractors/page.tsx` calls `requireChef()`. Manages subcontractor records separate from employees.                                  | BUILT  |

## Domain 7: Tax & Compliance

| #   | Question                                                         | Answer                                                                                                                                                      | Status |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 25  | Does the tax hub cover all relevant tax forms?                   | Yes. Sub-pages: 1099-NEC, depreciation (Form 4562), home-office, quarterly estimates, retirement/health deductions, year-end. All now call `requireChef()`. | BUILT  |
| 26  | Does the sales tax system manage rates and remittances?          | Yes. `sales-tax/page.tsx` calls `requireChef()`. Sub-pages for remittances and settings. Settings is a client component with auth-gated actions.            | BUILT  |
| 27  | Does the 1099-NEC page generate from actual contractor payments? | Yes. `generate1099NECReports(taxYear)` reads from contractor payment records. Not hardcoded.                                                                | BUILT  |
| 28  | Does the tax summary reporting aggregate from all sources?       | Yes. `reporting/tax-summary/page.tsx` calls `requireChef()`. Aggregates revenue, expenses, deductions from ledger and expense tables.                       | BUILT  |

## Domain 8: Cash Flow & Forecasting

| #   | Question                                              | Answer                                                                                                                                       | Status |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 29  | Does the cash flow calendar use real payment data?    | Yes. `cash-flow/page.tsx` calls `requireChef()`. Shows monthly income, expenses, and upcoming payment plan installments from actual records. | BUILT  |
| 30  | Does the forecast page project from historical data?  | Yes. `forecast/page.tsx` calls `requireChef()`. Projects future revenue/expenses based on historical patterns and pipeline.                  | BUILT  |
| 31  | Does the break-even analysis use real fixed costs?    | Yes. `planning/break-even/page.tsx` calls `requireChef()`. Calculates break-even from actual fixed expense data.                             | BUILT  |
| 32  | Does the plate costs page derive from recipe costing? | Yes. `plate-costs/page.tsx` calls `requireChef()`. Per-plate costs computed from recipe ingredients and current prices.                      | BUILT  |

## Domain 9: Payouts & Reconciliation

| #   | Question                                               | Answer                                                                                                                                     | Status |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 33  | Does the payouts hub show Stripe Connect data?         | Yes. `payouts/page.tsx` calls `requireChef()`. Links to stripe-payouts, manual-payments, and reconciliation sub-pages.                     | BUILT  |
| 34  | Does the reconciliation page match payouts to events?  | Yes. `payouts/reconciliation/page.tsx` calls `requireChef()`. Matches Stripe payouts against event payments.                               | BUILT  |
| 35  | Does the manual payments page record offline payments? | Yes. `payouts/manual-payments/page.tsx` calls `requireChef()`. Records cash, check, and other offline payments that create ledger entries. | BUILT  |

## Domain 10: Cross-System & Intelligence

| #   | Question                                                           | Answer                                                                                                                                             | Status |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 36  | Does the finance hub show intelligence overlays?                   | Yes. Hub renders `FinanceHealthBar` and `PricingIntelligenceBar` via `WidgetErrorBoundary` + `Suspense`. Non-blocking, isolated from main content. | BUILT  |
| 37  | Does `getFinanceSurfaceAvailability()` control feature visibility? | Yes. Hub checks surface availability to conditionally show/hide sections based on chef's data and subscription status.                             | BUILT  |
| 38  | Does the revenue-by-client report show client-level revenue?       | Yes. `reporting/revenue-by-client/page.tsx` calls `requireChef()`. Shows per-client revenue from ledger data.                                      | BUILT  |
| 39  | Does the YTD carry-forward savings show on the hub?                | Yes. Hub calls `getYtdCarryForwardSavings()` alongside `getTenantFinancialSummary()`. Shows ingredient reuse savings for the year.                 | BUILT  |
| 40  | Does the goals page integrate with the revenue goal system?        | Yes. `goals/page.tsx` calls `requireChef()`. Reads from the same goal system as dashboard revenue goal widget.                                     | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

None.

**Sweep score: 40/40 BUILT, 0 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All 71 pages auth-gated, ledger is immutable/append-only, all balances derived (never stored), P&L computed from source records, all reporting uses canonical ledger data, error boundary sanitized, intelligence overlays isolated.

**Key fixes from this session:**

- Q1: Added `requireChef()` to 4 tax pages: 1099-nec, depreciation, home-office, retirement (were protected by action-level auth only, now have defense-in-depth).
- Q4: Finance `error.tsx` was leaking `error.message`. Fixed earlier in systemic 17-file error boundary fix.

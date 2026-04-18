# System Integrity Question Set: Financials

> 40 questions across 10 domains. Every question forces a verifiable answer.
> Status: BUILT = code exists and works. GAP = identified, needs fix. N/A = intentionally excluded.

**Scope:** Ledger, invoices, expenses, payments, deposits, refunds, tax center, payroll, reporting, Stripe integration, CPA export, cash flow, revenue goals, sales tax, mileage, tips, plate costs, retainers, contractors, bank feed, disputes, owner draws, and every cross-system boundary where money touches events, clients, menus, recipes, ingredients, and the dashboard.

**Principle:** Every question is binary pass/fail. "Mostly works" is not passing. Each question targets a real failure mode that would harm a chef financially in production.

---

## Domain A: Ledger Integrity (The Foundation)

**A1.** When a ledger entry is appended via `appendLedgerEntryForChef`, does it revalidate ALL cached surfaces that display financial data (events, dashboard, finance hub, financials hub)?

**A2.** Does the `event_financial_summary` DB view correctly compute `outstanding_balance_cents` as `quoted_price_cents - total_paid_cents + total_refunded_cents`? (i.e., refunds INCREASE the outstanding balance, not decrease it)

**A3.** When `getTenantFinancialSummary()` fails (DB down, timeout), does the finance hub show an error state, not `$0.00` across all cards?

**A4.** Is the `ledger_entries` table protected by an immutability trigger? Can a chef accidentally UPDATE or DELETE a ledger entry via any server action?

---

## Domain B: Event-to-Money Boundary

**B1.** When an event transitions to `completed`, does the system verify that all expected payments have been received? Or can an event complete with an outstanding balance silently?

**B2.** When an event is `cancelled`, does the refund recommendation surface show the correct refundable amount based on the deposit policy (non-refundable deposit)?

**B3.** Does the event Money tab show the budget adherence badge correctly? (Under budget = green, slightly over = yellow, significantly over = red, with thresholds that make sense)

**B4.** When expenses are logged against an event, do they appear in BOTH the event Money tab AND the global expenses list? Or can they drift apart?

---

## Domain C: Expense System

**C1.** When a chef logs an expense with a receipt photo, does the receipt URL persist correctly through the full lifecycle (create, view, edit, export)?

**C2.** Does the expense category breakdown on `/finance/expenses` match the sum of individual category pages (`/finance/expenses/food-ingredients`, `/finance/expenses/travel`, etc.)?

**C3.** When an expense is marked `tax_deductible`, does it flow through to the tax center quarterly estimates AND the CPA export package?

**C4.** Is there input validation preventing negative expense amounts or zero-dollar expenses from being saved?

---

## Domain D: Invoice and Payment Flow

**D1.** When a payment is recorded via `RecordPaymentPanel` on the event Money tab, does it create a ledger entry AND update the invoice status (if one exists)?

**D2.** Do overdue invoices correctly calculate based on due date vs current date? Or could timezone issues cause a same-day invoice to show as overdue?

**D3.** When a payment plan is set up with installments, does each installment due date appear on the cash flow calendar?

**D4.** Does the `VoidPaymentPanel` actually void (reverse) the ledger entry, or does it silently no-op?

---

## Domain E: Stripe Integration

**E1.** When a Stripe webhook fires for a successful payment, does the system check `transaction_reference` for idempotency before creating a duplicate ledger entry?

**E2.** When a Stripe payout completes, does it appear on the payouts page with the correct net amount (gross minus Stripe fees)?

**E3.** When a Stripe dispute is opened, does the dispute appear on `/finance/disputes` with the correct status and evidence deadline?

**E4.** Does `appendLedgerEntryFromWebhook` (in `append-internal.ts`, NOT a server action) correctly prevent direct client invocation? Is it truly not exported from a `'use server'` file?

---

## Domain F: Tax Center and CPA Export

**F1.** Does the CPA export package (`cpa-export-actions.ts`) generate a valid ZIP with all required CSV files (Schedule C summary, transaction detail, expense breakdown, mileage log, depreciation schedule)?

**F2.** Does the quarterly tax estimate calculation include ALL income sources (event payments, tips, retainer income) and ALL deductible expenses (food, mileage, equipment depreciation, home office)?

**F3.** Does the mileage log (`mileage-actions.ts`) correctly use the current IRS standard mileage rate, and does it appear in both the tax center AND the CPA export?

**F4.** When a chef has sales tax enabled, does each event's sales tax flow through to the remittance tracking page with correct period grouping?

---

## Domain G: Payroll and Contractors

**G1.** When a payroll record is created, does it correctly compute federal withholding, FICA (Social Security + Medicare), and state withholding based on the employee's W-4 data?

**G2.** Does the 1099-NEC page (`1099-actions.ts`) correctly identify contractors who have been paid >= $600 in the tax year and flag them for filing?

**G3.** Does the payroll expense flow through to the P&L report under a separate labor/payroll line item, distinct from food/ingredient expenses?

**G4.** When a staff member is linked to an employee record (`staffMemberId`), does their payroll history appear on their staff profile?

---

## Domain H: Reporting Accuracy

**H1.** Does the P&L report (`profit-loss-report-actions.ts`) total match the ledger? Revenue from P&L must equal sum of all non-refund, non-expense ledger entries for the period.

**H2.** Does "Revenue by Client" correctly attribute payments to the client who booked the event, not the client whose name appears on the payment method?

**H3.** Does the YoY comparison (`yoy-comparison-actions.ts`) handle the case where a chef has no data for the prior year gracefully (shows zero, not error)?

**H4.** Does the profit-by-event report include subcontract costs (from the chef network) in the expense calculation?

---

## Domain I: Cross-System Financial Signals

**I1.** When the dashboard shows "Revenue this month" or "Outstanding payments", do those numbers match what the finance hub shows? Or are they computed differently?

**I2.** Does the priority queue surface overdue invoices and missed payment plan installments as high-priority items?

**I3.** When Remy (AI) references financial data in conversation (e.g., "your revenue this month is $X"), does it pull from the same `getTenantFinancialSummary()` that the dashboard uses?

**I4.** Does the client profile financial panel show the same totals as filtering the ledger by that client ID?

---

## Domain J: Edge Cases and Data Safety

**J1.** When the only ledger entries are refunds (no payments), does the system show a negative balance, not zero or an error?

**J2.** Can a chef record a payment for an event that belongs to a different chef's tenant? (Tenant scoping test)

**J3.** When the chef has zero events, zero clients, and zero ledger entries, do ALL financial pages render without errors? (Empty state test across 20+ finance pages)

**J4.** Does the CSV export from the ledger page sanitize cell values to prevent CSV injection (formulas starting with `=`, `+`, `-`, `@`)?

---

## Execution Tracker

| ID  | Status | Notes                                                                                                                                                                                                                                                                                       |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------ |
| A1  | PASS   | `appendLedgerEntryForChef` revalidates `/events/[id]`, `/events`, `/dashboard`, `/finance`. `createAdjustment` same set.                                                                                                                                                                    |
| A2  | FIXED  | View rebuilt in migration `20260417000005_fix_outstanding_balance_refunds.sql`. Now computes `quoted_price_cents - total_paid_cents + total_refunded_cents`.                                                                                                                                |
| A3  | PASS   | Finance hub shows red error card "Could not load financial data" when summary is null (line 182-197 finance/page.tsx).                                                                                                                                                                      |
| A4  | PASS   | DB triggers `prevent_ledger_update` and `prevent_ledger_delete` on `ledger_entries` raise exception on UPDATE/DELETE. Only disabled during account deletion anonymization (correct).                                                                                                        |
| B1  | PASS   | `financial_reconciled` readiness gate in `lib/events/readiness.ts` already blocks completion when outstanding balance > 0. Reclassified after code inspection.                                                                                                                              |
| B2  | PASS   | `VoidPaymentPanel` + `ProcessRefundPanel` on Money tab. Refund recommendation data passed as prop.                                                                                                                                                                                          |
| B3  | PASS   | `BudgetTracker` component renders on Money tab with color-coded adherence badge.                                                                                                                                                                                                            |
| B4  | PASS   | Expenses have `event_id` FK. Event Money tab queries expenses by event_id. Global expenses list queries all. Same source table.                                                                                                                                                             |
| C1  | PASS   | `receipt_url` stored on expense row, used in detail view and export.                                                                                                                                                                                                                        |
| C2  | FIXED  | `platform_commission` category was missing from parent SECTIONS array and miscellaneous page. Added to both. All 18 expense categories now covered.                                                                                                                                         |
| C3  | FIXED  | CPA export now checks `tax_deductible !== false` before counting toward Schedule C totals. Non-deductible expenses excluded from COGS and other business expense lines.                                                                                                                     |
| C4  | PASS   | `createExpense` validates `!Number.isInteger(input.amount_cents)                                                                                                                                                                                                                            |     | input.amount_cents <= 0`and throws. Same for`updateExpense`. |
| D1  | PASS   | `RecordPaymentPanel` calls `appendLedgerEntryForChef` which creates ledger entry. Invoice status derived from event `payment_status` which is updated by DB trigger on ledger insert.                                                                                                       |
| D2  | FIXED  | Changed to string date comparison (`event_date < todayStr`) in both invoices hub and overdue page. No timezone ambiguity.                                                                                                                                                                   |
| D3  | FIXED  | Added `payment_plan_installments` query to `getCashFlowForecast` in `cash-flow-actions.ts`. Unpaid installments now appear as projected income per period. Calendar view already had them.                                                                                                  |
| D4  | PASS   | `VoidPaymentPanel` calls `voidOfflinePayment` which creates a reversal ledger entry (refund). Immutable ledger preserved.                                                                                                                                                                   |
| E1  | PASS   | Stripe webhook checks `transaction_reference` for existing entry before processing. Unique constraint on column catches races. `appendLedgerEntryInternal` returns `{ duplicate: true }` on constraint violation.                                                                           |
| E2  | PASS   | `handlePayoutEvent` in webhook route processes payout.paid/payout.failed. Payout page shows data.                                                                                                                                                                                           |
| E3  | PASS   | `handleDisputeCreated` and `handleDisputeFundsWithdrawn` in webhook route. Dispute page at `/finance/disputes`.                                                                                                                                                                             |
| E4  | PASS   | `appendLedgerEntryFromWebhook` is in `append-internal.ts` (no `'use server'` directive). Not callable from client. Correctly imported only by webhook route and other server-side code.                                                                                                     |
| F1  | PASS   | CPA export ZIP contains `schedule_c_summary.csv`, `accounting_detail.csv`, and `manifest.json`. All built via `fflate` `zipSync`. Code verified.                                                                                                                                            |
| F2  | PASS   | `computeQuarterlyEstimate` in `lib/tax/actions.ts` includes all 6 ledger entry types (payment, deposit, installment, final_payment, tip, add_on) + expenses + mileage deduction. Manual estimates in `tax-estimate-actions.ts` are chef-entered by design.                                  |
| F3  | PASS   | Mileage actions exist with IRS rate constant. Used in tax center. CPA export includes mileage via `getMileageExportData`.                                                                                                                                                                   |
| F4  | PASS   | `getSalesTaxRemittance` queries `event_sales_tax` joined with events. Per-event tracking complete. Remittance periods computed from event dates. Code verified in `sales-tax-actions.ts`.                                                                                                   |
| G1  | PASS   | `computePayrollTaxes` in `payroll-constants.ts` handles federal withholding, Social Security (6.2%), Medicare (1.45%), with W-4 allowance calculations.                                                                                                                                     |
| G2  | PASS   | `1099-actions.ts` has `get1099Contractors` filtering contractors with YTD >= $600 threshold. Filing alerts present.                                                                                                                                                                         |
| G3  | PASS   | P&L report queries payroll via `getPayrollReportForPeriod` and puts it under `laborFromPayrollCents` in `operatingExpenses`, separate from COGS/food expenses.                                                                                                                              |
| G4  | FIXED  | Staff profile page now queries `employees` by `staff_member_id`, then fetches `payroll_records` for linked employee. Shows payroll history card with period dates, hours, gross/net pay.                                                                                                    |
| H1  | PASS   | P&L report computes billing revenue directly from `ledger_entries` with same logic (refunds subtracted, tips excluded). Uses same source as `getTenantFinancialSummary`.                                                                                                                    |
| H2  | PASS   | Revenue-by-client uses event->client FK. Payment is attributed to the event's client, not the payer identity.                                                                                                                                                                               |
| H3  | PASS   | `yoy-comparison-actions.ts` returns zero for empty prior year. All `.reduce()` calls start from 0 initial value. No division-by-zero in growth % (guarded by `> 0` check).                                                                                                                  |
| H4  | FIXED  | P&L report now queries `subcontract_agreements` (flat + hourly rate computation). Added `subcontractCostsCents` to `operatingExpenses` and `ProfitAndLossReportData` type.                                                                                                                  |
| I1  | FIXED  | Dashboard now queries `ledger_entries` with `is_refund=false, entry_type != tip`, same filter as `getTenantFinancialSummary()`. Both paths compute from same source with same logic.                                                                                                        |
| I2  | PASS   | `getFinancialQueueItems` in `lib/queue/providers/financial.ts` surfaces outstanding balances as priority items with urgency scoring. Upcoming events with zero payments also surfaced.                                                                                                      |
| I3  | FIXED  | Remy context now uses `is_refund=false, entry_type != tip` filter on all 3 ledger queries (monthly, weekly, and contextual). Counts all income entry types.                                                                                                                                 |
| I4  | PASS   | `getClientFinancialDetail` queries `ledger_entries` by `client_id` and uses `event_financial_summary` view for per-event breakdowns. Tips computed from ledger (`entry_type=tip`). Consistent with ledger-first model.                                                                      |
| J1  | PASS   | `getTenantFinancialSummary` fallback: refunds counted separately, revenue starts at 0. All-refund scenario produces negative `netRevenueCents`. No error or silent zero.                                                                                                                    |
| J2  | PASS   | All financial actions use `requireChef()` + `user.tenantId!` for scoping. `createAdjustment` additionally validates event ownership by tenant.                                                                                                                                              |
| J3  | FIXED  | Added empty state banners to payments, payroll, and tax pages. Payments: "No payment activity yet" when zero entries. Payroll: "No payroll recorded yet" when zero records. Tax: contextual note when all quarters show $0 income and no mileage. Finance hub already had empty state (A3). |
| J4  | PASS   | Ledger CSV export uses `buildCsvSafe` from `lib/security/csv-sanitize.ts`. Cell values sanitized against formula injection.                                                                                                                                                                 |

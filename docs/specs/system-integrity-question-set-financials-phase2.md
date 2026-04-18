# System Integrity Question Set: Financial Cross-Boundary Cohesiveness (Phase 2)

> Phase 1 swept the financial system internally (40 questions, 40 PASS/FIXED).
> Phase 2 sweeps every boundary where financial data touches non-financial systems.
> Every question is binary pass/fail. "Mostly works" is not passing.

**Principle:** Money touches everything. If any boundary is broken, the chef sees inconsistent numbers, makes bad decisions, or loses trust in the system. Every signal that involves dollars must trace back to the same source of truth: the ledger.

---

## Domain K: Food Costing Pipeline (Recipe -> Menu -> Event -> Profitability)

**K1.** When a recipe's ingredient price changes in the price catalog, does the recipe cost view (`recipe_cost_summary`) update? And does that propagated cost appear on the event Money tab's food cost breakdown?

**K2.** Does the event Money tab's "food cost %" use the same `compute_projected_food_cost_cents` DB function that the recipe/menu views use? Or is there a separate computation that could drift?

**K3.** When a purchase order is received (status = 'received', actual_total_cents filled in), does the actual cost flow into the event's realized food cost, or does the event forever show estimated cost?

**K4.** When a chef creates a shopping list from an event menu and then logs expenses for those groceries, is there any linkage between the shopping list items and the expense records? Or are they completely disconnected?

---

## Domain L: Revenue Computation Alignment (The Big One)

**L1.** List every surface that displays "revenue" or a dollar amount derived from income. Do ALL of them source from ledger_entries with the same filter (`is_refund=false, entry_type != tip`)? Surfaces to check: dashboard hero, finance hub, analytics, daily briefing, Remy context, YoY comparison, P&L report, cash flow forecast.

**L2.** Does the analytics page (`app/(chef)/analytics/page.tsx`) use `getTenantFinancialSummary()` or its own computation? If its own, does it match the ledger filter used by the dashboard and finance hub?

**L3.** Does the daily briefing (`lib/briefing/daily-actions.ts`) compute `revenueThisWeekCents` from `ledger_entries` or from `event_financial_summary.total_paid_cents`? If the latter, could it diverge from the ledger-based computation?

**L4.** When the cash flow forecast shows "confirmed income" for a period, does it use event `total_amount_cents` (quoted price) or actual ledger payments received? These are different numbers for partially-paid events.

---

## Domain M: Contract and Quote Cohesiveness

**M1.** When the contract generator creates a contract, does the deposit amount come from the event's `deposit_amount_cents` field, or is it hardcoded to 50% of `quoted_price_cents`? If the event has a custom deposit policy (e.g., 30%), does the contract reflect it?

**M2.** When an inquiry converts to an event, does the quoted price from the inquiry (`budget_cents` or discussed amount) carry forward to the event's `quoted_price_cents`? Or does the chef re-enter it?

**M3.** Does the contract's cancellation policy section use the chef's actual cancellation/refund policy settings, or does it generate generic boilerplate?

**M4.** When a payment plan is set up on an event, does the contract reflect the installment schedule (dates and amounts), or does it only show total price and deposit?

---

## Domain N: Calendar and Schedule Financial Integration

**N1.** When a payment plan installment is due, does it appear on the chef's calendar as a reminder? Or are financial deadlines invisible on the calendar?

**N2.** When the calendar shows an event, does the event card/tooltip include financial status (paid, partial, unpaid)? Or is the calendar purely schedule-focused?

**N3.** Does the iCal feed (`/api/feeds/calendar/[token]/route.ts`) include any financial context in the event description (e.g., "Paid" or "Outstanding: $500")?

---

## Domain O: AI Intelligence Financial Accuracy

**O1.** When Remy proactive alerts check for overdue invoices (`checkOverdueInvoices`), does it query `ledger_entries` for outstanding balances, or does it check a separate `invoices` table that could be stale?

**O2.** Does Remy have proactive alerts for: (a) revenue significantly below prior period, (b) approaching quarterly tax deadline with unpaid estimate, (c) cash flow going negative in next 30 days? Or are financial proactive alerts limited to overdue invoices only?

**O3.** When a chef asks Remy "how much revenue did I make this month?", does Remy's answer match what the finance hub shows? (This was I3 from Phase 1 - verify the fix is comprehensive across all Remy financial context methods.)

---

## Domain P: Client-Facing Financial Consistency

**P1.** Does the client portal show payment history (past payments made), or only pending/outstanding amounts? Can a client verify what they've already paid?

**P2.** When a payment confirmation email is sent to a client, does the amount in the email match the ledger entry amount? Or could rounding/currency formatting cause a mismatch?

**P3.** Does the hub profile page (shared link) expose any financial information about the chef (revenue, pricing, rates)? It should NOT - financial data is chef-only.

---

## Domain Q: Commerce/POS Financial Reconciliation

**Q1.** When a POS sale is completed via Stripe, does the DB trigger `commerce_payment_to_ledger` create a ledger entry with the correct `entry_type` and `amount_cents`? Does it use gross or net (after Stripe fees)?

**Q2.** Does the P&L report correctly separate billing revenue (event payments) from commerce revenue (POS sales) from standalone sales? Are these three channels clearly distinguished?

**Q3.** When a commerce payment is refunded, does the reverse ledger entry get created via the same DB trigger? Or could a commerce refund bypass the ledger?

---

## Domain R: Settlement and Payout Tracking

**R1.** When Stripe processes a payout (settlement) to the chef's bank, is there any ledger entry created? Or are settlements tracked in `settlement_records` only, disconnected from the ledger?

**R2.** Does the finance hub show a "deposited to bank" total that matches Stripe settlement records? Or is bank deposit tracking missing entirely?

**R3.** When a settlement includes fees (Stripe processing fees), do those fees appear as expenses in the P&L report? Or are Stripe fees invisible to the financial reporting?

---

## Domain S: Notification and Email Financial Signals

**S1.** When a ledger entry is created (payment received), does the notification system fire consistently? Check: does `appendLedgerEntryForChef` trigger a notification, or does only the Stripe webhook path trigger it?

**S2.** When a payment plan installment becomes overdue (past due_date, still unpaid), does any automated system detect this and alert the chef? Or is it only visible if the chef checks the payments page?

**S3.** Do email templates for payment confirmation include all relevant details (amount, event name, payment method, remaining balance)? Or are they generic "payment received" with no specifics?

---

## Domain T: Cross-Role Financial Isolation

**T1.** When a subcontract chef completes work for a hiring chef, does the payment flow create ledger entries in BOTH chefs' tenants (expense for hiring chef, income for subcontract chef)? Or only one side?

**T2.** Can a staff member with portal access see any financial data (revenue, expenses, client payment info)? Staff should see only their own payroll, not business financials.

**T3.** When the chef's accountant/bookkeeper needs access (future feature consideration), is there a read-only financial role? Or would they need full chef access?

---

## Execution Tracker

| ID  | Status                    | Notes                                                                                                                                                                                                                                       |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | PASS                      | `recipe_cost_summary` is a live DB VIEW (not materialized). Ingredient price changes propagate automatically to event Money tab via `food-cost-actions.ts`.                                                                                 |
| K2  | GAP (structural)          | Event Money tab food cost % uses expenses table (actual spend); DB function uses recipe ingredient costs (estimated). Intentionally different: estimated vs actual. Pre-event shows 0% until expenses logged.                               |
| K3  | GAP                       | Purchase order `actual_total_cents` stays in inventory module. Event Money tab sources food cost from expenses table only, not POs.                                                                                                         |
| K4  | GAP                       | Shopping list and expenses completely disconnected. No FK, no auto-creation. Chef manually logs grocery expenses separately.                                                                                                                |
| L1  | FIXED                     | YoY comparison now excludes tips via `.not('entry_type', 'eq', 'tip')` on all 3 ledger queries. Matches canonical filter.                                                                                                                   |
| L2  | GAP (acknowledged)        | Analytics uses `getMonthOverMonthRevenue()` which reads `event_financial_summary.total_paid_cents`. Also uses `quoted_price_cents` for some metrics. Different concepts (actual vs contracted).                                             |
| L3  | FIXED                     | Daily briefing now queries `ledger_entries` with canonical filter (`is_refund=false, entry_type != tip`) instead of `event_financial_summary` view.                                                                                         |
| L4  | GAP (by design)           | Cash flow forecast uses `total_amount_cents` (contracted price) for forecasting. For forward-looking forecasts, contracted price is more useful than payments-to-date. Label is "confirmed income" which is accurate for contracted events. |
| M1  | FIXED                     | Contract generator now uses `event.deposit_amount_cents` when set, falls back to 50% only if no custom deposit. Template also updated.                                                                                                      |
| M2  | PASS                      | `convertInquiryToEvent` carries `total_quoted_cents` and `deposit_amount_cents` from accepted quote to event.                                                                                                                               |
| M3  | GAP                       | Contract uses hardcoded 14-day cancellation / deposit non-refundable boilerplate. No chef-specific policy settings queried.                                                                                                                 |
| M4  | GAP                       | Contract always shows 50/50 deposit-balance structure. Payment plan installments not reflected in contract.                                                                                                                                 |
| N1  | GAP                       | Calendar does not show payment installment due dates. Financial deadlines invisible.                                                                                                                                                        |
| N2  | FIXED                     | Calendar event query now includes `payment_status`. `UnifiedCalendarItem` type has `paymentStatus` field. UI can render it.                                                                                                                 |
| N3  | GAP                       | iCal feed includes only guest count, status, site notes. No financial context. Low priority (security: financial data in plain-text iCal is risky).                                                                                         |
| O1  | PASS                      | Overdue invoices check queries `invoices` table by status='sent' and due_date. Correct data source for invoice-based overdue detection.                                                                                                     |
| O2  | GAP (partial)             | Remy only checks overdue invoices and payment receipts. Missing: revenue dips, tax deadlines, cash flow alerts. Overdue installments now covered (S2 fix).                                                                                  |
| O3  | PASS (via Phase 1 I3 fix) | Remy context uses canonical ledger filter (`is_refund=false, entry_type != tip`) on all 3 financial queries.                                                                                                                                |
| P1  | FIXED                     | Client portal now shows payment history (last 20 ledger entries, excluding tips/refunds, with date, amount, type, event name).                                                                                                              |
| P2  | PASS (minor gap)          | Payment confirmation email includes amount, event name, payment type, remaining balance. Missing: payment method (card vs cash). Minor.                                                                                                     |
| P3  | PASS                      | Public hub profile exposes zero financial data. Only profile, event history, group memberships.                                                                                                                                             |
| Q1  | PASS                      | DB trigger `commerce_payment_to_ledger` creates ledger entry with `entry_type='payment'`, uses gross `amount_cents`. Separate tip entry when `tip_cents > 0`.                                                                               |
| Q2  | PASS                      | P&L report separates billing revenue, commerce revenue, and sales revenue into distinct lines. Three channels clearly distinguished.                                                                                                        |
| Q3  | PASS                      | DB trigger `commerce_refund_to_ledger` creates reverse ledger entry with `entry_type='refund'`, `is_refund=true`, negative amount.                                                                                                          |
| R1  | GAP                       | Settlements only in `settlement_records`. No ledger entry for payouts. Display-only. Payout tracking disconnected from double-entry ledger.                                                                                                 |
| R2  | GAP                       | No "deposited to bank" total on finance hub. Settlement/payout tracking is a separate module not integrated into main financial dashboard.                                                                                                  |
| R3  | FIXED                     | P&L now includes `processingFeesCents` from `commerce_payments.fee_cents` in operating expenses. Added to `ProfitAndLossReportData` type.                                                                                                   |
| S1  | GAP                       | `appendLedgerEntryForChef` does not dispatch notifications. Payment alerts only via hourly proactive alert polling (`checkPaymentReceived`). No real-time notification on payment.                                                          |
| S2  | FIXED                     | Added `checkOverdueInstallments` rule to proactive alerts. Queries unpaid installments past due_date. Wired into `runAlertRules` parallel execution.                                                                                        |
| S3  | PASS                      | Payment confirmation email includes amount, event name, type, remaining balance. Adequate for client communication.                                                                                                                         |
| T1  | GAP (documented)          | Subcontract completion does not create ledger entries in either tenant. P&L covers hiring chef's costs via direct query (H4 fix). Subcontract chef has no income record. Cross-tenant ledger writes need architectural design.              |
| T2  | PASS                      | Staff portal (`requireStaff()` gate) exposes only tasks, stations, assignments, schedule. No financial queries. Business financials fully isolated.                                                                                         |
| T3  | N/A                       | Read-only financial role for accountants is a future feature, not a current gap. No existing functionality to evaluate.                                                                                                                     |

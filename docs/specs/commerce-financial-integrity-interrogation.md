# Commerce & Financial Pipeline Integrity Interrogation

**Purpose:** Expose every failure point in ChefFlow's money layer: POS checkout, payments, refunds, ledger, reconciliation, tax, reporting, and export. Every chef archetype depends on financial accuracy. A bug here = real money lost, incorrect tax filings, or broken trust with clients. This interrogation forces the entire commerce-to-ledger pipeline into a fully specified, verifiable state.

**Scope:** The full money flow: checkout -> payment -> ledger -> reconciliation -> reporting -> export. Covers POS register operations, card/cash handling, split tenders, refunds, tips, tax, daily close-out, period reporting, CPA-ready export, and cross-system consistency.

**Principle:** ChefFlow has a sophisticated commerce engine (checkout, split tender, promotions, terminal adapter, audit log, observability). But sophistication without integrity is a liability. This interrogation tests whether the numbers are CORRECT, CONSISTENT, and RECOVERABLE at every stage.

---

## Coverage Map

| Q    | Title                                    | Domain         | Priority | Verdict                    |
| ---- | ---------------------------------------- | -------------- | -------- | -------------------------- |
| FQ1  | Checkout Atomicity                       | Checkout       | P0       | **PASS**                   |
| FQ2  | Idempotency Under Network Retry          | Checkout       | P0       | **PASS**                   |
| FQ3  | Split Tender Penny Accuracy              | Checkout       | P1       | **PASS**                   |
| FQ4  | Mid-Checkout Failure Recovery            | Checkout       | P0       | **PASS**                   |
| FQ5  | Overpayment Guard Completeness           | Payments       | P0       | **PASS** (fixed)           |
| FQ6  | Refund FSM Consistency                   | Refunds        | P0       | **PASS** (fixed)           |
| FQ7  | Over-Refund Prevention                   | Refunds        | P1       | **PASS**                   |
| FQ8  | Ledger Immutability Enforcement          | Ledger         | P0       | **PASS**                   |
| FQ9  | Commerce-to-Ledger Revenue Consistency   | Cross-System   | P0       | **PARTIAL**                |
| FQ10 | Double-Count Prevention in P&L           | Cross-System   | P0       | **PASS**                   |
| FQ11 | Tip Tracking Across Systems              | Tips/Finance   | P1       | **PARTIAL**                |
| FQ12 | Cash Drawer Accuracy at Close            | Register       | P0       | **PASS**                   |
| FQ13 | Register Session Race Conditions         | Register       | P1       | **PASS**                   |
| FQ14 | Daily Reconciliation Flag Integrity      | Reconciliation | P1       | **PASS** (fixed)           |
| FQ15 | Tax Class Coverage and Rate Resolution   | Tax            | P0       | **PASS** (fixed)           |
| FQ16 | Tax Reporting Exportability              | Tax/Export     | P1       | **PARTIAL**                |
| FQ17 | Terminal Payment Failure Recovery        | Terminal       | P1       | **PASS**                   |
| FQ18 | Promotion Discount Penny Distribution    | Promotions     | P2       | **PASS**                   |
| FQ19 | Sale FSM Guard Completeness              | State Machine  | P1       | **PASS**                   |
| FQ20 | Void Reversal Completeness               | Void/Inventory | P1       | **PASS** (fixed)           |
| FQ21 | Receipt Delivery Audit Trail             | Receipts       | P2       | **PASS** (fixed)           |
| FQ22 | POS Audit Log Coverage                   | Audit          | P1       | **PASS**                   |
| FQ23 | Multi-Cashier Concurrent Checkout        | Concurrency    | P1       | **PASS**                   |
| FQ24 | End-of-Day Close-Out Completeness        | Operations     | P0       | **PASS**                   |
| FQ25 | Period Financial Report Accuracy         | Reporting      | P0       | **PARTIAL**                |
| FQ26 | CPA/Accountant Export Completeness       | Export         | P1       | **PASS**                   |
| FQ27 | Gross vs Net Revenue Consistency         | Reporting      | P1       | **PASS**                   |
| FQ28 | Carry-Forward/Savings Derivation         | Ledger         | P2       | **PASS** (correct pattern) |
| FQ29 | Observability Alert Dedup and Escalation | Observability  | P2       | **PASS**                   |
| FQ30 | Financial Data Deletion Safety           | Data Safety    | P0       | **PASS**                   |

---

## Question Definitions

### FQ1: Checkout Atomicity

**Question:** If any step of `counterCheckout` fails after the sale is created (item insert, payment insert, status update), does the system leave the database in a consistent state?

**Failure type:** partial write (orphaned sale, items without payment, payment without status)

**Why it matters:** A restaurant processing 100+ transactions/day will hit edge cases. A sale that exists in `draft` with items but no payment is a ghost record that corrupts reporting.

**Key files:**

- `lib/commerce/checkout-actions.ts` (counterCheckout function)

**Pass criteria:** Every failure path either completes the full checkout OR marks the sale as failed/voided AND emits an alert. No orphaned intermediate states persist as valid.

---

### FQ2: Idempotency Under Network Retry

**Question:** If a client retries a checkout request (network timeout, double-tap), does the system return the original result without creating a duplicate sale?

**Failure type:** duplicate charge (double sale for same transaction)

**Why it matters:** Mobile POS on spotty WiFi = retries. Double-charging a customer destroys trust instantly.

**Key files:**

- `lib/commerce/checkout-actions.ts` (findExistingCheckoutResult)
- `lib/commerce/checkout-idempotency.ts`

**Pass criteria:** Retry with same idempotency key returns identical result. No second sale created. No second payment recorded.

---

### FQ3: Split Tender Penny Accuracy

**Question:** When a $47.53 bill is split across 3 payment methods, do all amounts sum to exactly $47.53 with no penny lost or gained?

**Failure type:** rounding error (penny leak across tenders)

**Why it matters:** Over 1000 transactions, penny leaks compound into visible reconciliation gaps.

**Key files:**

- `lib/commerce/checkout-actions.ts` (split tender allocation)

**Pass criteria:** Sum of all split tender amounts equals total due. Change is computed only on cash lines. No rounding creates or destroys cents.

---

### FQ4: Mid-Checkout Failure Recovery

**Question:** If payment insert fails after sale + items are created, what happens to the sale record? Is the customer charged? Can the cashier retry?

**Failure type:** stuck transaction (sale exists but can't be paid or voided)

**Why it matters:** A POS that requires manual DB intervention to unstick a failed transaction is unusable during service.

**Key files:**

- `lib/commerce/checkout-actions.ts` (markSaleAsCheckoutFailed, emitCheckoutAlert)

**Pass criteria:** Failed checkout marks sale as voided with a clear reason. POS alert is emitted. Cashier can immediately start a new transaction. No phantom charge exists.

---

### FQ5: Overpayment Guard Completeness

**Question:** If two payments are recorded against the same sale (race condition or manual entry), can the total paid exceed the sale total?

**Failure type:** overpayment (chef owes customer money, messy reconciliation)

**Why it matters:** With split tenders and manual payment recording, race conditions between two cashiers or a retry can create overpayment.

**Key files:**

- `lib/commerce/payment-actions.ts` (recordPayment overpayment check)

**Pass criteria:** Total paid across all payments for a sale never exceeds sale total + tip. Guard accounts for already-recorded payments, not just the current one.

---

### FQ6: Refund FSM Consistency

**Question:** Does the refund path use the same FSM guards as the payment path when updating sale status?

**Failure type:** inconsistent state (payment path uses `computeSaleStatus`, refund path uses hardcoded logic)

**Why it matters:** Two code paths computing the same state differently = eventual divergence. A sale could show "captured" on one view and "partially_refunded" on another.

**Key files:**

- `lib/commerce/payment-actions.ts` (updateSaleStatusAfterPayment)
- `lib/commerce/refund-actions.ts` (updateSaleStatusAfterRefund)
- `lib/commerce/sale-fsm.ts` (computeSaleStatus)

**Pass criteria:** Both payment and refund paths derive sale status through the same function (`computeSaleStatus` from sale-fsm.ts). No hardcoded status strings in the refund path.

---

### FQ7: Over-Refund Prevention

**Question:** Can the sum of all refunds against a payment exceed the original payment amount?

**Failure type:** negative balance (refund exceeds charge)

**Why it matters:** Accidental double-refund is the #1 POS financial error in restaurants.

**Key files:**

- `lib/commerce/refund-actions.ts` (refundable balance check)

**Pass criteria:** `createRefund` checks sum of existing refunds + new refund <= original payment amount. Guard is per-payment, not just per-sale.

---

### FQ8: Ledger Immutability Enforcement

**Question:** Can any code path (server action, webhook, migration) update or delete an existing ledger entry?

**Failure type:** financial record tampering (breaks audit trail)

**Why it matters:** Immutable ledger is the foundation of all financial reporting. If any code path can modify a ledger entry, all derived numbers are suspect.

**Key files:**

- `lib/ledger/append.ts`
- `lib/ledger/append-internal.ts`
- Database immutability trigger on `ledger_entries`

**Pass criteria:** DB trigger prevents UPDATE/DELETE on `ledger_entries`. No server action exports an update or delete function for ledger entries. Only append operations exist.

---

### FQ9: Commerce-to-Ledger Revenue Consistency

**Question:** If a commerce payment is recorded but the corresponding ledger entry fails (or vice versa), do the financial reports diverge?

**Failure type:** cross-system inconsistency (commerce says $X, ledger says $Y)

**Why it matters:** Commerce reports read from `sales`/`commerce_payments`. Financial reports read from `ledger_entries`. If these two systems can drift, the chef sees different revenue numbers on different pages.

**Key files:**

- `lib/commerce/payment-actions.ts` (recordPayment)
- `lib/ledger/append.ts`
- `lib/finance/profit-loss-report-actions.ts` (dedup bridge)

**Pass criteria:** Either both commerce payment and ledger entry succeed, or neither persists. OR: reconciliation catches and flags the drift within 24 hours.

---

### FQ10: Double-Count Prevention in P&L

**Question:** Can a revenue event appear in both "billing revenue" and "commerce revenue" in the P&L report?

**Failure type:** inflated revenue (double-counting)

**Why it matters:** The P&L report combines 3 revenue streams (billing/ledger, commerce, standalone sales). If the dedup bridge is broken, revenue is overstated.

**Key files:**

- `lib/finance/profit-loss-report-actions.ts` (ledger_entry_id exclusion, sale_id exclusion)

**Pass criteria:** Commerce payments with a `ledger_entry_id` are excluded from commerce revenue. Sales linked to commerce payments are excluded from standalone revenue. No single dollar appears in two revenue buckets.

---

### FQ11: Tip Tracking Across Systems

**Question:** Are tips recorded in commerce (sale.tip_cents, payment.tip_cents) consistent with tips in the ledger (entry_type='tip') and tip management (tip_entries)?

**Failure type:** tip discrepancy (three sources of truth for the same tip)

**Why it matters:** Tips affect labor reporting, tax filing, and staff trust. Three systems tracking tips independently = guaranteed divergence.

**Key files:**

- `lib/commerce/checkout-actions.ts` (tipCents handling)
- `lib/ledger/append.ts` (tip entry type)
- `lib/staff/tip-actions.ts` (tip_entries, importTipsFromRegister)

**Pass criteria:** Tip amounts flow from checkout to payment to ledger in a single path. `importTipsFromRegister` correctly bridges commerce tips to tip management. No tip is lost or duplicated.

---

### FQ12: Cash Drawer Accuracy at Close

**Question:** Does the expected cash at register close equal opening float + cash sales - cash refunds - cash payouts? Is every cash movement tracked?

**Failure type:** cash variance (expected != actual with no explanation)

**Why it matters:** Unexplained cash variance = either theft suspicion or system error. Both destroy trust.

**Key files:**

- `lib/commerce/register-actions.ts` (closeRegister, cash drawer movement)
- `lib/commerce/checkout-actions.ts` (computeCashDrawerSaleMovementCents)

**Pass criteria:** Cash drawer movements are recorded for every cash transaction (sale, refund, payout). Expected cash at close = opening + sum(movements). Variance is flagged if nonzero.

---

### FQ13: Register Session Race Conditions

**Question:** If two users attempt to open a register session simultaneously, does one fail cleanly? If a session is abandoned (no close), does the next open handle it?

**Failure type:** stuck register (can't open because phantom session is "open")

**Why it matters:** Morning rush, previous closer forgot to close the register. New cashier can't start. Service is blocked.

**Key files:**

- `lib/commerce/register-actions.ts` (openRegister, reconcileActiveRegisterSessionsAfterOpen)

**Pass criteria:** Only one active session per tenant. Race resolution auto-closes stale sessions. Auto-closed sessions get a reconciliation attempt. New session opens cleanly.

---

### FQ14: Daily Reconciliation Flag Integrity

**Question:** When resolving a reconciliation flag, does the system correctly target the flag by identity (not array index)? Can a concurrent flag regeneration cause the wrong flag to be resolved?

**Failure type:** wrong flag resolved (array index targeting is fragile)

**Why it matters:** If flags are stored as a JSON array and targeted by index, any insertion/reorder between read and write resolves the wrong flag.

**Key files:**

- `lib/commerce/reconciliation-actions.ts` (resolveReconciliationFlag)

**Pass criteria:** Flags are targeted by a stable identifier (not array index). Concurrent flag updates don't corrupt each other.

---

### FQ15: Tax Class Coverage and Rate Resolution

**Question:** When a taxable item goes through checkout, is the tax amount computed from the zip code and tax class, or is it zero/hardcoded?

**Failure type:** incorrect tax collection (legal liability)

**Why it matters:** Collecting wrong tax amounts = state tax audit liability. Not collecting tax on taxable items = the chef owes the difference.

**Key files:**

- `lib/commerce/tax-policy.ts` (taxability classification only)
- `lib/commerce/checkout-actions.ts` (tax computation)
- `lib/commerce/constants.ts` (7 tax classes defined)

**Pass criteria:** Tax amount is computed from a rate source (lookup table, API, or configuration) keyed by jurisdiction. Tax classes map to different rates. Exempt items get zero tax. The computation is auditable.

---

### FQ16: Tax Reporting Exportability

**Question:** Can a chef export a tax summary grouped by tax class and jurisdiction for their quarterly/annual tax filing?

**Failure type:** missing compliance data (chef can't file taxes from ChefFlow data)

**Why it matters:** If the chef has to manually reconstruct tax data from receipts, ChefFlow isn't replacing their old system, it's adding overhead.

**Key files:**

- `lib/commerce/export-actions.ts` (exportTaxSummaryCsv)

**Pass criteria:** Tax export includes: period, total taxable sales by class, total tax collected by class, jurisdiction (zip code). Format is CSV-importable to accounting software.

---

### FQ17: Terminal Payment Failure Recovery

**Question:** If the Stripe terminal reader times out or disconnects mid-payment, does the system know whether the charge succeeded?

**Failure type:** uncertain charge state (charged customer but system doesn't know)

**Why it matters:** Card-present terminals can succeed at the reader but fail to report back. The payment exists at Stripe but not in ChefFlow.

**Key files:**

- `lib/commerce/terminal/stripe-terminal-adapter.ts`
- `lib/commerce/payment-terminal-actions.ts`

**Pass criteria:** Terminal adapter returns structured result (not exception). On timeout, system checks PaymentIntent status before declaring failure. Unresolved payments are flagged for manual reconciliation.

---

### FQ18: Promotion Discount Penny Distribution

**Question:** When a 15% discount is applied to 3 items totaling $47.53, does the discount allocation across lines sum to exactly the total discount with no penny lost?

**Failure type:** rounding error in discount allocation

**Why it matters:** Line-level discount allocation that doesn't sum to the order-level discount creates reconciliation gaps.

**Key files:**

- `lib/commerce/promotion-engine.ts` (evaluatePromotionForLines)

**Pass criteria:** Sum of line-level discounts equals total order discount. Remainder pennies are distributed deterministically (largest-first or similar).

---

### FQ19: Sale FSM Guard Completeness

**Question:** Does every sale status transition in the codebase go through the FSM guard? Are there any direct status writes that bypass `canTransition()`?

**Failure type:** illegal state transition (sale jumps from "captured" to "draft")

**Why it matters:** An FSM that can be bypassed is not an FSM. Direct status writes create impossible states.

**Key files:**

- `lib/commerce/sale-fsm.ts`
- `lib/commerce/payment-actions.ts`
- `lib/commerce/refund-actions.ts`
- `lib/commerce/checkout-actions.ts`
- `lib/commerce/sale-actions.ts` (voidSale)

**Pass criteria:** Every `.update({ status: ... })` on the `sales` table either calls `canTransition()` first or uses a CAS guard (`.eq('status', expectedStatus)`). No raw status writes.

---

### FQ20: Void Reversal Completeness

**Question:** When a sale is voided, are all side effects reversed (inventory deductions, cash drawer movements, loyalty points, register session totals)?

**Failure type:** phantom side effects (voided sale still affects inventory/cash/loyalty)

**Why it matters:** A voided sale that still depletes inventory or inflates register totals corrupts all downstream reporting.

**Key files:**

- `lib/commerce/sale-actions.ts` (voidSale)
- `lib/commerce/inventory-bridge.ts` (reverseSaleDeduction)

**Pass criteria:** Void triggers inventory reversal (both recipe-based and product-level). Cash drawer movement is reversed. Register session totals are recomputed. Loyalty is not awarded.

---

### FQ21: Receipt Delivery Audit Trail

**Question:** After sending a receipt by email or SMS, is there a record of what was sent, to whom, and when?

**Failure type:** no delivery proof (customer disputes, no audit trail)

**Why it matters:** "I never got a receipt" disputes are common. Without a delivery log, the chef can't prove they sent it.

**Key files:**

- `lib/commerce/receipt-actions.ts`

**Pass criteria:** Receipt delivery creates a record (email/SMS, recipient, timestamp, sale_id). Delivery failures are logged with reason.

---

### FQ22: POS Audit Log Coverage

**Question:** Are all financially significant POS actions recorded in the audit log? (checkout, void, refund, cash drawer open, price override, promotion apply, register open/close)

**Failure type:** audit gap (action happened but no record exists)

**Why it matters:** POS audit logs are the forensic trail for discrepancy investigation. Missing entries = blind spots.

**Key files:**

- `lib/commerce/pos-audit-log.ts`
- All commerce action files that call `appendPosAuditLog`

**Pass criteria:** Every action that changes financial state has an audit log entry. Log includes actor, timestamp, before/after values.

---

### FQ23: Multi-Cashier Concurrent Checkout

**Question:** If two cashiers process checkouts simultaneously on the same register session, do both complete correctly without corrupting session totals?

**Failure type:** data corruption (register totals are wrong due to concurrent writes)

**Why it matters:** Restaurants with 2+ POS stations sharing a register session (common with shared iPad setup).

**Key files:**

- `lib/commerce/checkout-actions.ts`
- `lib/commerce/register-actions.ts`

**Pass criteria:** Register session totals are computed from sales/payments (not incremented), so concurrent checkouts don't corrupt. Each checkout creates independent sale records.

---

### FQ24: End-of-Day Close-Out Completeness

**Question:** Does the register close procedure produce everything a manager needs: cash count vs expected, card batch total, void summary, refund summary, tip total, net revenue?

**Failure type:** incomplete close-out (manager can't verify the day's numbers)

**Why it matters:** If close-out doesn't give the manager a complete picture, they fall back to mental math or external tools.

**Key files:**

- `lib/commerce/register-actions.ts` (closeRegister)
- `lib/commerce/reconciliation-actions.ts` (generateDailyReconciliation)
- `lib/commerce/report-actions.ts` (getShiftReport)

**Pass criteria:** Close triggers daily reconciliation. Report includes: cash expected vs actual, card total, refunds, voids, tips, gross/net revenue. All numbers derived from transaction data.

---

### FQ25: Period Financial Report Accuracy

**Question:** Does the P&L report for a given period produce the same revenue total as summing all daily reconciliation reports for that period?

**Failure type:** cross-report inconsistency (daily reports say $X, monthly P&L says $Y)

**Why it matters:** A chef who sees different numbers on different reports loses trust in all of them.

**Key files:**

- `lib/finance/profit-loss-report-actions.ts`
- `lib/commerce/reconciliation-actions.ts`
- `lib/commerce/report-actions.ts`

**Pass criteria:** Revenue in P&L = sum of daily reconciliation revenue for same period. Any difference is explainable (timing, pending settlements).

---

### FQ26: CPA/Accountant Export Completeness

**Question:** Can a chef hand their accountant a complete financial package (revenue, expenses, COGS, payroll, tax collected) in standard CSV format?

**Failure type:** export gaps (accountant has to ask for missing data)

**Why it matters:** If the export is incomplete, the chef still needs spreadsheets. ChefFlow hasn't replaced manual bookkeeping.

**Key files:**

- `lib/commerce/export-actions.ts`
- `lib/compliance/data-export.ts`

**Pass criteria:** Exportable CSVs cover: sales detail, payment detail, refund detail, tax summary, expense detail, payroll summary. Columns include dates, amounts, categories, and transaction references.

---

### FQ27: Gross vs Net Revenue Consistency

**Question:** Is gross revenue (before refunds/discounts) and net revenue (after) consistently computed across all reporting surfaces?

**Failure type:** definition inconsistency (one report shows gross, another shows net, both labeled "revenue")

**Why it matters:** "Revenue" without qualification is ambiguous. If the dashboard shows gross and the P&L shows net, the chef thinks revenue dropped.

**Key files:**

- `lib/commerce/register-metrics.ts` (gross, no refund deduction)
- `lib/commerce/report-actions.ts`
- `lib/finance/profit-loss-report-actions.ts`
- `lib/analytics/restaurant-metrics-actions.ts`

**Pass criteria:** Every reporting surface labels revenue as "gross" or "net" (or both). No surface shows unlabeled revenue. Register metrics and P&L use the same definition when compared.

---

### FQ28: Carry-Forward/Savings Derivation

**Question:** Is the "carry-forward savings" metric derived from the ledger (the source of truth) or from a stored column on the events table?

**Failure type:** broken derivation principle (stored column can drift from ledger)

**Why it matters:** The architecture says "financial state is derived, never stored." If carry-forward reads a stored column, it violates the core principle.

**Key files:**

- `lib/ledger/compute.ts` (getYtdCarryForwardSavings)

**Pass criteria:** Carry-forward is computed from ledger entries, not from `events.leftover_value_received_cents`.

---

### FQ29: Observability Alert Dedup and Escalation

**Question:** If the same alert fires 10 times (e.g., recurring cash variance), does the system deduplicate and escalate rather than creating 10 separate alerts?

**Failure type:** alert fatigue (10 identical alerts, manager ignores all of them)

**Why it matters:** Alert systems that spam lose credibility. Dedup + escalation ensures attention.

**Key files:**

- `lib/commerce/observability-actions.ts` (recordPosAlert dedup logic)

**Pass criteria:** Duplicate alerts (same dedupe_key) increment occurrence count and escalate severity. Manager sees one alert with a count, not 10 alerts.

---

### FQ30: Financial Data Deletion Safety

**Question:** Can any server action delete financial records (ledger entries, payments, sales in non-draft status, refunds)?

**Failure type:** data destruction (financial history lost)

**Why it matters:** Deleting financial records is illegal in most jurisdictions (tax audit trail requirements). The system must prevent it at the code level.

**Key files:**

- All `lib/commerce/*.ts` and `lib/ledger/*.ts` files
- `lib/compliance/data-export.ts`

**Pass criteria:** No exported server action deletes from `ledger_entries`, `commerce_payments`, `commerce_refunds`, or `sales` (except draft->void which is a status change, not deletion). DB triggers enforce immutability.

---

## Investigation Results

```
PASS:     17/30  (57%)
PARTIAL:   3/30  (10%)
FAIL:      7/30  (23%)   [real money bugs]
N/A:       2/30  (7%)    [not applicable - already counted in PASS]
```

**By priority:**

- P0 (10 questions): 7 PASS, 1 PARTIAL, 2 FAIL (FQ5 overpayment, FQ6 refund FSM, FQ15 tax)
- P1 (13 questions): 9 PASS, 2 PARTIAL, 2 FAIL (FQ14 flag integrity, FQ20 void reversal)
- P2 (4 questions): 2 PASS, 0 PARTIAL, 2 FAIL (FQ21 receipt audit, FQ28 carry-forward)

### Verdict Details

| Q    | Verdict     | Evidence                                                                                                                                                                                                                                                                                                     |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FQ1  | **PASS**    | `markSaleAsCheckoutFailed` voids orphaned sales. `emitCheckoutAlert` fires on every failure path. 15+ failure recovery points in counterCheckout.                                                                                                                                                            |
| FQ2  | **PASS**    | `findExistingCheckoutResult` checks `commerce_payments` by idempotency key before any work. Returns identical result on retry. Split tenders get suffixed keys.                                                                                                                                              |
| FQ3  | **PASS**    | Split tender amounts are validated to sum to total. Change computed only on cash lines. Tip allocation uses largest-first remainder distribution.                                                                                                                                                            |
| FQ4  | **PASS**    | `markSaleAsCheckoutFailed` sets `void_reason: 'checkout_failed'`. Alert emitted. Sale is terminal. Cashier can retry with new transaction.                                                                                                                                                                   |
| FQ5  | **FAIL**    | `recordPayment` checks `input.amountCents > saleTotal` but does NOT subtract already-paid amounts. Two $30 payments on a $50 sale both pass the guard. Total paid = $60 > $50.                                                                                                                               |
| FQ6  | **FAIL**    | `updateSaleStatusAfterRefund` uses hardcoded `'fully_refunded'`/`'partially_refunded'` strings. `updateSaleStatusAfterPayment` uses `computeSaleStatus` from sale-fsm.ts. Two different code paths computing the same state.                                                                                 |
| FQ7  | **PASS**    | `createRefund` sums existing processed refunds and checks `existingTotal + newAmount <= paymentAmount`. Guard is per-payment.                                                                                                                                                                                |
| FQ8  | **PASS**    | DB trigger enforces immutability on `ledger_entries`. No update/delete functions exported from ledger module. Webhook append is in non-`'use server'` file.                                                                                                                                                  |
| FQ9  | **PARTIAL** | Commerce payments and ledger entries are written in sequence (not transactional). If ledger write fails after commerce payment succeeds, they diverge. Daily reconciliation catches drift via `payment_ledger_diff_cents`, but it's batch (not real-time).                                                   |
| FQ10 | **PASS**    | P&L report excludes `commerce_payments` with `ledger_entry_id` from commerce revenue. Sales linked to `commerce_payments` excluded from standalone. Dedup bridge is explicit and correct.                                                                                                                    |
| FQ11 | **PARTIAL** | Tips flow: checkout -> sales.tip_cents -> commerce_payments.tip_cents. Ledger tip entries are separate append. `importTipsFromRegister` bridges to tip_entries. But no automatic sync between commerce tips and ledger tip entries. Manual reconciliation required.                                          |
| FQ12 | **PASS**    | `closeRegister` computes expected cash from `cash_drawer_movements`. Cash movements recorded for every cash sale via `computeCashDrawerSaleMovementCents`. Variance flagged with configurable threshold.                                                                                                     |
| FQ13 | **PASS**    | `openRegister` has `reconcileActiveRegisterSessionsAfterOpen` that auto-closes stale sessions. Race resolution via unique constraint. Auto-closed sessions get reconciliation attempt.                                                                                                                       |
| FQ14 | **FAIL**    | `resolveReconciliationFlag` targets flags by array index in a JSON column. If flags are regenerated or reordered between read and resolve, wrong flag is resolved. No CAS guard. No stable flag ID.                                                                                                          |
| FQ15 | **FAIL**    | Tax amount is passed from client (`rawItem.taxCents`). No server-side tax rate lookup or computation. If frontend sends 0, tax is 0. Seven tax classes defined but no rate resolution.                                                                                                                       |
| FQ16 | **PARTIAL** | `exportTaxSummaryCsv` exists with jurisdiction breakdown. But since tax collection is client-supplied (FQ15), export accuracy depends entirely on frontend correctness. Structure is good, data may be wrong.                                                                                                |
| FQ17 | **PASS**    | Stripe adapter returns structured result (never throws). Circuit breaker wraps all Stripe calls. Status check via PaymentIntent. Unresolved payments return `failed` status with error context.                                                                                                              |
| FQ18 | **PASS**    | `evaluatePromotionForLines` uses proportional distribution with largest-first remainder. Sum of line discounts equals total discount. Clamped to never exceed eligible subtotal.                                                                                                                             |
| FQ19 | **PASS**    | `voidSale` uses `canVoid()`. Payment path uses `computeSaleStatus`. Checkout uses `markSaleAsCheckoutFailed` which sets voided directly (valid for unfinished sales). All status writes use CAS guards (`.eq('status', current)`).                                                                           |
| FQ20 | **FAIL**    | `voidSale` does NOT call `reverseSaleDeduction` or reverse product stock. `reverseSaleDeduction` exists in inventory-bridge.ts but is never invoked. Voided sales still deplete inventory.                                                                                                                   |
| FQ21 | **FAIL**    | `sendReceiptByEmail` and `sendReceiptBySms` return results but persist no delivery record. No audit trail of what was sent, to whom, or when. Customer disputes are unprovable.                                                                                                                              |
| FQ22 | **PASS**    | Audit log called from: checkout (2 paths), void, refund, register open/suspend/resume/close, cash drawer open. 14 `appendPosAuditLog` calls across 6 files. All financially significant actions covered.                                                                                                     |
| FQ23 | **PASS**    | Register session totals are computed from sales/payments via `computeRegisterSessionTotals` (not incremented). Each checkout creates independent sale records. Concurrent checkouts are safe.                                                                                                                |
| FQ24 | **PASS**    | `closeRegister` triggers `generateDailyReconciliation` (non-blocking). Report includes cash expected/actual, card total, refunds, voids, tips, gross/net. `captureDailyPosMetrics` captures snapshot.                                                                                                        |
| FQ25 | **PARTIAL** | P&L report combines 3 revenue streams with dedup bridge. Daily reconciliation reports compute independently from sales tables. These use different query paths, so totals may diverge for timing reasons (pending settlements, timezone edge cases).                                                         |
| FQ26 | **PASS**    | 6 CSV exports: sales, payments, refunds, tax summary, reconciliation, shift sessions. All include dates, amounts, categories, references. CPA-importable format.                                                                                                                                             |
| FQ27 | **PASS**    | Surfaces now explicitly labeled: P&L shows "Net Revenue (after refunds)", shift report shows "Gross Revenue", restaurant metrics says "net revenue" in subtitle. Chef can distinguish which number they're looking at.                                                                                       |
| FQ28 | **FAIL**    | `getYtdCarryForwardSavings` reads `events.leftover_value_received_cents` (stored column). Violates "financial state is derived from ledger" principle. Column can drift from ledger truth.                                                                                                                   |
| FQ29 | **PASS**    | `recordPosAlert` deduplicates by `dedupe_key`. Existing open alerts get `occurrence_count` incremented and severity escalated to max(existing, new). Manager sees one alert with count.                                                                                                                      |
| FQ30 | **PASS**    | No exported function deletes from `ledger_entries`, `commerce_payments`, or `commerce_refunds`. `voidSale` changes status (not deletion). DB trigger enforces ledger immutability. `tip_distributions` delete for idempotent re-run is the only financial delete (and it's a re-computation, not data loss). |

---

## Execution Strategy

### Sprint 1 (P0 money bugs - fix immediately)

1. FQ5 - overpayment guard: subtract already-paid before comparing
2. FQ6 - refund FSM: replace hardcoded status with `computeSaleStatus`
3. FQ20 - void reversal: call `reverseSaleDeduction` + reverse product stock on void
4. FQ15 - tax rate: add configurable tax rate table (server-side computation)
5. FQ28 - carry-forward: rewrite to derive from ledger entries

### Sprint 2 (P1 operational integrity)

6. FQ14 - reconciliation flags: add stable flag IDs, replace array index targeting
7. FQ21 - receipt audit: persist delivery records
8. FQ11 - tip bridge: auto-sync commerce tips to ledger on checkout

### Sprint 3 (P2 polish + remaining partials)

10. FQ9 - commerce-to-ledger: add real-time drift detection
11. FQ25 - cross-report consistency: add reconciliation check between P&L and daily reports
12. FQ16 - tax export: depends on FQ15 (server-side rates)

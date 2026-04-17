# Event Financial Lifecycle - Interrogation Question Set

> **Purpose:** Expose every failure point in the event state machine, ledger, payment, and financial reporting pipeline.
> Force the system into a fully specified, verifiable state.
> Every question has a pass/fail criteria. No ambiguity.

**System under test:** Event FSM (8 states) -> Ledger (append-only) -> Financial Views -> Payment Flows (Stripe + offline) -> Cancellation/Refund -> P&L
**Key files:** `lib/events/transitions.ts`, `lib/ledger/append.ts`, `lib/ledger/append-internal.ts`, `lib/ledger/compute.ts`, `app/api/webhooks/stripe/route.ts`, `lib/events/cancellation-actions.ts`, `lib/quotes/client-actions.ts`, `database/migrations/20260415000015_fix_financial_view_cartesian_product.sql`

---

## Category A: Ledger Integrity (Is the financial truth actually true?)

### Q1. Outstanding Balance Ignores Refunds

**The question:** Event quoted at $1,000. Client pays $1,000. Chef issues $200 refund via Stripe. What does `outstanding_balance_cents` show?
**Current behavior:** `event_financial_summary` view computes `outstanding_balance_cents = quoted_price_cents - total_paid_cents`. `total_paid_cents` filters `is_refund = false`, so it stays $1,000 after refund. Outstanding = $1,000 - $1,000 = $0. Correct from "does the client owe more" perspective. But misleading: the chef only collected $800 net. The view's `net_revenue_cents` correctly shows $800 (sums all entries including negative refunds). Two different "amounts" are displayed side by side.
**Root cause:** `outstanding_balance_cents` formula on line 45 of the cartesian fix migration.
**Severity:** MEDIUM. Not wrong per se (outstanding balance = what client still owes), but confusing next to net revenue. Chef sees $0 outstanding and $800 net revenue and wonders where $200 went.
**Pass criteria:** Either (a) rename to `remaining_client_balance_cents` and add a separate `total_collected_net_cents`, or (b) add a `total_refunded_cents` line item to the UI so the math is transparent, or (c) document the distinction.
**Status:** CONFUSING BUT DEFENSIBLE - needs documentation or UI clarity.

### Q2. payment_status Is Stored, Not Computed

**The question:** `events.payment_status` is a stored column set by `markEventPaid` and Stripe webhook. But ledger entries are the source of truth. Can they diverge?
**Current behavior:** `markEventPaid` (line 1297) writes `payment_status: paymentAmountCents >= quoted_price_cents ? 'paid' : 'partial'`. But if a refund comes later via Stripe webhook, `payment_status` is never updated back to 'partial'. The `event_financial_summary` view reads `e.payment_status` directly from the stored column.
**Root cause:** `payment_status` is written at payment time and never recomputed when refunds arrive.
**Severity:** HIGH. After a refund, `payment_status = 'paid'` but `net_revenue_cents < quoted_price_cents`. Chef sees "paid" status on an event where the client has been refunded. Financial views show "paid" while the ledger shows otherwise.
**Pass criteria:** Either (a) `payment_status` is computed from ledger in the view (not read from stored column), or (b) refund webhook handler updates `payment_status` based on current ledger state, or (c) the view overrides the stored value using ledger math.
**Status:** FIXED - refund webhook now recomputes `payment_status` from ledger (net revenue vs quoted price). Sets 'refunded', 'partial', or 'paid'.

### Q3. Adjustment Sign Convention

**The question:** Chef creates a manual adjustment for -$50 (discount). `createAdjustment` in `append.ts` passes `amount_cents` to `appendLedgerEntryInternal`. The internal function has a guard: `if (!is_refund && amount_cents <= 0) throw`. Does the adjustment work?
**Current behavior:** `createAdjustment` does not set `is_refund: true` for negative adjustments. It passes the raw `amount_cents`. If negative, `appendLedgerEntryInternal` throws "Ledger entry amount must be positive."
**Root cause:** The H2 discriminated sign check (line 23-33 of `append-internal.ts`) correctly enforces sign discipline, but `createAdjustment` doesn't handle the case where the chef wants a negative adjustment (discount/credit).
**Severity:** HIGH. Chef cannot record a discount or credit via the adjustment function. The only path is `is_refund: true`, which has different semantics (a refund is tracked differently than a discount).
**Pass criteria:** Either (a) `createAdjustment` automatically sets `is_refund: true` when `amount_cents < 0` and uses entry_type 'credit', or (b) a separate `createCredit` or `createDiscount` function exists, or (c) adjustment is defined as always-positive and discounts use a different entry type.
**Status:** FIXED - negative adjustments route through `credit` entry type with `is_refund: true`. Idempotency key also made deterministic.

### Q4. Duplicate Ledger Entry on Concurrent markEventPaid

**The question:** Two browser tabs both call `markEventPaid` at the same time. Both read `quoted_price_cents`, both append a ledger entry, both transition. What happens?
**Current behavior:** `markEventPaid` generates `transaction_reference: 'offline_${eventId}_${Date.now()}'`. Two concurrent calls produce different `Date.now()` values, so different references. Both ledger entries succeed. Event gets $2,000 in the ledger for a $1,000 event.
**Root cause:** The idempotency key includes `Date.now()`, which is unique per call. No CAS guard or advisory lock.
**Severity:** CRITICAL. Double-charging a client via double-click or concurrent tabs.
**Pass criteria:** `transaction_reference` for offline payments must be deterministic: `offline_${eventId}_${paymentMethod}`or use an advisory lock. Second attempt should be idempotent.
**Status:** FIXED - deterministic idempotency key`offline_${eventId}_${method}\_${amount}`. Same payment = same key = idempotent.

### Q5. getTenantFinancialSummary Excludes 'adjustment' Type

**The question:** Chef records an adjustment (add-on charge, fee). Does it appear in the tenant-wide P&L?
**Current behavior:** `getTenantFinancialSummary` (compute.ts line 73-82) categorizes: refunds -> `totalRefunds`, tips -> `totalTips`, everything else -> `totalRevenue`. 'adjustment' falls into "everything else" so it's counted as revenue. But `computeProfitAndLoss` has the same logic (line 165-173). Both count adjustments as revenue.
**Root cause:** The `else` branch catches payment, deposit, installment, final_payment, add_on, credit, AND adjustment. Adjustments that are actually expenses/credits (negative) can't exist due to Q3's sign guard.
**Severity:** LOW (because Q3 prevents negative adjustments from existing). If Q3 is fixed, this becomes MEDIUM: a credit adjustment would be positive (due to is_refund semantics) but should reduce revenue.
**Pass criteria:** Once Q3 is resolved, verify that credits/discounts are excluded from revenue totals. Document which entry types contribute to revenue vs. which are neutral/deductions.
**Status:** LATENT - depends on Q3 resolution.

---

## Category B: State Machine Safety (Can the system reach impossible states?)

### Q6. Draft -> Paid Skips Quote/Acceptance

**The question:** Instant-book flow transitions `draft -> paid` directly. Is there always a quote? Is there always a `quoted_price_cents`?
**Current behavior:** `TRANSITION_RULES` allows `draft -> paid`. `TRANSITION_PERMISSIONS` says this is 'system' (Stripe webhook only). The webhook calls `transitionEvent` with `systemTransition: true`, which skips readiness gates. If the PaymentIntent has metadata but the event has no `quoted_price_cents`, the financial view shows `outstanding_balance = NULL - total_paid = NULL`.
**Root cause:** Instant-book creates the event and PaymentIntent simultaneously. But if the event row doesn't have `quoted_price_cents` set before the webhook fires, the financial summary breaks.
**Severity:** MEDIUM. Race condition between event creation and webhook processing. In practice, `quoted_price_cents` is set during booking creation, but there's no guard.
**Pass criteria:** Either (a) `handlePaymentSucceeded` sets `quoted_price_cents` from PaymentIntent amount if not already set, or (b) readiness gate on `draft -> paid` requires `quoted_price_cents IS NOT NULL`, or (c) booking creation is transactional with price assignment.
**Status:** FIXED - webhook sets `quoted_price_cents` from PaymentIntent amount if null before processing.

### Q7. Cancellation After Partial Payment - No Auto-Refund

**The question:** Event is in `accepted` state. Client made a $500 deposit (ledger has $500 entry). Chef cancels. What happens to the $500?
**Current behavior:** `transitionEvent` to 'cancelled' succeeds. No code in the transition handler initiates a refund. `calculateCancellationFee` exists but is only called from the UI preview dialog. The cancellation itself does not apply the policy or create a refund ledger entry.
**Root cause:** Cancellation is a state transition only. Refund processing is manual (chef must initiate separately in Stripe).
**Severity:** HIGH. Chef cancels, client has paid money, system shows "cancelled" but money is stuck. No automated enforcement of the cancellation policy. No reminder to process the refund.
**Pass criteria:** Either (a) cancellation transition auto-creates a refund ledger entry based on cancellation policy, or (b) transition to cancelled with outstanding payments creates a "pending refund" task/notification for the chef, or (c) document as intentional manual workflow (with UI guidance).
**Status:** FIXED - cancellation with unrefunded balance sends chef notification: "Refund needed: $X unrefunded. Process refund via Stripe or record offline refund."

### Q8. completed -> Any Transition

**The question:** Event is completed. Chef realizes they need to add a tip or record a final adjustment. Can they do anything?
**Current behavior:** `TRANSITION_RULES['completed'] = []`. Terminal state. No way back. But `appendLedgerEntryForChef` and `createAdjustment` don't check event status. A chef can still add ledger entries to a completed event.
**Root cause:** FSM is terminal but ledger is open. Two systems with different lockdown rules.
**Severity:** LOW-MEDIUM. Not necessarily wrong (tips arrive after events), but the FSM says "done" while financials keep changing. `event_financial_summary` will show different numbers after "completion."
**Pass criteria:** Either (a) document that ledger entries can be added to completed events (post-close adjustments are normal), or (b) ledger refuses entries on completed events older than X days, or (c) completed events have a "financial close" action that locks the ledger.
**Status:** INCONSISTENT - FSM says terminal, ledger disagrees.

### Q9. Cancellation History Uses event.updated_at as Cancel Date

**The question:** Event is cancelled. Later, someone runs a migration or admin fix that touches the event row (e.g., updates a column). What cancel date does `getCancellationHistory` show?
**Current behavior:** `getCancellationHistory` (cancellation-actions.ts line 415) uses `new Date(event.updated_at)` as the cancel date. Any subsequent update to the event row changes `updated_at`, shifting the "cancellation date" forward.
**Root cause:** No dedicated `cancelled_at` column being used by this function. The `transitions.ts` atomic RPC sets `events.cancelled_at`, but `getCancellationHistory` reads `updated_at` instead.
**Severity:** MEDIUM. Cancellation fee tier is calculated from days between cancel and event date. Wrong cancel date = wrong tier = wrong refund amount displayed in history.
**Pass criteria:** `getCancellationHistory` uses `events.cancelled_at` (which is set atomically during cancellation) instead of `updated_at`.
**Status:** FIXED - uses `cancelled_at` (set atomically during cancellation) with `updated_at` fallback.

### Q10. Event Transition Missing Tenant Scope on Initial Fetch

**The question:** `transitionEvent` fetches the event with `.eq('id', eventId).single()` (line 108). No tenant_id filter on the initial fetch. Can a chef trigger a transition on another chef's event?
**Current behavior:** The function fetches without tenant scoping, then checks ownership at line 174: `if (actor.role === 'chef' && actor.tenantId !== event.tenant_id) throw`. The ownership check is correct but happens after the fetch. A chef can read another chef's event data (status, metadata) before the permission check throws.
**Root cause:** Defense-in-depth gap. The check exists but the query is overly broad.
**Severity:** LOW. The function throws before any mutation. But it leaks event existence and status to unauthorized callers via timing (fast throw = found, slow throw = not found). Not exploitable in practice because server actions don't return the event data before throwing.
**Pass criteria:** Add `.eq('tenant_id', actor.tenantId)` to the initial query for chef-initiated transitions (non-system). Belt-and-suspenders.
**Status:** MINOR - defense-in-depth improvement.

---

## Category C: Payment Flow Integrity (Does money math add up?)

### Q11. Stripe Amount Mismatch Is Warning-Only

**The question:** Chef quotes $1,000. PaymentIntent is created for $1,000. But Stripe applies a fee, or the amount is modified. The webhook receives amount = $950. What happens?
**Current behavior:** `handlePaymentSucceeded` (line 476-487) logs a warning if `paymentIntent.amount !== expectedCents`. But proceeds to create the ledger entry with `paymentIntent.amount` ($950). The event still transitions to `paid`. The financial summary shows $950 paid on a $1,000 quote: outstanding balance = $50.
**Root cause:** Stripe is the payment authority (correct), but the discrepancy is not surfaced to the chef.
**Severity:** MEDIUM. $50 gap silently exists. Chef sees "paid" status but has a $50 outstanding balance. No notification, no flag.
**Pass criteria:** Either (a) when amount mismatch is detected, create a chef notification with the discrepancy details, or (b) set `payment_status = 'partial'` when amount < quoted, or (c) document as intentional (Stripe amount is always correct, outstanding balance shows the gap).
**Status:** FIXED - chef notification sent with exact amounts: "Received $X but expected $Y."

### Q12. Offline Payment Has No Amount Validation Cap

**The question:** Chef uses `markEventPaid` with no amount. Defaults to `quoted_price_cents`. Event has `quoted_price_cents = null` (never set). What happens?
**Current behavior:** Line 1273: `const paymentAmountCents = amountCents ?? event.quoted_price_cents`. If both null, line 1274 catches it: `if (!paymentAmountCents || paymentAmountCents <= 0) throw 'no quoted price set'`. This is correct.
But: If `quoted_price_cents` is set to a very large number (data entry error, e.g., $100,000.00 = 10000000 cents), `markEventPaid` will create a ledger entry for that amount. The ledger's `MAX_ENTRY_CENTS = 99_999_999` ($999,999.99) guard in `appendLedgerEntryInternal` would catch extreme cases, but a $100K entry on a $1K event sails through.
**Root cause:** No sanity check that payment amount is reasonable relative to the quote.
**Severity:** LOW. Fat-finger risk. The ledger cap prevents truly catastrophic entries.
**Pass criteria:** Either (a) `markEventPaid` warns if amount > 2x quoted_price_cents, or (b) acceptable (chef is explicitly clicking "mark paid"), or (c) add a confirmation step for amounts over a threshold.
**Status:** ACCEPTABLE - ledger cap exists, chef action is explicit.

### Q13. Refund Without Cancellation State Change

**The question:** Event is in `confirmed` state. Chef issues a full refund via Stripe dashboard. Webhook fires `charge.refunded`. Refund entry added to ledger. But event stays `confirmed`.
**Current behavior:** `handleRefund` (line 1090) only appends a ledger entry and sends notifications. It does NOT transition the event status. A fully refunded event can sit in `confirmed` with $0 net revenue.
**Root cause:** Refund handler is ledger-only. No FSM awareness.
**Severity:** HIGH. Chef sees a "confirmed" event that has been fully refunded. They may still prepare food, buy ingredients, block the date. No indication on the event page that the money is gone.
**Pass criteria:** Either (a) full refund triggers automatic cancellation (with guard against partial refunds), or (b) refund handler adds a `cost_needs_refresh` flag or "refund alert" notification to the event, or (c) event detail page checks ledger and shows a warning banner when `net_revenue_cents <= 0` on a non-cancelled event.
**Status:** FIXED - full refund on active event sends "consider cancelling" notification to chef. Also sets `payment_status = 'refunded'`.

### Q14. Deposit vs. Full Payment Entry Type Relies on Metadata

**The question:** Stripe PaymentIntent has `payment_type: 'deposit'` in metadata. But metadata is set by the frontend when creating the PaymentIntent. Can a malicious or buggy client send `payment_type: 'full'` on a deposit payment?
**Current behavior:** `handlePaymentSucceeded` (line 490) uses `payment_type === 'deposit' ? 'deposit' : 'payment'`. The metadata is set during PaymentIntent creation on the server side (`createPaymentIntent` action). Not client-modifiable after creation.
**Root cause:** Stripe metadata is set server-side and signed. Not a real attack vector.
**Severity:** NONE. The metadata is set by server code, not client code. Stripe's signature verification ensures the webhook is authentic.
**Pass criteria:** Already correct. Server-side metadata + Stripe signature = trustworthy.
**Status:** CORRECT.

---

## Category D: P&L and Reporting Accuracy (Are the business metrics real?)

### Q15. food_cost_percentage in Financial View Has No Food Cost Data

**The question:** The `event_financial_summary` view computes `food_cost_percentage = total_expenses_cents / net_revenue_cents`. But `expenses` table is general (travel, labor, equipment, ingredients). Is food cost actually food cost?
**Current behavior:** `food_cost_percentage` is really "total expense ratio" not "food cost %". The expenses table has a `category` column but the view sums ALL categories.
**Root cause:** View definition doesn't filter by expense category.
**Severity:** MEDIUM. Chef sees "food cost: 65%" when actual food cost is 30% and the rest is labor + travel. Misleading metric that could cause wrong pricing decisions.
**Pass criteria:** Either (a) `food_cost_percentage` filters expenses to food/ingredient categories only, or (b) rename to `total_expense_ratio` and add a separate `food_cost_percentage` that filters by category, or (c) document the current meaning clearly in the UI label.
**Status:** MISLEADING - label says food cost, value includes all expenses.

### Q16. Monthly Revenue Uses created_at Fallback

**The question:** P&L `computeProfitAndLoss` (compute.ts line 192) uses `received_at ?? created_at` for monthly bucketing. What if `received_at` is backdated (check received 2 weeks after event)?
**Current behavior:** If `received_at` is set, it's used. If null, `created_at` is used. This is correct for checks (received_at = when deposited). But `created_at` for card payments is the webhook processing time, not the payment time. If the webhook is delayed or retried, the payment may land in the wrong month.
**Root cause:** Card payments don't set `received_at` (it's optional). They rely on `created_at` which is the ledger insert timestamp.
**Severity:** LOW. Stripe webhooks typically process within seconds. Month-boundary edge case only.
**Pass criteria:** Either (a) Stripe webhook sets `received_at` from PaymentIntent's `created` timestamp, or (b) acceptable for V1 (document the edge case).
**Status:** MINOR - edge case at month boundaries.

### Q17. P&L Date Range Uses created_at, Not Event Date

**The question:** Event is on Dec 28. Payment arrives Jan 2 (client paid late). Which year does the revenue appear in?
**Current behavior:** `computeProfitAndLoss` filters ledger entries by `created_at` (line 135): `.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59Z')`. Revenue appears in January (when paid), not December (when event happened).
**Root cause:** Cash-basis accounting (revenue when received) vs accrual (revenue when earned). The code implements cash-basis.
**Severity:** LOW. Cash-basis is actually correct for most small businesses (and simpler). But it's not documented.
**Pass criteria:** Document that ChefFlow uses cash-basis accounting. The P&L reflects when money was received, not when events occurred. This is a valid accounting method.
**Status:** CORRECT BUT UNDOCUMENTED.

### Q18. Expense Category Coverage

**The question:** What expense categories exist? Are they enforced? Can a chef enter an expense with no category?
**Current behavior:** Need to verify. The `expenses` table has a `category` column. If it's a free-text field, expenses could have any string, making category-based filtering unreliable.
**Severity:** MEDIUM if categories are free-text (Q15 becomes unfixable). LOW if categories are an enum.
**Pass criteria:** Expense categories are either (a) an enum in the database, or (b) a constrained set validated in the server action. Either way, food-related categories must be identifiable.
**Status:** VERIFIED - categories are Zod-enforced enum (17 values). Food categories identifiable: `groceries`, `alcohol`, `specialty_items`. Q15 is fixable by filtering on these.

---

## Category E: Edge Cases and Failure Modes

### Q19. Webhook Retry Storm After 500

**The question:** `handlePaymentSucceeded` throws an error after the ledger entry is created but before the transition. Stripe retries. What happens?
**Current behavior:** The outer handler (line 204-217) catches the error and returns 500, so Stripe retries. On retry, the idempotency check (line 98-117) finds the existing `transaction_reference` and returns early. BUT: the `checkout.session.completed` type is in the `isNonLedgerEvent` list and skips the ledger idempotency check. For `payment_intent.succeeded`, the ledger check catches it. The retry enters `handlePaymentSucceeded`, which finds the duplicate ledger entry (line 506-510), skips transfer recording, but still attempts the state transition.
**Root cause:** This is actually well-handled. The transition's atomic RPC + re-verification (line 271-292) handles concurrent/retry races. If the transition already happened, the race-lost path fires.
**Severity:** NONE. The system handles retries correctly: ledger is idempotent (transaction_reference), transition is atomic (RPC + CAS), side effects are skipped on race loss.
**Pass criteria:** Already correct.
**Status:** CORRECT - idempotent end-to-end.

### Q20. Quote Expiry Not Enforced at Payment Time

**The question:** Quote is sent with `valid_until = 2026-04-10`. Client doesn't accept until April 20. But they pay on April 25. Does the system accept the payment?
**Current behavior:** `acceptQuote` (client-actions.ts line 128) checks `valid_until` and throws if expired. So the client can't accept after expiry. But: if the quote was accepted before expiry, and the client delays payment until after expiry, the PaymentIntent is still valid in Stripe. The webhook processes the payment normally.
**Root cause:** Expiry is checked at acceptance time, not payment time. Once accepted, the event exists and payment can arrive anytime.
**Severity:** LOW. This is actually correct business logic: once a quote is accepted, it's a contract. The expiry prevents late acceptance, not late payment. Late payment is the client's prerogative (they've already committed).
**Pass criteria:** Document that quote expiry gates acceptance only, not payment. Once accepted, the price is locked regardless of when payment arrives.
**Status:** CORRECT - expiry applies to acceptance, not payment.

---

## Triage Summary

| ID  | Severity | Status       | Fix Complexity                                                                            |
| --- | -------- | ------------ | ----------------------------------------------------------------------------------------- |
| Q4  | CRITICAL | FIXED        | LOW (deterministic idempotency key)                                                       |
| Q2  | HIGH     | FIXED        | MEDIUM (recompute payment_status from ledger on refund)                                   |
| Q3  | HIGH     | FIXED        | LOW (route negative adjustments via credit entry type)                                    |
| Q7  | HIGH     | FIXED        | MEDIUM (chef notification on cancellation with unrefunded balance)                        |
| Q13 | HIGH     | FIXED        | MEDIUM (chef notification when fully refunded event stays active)                         |
| Q9  | MEDIUM   | FIXED        | LOW (use cancelled_at instead of updated_at)                                              |
| Q15 | MEDIUM   | MISLEADING   | LOW (rename or filter by category)                                                        |
| Q11 | MEDIUM   | FIXED        | LOW (chef notification on Stripe amount mismatch)                                         |
| Q6  | MEDIUM   | FIXED        | LOW (set quoted_price from PaymentIntent if missing)                                      |
| Q1  | MEDIUM   | CONFUSING    | LOW (document or add UI clarity)                                                          |
| Q8  | LOW-MED  | INCONSISTENT | LOW (document post-close ledger entries)                                                  |
| Q10 | LOW      | MINOR        | LOW (add tenant_id to initial fetch)                                                      |
| Q16 | LOW      | MINOR        | LOW (set received_at from Stripe timestamp)                                               |
| Q17 | LOW      | CORRECT      | N/A (document cash-basis)                                                                 |
| Q18 | MEDIUM   | VERIFIED     | Categories are Zod-enforced enum (17 values). Food = groceries, alcohol, specialty_items. |
| Q5  | LOW      | LATENT       | depends on Q3 (now fixed, review needed)                                                  |
| Q14 | NONE     | CORRECT      | N/A                                                                                       |
| Q19 | NONE     | CORRECT      | N/A                                                                                       |
| Q20 | LOW      | CORRECT      | N/A (document)                                                                            |

---

## Fix Log (completed 2026-04-15)

| ID  | Fix                                                                                                      | File(s)                              |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Q4  | Deterministic idempotency key: `offline_${eventId}_${method}_${amount}` prevents double-click            | `lib/events/transitions.ts`          |
| Q2  | Refund webhook recomputes `payment_status` from ledger (net revenue vs quoted)                           | `app/api/webhooks/stripe/route.ts`   |
| Q3  | Negative adjustments route through `credit` entry type with `is_refund: true`                            | `lib/ledger/append.ts`               |
| Q3  | Adjustment idempotency key also made deterministic (was Date.now())                                      | `lib/ledger/append.ts`               |
| Q7  | Cancellation with unrefunded payments sends chef notification with amount + action link                  | `lib/events/transitions.ts`          |
| Q13 | Full refund on active event sends "consider cancelling" notification to chef                             | `app/api/webhooks/stripe/route.ts`   |
| Q9  | `getCancellationHistory` uses `cancelled_at` (set atomically) instead of driftable `updated_at`          | `lib/events/cancellation-actions.ts` |
| Q11 | Stripe amount mismatch now sends chef notification (was log-only)                                        | `app/api/webhooks/stripe/route.ts`   |
| Q6  | Webhook sets `quoted_price_cents` from PaymentIntent if null (instant-book race guard)                   | `app/api/webhooks/stripe/route.ts`   |
| Q18 | Verified: expense categories are Zod-enforced enum (17 values). Food = groceries/alcohol/specialty_items | N/A (already correct)                |

## Remaining Open

- **Q15** (MEDIUM): `food_cost_percentage` in financial view sums ALL expense categories, not just food. Needs SQL view migration to filter by `groceries`, `alcohol`, `specialty_items` categories. Or rename to "total expense ratio."
- **Q1** (MEDIUM): Outstanding balance formula is correct but confusing next to net revenue. Document or add UI clarity.
- **Q5** (LOW): With Q3 fixed, verify that credit entries are properly excluded from revenue totals in `getTenantFinancialSummary`.
- **Q8** (LOW-MED): Document that ledger entries can be added to completed events (post-close tips/adjustments are normal business).
- **Q10** (LOW): Add tenant_id to initial event fetch in `transitionEvent` for defense-in-depth.
- **Q16** (LOW): Set `received_at` from Stripe PaymentIntent timestamp for accurate monthly bucketing.
- **Q17** (LOW): Document cash-basis accounting model.

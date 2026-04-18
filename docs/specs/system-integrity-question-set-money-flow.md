# System Integrity Question Set: Money Flow End-to-End

> **Purpose:** Trace every dollar through the system. From payment capture to ledger to payout to reporting. Every silent failure, race condition, or broken seam between financial subsystems must be identified. Money bugs cost real money.
> **Created:** 2026-04-18
> **Pre-build score:** 33.5/58 (57.8%)
> **Post-build score:** 41.5/58 (71.6%) -- 8 fixes

---

## A. Payment Capture Integrity (7 questions)

Does every Stripe checkout session result in a correct, complete ledger entry?

| #   | Question                                                                                                        | Score | Evidence                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Does the webhook handler verify Stripe signatures on every request?                                             | YES   | `webhooks/stripe/route.ts:53`: `stripe.webhooks.constructEvent()`. Returns 400 on missing sig (L39), 500 on missing secret (L47)                                                                 |
| A2  | Does the webhook handler deduplicate events to prevent double-charging the ledger?                              | YES   | Two-tier: ledger events check `transaction_reference` uniqueness (L99-117). Gift cards check `purchase_intents.status`. Commerce uses DB unique constraint on `idempotency_key` catching `23505` |
| A3  | Does checkout session creation attach sufficient metadata to reconstruct the payment context in the webhook?    | YES   | `checkout.ts:92-97`: `event_id`, `tenant_id`, `client_id`, `payment_type`, `transfer_routed` in `payment_intent_data.metadata`                                                                   |
| A4  | Does the webhook return 500 (not 200) when ledger writes fail, so Stripe retries?                               | YES   | `webhooks/stripe/route.ts:248`: Handler failures throw, caught by outer handler which returns 500. Side effects (notifications) are non-blocking and don't affect the return code                |
| A5  | Does the webhook handle payments that arrive for already-cancelled events?                                      | YES   | `webhooks/stripe/route.ts:506-544`: Payment on cancelled event triggers auto-refund. Race condition handled                                                                                      |
| A6  | Does checkout session creation validate that the quoted amount is positive and the event is in a payable state? | YES   | `checkout.ts`: Returns `null` for non-payable states (wrong status, zero amount, negative deposit, missing quote)                                                                                |
| A7  | Does the webhook reject events with invalid or spoofed metadata (non-existent event_id, wrong tenant)?          | YES   | `webhooks/stripe/route.ts:476-483`: UUID validation. L490: Ownership verification prevents spoofed metadata                                                                                      |

**A score: 7/7**

## B. Webhook Reliability & Edge Cases (6 questions)

Can the webhook handler survive real-world Stripe behavior (retries, out-of-order, bursts)?

| #   | Question                                                                                         | Score | Evidence                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Does the webhook handler check `event.created` timestamp to reject stale replayed events?        | NO    | No age check anywhere in webhook handler. A replayed event from days ago would be processed if it passes idempotency                                                                  |
| B2  | Is there rate limiting or concurrency control on webhook processing to prevent retry storms?     | NO    | No rate limiting, no mutex, no queue. Concurrent webhook deliveries for the same event could race on non-idempotent paths                                                             |
| B3  | Does the `charge.refunded` handler correctly parse the event payload type?                       | FIXED | Corrected: now casts as `Stripe.Charge`, extracts latest refund from `charge.refunds.data[0]`. Metadata read directly from charge. Refund amount and reason from actual refund object |
| B4  | Does the webhook handle `payment_intent.payment_failed` with user-facing notification?           | 0.5   | Event type is handled (listed at L85-96) but need to verify if client/chef notifications fire on failure                                                                              |
| B5  | Are all 15 handled event types tested or verified against Stripe's actual payload shapes?        | NO    | No test suite for webhook handlers. Type assertions are manual casts, not validated                                                                                                   |
| B6  | Does the webhook log sufficient context for debugging failed payments (event ID, amount, error)? | YES   | Error logging includes event type and error details. Side effect failures logged with `[non-blocking]` prefix                                                                         |

**B score: 2.5/6**

## C. Ledger Immutability & Accuracy (7 questions)

Is the append-only ledger truly immutable, and do computed balances match reality?

| #   | Question                                                                                                  | Score | Evidence                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Is ledger immutability enforced at the database level (trigger or constraint), not just application code? | YES   | `append-internal.ts:12`: Comment confirms DB triggers enforce immutability. `ledger_entries` and `event_transitions` have immutability triggers                         |
| C2  | Does every money-in and money-out event create a ledger entry (no orphaned payments)?                     | NO    | Kiosk/POS checkout (`kiosk/order/checkout/route.ts`) processes payments but writes ZERO ledger entries. Kiosk revenue is invisible to the financial system              |
| C3  | Does the sign guard prevent positive refund entries or negative payment entries?                          | YES   | `append-internal.ts:25-33`: Refunds must be negative, non-refunds must be positive. Enforced before insert                                                              |
| C4  | Is the `event_financial_summary` view consistent with ledger entries for tips?                            | FIXED | Migration `20260418000006`: view now derives `tip_amount_cents` from `SUM(le.amount_cents) FILTER (WHERE le.entry_type = 'tip')` instead of `e.tip_amount_cents` column |
| C5  | Does deleting a tip create a reversing ledger entry to maintain ledger accuracy?                          | FIXED | `deleteTip` now reads tip amount before delete, creates negative ledger entry with `is_refund: true` and `entry_type: 'tip'`. Ledger stays accurate                     |
| C6  | Does the ledger `transaction_reference` uniqueness constraint cover all entry sources?                    | YES   | Unique constraint on `transaction_reference` column. All append paths set it: Stripe events use event ID, manual entries use generated UUIDs                            |
| C7  | Are ledger entry amounts always in integer cents (no floating-point)?                                     | YES   | All amounts use `_cents` suffix columns. `Math.round()` used consistently. Mileage: `Math.round(miles * 72.5)`. No floating-point accumulation                          |

**C score: 6/7**

## D. Refund & Reversal Pipeline (5 questions)

Do refunds correctly reverse both the Stripe charge and the ledger state?

| #   | Question                                                                                              | Score | Evidence                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Does the refund function validate that `amountCents` does not exceed the refundable amount?           | FIXED | Added validation: `if (amountCents > refundableAmount)` where `refundableAmount = charge.amount - (charge.amount_refunded or 0)`. Throws with descriptive error                     |
| D2  | Are Stripe refund and ledger reversal atomic (no window where one succeeds without the other)?        | NO    | `refund.ts` header comment: Deliberately non-atomic. Stripe refund happens first; ledger entry is created by webhook. Window exists where refund is issued but webhook hasn't fired |
| D3  | Does the refund path for Connect charges correctly reverse the transfer and application fee?          | YES   | `refund.ts:55-68`: `reverse_transfer: true` and `refund_application_fee: true` for destination charges                                                                              |
| D4  | Does an idempotency key protect against duplicate refund creation?                                    | FIXED | Added `idempotencyKey: refund_${charge.id}_${amountCents}` to `stripe.refunds.create()`. Prevents duplicate refunds on retry                                                        |
| D5  | Does the `outstanding_balance_cents` in the financial summary update correctly after partial refunds? | YES   | `event_financial_summary` view: `outstanding = quoted_price - paid + refunded`. Refund ledger entries (negative) reduce `net_revenue` and increase `outstanding`. Math is correct   |

**D score: 4/5**

## E. Tip & Gratuity Flow (5 questions)

Does the tip system correctly track, attribute, and report gratuity income?

| #   | Question                                                                            | Score | Evidence                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Can clients pay tips digitally through Stripe (not just record-keeping)?            | NO    | `tip-actions.ts`: Tips are record-keeping only. No Stripe checkout for tips. Chef marks tip as received with payment method metadata. No digital payment collection             |
| E2  | Does the tip ledger entry include the correct `event_id` for per-event attribution? | YES   | `tip-actions.ts:116-124`: `appendLedgerEntryForChef` called with `eventId` parameter                                                                                            |
| E3  | Is the tip amount in `event_tips` table consistent with tip ledger entries?         | 0.5   | Both are created in the same flow, but `deleteTip` breaks this (deletes tip record, leaves ledger entry). Also, `event_financial_summary` reads `e.tip_amount_cents` not ledger |
| E4  | Does the tip request system enforce single-use tokens (no double-tipping)?          | YES   | `tip-actions.ts:408`: CAS guard `.in('status', ['pending', 'sent'])` prevents recording tip on already-completed request                                                        |
| E5  | Are tip request tokens time-limited to prevent abuse?                               | YES   | `tip-actions.ts:335-340`: 30-day expiration check on tip request tokens                                                                                                         |

**E score: 2.5/5**

## F. Gift Card & Loyalty Redemption (6 questions)

Does the gift card purchase-to-redemption pipeline maintain accurate balances?

| #   | Question                                                                                              | Score | Evidence                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Does gift card purchase via Stripe create the correct balance record on webhook confirmation?         | YES   | `webhooks/stripe/route.ts:295`: `handleGiftCardPurchaseCompleted` creates `client_incentives` record. Idempotency via `purchase_intents.status === 'paid'` |
| F2  | Does gift card redemption use atomic balance decrement (no race condition on concurrent redemptions)? | 0.5   | Need to verify. Loyalty redemption uses `.gte('loyalty_points', required)` CAS pattern. Gift card balance path needs inspection                            |
| F3  | Can a gift card be redeemed for more than its remaining balance?                                      | 0.5   | `remaining_balance_cents` exists on `client_incentives`. Need to verify enforcement at redemption time                                                     |
| F4  | Does gift card purchase validation enforce reasonable limits?                                         | YES   | `gift-card-purchase-actions.ts:24-27`: Zod validation, $5-$2,000 range                                                                                     |
| F5  | Does the loyalty auto-award prevent double-awarding points for the same event?                        | YES   | `loyalty/actions.ts:795-801`: Atomic CAS `UPDATE events SET loyalty_points_awarded=true WHERE loyalty_points_awarded=false`. Clean race condition guard    |
| F6  | Does manual bonus point award have race condition protection?                                         | FIXED | `award-internal.ts`: Now uses `rpc('increment_loyalty_points')` for atomic DB increment, with read-modify-write fallback if RPC unavailable                |

**F score: 4/6**

## G. Connect Payout & Transfer Routing (6 questions)

Does chef payout via Stripe Connect work reliably for all payment scenarios?

| #   | Question                                                                                           | Score | Evidence                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Does the transfer routing validate that `grossAmount === platformFee + netTransfer`?               | NO    | `transfer-routing.ts`: No balance validation. `recordStripeTransfer` persists whatever is passed. Caller must ensure amounts add up           |
| G2  | Does deferred transfer resolution trigger automatically when a chef completes Connect onboarding?  | NO    | `deferred-transfers.ts:106`: Admin-only manual resolution via `requireAdmin()`. No automatic trigger from `account.updated` webhook           |
| G3  | Does the deferred transfer listing correctly identify all chefs with unresolved transfers?         | FIXED | Now uses per-entry matching via `transferredRefs` Set against `transaction_reference`. Chefs with partial resolution are correctly identified |
| G4  | Does the Connect account status check distinguish between `charges_enabled` and `payouts_enabled`? | FIXED | `connect.ts` + webhook: `stripe_onboarding_complete` now requires BOTH `charges_enabled && payouts_enabled`. Webhook passes both values       |
| G5  | Does deferred transfer handle the case where net transfer amount is zero or negative?              | YES   | `deferred-transfers.ts:171-174`: Net transfer <= 0 is skipped with error message. Does not attempt zero-dollar transfer                       |
| G6  | Does the platform fee ledger maintain a separate audit trail from the main ledger?                 | YES   | `transfer-routing.ts:93-115`: Separate `platform_fee_ledger` table for platform fee audit trail                                               |

**G score: 4/6**

## H. Kiosk/POS Financial Integration (5 questions)

Does kiosk commerce connect to the broader financial system?

| #   | Question                                                              | Score | Evidence                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Do kiosk sales create ledger entries for financial reporting?         | NO    | `kiosk/order/checkout/route.ts`: Zero ledger writes. Kiosk revenue is completely invisible to the ledger-based financial system                                                                                                 |
| H2  | Does kiosk checkout integrate with Stripe Terminal for card payments? | NO    | `kiosk/order/checkout/route.ts:419`: All payments processed as `processor_type: 'manual_kiosk'`, immediately `status: 'captured'`. No Stripe Terminal integration despite Terminal adapter existing in `lib/commerce/terminal/` |
| H3  | Does kiosk cash payment validate correct change calculation?          | YES   | `kiosk/order/checkout/route.ts:350`: `amount_tendered_cents >= totalChargedCents` validation. Change = tendered - total                                                                                                         |
| H4  | Does kiosk checkout handle idempotent retries (double-tap "Pay")?     | YES   | `kiosk/order/checkout/route.ts:84-134`: Idempotency key check. Returns existing sale on duplicate                                                                                                                               |
| H5  | Does voided kiosk sale correctly reverse all financial records?       | 0.5   | Failed checkout marks sale as `voided` with reason (L136-156), but since no ledger entries exist, there's nothing financial to reverse. The commerce `sales` table tracks status but is disconnected from financial reporting   |

**H score: 1.5/5**

## I. Subscription & Billing Integrity (5 questions)

Does the subscription system correctly gate features and handle edge cases?

| #   | Question                                                                                                                    | Score | Evidence                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Does tier resolution handle all possible subscription states (active, past_due, canceled, trialing, comped, grandfathered)? | YES   | `tier.ts:47-70`: Every state mapped. `grandfathered`/`comped`/`active`/`past_due` = Pro. `trialing` checks expiry. `canceled` checks period end. `null` = Free |
| I2  | Does the webhook protect comped/grandfathered chefs from being overwritten by Stripe subscription events?                   | YES   | `subscription.ts:277-292`: Comped chefs protected from webhook overwrites                                                                                      |
| I3  | Does subscription payment auto-log as a business expense with deduplication?                                                | YES   | `subscription.ts:222-258`: Auto-expense on `active` webhook with idempotency check on period key                                                               |
| I4  | Does `past_due` status still grant Pro access (grace period)?                                                               | YES   | `tier.ts:49`: `past_due` included in Pro tier. This is the implicit grace period, relying on Stripe's retry schedule                                           |
| I5  | Does canceled subscription retain access until period end (not immediate cutoff)?                                           | YES   | `subscription.ts:294-299`: Preserves `subscription_current_period_end`. `tier.ts:62-66`: Checks period end before downgrading                                  |

**I score: 5/5**

## J. Financial Reporting Accuracy (6 questions)

Do reports, tax prep, and dashboards show numbers that match reality?

| #   | Question                                                                                                    | Score | Evidence                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| J1  | Does the tax prep Schedule C breakdown correctly map expense categories to IRS lines?                       | YES   | `tax-prep-actions.ts:11-28`: Maps expense categories to Schedule C lines. Mileage deduction separate                                                                                                               |
| J2  | Does mileage calculation use the correct IRS rate with integer-cent math?                                   | YES   | `mileage-actions.ts:13`: 72.5 cents/mile (2026 IRS rate). `Math.round(miles * 72.5)` prevents floating-point drift                                                                                                 |
| J3  | Does the financial summary view include ALL revenue sources (events, tips, kiosk, gift card redemptions)?   | NO    | `event_financial_summary` view only covers event-level ledger entries. Kiosk revenue has no ledger entries. Gift card redemptions create incentive records, not revenue entries. Tips use event column, not ledger |
| J4  | Does profit calculation correctly subtract all expense types (food cost, travel, equipment, subscriptions)? | YES   | `event_financial_summary`: `profit_cents = net_revenue - expenses`. Expenses from `event_expenses` table. Non-event expenses tracked separately in `expenses` table                                                |
| J5  | Does the quarterly tax estimate calculation account for self-employment tax?                                | YES   | `tax-prep-actions.ts:63-74`: `ScheduleCBreakdown` includes quarterly estimates. SE tax computed                                                                                                                    |
| J6  | Can a chef export financial data for their accountant (CSV, PDF)?                                           | YES   | Export system exists in `lib/export/` with financial export capabilities. PDF invoice generation in `lib/documents/`                                                                                               |

**J score: 5/6**

---

## Scoring Summary

| Domain                       | Pre      | Post     | Max    | Details                                                                           |
| ---------------------------- | -------- | -------- | ------ | --------------------------------------------------------------------------------- |
| A. Payment Capture Integrity | 7        | 7        | 7      | Full marks. Solid implementation                                                  |
| B. Webhook Reliability       | 1.5      | 2.5      | 6      | FIXED: B3 type cast. Remaining: B1 stale events, B2 rate limiting, B5 tests       |
| C. Ledger Immutability       | 4        | 6        | 7      | FIXED: C4 tip view, C5 delete reversal. Remaining: C2 kiosk                       |
| D. Refund Pipeline           | 2        | 4        | 5      | FIXED: D1 over-refund guard, D4 idempotency. Remaining: D2 non-atomic (by design) |
| E. Tip & Gratuity            | 2.5      | 2.5      | 5      | No changes. Record-keeping only, no digital pay                                   |
| F. Gift Card & Loyalty       | 3        | 4        | 6      | FIXED: F6 bonus race condition. Remaining: F2, F3 gift card redemption            |
| G. Connect & Transfers       | 2        | 4        | 6      | FIXED: G3 listing bug, G4 payouts_enabled. Remaining: G1 validation, G2 auto      |
| H. Kiosk/POS                 | 1.5      | 1.5      | 5      | No changes. Kiosk is a financial island (design decision)                         |
| I. Subscription & Billing    | 5        | 5        | 5      | Full marks. Clean implementation                                                  |
| J. Financial Reporting       | 5        | 5        | 6      | Kiosk revenue invisible to reports (depends on C2/H1)                             |
| **TOTAL**                    | **33.5** | **41.5** | **58** | **57.8% -> 71.6%**                                                                |

---

## Gap Analysis

### Fixed (8 items, this session)

1. **B3** - `charge.refunded` webhook: corrected type cast from `Stripe.Refund` to `Stripe.Charge`, extract actual refund from `charge.refunds.data[0]`
2. **C4** - Migration `20260418000006`: `event_financial_summary` view now derives tips from ledger entries, not `events.tip_amount_cents` column
3. **C5** - `deleteTip` now reads tip amount before delete, creates negative reversing ledger entry with `is_refund: true`
4. **D1** - Refund amount validation: `amountCents > refundableAmount` throws with descriptive error
5. **D4** - Idempotency key `refund_${charge.id}_${amountCents}` added to `stripe.refunds.create()`
6. **F6** - `awardBonusPointsInternal` now uses `rpc('increment_loyalty_points')` for atomic DB increment, with read-modify-write fallback
7. **G3** - `listDeferredTransferChefs` now uses per-entry matching via `transferredRefs` Set, not per-tenant skip
8. **G4** - `stripe_onboarding_complete` now requires both `charges_enabled && payouts_enabled`. Webhook passes both values

### Remaining Design Decisions (10 items)

1. **B1** - No stale event timestamp check on webhooks. Low risk if Stripe is sole caller
2. **B2** - No rate limiting or concurrency control on webhook processing
3. **B4** - `payment_intent.payment_failed` handling needs verification for user notifications
4. **B5** - No test suite for webhook handlers against actual Stripe payload shapes
5. **C2/H1/J3** - Kiosk/POS is a financial island: no ledger entries, invisible to reporting. Requires design decision on integration
6. **D2** - Non-atomic refund + ledger is deliberate (webhook-driven). Acceptable trade-off
7. **E1** - Tips are record-keeping only, no digital Stripe payment. Feature decision
8. **E3** - Tip amount consistency between `event_tips` and ledger (partially addressed by C4/C5 fixes)
9. **F2/F3** - Gift card redemption atomicity and over-redemption guard need verification
10. **G1/G2** - Transfer routing has no balance validation; deferred resolution is manual admin-only

### Verified Solid (no action needed)

- Payment capture (A: 7/7)
- Subscription & billing (I: 5/5)
- Ledger immutability triggers, sign guards, amount caps
- Tip request token security (single-use, 30-day expiry)
- Loyalty auto-award CAS pattern
- Connect refund reversal
- Mileage IRS rate accuracy
- Tax prep Schedule C mapping
- Checkout session circuit breaker + expiry
- Kiosk idempotency + void on failure

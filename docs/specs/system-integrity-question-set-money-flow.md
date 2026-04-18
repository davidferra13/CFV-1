# System Integrity Question Set: Money Flow End-to-End

> **Purpose:** Trace every dollar through the system. From payment capture to ledger to payout to reporting. Every silent failure, race condition, or broken seam between financial subsystems must be identified. Money bugs cost real money.
> **Created:** 2026-04-18
> **Pre-build score:** TBD
> **Post-build score:** TBD

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

| #   | Question                                                                                         | Score | Evidence                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Does the webhook handler check `event.created` timestamp to reject stale replayed events?        | NO    | No age check anywhere in webhook handler. A replayed event from days ago would be processed if it passes idempotency                                                                                        |
| B2  | Is there rate limiting or concurrency control on webhook processing to prevent retry storms?     | NO    | No rate limiting, no mutex, no queue. Concurrent webhook deliveries for the same event could race on non-idempotent paths                                                                                   |
| B3  | Does the `charge.refunded` handler correctly parse the event payload type?                       | NO    | `webhooks/stripe/route.ts:1211`: Casts `event.data.object` as `Stripe.Refund` but `charge.refunded` delivers a `Stripe.Charge`. Works at runtime by coincidence but semantics are wrong for partial refunds |
| B4  | Does the webhook handle `payment_intent.payment_failed` with user-facing notification?           | 0.5   | Event type is handled (listed at L85-96) but need to verify if client/chef notifications fire on failure                                                                                                    |
| B5  | Are all 15 handled event types tested or verified against Stripe's actual payload shapes?        | NO    | No test suite for webhook handlers. Type assertions are manual casts, not validated                                                                                                                         |
| B6  | Does the webhook log sufficient context for debugging failed payments (event ID, amount, error)? | YES   | Error logging includes event type and error details. Side effect failures logged with `[non-blocking]` prefix                                                                                               |

**B score: 1.5/6**

## C. Ledger Immutability & Accuracy (7 questions)

Is the append-only ledger truly immutable, and do computed balances match reality?

| #   | Question                                                                                                  | Score | Evidence                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Is ledger immutability enforced at the database level (trigger or constraint), not just application code? | YES   | `append-internal.ts:12`: Comment confirms DB triggers enforce immutability. `ledger_entries` and `event_transitions` have immutability triggers                             |
| C2  | Does every money-in and money-out event create a ledger entry (no orphaned payments)?                     | NO    | Kiosk/POS checkout (`kiosk/order/checkout/route.ts`) processes payments but writes ZERO ledger entries. Kiosk revenue is invisible to the financial system                  |
| C3  | Does the sign guard prevent positive refund entries or negative payment entries?                          | YES   | `append-internal.ts:25-33`: Refunds must be negative, non-refunds must be positive. Enforced before insert                                                                  |
| C4  | Is the `event_financial_summary` view consistent with ledger entries for tips?                            | NO    | View uses `e.tip_amount_cents` (event column) for tips, not ledger tip entries. If tip is recorded in ledger but event column not updated (or vice versa), summary is wrong |
| C5  | Does deleting a tip create a reversing ledger entry to maintain ledger accuracy?                          | NO    | `tip-actions.ts:135`: `deleteTip` deletes from `event_tips` table but creates NO reversing ledger entry. Ledger becomes permanently overstated                              |
| C6  | Does the ledger `transaction_reference` uniqueness constraint cover all entry sources?                    | YES   | Unique constraint on `transaction_reference` column. All append paths set it: Stripe events use event ID, manual entries use generated UUIDs                                |
| C7  | Are ledger entry amounts always in integer cents (no floating-point)?                                     | YES   | All amounts use `_cents` suffix columns. `Math.round()` used consistently. Mileage: `Math.round(miles * 72.5)`. No floating-point accumulation                              |

**C score: 4/7**

## D. Refund & Reversal Pipeline (5 questions)

Do refunds correctly reverse both the Stripe charge and the ledger state?

| #   | Question                                                                                              | Score | Evidence                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Does the refund function validate that `amountCents` does not exceed the refundable amount?           | NO    | `refund.ts`: No validation that `amountCents <= charge.amount - charge.amount_refunded`. Over-refund would succeed at Stripe but create incorrect ledger entry                      |
| D2  | Are Stripe refund and ledger reversal atomic (no window where one succeeds without the other)?        | NO    | `refund.ts` header comment: Deliberately non-atomic. Stripe refund happens first; ledger entry is created by webhook. Window exists where refund is issued but webhook hasn't fired |
| D3  | Does the refund path for Connect charges correctly reverse the transfer and application fee?          | YES   | `refund.ts:55-68`: `reverse_transfer: true` and `refund_application_fee: true` for destination charges                                                                              |
| D4  | Does an idempotency key protect against duplicate refund creation?                                    | NO    | `refund.ts`: No `idempotency_key` on `stripe.refunds.create()`. Double-click or retry could create duplicate refunds                                                                |
| D5  | Does the `outstanding_balance_cents` in the financial summary update correctly after partial refunds? | YES   | `event_financial_summary` view: `outstanding = quoted_price - paid + refunded`. Refund ledger entries (negative) reduce `net_revenue` and increase `outstanding`. Math is correct   |

**D score: 2/5**

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
| F6  | Does manual bonus point award have race condition protection?                                         | NO    | `loyalty/actions.ts`: `awardBonusPoints` reads `client.loyalty_points`, adds in JS, writes back. Two concurrent bonus awards = lost update                 |

**F score: 3/6**

## G. Connect Payout & Transfer Routing (6 questions)

Does chef payout via Stripe Connect work reliably for all payment scenarios?

| #   | Question                                                                                           | Score | Evidence                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Does the transfer routing validate that `grossAmount === platformFee + netTransfer`?               | NO    | `transfer-routing.ts`: No balance validation. `recordStripeTransfer` persists whatever is passed. Caller must ensure amounts add up                                         |
| G2  | Does deferred transfer resolution trigger automatically when a chef completes Connect onboarding?  | NO    | `deferred-transfers.ts:106`: Admin-only manual resolution via `requireAdmin()`. No automatic trigger from `account.updated` webhook                                         |
| G3  | Does the deferred transfer listing correctly identify all chefs with unresolved transfers?         | NO    | `deferred-transfers.ts:66`: `listDeferredTransferChefs` skips any tenant with ANY transfers. A chef with one transferred and one untransferred payment would be missed      |
| G4  | Does the Connect account status check distinguish between `charges_enabled` and `payouts_enabled`? | NO    | `connect.ts:166`: DB stores single boolean `stripe_onboarding_complete`. A Stripe account where charges work but payouts don't would be incorrectly reported as fully ready |
| G5  | Does deferred transfer handle the case where net transfer amount is zero or negative?              | YES   | `deferred-transfers.ts:171-174`: Net transfer <= 0 is skipped with error message. Does not attempt zero-dollar transfer                                                     |
| G6  | Does the platform fee ledger maintain a separate audit trail from the main ledger?                 | YES   | `transfer-routing.ts:93-115`: Separate `platform_fee_ledger` table for platform fee audit trail                                                                             |

**G score: 2/6**

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

| Domain                       | Score    | Max    | Details                                                                     |
| ---------------------------- | -------- | ------ | --------------------------------------------------------------------------- |
| A. Payment Capture Integrity | 7        | 7      | Full marks. Solid implementation                                            |
| B. Webhook Reliability       | 1.5      | 6      | No stale event check, no rate limiting, type bug on charge.refunded         |
| C. Ledger Immutability       | 4        | 7      | Kiosk bypasses ledger, tip/summary inconsistency, deleteTip no reversal     |
| D. Refund Pipeline           | 2        | 5      | No over-refund guard, non-atomic, no idempotency key                        |
| E. Tip & Gratuity            | 2.5      | 5      | Record-keeping only (no digital pay), delete breaks ledger                  |
| F. Gift Card & Loyalty       | 3        | 6      | Bonus points race condition, gift card redemption unverified                |
| G. Connect & Transfers       | 2        | 6      | Manual-only deferred resolution, listing bug, charges/payouts conflated     |
| H. Kiosk/POS                 | 1.5      | 5      | Zero ledger integration, no Terminal, disconnected from financial reporting |
| I. Subscription & Billing    | 5        | 5      | Full marks. Clean implementation                                            |
| J. Financial Reporting       | 5        | 6      | Kiosk revenue invisible to reports                                          |
| **TOTAL**                    | **33.5** | **58** | **57.8%**                                                                   |

---

## Gap Analysis

### Critical Money Bugs (fix now, code changes)

1. **C5** - `deleteTip` creates no reversing ledger entry. Ledger permanently overstated after tip deletion
2. **C4** - `event_financial_summary` view reads `e.tip_amount_cents` (event column) instead of summing tip-type ledger entries. Inconsistent data source
3. **D1** - No validation that refund amount does not exceed refundable amount. Over-refund possible
4. **D4** - No idempotency key on `stripe.refunds.create()`. Duplicate refunds possible on retry
5. **B3** - `charge.refunded` webhook casts payload as `Stripe.Refund` instead of `Stripe.Charge`. Type bug, works by coincidence
6. **F6** - `awardBonusPoints` has read-modify-write race condition. Concurrent bonus awards = lost points
7. **G3** - `listDeferredTransferChefs` skips chefs who have ANY transfers, missing those with partial resolution
8. **G4** - Single `stripe_onboarding_complete` boolean conflates `charges_enabled` and `payouts_enabled`

### High-Value Improvements (design decisions)

1. **C2/H1/J3** - Kiosk/POS is a financial island. No ledger entries, no reporting integration. Requires design decision on how kiosk revenue enters the ledger
2. **G2** - Deferred transfer resolution is admin-only manual. Could auto-trigger on `account.updated` webhook
3. **E1** - Tips are record-keeping only, no digital payment collection. Stripe checkout for tips would be a feature decision
4. **B1/B2** - No stale event rejection or rate limiting on webhooks. Low-priority if Stripe is the only caller
5. **D2** - Non-atomic refund + ledger is deliberate (webhook-driven). Acceptable if webhook delivery is reliable
6. **H2** - Stripe Terminal adapter exists but kiosk doesn't use it. Feature gap

### Verified Solid (no action needed)

- Payment capture (A: 7/7)
- Subscription & billing (I: 5/5)
- Ledger immutability triggers, sign guards, amount caps
- Tip request token security (single-use, 30-day expiry)
- Loyalty auto-award CAS pattern
- Connect refund reversal
- Mileage IRS rate accuracy
- Tax prep Schedule C mapping

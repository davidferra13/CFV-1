# System Integrity Question Set: Financial Operations & Ledger

> Sweep 12 of N. 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-18. Methodology: code reading + agent exploration + grep.
> **This sweep targets the highest-leverage surface: real money flows.**

## Summary

- **Score: 43/50 (86%) -> 46/50 (92%) after fixes**
- **Critical fixes applied: 4** (3 bugs that would cause production failures)
- **Remaining gaps: 4** (documented, no code fix possible without migration or design decision)

---

## Domain 1: Ledger Integrity (5/5)

| #   | Question                                                           | Result | Evidence                                                                                                    |
| --- | ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | All ledger appends validate amount_cents is integer                | PASS   | `lib/ledger/append-internal.ts:19` - `Number.isInteger()`                                                   |
| 2   | Refund entries enforced negative, non-refunds positive (app layer) | PASS   | `append-internal.ts:25-33` - discriminated sign check                                                       |
| 3   | DB CHECK constraint enforces sign convention                       | PASS   | `ledger_refund_negative`: `(is_refund=true AND amount_cents < 0) OR (is_refund=false AND amount_cents > 0)` |
| 4   | Max entry cap prevents catastrophic amounts                        | PASS   | `append-internal.ts:37-39` - $999,999.99 cap                                                                |
| 5   | Idempotency via transaction_reference unique index                 | PASS   | Partial unique index + 23505 error catch at `append-internal.ts:66`                                         |

## Domain 2: Immutability (4/5 -> 5/5 after fix)

| #   | Question                                         | Result    | Evidence                                                                                                                       |
| --- | ------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 6   | DB triggers prevent UPDATE on ledger_entries     | PASS      | Migration 20260215000003:718-731                                                                                               |
| 7   | DB triggers prevent DELETE on ledger_entries     | PASS      | Same migration, both triggers                                                                                                  |
| 8   | Voiding creates counter-entry, not update/delete | PASS      | `offline-payment-actions.ts:277` - comment: "voiding = appending a counter-entry"                                              |
| 9   | Void counter-entry uses correct negative sign    | **FIXED** | Was FAIL: `amount_cents: original.amount_cents` (positive) with `is_refund: true`. Fixed to `-Math.abs(original.amount_cents)` |
| 10  | Platform fee ledger has immutability triggers    | PASS      | `prevent_platform_fee_ledger_mutation` trigger in schema                                                                       |

## Domain 3: Stripe Webhooks (4/5 -> 5/5 after fix)

| #   | Question                                              | Result    | Evidence                                                                                                                                                                                |
| --- | ----------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Signature verification before processing              | PASS      | `app/api/webhooks/stripe/route.ts:53`                                                                                                                                                   |
| 12  | Idempotency check prevents duplicate processing       | PASS      | `route.ts:98-117` - transaction_reference lookup                                                                                                                                        |
| 13  | charge.refunded creates negative ledger entry         | PASS      | `route.ts:1233` - `-Math.abs(refund.amount)`                                                                                                                                            |
| 14  | dispute.funds_withdrawn creates negative ledger entry | **FIXED** | Was FAIL: `amount_cents: dispute.amount` (positive) with `is_refund: true`. Fixed to `-Math.abs(dispute.amount)`. Would have caused infinite Stripe webhook retry loops on any dispute. |
| 15  | Auto-refund on payment for cancelled events           | PASS      | `route.ts:506-545`                                                                                                                                                                      |

## Domain 4: Payment Recording (4/5 -> 5/5 after fix)

| #   | Question                                             | Result    | Evidence                                                                                                                                                                                   |
| --- | ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16  | Offline payments have deterministic idempotency keys | PASS      | `offline-payment-actions.ts:104` - `offline_${eventId}_${amountCents}_...`                                                                                                                 |
| 17  | Payment import uses same validation as normal append | **FIXED** | Was FAIL: direct `.insert()` bypassed integer check, sign guard, max cap, idempotency. Fixed to route through `appendLedgerEntryInternal()` with proper sign handling and idempotency key. |
| 18  | Commerce payments have overpayment guard             | PASS      | `payment-actions.ts:66-83`                                                                                                                                                                 |
| 19  | Commerce refunds have exceeds-payment guard          | PASS      | `refund-actions.ts:69-85`                                                                                                                                                                  |
| 20  | All payment recording derives tenant from session    | PASS      | `requireChef()` at top of all payment actions                                                                                                                                              |

## Domain 5: Financial Views (3/5)

| #   | Question                                         | Result   | Evidence                                                                                                                                                                  |
| --- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21  | event_financial_summary computes from ledger     | PASS     | Correlated subqueries against `ledger_entries`                                                                                                                            |
| 22  | outstanding_balance accounts for refunds         | PASS     | `quoted - paid + refunded` (migration 20260417000005)                                                                                                                     |
| 23  | payment_status is derived, not stored            | **FAIL** | View passes through `e.payment_status` from events table. Stored by Stripe webhook, never updated by offline payment path. Offline-paid events show stale payment_status. |
| 24  | tip_amount_cents derived from ledger, not stored | **FAIL** | View reads `e.tip_amount_cents` from events table. `recordTip()` writes to ledger but doesn't update events column. Close-out data shows stale tips.                      |
| 25  | Views filter soft-deleted events                 | PASS     | `WHERE e.deleted_at IS NULL` in view                                                                                                                                      |

**F23**: `payment_status` should be computed in the view from ledger entries (e.g., CASE WHEN total_paid >= quoted THEN 'paid' WHEN total_paid > 0 THEN 'partial' ELSE 'unpaid' END). Requires view migration + removing stored column reliance.

**F24**: `tip_amount_cents` should be computed as a subquery on ledger entries with `entry_type = 'tip'`, or `recordTip` should update `events.tip_amount_cents`. Either approach requires a migration or code change in the tip flow.

## Domain 6: Revenue & P&L (4/5)

| #   | Question                                    | Result   | Evidence                                                                                                    |
| --- | ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| 26  | Tips separated from revenue in computations | PASS     | `compute.ts:81-82` - tips accumulated separately                                                            |
| 27  | Expenses computed from expenses table       | PASS     | View subquery on `expenses` table                                                                           |
| 28  | P&L handles empty data gracefully           | PASS     | COALESCE(0) in view, zero-check CASE in profit_margin                                                       |
| 29  | Tenant summary is tenant-scoped             | PASS     | `.eq('tenant_id', tenantId)` on all queries                                                                 |
| 30  | No silent truncation of large result sets   | **FAIL** | `compute.ts` caps at 50,000 rows on fallback path. High-volume tenants silently lose data from P&L reports. |

**F30**: The 50K limit exists in the JS fallback path for `getTenantFinancialSummary()` and `computeProfitAndLoss()`. The RPC path has no limit. Fix: increase limit or paginate, or make RPC path the only path.

## Domain 7: Quote-to-Payment Flow (5/5)

| #   | Question                                           | Result | Evidence                                                     |
| --- | -------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 31  | Quote acceptance copies price to event             | PASS   | Migration 20260401000153                                     |
| 32  | Drift guard prevents price change after acceptance | PASS   | Migration 20260330000045 - DB trigger                        |
| 33  | PaymentIntent amount matches quoted_price          | PASS   | Created from `quoted_price_cents` or `deposit_amount_cents`  |
| 34  | Webhook detects amount mismatches                  | PASS   | `route.ts:572-616` - comparison + chef notification          |
| 35  | Deposit calculation uses correct math              | PASS   | `deposit-actions.ts:79` - `Math.round((quoted * pct) / 100)` |

## Domain 8: Commerce/POS (5/5)

| #   | Question                                     | Result | Evidence                                       |
| --- | -------------------------------------------- | ------ | ---------------------------------------------- |
| 36  | Checkout has register session validation     | PASS   | Register open check before AND during checkout |
| 37  | Split tender total must equal amount due     | PASS   | Total validation in checkout flow              |
| 38  | Tax failure auto-voids sale                  | PASS   | Tax service unavailability triggers auto-void  |
| 39  | Commerce payments auto-create ledger entries | PASS   | DB trigger `commerce_payment_to_ledger`        |
| 40  | Commerce refunds auto-create ledger entries  | PASS   | DB trigger `commerce_refund_to_ledger`         |

## Domain 9: Reconciliation (3/5 -> 4/5 after fix)

| #   | Question                                      | Result    | Evidence                                                                                                                                                                              |
| --- | --------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 41  | Commerce recon compares payments to ledger    | PASS      | `reconciliation-actions.ts` - daily comparison                                                                                                                                        |
| 42  | Reconciliation handles refund signs correctly | **FIXED** | Was FAIL: `sum - (amount_cents)` where amount_cents is already negative = double-count. Fixed: removed special refund handling since negative amounts naturally subtract when summed. |
| 43  | Platform reconciliation exists for admin      | PASS      | `lib/admin/reconciliation-actions.ts`                                                                                                                                                 |
| 44  | Stripe-to-ledger reconciliation exists        | **FAIL**  | No automated process compares Stripe charges/refunds to ledger entries. Detection only via webhook amount mismatch warning.                                                           |
| 45  | Reconciliation is tenant-scoped               | PASS      | `.eq('tenant_id', ...)` on all recon queries                                                                                                                                          |

**F44**: No Stripe-to-ledger reconciliation. If a webhook is lost (Stripe retries exhausted), the ledger will be permanently missing that entry. Fix: scheduled job that queries Stripe API for recent charges and compares to ledger entries.

## Domain 10: Fee & Rounding Safety (5/5)

| #   | Question                                            | Result | Evidence                                                             |
| --- | --------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| 46  | Platform fee computed with DB-constrained pct       | PASS   | `chefs_platform_fee_percent_range` (0-100), `transfer-routing.ts:51` |
| 47  | Fee refunds tracked in platform_fee_ledger          | PASS   | `route.ts:1629` - `fee_refund` entries                               |
| 48  | Tip distribution handles remainder pennies          | PASS   | `tip-actions.ts:390-398` - `Math.floor` + last-entry remainder       |
| 49  | Promotion discounts use Math.floor (favor merchant) | PASS   | `promotion-engine.ts:69,126`                                         |
| 50  | Financial amounts never use floating point storage  | PASS   | All `*_cents` columns are `integer` or `bigint` in schema            |

---

## Fixes Applied This Sweep

### Fix 1: Dispute Funds Withdrawn Sign Bug (Q14) - CRITICAL

- **File**: `app/api/webhooks/stripe/route.ts:1485`
- **Bug**: `amount_cents: dispute.amount` (positive) with `is_refund: true`
- **Impact**: DB constraint rejects insert, webhook returns 500, Stripe retries indefinitely. Every dispute fund withdrawal would trigger an infinite retry loop.
- **Fix**: Changed to `-Math.abs(dispute.amount)`

### Fix 2: Void Offline Payment Sign Bug (Q9) - CRITICAL

- **File**: `lib/events/offline-payment-actions.ts:334`
- **Bug**: `amount_cents: original.amount_cents` (positive) with `is_refund: true`
- **Impact**: Direct insert hits DB constraint `ledger_refund_negative`, void fails. Chef cannot void any offline payment.
- **Fix**: Changed to `-Math.abs(original.amount_cents)`

### Fix 3: Payment Import Validation Bypass (Q17) - HIGH

- **File**: `lib/ledger/payment-import-actions.ts:124-138`
- **Bug**: Direct `.insert()` bypassed all validation (integer check, sign guard, max cap, idempotency)
- **Impact**: Malformed imports could corrupt financial state (non-integer amounts, wrong signs, no dedup)
- **Fix**: Routed through `appendLedgerEntryInternal()` with proper sign handling and deterministic idempotency key

### Fix 4: Commerce Reconciliation Double-Count (Q42) - MEDIUM

- **File**: `lib/commerce/reconciliation-actions.ts:277-281`
- **Bug**: `sum - (amount_cents)` where refund amount_cents is already negative = double-add
- **Impact**: Reconciliation reports show inflated ledger totals, masking real variances
- **Fix**: Removed special refund branch; negative amounts naturally subtract when summed

---

## Remaining Action Items

| ID  | Domain | Issue                                | Priority | Fix Path                                                               |
| --- | ------ | ------------------------------------ | -------- | ---------------------------------------------------------------------- |
| F23 | Views  | payment_status stored, not derived   | High     | Compute in view: CASE WHEN total_paid >= quoted THEN 'paid'...         |
| F24 | Views  | tip_amount_cents stored, not derived | Medium   | Compute from ledger tip entries in view, or update events on recordTip |
| F30 | P&L    | 50K row limit silently truncates     | Low      | Paginate or raise limit; RPC path has no limit                         |
| F44 | Recon  | No Stripe-to-ledger reconciliation   | Medium   | Scheduled job comparing Stripe API data to ledger                      |

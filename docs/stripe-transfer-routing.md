# Stripe Transfer Routing

## What Changed

Client payments now route directly to the chef's Stripe Connect account using **destination charges**. Previously, all money stayed in the platform's Stripe account with no mechanism to pay chefs.

## Architecture

### Destination Charges Pattern

When a client pays (via PaymentIntent or Checkout Session), the payment includes:

- `transfer_data.destination` — the chef's connected Stripe account ID
- `application_fee_amount` — the platform's commission (deducted before transfer)

Stripe automatically creates a transfer at charge time and auto-reverses it on refunds.

### New Database Tables

**`stripe_transfers`** — Tracks every transfer to connected accounts:

- Links to tenant, event, and Stripe IDs (transfer, payment_intent, charge)
- Records gross amount, platform fee, and net transfer (all in cents)
- Status: `pending` / `paid` / `failed` / `reversed`
- `is_deferred` flag for payments collected before chef completed Connect onboarding

**`platform_fee_ledger`** — Append-only platform revenue tracking:

- Immutable (enforced by database trigger, same pattern as `ledger_entries`)
- Entry types: `fee`, `fee_refund`, `adjustment`
- Service-role only access (admin visibility)

### New Columns on `chefs`

- `platform_fee_percent` — Commission percentage (e.g., 5.00 = 5%)
- `platform_fee_fixed_cents` — Fixed fee per transaction (e.g., 50 = $0.50)

Migration: `20260312000010_stripe_transfer_routing.sql`

## Files Modified

| File                               | Change                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `lib/stripe/actions.ts`            | PaymentIntent now includes `transfer_data` + `application_fee_amount`                       |
| `lib/stripe/checkout.ts`           | Checkout Session includes same routing params                                               |
| `lib/stripe/refund.ts`             | Refunds include `reverse_transfer: true` + `refund_application_fee: true`                   |
| `app/api/webhooks/stripe/route.ts` | Records transfers after payment; handles `transfer.*` and `application_fee.refunded` events |

## Files Created

| File                                        | Purpose                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/stripe/transfer-routing.ts`            | `getChefStripeConfig()`, `computeApplicationFee()`, `recordStripeTransfer()`, `recordPlatformFee()` |
| `lib/stripe/deferred-transfers.ts`          | Admin action: resolve payments collected before chef completed Connect                              |
| `lib/stripe/payout-actions.ts`              | Chef-facing: `getChefPayoutSummary()`, `getChefTransfers()`                                         |
| `lib/admin/reconciliation-actions.ts`       | Admin: `getPlatformReconciliation()` — cross-tenant GMV/fees/transfers                              |
| `app/(admin)/admin/reconciliation/page.tsx` | Admin reconciliation dashboard                                                                      |

## Edge Cases

1. **Chef without Connect**: Money stays in platform. `transfer_routed: false` metadata. Resolved via `resolveDeferredTransfers()` when onboarding completes.

2. **Refund on transferred payment**: Stripe auto-reverses transfer. `reverse_transfer: true` ensures clean handling. Fee refund recorded in `platform_fee_ledger`.

3. **Platform fee = 0**: `application_fee_amount` is omitted. Full amount goes to connected account.

4. **Gift card purchases**: Skip `transfer_data` — these are platform-level transactions (not routed to any chef).

## Tax Tips Bug Fix

`lib/finance/tax-package.ts` — `getYearEndTaxPackage()` previously hardcoded `tipsCents: 0`. Now queries the ledger for actual tip entries within the tax year and includes tips in `netIncomeCents` for accurate quarterly tax estimates.

# Gift Card & Voucher System

**Implemented:** February 2026
**Status:** Complete

---

## Overview

ChefFlow supports two types of client incentives, both tenant-scoped to individual chefs:

| Type | Created by | Value type | Balance tracked |
|---|---|---|---|
| **Gift Card** | Chef (manual) or client (Stripe purchase) | Fixed dollar amount | Yes — partial use supported |
| **Voucher** | Chef only | Fixed $ off or % off | No — single-use discount |

Both are redeemed at the event payment step using a human-readable code (e.g. `GFT-ABCD1234`).

---

## Database Schema

### `client_incentives` (extended from migration 20260224000015)
Core record for every gift card and voucher.

New columns added in `20260227000001_gift_card_redemption_and_purchase.sql`:
- `remaining_balance_cents` — gift card balance, auto-initialized to `amount_cents` on insert; decremented per redemption; NULL for vouchers
- `purchase_status` — `'issued'` (chef-created) | `'pending_payment'` (Stripe in-flight) | `'paid'` (client purchased)
- `purchased_by_user_id` / `purchased_by_email` — buyer identity for client-purchased gift cards

### `gift_card_purchase_intents`
Pre-payment state while Stripe Checkout is in flight. Created before the Stripe session, linked to the `client_incentives` row once payment succeeds. Fields: `tenant_id`, `stripe_checkout_session_id`, `amount_cents`, `recipient_email`, `recipient_name`, `personal_message`, `buyer_email`, `status`, `created_incentive_id`.

### `incentive_redemptions`
Immutable audit log — one row per redemption event. Links `incentive_id`, `event_id`, `client_id`, `ledger_entry_id`. Tracks `applied_amount_cents`, `balance_before_cents`, `balance_after_cents`.

### `redeem_incentive()` Postgres RPC
Atomic SECURITY DEFINER function. In a single transaction:
1. Inserts a `'credit'` ledger entry (reduces `outstanding_balance_cents`)
2. Decrements `remaining_balance_cents` + increments `redemptions_used` on the incentive
3. Inserts a `incentive_redemptions` audit row

---

## Flows

### 1. Chef issues a gift card or voucher manually
1. Chef opens `/clients/gift-cards` in the chef dashboard
2. Clicks "Issue Gift Card" or "Issue Voucher" → fills in `IssueIncentiveForm`
3. `createVoucherOrGiftCard()` server action inserts the `client_incentives` row (`purchase_status: 'issued'`)
4. Chef optionally clicks "Send" → `sendVoucherOrGiftCardToAnyone()` inserts `incentive_deliveries` + fires `sendIncentiveDeliveryEmail()`

### 2. Client (or guest) purchases a gift card via Stripe
1. Buyer visits `/chef/[slug]/gift-cards` — no auth required
2. Selects amount, enters recipient + buyer emails, optional message
3. `GiftCardPurchaseForm` calls `initiateGiftCardPurchase()`:
   - Creates `gift_card_purchase_intents` row (`status: 'pending'`)
   - Creates Stripe Checkout Session with metadata `{ payment_type: 'gift_card_purchase', purchase_intent_id, tenant_id }`
   - Returns `checkoutUrl` → browser redirects to Stripe
4. Stripe Checkout completes → `checkout.session.completed` webhook fires:
   - Idempotency check on `gift_card_purchase_intents.status`
   - Generates code (`GFT-{4 random bytes hex}`)
   - Inserts `client_incentives` row via admin client (`purchase_status: 'paid'`)
   - Updates intent to `status: 'paid'`, links `created_incentive_id`
   - Sends `sendIncentiveDeliveryEmail()` to recipient
   - Sends `sendGiftCardPurchaseConfirmationEmail()` to buyer
5. Buyer is redirected to `/chef/[slug]/gift-cards/success?session_id=...` showing confirmation

### 3. Client redeems a code at event payment
1. Client goes to `/my-events/[id]/pay` (status must be `accepted`)
2. `PaymentPageClient` renders `RedemptionCodeInput` above the Stripe payment form
3. Client enters code, clicks "Check" → `validateIncentiveCode()` (read-only preview):
   - Validates active, not expired, not fully used, has balance
   - Computes `applied_amount_cents = min(remaining_balance, outstanding_balance)`
   - Returns preview — no writes
4. Client clicks "Apply Credit" → `redeemIncentiveCode()`:
   - Re-validates (race-safe)
   - Calls `adminSupabase.rpc('redeem_incentive', {...})` — atomic write
   - Checks updated outstanding balance
   - **If fully covered**: transitions event to `'paid'` (no Stripe needed), `PaymentPageClient` shows success
   - **If partially covered**: `PaymentPageClient` remounts `PaymentSection` (new `key`) → creates fresh PaymentIntent for reduced amount
5. If Stripe payment still needed, client completes it normally

### 4. Partial gift card use
Gift cards support partial redemption. Example: $100 gift card applied to a $60 event:
- `applied_amount_cents = 6000`
- `remaining_balance_cents = 4000` ($40 remains on the card)
- Same code can be applied to a future event, consuming up to the remaining $40

---

## Key Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260227000001_gift_card_redemption_and_purchase.sql` | DB schema additions |
| `lib/loyalty/redemption-actions.ts` | `validateIncentiveCode()`, `redeemIncentiveCode()` |
| `lib/loyalty/gift-card-purchase-actions.ts` | `initiateGiftCardPurchase()`, `getGiftCardPurchaseBySession()` |
| `lib/loyalty/voucher-actions.ts` | `createVoucherOrGiftCard()`, `sendVoucherOrGiftCardToAnyone()`, `deactivateIncentive()`, `getIncentiveRedemptions()`, `getIncentiveStats()` |
| `app/api/webhooks/stripe/route.ts` | `checkout.session.completed` handler |
| `app/(chef)/clients/gift-cards/page.tsx` | Chef management hub |
| `app/(chef)/clients/gift-cards/gift-cards-client-shell.tsx` | Interactive modals |
| `app/(public)/chef/[slug]/gift-cards/page.tsx` | Public gift card store (server) |
| `app/(public)/chef/[slug]/gift-cards/gift-card-form.tsx` | Public gift card store (client form) |
| `app/(public)/chef/[slug]/gift-cards/success/page.tsx` | Post-purchase confirmation |
| `app/(client)/my-events/[id]/pay/page.tsx` | Payment page (server) |
| `app/(client)/my-events/[id]/pay/payment-page-client.tsx` | Payment orchestrator (client) |
| `app/(client)/my-events/[id]/pay/payment-section.tsx` | Stripe PaymentIntent + form |
| `app/(client)/my-rewards/page.tsx` | Client's owned gift cards + vouchers |
| `components/incentives/redemption-code-input.tsx` | Code entry UI on payment page |
| `components/incentives/client-incentive-list.tsx` | Card-style incentive display |
| `components/incentives/issue-incentive-form.tsx` | Chef: create new code |
| `components/incentives/send-incentive-form.tsx` | Chef: send code by email |
| `components/incentives/incentive-redemption-history.tsx` | Chef: redemption audit log |
| `lib/email/templates/gift-card-purchase-confirmation.tsx` | Buyer confirmation email |
| `lib/email/templates/incentive-delivery.tsx` | Recipient delivery email |

---

## Idempotency & Safety

- **Webhook idempotency**: `gift_card_purchase_intents.status` guards against duplicate `checkout.session.completed` events. The existing `ledger_entries.transaction_reference` idempotency only applies to `payment_intent.*` events (not checkout events).
- **Redemption atomicity**: The `redeem_incentive()` RPC runs in a single DB transaction — ledger write, balance decrement, and audit row are all-or-nothing.
- **Race condition protection**: `redeemIncentiveCode()` re-validates the code immediately before calling the RPC, ensuring the balance is still sufficient even if another redemption happened between validate and redeem.
- **RLS bypass for code lookup**: `validateIncentiveCode()` uses the admin client for the `client_incentives` lookup specifically. The regular client RLS policy only permits clients to see codes they created or were targeted at — this would block redemption of webhook-issued gift cards. The code string itself is the authorization token; `requireClient()` is the authentication guard.
- **RLS bypass for webhook**: Webhook-created `client_incentives` rows use `created_by_role = 'system'` and the admin client. Guest buyers have no Supabase auth account, so `created_by_user_id` is NULL (nullable as of migration `20260228000002`). The `chk_client_incentives_creator_role_shape` constraint was updated to permit this case.

---

## Schema Notes (migration 20260228000002)

This patch migration fixed two constraint violations that would have caused the Stripe webhook to crash for guest gift card purchases:

1. `created_by_user_id` changed from `NOT NULL` to nullable — guest buyers have no auth account
2. `user_role` enum gained `'system'` value — used for webhook/automated record creation
3. `chk_client_incentives_creator_role_shape` updated to allow `(role='system', user_id IS NULL, client_id IS NULL)`

---

## Constraints

- Gift cards are tenant-scoped (per chef) — codes are unique within a tenant
- Minimum gift card purchase: $5 (500 cents)
- Maximum gift card purchase: $2,000 (200,000 cents)
- Codes are 4–32 characters, e.g. `GFT-ABCD1234` (webhook-generated) or custom chef-defined
- Vouchers do not track remaining balance — they are single-use or limited by `max_redemptions`
- Gift cards can only be redeemed against events belonging to the issuing chef's tenant
- `completed` and `cancelled` events cannot have codes applied (validated server-side)

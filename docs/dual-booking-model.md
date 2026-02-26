# Dual Booking Model

## What Changed

The public booking page (`/book/[chefSlug]`) now supports two booking models as a per-chef setting:

1. **Inquiry First** (default) — Client submits a request, chef reviews and sends a proposal, client accepts and pays.
2. **Instant Book** — Client fills form, sees live pricing, pays deposit via Stripe Checkout, event is auto-created in `paid` status.

## Architecture

### FSM Extension

Added `'paid'` to allowed transitions from `draft`:

```
draft: ['proposed', 'paid', 'cancelled']
```

New permission: `'draft->paid': 'system'` — only the Stripe webhook (with `systemTransition: true`) can trigger this. Chefs and clients cannot manually move draft to paid.

This allows instant-book events to skip the proposal/acceptance flow entirely.

### New Database Columns

**On `chefs`** (migration `20260312000014_dual_booking_model.sql`):

- `booking_model` — `'inquiry_first'` or `'instant_book'`
- `booking_base_price_cents` — Base event price (required for instant-book)
- `booking_pricing_type` — `'flat_rate'` or `'per_person'`
- `booking_deposit_type` — `'percent'` or `'fixed'`
- `booking_deposit_fixed_cents` — Fixed deposit amount

Note: `booking_deposit_percent` already existed from migration `20260307000012`.

**On `events`**:

- `booking_source` — `'inquiry'`, `'instant_book'`, or null

### Instant-Book Flow

1. Client visits `/book/[slug]`, selects date
2. Form shows live pricing summary (recalculates as guest count changes)
3. Client clicks "Pay Deposit & Book"
4. Server action `createInstantBookingCheckout()`:
   - Validates chef config (instant-book enabled, Stripe ready, base price set)
   - Computes total and deposit
   - Creates client (idempotent by email)
   - Creates inquiry (for traceability)
   - Creates event in `draft` status with `booking_source: 'instant_book'`
   - Creates Stripe Checkout Session with `transfer_data` routing
   - Returns checkout URL
5. Client redirected to Stripe Checkout
6. On successful payment, webhook fires:
   - Ledger entry appended (deposit)
   - Transfer recorded in `stripe_transfers`
   - Event transitioned `draft -> paid` (via FSM system permission)
   - Chef notified via email + in-app notification
7. Client redirected to thank-you page with instant-book confirmation messaging

### Settings UI

Chef settings > Booking Page now includes:

- Booking model radio: "Inquiry First" / "Instant Book"
- When instant-book selected: pricing type, base price, deposit type, deposit amount
- Validation: instant-book requires `booking_base_price_cents > 0` and `stripe_onboarding_complete`

## Files Modified

| File                                            | Change                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `lib/events/transitions.ts`                     | `draft` can now transition to `paid`; `draft->paid` permission = `system`            |
| `lib/booking/booking-settings-actions.ts`       | Extended type, getters, setters for dual-mode fields; new `getPublicBookingConfig()` |
| `components/settings/booking-page-settings.tsx` | Model selector, pricing/deposit config UI                                            |
| `app/book/[chefSlug]/page.tsx`                  | Fetches booking model columns, passes `bookingConfig` prop                           |
| `app/book/[chefSlug]/booking-page-client.tsx`   | Forwards `bookingConfig`, adjusts messaging per model                                |
| `components/booking/booking-form.tsx`           | Dual-mode: inquiry submit vs instant-book checkout; live pricing summary             |
| `app/book/[chefSlug]/thank-you/page.tsx`        | Detects `?mode=instant` for booking-confirmed messaging                              |
| `app/api/webhooks/stripe/route.ts`              | Detects `booking_source: 'instant_book'` in metadata, sends chef email               |
| `lib/email/notifications.ts`                    | New `sendInstantBookingChefEmail()` function                                         |

## Files Created

| File                                           | Purpose                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `lib/booking/instant-book-actions.ts`          | `createInstantBookingCheckout()` — core instant-book server action |
| `lib/email/templates/instant-booking-chef.tsx` | Email template for instant-book chef notification                  |

## Edge Cases

1. **Failed/abandoned checkout**: Event stays in `draft`. Chef can delete or follow up manually.
2. **Chef cancels instant-booked event**: Normal cancellation flow (`paid -> cancelled`). Refund via existing `initiateRefund()`.
3. **Chef changes model mid-checkout**: Open Checkout sessions remain valid. Future visitors see new model.
4. **Chef without Stripe**: `upsertBookingSettings()` rejects instant-book if `stripe_onboarding_complete !== true`.
5. **Deposit = 0 edge case**: If computed deposit would be 0, falls back to full amount.

# Stripe Connect

## What Changed

Chefs can now connect a Stripe Express account to receive payouts. The Connect setup is available both in the onboarding wizard (step 4) and in Settings → Stripe Connect. Status is synced automatically via the `account.updated` webhook.

## Why

Without Stripe Connect, chefs receive payments into the platform account and must be paid manually. Connect Express allows direct payouts from Stripe to each chef's bank account, making the platform financially self-sustaining.

## Account Type: Express

Express was chosen over Standard and Custom because:
- Chefs are independent businesses (not platform employees) — Express fits
- Stripe hosts the onboarding UI — reduces implementation burden
- Stripe handles KYC, tax reporting, and payout scheduling
- Custom requires full white-label UI — too complex for v1

## How It Works

### Connect Flow

```
Chef clicks "Connect Stripe Account"
  → createConnectAccountLink(fromOnboarding)
  → Creates Express account if none exists
  → Stores stripe_account_id on chefs table
  → Redirects chef to Stripe-hosted onboarding
Chef completes Stripe onboarding
  → Stripe redirects to /api/stripe/connect/callback?from=[source]
  → refreshConnectAccountStatus() queries Stripe API
  → Updates stripe_onboarding_complete = true
  → Redirects to /onboarding?step=4 (wizard) or /settings/stripe-connect
Stripe fires account.updated webhook (async)
  → handleAccountUpdated() → updateConnectStatusFromWebhook()
  → Confirms final charges_enabled state
```

### Status Model

The DB has two columns on `chefs`:

| Column | Type | Meaning |
|---|---|---|
| `stripe_account_id` | TEXT | Stripe acct_xxx ID; NULL = never started |
| `stripe_onboarding_complete` | BOOLEAN | true = charges_enabled confirmed |

`getConnectAccountStatus()` derives three states:
- **Not connected**: `stripe_account_id IS NULL`
- **Pending**: `stripe_account_id` set but `stripe_onboarding_complete = false`
- **Connected**: `stripe_onboarding_complete = true`

### Webhook Handler

`app/api/webhooks/stripe/route.ts` now handles `account.updated` events:

```typescript
case 'account.updated':
  await handleAccountUpdated(event)
  break
```

`handleAccountUpdated` calls `updateConnectStatusFromWebhook(stripeAccountId, chargesEnabled)`, which uses the admin client to update the correct chef record by `stripe_account_id`.

The webhook handler uses the service-role key — no chef auth context is available in webhook callbacks.

### Scope Limit

This implementation covers Connect **onboarding and status display only**. Routing payments through connected accounts (adding `transfer_data.destination` to `createPaymentIntent`) is a follow-on task. Existing payment flows are completely unaffected.

## Key Files

| File | Role |
|---|---|
| `lib/stripe/connect.ts` | `getConnectAccountStatus`, `createConnectAccountLink`, `refreshConnectAccountStatus`, `updateConnectStatusFromWebhook` |
| `app/api/stripe/connect/callback/route.ts` | Handles Stripe return redirect; syncs status and routes back to wizard or settings |
| `app/(chef)/settings/stripe-connect/page.tsx` | Server component — loads status, renders `StripeConnectClient` |
| `app/(chef)/settings/stripe-connect/stripe-connect-client.tsx` | `'use client'` — Connect CTA, pending/connected states, refresh button |
| `app/api/webhooks/stripe/route.ts` | Added `account.updated` webhook handler |
| `supabase/migrations/20260303000021_onboarding_and_stripe_connect.sql` | Adds `stripe_account_id` and `stripe_onboarding_complete` to `chefs` |

## Database

Columns added to `chefs` table:
```sql
stripe_account_id           TEXT DEFAULT NULL,
stripe_onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE

CREATE INDEX idx_chefs_stripe_account_id
  ON chefs(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
```

## Environment Variables Required

```
STRIPE_SECRET_KEY          -- Stripe secret key (already present for payments)
STRIPE_WEBHOOK_SECRET      -- Already present; webhook handler signs all events
NEXT_PUBLIC_SITE_URL       -- Used to build the return_url and refresh_url
```

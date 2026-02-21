# Build: SaaS Billing Skeleton

## Overview

ChefFlow's public pricing page advertised "$29/month with 14-day free trial" but had zero billing infrastructure. This build adds the complete skeleton: database columns, Stripe customer/subscription management, webhook handlers, a billing settings page, and a soft trial banner.

**Approach: No hard gating.** Existing chefs are grandfathered — they see nothing different. New signups get a 14-day trial tracked in the DB. A soft banner appears when the trial is expiring (≤3 days) or has ended.

---

## Files Created / Modified

### Database

| File                                                  | What It Does                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/migrations/20260321000006_saas_billing.sql` | Adds 5 columns to `chefs` table; grandfathers all existing rows |

### New columns on `chefs`:

- `stripe_customer_id TEXT` — Stripe Customer ID, set at signup
- `stripe_subscription_id TEXT` — linked after paid subscription created
- `subscription_status TEXT` — `grandfathered | trialing | active | past_due | canceled | unpaid`
- `trial_ends_at TIMESTAMPTZ` — trial expiry date (14 days from signup)
- `subscription_current_period_end TIMESTAMPTZ` — next billing date

### Server Library

| File                               | Change                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `lib/stripe/subscription.ts`       | **NEW** — full SaaS subscription management                                 |
| `lib/auth/actions.ts`              | Non-blocking Stripe customer + trial start after chef signup                |
| `app/api/webhooks/stripe/route.ts` | Added subscription event handling to `isNonLedgerEvent` list + switch cases |

### UI

| File                                             | Change                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `components/billing/trial-banner.tsx`            | **NEW** — server component, fetches status, renders banner if needed      |
| `components/billing/trial-banner-client.tsx`     | **NEW** — dismissable client banner (amber=expiring, orange=expired)      |
| `app/(chef)/settings/billing/page.tsx`           | **NEW** — subscription status page                                        |
| `app/(chef)/settings/billing/billing-client.tsx` | **NEW** — interactive status card + plan features                         |
| `app/(chef)/settings/billing/actions.ts`         | **NEW** — server action wrappers (checkout → redirect, portal → redirect) |
| `app/(chef)/layout.tsx`                          | Added `<TrialBanner chefId={user.entityId} />`                            |
| `components/navigation/nav-config.tsx`           | Added "Subscription & Billing" to settings shortcuts                      |

---

## `lib/stripe/subscription.ts` — Key Functions

```typescript
createStripeCustomer(chefId, email, businessName) → string
// Creates Stripe Customer, saves stripe_customer_id to chefs table

startTrial(chefId) → void
// Sets trial_ends_at = now + 14 days, subscription_status = 'trialing'

getSubscriptionStatus(chefId) → SubscriptionStatus
// Returns: { status, trialEndsAt, daysRemaining, isActive, isTrial,
//            isTrialExpiring, isExpired, isGrandfathered, ... }

handleSubscriptionUpdated(subscription) → void
// Webhook handler: updates status + period end when subscription created/updated

handleSubscriptionDeleted(subscription) → void
// Webhook handler: marks subscription as canceled

createCheckoutSession(chefId) → string (URL)
// Creates Stripe Checkout session for upgrade; requires STRIPE_SUBSCRIPTION_PRICE_ID env var

createBillingPortalSession(chefId) → string (URL)
// Creates Stripe Billing Portal session for active subscribers to manage their plan
```

---

## Webhook Events Handled

| Stripe Event                    | Handler                     |
| ------------------------------- | --------------------------- |
| `customer.subscription.created` | `handleSubscriptionUpdated` |
| `customer.subscription.updated` | `handleSubscriptionUpdated` |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` |

These are added to `isNonLedgerEvent` because they don't write to `ledger_entries` — they update the chef's subscription columns.

---

## Trial Banner Logic

The banner renders at the top of the chef layout, above the sidebar content:

| Condition                      | Banner                                                 |
| ------------------------------ | ------------------------------------------------------ |
| `isGrandfathered`              | None (founding member, never shown)                    |
| `isActive`                     | None                                                   |
| `isTrial && daysRemaining > 3` | None                                                   |
| `isTrialExpiring` (≤3 days)    | Amber warning: "X days remaining. Upgrade →"           |
| `isExpired`                    | Orange alert: "Trial ended. Upgrade to keep ChefFlow." |

The banner is dismissable per browser session via `sessionStorage`.

---

## Billing Settings Page (`/settings/billing`)

Shows:

- Current subscription status badge (Grandfathered / Trial / Active / Expired)
- Days remaining or next billing date
- "Upgrade to Professional — $29/mo" button → Stripe Checkout
- "Manage Subscription" button (active subscribers only) → Stripe Customer Portal
- Full plan features list

On successful upgrade, Stripe redirects to `/settings/billing?upgraded=1`, which shows a success banner.

---

## Activation Checklist (to go live)

1. Create a Stripe Product + Price for $29/month in the Stripe dashboard
2. Add `STRIPE_SUBSCRIPTION_PRICE_ID=price_xxx` to environment variables
3. Update Stripe webhook to include `customer.subscription.*` events
4. Apply migration: `supabase db push --linked`
5. Existing chefs already have `subscription_status = 'grandfathered'` from the UPDATE in the migration

---

## Architecture Notes

- SaaS billing is **completely separate** from Stripe Connect (client payment routing)
- Same `STRIPE_SECRET_KEY` is used for both — different Stripe objects
- Failing to create a Stripe customer at signup is **non-blocking** — the chef can still use the app
- `subscription_status = 'grandfathered'` is a permanent safe harbor — no banner ever, no paywall ever

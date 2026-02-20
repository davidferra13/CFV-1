# Onboarding Wizard

## What Changed

New chefs who sign up are now guided through a 5-step setup wizard before accessing the dashboard. The wizard collects the information needed to go live: profile, branding, public URL, and Stripe Connect.

## Why

Without a wizard, new chefs land on a dashboard with empty state and no guidance. Stripe Connect remains unconfigured, the public profile is incomplete, and there is no slug — making the profile unreachable. The wizard closes all three gaps in a single flow.

## How It Works

### Gate

`app/(chef)/layout.tsx` runs a gate after `requireChef()`. It reads the current pathname from the `x-pathname` request header (set by middleware) and calls `getOnboardingStatus()`. If the chef has not completed onboarding AND is not already on `/onboarding`, they are redirected to `/onboarding`.

```
New chef signs up
  → redirected to /auth/signin?redirect=/onboarding
  → signs in → middleware redirects to /onboarding
  → every chef route now gate-checks before rendering
```

Existing chefs are unaffected: the migration backfilled `onboarding_completed_at = now()` for all chefs who existed before the migration ran.

### Middleware

`middleware.ts` now sets `x-pathname` in the request headers forwarded to every server component:

```typescript
const requestHeaders = new Headers(request.headers)
requestHeaders.set('x-pathname', pathname)
```

This lets the layout server component read the current URL path without a redirect or extra round-trip.

### Wizard Steps

| # | Title | Saves To | Server Action |
|---|---|---|---|
| 1 | Set Up Your Profile | `chefs.display_name`, `chefs.bio` | `updateChefFullProfile()` |
| 2 | Brand Your Portal | `chefs.tagline`, `chefs.portal_primary_color` | `updateChefPortalTheme()` |
| 3 | Your Public URL | `chefs.slug` | `updateChefSlug()` |
| 4 | Get Paid | `chefs.stripe_account_id` (via Stripe) | `createConnectAccountLink(true)` |
| 5 | Done | `chefs.onboarding_completed_at` | `markOnboardingComplete()` |

Every step has "Skip for now" so chefs are never blocked.

### Stripe Return Flow

Step 4 sends the chef to Stripe's hosted onboarding. When they return, Stripe redirects to `/api/stripe/connect/callback?from=onboarding`, which calls `refreshConnectAccountStatus()` and then redirects to `/onboarding?step=4&stripe_return=true`. The wizard page reads `step` from the URL param and starts at the correct step.

### Completion

The wizard's "Go to Dashboard" button (step 5) calls `markOnboardingComplete()` which sets `chefs.onboarding_completed_at = now()`. From that point the layout gate no longer fires.

## Key Files

| File | Role |
|---|---|
| `app/(chef)/onboarding/page.tsx` | Server component — loads profile + Connect status, passes to wizard |
| `components/onboarding/onboarding-wizard.tsx` | `'use client'` multi-step wizard UI |
| `lib/onboarding/actions.ts` | `checkSlugAvailability()` server action |
| `lib/chef/profile-actions.ts` | `markOnboardingComplete()`, `getOnboardingStatus()` |
| `app/(chef)/layout.tsx` | Gate: redirects to /onboarding if not complete |
| `middleware.ts` | Sets `x-pathname` request header; adds `/chefs` + `/survey` to skipAuthPaths |
| `supabase/migrations/20260303000021_onboarding_and_stripe_connect.sql` | Adds `onboarding_completed_at` to `chefs`; backfills existing chefs |

## Database

Column added to `chefs` table:
```sql
onboarding_completed_at TIMESTAMPTZ DEFAULT NULL
-- NULL = wizard not yet completed
-- Backfill: existing chefs set to now() so they are NOT gate-caught
```

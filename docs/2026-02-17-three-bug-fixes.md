# Three Bug Fixes: Loyalty Tier, Webhook Atomicity, Universal Search

**Date:** 2026-02-17
**Files Changed:**
- `lib/loyalty/actions.ts`
- `app/api/webhooks/stripe/route.ts`
- `lib/search/universal-search.ts`

---

## Fix 1: Loyalty Tier Change Detection Bug

**File:** `lib/loyalty/actions.ts` -- `awardEventPoints` function

**Problem:**
The `tierChanged` field in the return value was computed incorrectly. The old code compared `newTier` against a tier computed from `client.loyalty_points` (the current balance), but by the time the comparison ran, the loyalty transactions had already been inserted into the database. This meant the lifetime earned query (used to compute `newTier`) already included the new points, making the "old tier" calculation stale and inaccurate.

Additionally, the old code used `client.loyalty_points` (current redeemable balance) instead of lifetime earned points. Since tiers are based on lifetime earned (not current balance), using the balance would produce wrong results for any client who had redeemed points.

**Fix:**
1. Added a query to compute old lifetime earned points BEFORE any new loyalty transactions are inserted (lines 318-327).
2. The old tier is now computed from `oldLifetimeEarned` using the same `computeTier` function.
3. Changed the `tierChanged` return value from the complex inline expression to `newTier !== oldTier`.

**Why it matters:**
Tier upgrades trigger UI celebrations and potentially different service tiers. A false negative (missing a tier change) means clients don't get notified of their upgrade. A false positive could trigger confusing notifications.

---

## Fix 2: Stripe Webhook Atomicity (Audit Trail)

**File:** `app/api/webhooks/stripe/route.ts` -- `handlePaymentSucceeded` function

**Problem:**
When a Stripe payment succeeds, two things happen: (1) a ledger entry is appended, and (2) the event transitions to 'paid' status. If step 2 fails, the error was logged to console but no persistent record was created. This meant:
- The ledger correctly recorded the payment (money truth preserved).
- But the event might stay in 'accepted' status even though it's been paid.
- The only evidence of the failure was in ephemeral server logs.

**Fix:**
After the catch block for the transition failure, added code to insert an audit entry into `event_state_transitions` with:
- `from_status: null` (we don't know the exact current status from inside the catch)
- `to_status: 'paid'` (the intended transition)
- `transitioned_by: null` (system-initiated)
- `reason: 'Auto-transition failed after payment'`
- `metadata` containing the error message, Stripe event ID, payment intent ID, and a `requires_manual_review: true` flag

The audit insert itself uses `.then()/.catch()` to ensure it never throws, since we're already inside a catch block.

**Why it matters:**
This creates a queryable audit trail. The chef (or a support process) can find events that need manual status correction by querying:
```sql
SELECT * FROM event_state_transitions
WHERE reason = 'Auto-transition failed after payment'
AND metadata->>'requires_manual_review' = 'true';
```

---

## Fix 3: Universal Search Column Names

**File:** `lib/search/universal-search.ts`

**Problem:**
The universal search file had `@ts-nocheck` suppressing all TypeScript errors because the column names and scoping fields didn't match the actual database schema. Specific issues:
1. Used `name` instead of `full_name` for clients.
2. Used `title` instead of `occasion` for events.
3. Used `client_name` for inquiries, which doesn't exist in the schema.
4. Used `chef_id` for tenant scoping instead of `tenant_id`.
5. Used `event_date` on inquiries instead of `confirmed_date`.
6. Called `createServerClient()` with unnecessary `await`.

**Fix:**
Complete rewrite of all queries to match actual schema:
- **Clients:** `full_name`, `email`, `phone` with `tenant_id` scoping.
- **Events:** `occasion`, `event_date`, `status` with `tenant_id` scoping.
- **Inquiries:** `source_message`, `confirmed_occasion`, `confirmed_date`, `status` with `tenant_id` scoping. Search matches against `source_message` and `confirmed_occasion`.
- **Menus:** `name` with `tenant_id` scoping (was `chef_id`).
- **Recipes:** `name` with `tenant_id` scoping (was `chef_id`).
- Removed `@ts-nocheck` directive and the TODO comment.
- Removed unnecessary `await` on `createServerClient()`.

**Schema references used:**
- `supabase/migrations/20260215000001_layer_1_foundation.sql` (clients)
- `supabase/migrations/20260215000002_layer_2_inquiry_messaging.sql` (inquiries)
- `supabase/migrations/20260215000003_layer_3_events_quotes_financials.sql` (events)
- `supabase/migrations/20260215000004_layer_4_menus_recipes_costing.sql` (menus, recipes)

---

## Verification

All three files pass ESLint with no warnings or errors via `npx next lint`.

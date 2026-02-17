# Medium-Priority Fixes - Reflection Document

**Date:** 2026-02-17
**Scope:** 5 targeted fixes across expenses, payments, auth, and deferred module documentation

---

## Fix 1: Budget Guardrail Target Margin from Chef Preferences

**File:** `lib/expenses/actions.ts` (function `getBudgetGuardrail`)

**What changed:** The `targetMarginPercent` was hardcoded to `60`. Now it calls `getChefPreferences()` and reads `prefs.target_margin_percent`, falling back to `60` if not set.

**Why:** Different chefs have different margin targets. A catering operation targeting high-volume might accept 40% margins, while an intimate private chef experience might target 70%. The chef_preferences table already stores `target_margin_percent` (added in Layer 5 migration), so the budget guardrail should respect it.

**How it connects:** `getChefPreferences()` from `lib/chef/actions.ts` returns the full preferences object, which includes `target_margin_percent` with a default of 60. The budget guardrail now uses this value to compute `maxGrocerySpendCents`, ensuring the shopping budget message reflects the chef's actual preference.

---

## Fix 2: Configurable Monthly Revenue Target

**File:** `lib/expenses/actions.ts` (function `getMonthlyFinancialSummary`)

**What changed:** Replaced hardcoded `TARGET_MONTHLY_REVENUE_CENTS = 1000000` with a call to `getChefPreferences()`. Reads `target_monthly_revenue_cents` from preferences (cast via `as any` since the column does not yet exist), falling back to 1,000,000 ($10,000).

**Why:** Revenue targets vary significantly between chefs. A weekend-only chef might target $5,000/month while a full-time operation targets $20,000. When a `target_monthly_revenue_cents` column is added to `chef_preferences`, it will be picked up automatically with no code changes needed.

**How it connects:** Both Fix 1 and Fix 2 add `import { getChefPreferences } from '@/lib/chef/actions'` to `lib/expenses/actions.ts`. This creates a clean dependency from the expense/financial module to the chef preferences module, following the existing pattern where preferences drive operational behavior.

---

## Fix 3: Payment Retry Mechanism

**File:** `app/(client)/my-events/[id]/pay/payment-section.tsx`

**What changed:**
- Added `retryCount` state (`useState(0)`)
- Added `retryCount` to the `useEffect` dependency array so incrementing it re-triggers payment intent initialization
- Added `setLoading(true)` and `setError(null)` at the start of `initPayment()` to reset state on retry
- Added a "Try Again" button (with `type="button"`) in the error display that calls `setRetryCount(c => c + 1)`

**Why:** Payment initialization can fail transiently (network issues, Stripe API hiccups, cold starts). Without a retry button, clients had to refresh the entire page to try again, which is a poor UX. The retry mechanism re-runs the same initialization flow without a full page reload.

**How it connects:** The `createPaymentIntent` server action is called again on retry with the same `eventId`. Since Stripe handles idempotency for payment intents, repeated calls are safe. The component stays within the existing `PaymentForm` + `Alert` UI pattern.

---

## Fix 4: @ts-nocheck File Documentation

**Files modified:**
- `lib/analytics/revenue-engine.ts` - Added DEFERRED comment explaining dependency on menu_items table and total_price column
- `lib/analytics/menu-engineering.ts` - Added DEFERRED comment explaining dependency on menu_items table
- `lib/events/fire-order.ts` - Added DEFERRED comment explaining dependency on menu_sections/menu_items tables
- `lib/waste/actions.ts` - Added DEFERRED comment explaining dependency on waste_entries table
- `lib/scheduling/calendar-sync.ts` - Added DEFERRED comment explaining chef_settings vs google_connections table mismatch

**File NOT modified:** `lib/search/universal-search.ts` (being handled by another agent)

**Why:** `@ts-nocheck` files with only a TODO comment are ambiguous: are they broken? Can they be deleted? Should they be fixed now? The DEFERRED comments make the status explicit: these files are intentionally kept, they depend on Phase 2 schema extensions, and they should not be removed.

**How it connects:** This is a documentation-only change. Each comment follows the same pattern: `DEFERRED: [what]. Requires [dependency] ([phase]). Do not remove - will be enabled when [condition].` This makes it easy to grep for `DEFERRED:` to find all deferred modules.

---

## Fix 5: Rate Limiting on Auth Actions

**File:** `lib/auth/actions.ts`

**What changed:**
- Added an in-memory rate limiter using a `Map<string, { count: number; resetAt: number }>`
- `checkRateLimit(key, maxAttempts=5, windowMs=15min)` throws if a given key exceeds 5 attempts in 15 minutes
- Added `checkRateLimit(validated.email)` after Zod validation in `signIn`, `signUpChef`, and `signUpClient`

**Why:** Without rate limiting, an attacker could brute-force passwords or spam account creation. The in-memory approach is lightweight (no Redis dependency), resets on deploy (acceptable for V1), and provides basic protection against automated attacks.

**Limitations:**
- Per-process: in a multi-instance deployment, each process has its own map (not shared)
- Resets on deploy/restart
- Not IP-based (uses email as key, so an attacker could try different emails)
- For production hardening, consider Redis-backed rate limiting or Vercel's built-in rate limiting

**How it connects:** The rate limiter sits between Zod validation and the Supabase auth calls. It uses the validated email as the rate limit key, so invalid emails are rejected by Zod first (no map pollution). The error message ("Too many attempts. Please try again later.") is generic to avoid leaking information about which step failed.

---

## Import Changes Summary

| File | New Import |
|------|-----------|
| `lib/expenses/actions.ts` | `import { getChefPreferences } from '@/lib/chef/actions'` |

No new external dependencies were added across any fix.

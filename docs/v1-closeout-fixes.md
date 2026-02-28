# V1 Close-Out Fixes

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## Summary

Five issues were identified in the V1 final audit. After investigation, **4 required code fixes** and **1 was already complete** (loyalty hardwiring by Codex in commit `e03299c0`).

---

## Fix 1: Recall Dismiss Persistence

**Problem:** `dismissRecall()` in `lib/safety/recall-actions.ts` returned `{ success: true }` but never wrote to the database. Dismissed recalls reappeared on refresh. Zero Hallucination Law 1 violation.

**Fix:**

- **Migration** `20260328000015`: Added `dismissed_recall_ids TEXT[]` column to `chefs` table
- **Code:** `dismissRecall()` now reads current dismissed IDs, appends the new one, and writes back to the database
- **Added:** `getDismissedRecallIds()` helper for the UI to filter already-dismissed recalls
- Imports `requireChef` and `createServerClient` for proper auth + DB access

**Files changed:**

- `supabase/migrations/20260328000015_recall_dismiss_and_quote_addons.sql`
- `lib/safety/recall-actions.ts`

---

## Fix 2: Addon Toggle Persistence

**Problem:** `toggleAddonForQuote()` in `lib/proposals/addon-actions.ts` returned success but never wrote to any table. Addon selections were client-side only, lost on refresh. Zero Hallucination Law 1 violation.

**Fix:**

- **Migration** `20260328000015`: Created `quote_selected_addons` join table (quote_id + addon_id + tenant_id, with RLS)
- **Code:** `toggleAddonForQuote()` now upserts/deletes rows in `quote_selected_addons`
- **Added:** `getSelectedAddonsForQuote()` helper to load persisted selections
- Proper `revalidatePath` call after toggle

**Files changed:**

- `supabase/migrations/20260328000015_recall_dismiss_and_quote_addons.sql`
- `lib/proposals/addon-actions.ts`

---

## Fix 3: Remove @ts-nocheck from Client Analytics

**Problem:** `lib/analytics/client-analytics.ts` had `// @ts-nocheck` at the top while exporting 6 callable server actions. Per CLAUDE.md rules, `@ts-nocheck` files must not export callable actions (runtime crash risk).

**Fix:**

- Removed `// @ts-nocheck`
- Added explicit `any` type annotations where needed (survey response arrays, reduce callbacks)
- Changed NPS `avg` helper from `keyof` to `string` parameter for TypeScript compatibility
- All queries verified against `types/database.ts` — every table and column exists

**Files changed:**

- `lib/analytics/client-analytics.ts`

---

## Fix 4: CAC Metric Shows N/A Instead of $0

**Problem:** `getClientAcquisitionStats()` hardcoded `totalSpend = 0` with a TODO comment saying the `marketing_spend_log` table didn't exist. But the table **does exist** (migration `20260306000005`). The stale code meant CAC always showed $0.00 as if the chef had zero marketing costs, which is a Zero Hallucination Law 2 violation.

**Fix:**

- Updated `ClientAcquisitionStats` type: `cacCents`, `totalMarketingSpendCents`, and `cacRatio` are now `number | null`
- `null` = "no marketing spend data logged yet" (honest)
- `0` = "chef logged spend and it totals $0" (real data)
- The function now queries `marketing_spend_log` for actual spend data
- Updated analytics page fallback from `cacCents: 0` to `cacCents: null`

**Files changed:**

- `lib/analytics/client-analytics.ts`
- `app/(chef)/analytics/page.tsx`

---

## Issue 5: Loyalty Program Hardwiring — Already Complete

**Finding:** The audit said loyalty wasn't hardwired across the app. Investigation found commit `e03299c0` (by Codex, 2026-02-27) already completed this work.

**What was already done:**
| Surface | Status |
|---------|--------|
| Client profile page | Tier badge, points, progress bar, rewards, transactions, award bonus form |
| Event detail page | Tier + points in info grid, estimated/awarded points section |
| Invoice (web + PDF) | Loyalty redemptions, discount line items, adjusted subtotals |
| Invoice calculations | Tax computed on loyalty-adjusted subtotal |
| Post-event thank you email | Points earned, balance, tier |
| Payment confirmation email | Tier + points |
| Remy AI context | Tier, points balance, lifetime points, next tier, progress |

**Action:** Removed the loyalty TODO from `memory/MEMORY.md` and documented it as complete.

---

## Migration Summary

**New migration:** `20260328000015_recall_dismiss_and_quote_addons.sql`

Changes:

1. `ALTER TABLE chefs ADD COLUMN dismissed_recall_ids TEXT[] DEFAULT '{}'`
2. `CREATE TABLE quote_selected_addons` (id, quote_id, addon_id, tenant_id, created_at) with unique constraint on (quote_id, addon_id), RLS policies for chef access

Both changes are **additive only** — no existing data is modified or deleted.

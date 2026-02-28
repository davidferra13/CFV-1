# V1 Close-Out Fixes

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## Summary

Five issues were identified in the V1 final audit. All five are now resolved.

---

## Fix 1: Recall Dismiss Persistence

**Problem:** `dismissRecall()` returned `{ success: true }` but never wrote to the database. Dismissed recalls reappeared on refresh. Zero Hallucination Law 1 violation.

**Fix:**

- **Migration** `20260328000015`: Added `dismissed_recall_ids TEXT[]` column to `chefs` table
- **Code:** `dismissRecall()` now reads current dismissed IDs, appends the new one (with dedup), and writes back
- **Added:** `getDismissedRecallIds()` helper for the UI to filter already-dismissed recalls

**Files:** `supabase/migrations/20260328000015_v1_closeout_fixes.sql`, `lib/safety/recall-actions.ts`

---

## Fix 2: Addon Toggle Persistence

**Problem:** `toggleAddonForQuote()` returned success but never wrote to any table. Addon selections were client-side only, lost on refresh. Zero Hallucination Law 1 violation.

**Fix:**

- **Migration** `20260328000015`: Created `quote_selected_addons` join table (quote_id + addon_id + tenant_id + price_cents_snapshot, with RLS)
- **Code:** `toggleAddonForQuote()` now upserts/deletes rows in `quote_selected_addons`
- **Added:** `getSelectedAddonsForQuote()` helper to load persisted selections

**Files:** `supabase/migrations/20260328000015_v1_closeout_fixes.sql`, `lib/proposals/addon-actions.ts`

---

## Fix 3: Remove @ts-nocheck from Client Analytics

**Problem:** `lib/analytics/client-analytics.ts` had `// @ts-nocheck` while exporting 6 callable server actions. Per CLAUDE.md rules, `@ts-nocheck` files must not export callable actions.

**Fix:** Removed `@ts-nocheck`. File uses `const supabase: any = createServerClient()` (established codebase pattern) which handles type flexibility without blanket suppression.

**Files:** `lib/analytics/client-analytics.ts`

---

## Fix 4: CAC Metric Returns Null Instead of $0

**Problem:** `getClientAcquisitionStats()` returned `cacCents: 0` and `totalMarketingSpendCents: 0` because marketing spend tracking isn't implemented yet. UI showed "$0.00 CAC" as if real. Zero Hallucination Law 2 violation.

**Fix:**

- `ClientAcquisitionStats` type: `cacCents`, `totalMarketingSpendCents`, `cacRatio` are now `number | null`
- Returns `null` for all spend/CAC fields — honest "no data" signal
- Analytics page already defaults to `null` — no UI changes needed

**Files:** `lib/analytics/client-analytics.ts`

---

## Fix 5: Loyalty Program Hardwiring

### Already Done (Codex — commit `e03299c0`, 2026-02-27)

| Surface                         | Status                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| Client detail page              | Tier badge, points, progress bar, rewards, award bonus form  |
| Event detail page               | Tier + points in info grid, estimated/awarded points         |
| Invoice (web + PDF)             | Loyalty redemptions, discount line items, adjusted subtotals |
| Invoice calculations            | Tax computed on loyalty-adjusted subtotal                    |
| Post-event thank-you email      | Points earned, balance, tier                                 |
| Remy AI context (chef + client) | Tier, points, lifetime, next tier, progress                  |
| Client portal `/my-rewards`     | Complete — tier, points, activity, raffle, rewards catalog   |

### Added in This Session

| Surface                   | What Changed                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Client list table**     | Added Loyalty column with tier badge (Bronze/Silver/Gold/Platinum) with color coding                       |
| **Payment receipt email** | Added `loyaltyTier` + `loyaltyPoints` to offline payment receipt — shows "Gold Tier — 450 points" in email |
| **Email sender**          | `sendOfflinePaymentReceiptEmail()` now accepts and forwards loyalty fields                                 |
| **Payment recording**     | `recordOfflinePayment()` now fetches `loyalty_tier` + `loyalty_points` from client record                  |

**Files:** `app/(chef)/clients/clients-table.tsx`, `lib/events/offline-payment-actions.ts`, `lib/email/notifications.ts`, `lib/email/templates/offline-payment-receipt.tsx`

---

## Migration Summary

**File:** `20260328000015_v1_closeout_fixes.sql`

1. `ALTER TABLE chefs ADD COLUMN dismissed_recall_ids TEXT[] DEFAULT '{}'`
2. `CREATE TABLE quote_selected_addons` (quote_id, addon_id, tenant_id, price_cents_snapshot) with PK, indexes, and RLS

Both changes are **additive only** — no existing data is modified or deleted.

# Loyalty Backfill & Manual Controls

**Date:** 2026-03-18
**Branch:** feature/external-directory

## What Changed

### 1. Retroactive Loyalty Backfill for Historical Imports

**Problem:** When chefs imported historical events via the Smart Import hub, events were inserted directly as `completed` (bypassing the FSM). This meant `awardEventPoints()` never ran, so imported clients sat at Bronze/0 points regardless of their actual history.

**Solution:** Added `backfillLoyaltyForHistoricalImports()` to `lib/loyalty/actions.ts`. This function:

- Finds all completed events where `loyalty_points_awarded` is null or false
- Groups by client, processes in chronological order (oldest first)
- For each event: computes base points (per_guest/per_dollar/per_event), large party bonuses, milestone bonuses
- Updates client stats once per client (not per event) for efficiency
- Recalculates tier at the end based on lifetime earned points
- Returns a summary: clients processed, events processed, points awarded, tier changes, errors

**Integration points:**

- `importHistoricalEvents()` in `lib/events/historical-import-actions.ts` now auto-calls the backfill after batch import (non-blocking, so import still succeeds even if backfill fails)
- The Past Events Import UI (`components/import/past-events-import.tsx`) now shows loyalty results in the done phase (points awarded, tier upgrades)
- A "Backfill Unawarded Events" button on the Chef Loyalty Dashboard (`app/(chef)/loyalty/page.tsx`) lets chefs manually trigger the backfill at any time (idempotent, safe to run repeatedly)

### 2. Manual Loyalty Adjustment Controls

**Problem:** Chefs had `awardBonusPoints()` for adding points but no way to deduct points, override tiers, reset balances, or correct stats.

**Solution:** Added `adjustClientLoyalty()` to `lib/loyalty/actions.ts` with full manual control:

- **Point adjustment:** Add or deduct points (creates audit-trail transaction)
- **Reset balance:** Set points to zero (creates deduction transaction for audit)
- **Tier override:** Force a specific tier (will recalculate on next point change unless overridden again)
- **Stats correction:** Override `total_events_completed` and `total_guests_served`
- Auto-recalculates tier when points change (unless tier is explicitly overridden)

**UI:** `ManualLoyaltyAdjustment` component added to `app/(chef)/loyalty/client-loyalty-actions.tsx`, wired into the client detail page (`app/(chef)/clients/[id]/page.tsx`) next to the existing Award Bonus form. Includes confirmation dialog before applying changes.

## Files Changed

| File                                            | Change                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `lib/loyalty/actions.ts`                        | Added `adjustClientLoyalty()`, `backfillLoyaltyForHistoricalImports()` |
| `lib/events/historical-import-actions.ts`       | `importHistoricalEvents()` now calls loyalty backfill                  |
| `components/import/past-events-import.tsx`      | Shows loyalty backfill results in done phase                           |
| `app/(chef)/loyalty/client-loyalty-actions.tsx` | Added `ManualLoyaltyAdjustment` component                              |
| `app/(chef)/loyalty/backfill-button.tsx`        | New: Backfill trigger button for loyalty dashboard                     |
| `app/(chef)/loyalty/page.tsx`                   | Added backfill button to Program Settings section                      |
| `app/(chef)/clients/[id]/page.tsx`              | Wired `ManualLoyaltyAdjustment` into client detail                     |

## Design Decisions

- **Backfill is non-blocking in import flow:** If loyalty backfill fails, events are still imported successfully. The chef can always run the backfill manually later.
- **No per-event notifications during backfill:** Importing 50 historical events should not spam the client with 50 notification emails. The UI shows a summary instead.
- **Single client update per batch:** Stats and tier are updated once per client at the end of processing all their events, not per event. This avoids N database updates.
- **Idempotent:** The `loyalty_points_awarded` flag prevents double-awarding. Running backfill multiple times is safe.
- **Manual adjustments create audit trail:** Every point change creates a `loyalty_transactions` row (type: `adjustment` or `bonus`), so the ledger is always complete.

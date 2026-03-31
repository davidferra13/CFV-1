# Loyalty Client Experience Layer - Build Summary

> **Date:** 2026-03-30
> **Spec:** `docs/specs/loyalty-client-experience.md`
> **Status:** verified

## What Was Built

Four enhancements to the client-facing loyalty experience: celebration toasts, live balance updates, an interactive quest board, and mobile tab bar access.

### Files Created

| File                                               | Purpose                                                                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/loyalty/loyalty-celebration-toast.tsx` | Branded toasts for point awards (star icon, brand border) and tier upgrades (trophy, CSS confetti). Auto-dismiss 5s/8s. Respects `prefers-reduced-motion`.                                         |
| `components/loyalty/loyalty-live-balance.tsx`      | Real-time animated point balance via SSE. Counts up/down with easeOut curve (300ms). Green flash on earn, amber on deduct. Falls back to static if SSE disconnects.                                |
| `components/loyalty/earning-quest-board.tsx`       | Interactive quest board: one-time triggers show as completable achievements (checkmark when done), repeatable triggers grouped by category. Falls back to `HowToEarnPanel` on error or empty data. |

### Files Modified

| File                                   | Change                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/client-nav.tsx` | Added `mobileTab: true` to Rewards nav item (line 40). Now shows in mobile bottom tab bar.                                                                      |
| `lib/loyalty/actions.ts`               | Added `getClientTriggerCompletionStatus()` server action. Reads trigger config, client guard columns, and recent event guards to determine completion state.    |
| `app/(client)/my-rewards/page.tsx`     | Replaced static balance with `LoyaltyLiveBalance`, wrapped `HowToEarnPanel` in `EarningQuestBoard` as fallback, added `LoyaltyCelebrationToast` at page bottom. |

## Architecture

### SSE Integration

- Listens on channel `loyalty:{tenantId}` (already broadcast by `fireTrigger()` in `lib/loyalty/triggers.ts`)
- Both celebration toast and live balance subscribe to same channel, filter by `clientId`
- Message path: `broadcastUpdate('loyalty', tenantId, data)` -> SSE event `{ event: 'UPDATE', data: { new: { type, clientId, points, newBalance, ... } } }`

### Quest Board Data Flow

1. Client component mounts, calls `getClientTriggerCompletionStatus()`
2. Server action reads: `loyalty_config.trigger_config` (which triggers enabled), `clients` row (one-time guard columns), most recent completed event (per-event guards), `loyalty_transactions` (per-action history)
3. Returns merged array of `TriggerCompletionStatus` with `completed: boolean`
4. On error or empty data: falls back to static `HowToEarnPanel`

### Graceful Degradation

- SSE fails: static balance shown, no toasts (no error displayed)
- Quest board query fails: falls back to `HowToEarnPanel`
- Lite mode (tiers only, no points): quest board + live balance + points toasts hidden. Only tier upgrade celebration fires.
- `prefers-reduced-motion`: confetti skipped, counter animation skipped (instant update)

## What's NOT Built (Deferred)

- Sound effects on celebration
- Push notifications for point awards
- Leaderboard / competitive elements
- Points history chart
- Streak tracking

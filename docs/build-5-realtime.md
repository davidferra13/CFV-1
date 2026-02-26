# Build 5: Real-time Updates + Optimistic UI

**Branch:** `fix/grade-improvements`
**Status:** Complete
**Date:** 2026-02-20

---

## What Changed

### Problem Being Solved

Discovery: ChefFlow's real-time foundation was already substantially built:

- `lib/notifications/realtime.ts` — Supabase `postgres_changes` subscription for notifications
- `components/notifications/notification-provider.tsx` — wraps chef layout, maintains live Supabase connection
- `components/dashboard/chef-todo-widget.tsx` — full optimistic UI (temp IDs, rollback on failure)
- `components/scheduling/dop-task-checkbox.tsx` — optimistic UI with rollback

The genuine gap: **no connection status indicator** — chef had no way to know if they were offline. This matters especially on mobile (spotty catering venue WiFi) and during event day when they're moving around.

Grade before: **C → B+** (most of it was already done; gap was the status indicator)

---

## New Files

### `components/realtime/live-indicator.tsx`

Offline-only connection indicator. Returns `null` when online (no clutter), renders a red pulsing dot + "Offline" label when the browser reports no network.

- Uses `navigator.onLine` + `window` `online`/`offline` events
- No Supabase polling — pure browser network API (faster, no false positives from Supabase latency)
- Only shows when there's actually a problem (offline)
- Title text: "No internet connection — changes will sync when reconnected"
- Self-cleaning: goes away automatically when connection restores

---

## Modified Files

### `components/navigation/chef-nav.tsx`

Added `<LiveIndicator />` in three locations:

1. **Desktop expanded sidebar header** — before `<GlobalSearch />`, inside the flex row with the collapse button
2. **Desktop rail/collapsed mode** — after `<GlobalSearch />` in the rail's icon column
3. **Mobile top bar** — before `<GlobalSearch />`, inside the flex row with the hamburger button

Since `LiveIndicator` returns `null` when online, these additions have zero visual impact in the normal (online) case.

---

## Pre-existing Realtime Infrastructure (No Changes Needed)

| File                                                 | What It Does                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `lib/notifications/realtime.ts`                      | Supabase `postgres_changes` subscription on `notifications` table for the chef's tenant |
| `components/notifications/notification-provider.tsx` | Wraps `app/(chef)/layout.tsx`; establishes + maintains Supabase realtime channel        |
| `components/dashboard/chef-todo-widget.tsx`          | Full optimistic UI: temp IDs, immediate state update, rollback on server error          |
| `components/scheduling/dop-task-checkbox.tsx`        | Optimistic checkbox toggle with `useTransition` + rollback                              |
| `components/dashboard/activity-feed.tsx`             | Live activity feed (already subscribed via notification provider context)               |

---

## Architecture Notes

- **No new Supabase channel needed**: the existing `NotificationProvider` already maintains the realtime connection. Adding a second channel would be redundant.
- **Browser network events vs. Supabase ping**: using `navigator.onLine` is more reliable for true network-offline scenarios (no WiFi, airplane mode) than polling Supabase latency. Supabase WebSocket reconnects automatically when network restores.
- **No false positives**: `online`/`offline` events only fire on genuine network state changes, not Supabase latency spikes.

---

## What to Test

1. Open the chef portal on any page
2. Disable network (DevTools → Network → Offline, or airplane mode)
3. Red "Offline" indicator with pulsing dot should appear in the nav header
4. Re-enable network → indicator should disappear within ~1 second
5. Verify the indicator appears on both desktop and mobile layouts
6. Verify no indicator visible when online (null render)

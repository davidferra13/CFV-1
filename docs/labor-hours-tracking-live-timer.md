# Labor Hours Tracking — Live Elapsed Timer

**Date:** 2026-02-19
**File changed:** `components/events/time-tracking.tsx`

## What Changed

Added a live elapsed-time display to the event "Chef Hours Tracking" card. When a timer is running, the activity row now shows:

```
Logged: 1h 15m  •  Running: 23m
```

Previously it showed "Started 2:30 PM", requiring the chef to do mental math mid-service.

## How It Works

- A `liveNow` state (Unix ms timestamp) initializes to `Date.now()` on mount.
- `hasActiveTimer` is derived directly from `initialData` fields (checking whether any `*_started_at` is non-null and its `*_completed_at` is null), avoiding a dependency ordering issue with `activityRows`.
- A `useEffect` sets a 30-second interval while `hasActiveTimer` is true, updating `liveNow` each tick. The interval is cleared when no timer is running.
- The running row renders `safeDurationMinutes(row.startedAt, new Date(liveNow).toISOString())` formatted via `formatMinutesAsDuration`.
- `safeDurationMinutes` has a minimum floor of 1 minute, so a freshly started timer shows "Running: 1m" immediately.

## Why 30 Seconds

Minute-level granularity is sufficient (all stored values are in minutes). A 30s tick means the display is always within one minute of accurate without burning CPU on a 1s interval.

## Scope

Single-file change. No schema changes, no server actions, no new dependencies.

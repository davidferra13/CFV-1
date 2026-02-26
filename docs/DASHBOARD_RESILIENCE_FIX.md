# Dashboard Resilience Fix

## Problem

The chef dashboard rendered a blank screen on load. The page made 9 parallel server-action calls via `Promise.all`, and any single failure (throw) caused the entire `Promise.all` to reject — crashing the full page with no visible content.

## Root Cause

Four of the nine data-fetching functions (`getDashboardWorkSurface`, `getClients`, `getTenantFinancialSummary`, `getInquiryStats`) throw on Supabase query errors instead of returning safe defaults. Since all nine calls run inside a single `Promise.all`, one failure blanks the entire dashboard.

Only `getEventsNeedingClosure` (returns `[]`), `getAARStats` (returns `null`), and `getMilestoneOutreachSuggestions` (wrapped in `.catch(() => [])`) were already resilient.

## Fix

Wrapped every call in a `safe()` helper that catches errors and returns a typed fallback:

```typescript
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return fallback
  }
}
```

Each data source now degrades independently — a failing inquiry query shows 0 inquiries instead of killing the whole page. The `console.error` preserves full error visibility in the server terminal for debugging.

## What Changed

- **File**: `app/(chef)/dashboard/page.tsx`
- Replaced raw `Promise.all([...])` with `Promise.all([safe(...), safe(...), ...])`
- Added typed fallback constants: `emptyWorkSurface`, `emptyInquiryStats`, `emptyFinancials`

## Design Principle

A dashboard is a composite view. No single data source should have veto power over the entire page. Partial data is always better than no data.

## Debugging Next Steps

After deploying this fix, check the **server terminal** for `[Dashboard] <label> failed:` messages. These will identify which specific function was crashing and the underlying Supabase error (missing column, RLS denial, connection timeout, etc.).

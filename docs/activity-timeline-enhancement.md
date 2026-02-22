# Activity Timeline Enhancement

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`

## What Changed

Enhanced the existing chef activity log into a full timeline with three additions:

### 1. Extended Time Ranges

- Added 6 Months, 1 Year, and **All Time** options to the activity feed
- "All Time" removes the date filter entirely — loads the complete history with cursor pagination
- Updated across the full stack: merge utility, chef-actions, activity-actions, API route, and UI filters

### 2. Opt-In/Out Toggle

- Chefs can disable activity tracking from the Activity page
- Toggle uses the optimistic UI pattern (instant feedback, revert on error)
- Preference stored in `chef_preferences.activity_log_enabled` (default: `true`)
- When disabled, `logChefActivity()` skips writes — existing history is preserved
- Safe default: if the preference check fails, logging continues (never blocks the main operation)

### 3. Activity Heat Map

- Shows a day-of-week × hour-of-day grid on the "My Activity" tab
- Uses brand terracotta color at varying opacity to show intensity
- Legend with Less → More gradient
- Built from the currently loaded activity entries (respects time range filter)

### 4. Quick-Access Activity Dot (Nav Bar)

- Tiny green dot in the sidebar header (desktop expanded, collapsed rail, and mobile top bar)
- Positioned next to the LiveIndicator — feels like a "saved" status indicator
- Click opens a popover showing the 5 most recent actions with domain badges and timestamps
- "View all" / "Open full timeline" links navigate to `/activity`
- Lazy-loads on first click, closes on outside click or Escape

## Files Changed

| File                                                             | Change                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `supabase/migrations/20260322000033_activity_log_preference.sql` | New — adds `activity_log_enabled` column                          |
| `lib/activity/preference-actions.ts`                             | New — `getActivityLogEnabled()` + `setActivityLogEnabled()`       |
| `lib/activity/log-chef.ts`                                       | Modified — checks preference before writing                       |
| `lib/activity/merge.ts`                                          | Modified — `parseTimeRangeDays` accepts `'180'`, `'365'`, `'all'` |
| `lib/activity/chef-actions.ts`                                   | Modified — `parseDaysBack(0)` = all time, conditional date filter |
| `lib/activity/actions.ts`                                        | Modified — same "all time" support                                |
| `app/api/activity/feed/route.ts`                                 | Modified — Zod schema accepts new time ranges                     |
| `components/activity/activity-filters.tsx`                       | Modified — 3 new time range options                               |
| `app/(chef)/activity/activity-page-client.tsx`                   | Modified — toggle, heat map, wider TimeRange                      |
| `app/(chef)/activity/page.tsx`                                   | Modified — fetches preference, passes to client                   |
| `components/activity/activity-dot.tsx`                           | New — nav bar quick-access popover                                |
| `components/navigation/chef-nav.tsx`                             | Modified — ActivityDot in desktop + mobile nav                    |

## Architecture Decisions

1. **Preference check is non-blocking:** The `logChefActivity()` function wraps the preference lookup in a nested try/catch. If it fails, logging proceeds. This ensures a schema mismatch or network issue never blocks business operations.

2. **"All time" uses sentinel value 0:** `parseDaysBack(0)` signals "no date filter." Query functions conditionally skip `.gte('created_at', since)` when `daysBack === 0`. The existing `(tenant_id, created_at DESC)` index handles unbounded queries efficiently with cursor pagination.

3. **Heat map is client-computed:** Built from the already-loaded activity entries rather than a separate API call. This means it reflects the current time range filter and requires no backend changes.

4. **ActivityDot is lazy:** Only fetches data on first click. No constant polling or background requests. Quiet and efficient.

## How to Test

1. **Toggle:** Go to `/activity` → flip the "Activity Tracking" switch off → perform an action (e.g., create a draft event) → verify no new row appears in `chef_activity_log` → flip it back on → verify logging resumes
2. **All Time:** Select "All Time" from the time dropdown → verify the feed loads without date constraints and pagination works
3. **Heat Map:** Select "This Month" or longer → check that the heat map grid renders with colored cells for active hours
4. **Nav Dot:** Click the green dot in the sidebar → popover shows 5 recent actions → click an entry to navigate → click "Open full timeline" to go to `/activity`
5. **Migration:** `supabase db push --linked` after backing up

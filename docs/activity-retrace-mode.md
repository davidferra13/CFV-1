# Activity Log — Retrace Mode

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

## What Changed

The Activity Log page (`/activity`) now has **two viewing modes**:

### 1. Summary Mode (existing)

- Key actions and decisions: "Created event for Johnson," "Sent quote to Sarah"
- Powered by `chef_activity_log` (permanent, append-only, 27+ action types)
- Includes domain filters, heat map, time ranges, tabs (My/Client/All)

### 2. Retrace Mode (new)

- Step-by-step navigation trail: "Dashboard → Inquiries → Johnson event → Menu builder → ..."
- Records **every page visit** and optional interaction breadcrumbs (clicks, form opens, tab switches, searches)
- Grouped into **sessions** (30-minute inactivity gap = new session)
- Each session shows: date, time, duration, page count, summary path, and expandable step-by-step detail
- Clickable breadcrumbs link back to the page you visited

## Architecture

### New Database Table

- **`chef_breadcrumbs`** — lightweight, high-volume, 30-day TTL
- Columns: `tenant_id`, `actor_id`, `breadcrumb_type`, `path`, `label`, `referrer_path`, `metadata`, `session_id`, `created_at`
- Migration: `20260322000042_chef_breadcrumbs.sql`

### Client-Side Tracker

- **`BreadcrumbTracker`** component in chef layout — silent, renders nothing
- Listens to `usePathname()` changes, queues breadcrumbs in memory
- **Batched writes** every 5 seconds (or on queue overflow at 30 items)
- Uses `navigator.sendBeacon()` on page unload for reliable delivery
- Session ID persisted in `sessionStorage` (one per browser tab)

### API Route

- **`POST /api/activity/breadcrumbs`** — batched insert, capped at 50 items/request
- Uses admin client (bypasses RLS) for writes
- Non-blocking: failures return `{ tracked: false }`, never break the app

### Server Actions

- **`getBreadcrumbSessions()`** in `lib/activity/breadcrumb-actions.ts`
- Fetches raw breadcrumbs, groups into sessions by 30-minute gaps
- Builds human-readable session summaries (unique page labels joined with →)

### UI Components

- **`RetraceTimeline`** — renders sessions as expandable cards
- **`SessionCard`** — header with date/time/duration/page count + expandable step trail
- **`BreadcrumbRow`** — individual breadcrumb with timeline dot, icon, label, timestamp

### Exported Utility

- **`trackBreadcrumb(type, label, metadata)`** — call from any component to record non-navigation interactions (button clicks, form opens, tab switches, searches)
- Fire-and-forget, non-blocking

## Files Created

| File                                                      | Purpose                                   |
| --------------------------------------------------------- | ----------------------------------------- |
| `supabase/migrations/20260322000042_chef_breadcrumbs.sql` | Database table                            |
| `lib/activity/breadcrumb-types.ts`                        | Types, route labels, constants            |
| `lib/activity/breadcrumb-actions.ts`                      | Server actions (query + session grouping) |
| `app/api/activity/breadcrumbs/route.ts`                   | Batched write API endpoint                |
| `components/activity/breadcrumb-tracker.tsx`              | Client-side tracker + `trackBreadcrumb()` |
| `components/activity/retrace-timeline.tsx`                | Retrace UI (session cards + step trail)   |

## Files Modified

| File                                           | Change                                |
| ---------------------------------------------- | ------------------------------------- |
| `app/(chef)/layout.tsx`                        | Added `<BreadcrumbTracker />`         |
| `app/(chef)/activity/page.tsx`                 | SSR fetch for breadcrumb sessions     |
| `app/(chef)/activity/activity-page-client.tsx` | Summary/Retrace toggle + retrace view |

## How It Works End-to-End

1. Chef navigates the app → `BreadcrumbTracker` detects route change via `usePathname()`
2. Breadcrumb queued in memory with path, referrer, session ID, timestamp
3. Every 5 seconds (or at 30 items), batch flushed to `POST /api/activity/breadcrumbs`
4. API authenticates user, resolves tenant, inserts rows via admin client
5. Chef visits `/activity` → clicks "Retrace My Steps" toggle
6. `getBreadcrumbSessions()` fetches breadcrumbs, groups by 30-min gaps into sessions
7. `RetraceTimeline` renders sessions as expandable cards with step-by-step trails

## Future Enhancements

- **Interaction tracking:** Call `trackBreadcrumb('click', 'Send Quote')` from key buttons to record non-navigation actions in the retrace trail
- **Search tracking:** Instrument `GlobalSearch` to record search queries
- **Auto-cleanup:** pg_cron job to delete breadcrumbs older than 30 days
- **Page title enrichment:** Fetch actual page titles (e.g., "Johnson Wedding") from entity data to replace generic "Event Detail" labels

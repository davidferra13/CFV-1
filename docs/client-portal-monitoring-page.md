# Client Portal Monitoring Page

## What Changed

Added a dedicated **Client Portal Monitoring** page at `/clients/presence` that gives the chef a full-page real-time view of who is on the portal and what they're doing.

## Why

The full activity tracking infrastructure was already built and working (Supabase Realtime, `activity_events` table, `LivePresencePanel` dashboard widget, intent notifications). However, the only place a chef could see live presence was a compact 3-column widget buried in Dashboard Section 10 (Activity). There was no dedicated page to actively monitor client portal behavior, and the widget lacked:

- Entity context (knew a client was viewing "event ID abc123" but didn't show the event name)
- Engagement scores (HOT/WARM/COLD) alongside presence entries
- A "View all" escape hatch to see the full picture

## New Files

| File                                              | Purpose                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `app/(chef)/clients/presence/page.tsx`            | Server page — fetches initial data, renders the monitor                       |
| `components/activity/client-presence-monitor.tsx` | Client component — real-time Supabase Realtime subscription, full-page layout |

## Modified Files

| File                                          | Change                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/activity/types.ts`                       | Added `ActiveClientWithContext` type                                           |
| `lib/activity/actions.ts`                     | Added `getActiveClientsWithContext()` server action                            |
| `components/activity/live-presence-panel.tsx` | Added "View all →" link to `/clients/presence` in panel header                 |
| `app/(chef)/clients/insights/page.tsx`        | Added "Who's Online" card, "Active Today" stat, fetches `getEngagementStats()` |

## How It Works

### Data Flow

```
/clients/presence (page)
  → getActiveClientsWithContext(60)        — active clients enriched with engagement + entity title
  → getRecentClientActivity({ limit: 30 }) — last 30 client events (24h window)
  → ClientPresenceMonitor (client component)
       → Supabase Realtime subscription on activity_events (same pattern as LivePresencePanel)
       → Updates presence list + stream on every INSERT
```

### `getActiveClientsWithContext()`

New server action in `lib/activity/actions.ts` that:

1. Calls the existing `getActiveClients(minutesWindow)` for the base presence data
2. Fires two parallel queries:
   - All activity events for active client IDs in the last 14 days → runs `computeEngagementScore()` per client
   - Event occasion names for any `entity_type = 'event'` entity IDs → shown as context in the row
3. Returns `ActiveClientWithContext[]` with `engagement_level`, `engagement_signals`, and `entity_title`

### `ClientPresenceMonitor` Layout

**Active Clients panel:**

- "Online Now" section (< 5 min) with animated green pulse — emerald background header
- "Recently Active" section (5–60 min) — stone background header
- Each row: avatar, client name, `EngagementBadge` (HOT/WARM/COLD), what they're doing (e.g. "on the payment page"), event occasion name if available, time-ago
- High-intent rows (payment_page_visited, proposal_viewed) get amber avatar
- Clicking any row → `/clients/{id}`

**Live Activity Stream:**

- Rolling feed of the last 30 client events (24-hour window)
- Prepended in real-time as the Realtime subscription fires
- Excludes `session_heartbeat` from display (still written to DB for engagement scoring)
- High-intent events get amber background highlight

### Realtime Subscription

Uses the identical Supabase Realtime pattern from `LivePresencePanel`:

```
channel(`client-presence-monitor:${tenantId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'activity_events', filter: tenant_id=eq.${tenantId} })
```

When a new INSERT arrives:

- Updates the active clients list (dedup by client_id, expiry by RECENT_WINDOW_MS)
- Prepends the event to the activity stream (if not a heartbeat)
- Uses name cache + async lookup for unknown clients (same fallback as LivePresencePanel)

## Entry Points

1. **Dashboard Activity widget** — `LivePresencePanel` now has a "View all →" link in the header
2. **Clients > Insights page** — "Who's Online" card + "Active Today" stat with link to monitor

## No Migration Required

All data already exists in `activity_events` (Realtime-enabled). No new DB tables, columns, or migrations.

## Related Infrastructure

| Component                  | File                                                          |
| -------------------------- | ------------------------------------------------------------- |
| Dashboard widget (compact) | `components/activity/live-presence-panel.tsx`                 |
| Client tracking            | `components/activity/activity-tracker.tsx`                    |
| Heartbeat                  | `components/activity/session-heartbeat.tsx`                   |
| Engagement scoring         | `lib/activity/engagement.ts`                                  |
| Intent notifications       | `lib/activity/intent-notifications.ts`                        |
| Activity feed page         | `app/(chef)/activity/page.tsx`                                |
| Per-client timeline        | `app/(chef)/clients/[id]/page.tsx` → `ClientActivityTimeline` |

# Activity Tracking — Phase 4 Reflection

## What Changed

Added lightweight client engagement tracking. Chefs can now see:

- **"Active Now"** — which clients are browsing the portal right now
- **Recent Activity** — chronological feed of client actions (logins, event views, quote views)

Added to the chef dashboard as a new "Client Activity" section.

## Why

Wix provides real-time visitor tracking ("see who's on your site"). ChefFlow's equivalent is seeing which clients are engaging with the portal. This gives chefs timing signals — if a client just viewed a quote, that's the perfect moment to follow up.

## Architecture

### Lightweight Event Table

`activity_events` stores one row per tracked action:

- `actor_type` (client/chef/system) + `actor_id` (auth user)
- `event_type` (portal_login, event_viewed, quote_viewed, etc.)
- `entity_type` + `entity_id` for context (which event, which quote)
- `metadata` JSONB for extensibility
- 90-day TTL via weekly cleanup cron

### Two Tracking Paths

1. **Client-side component** (`<ActivityTracker />`) — fires POST to `/api/activity/track` on mount. Used in client portal layout (tracks `portal_login`). Can be dropped into any page.

2. **Server-side function** (`trackActivity()`) — callable from server actions and API routes. Uses admin client, non-blocking (failures never thrown).

### Realtime

Table is added to `supabase_realtime` publication, so the "Active Now" widget could use Supabase Realtime subscriptions for live updates in a future enhancement.

## Files Created

| File                                                       | Purpose                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `supabase/migrations/20260221000017_activity_tracking.sql` | Schema + RLS + Realtime                                                                    |
| `lib/activity/types.ts`                                    | TypeScript types                                                                           |
| `lib/activity/track.ts`                                    | Lightweight `trackActivity()` function                                                     |
| `lib/activity/actions.ts`                                  | `getActiveClients()`, `getRecentActivity()`, `getClientTimeline()`, `getEngagementStats()` |
| `app/api/activity/track/route.ts`                          | Client-side tracking POST endpoint                                                         |
| `app/api/scheduled/activity-cleanup/route.ts`              | 90-day TTL cleanup cron                                                                    |
| `components/dashboard/active-clients-card.tsx`             | "Who's online" widget                                                                      |
| `components/dashboard/activity-feed.tsx`                   | Recent activity feed                                                                       |
| `components/activity/activity-tracker.tsx`                 | Client-side tracking component                                                             |

## Files Modified

| File                            | Change                                               |
| ------------------------------- | ---------------------------------------------------- |
| `app/(chef)/dashboard/page.tsx` | Added Client Activity section with both widgets      |
| `app/(client)/layout.tsx`       | Added `<ActivityTracker eventType="portal_login" />` |

## How It Connects

```
Client Portal
  └─ <ActivityTracker eventType="portal_login" />
      └─ POST /api/activity/track
          └─ Resolves user → client → tenant
              └─ trackActivity() → INSERT activity_events

Chef Dashboard
  └─ getActiveClients(15) → activity in last 15 min, deduped per client
  └─ getRecentActivity(15) → last 15 activity events
      └─ Renders ActiveClientsCard + ActivityFeed
```

## Future Enhancements

- Add `<ActivityTracker>` to `/my-events/[id]`, `/my-quotes/[id]` for event/quote view tracking
- Realtime subscription for live "Active Now" updates (no page refresh needed)
- Per-client activity timeline on the client detail page
- Integration with Phase 3 automations (trigger rules on client engagement)

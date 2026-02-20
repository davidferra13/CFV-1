# Client Presence & Behavior Monitoring

## What Changed and Why

The Chef previously had no visibility into when clients were on the portal or what they were doing. The `activity_events` table, Supabase Realtime, and the `ActivityTracker` component all existed but were barely used — only `portal_login` was ever tracked. This implementation wires up four connected layers to give the Chef real-time insight into client behavior.

---

## Layer 1: Instrumentation (Phase 1)

### Problem
Every meaningful client action on the portal was invisible to the Chef after it happened.

### Solution
Dropped the existing `ActivityTracker` component (already built, zero-risk to add) into every client portal page, with appropriate metadata.

### New Event Types Added to `lib/activity/types.ts`
| Event Type | Meaning |
|-----------|---------|
| `payment_page_visited` | Client landed on `/my-events/[id]/pay` — highest intent signal |
| `document_downloaded` | Client downloaded a receipt or FOH menu PDF |
| `events_list_viewed` | Client browsed the events list |
| `quotes_list_viewed` | Client browsed the quotes list |
| `chat_opened` | Client opened a chat conversation |
| `rewards_viewed` | Client browsed the loyalty/rewards page |
| `session_heartbeat` | Periodic ping while client is active on a high-value page |

Note: `quote_viewed` and `proposal_viewed` were already defined in the type system — they just weren't being fired anywhere. Now they are.

### Pages Instrumented
| Page | Event(s) Fired |
|------|---------------|
| `app/(client)/my-events/page.tsx` | `events_list_viewed` |
| `app/(client)/my-events/[id]/page.tsx` | `event_viewed` + `proposal_viewed` (when status=proposed) + heartbeat |
| `app/(client)/my-events/[id]/pay/page.tsx` | `payment_page_visited` + 30s heartbeat |
| `app/(client)/my-quotes/page.tsx` | `quotes_list_viewed` |
| `app/(client)/my-quotes/[id]/page.tsx` | `quote_viewed` + heartbeat (when pending) |
| `app/(client)/my-chat/[id]/page.tsx` | `chat_opened` |
| `app/(client)/my-rewards/page.tsx` | `rewards_viewed` |

### New Components
**`components/activity/tracked-download-link.tsx`** — A `<a>` tag wrapper that fires `document_downloaded` on click before the download proceeds. Replaces the receipt and FOH menu `<Link>` elements in the event detail page.

**`components/activity/session-heartbeat.tsx`** — Client component that fires `session_heartbeat` every 60 seconds (30s on the payment page) via `setInterval`. Enables time-on-page tracking for engagement scoring. Cleans up on unmount.

### No Migration Required
The `event_type` column in `activity_events` is `TEXT NOT NULL` with no database-level enum constraint. New values write immediately. The Zod schema in `lib/activity/schemas.ts` auto-expands from the `ACTIVITY_EVENT_TYPES` const array.

---

## Layer 2: Live Presence Panel (Phase 2)

### Problem
The "Active Clients" card on the chef dashboard was static — server-rendered at page load, never updated live.

### Solution
Replaced `ActiveClientsCard` with `LivePresencePanel`, a `'use client'` component that subscribes to Supabase Realtime and updates in real-time as clients browse the portal.

### How It Works
```typescript
supabase
  .channel(`client-presence:${tenantId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_events',
    filter: `tenant_id=eq.${tenantId}`,
  }, (payload) => {
    // Upsert client into presence map, remove stale entries
  })
  .subscribe()
```

This is the exact same Realtime pattern used in `app/(chef)/activity/activity-page-client.tsx` and `lib/chat/realtime.ts`.

### Presence Buckets
- **Online Now** (green dot, animated pulse): Last activity < 5 minutes ago
- **Recently Active** (dimmed): Last activity 5–30 minutes ago
- Removed from list: > 30 minutes

### High-Intent Visual Cue
When a client's most recent action is `payment_page_visited` or `proposal_viewed`, their avatar uses an amber color scheme instead of the normal brand color, drawing immediate attention.

### Files Changed

- `components/activity/live-presence-panel.tsx` — New component; async fallback name lookup for clients not in seed window
- `lib/activity/actions.ts` — Extended `getActiveClients()` to also fetch `entity_id` and `metadata`
- `lib/activity/types.ts` — Added `last_entity_id?` and `metadata?` to `ActiveClient` type
- `app/(chef)/dashboard/page.tsx` — Swapped import of `ActiveClientsCard` → `LivePresencePanel`, passes `tenantId`; seed window changed to 30 minutes to match panel display window

### Seed Window Alignment
`getActiveClients(30)` is passed on the dashboard so the server-side seed data covers the full 30-minute display window. The previous `getActiveClients(15)` caused clients active between 15–30 minutes ago to have their names missing from the `clientNamesRef` cache — they would appear as `'Client'` when Realtime fired.

### Unknown Client Name Fallback
When a Realtime INSERT arrives for a `client_id` not present in `clientNamesRef`, the panel fires a single async Supabase lookup: `clients.select('full_name').eq('id', clientId)`. The resolved name is cached in `clientNamesRef` for all future events from that client within the same session. This ensures that a client who was inactive for > 30 minutes before the page load and then returns to the portal still gets their name shown correctly.

---

## Layer 3: Intent Notifications (Phase 3)

### Problem
The Chef had no way to know when a client was taking a high-value action (viewing a proposal, looking at the pay button) unless they happened to be watching the dashboard at that moment.

### Solution
After each successful `trackActivity()` write, the track API route fires a non-blocking call to `checkAndFireIntentNotifications()`. This function checks whether the event warrants a chef notification, deduplicates, and creates one if appropriate.

### Notification Triggers
| Client Action | Notification | Dedup Window |
|-------------|-------------|-------------|
| Lands on payment page | "Sarah is on the payment page" | 30 min/client |
| Views proposal (status=proposed) | "Sarah opened your proposal" | 1 hour/event |
| Views a pending quote | "Sarah is reviewing your quote" | 2 hours/quote |
| Views a quote > 24h after sending | "Sarah just opened your quote (26h after sending)" | 2 hours/quote |

All notifications use the existing `createNotification()` function from `lib/notifications/actions.ts` and appear in the chef's notification feed immediately via Supabase Realtime (already configured).

### New Notification Actions in `lib/notifications/types.ts`
- `client_on_payment_page`
- `client_viewed_quote`
- `quote_viewed_after_delay`
- `client_viewed_proposal`

### Key Design Constraints
- **Fire-and-forget**: `void checkAndFireIntentNotifications(...)` — never blocks the HTTP response
- **Never throws**: All errors caught and logged; the track endpoint always returns `{ tracked: true }`
- **Deduplication**: Each notification type checks the `notifications` table for a recent duplicate before inserting

### Files Changed
- `lib/activity/intent-notifications.ts` — New module
- `lib/notifications/types.ts` — 4 new `NotificationAction` values + `NOTIFICATION_CONFIG` entries
- `app/api/activity/track/route.ts` — Added fire-and-forget call after client track success

---

## Layer 4: Engagement Score (Phase 4)

### Problem
The Chef had no way to know at a glance which clients were "hot" (likely to book soon) vs. cold (haven't engaged in weeks).

### Solution
A pure computation function that takes a client's recent activity events and returns an engagement level (HOT/WARM/COLD/none) based on weighted, recency-decayed event scores. Surfaced as a small badge on the inquiry detail page.

### Score Weights
| Event | Weight |
|-------|--------|
| `payment_page_visited` | 40 |
| `proposal_viewed` | 30 |
| `quote_viewed` | 20 |
| `event_viewed` / `invoice_viewed` | 15 |
| `rsvp_submitted` | 12 |
| `document_downloaded` | 8 |
| `chat_opened` / `chat_message_sent` | 10 |
| `portal_login` / `rewards_viewed` | 5 |

Scores use a recency multiplier that decays from 1.0 (brand new) to 0.1 at the 14-day window edge.

**Thresholds**: HOT ≥ 60, WARM ≥ 25, COLD > 0, none = 0.

### Where It Appears
- **Inquiry detail page** (`app/(chef)/inquiries/[id]/page.tsx`): HOT/WARM/COLD badge next to the client name in the header. Only shown when the inquiry is linked to a registered client (not anonymous leads).

### Files Changed
- `lib/activity/engagement.ts` — New module (pure function, no DB writes)
- `components/activity/engagement-badge.tsx` — New badge component
- `app/(chef)/inquiries/[id]/page.tsx` — Fetches client activity + displays badge

---

## Feed Noise Prevention

`session_heartbeat` fires every 60 seconds on high-value pages. It is written to the DB for engagement score computation but is **never shown in any display feed**. Filtering is applied at three layers:

1. **`getRecentClientActivity()`** — passes `excludeEventTypes: ['session_heartbeat']` to the DB query
2. **`ClientActivityFeed` component** — filters at render time via `HIDDEN_FROM_FEED` set
3. **`activity-page-client.tsx` all-activity timeline** — early-returns `null` for heartbeat rows

`getClientTimeline()` does NOT exclude heartbeats because the engagement score algorithm needs them.

---

## How to Verify

1. **Instrumentation**: Log in as a test client, visit `/my-events/[id]` and `/my-events/[id]/pay`. Open Supabase dashboard → Table Editor → `activity_events`. Confirm rows appear with:
   - `event_type: "event_viewed"` and `"payment_page_visited"`
   - `client_id` populated
   - `metadata` containing occasion, amounts, etc.

2. **Realtime presence panel**: Open the chef dashboard in one browser. In a separate browser (or incognito), log in as a client and browse around. Without refreshing the chef browser, confirm that the "Client Activity" panel updates within a few seconds.

3. **Intent notifications**: As a client, navigate to `/my-events/[id]/pay` (requires an accepted event). In the chef browser, open the notifications panel. A "Sarah is on the payment page" notification should appear within seconds. Visit the page a second time — it should NOT fire again within 30 minutes.

4. **Engagement badge**: Navigate to an inquiry (`/inquiries/[id]`) for a client who has recent portal activity (viewed a quote or proposal). A HOT or WARM badge should appear next to the client name. For a fresh client with no activity, no badge is shown.

5. **No regression**: Existing `portal_login` tracking still fires on client portal entry. Chat Realtime still works. Notifications from other triggers (quote sent, payment received) still appear.

---

## Architecture Connection

This feature sits entirely within the existing activity system:
- **Data**: `activity_events` table (already existed, no migration)
- **Write path**: `/api/activity/track` route → `trackActivity()` → `activity_events`
- **Realtime**: Supabase Realtime on `activity_events` (already configured via `ALTER PUBLICATION`)
- **Notifications**: Existing `notifications` table + `createNotification()` function
- **Read path**: `getClientTimeline()` → `computeEngagementScore()` (pure function)

No new tables, no migrations, no new API routes.

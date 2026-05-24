# Spec: Event Pulse

> **Status:** SPEC-READY
> **Priority:** P1
> **Depends on:** connected-chefs-activity (BUILT), event-readiness (BUILT), conflict-detection (BUILT), account-anchored-location (BUILT)
> **Route:** `/events` (replaces current `/events/current` as default landing)

## Timeline

| Event   | Date       | Agent/Session | Commit |
| ------- | ---------- | ------------- | ------ |
| Created | 2026-05-24 | Opus 4.6      |        |

---

## What This Does (Plain English)

Event Pulse fuses three awareness layers into one operational surface. A chef opens one page and immediately knows:

1. **"What do I have coming up, and am I ready?"** (Personal Horizon)
2. **"What's happening around me?"** (Local Landscape)
3. **"What's my network doing?"** (Network Signal)

It is not a calendar (dates), not a dashboard (metrics), not a list (data). It is situational awareness for a working chef. The countdown urgency, readiness dots, conflict warnings, and week-at-a-glance bar make it operational: you see it and know what to do next.

---

## Why It Matters

ChefFlow has a calendar, a board, an event list, and a "current events" page. None of them answer all three questions in one glance. A chef checking their week currently needs to visit multiple views, mentally cross-reference readiness against dates, and has zero ambient awareness of their network or local opportunities. Pulse collapses that into one surface that loads with morning coffee.

---

## Design Decisions

| Decision                    | Choice                                                     | Rationale                                                                                |
| --------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Default landing             | Pulse replaces `/events` as default                        | Situational awareness first, data table second                                           |
| Event card limit            | 8 cards max, "View all" link to list                       | Pulse is "what needs attention NOW" not "show everything"                                |
| Readiness display           | Distribution ("3 of 5 ready") not average                  | Average flattens operational signal. Count of unready = action signal                    |
| Readiness dots              | Deep-link to specific gap                                  | One click from gap to fix. Informational vs operational difference                       |
| Urgency x readiness cross   | Warning badge when soon + unready                          | Core insight no other view surfaces                                                      |
| Conflict surfacing          | Warning count in week bar, link to timeline                | Pulse surfaces signal, timeline handles resolution                                       |
| Network empty state         | Section header always visible, quiet CTA                   | Progressive disclosure. Feature must be discoverable                                     |
| Network framing             | Collaborative, never competitive                           | Factual signals only. No rankings. "Community is cooking" not "you're behind"            |
| Local section               | "Local Opportunities" (markets + festivals + classes)      | Year-round relevance, not just summer markets                                            |
| Snapshot staleness          | 24h max acceptable, relative timestamp on cards            | Ambient awareness, not real-time trading                                                 |
| Seasonal ingredient display | Not this build                                             | Chefs know what's in season. Future: wire PIE data to market cards                       |
| Network contextualization   | Not this build                                             | Raw signals sufficient. Referral prompts and availability overlays are future extensions |
| High-volume scaling         | Top 8 + summary, link to list                              | Week-at-a-glance handles aggregate view                                                  |
| Location unset              | One-line prompt, don't block Pulse                         | Graceful degradation, not a gate                                                         |
| Gaming prevention           | Already handled: only active statuses, streaks = completed | Trust-based network. Faking events lies to your own Pulse too                            |

---

## Navigation Restructure

Current events hub nav (4 tabs):

```
All Events | Board | Calendar | Current
```

New events hub nav (4 tabs):

```
Pulse (default) | List | Board | Calendar
```

- `Pulse` = `/events` (this spec, the new default landing)
- `List` = `/events/list` (current events table, moved)
- `Board` = `/events/board` (unchanged)
- `Calendar` = `/calendar` (unchanged)

The old `/events/current` route redirects to `/events`.

---

## Layer 1: Personal Horizon

### Week-at-a-Glance Bar

Enhanced summary bar at the top. Shows:

```
[Zap icon] Your Week at a Glance
3 events this week | Next: Saturday dinner in 2 days | 2 of 3 ready | 1 conflict
```

Fields:

- **Event count this week:** integer (unchanged)
- **Next event countdown:** name + relative time (unchanged)
- **Readiness distribution:** `{readyCount} of {totalCount} ready` with color coding
  - All ready: emerald
  - Some unready: amber
  - Most unready: red
- **Conflict count** (NEW): `{n} conflict(s)` in amber if >0, links to `/events/timeline`
  - Uses existing `detectEventConflicts()` from `lib/events/conflict-detection.ts`
  - Counts same_day + back_to_back conflicts among upcoming events

### Event Cards (max 8)

Sorted by date ascending. Only chef events (not markets/calendar entries).

Each card shows:

- Event title, date, location, guest count (unchanged)
- Source badge, status badge (unchanged)
- **Urgency border** (existing tiers: today=amber, tomorrow=sky, <7d=stone)
- **Readiness dots** (menu, contract, deposit) with deep-link behavior:
  - Green dot: inert (done)
  - Red/stone dot: clickable link to the specific gap
    - Menu gap → `/events/{id}` (overview tab, menu section)
    - Contract gap → `/events/{id}/documents`
    - Deposit gap → `/events/{id}/billing`
- **Urgency x readiness warning** (NEW):
  - Within 48 hours + readiness < 66%: amber warning badge "Not ready"
  - Within 7 days + readiness < 33%: stone warning badge "Needs attention"
  - Badge appears below readiness dots

When more than 8 upcoming events exist:

- Show 8 cards
- Below the grid: `"View all {n} events"` link to `/events/list`

### Data Source

- `fetchUpcomingChefEvents()` (existing, limit 50)
- `getEventReadiness()` (existing, batch)
- `detectEventConflicts()` (existing, wire to page)

---

## Layer 2: Local Landscape

### Section: "Local Opportunities"

Renamed from "Nearby Farmers Markets." Combines:

1. **In-season farmers markets** (existing `fetchNearbyMarkets()`)
2. **Calendar entries with local relevance** (festivals, classes, pop-ups)
   - Already fetched by `fetchCalendarEvents()` with types: market, festival, class, photo_shoot, media

Rendering:

- Combined grid of `CurrentEventCard` components
- Markets sorted by distance, calendar entries by date
- Max 6 items, no "view all" (these are ambient signals)

When location is unset (no lat/lng):

- Show section header "Local Opportunities"
- Single line: "Set your location in settings to see nearby opportunities" → `/settings/profile-branding`
- Don't block or hide the section header

When location is set but no results:

- Hide section entirely (current behavior, correct)

### Data Source

- `fetchNearbyMarkets()` (existing, graceful on null location)
- `fetchCalendarEvents()` (existing, filter to locally relevant types)

---

## Layer 3: Network Signal

### Section: "Network Activity"

Connected chefs' aggregate activity. Uses existing `NetworkActivitySection` with enhancements.

Each card shows (existing):

- Chef avatar/initials
- Display name
- Dinner count ("5 dinners coming up")
- Streak badge (>2 weeks)
- Busiest day

Enhancements:

- **Freshness indicator** (NEW): relative timestamp from `updatedAt` ("2h ago", "yesterday")
  - Show as subtle text below busiest day line
  - Warns if data is >24h stale: "(stale)" suffix in stone-600

### Empty States (NEW)

Current behavior: `return null` when empty. New behavior:

**Chef has zero connections:**

```
Network Activity
Connect with other chefs to see network activity. [Explore Network]
```

- "Explore Network" links to `/network`
- Single line, stone-500 text, no card/box treatment

**Chef has connections but none share activity:**

```
Network Activity
Your connections haven't shared their activity yet.
```

- Single line, stone-500 text
- No CTA (sharing is their choice)

**Chef has connections with activity:**

- Render cards as current (unchanged)

### Privacy Contract (unchanged)

- Materialized snapshots: counts only, no client data
- Opt-in, default OFF
- Delete-on-opt-out (immediate row deletion)
- Only accepted connections see activity
- No ranking, no comparison to viewer's own stats

### Data Source

- `getConnectedChefsActivity()` (existing)
- `getChefConnectionCount()` (NEW: simple count query to distinguish zero-connections from zero-sharing)

---

## Route Changes

### New Files

| File                                            | Purpose                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `app/(chef)/events/pulse-content.tsx`           | Main Pulse content (server component, replaces CurrentEventsList) |
| `components/events/readiness-dot-link.tsx`      | Clickable readiness dot with deep-link                            |
| `components/events/urgency-readiness-badge.tsx` | Cross-referenced urgency warning badge                            |

### Modified Files

| File                                             | Change                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `app/(chef)/events/page.tsx`                     | Replace events hub tiles with Pulse layout                    |
| `app/(chef)/events/events-hub-nav.tsx`           | Rename tabs: Pulse, List, Board, Calendar                     |
| `app/(chef)/events/current/page.tsx`             | Redirect to `/events`                                         |
| `components/events/current-event-card.tsx`       | Wire readiness dots to `ReadinessDotLink`, add urgency badge  |
| `components/events/network-activity-section.tsx` | Add empty states, freshness timestamp                         |
| `lib/events/current-events.ts`                   | Add conflict count to return type, rename local section logic |

### New Route

| Route          | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `/events/list` | Moved: current events table (paginated, filterable) |

### Redirect

| From              | To              |
| ----------------- | --------------- |
| `/events/current` | `/events` (301) |

---

## Component Specifications

### ReadinessDotLink

```typescript
type ReadinessDotLinkProps = {
  label: 'Menu' | 'Contract' | 'Deposit'
  done: boolean
  eventId: string
}
```

- When `done`: render green dot (`bg-emerald-500`), no link, `cursor-default`
- When not `done`: render stone dot (`bg-stone-700`), wrapped in `<Link>` to gap URL:
  - Menu → `/events/${eventId}` (default tab has menu)
  - Contract → `/events/${eventId}/documents`
  - Deposit → `/events/${eventId}/billing`
- Hover on incomplete: `bg-amber-500/60` with tooltip "Add {label}"

### UrgencyReadinessBadge

```typescript
type UrgencyReadinessBadgeProps = {
  daysAway: number
  readinessScore: number // 0-100
}
```

Logic:

- `daysAway <= 2 && readinessScore < 66` → amber badge "Not ready"
- `daysAway <= 7 && readinessScore < 33` → stone badge "Needs attention"
- Otherwise: `null` (no badge)

Rendering: small inline badge below readiness dots, same sizing as status badges.

---

## Week-at-a-Glance Data Contract

```typescript
type WeekGlanceData = {
  thisWeekCount: number
  nextEvent: { title: string; daysUntil: number } | null
  readiness: {
    total: number // total chef events with readiness data
    ready: number // events with readinessScore >= 99
    needsWork: number // events with readinessScore < 99
  }
  conflicts: {
    count: number // same_day + back_to_back conflicts
    href: string // '/events/timeline'
  }
}
```

---

## Network Connection Count Query

New function in `lib/network/activity/queries.ts`:

```typescript
export async function getChefConnectionCount(chefId: string): Promise<number>
```

Simple count of accepted connections. Used only to distinguish empty states.

---

## What This Does NOT Include

Explicitly deferred (not in this build):

- Seasonal ingredient display on market cards (future: wire PIE data)
- Network contextualization against viewer's calendar (future: referral prompts, availability overlays)
- External event sources for Local Opportunities (future: food festival APIs)
- Guest/consumer visibility of network activity
- Event headline sharing (opt-in per event)
- Availability calendar overlay for connected chefs

---

## Testing Plan

### Readiness distribution

- Chef with 3 events (2 ready, 1 not): bar shows "2 of 3 ready" in amber
- Chef with 3 events (3 ready): bar shows "3 of 3 ready" in emerald
- Chef with 0 events: bar hidden

### Readiness dot deep-links

- Click red menu dot: navigates to event detail page
- Click red contract dot: navigates to `/events/{id}/documents`
- Click red deposit dot: navigates to `/events/{id}/billing`
- Click green dot: no navigation (inert)

### Urgency x readiness cross

- Event tomorrow with 0% readiness: amber "Not ready" badge visible
- Event in 5 days with 33% readiness: stone "Needs attention" badge visible
- Event in 5 days with 66% readiness: no badge
- Event in 14 days with 0% readiness: no badge

### Conflict detection

- 2 events on same day: week bar shows "1 conflict"
- Events on consecutive days: week bar shows "1 conflict"
- No conflicts: conflict count hidden

### Network empty states

- Chef with 0 connections: "Connect with other chefs" message visible
- Chef with 3 connections, none sharing: "haven't shared" message visible
- Chef with 3 connections, 2 sharing: 2 activity cards rendered
- Snapshot >24h old: "(stale)" suffix visible

### Card limit

- Chef with 12 events: 8 cards shown + "View all 12 events" link
- Chef with 5 events: 5 cards shown, no "view all" link

### Location handling

- Location unset: "Set your location" prompt in Local Opportunities section
- Location set, no results: section hidden
- Location set, 10 markets: 6 shown

### Navigation

- `/events` renders Pulse (not old hub tiles)
- `/events/current` redirects to `/events`
- `/events/list` renders old events table
- Hub nav shows: Pulse | List | Board | Calendar

---

## Accessibility

- Readiness dot links have `aria-label="Add menu for {event title}"` (or contract/deposit)
- Urgency badges have `role="status"`
- Network section uses `aria-live="polite"` for empty state messages
- All color indicators have text alternatives (tooltip or adjacent label)

---

## Performance

- No new database queries for Pulse (reuses existing batch queries)
- Conflict detection is pure function on already-fetched events (no DB call)
- Connection count is single `COUNT(*)` query (cheap)
- Network section already server-rendered with Suspense boundary
- Market radius filtering happens server-side (existing)

---

## Migration

No new database tables or columns required. All data sources already exist:

- `events` table (chef events)
- `chef_activity_snapshots` table (network signals)
- `farmers_markets` table (local markets)
- `chef_calendar_entries` table (calendar events)
- `chef_connections` table (connection count)
- `menus`, `contracts`, `ledger_entries` (readiness signals)

Route restructure is code-only. `/events/current` → `/events` redirect is a Next.js `redirect()` in the old page file.

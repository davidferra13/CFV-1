# Network Pulse

> The intelligence layer between ChefFlow's social graph and operational data. Transforms passive awareness ("Maria has 5 dinners") into actionable network intelligence ("your network is heating up, and Maria has capacity for referrals").

## Status: SPEC-READY

## Relationship to Connected Chefs Activity

Connected Chefs Activity (`docs/specs/connected-chefs-activity.md`) built the plumbing:

- `chef_activity_snapshots` table (aggregate counts only, no raw data)
- Opt-in toggle with default OFF, row deletion on opt-out
- Feed adapter (weight 0.4) and rail item (`chef.network_friend_busy`)
- Server component `NetworkActivitySection` (horizontal card scroll)

Network Pulse adds:

1. **Intelligence** - CIL integration, anomaly detection, network trend signals
2. **Actions** - message, refer, collaborate from pulse cards
3. **Freshness** - staleness tiers, auto-purge, aging indicators
4. **Circle awareness** - optional filtering by dinner circle membership
5. **Self-view** - "what your connections see about you" preview
6. **Relative thresholds** - anomaly-based rail triggers instead of absolute counts

No tables are replaced. One column added to existing snapshot table. One new CIL analyzer created.

## Product Decisions

| Question                       | Decision                                 | Rationale                                                                                                                      |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| What action from a pulse card? | Message, Refer, Collaborate (contextual) | Operational copilot, not Instagram. Actions everywhere.                                                                        |
| Competitive intelligence risk? | Self-regulating                          | Mutual acceptance + opt-in toggle. Private chef community is referral-networked, not zero-sum. Don't connect with competitors. |
| CIL feedback loop?             | Yes. New `network` signal domain         | Wire existing > build new. CIL stays per-tenant; just gets a new input source.                                                 |
| Circle scoping?                | View filter, not data model              | Circles are the relationship primitive. Snapshots stay flat; queries get optional `circleId`.                                  |
| Staleness?                     | 3 freshness tiers + auto-purge           | Zero hallucination rule. Stale data is misleading data.                                                                        |
| Rail trigger model?            | Anomaly-based (deviation from average)   | Absolute thresholds create "boy who cried wolf." A busy chef firing 3x/week forever gets ignored.                              |
| Comparison anxiety?            | Aggregate framing ("network heating up") | Individual cards are fine. Intelligence layer uses network-level language, not "Maria has 12 and you have 0."                  |
| Self-view?                     | Yes, settings page preview               | Trust calibration. Can't trust a toggle if you can't see what it shares.                                                       |
| Empty state framing?           | Opportunity language, never ghost-town   | "Your network is quiet" not "nobody is sharing."                                                                               |

## Data Layer Changes

### Migration: add rolling average to snapshots

```sql
ALTER TABLE chef_activity_snapshots
  ADD COLUMN avg_weekly_events NUMERIC(5,2) NOT NULL DEFAULT 0;
```

Computed during snapshot refresh: rolling 4-week average of completed events per week. Enables relative anomaly detection.

No new tables. The intelligence layer uses CIL's existing per-tenant SQLite for signal storage.

### Updated Snapshot Job

`refreshActivitySnapshot` gains one additional computation:

```
avg_weekly_events = COUNT(completed events in past 28 days) / 4.0
```

This uses the same `pastEvents` query already fetched for streak calculation. Zero additional DB calls.

## Freshness Model

Three tiers based on `chef_activity_snapshots.updated_at`:

| Tier  | Age          | Behavior                                         |
| ----- | ------------ | ------------------------------------------------ |
| Fresh | < 24 hours   | Shown normally                                   |
| Aging | 24h - 7 days | Shown with subtle "updated X days ago" indicator |
| Stale | > 7 days     | Hidden from feed and rail. Still in DB.          |
| Ghost | > 30 days    | Row deleted by periodic sweep                    |

### Implementation

`getConnectedChefsActivity` adds a `WHERE updated_at > NOW() - INTERVAL '7 days'` clause to exclude stale snapshots. The UI component reads `updatedAt` and renders the aging indicator when > 24h old.

Ghost cleanup: a function `purgeStaleSnapshots()` deletes rows older than 30 days. Called from CIL hourly scanner alongside the existing snapshot refresh sweep.

## Action Surface

Activity cards gain three contextual actions:

### 1. Message (always visible)

- Small message icon on each card
- Opens direct message compose to that chef
- Uses existing messaging infrastructure (`lib/network/collab-space-actions.ts` or direct thread)

### 2. Refer (contextual)

- Appears when the viewing chef's own `upcoming_event_count > avg_weekly_events * 1.5` (they're busier than normal)
- AND the connection's `upcoming_event_count < avg_weekly_events * 0.5` (connection has capacity)
- OR chef is marked unavailable (injury/vacation status)
- Label: "Refer a client"
- Opens a direct message thread to that connection with a pre-filled referral template
- No separate referral system needed; the message IS the referral channel between trusted connections

### 3. Collaborate (contextual)

- Appears when both chefs have events in the same week
- Label: "Co-host?"
- Opens collaboration space thread with the connection
- Uses existing collab spaces infrastructure

### Determining Context

The viewing chef's own snapshot is fetched once (their own `chef_activity_snapshots` row) and compared against each connection's snapshot to determine which actions surface. This is a single additional query in `getConnectedChefsActivity`, not per-card.

## CIL Integration

### New Signal Source

Add `'network_pulse'` to the `SignalSource` type union in `lib/cil/types.ts`.

### New Signal Domain

Add `'network'` to the `SignalDomain` type union in `lib/cil/types.ts`.

### New Analyzer: `lib/cil/analyzers/network.ts`

The network analyzer runs during CIL's hourly scan cycle. It reads cross-tenant snapshot data (via admin client) for the chef's accepted connections, then produces per-tenant proactive signals.

#### Signal Types

| Signal               | Condition                                                                                | Urgency | Suggested Action                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `network_heating`    | Aggregate upcoming events across connections > 30% above their combined rolling averages | 2       | "Your network is heating up. Good time to reach out for referrals."       |
| `network_cooling`    | Aggregate upcoming events across connections < 30% below their combined rolling averages | 1       | "Network slowing down. Consider proactive outreach."                      |
| `referral_window`    | Chef is busy (>1.5x own avg) AND a connection has capacity (<0.5x their avg)             | 3       | "You're booked solid. {connectionName} has availability; refer a client?" |
| `capacity_available` | Chef has low bookings (<0.5x own avg) AND connections are busy                           | 2       | "You have availability and your network is busy. Let connections know."   |
| `streak_milestone`   | A connection hits a streak milestone (4, 8, 12 weeks)                                    | 1       | "Congrats to {connectionName} on a {n}-week booking streak!"              |

#### Privacy Contract

- The analyzer runs in the context of a specific chef's CIL tenant
- It reads only from `chef_activity_snapshots` (pre-aggregated, no raw data)
- Signals are stored in the chef's per-tenant SQLite (never cross-tenant)
- Connection names in signal text come from `chefs.display_name` / `business_name`

#### Remy Integration

Signals with urgency >= 3 are formatted via `formatSignalsForRemy()` (existing CIL infrastructure). Remy can surface referral windows in conversation: "By the way, you're pretty booked this week and Chef Maria has availability. Want to send her a referral?"

## Circle-Aware Filtering

### Query Layer

`getConnectedChefsActivity` gains an optional `circleId?: string` parameter:

```typescript
export async function getConnectedChefsActivity(
  chefId: string,
  options?: { circleId?: string }
): Promise<ConnectedChefActivity[]>
```

When `circleId` is provided:

1. Get circle members from `dinner_circle_members` for that circle
2. Intersect with accepted connections
3. Filter snapshots to only those chef IDs

When omitted: existing behavior (all accepted connections).

### UI

The `NetworkActivitySection` component gets an optional circle selector dropdown when the chef belongs to 2+ circles. Default view: "All Connections." Circle views show only members of that circle who are sharing activity.

## Self-View (Settings Preview)

### Location

`app/(chef)/settings/connections/page.tsx` (or wherever the activity sharing toggle lives)

### Behavior

Below the "Share my activity with connections" toggle, when enabled:

- Render a preview card showing what the chef's own snapshot looks like to connections
- Same `ActivityCard` component, labeled "Your connections see:"
- Updates live when toggle changes

### Implementation

Call `refreshActivitySnapshot(chefId)` on toggle change, then fetch the chef's own snapshot row and render a preview `ActivityCard`.

## Rail Refinement

### Change: Anomaly-Based Trigger

Current `chef.network_friend_busy` fires when `upcoming_event_count >= 3` (absolute).

Change to: fires when `upcoming_event_count > avg_weekly_events * 2.0` (relative anomaly). A chef who always has 8 events doesn't fire. A chef who normally has 1 event but suddenly has 4 fires.

### Change: Network Aggregate Item

Add a new rail item `chef.network_heating` in `social_network` category:

- Fires when the CIL `network_heating` signal is active
- `baseUrgency: 40` (higher than individual chef items)
- `labelTemplate: "Your network is busier than usual this week"`
- `maxImpressions: 2` per week
- `cooldownMinutes: 1440` (once per day max)
- `href: '/network'`

## Empty States

| Connections Sharing | Behavior                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| 0                   | "Your network is quiet. When connections share their activity, you'll see it here." No CIL signals generated. |
| 1-2                 | Show individual cards. No aggregate intelligence (sample too small).                                          |
| 3+                  | Enable aggregate trend signals (`network_heating`, `network_cooling`). Show trend indicator.                  |
| 10+                 | Full intelligence mode. Circle filtering enabled.                                                             |

## Feed Adapter Update

The existing `networkActivityAdapter` in `source-registry.ts` needs two changes:

1. **Freshness filter**: Skip entries where `updatedAt` is > 7 days ago
2. **Score refinement**: Use anomaly ratio instead of raw count

```
score = Math.min((upcomingEventCount / max(avgWeeklyEvents, 1)) * 20, 60)
```

A chef at 3x their normal pace scores higher than a chef who's always at 5.

## Files to Create

| File                           | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `lib/cil/analyzers/network.ts` | Network pulse CIL analyzer (5 signal types) |

## Files to Modify

| File                                                       | Change                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `lib/cil/types.ts`                                         | Add `'network_pulse'` to SignalSource, `'network'` to SignalDomain          |
| `lib/cil/scanner.ts`                                       | Register network analyzer in scan cycle                                     |
| `lib/network/activity/snapshot-job.ts`                     | Compute `avg_weekly_events`, upsert new column                              |
| `lib/network/activity/queries.ts`                          | Add freshness filter, optional `circleId`, return `avgWeeklyEvents`         |
| `lib/feed/source-registry.ts`                              | Freshness filter + anomaly-based scoring                                    |
| `lib/discovery/registries/chef-rail-registry.ts`           | Change `network_friend_busy` to anomaly trigger, add `network_heating` item |
| `components/events/network-activity-section.tsx`           | Add action buttons, aging indicator, circle selector, empty states          |
| `app/(chef)/settings/connections/page.tsx` (or equivalent) | Add self-view preview card below toggle                                     |
| `database/migrations/[next-timestamp]_network_pulse.sql`   | Add `avg_weekly_events` column to snapshots                                 |

## Migration Needed

One migration: add `avg_weekly_events NUMERIC(5,2) NOT NULL DEFAULT 0` to `chef_activity_snapshots`. Additive only. No data loss. Existing rows get default 0, populated on next snapshot refresh.

## Testing

### CIL Analyzer Tests

- Chef with 5 connections, 3 busier than average: `network_heating` signal fires
- Chef with 5 connections, 3 quieter than average: `network_cooling` signal fires
- Chef at 2x own average + connection at 0.3x: `referral_window` signal fires
- Chef with 0 connections: no signals, no errors
- Chef with connections but none sharing: no signals

### Freshness Tests

- Snapshot updated 2 hours ago: shown, no indicator
- Snapshot updated 3 days ago: shown, aging indicator visible
- Snapshot updated 10 days ago: hidden from feed and rail
- Snapshot updated 35 days ago: row purged by sweep

### Action Surface Tests

- Chef at normal pace: message action only on each card
- Chef at 1.5x+ pace with idle connection: refer action appears on that card
- Chef with same-week events as connection: collaborate action appears
- All actions route to correct destinations (message thread, referral compose, collab space)

### Circle Filtering Tests

- Chef in 2 circles with overlapping members: no duplicates
- Circle filter + freshness: stale members hidden even within circle
- Chef with no circles: circle selector hidden

### Self-View Tests

- Toggle ON: preview card renders with current snapshot data
- Toggle OFF: preview card hidden, snapshot row deleted
- Toggle ON with no events: preview shows "0 dinners" (honest, not hidden)

### Privacy Tests

- CIL signals reference connection names but never client names or financials
- Network analyzer cannot access raw events (only snapshot aggregates)
- Signals stored in per-tenant SQLite, never cross-tenant

## Future Extensions (NOT in this build)

- **Trend sparklines**: 4-week mini-chart on each activity card showing trajectory
- **Network health score**: single 0-100 score combining activity density, diversity, and reciprocity
- **Seasonal network patterns**: "Your network typically slows down in January" based on historical snapshots
- **Cross-market pulse**: geographic clustering of connections ("East Coast network is heating up")
- **Pulse digest email**: weekly summary of network activity for chefs who opt in
- **Guest-facing pulse**: "Your chef's network is busy this season" on client portal

## Done-When Criteria

1. `avg_weekly_events` column exists and populates on snapshot refresh
2. CIL network analyzer produces signals during hourly scan for chefs with 3+ sharing connections
3. Stale snapshots (>7d) hidden from feed and rail; ghost snapshots (>30d) purged
4. Activity cards show message action (always) + refer/collaborate (contextual)
5. Rail item `chef.network_friend_busy` fires on anomaly, not absolute threshold
6. New rail item `chef.network_heating` fires on aggregate network trend
7. Self-view preview renders on settings page when toggle is ON
8. Circle selector appears when chef belongs to 2+ circles
9. Empty states use opportunity language at all scales
10. All signals respect tenant isolation (per-tenant SQLite, no raw cross-tenant data)

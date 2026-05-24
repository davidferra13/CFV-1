# Connected Chefs Activity

> Let chefs see what their friends are doing. Aggregate activity signals from connected chefs who opt in.

## Status: SPEC-READY

## Problem

Chefs operate in isolation. A chef with 20 connections has no idea if their network is busy or slow this week. This matters for referrals ("I'm slammed, send them to Maria"), collaboration ("Let's co-host, you're free Saturday too"), and community ("The whole network is cooking this weekend").

No raw event data crosses tenant boundaries. Only pre-computed aggregates.

## Decisions

| Decision          | Choice                                  | Rationale                                                                          |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Detail level      | Aggregate signals only                  | Non-competitive, privacy-safe. Counts and trends, never client names or financials |
| Relationship gate | Accepted connections only               | Mutual trust signal. Follows alone insufficient                                    |
| UI surfaces       | Composed feed + rail item               | Natural discovery in existing flows, no new pages                                  |
| Data strategy     | Materialized snapshots                  | Respects tenant isolation. No cross-tenant event queries at render time            |
| Opt-in model      | Explicit preference toggle, default OFF | Chef must actively choose to share                                                 |

## Data Layer

### Migration: `20260524000001_connected_chefs_activity.sql`

**New table: `chef_activity_snapshots`**

```sql
CREATE TABLE chef_activity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  upcoming_event_count INT NOT NULL DEFAULT 0,
  current_week_count INT NOT NULL DEFAULT 0,
  current_month_count INT NOT NULL DEFAULT 0,
  last_event_date DATE,
  busiest_day TEXT,
  streak_weeks INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chef_activity_snapshot UNIQUE (chef_id)
);

CREATE INDEX idx_chef_activity_snapshots_chef ON chef_activity_snapshots(chef_id);
CREATE INDEX idx_chef_activity_snapshots_upcoming ON chef_activity_snapshots(upcoming_event_count)
  WHERE upcoming_event_count > 0;
```

**New column on `chef_preferences`:**

```sql
ALTER TABLE chef_preferences
  ADD COLUMN share_activity_with_connections BOOLEAN NOT NULL DEFAULT false;
```

### Privacy Contract

- `chef_activity_snapshots` has NO foreign key to `events`. No join path to raw data.
- Only integer counts and a day-of-week string. No client names, locations, financials, occasion types.
- Row is deleted immediately when chef opts out (not just zeroed).
- Table is cross-tenant by design (like `chef_connections`).

## Snapshot Job

### File: `lib/network/activity-snapshot-job.ts`

**Function: `refreshActivitySnapshot(chefId: string)`**

1. Read `chef_preferences.share_activity_with_connections` for this chef
2. If `false`: DELETE from `chef_activity_snapshots` WHERE chef_id = chefId. Return.
3. If `true`: query chef's own `events` table:
   - `upcoming_event_count`: COUNT where `status IN ('accepted','paid','confirmed','in_progress')` AND `event_date >= CURRENT_DATE`
   - `current_week_count`: same filter + `event_date` within current ISO week
   - `current_month_count`: same filter + `event_date` within current calendar month
   - `last_event_date`: MAX(event_date) from upcoming events
   - `busiest_day`: mode of `EXTRACT(DOW FROM event_date)` across upcoming events, mapped to day name
   - `streak_weeks`: count consecutive past weeks (up to 12) where chef had at least 1 completed event
4. UPSERT into `chef_activity_snapshots`

### Trigger Points

- Called at end of event mutation server actions: create, update status, delete, reschedule
- Called when `share_activity_with_connections` preference changes
- Available as periodic sweep (integrate with CIL hourly scanner)

### File: `lib/network/activity-snapshot-queries.ts`

**Function: `getConnectedChefsActivity(chefId: string)`**

1. Get all accepted connections for chefId (from `chef_connections` where status = 'accepted')
2. JOIN to `chef_activity_snapshots` for those connected chef IDs
3. JOIN to `chefs` for display_name, business_name, profile_image_url
4. Return array of `ConnectedChefActivity`:

```typescript
interface ConnectedChefActivity {
  chefId: string
  displayName: string | null
  businessName: string
  profileImageUrl: string | null
  upcomingEventCount: number
  currentWeekCount: number
  currentMonthCount: number
  lastEventDate: string | null
  busiestDay: string | null
  streakWeeks: number
  updatedAt: string
}
```

5. Filter: only return entries where `upcoming_event_count > 0`
6. Sort by `upcoming_event_count` DESC

## Feed Integration

### File: `lib/feed/source-registry.ts` (modify)

**New adapter: `networkActivityAdapter`**

```typescript
const networkActivityAdapter: FeedSourceAdapter = {
  name: 'network_activity',
  weight: 0.4,
  adapt(items: unknown[]): ComposedFeedEntry[] {
    return (items as ConnectedChefActivity[]).map((chef) => ({
      id: `network-activity-${chef.chefId}`,
      source: 'network_activity',
      score: Math.min(chef.upcomingEventCount * 10, 60),
      timestamp: new Date(chef.updatedAt).getTime(),
      label: `${chef.displayName ?? chef.businessName} has ${chef.upcomingEventCount} dinner${chef.upcomingEventCount === 1 ? '' : 's'} coming up`,
      sublabel:
        chef.streakWeeks > 2
          ? `${chef.streakWeeks}-week streak`
          : chef.busiestDay
            ? `Busiest on ${chef.busiestDay}s`
            : undefined,
      href: '/network',
      icon: 'users',
      category: 'social_network',
      presentation: 'card' as const,
      expandable: false,
      originalData: chef,
    }))
  },
}
```

Add to `SOURCE_REGISTRY` array.

## Rail Integration

### File: `lib/discovery/registries/chef-rail-registry.ts` (modify)

**New rail item definition:**

```typescript
{
  id: 'chef.network_friend_busy',
  role: 'chef',
  label: 'Connected chef busy',
  labelTemplate: '{chefName} has {count} dinners coming up',
  category: 'social_network',
  baseUrgency: 30,
  urgencyDecayFn: 'linear',
  relevanceSignals: ['chef_name', 'upcoming_count', 'streak'],
  freshnessWindow: '1d',
  pageAffinity: '/network',
  pageAffinityBoost: 15,
  href: '/network',
  hrefTemplate: '/network',
  dataSources: ['chef_activity_snapshots', 'chef_connections'],
  privacy: 'role_scoped',
  dismissable: true,
  expandable: false,
  hoverAction: 'preview',
  clickAction: 'navigate',
  maxImpressions: 3,
  cooldownMinutes: 480,
  renderHints: { presentation: 'card', icon: 'users', animate: false, priority: 'low' },
  scoringNotes: 'Fires when connected chef has upcoming_event_count >= 3. Max 3 impressions per week per connected chef. 8hr cooldown.',
}
```

## Settings UI

### File: `app/(chef)/settings/` (modify existing preferences page)

Add toggle in the "Network & Social" or "Privacy" section:

- **Label:** "Share my activity with connections"
- **Description:** "Let connected chefs see how busy you are. Only dinner counts are shared, never client names or details."
- **Control:** Toggle switch
- **Maps to:** `chef_preferences.share_activity_with_connections`
- **On change:** call `refreshActivitySnapshot(chefId)` to immediately update or delete snapshot

## Drizzle Schema

### File: `lib/network/activity/tables.ts`

```typescript
import { pgTable, uuid, integer, text, timestamp, date, boolean } from 'drizzle-orm/pg-core'

export const chefActivitySnapshots = pgTable('chef_activity_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  chefId: uuid('chef_id').notNull().unique(),
  upcomingEventCount: integer('upcoming_event_count').notNull().default(0),
  currentWeekCount: integer('current_week_count').notNull().default(0),
  currentMonthCount: integer('current_month_count').notNull().default(0),
  lastEventDate: date('last_event_date'),
  busiestDay: text('busiest_day'),
  streakWeeks: integer('streak_weeks').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

## Server Actions

### File: `lib/network/activity/actions.ts`

Two server actions:

1. **`toggleActivitySharing(enabled: boolean)`** - 'use server', auth-gated, updates `chef_preferences.share_activity_with_connections`, calls `refreshActivitySnapshot`
2. **`getActivitySharingStatus()`** - 'use server', returns current preference value

## Testing

### Snapshot job tests

- Opt-in chef with 5 upcoming events: snapshot shows count 5
- Opt-out chef: snapshot row deleted
- Chef with no events: snapshot shows count 0
- Streak calculation: 3 consecutive weeks of completed events = streak 3
- Busiest day: chef with 4 Saturday events and 1 Friday = "Saturday"

### Feed integration tests

- Chef with 3 connected chefs opted in (2 busy, 1 idle): feed returns 2 entries
- Chef with no connections: feed returns empty
- Connected chef opts out mid-session: their entry disappears from feed

### Privacy tests

- Snapshot contains no client names, event IDs, or financial data
- Non-connected chef cannot see activity (even if both opted in)
- Follow-only relationship does not unlock activity

## Files to Create

| File                                                              | Purpose                            |
| ----------------------------------------------------------------- | ---------------------------------- |
| `database/migrations/20260524000001_connected_chefs_activity.sql` | Table + preference column          |
| `lib/network/activity/tables.ts`                                  | Drizzle schema                     |
| `lib/network/activity/snapshot-job.ts`                            | Compute and upsert snapshots       |
| `lib/network/activity/queries.ts`                                 | Query connected chefs' activity    |
| `lib/network/activity/actions.ts`                                 | Server actions for toggle + status |

## Files to Modify

| File                                             | Change                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| `lib/feed/source-registry.ts`                    | Add `networkActivityAdapter` + register        |
| `lib/discovery/registries/chef-rail-registry.ts` | Add `chef.network_friend_busy` item            |
| `app/(chef)/settings/connections/page.tsx`       | Add activity sharing toggle                    |
| Event mutation server actions                    | Call `refreshActivitySnapshot` after mutations |

## Future Extensions (NOT in this build)

- Guest/consumer visibility ("Your friend Jane has 2 upcoming dinners")
- Event headline sharing (opt-in per event: date + guest count)
- Referral prompt ("You're slammed, refer to Chef Maria?")
- Availability calendar overlay for connected chefs

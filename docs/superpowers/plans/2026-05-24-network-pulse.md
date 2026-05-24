# Network Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform passive chef network activity awareness into actionable intelligence with anomaly detection, contextual actions, freshness management, circle filtering, and CIL integration.

**Architecture:** Additive-only build on top of Connected Chefs Activity infrastructure. One new column (`avg_weekly_events`) on existing `chef_activity_snapshots` table enables all relative/anomaly logic. One new CIL analyzer (`network.ts`) produces 5 signal types stored in per-tenant SQLite. UI gains action buttons, aging indicators, circle filter, and self-view preview. No new tables.

**Tech Stack:** Next.js server components, Supabase client (postgres.js), CIL per-tenant SQLite (better-sqlite3), TypeScript

**Spec:** `docs/specs/network-pulse.md`

---

## File Map

| File                                                   | Action | Responsibility                                                                                          |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260525000001_network_pulse.sql` | Create | Add `avg_weekly_events` column to `chef_activity_snapshots`                                             |
| `lib/cil/types.ts`                                     | Modify | Add `'network_pulse'` to SignalSource, `'network'` to SignalDomain                                      |
| `lib/network/activity/snapshot-job.ts`                 | Modify | Compute `avg_weekly_events` from past 28 days, include in upsert                                        |
| `lib/network/activity/queries.ts`                      | Modify | Add freshness filter, optional `circleId`, `avgWeeklyEvents` field, self-snapshot query, purge function |
| `lib/cil/analyzers/network.ts`                         | Create | Network CIL analyzer: 5 signal types                                                                    |
| `lib/cil/analyzers/index.ts`                           | Modify | Register network analyzer in `runAllAnalyzers`                                                          |
| `lib/feed/source-registry.ts`                          | Modify | Freshness filter + anomaly-based scoring                                                                |
| `lib/discovery/registries/chef-rail-registry.ts`       | Modify | Change `network_friend_busy` to anomaly trigger, add `network_heating` item                             |
| `components/network/activity-sharing-toggle.tsx`       | Modify | Add self-view preview card below toggle                                                                 |
| `components/events/network-activity-section.tsx`       | Modify | Action buttons, aging indicator, circle selector, empty states                                          |
| `app/(chef)/settings/profile-branding/page.tsx`        | Modify | Pass snapshot data to ActivitySharingToggle for self-view                                               |
| `lib/network/activity/actions.ts`                      | Modify | Add `getOwnSnapshot` server action for self-view                                                        |

---

## Task 1: Database Migration

**Files:**

- Create: `database/migrations/20260525000001_network_pulse.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Network Pulse: add rolling average for anomaly detection
ALTER TABLE chef_activity_snapshots
  ADD COLUMN avg_weekly_events NUMERIC(5,2) NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Verify migration is additive-only**

Run: `cat database/migrations/20260525000001_network_pulse.sql`
Confirm: No DROP, DELETE, TRUNCATE, or column renames. Only ADD COLUMN.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/20260525000001_network_pulse.sql
git commit -m "feat(network): add avg_weekly_events column for anomaly detection"
```

---

## Task 2: CIL Type Extensions

**Files:**

- Modify: `lib/cil/types.ts`

- [ ] **Step 1: Add `'network_pulse'` to SignalSource union**

In `lib/cil/types.ts`, find the `SignalSource` type union. After `| 'event_debrief'` (the last line before the closing), add:

```typescript
  | 'network_pulse' // cross-tenant activity snapshots for connections
```

- [ ] **Step 2: Add `'network'` to SignalDomain union**

In `lib/cil/types.ts`, find the `SignalDomain` type union. After `| 'event_debrief'`, add:

```typescript
  | 'network'
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors related to CIL types.

- [ ] **Step 4: Commit**

```bash
git add lib/cil/types.ts
git commit -m "feat(cil): add network_pulse source and network domain types"
```

---

## Task 3: Snapshot Job - Compute Rolling Average

**Files:**

- Modify: `lib/network/activity/snapshot-job.ts`

- [ ] **Step 1: Add avg_weekly_events computation**

In `refreshActivitySnapshot`, after the streak calculation block (after the `if (pastEvents && pastEvents.length > 0)` block ends, around line 115), add this computation. The `pastEvents` query already fetches completed events with dates, so reuse it:

```typescript
// Rolling 4-week average: completed events in past 28 days / 4
const twentyEightDaysAgo = new Date()
twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)
const twentyEightDaysAgoStr = twentyEightDaysAgo.toISOString().split('T')[0]

const recentCompletedCount = (pastEvents ?? []).filter(
  (e: any) => e.event_date >= twentyEightDaysAgoStr
).length

const avgWeeklyEvents = Math.round((recentCompletedCount / 4) * 100) / 100
```

- [ ] **Step 2: Add `avg_weekly_events` to the upsert object**

In the `db.from('chef_activity_snapshots').upsert(...)` call, add `avg_weekly_events: avgWeeklyEvents` to the object, after `streak_weeks: streakWeeks,`:

```typescript
      streak_weeks: streakWeeks,
      avg_weekly_events: avgWeeklyEvents,
      updated_at: new Date().toISOString(),
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add lib/network/activity/snapshot-job.ts
git commit -m "feat(network): compute avg_weekly_events in snapshot refresh"
```

---

## Task 4: Query Layer - Freshness, Circle Filter, Self-Snapshot

**Files:**

- Modify: `lib/network/activity/queries.ts`

- [ ] **Step 1: Add `avgWeeklyEvents` to `ConnectedChefActivity` interface**

In `lib/network/activity/queries.ts`, add `avgWeeklyEvents: number` to the `ConnectedChefActivity` interface after `streakWeeks`:

```typescript
export interface ConnectedChefActivity {
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
  avgWeeklyEvents: number
  updatedAt: string
}
```

- [ ] **Step 2: Update `getConnectedChefsActivity` signature and query**

Change the function signature to accept options:

```typescript
export async function getConnectedChefsActivity(
  chefId: string,
  options?: { circleId?: string }
): Promise<ConnectedChefActivity[]> {
```

- [ ] **Step 3: Add freshness filter to snapshot query**

In the snapshot query, replace `.gt('upcoming_event_count', 0)` with freshness-aware filtering. Change the snapshot select to include `avg_weekly_events`, and add a freshness filter:

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

const { data: snapshots } = await db
  .from('chef_activity_snapshots')
  .select(
    'chef_id, upcoming_event_count, current_week_count, current_month_count, last_event_date, busiest_day, streak_weeks, avg_weekly_events, updated_at'
  )
  .in('chef_id', connectedIds)
  .gt('upcoming_event_count', 0)
  .gte('updated_at', sevenDaysAgo)
  .order('upcoming_event_count', { ascending: false })
```

- [ ] **Step 4: Add circle filtering logic**

After computing `connectedIds` and before the snapshot query, add circle intersection if `circleId` is provided:

```typescript
let filteredIds = connectedIds

if (options?.circleId) {
  const { data: circleMembers } = await db
    .from('circle_collaborators')
    .select('chef_id')
    .eq('circle_id', options.circleId)
    .eq('status', 'active')

  if (circleMembers && circleMembers.length > 0) {
    const circleMemberIds = new Set(circleMembers.map((m: any) => m.chef_id))
    filteredIds = connectedIds.filter((id: string) => circleMemberIds.has(id))
  } else {
    return []
  }
}
```

Then use `filteredIds` instead of `connectedIds` in the `.in('chef_id', ...)` clause.

- [ ] **Step 5: Add `avgWeeklyEvents` to return mapping**

In the `return snapshots.map(...)` block, add `avgWeeklyEvents`:

```typescript
      avgWeeklyEvents: Number(s.avg_weekly_events) || 0,
```

- [ ] **Step 6: Add `getOwnSnapshot` export for self-view**

At the bottom of the file, add:

```typescript
export interface OwnActivitySnapshot {
  upcomingEventCount: number
  currentWeekCount: number
  currentMonthCount: number
  streakWeeks: number
  avgWeeklyEvents: number
  busiestDay: string | null
  updatedAt: string
}

export async function getOwnSnapshot(chefId: string): Promise<OwnActivitySnapshot | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_activity_snapshots')
    .select(
      'upcoming_event_count, current_week_count, current_month_count, streak_weeks, avg_weekly_events, busiest_day, updated_at'
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (!data) return null

  return {
    upcomingEventCount: data.upcoming_event_count,
    currentWeekCount: data.current_week_count,
    currentMonthCount: data.current_month_count,
    streakWeeks: data.streak_weeks,
    avgWeeklyEvents: Number(data.avg_weekly_events) || 0,
    busiestDay: data.busiest_day,
    updatedAt: data.updated_at,
  }
}
```

- [ ] **Step 7: Add `purgeStaleSnapshots` export for ghost cleanup**

```typescript
export async function purgeStaleSnapshots(): Promise<number> {
  const db: any = createServerClient({ admin: true })
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await db
    .from('chef_activity_snapshots')
    .delete()
    .lt('updated_at', thirtyDaysAgo)
    .select('id')

  return data?.length ?? 0
}
```

- [ ] **Step 8: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 9: Commit**

```bash
git add lib/network/activity/queries.ts
git commit -m "feat(network): add freshness filter, circle scoping, self-snapshot, ghost purge"
```

---

## Task 5: CIL Network Analyzer

**Files:**

- Create: `lib/cil/analyzers/network.ts`

- [ ] **Step 1: Create the network analyzer**

```typescript
import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeNetwork(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client: any = createServerClient({ admin: true })
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    const { data: connections } = await client
      .from('chef_connections')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${tenantId},addressee_id.eq.${tenantId}`)
      .eq('status', 'accepted')

    if (!connections || connections.length === 0) return []

    const connectedIds = connections.map((c: any) =>
      c.requester_id === tenantId ? c.addressee_id : c.requester_id
    )

    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: snapshots } = await client
      .from('chef_activity_snapshots')
      .select('chef_id, upcoming_event_count, avg_weekly_events, streak_weeks, updated_at')
      .in('chef_id', connectedIds)
      .gte('updated_at', sevenDaysAgo)

    if (!snapshots || snapshots.length === 0) return []

    const { data: ownSnapshot } = await client
      .from('chef_activity_snapshots')
      .select('upcoming_event_count, avg_weekly_events')
      .eq('chef_id', tenantId)
      .maybeSingle()

    const ownUpcoming = ownSnapshot?.upcoming_event_count ?? 0
    const ownAvg = Number(ownSnapshot?.avg_weekly_events) || 0

    const { data: chefs } = await client
      .from('chefs')
      .select('id, display_name, business_name')
      .in(
        'id',
        snapshots.map((s: any) => s.chef_id)
      )

    const nameMap = new Map<string, string>(
      (chefs ?? []).map((c: any) => [c.id, c.display_name || c.business_name || 'A chef'])
    )

    // Only produce aggregate signals with 3+ sharing connections
    if (snapshots.length >= 3) {
      analyzeNetworkTrend(snapshots, signals, now)
    }

    analyzeReferralWindows(snapshots, ownUpcoming, ownAvg, nameMap, signals, now)
    analyzeCapacityAvailable(snapshots, ownUpcoming, ownAvg, signals, now)
    analyzeStreakMilestones(snapshots, nameMap, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/network] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

function analyzeNetworkTrend(snapshots: any[], signals: ProactiveSignal[], now: number): void {
  let totalUpcoming = 0
  let totalAvg = 0

  for (const s of snapshots) {
    totalUpcoming += s.upcoming_event_count
    totalAvg += Number(s.avg_weekly_events) || 0
  }

  if (totalAvg <= 0) return

  const ratio = totalUpcoming / totalAvg

  if (ratio > 1.3) {
    signals.push({
      id: generateId(),
      domain: 'network',
      urgency: 2,
      confidence: Math.min(ratio / 2, 1),
      title: 'Your network is heating up',
      detail: `Your connections have ${totalUpcoming} upcoming events, ${Math.round((ratio - 1) * 100)}% above their usual pace. Good time to reach out for referrals.`,
      suggestedAction: 'Check your network activity for referral opportunities',
      actionType: 'navigate',
      actionPayload: { href: '/network' },
      entityIds: [],
      source: 'network_pulse',
      createdAt: now,
    })
  } else if (ratio < 0.7 && totalAvg > 0) {
    signals.push({
      id: generateId(),
      domain: 'network',
      urgency: 1,
      confidence: Math.min(1 - ratio, 1),
      title: 'Network slowing down',
      detail: `Your connections have ${totalUpcoming} upcoming events, ${Math.round((1 - ratio) * 100)}% below their usual pace. Consider proactive outreach.`,
      suggestedAction: 'Reach out to connections about availability',
      actionType: 'navigate',
      actionPayload: { href: '/network' },
      entityIds: [],
      source: 'network_pulse',
      createdAt: now,
    })
  }
}

function analyzeReferralWindows(
  snapshots: any[],
  ownUpcoming: number,
  ownAvg: number,
  nameMap: Map<string, string>,
  signals: ProactiveSignal[],
  now: number
): void {
  if (ownAvg <= 0 || ownUpcoming <= ownAvg * 1.5) return

  for (const s of snapshots) {
    const connAvg = Number(s.avg_weekly_events) || 0
    if (connAvg > 0 && s.upcoming_event_count < connAvg * 0.5) {
      const name = nameMap.get(s.chef_id) ?? 'A connection'
      signals.push({
        id: generateId(),
        domain: 'network',
        urgency: 3,
        confidence: 0.8,
        title: `Referral window: ${name}`,
        detail: `You're booked solid. ${name} has availability; refer a client?`,
        suggestedAction: `Send ${name} a referral`,
        actionType: 'navigate',
        actionPayload: { href: '/network', connectionChefId: s.chef_id },
        entityIds: [s.chef_id],
        source: 'network_pulse',
        createdAt: now,
      })
    }
  }
}

function analyzeCapacityAvailable(
  snapshots: any[],
  ownUpcoming: number,
  ownAvg: number,
  signals: ProactiveSignal[],
  now: number
): void {
  if (ownAvg <= 0 || ownUpcoming >= ownAvg * 0.5) return

  const busyConnections = snapshots.filter((s: any) => {
    const connAvg = Number(s.avg_weekly_events) || 0
    return connAvg > 0 && s.upcoming_event_count > connAvg * 1.5
  })

  if (busyConnections.length > 0) {
    signals.push({
      id: generateId(),
      domain: 'network',
      urgency: 2,
      confidence: 0.7,
      title: 'You have availability',
      detail: `You have availability and ${busyConnections.length} connection${busyConnections.length === 1 ? ' is' : 's are'} busy. Let them know you can take referrals.`,
      suggestedAction: 'Let your network know about your availability',
      actionType: 'navigate',
      actionPayload: { href: '/network' },
      entityIds: [],
      source: 'network_pulse',
      createdAt: now,
    })
  }
}

function analyzeStreakMilestones(
  snapshots: any[],
  nameMap: Map<string, string>,
  signals: ProactiveSignal[],
  now: number
): void {
  const milestones = [4, 8, 12]

  for (const s of snapshots) {
    if (milestones.includes(s.streak_weeks)) {
      const name = nameMap.get(s.chef_id) ?? 'A connection'
      signals.push({
        id: generateId(),
        domain: 'network',
        urgency: 1,
        confidence: 1.0,
        title: `Streak milestone: ${name}`,
        detail: `Congrats to ${name} on a ${s.streak_weeks}-week booking streak!`,
        suggestedAction: `Send ${name} a congratulations`,
        actionType: 'navigate',
        actionPayload: { href: '/network' },
        entityIds: [s.chef_id],
        source: 'network_pulse',
        createdAt: now,
      })
    }
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add lib/cil/analyzers/network.ts
git commit -m "feat(cil): add network pulse analyzer with 5 signal types"
```

---

## Task 6: Register Network Analyzer in CIL

**Files:**

- Modify: `lib/cil/analyzers/index.ts`

- [ ] **Step 1: Add network analyzer to `runAllAnalyzers`**

In `lib/cil/analyzers/index.ts`, add the network analyzer import to the `Promise.allSettled` array, after the commitment line:

```typescript
    import('./commitment').then((m) => m.analyzeCommitment(tenantId)),
    import('./network').then((m) => m.analyzeNetwork(tenantId)),
```

- [ ] **Step 2: Update the comment to reflect 9 analyzers**

Change line 2 from:

```typescript
// Runs all 8 domain analyzers in parallel, collects ProactiveSignal results.
```

to:

```typescript
// Runs all 9 domain analyzers in parallel, collects ProactiveSignal results.
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add lib/cil/analyzers/index.ts
git commit -m "feat(cil): register network analyzer in orchestrator"
```

---

## Task 7: Feed Adapter - Anomaly-Based Scoring + Freshness

**Files:**

- Modify: `lib/feed/source-registry.ts`

- [ ] **Step 1: Add `avgWeeklyEvents` to `NetworkActivityItem` interface**

In the `NetworkActivityItem` interface in `lib/feed/source-registry.ts`, add after `streakWeeks`:

```typescript
avgWeeklyEvents: number
```

- [ ] **Step 2: Replace absolute scoring with anomaly-based scoring and add freshness filter**

Replace the `networkActivityAdapter` `adapt` method body with:

```typescript
  adapt(items: unknown[]): ComposedFeedEntry[] {
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    return (items as NetworkActivityItem[])
      .filter((chef) => now - new Date(chef.updatedAt).getTime() < sevenDays)
      .map((chef) => {
        const avg = Math.max(chef.avgWeeklyEvents, 1)
        const anomalyScore = Math.min((chef.upcomingEventCount / avg) * 20, 60)

        return {
          id: `network-activity-${chef.chefId}`,
          source: 'network_activity',
          score: anomalyScore,
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
        }
      })
  },
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add lib/feed/source-registry.ts
git commit -m "feat(feed): anomaly-based scoring and freshness filter for network adapter"
```

---

## Task 8: Rail Registry - Anomaly Trigger + Network Heating Item

**Files:**

- Modify: `lib/discovery/registries/chef-rail-registry.ts`

**Important:** The `chef.network_friend_busy` item is duplicated at two locations (around lines 3075 and 5761). Both must be updated identically.

- [ ] **Step 1: Update `network_friend_busy` scoringNotes at both locations**

Find both instances of this scoringNotes string:

```
'Fires when connected chef has upcoming_event_count >= 3. Max 3 impressions per week per connected chef. 8hr cooldown.'
```

Replace each with:

```
'Fires when connected chef upcoming_event_count > avg_weekly_events * 2 (anomaly-based). Max 3 impressions per week per connected chef. 8hr cooldown.'
```

- [ ] **Step 2: Add `network_heating` rail item**

Find the closing `] as const` at the very end of the rail items array (around line 5786). Just before it, add the new item:

```typescript
  {
    id: 'chef.network_heating',
    role: 'chef',
    label: 'Network heating up',
    labelTemplate: 'Your network is busier than usual this week',
    category: 'social_network',
    baseUrgency: 40,
    urgencyDecayFn: 'linear',
    relevanceSignals: ['network_trend_ratio', 'connections_sharing_count'],
    freshnessWindow: '1d',
    pageAffinity: '/network',
    pageAffinityBoost: 20,
    href: '/network',
    hrefTemplate: '/network',
    dataSources: ['chef_activity_snapshots', 'chef_connections'],
    privacy: 'tenant_scoped',
    dismissable: true,
    expandable: false,
    hoverAction: 'preview',
    clickAction: 'navigate',
    maxImpressions: 2,
    cooldownMinutes: 1440,
    renderHints: { presentation: 'card', icon: 'trending-up', animate: false, priority: 'normal' },
    scoringNotes:
      'Fires when CIL network_heating signal is active (aggregate upcoming > 30% above combined rolling averages). Max 2 impressions per week. 24hr cooldown.',
  },
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add lib/discovery/registries/chef-rail-registry.ts
git commit -m "feat(rail): anomaly-based network_friend_busy trigger, add network_heating item"
```

---

## Task 9: Server Actions - Self-View Support

**Files:**

- Modify: `lib/network/activity/actions.ts`

- [ ] **Step 1: Add `getOwnActivitySnapshot` server action**

At the bottom of `lib/network/activity/actions.ts`, add:

```typescript
export async function getOwnActivitySnapshot() {
  const user = await requireChef()
  const { getOwnSnapshot } = await import('./queries')
  return getOwnSnapshot(user.entityId)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/network/activity/actions.ts
git commit -m "feat(network): add getOwnActivitySnapshot server action for self-view"
```

---

## Task 10: Self-View Preview on Settings Page

**Files:**

- Modify: `components/network/activity-sharing-toggle.tsx`
- Modify: `app/(chef)/settings/profile-branding/page.tsx`

- [ ] **Step 1: Extend ActivitySharingToggle to accept and render snapshot preview**

Replace the entire `components/network/activity-sharing-toggle.tsx` with:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { toggleActivitySharing } from '@/lib/network/activity/actions'

interface OwnSnapshot {
  upcomingEventCount: number
  currentWeekCount: number
  currentMonthCount: number
  streakWeeks: number
  avgWeeklyEvents: number
  busiestDay: string | null
  updatedAt: string
}

interface ActivitySharingToggleProps {
  currentValue: boolean
  ownSnapshot?: OwnSnapshot | null
}

export function ActivitySharingToggle({ currentValue, ownSnapshot }: ActivitySharingToggleProps) {
  const [enabled, setEnabled] = useState(currentValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const newValue = !enabled
    setEnabled(newValue)
    setError(null)

    startTransition(async () => {
      try {
        await toggleActivitySharing(newValue)
      } catch (err: any) {
        setEnabled(!newValue)
        setError(err.message || 'Failed to update')
      }
    })
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-stone-100">Share Activity with Connections</p>
          <p className="text-sm text-stone-500 mt-1">
            {enabled
              ? 'Connected chefs can see how busy you are. Only dinner counts are shared, never client names or details.'
              : 'Your activity is private. Connected chefs cannot see your booking activity.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isPending}
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50
            ${enabled ? 'bg-brand-600' : 'bg-stone-700'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {enabled && ownSnapshot && (
        <div className="mt-4 border-t border-stone-700/50 pt-3">
          <p className="text-xs font-medium text-stone-500 mb-2">Your connections see:</p>
          <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-3 space-y-1">
            <p className="text-xs text-stone-400">
              {ownSnapshot.upcomingEventCount === 0
                ? '0 dinners coming up'
                : ownSnapshot.upcomingEventCount === 1
                  ? '1 dinner coming up'
                  : `${ownSnapshot.upcomingEventCount} dinners coming up`}
            </p>
            {ownSnapshot.streakWeeks > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {ownSnapshot.streakWeeks}-week streak
              </span>
            )}
            {ownSnapshot.busiestDay && (
              <p className="text-[11px] text-stone-500">Busiest: {ownSnapshot.busiestDay}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Pass snapshot data from settings page**

In `app/(chef)/settings/profile-branding/page.tsx`, add import for `getOwnActivitySnapshot`:

```typescript
import { getActivitySharingStatus, getOwnActivitySnapshot } from '@/lib/network/activity/actions'
```

Remove the old import line:

```typescript
import { getActivitySharingStatus } from '@/lib/network/activity/actions'
```

- [ ] **Step 3: Fetch own snapshot in the Promise.all**

In the `Promise.all` array, add `getOwnActivitySnapshot` after the `getActivitySharingStatus` call:

```typescript
const [
  profile,
  networkDiscoverable,
  availabilitySignalEnabled,
  activitySharingEnabled,
  ownSnapshot,
] = await Promise.all([
  getChefSlug(),
  getNetworkDiscoverable().catch(() => false),
  getAvailabilitySignalSetting().catch(() => false),
  getActivitySharingStatus().catch(() => false),
  getOwnActivitySnapshot().catch(() => null),
])
```

- [ ] **Step 4: Pass snapshot to ActivitySharingToggle**

Change the `<ActivitySharingToggle>` JSX from:

```tsx
<ActivitySharingToggle currentValue={activitySharingEnabled} />
```

to:

```tsx
<ActivitySharingToggle currentValue={activitySharingEnabled} ownSnapshot={ownSnapshot} />
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add components/network/activity-sharing-toggle.tsx app/(chef)/settings/profile-branding/page.tsx
git commit -m "feat(network): self-view preview card on activity sharing toggle"
```

---

## Task 11: UI - Activity Cards with Actions, Aging, Circle Filter, Empty States

**Files:**

- Modify: `components/events/network-activity-section.tsx`

- [ ] **Step 1: Replace the entire component file**

Replace `components/events/network-activity-section.tsx` with the enhanced version:

```tsx
import { getConnectedChefsActivity, getOwnSnapshot } from '@/lib/network/activity/queries'
import type { ConnectedChefActivity } from '@/lib/network/activity/queries'
import Link from 'next/link'

function ChefInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)
  return (
    <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 text-sm font-semibold uppercase">
      {initials}
    </div>
  )
}

function ChefAvatar({ chef }: { chef: ConnectedChefActivity }) {
  const name = chef.displayName || chef.businessName
  if (chef.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={chef.profileImageUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    )
  }
  return <ChefInitials name={name} />
}

function AgingIndicator({ updatedAt }: { updatedAt: string }) {
  const ageMs = Date.now() - new Date(updatedAt).getTime()
  const ageHours = ageMs / (1000 * 60 * 60)

  if (ageHours < 24) return null

  const ageDays = Math.floor(ageHours / 24)
  return (
    <p className="text-[10px] text-stone-600">
      Updated {ageDays === 1 ? '1 day' : `${ageDays} days`} ago
    </p>
  )
}

interface ActionButtonsProps {
  chef: ConnectedChefActivity
  viewerUpcoming: number
  viewerAvg: number
}

function ActionButtons({ chef, viewerUpcoming, viewerAvg }: ActionButtonsProps) {
  const connAvg = chef.avgWeeklyEvents
  const viewerBusy = viewerAvg > 0 && viewerUpcoming > viewerAvg * 1.5
  const connHasCapacity = connAvg > 0 && chef.upcomingEventCount < connAvg * 0.5

  const showRefer = viewerBusy && connHasCapacity

  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Link
        href={`/network/messages/${chef.chefId}`}
        className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors"
      >
        Message
      </Link>
      {showRefer && (
        <Link
          href={`/network/messages/${chef.chefId}?template=referral`}
          className="text-[10px] px-2 py-0.5 rounded border border-amber-700/50 text-amber-400 hover:text-amber-300 hover:border-amber-600 transition-colors"
        >
          Refer a client
        </Link>
      )}
    </div>
  )
}

function ActivityCard({
  chef,
  viewerUpcoming,
  viewerAvg,
}: {
  chef: ConnectedChefActivity
  viewerUpcoming: number
  viewerAvg: number
}) {
  const name = chef.displayName || chef.businessName
  const dinnerLabel =
    chef.upcomingEventCount === 1
      ? '1 dinner coming up'
      : `${chef.upcomingEventCount} dinners coming up`

  return (
    <div className="min-w-[200px] max-w-[240px] shrink-0 rounded-lg border border-stone-700/50 bg-stone-900/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ChefAvatar chef={chef} />
        <span className="text-sm font-medium text-stone-100 truncate">{name}</span>
      </div>

      <p className="text-xs text-stone-400">{dinnerLabel}</p>

      {chef.streakWeeks > 2 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {chef.streakWeeks}-week streak
        </span>
      )}

      {chef.busiestDay && <p className="text-[11px] text-stone-500">Busiest: {chef.busiestDay}</p>}

      <AgingIndicator updatedAt={chef.updatedAt} />

      <ActionButtons chef={chef} viewerUpcoming={viewerUpcoming} viewerAvg={viewerAvg} />
    </div>
  )
}

function EmptyState({ connectionCount }: { connectionCount: number }) {
  if (connectionCount === 0) {
    return (
      <p className="text-sm text-stone-500">
        Your network is quiet. When connections share their activity, you&apos;ll see it here.
      </p>
    )
  }
  return (
    <p className="text-sm text-stone-500">
      No connections are sharing activity right now. When they do, you&apos;ll see it here.
    </p>
  )
}

export async function NetworkActivitySection({ chefId }: { chefId: string }) {
  let activity: ConnectedChefActivity[]
  let ownSnap: { upcomingEventCount: number; avgWeeklyEvents: number } | null = null

  try {
    ;[activity, ownSnap] = await Promise.all([
      getConnectedChefsActivity(chefId),
      getOwnSnapshot(chefId),
    ])
  } catch {
    return null
  }

  const viewerUpcoming = ownSnap?.upcomingEventCount ?? 0
  const viewerAvg = ownSnap?.avgWeeklyEvents ?? 0

  if (!activity || activity.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium text-stone-400 mb-3">Network Activity</h2>
        <EmptyState connectionCount={0} />
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-stone-400 mb-3">Network Activity</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-stone-900 scrollbar-thumb-stone-700">
        {activity.map((chef) => (
          <ActivityCard
            key={chef.chefId}
            chef={chef}
            viewerUpcoming={viewerUpcoming}
            viewerAvg={viewerAvg}
          />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/events/network-activity-section.tsx
git commit -m "feat(network): activity cards with actions, aging indicators, empty states"
```

---

## Task 12: TypeCheck and Build Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Clean exit with no errors.

- [ ] **Step 2: Run build**

Run: `npx next build --no-lint 2>&1 | tail -30`
Expected: Build succeeds.

- [ ] **Step 3: Run affected tests**

Run: `npm run test:affected 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 4: Run regression firewall**

Run: `npm run regression:firewall`
Expected: All checks pass.

---

## Done-When Checklist (from spec)

1. `avg_weekly_events` column exists and populates on snapshot refresh (Task 1, 3)
2. CIL network analyzer produces signals during hourly scan for chefs with 3+ sharing connections (Task 5, 6)
3. Stale snapshots (>7d) hidden from feed and rail; ghost snapshots (>30d) purged (Task 4, 7)
4. Activity cards show message action (always) + refer (contextual) (Task 11)
5. Rail item `chef.network_friend_busy` fires on anomaly, not absolute threshold (Task 8)
6. New rail item `chef.network_heating` fires on aggregate network trend (Task 8)
7. Self-view preview renders on settings page when toggle is ON (Task 9, 10)
8. Circle selector appears when chef belongs to 2+ circles (deferred to UI client component; query layer ready in Task 4)
9. Empty states use opportunity language at all scales (Task 11)
10. All signals respect tenant isolation (Task 5: per-tenant SQLite, no raw cross-tenant data)

**Note on circle selector UI (done-when #8):** The query layer supports `circleId` filtering (Task 4). The circle selector dropdown in `NetworkActivitySection` requires a client component wrapper to handle state. This can be added as a follow-up without blocking the core intelligence layer. The data path is fully wired.

**Note on collaborate action:** The spec defines a "Co-host?" action when both chefs have events in the same week. This requires comparing event dates across two chefs' snapshots, which the current snapshot table doesn't store (only counts, not dates). Implementing this would require either expanding the snapshot schema or a separate query. Deferred as a follow-up to avoid scope creep on a single-column migration.

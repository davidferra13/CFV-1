# Build Spec: Circles Cockpit Upgrade

> **Codex agent spec. Follow exactly. Do not improvise.**

## Goal

Make the `/circles` page the chef's operational cockpit by adding:

1. **Revenue overlay** on the pipeline header (show dollar amounts per stage)
2. **Workload capacity bar** (show dinners this week / next week vs max)

## Why

Dual-track chefs (restaurant + private dining) need a single glance to see: how many dinners, how much money, am I over capacity. The pipeline header currently shows only counts. This upgrade adds the financial and workload dimensions.

## Persona Reference

"Derek Alvarez" profile: 80-hour operator, 3-6 dinners in motion, needs unified view of workload + income to plan restaurant exit. This is his cockpit.

---

## Files to Create (2 new files)

### 1. `lib/hub/circle-pipeline-stats.ts`

Server action file. Batch-fetches financials for circle-linked events and computes workload.

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PipelineFinancials {
  [eventId: string]: {
    quotedPriceCents: number
    totalPaidCents: number
    profitCents: number
  }
}

export interface WorkloadSummary {
  thisWeekCount: number
  nextWeekCount: number
  maxPerWeek: number | null
}

export interface CirclePipelineStats {
  financials: PipelineFinancials
  workload: WorkloadSummary
}

// ── Main Function ────────────────────────────────────────────────────────────

/**
 * Get pipeline stats for the circles page: financial overlay + workload.
 * Called from the circles page server component.
 *
 * @param eventIds - event IDs extracted from circles that have linked events
 */
export async function getCirclePipelineStats(eventIds: string[]): Promise<CirclePipelineStats> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Batch financial query via event_financial_summary view
  const financials: PipelineFinancials = {}
  if (eventIds.length > 0) {
    try {
      const { data } = await db
        .from('event_financial_summary')
        .select('event_id, quoted_price_cents, total_paid_cents, profit_cents')
        .in('event_id', eventIds)
        .eq('tenant_id', tenantId)

      for (const row of data ?? []) {
        financials[row.event_id] = {
          quotedPriceCents: row.quoted_price_cents ?? 0,
          totalPaidCents: row.total_paid_cents ?? 0,
          profitCents: row.profit_cents ?? 0,
        }
      }
    } catch (err) {
      console.error('[circle-pipeline-stats] Financial query failed', err)
      // Non-blocking: pipeline still works without financial data
    }
  }

  // 2. Workload: count ALL booked events this week and next week
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfNextWeek = new Date(startOfWeek)
  endOfNextWeek.setDate(startOfWeek.getDate() + 14)

  const startOfNextWeek = new Date(startOfWeek)
  startOfNextWeek.setDate(startOfWeek.getDate() + 7)

  let thisWeekCount = 0
  let nextWeekCount = 0

  try {
    const { data: upcomingEvents } = await db
      .from('events')
      .select('event_date')
      .eq('tenant_id', tenantId)
      .gte('event_date', startOfWeek.toISOString().split('T')[0])
      .lt('event_date', endOfNextWeek.toISOString().split('T')[0])
      .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])

    for (const evt of upcomingEvents ?? []) {
      const d = new Date(evt.event_date)
      if (d < startOfNextWeek) thisWeekCount++
      else nextWeekCount++
    }
  } catch (err) {
    console.error('[circle-pipeline-stats] Workload query failed', err)
  }

  // 3. Get scheduling rules for capacity limit
  let maxPerWeek: number | null = null
  try {
    const { data: rules } = await db
      .from('chef_scheduling_rules')
      .select('max_events_per_week')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    maxPerWeek = rules?.max_events_per_week ?? null
  } catch {
    // Table may not exist for this chef yet, that is fine
  }

  return {
    financials,
    workload: {
      thisWeekCount,
      nextWeekCount,
      maxPerWeek,
    },
  }
}
```

### 2. `components/hub/circles-workload-bar.tsx`

Client component. Displays workload capacity bar.

```tsx
'use client'

import type { WorkloadSummary } from '@/lib/hub/circle-pipeline-stats'

interface WorkloadBarProps {
  workload: WorkloadSummary
}

export function CirclesWorkloadBar({ workload }: WorkloadBarProps) {
  const { thisWeekCount, nextWeekCount, maxPerWeek } = workload

  // Don't render if no events and no limit set
  if (thisWeekCount === 0 && nextWeekCount === 0 && !maxPerWeek) return null

  const isOverCapacity = maxPerWeek !== null && thisWeekCount > maxPerWeek
  const isAtCapacity = maxPerWeek !== null && thisWeekCount === maxPerWeek

  return (
    <div className="flex items-center gap-6 rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-stone-500">This week</span>
        <span
          className={`text-lg font-bold ${
            isOverCapacity ? 'text-red-400' : isAtCapacity ? 'text-amber-400' : 'text-stone-200'
          }`}
        >
          {thisWeekCount}
          {maxPerWeek !== null && (
            <span className="text-sm font-normal text-stone-500">/{maxPerWeek}</span>
          )}
        </span>
      </div>

      <div className="h-8 w-px bg-stone-700" />

      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-stone-500">Next week</span>
        <span className="text-lg font-bold text-stone-200">
          {nextWeekCount}
          {maxPerWeek !== null && (
            <span className="text-sm font-normal text-stone-500">/{maxPerWeek}</span>
          )}
        </span>
      </div>

      {isOverCapacity && (
        <span className="ml-auto rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
          Over capacity
        </span>
      )}
      {isAtCapacity && !isOverCapacity && (
        <span className="ml-auto rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
          At capacity
        </span>
      )}
    </div>
  )
}
```

---

## Files to Modify (2 existing files)

### 3. `app/(chef)/circles/page.tsx`

**Current file (for reference):**

```tsx
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { CirclesPageTabs } from '@/components/hub/circles-page-tabs'
import { CirclesPipelineHeader } from '@/components/hub/circles-pipeline-header'

export const metadata = { title: 'Circles' }

export default async function CirclesPage() {
  const [circles, feedResult] = await Promise.all([
    getChefCircles(),
    getChefSocialFeed({ limit: 30 }),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Circles</h1>
        <p className="mt-1 text-sm text-stone-400">
          Your client pipeline, dinner circles, and community groups
        </p>
      </div>

      <CirclesPipelineHeader circles={circles} />

      <CirclesPageTabs
        circles={circles}
        feedItems={feedResult.items}
        feedCursor={feedResult.nextCursor}
      />
    </div>
  )
}
```

**Changes to make:**

1. Add two imports at the top:

```ts
import { getCirclePipelineStats } from '@/lib/hub/circle-pipeline-stats'
import { CirclesWorkloadBar } from '@/components/hub/circles-workload-bar'
```

2. After the `Promise.all` call, add:

```ts
const eventIds = circles.map((c) => c.event_id).filter(Boolean) as string[]
const pipelineStats = await getCirclePipelineStats(eventIds)
```

3. Change the `CirclesPipelineHeader` line to pass financials:

```tsx
<CirclesPipelineHeader circles={circles} financials={pipelineStats.financials} />
```

4. Add the workload bar between the pipeline header and the tabs:

```tsx
<CirclesWorkloadBar workload={pipelineStats.workload} />
```

**Full modified file:**

```tsx
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { getCirclePipelineStats } from '@/lib/hub/circle-pipeline-stats'
import { CirclesPageTabs } from '@/components/hub/circles-page-tabs'
import { CirclesPipelineHeader } from '@/components/hub/circles-pipeline-header'
import { CirclesWorkloadBar } from '@/components/hub/circles-workload-bar'

export const metadata = { title: 'Circles' }

export default async function CirclesPage() {
  const [circles, feedResult] = await Promise.all([
    getChefCircles(),
    getChefSocialFeed({ limit: 30 }),
  ])

  const eventIds = circles.map((c) => c.event_id).filter(Boolean) as string[]
  const pipelineStats = await getCirclePipelineStats(eventIds)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Circles</h1>
        <p className="mt-1 text-sm text-stone-400">
          Your client pipeline, dinner circles, and community groups
        </p>
      </div>

      <CirclesPipelineHeader circles={circles} financials={pipelineStats.financials} />
      <CirclesWorkloadBar workload={pipelineStats.workload} />

      <CirclesPageTabs
        circles={circles}
        feedItems={feedResult.items}
        feedCursor={feedResult.nextCursor}
      />
    </div>
  )
}
```

### 4. `components/hub/circles-pipeline-header.tsx`

**Changes to make:**

1. Add import at top of file (below existing imports):

```ts
import type { PipelineFinancials } from '@/lib/hub/circle-pipeline-stats'
```

2. Change the `PipelineHeaderProps` interface to:

```ts
interface PipelineHeaderProps {
  circles: ChefCircleSummary[]
  financials?: PipelineFinancials
}
```

3. Update the component signature to destructure `financials`:

```ts
export function CirclesPipelineHeader({ circles, financials = {} }: PipelineHeaderProps) {
```

4. Replace the `groupCounts` computation (the existing `const groupCounts = STAGE_GROUPS.map(...)` block) with:

```ts
const groupCounts = STAGE_GROUPS.map((g) => {
  const groupCircles = circles.filter((c) => g.stages.includes(c.pipeline_stage))
  let revenueCents = 0
  for (const c of groupCircles) {
    if (c.event_id && financials[c.event_id]) {
      revenueCents += financials[c.event_id].quotedPriceCents
    }
  }
  return {
    ...g,
    count: groupCircles.length,
    revenueCents,
  }
})
```

5. In the JSX, add a revenue line below the count. Find this block:

```tsx
<span className="text-lg font-bold text-stone-200">{g.count}</span>
```

Replace with:

```tsx
;<span className="text-lg font-bold text-stone-200">{g.count}</span>
{
  g.revenueCents > 0 && (
    <span className="text-[11px] text-stone-500">
      ${Math.round(g.revenueCents / 100).toLocaleString()}
    </span>
  )
}
```

**Full modified file:**

```tsx
'use client'

import type { ChefCircleSummary, PipelineStage } from '@/lib/hub/chef-circle-actions'
import type { PipelineFinancials } from '@/lib/hub/circle-pipeline-stats'

// ---------------------------------------------------------------------------
// Pipeline stats bar + attention summary for the circles page.
// Shows at-a-glance: how many circles at each stage, what needs action.
// ---------------------------------------------------------------------------

const STAGE_GROUPS = [
  {
    label: 'Leads',
    stages: ['new_inquiry', 'awaiting_client', 'awaiting_chef'] as PipelineStage[],
    color: 'bg-blue-500',
  },
  {
    label: 'Quoted',
    stages: ['quoted'] as PipelineStage[],
    color: 'bg-violet-500',
  },
  {
    label: 'Booked',
    stages: ['accepted', 'paid', 'confirmed'] as PipelineStage[],
    color: 'bg-emerald-500',
  },
  {
    label: 'Live',
    stages: ['in_progress'] as PipelineStage[],
    color: 'bg-orange-500',
  },
  {
    label: 'Past',
    stages: ['completed', 'cancelled', 'declined', 'expired'] as PipelineStage[],
    color: 'bg-stone-600',
  },
]

interface PipelineHeaderProps {
  circles: ChefCircleSummary[]
  financials?: PipelineFinancials
}

export function CirclesPipelineHeader({ circles, financials = {} }: PipelineHeaderProps) {
  const attentionItems = circles.filter((c) => c.needs_attention)
  const totalActive = circles.filter(
    (c) => !['completed', 'cancelled', 'declined', 'expired', 'active'].includes(c.pipeline_stage)
  ).length

  // Stage group counts + revenue
  const groupCounts = STAGE_GROUPS.map((g) => {
    const groupCircles = circles.filter((c) => g.stages.includes(c.pipeline_stage))
    let revenueCents = 0
    for (const c of groupCircles) {
      if (c.event_id && financials[c.event_id]) {
        revenueCents += financials[c.event_id].quotedPriceCents
      }
    }
    return {
      ...g,
      count: groupCircles.length,
      revenueCents,
    }
  })

  // Total pipeline revenue
  const totalRevenueCents = groupCounts.reduce((sum, g) => sum + g.revenueCents, 0)

  // Don't render if no business circles
  if (totalActive === 0 && attentionItems.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Pipeline funnel bar */}
      <div className="flex items-center gap-1">
        {groupCounts.map((g) => (
          <div key={g.label} className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${g.color}`} />
              <span className="text-[11px] font-medium text-stone-400">{g.label}</span>
            </div>
            <span className="text-lg font-bold text-stone-200">{g.count}</span>
            {g.revenueCents > 0 && (
              <span className="text-[11px] text-stone-500">
                ${Math.round(g.revenueCents / 100).toLocaleString()}
              </span>
            )}
          </div>
        ))}

        {/* Separator + total */}
        <div className="ml-auto flex flex-col items-end">
          <span className="text-[11px] text-stone-500">Active pipeline</span>
          <span className="text-lg font-bold text-stone-100">{totalActive}</span>
          {totalRevenueCents > 0 && (
            <span className="text-[11px] text-stone-500">
              ${Math.round(totalRevenueCents / 100).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Attention banner */}
      {attentionItems.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-amber-300">
              {attentionItems.length} circle{attentionItems.length !== 1 ? 's' : ''} need
              {attentionItems.length === 1 ? 's' : ''} your attention
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {attentionItems.slice(0, 5).map((c) => (
              <a
                key={c.id}
                href={`/circles/${c.id}`}
                className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                <span>{c.emoji || '\uD83D\uDCAC'}</span>
                <span className="font-medium">{c.client_name || c.name}</span>
                {c.attention_reason && (
                  <span className="text-amber-400/70">{c.attention_reason}</span>
                )}
              </a>
            ))}
            {attentionItems.length > 5 && (
              <span className="px-2 py-1 text-xs text-amber-500">
                +{attentionItems.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## DO NOT Modify

- `lib/hub/chef-circle-actions.ts` (the `getChefCircles` function is unchanged)
- `lib/hub/social-feed-actions.ts`
- `components/hub/circles-page-tabs.tsx`
- `lib/ledger/compute.ts`
- Any database migration files
- Any other files not listed above

## DO NOT

- Create any new database tables or migrations
- Modify the `ChefCircleSummary` type
- Add new dependencies or npm packages
- Change the existing pipeline stage logic or attention derivation
- Add 'use client' to server files or 'use server' to client files (except as shown)

---

## Verification

After implementing, confirm:

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. The `/circles` page loads without crashing
3. Pipeline header still shows stage counts (unchanged behavior)
4. If events exist with financial data, dollar amounts appear under stage counts
5. Workload bar appears if there are events this week or next week
6. Workload bar hides if there are zero events and no scheduling rules set
7. If `chef_scheduling_rules.max_events_per_week` is set, capacity fraction shows (e.g., "3/4")
8. Over-capacity state shows red text

## Regression Risk

LOW. Two new files (zero regression) + two modified files (additive changes only). The pipeline header gains an optional prop with a default. The page gains two additional data fetches after the existing ones. No existing behavior is removed or changed.

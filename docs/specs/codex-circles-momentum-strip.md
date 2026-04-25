# Codex Build Spec: Circles Momentum Strip

> **Purpose:** Add a momentum/growth stats strip to the Circles page showing completed events, total revenue earned from private work, and pipeline value. This gives chefs building a private business a clear view of their growth trajectory.
>
> **Complexity:** LOW (one new server action, one new component, one page edit)
>
> **Risk:** LOW (additive only, no existing behavior changed)

---

## STRICT RULES FOR THIS TASK

1. **DO NOT create any new database tables or migrations.**
2. **DO NOT modify any existing function signatures or return types.**
3. **DO NOT delete any existing code.**
4. **DO NOT modify any files not listed in the "Files to Modify" section.**
5. **DO NOT use em dashes anywhere.** Use commas, semicolons, or separate sentences.
6. **Test your changes by running `npx tsc --noEmit --skipLibCheck` before committing.** Fix any type errors.
7. **All monetary amounts are in cents (integers).** Divide by 100 only for display.
8. **Follow existing patterns.** Look at `CirclesPipelineHeader` in `components/hub/circles-pipeline-header.tsx` for the visual style. Match stone-color palette, text sizes, layout patterns.

---

## What to Build

### 1. New server action: `getCirclesMomentum`

**File:** `lib/hub/chef-circle-actions.ts`

Add this new exported async function at the END of the file (after all existing exports). This function computes momentum stats from existing data. It does NOT use AI. It is pure math.

```typescript
/**
 * Compute momentum stats for the circles page.
 * All data comes from existing tables. No new tables needed.
 */
export async function getCirclesMomentum(): Promise<{
  completedEventCount: number
  totalEarnedCents: number
  avgPerEventCents: number
  firstEventDate: string | null
  monthsActive: number
  eventsThisMonth: number
  eventsLastMonth: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Count completed events and their financials
  const { data: events } = await db
    .from('events')
    .select('id, event_date, created_at')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('event_date', { ascending: true })

  const completedEvents = events ?? []
  const completedEventCount = completedEvents.length

  // Get total revenue from completed events via the financial summary view
  let totalEarnedCents = 0
  if (completedEventCount > 0) {
    const eventIds = completedEvents.map((e: any) => e.id)
    const { data: summaries } = await db
      .from('event_financial_summary')
      .select('net_revenue_cents')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventIds)

    totalEarnedCents = (summaries ?? []).reduce(
      (sum: number, s: any) => sum + (s.net_revenue_cents ?? 0),
      0
    )
  }

  const avgPerEventCents =
    completedEventCount > 0 ? Math.round(totalEarnedCents / completedEventCount) : 0

  // First event date for "months active" calculation
  const firstEventDate =
    completedEvents.length > 0
      ? (completedEvents[0].event_date ?? completedEvents[0].created_at)
      : null

  // Months active
  let monthsActive = 0
  if (firstEventDate) {
    const first = new Date(firstEventDate)
    const now = new Date()
    monthsActive = Math.max(
      1,
      (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth())
    )
  }

  // This month vs last month event counts
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const eventsThisMonth = completedEvents.filter((e: any) => {
    const d = new Date(e.event_date ?? e.created_at)
    return d >= thisMonthStart
  }).length

  const eventsLastMonth = completedEvents.filter((e: any) => {
    const d = new Date(e.event_date ?? e.created_at)
    return d >= lastMonthStart && d < thisMonthStart
  }).length

  return {
    completedEventCount,
    totalEarnedCents,
    avgPerEventCents,
    firstEventDate,
    monthsActive,
    eventsThisMonth,
    eventsLastMonth,
  }
}
```

### 2. New component: `CirclesMomentumStrip`

**File:** Create new file `components/hub/circles-momentum-strip.tsx`

```tsx
'use client'

interface MomentumData {
  completedEventCount: number
  totalEarnedCents: number
  avgPerEventCents: number
  firstEventDate: string | null
  monthsActive: number
  eventsThisMonth: number
  eventsLastMonth: number
}

function formatCents(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString()
}

export function CirclesMomentumStrip({ data }: { data: MomentumData }) {
  // Don't render if no completed events yet
  if (data.completedEventCount === 0) return null

  // Growth indicator: compare this month to last month
  const growth =
    data.eventsLastMonth > 0
      ? Math.round(((data.eventsThisMonth - data.eventsLastMonth) / data.eventsLastMonth) * 100)
      : data.eventsThisMonth > 0
        ? 100
        : 0

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Your Growth
        </span>
        {growth > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            +{growth}% this month
          </span>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-stone-100">{data.completedEventCount}</span>
          <span className="text-[11px] text-stone-500">
            event{data.completedEventCount !== 1 ? 's' : ''} completed
          </span>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-emerald-400">
            {formatCents(data.totalEarnedCents)}
          </span>
          <span className="text-[11px] text-stone-500">total earned</span>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-stone-200">
            {formatCents(data.avgPerEventCents)}
          </span>
          <span className="text-[11px] text-stone-500">avg per event</span>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-stone-200">{data.monthsActive}</span>
          <span className="text-[11px] text-stone-500">
            month{data.monthsActive !== 1 ? 's' : ''} active
          </span>
        </div>
      </div>
    </div>
  )
}
```

### 3. Wire it into the Circles page

**File:** `app/(chef)/circles/page.tsx`

The current file has these imports (lines 1-4):

```typescript
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { CirclesPageTabs } from '@/components/hub/circles-page-tabs'
import { CirclesPipelineHeader } from '@/components/hub/circles-pipeline-header'
```

Add two new imports after the existing ones:

```typescript
import { getCirclesMomentum } from '@/lib/hub/chef-circle-actions'
import { CirclesMomentumStrip } from '@/components/hub/circles-momentum-strip'
```

Update the `Promise.all` in the `CirclesPage` function. Change:

```typescript
const [circles, feedResult] = await Promise.all([
  getChefCircles(),
  getChefSocialFeed({ limit: 30 }),
])
```

To:

```typescript
const [circles, feedResult, momentum] = await Promise.all([
  getChefCircles(),
  getChefSocialFeed({ limit: 30 }),
  getCirclesMomentum(),
])
```

Add the `CirclesMomentumStrip` component in the JSX, between the `CirclesPipelineHeader` and `CirclesPageTabs`. Change:

```tsx
      <CirclesPipelineHeader circles={circles} />

      <CirclesPageTabs
```

To:

```tsx
      <CirclesPipelineHeader circles={circles} />

      <CirclesMomentumStrip data={momentum} />

      <CirclesPageTabs
```

---

## Files to Modify (Complete List)

| File                                        | Change Type                                             |
| ------------------------------------------- | ------------------------------------------------------- |
| `lib/hub/chef-circle-actions.ts`            | Add `getCirclesMomentum()` server action at end of file |
| `components/hub/circles-momentum-strip.tsx` | NEW FILE (client component)                             |
| `app/(chef)/circles/page.tsx`               | Add import + data fetch + render momentum strip         |

**NO OTHER FILES should be modified.**

---

## Done Criteria

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. The Circles page shows a "Your Growth" strip between the pipeline header and the tabs
3. The strip shows: events completed, total earned, avg per event, months active
4. If no completed events exist, the strip does not render (no empty state, no zeros)
5. Growth percentage badge appears when this month has more events than last month
6. All money values display as dollars (divided by 100 from cents)
7. Visual style matches `CirclesPipelineHeader` (stone colors, 11px labels, lg font stats)
8. No em dashes in any file
9. No new database tables or migrations
10. No existing functionality broken

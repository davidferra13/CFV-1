# Codex Build Spec: Waste Pattern Analysis Page

> Priority: P1. Risk: LOW. 2 files (1 new, 1 edit). No migrations. No schema changes.

## Problem

The existing waste log page (`app/(chef)/stations/waste/page.tsx`) shows raw waste entries and a simple summary (total entries, total value, top reason). It does not answer the questions that prevent prep errors from repeating:

- Which components waste the most? (repeat offenders)
- Is waste concentrated on certain days of the week?
- Which stations produce the most waste?
- What are the most common reason codes per component?

Without pattern analysis, the same prep mistakes repeat because no one sees the trend.

## What This Builds

A new page at `/stations/waste/patterns` that aggregates waste data into actionable patterns: repeat offender components, day-of-week distribution, and per-station breakdown with reason detail.

## Files Touched (ONLY these)

1. **EDIT** `lib/stations/waste-actions.ts` - Add one new exported async function at the end of the file
2. **CREATE** `app/(chef)/stations/waste/patterns/page.tsx` - New page

---

## Step A: Add server action to `lib/stations/waste-actions.ts`

Find the very last line of the file (after the `getWasteSummary` function's closing brace). Add the following function AFTER it:

```typescript
/**
 * Analyze waste patterns over a time window.
 * Returns: repeat offender components, day-of-week distribution, per-station breakdown.
 * Pure math aggregation, no AI.
 */
export async function getWastePatterns(days: number = 30) {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('waste_log')
    .select(
      `
      id,
      quantity,
      unit,
      reason,
      estimated_value_cents,
      created_at,
      station_id,
      component_id,
      stations (id, name),
      station_components (id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('created_at', `${startStr}T00:00:00`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getWastePatterns] Error:', error)
    throw new Error('Failed to load waste patterns')
  }

  const entries = data ?? []

  // === Repeat offenders: group by component, sort by count descending ===
  const byComponent: Record<
    string,
    {
      componentName: string
      stationName: string
      count: number
      totalValueCents: number
      reasons: Record<string, number>
    }
  > = {}

  for (const e of entries) {
    const cid = (e as any).component_id
    const cname = (e as any).station_components?.name ?? 'Unknown'
    const sname = (e as any).stations?.name ?? 'Unknown'
    const reason = (e as any).reason ?? 'other'
    if (!byComponent[cid]) {
      byComponent[cid] = {
        componentName: cname,
        stationName: sname,
        count: 0,
        totalValueCents: 0,
        reasons: {},
      }
    }
    byComponent[cid].count += 1
    byComponent[cid].totalValueCents += (e as any).estimated_value_cents ?? 0
    byComponent[cid].reasons[reason] = (byComponent[cid].reasons[reason] ?? 0) + 1
  }

  const repeatOffenders = Object.entries(byComponent)
    .map(([componentId, data]) => ({
      componentId,
      ...data,
      topReason: Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // === Day-of-week distribution ===
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDay: number[] = [0, 0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    const day = new Date((e as any).created_at).getDay()
    byDay[day] += 1
  }
  const dayDistribution = dayNames.map((name, idx) => ({ day: name, count: byDay[idx] }))

  // === Per-station totals ===
  const byStation: Record<string, { stationName: string; count: number; totalValueCents: number }> =
    {}
  for (const e of entries) {
    const sid = (e as any).station_id
    const sname = (e as any).stations?.name ?? 'Unknown'
    if (!byStation[sid]) byStation[sid] = { stationName: sname, count: 0, totalValueCents: 0 }
    byStation[sid].count += 1
    byStation[sid].totalValueCents += (e as any).estimated_value_cents ?? 0
  }
  const stationBreakdown = Object.entries(byStation)
    .map(([stationId, data]) => ({ stationId, ...data }))
    .sort((a, b) => b.count - a.count)

  return {
    totalEntries: entries.length,
    days,
    repeatOffenders,
    dayDistribution,
    stationBreakdown,
  }
}
```

No new imports are needed. The function uses `requireChef` and `createServerClient` which are already imported at the top of the file.

## Step B: Create the page

Create the file `app/(chef)/stations/waste/patterns/page.tsx` with this exact content:

```tsx
// Waste Pattern Analysis - Identifies repeat offenders, day-of-week trends, and station hotspots.
// Solves: "prep errors repeat, and line absorbs the cost" by surfacing patterns that are invisible in raw logs.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWastePatterns } from '@/lib/stations/waste-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Waste Patterns' }

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  overproduced: 'Overproduced',
  dropped: 'Dropped',
  other: 'Other',
}

const REASON_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
  expired: 'error',
  damaged: 'error',
  overproduced: 'warning',
  dropped: 'warning',
  other: 'default',
}

export default async function WastePatternsPage() {
  await requireChef()
  const patterns = await getWastePatterns(30)

  const maxDayCount = Math.max(...patterns.dayDistribution.map((d) => d.count), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stations" className="text-stone-500 hover:text-stone-300">
          Stations
        </Link>
        <span className="text-stone-600">/</span>
        <Link href="/stations/waste" className="text-stone-500 hover:text-stone-300">
          Waste Log
        </Link>
        <span className="text-stone-600">/</span>
        <span className="text-stone-300">Patterns</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Waste Patterns</h1>
        <p className="mt-1 text-sm text-stone-500">
          Last {patterns.days} days, {patterns.totalEntries} waste entries analyzed.
          {patterns.totalEntries === 0 && ' No waste logged yet.'}
        </p>
      </div>

      {patterns.totalEntries === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">
              No waste data to analyze. Log waste from station clipboards to see patterns here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ============================================ */}
          {/* REPEAT OFFENDERS */}
          {/* ============================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Repeat Offenders
                <span className="ml-2 text-sm font-normal text-stone-500">
                  Components that waste the most
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.repeatOffenders.length === 0 ? (
                <p className="text-sm text-stone-500">No repeat offenders found.</p>
              ) : (
                <div className="space-y-3">
                  {patterns.repeatOffenders.map((item, idx) => (
                    <div
                      key={item.componentId}
                      className="flex items-center justify-between rounded-lg bg-stone-800/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-stone-600 w-6">#{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-stone-200">{item.componentName}</p>
                          <p className="text-xs text-stone-500">{item.stationName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={REASON_COLORS[item.topReason] ?? 'default'}>
                          {REASON_LABELS[item.topReason] ?? item.topReason}
                        </Badge>
                        <span className="text-sm font-semibold text-stone-300">{item.count}x</span>
                        {item.totalValueCents > 0 && (
                          <span className="text-xs text-stone-500">
                            ${(item.totalValueCents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================ */}
          {/* DAY OF WEEK DISTRIBUTION */}
          {/* ============================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Day-of-Week Distribution
                <span className="ml-2 text-sm font-normal text-stone-500">
                  When waste happens most
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {patterns.dayDistribution.map((day) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className="text-sm text-stone-400 w-24">{day.day}</span>
                    <div className="flex-1 h-5 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          day.count === maxDayCount && day.count > 0 ? 'bg-red-500' : 'bg-amber-600'
                        }`}
                        style={{
                          width: `${maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono text-stone-400 w-8 text-right">
                      {day.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ============================================ */}
          {/* STATION BREAKDOWN */}
          {/* ============================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                By Station
                <span className="ml-2 text-sm font-normal text-stone-500">
                  Where waste concentrates
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.stationBreakdown.length === 0 ? (
                <p className="text-sm text-stone-500">No station data.</p>
              ) : (
                <div className="space-y-2">
                  {patterns.stationBreakdown.map((station) => (
                    <div
                      key={station.stationId}
                      className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                    >
                      <span className="text-stone-200">{station.stationName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-400">
                          {station.count} entr{station.count !== 1 ? 'ies' : 'y'}
                        </span>
                        {station.totalValueCents > 0 && (
                          <span className="text-stone-500">
                            ${(station.totalValueCents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

---

## Rules / DO NOT

- Do NOT create any database migration files
- Do NOT modify any existing function in `waste-actions.ts`, only ADD the new function at the end
- Do NOT modify the existing waste log page (`app/(chef)/stations/waste/page.tsx`)
- Do NOT add any client components or `'use client'` directives
- Do NOT use em dashes anywhere
- Do NOT add comments to code you did not write
- Do NOT touch any other file besides the two listed above
- Do NOT import anything that is not already used in the codebase

## Verification

```bash
npx tsc --noEmit --skipLibCheck
```

If this passes, the task is complete.

## Escape Hatch

If the `waste_log` table does not have a `component_id` column or the join to `station_components` fails, remove the `station_components (id, name)` from the select and replace all `(e as any).station_components?.name ?? 'Unknown'` with `'(component)'`. If the `stations` join also fails, do the same with station names. The page should still render with degraded labels rather than crashing.

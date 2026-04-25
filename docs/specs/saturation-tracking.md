# Saturation Tracking - Build Spec

> **Status:** Ready to build
> **Priority:** P1
> **Scope:** 3 new files, 1 small edit to dashboard page
> **Database changes:** NONE. Zero migrations. Zero new tables.
> **Risk:** LOW. Pure additive. All data sources already exist.

---

## What This Is

A saturation computation engine + dashboard widget that shows chefs their current workload as a percentage. Answers: "How full is my schedule right now?"

Saturation = committed capacity / available capacity, across multiple dimensions (time, events, guests).

---

## Existing Infrastructure (DO NOT MODIFY THESE FILES)

These files provide the data. Import and call their exports. Never edit them.

| File                                                      | What it provides                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/scheduling/capacity-planning-actions.ts`             | `getCapacityPlanningSettings()` returns `CapacityPlanningSettings` (max_events_per_day, max_events_per_week, blocked_days, etc.)                              |
| `lib/scheduling/capacity-planning-actions.ts`             | `getCapacityUtilization({ start, end })` returns `CapacityUtilization` (total_days, days_with_events, total_events, utilization_percent, busiest_day)         |
| `lib/scheduling/capacity-planning-actions.ts`             | `getWeekAvailability(weekStart)` returns `DayAvailability[]` (7 days with events_booked, max_events, status, total_committed_hours, remaining_capacity_hours) |
| `lib/auth/get-user.ts`                                    | `requireChef()` returns authenticated chef with `tenantId`                                                                                                    |
| `lib/db/server.ts`                                        | `createServerClient()` returns Supabase-compatible DB client                                                                                                  |
| `components/dashboard/widget-cards/stat-card.tsx`         | `StatCard` component (widgetId, title, value, subtitle, trend, trendDirection, href)                                                                          |
| `components/dashboard/widget-cards/widget-card-shell.tsx` | `WidgetCardShell` component (widgetId, title, size, href, children) + `WidgetCardSkeleton`                                                                    |
| `components/ui/widget-error-boundary.tsx`                 | `WidgetErrorBoundary` component (name, compact, children)                                                                                                     |

---

## Files to Create

### File 1: `lib/saturation/types.ts`

This file defines the types. No `'use server'` directive. No imports needed.

```typescript
/**
 * One dimension of saturation (e.g. time, events, guests).
 */
export type SaturationDimension = {
  label: string
  current: number
  max: number
  percent: number // 0-100, clamped
}

/**
 * Complete saturation snapshot for a time period.
 */
export type SaturationSnapshot = {
  /** Weighted overall saturation 0-100 */
  overall: number
  /** Individual dimensions */
  dimensions: {
    /** Days with events / available (non-blocked) days */
    time: SaturationDimension
    /** Total events / max allowed events in period */
    events: SaturationDimension
    /** Total guests across events / comfortable guest ceiling */
    guests: SaturationDimension
  }
  /** What period this covers */
  period: 'week' | 'month'
  /** Human label like "Apr 21 - Apr 27" */
  periodLabel: string
  /** Derived from overall % */
  status: 'low' | 'moderate' | 'high' | 'critical'
  /** Human-readable warnings */
  warnings: string[]
}
```

**EXACT contents above. Copy verbatim.**

---

### File 2: `lib/saturation/actions.ts`

This is the computation engine. It is a `'use server'` file.

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getCapacityPlanningSettings,
  type CapacityPlanningSettings,
} from '@/lib/scheduling/capacity-planning-actions'
import type { SaturationSnapshot, SaturationDimension } from './types'

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return formatDateStr(new Date(y, m - 1, d + days))
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[d.getDay()]
}

function getWeekRange(baseDate: Date): { start: string; end: string } {
  const dayOfWeek = baseDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDateStr(monday), end: formatDateStr(sunday) }
}

function getMonthRange(baseDate: Date): { start: string; end: string } {
  const y = baseDate.getFullYear()
  const m = baseDate.getMonth()
  const start = formatDateStr(new Date(y, m, 1))
  const lastDay = new Date(y, m + 1, 0).getDate()
  const end = formatDateStr(new Date(y, m, lastDay))
  return { start, end }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function makeDimension(label: string, current: number, max: number): SaturationDimension {
  const percent = max > 0 ? clamp(Math.round((current / max) * 100), 0, 100) : 0
  return { label, current, max, percent }
}

function deriveStatus(overall: number): SaturationSnapshot['status'] {
  if (overall >= 85) return 'critical'
  if (overall >= 65) return 'high'
  if (overall >= 35) return 'moderate'
  return 'low'
}

function formatPeriodLabel(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`
}

// ── Guest ceiling heuristic ────────────────────────────────────────────────────
// No setting exists for "max guests per period" so we use a sensible heuristic:
// max_events_per_week * 12 guests (avg private dinner) for weekly,
// multiply by ~4.3 for monthly. This avoids needing a new DB column.
const AVG_GUESTS_PER_EVENT = 12

// ── Main computation ───────────────────────────────────────────────────────────

export async function getSaturationSnapshot(
  period: 'week' | 'month' = 'week'
): Promise<SaturationSnapshot> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()
  const now = new Date()
  const range = period === 'week' ? getWeekRange(now) : getMonthRange(now)

  // ── Query events in range ──────────────────────────────────────────────────
  const { data: events } = await (db as any)
    .from('events')
    .select('id, event_date, guest_count, status')
    .eq('tenant_id', tenantId)
    .gte('event_date', range.start)
    .lte('event_date', range.end)
    .not('status', 'in', '("cancelled","draft")')
    .eq('is_demo', false)

  const eventList: Array<{ id: string; event_date: string; guest_count: number; status: string }> =
    events ?? []

  // ── Count available (non-blocked) days in range ────────────────────────────
  let availableDays = 0
  let current = range.start
  while (current <= range.end) {
    const dayName = getDayName(current)
    if (!settings.blocked_days.includes(dayName)) {
      availableDays++
    }
    current = addDays(current, 1)
  }

  // ── Count days with events ─────────────────────────────────────────────────
  const datesWithEvents = new Set(eventList.map((e) => e.event_date))
  const daysWithEvents = datesWithEvents.size

  // ── Total guests ───────────────────────────────────────────────────────────
  const totalGuests = eventList.reduce((sum, e) => sum + (e.guest_count ?? 0), 0)

  // ── Total events ───────────────────────────────────────────────────────────
  const totalEvents = eventList.length

  // ── Max calculations ───────────────────────────────────────────────────────
  const maxEvents =
    period === 'week' ? settings.max_events_per_week : settings.max_events_per_week * 4 // approximate month

  const maxGuests =
    period === 'week'
      ? settings.max_events_per_week * AVG_GUESTS_PER_EVENT
      : settings.max_events_per_week * AVG_GUESTS_PER_EVENT * 4

  // ── Build dimensions ───────────────────────────────────────────────────────
  const timeDim = makeDimension('Schedule', daysWithEvents, availableDays)
  const eventsDim = makeDimension('Events', totalEvents, maxEvents)
  const guestsDim = makeDimension('Guests', totalGuests, maxGuests)

  // ── Weighted overall (time 40%, events 35%, guests 25%) ────────────────────
  const overall = clamp(
    Math.round(timeDim.percent * 0.4 + eventsDim.percent * 0.35 + guestsDim.percent * 0.25),
    0,
    100
  )

  // ── Warnings ───────────────────────────────────────────────────────────────
  const warnings: string[] = []

  // Check for days exceeding daily max
  const countsByDate = new Map<string, number>()
  for (const e of eventList) {
    countsByDate.set(e.event_date, (countsByDate.get(e.event_date) ?? 0) + 1)
  }
  for (const [date, count] of countsByDate) {
    if (count > settings.max_events_per_day) {
      warnings.push(`${date}: ${count} events exceeds daily max of ${settings.max_events_per_day}`)
    }
  }

  if (overall >= 85) {
    warnings.push('Schedule is near capacity. Consider blocking days for rest.')
  }

  return {
    overall,
    dimensions: {
      time: timeDim,
      events: eventsDim,
      guests: guestsDim,
    },
    period,
    periodLabel: formatPeriodLabel(range.start, range.end),
    status: deriveStatus(overall),
    warnings,
  }
}
```

**EXACT contents above. Copy verbatim.**

---

### File 3: `app/(chef)/dashboard/_sections/saturation-cards.tsx`

Dashboard widget. Async server component following the exact same pattern as `schedule-cards.tsx`.

```typescript
// Dashboard Saturation Cards - shows workload saturation %
// Follows the same pattern as schedule-cards.tsx

import { getSaturationSnapshot } from '@/lib/saturation/actions'
import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import type { SaturationSnapshot } from '@/lib/saturation/types'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/SaturationCards] ${label} failed:`, err)
    return fallback
  }
}

const STATUS_COLORS: Record<SaturationSnapshot['status'], string> = {
  low: 'text-green-400',
  moderate: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

const STATUS_LABELS: Record<SaturationSnapshot['status'], string> = {
  low: 'Light',
  moderate: 'Moderate',
  high: 'Busy',
  critical: 'Near Capacity',
}

export async function SaturationCards() {
  const snapshot = await safe('saturation', () => getSaturationSnapshot('week'), null)

  if (!snapshot) return null

  const { overall, dimensions, periodLabel, status, warnings } = snapshot

  return (
    <>
      <StatCard
        widgetId="saturation-overall"
        title="Workload"
        value={`${overall}%`}
        subtitle={periodLabel}
        trend={STATUS_LABELS[status]}
        trendDirection={overall >= 65 ? 'down' : overall >= 35 ? 'flat' : 'up'}
        href="/scheduling"
      />
      <WidgetCardShell widgetId="saturation-breakdown" title="Capacity" size="md">
        <div className="space-y-2 text-sm">
          {([dimensions.time, dimensions.events, dimensions.guests] as const).map((dim) => (
            <div key={dim.label} className="flex items-center gap-2">
              <span className="w-16 text-stone-400 shrink-0">{dim.label}</span>
              <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    dim.percent >= 85
                      ? 'bg-red-500'
                      : dim.percent >= 65
                        ? 'bg-orange-500'
                        : dim.percent >= 35
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                  }`}
                  style={{ width: `${dim.percent}%` }}
                />
              </div>
              <span className="w-12 text-right text-stone-300 tabular-nums">
                {dim.current}/{dim.max}
              </span>
            </div>
          ))}
          {warnings.length > 0 && (
            <p className="text-xs text-amber-400 mt-1">{warnings[0]}</p>
          )}
        </div>
      </WidgetCardShell>
    </>
  )
}
```

**EXACT contents above. Copy verbatim.**

---

## File to Edit

### File 4: `app/(chef)/dashboard/page.tsx`

Two changes to this file. Both are purely additive.

#### Change A: Add import (near line 61, with the other section imports)

Add this line immediately after the existing `import { ScheduleCards }` line:

```typescript
import { SaturationCards } from './_sections/saturation-cards'
```

#### Change B: Add skeleton function (near line 211, after `ScheduleCardsSkeleton`)

Add this function immediately after the closing `}` of `ScheduleCardsSkeleton()`:

```typescript
function SaturationCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="md" />
    </>
  )
}
```

#### Change C: Add widget to the "Today & This Week" grid

Find this exact block (around line 1719-1725):

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
  <WidgetErrorBoundary name="Schedule" compact>
    <Suspense fallback={<ScheduleCardsSkeleton />}>
      <ScheduleCards />
    </Suspense>
  </WidgetErrorBoundary>
</div>
```

Replace it with:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
  <WidgetErrorBoundary name="Schedule" compact>
    <Suspense fallback={<ScheduleCardsSkeleton />}>
      <ScheduleCards />
    </Suspense>
  </WidgetErrorBoundary>
  <WidgetErrorBoundary name="Saturation" compact>
    <Suspense fallback={<SaturationCardsSkeleton />}>
      <SaturationCards />
    </Suspense>
  </WidgetErrorBoundary>
</div>
```

---

## What NOT to Do

- **DO NOT** create any database migrations or new tables
- **DO NOT** modify any existing files except `app/(chef)/dashboard/page.tsx`
- **DO NOT** modify `lib/scheduling/capacity-planning-actions.ts`
- **DO NOT** modify any CIL files (`lib/cil/*`)
- **DO NOT** modify Remy files (`lib/ai/remy-*.ts`)
- **DO NOT** add any new npm dependencies
- **DO NOT** use em dashes anywhere (use commas, semicolons, or separate sentences)
- **DO NOT** use "OpenClaw" in any user-facing strings
- **DO NOT** add `@ts-nocheck` to any file
- **DO NOT** add try/catch blocks that return `$0` or empty arrays on failure (Zero Hallucination rule)
- **DO NOT** add any routes, pages, or API endpoints

---

## Verification

After building, confirm:

1. `npx tsc --noEmit --skipLibCheck` passes with no new errors
2. The three new files exist at the exact paths specified
3. The dashboard page imports `SaturationCards` and renders it inside a `Suspense` + `WidgetErrorBoundary`
4. `lib/saturation/actions.ts` starts with `'use server'`
5. `lib/saturation/types.ts` does NOT have `'use server'`
6. No em dashes in any file
7. No modifications to any file other than `app/(chef)/dashboard/page.tsx`

---

## Architecture Notes (for reviewer, not for builder)

This is Layer 1 of a 4-layer saturation system. Future layers will:

- Layer 2: Add prep hours + guest volume weighting via `getWeekAvailability()`
- Layer 3: Surface saturation context on inquiry and quoting pages
- Layer 4: Feed saturation into CIL as an 8th signal source + Remy awareness

This spec intentionally stays narrow. The computation engine (`lib/saturation/actions.ts`) is designed to be extended by adding more dimensions to the snapshot type without breaking the dashboard widget.

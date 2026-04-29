// Global Travel Planning Page
// Weekly view of all travel legs across all events.
// Lets the chef plan and review the full logistics picture for any given week.

import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { getAllTravelLegs } from '@/lib/travel/actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { RetryButton } from '@/components/ui/retry-button'
import {
  LEG_TYPE_LABELS,
  LEG_STATUS_LABELS,
  formatLegTime,
  formatMinutes,
} from '@/lib/travel/types'
import type { TravelLegWithIngredients } from '@/lib/travel/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}`
}

function groupByWeek(
  legs: TravelLegWithIngredients[]
): Map<string, { label: string; monday: Date; legs: TravelLegWithIngredients[] }> {
  const map = new Map<string, { label: string; monday: Date; legs: TravelLegWithIngredients[] }>()

  for (const leg of legs) {
    const d = new Date(leg.leg_date)
    const monday = getWeekStart(d)
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    if (!map.has(key)) {
      map.set(key, { label: formatWeekLabel(monday), monday, legs: [] })
    }
    map.get(key)!.legs.push(leg)
  }

  return map
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

// ─── Leg Row ──────────────────────────────────────────────────────────────────

function LegRow({ leg }: { leg: TravelLegWithIngredients }) {
  const hasIngredients = leg.ingredients.length > 0
  const sourcedCount = leg.ingredients.filter((i) => i.status === 'sourced').length
  const rowClassName =
    'flex items-start justify-between py-3 border-b border-stone-800 last:border-0 gap-4 rounded-md px-2 -mx-2'

  const content = (
    <>
      <div className="flex items-start gap-3">
        {/* Day */}
        <div className="flex-shrink-0 text-center w-10">
          <p className="text-xs text-stone-400">
            {new Date(leg.leg_date).toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p className="text-sm font-bold text-stone-300">{new Date(leg.leg_date).getDate()}</p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-stone-200">
              {LEG_TYPE_LABELS[leg.leg_type]}
            </span>
            <Badge variant={statusVariant(leg.status)}>{LEG_STATUS_LABELS[leg.status]}</Badge>
          </div>
          <div className="flex gap-3 text-xs text-stone-400 mt-0.5">
            {leg.departure_time && <span>{formatLegTime(leg.departure_time)}</span>}
            {leg.total_estimated_minutes && (
              <span>~{formatMinutes(leg.total_estimated_minutes)}</span>
            )}
            {leg.stops.length > 0 && (
              <span>
                {leg.stops.length} stop{leg.stops.length !== 1 ? 's' : ''}
              </span>
            )}
            {hasIngredients && (
              <span>
                {sourcedCount}/{leg.ingredients.length} sourced
              </span>
            )}
          </div>
          {(leg.origin_label || leg.destination_label) && (
            <p className="text-xs text-stone-400 mt-0.5">
              {leg.origin_label} → {leg.destination_label}
            </p>
          )}
        </div>
      </div>

      {leg.primary_event_id && (
        <span className="rounded px-3 py-1.5 text-sm text-stone-200 transition-colors hover:bg-stone-700">
          View
        </span>
      )}
    </>
  )

  if (leg.primary_event_id) {
    return (
      <Link
        href={`/events/${leg.primary_event_id}/travel`}
        className={`${rowClassName} hover:bg-stone-800/60`}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={rowClassName}>
      {content}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GlobalTravelPage() {
  await requireChef()
  await requireFocusAccess()

  // Load next 90 days of travel legs
  const today = new Date()
  const future = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90)

  let legs: Awaited<ReturnType<typeof getAllTravelLegs>> = []
  let travelLoadFailed = false
  try {
    legs = await getAllTravelLegs({
      fromDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      toDate: `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`,
    })
  } catch {
    travelLoadFailed = true
    legs = []
  }

  const weekGroups = groupByWeek(legs)
  const weeks = Array.from(weekGroups.values()).sort(
    (a, b) => a.monday.getTime() - b.monday.getTime()
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Travel Planning</h1>
        <p className="text-sm text-stone-500 mt-1">
          All upcoming trips across all events - next 90 days
        </p>
      </div>

      {/* Summary stats */}
      {legs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{legs.length}</p>
            <p className="text-xs text-stone-500 mt-1">Total trips planned</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">
              {legs.filter((l) => l.leg_type === 'specialty_sourcing').length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Specialty sourcing runs</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">
              {legs.filter((l) => l.linked_event_ids.length > 0).length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Consolidated runs</p>
          </Card>
        </div>
      )}

      {/* Week groups */}
      {travelLoadFailed ? (
        <Card className="p-10">
          <ErrorState
            title="Could not load travel plans"
            description="Upcoming travel legs are unavailable right now."
            size="sm"
          />
          <div className="flex justify-center">
            <RetryButton />
          </div>
        </Card>
      ) : weeks.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-lg font-medium text-stone-400">No trips planned in the next 90 days</p>
          <p className="text-sm text-stone-400 mt-1">
            Open an event and go to Travel Plan to start planning your routes.
          </p>
          <div className="mt-4">
            <Link href="/events">
              <Button variant="secondary">View Events</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {weeks.map(({ label, legs: weekLegs }) => (
            <Card key={label} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-stone-300">{label}</h2>
                <span className="text-xs text-stone-400">
                  {weekLegs.length} trip{weekLegs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                {weekLegs.map((leg) => (
                  <LegRow key={leg.id} leg={leg} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

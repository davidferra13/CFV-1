'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getCapacityPlanningSettings,
  type CapacityPlanningSettings,
} from '@/lib/scheduling/capacity-planning-actions'
import type { SaturationSnapshot, SaturationDimension } from './types'

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Guest ceiling heuristic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// No setting exists for "max guests per period" so we use a sensible heuristic:
// max_events_per_week * 12 guests (avg private dinner) for weekly,
// multiply by ~4.3 for monthly. This avoids needing a new DB column.
const AVG_GUESTS_PER_EVENT = 12

// â”€â”€ Main computation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getSaturationSnapshot(
  period: 'week' | 'month' = 'week'
): Promise<SaturationSnapshot> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const settings = await getCapacityPlanningSettings()
  const now = new Date()
  const range = period === 'week' ? getWeekRange(now) : getMonthRange(now)

  // â”€â”€ Query events in range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Count available (non-blocked) days in range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let availableDays = 0
  let current = range.start
  while (current <= range.end) {
    const dayName = getDayName(current)
    if (!settings.blocked_days.includes(dayName)) {
      availableDays++
    }
    current = addDays(current, 1)
  }

  // â”€â”€ Count days with events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const datesWithEvents = new Set(eventList.map((e) => e.event_date))
  const daysWithEvents = datesWithEvents.size

  // â”€â”€ Total guests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalGuests = eventList.reduce((sum, e) => sum + (e.guest_count ?? 0), 0)

  // â”€â”€ Total events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalEvents = eventList.length

  // â”€â”€ Max calculations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const maxEvents =
    period === 'week' ? settings.max_events_per_week : settings.max_events_per_week * 4 // approximate month

  const maxGuests =
    period === 'week'
      ? settings.max_events_per_week * AVG_GUESTS_PER_EVENT
      : settings.max_events_per_week * AVG_GUESTS_PER_EVENT * 4

  // â”€â”€ Build dimensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const timeDim = makeDimension('Schedule', daysWithEvents, availableDays)
  const eventsDim = makeDimension('Events', totalEvents, maxEvents)
  const guestsDim = makeDimension('Guests', totalGuests, maxGuests)

  // â”€â”€ Weighted overall (time 40%, events 35%, guests 25%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const overall = clamp(
    Math.round(timeDim.percent * 0.4 + eventsDim.percent * 0.35 + guestsDim.percent * 0.25),
    0,
    100
  )

  // â”€â”€ Warnings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

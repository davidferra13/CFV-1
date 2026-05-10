// CIL Proactive Analyzer: Calendar
// Detects overload warnings, dead spots, and booking pace changes

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeCalendar(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Overload: 3+ events in any upcoming week
    await analyzeOverload(client, tenantId, signals, now)

    // 2. Dead spots: no bookings in next 14 days
    await analyzeDeadSpots(client, tenantId, signals, now)

    // 3. Booking pace: compare current quarter vs prior quarter
    await analyzeBookingPace(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/calendar] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

async function analyzeOverload(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date()
  const fourWeeksOut = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000)

  const { data: upcomingEvents } = await client
    .from('events')
    .select('id, event_date, occasion')
    .eq('tenant_id', tenantId)
    .gte('event_date', today.toISOString().slice(0, 10))
    .lte('event_date', fourWeeksOut.toISOString().slice(0, 10))
    .neq('status', 'cancelled')

  if (!upcomingEvents || upcomingEvents.length === 0) return

  // Group by ISO week
  const weekMap = new Map<string, Array<{ id: string; event_date: string; occasion: string }>>()
  for (const evt of upcomingEvents) {
    const date = new Date(evt.event_date)
    // Compute week start (Monday)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(date)
    weekStart.setDate(diff)
    const weekKey = weekStart.toISOString().slice(0, 10)

    const existing = weekMap.get(weekKey) || []
    existing.push(evt)
    weekMap.set(weekKey, existing)
  }

  for (const [weekStart, events] of weekMap) {
    if (events.length >= 3) {
      signals.push({
        id: generateId(),
        domain: 'calendar',
        urgency: 4,
        confidence: 0.95,
        title: `Heavy week: ${events.length} events`,
        detail: `Week of ${weekStart} has ${events.length} events scheduled. Ensure prep time and supplies are accounted for.`,
        suggestedAction: 'Review prep timelines and consider batching shopping',
        actionType: 'navigate',
        actionPayload: { path: '/calendar' },
        entityIds: events.map((e) => e.id),
        source: 'calendar.overload',
        createdAt: now,
      })
    }
  }
}

async function analyzeDeadSpots(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date()
  const twoWeeksOut = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

  const { data: upcomingEvents } = await client
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', today.toISOString().slice(0, 10))
    .lte('event_date', twoWeeksOut.toISOString().slice(0, 10))
    .neq('status', 'cancelled')

  if (!upcomingEvents || upcomingEvents.length === 0) {
    signals.push({
      id: generateId(),
      domain: 'calendar',
      urgency: 3,
      confidence: 0.85,
      title: 'No events in next 2 weeks',
      detail:
        'Calendar is empty for the next 14 days. Time to drum up business or use downtime for planning.',
      suggestedAction: 'Follow up with dormant clients or promote availability',
      actionType: 'navigate',
      actionPayload: { path: '/pipeline' },
      entityIds: [],
      source: 'calendar.deadSpots',
      createdAt: now,
    })
  }
}

async function analyzeBookingPace(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date()

  // Current quarter so far
  const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
  const dayIntoQuarter = Math.max(
    1,
    Math.round((today.getTime() - quarterStart.getTime()) / (24 * 60 * 60 * 1000))
  )

  // Prior quarter (same duration)
  const priorQuarterStart = new Date(quarterStart)
  priorQuarterStart.setMonth(priorQuarterStart.getMonth() - 3)
  const priorQuarterEnd = new Date(
    priorQuarterStart.getTime() + dayIntoQuarter * 24 * 60 * 60 * 1000
  )

  const { data: currentBookings } = await client
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', quarterStart.toISOString())
    .neq('status', 'cancelled')

  const { data: priorBookings } = await client
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', priorQuarterStart.toISOString())
    .lte('created_at', priorQuarterEnd.toISOString())
    .neq('status', 'cancelled')

  const currentCount = currentBookings?.length || 0
  const priorCount = priorBookings?.length || 0

  if (priorCount >= 3 && currentCount < priorCount * 0.6) {
    const dropPercent = Math.round(((priorCount - currentCount) / priorCount) * 100)
    signals.push({
      id: generateId(),
      domain: 'calendar',
      urgency: 3,
      confidence: 0.65,
      title: 'Booking pace slowing',
      detail: `${currentCount} bookings this quarter vs ${priorCount} at same point last quarter (${dropPercent}% fewer).`,
      suggestedAction: 'Review marketing efforts and follow up with leads',
      actionType: 'navigate',
      actionPayload: { path: '/analytics/pipeline' },
      entityIds: [],
      source: 'calendar.bookingPace',
      createdAt: now,
    })
  }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventPrepTimeline } from './actions'

export type PrepPressureDay = {
  date: string          // ISO date string, e.g. "2026-04-27"
  dayOfWeek: string     // "Monday", "Tuesday", etc.
  activeMinutes: number
  passiveMinutes: number
  totalMinutes: number
  events: { id: string; occasion: string; activeMinutes: number }[]
  isHeavy: boolean      // activeMinutes >= 240
}

export type WeekPrepPressure = {
  days: PrepPressureDay[]
  totalActiveMinutes: number
  heavyDayCount: number
}

export async function getWeekPrepPressure(): Promise<WeekPrepPressure> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Get all events in the next 14 days (to catch prep that starts early)
  const today = new Date()
  const twoWeeksOut = new Date(today)
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const todayStr = today.toISOString().slice(0, 10)
  const futureStr = twoWeeksOut.toISOString().slice(0, 10)

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', todayStr)
    .lte('event_date', futureStr)
    .not('status', 'in', '("cancelled","completed")')

  if (!events || events.length === 0) {
    return { days: [], totalActiveMinutes: 0, heavyDayCount: 0 }
  }

  // 2. Fetch prep timelines for each event (parallel, with error catching)
  const timelines = await Promise.all(
    events.map(async (event: any) => {
      try {
        const { timeline } = await getEventPrepTimeline(event.id)
        return { event, timeline }
      } catch {
        return { event, timeline: null }
      }
    })
  )

  // 3. Aggregate prep minutes by calendar date
  const dayMap = new Map<string, {
    activeMinutes: number
    passiveMinutes: number
    events: Map<string, { id: string; occasion: string; activeMinutes: number }>
  }>()

  for (const { event, timeline } of timelines) {
    if (!timeline) continue
    for (const day of timeline.days) {
      const dateStr = day.date.toISOString().slice(0, 10)
      let entry = dayMap.get(dateStr)
      if (!entry) {
        entry = { activeMinutes: 0, passiveMinutes: 0, events: new Map() }
        dayMap.set(dateStr, entry)
      }
      entry.activeMinutes += day.activeMinutes
      entry.passiveMinutes += day.passiveMinutes

      const existing = entry.events.get(event.id)
      if (existing) {
        existing.activeMinutes += day.activeMinutes
      } else {
        entry.events.set(event.id, {
          id: event.id,
          occasion: event.occasion || 'Event',
          activeMinutes: day.activeMinutes,
        })
      }
    }
  }

  // 4. Build the next 7 days array
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const days: PrepPressureDay[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const entry = dayMap.get(dateStr)

    days.push({
      date: dateStr,
      dayOfWeek: dayNames[d.getDay()],
      activeMinutes: entry?.activeMinutes ?? 0,
      passiveMinutes: entry?.passiveMinutes ?? 0,
      totalMinutes: (entry?.activeMinutes ?? 0) + (entry?.passiveMinutes ?? 0),
      events: entry ? Array.from(entry.events.values()) : [],
      isHeavy: (entry?.activeMinutes ?? 0) >= 240,
    })
  }

  const totalActiveMinutes = days.reduce((sum, d) => sum + d.activeMinutes, 0)
  const heavyDayCount = days.filter((d) => d.isHeavy).length

  return { days, totalActiveMinutes, heavyDayCount }
}

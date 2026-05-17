'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { getEventTimeline } from '@/lib/events/timeline-generator-actions'
import { generateICalFeed } from './ical-generator'
import type { ICalEvent, ICalFeed, ExportOptions } from './ical-types'
import type { PrepItem } from '@/lib/prep-timeline/compute-timeline'

// ── Helpers ─────────────────────────────────────────────────────────────────

const PRODID = '-//ChefFlow//iCalExport//EN'

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function buildPrepDayDescription(items: PrepItem[]): string {
  if (items.length === 0) return ''
  return items
    .map((item) => {
      const name = item.recipeName || item.componentName || 'Item'
      const time = item.activeMinutes ? ` (${item.activeMinutes}min active)` : ''
      return `- ${name}${time}`
    })
    .join('\n')
}

// ── Export: Prep Timeline ───────────────────────────────────────────────────

/**
 * Generate an iCal (.ics) string from an event's prep timeline.
 * Each prep day becomes an all-day calendar event with the item list in
 * the description. Grocery deadline days are included with a note.
 */
export async function exportPrepTimelineAsICal(
  eventId: string,
  options?: ExportOptions
): Promise<string> {
  await requireChef()

  const { timeline } = await getEventPrepTimeline(eventId)
  if (!timeline || timeline.days.length === 0) {
    throw new Error('No prep timeline data for this event')
  }

  const calEvents: ICalEvent[] = []

  for (const day of timeline.days) {
    // Skip empty days unless they are grocery deadline days
    if (day.items.length === 0 && day.deadlineType !== 'grocery') continue

    const dateStr = `${day.date.getFullYear()}${String(day.date.getMonth() + 1).padStart(2, '0')}${String(day.date.getDate()).padStart(2, '0')}`
    const uid = `prep-${eventId}-${dateStr}@chefflow`

    let description = buildPrepDayDescription(day.items)
    if (day.deadlineType === 'grocery' && day.items.length === 0) {
      description = 'Buy everything for this event'
    }

    // Include untimed items on service day if option is set
    if (options?.includeUntimed && day.isServiceDay && timeline.untimedItems.length > 0) {
      const untimedBlock = timeline.untimedItems
        .map((item) => `- ${item.recipeName} (no timing data)`)
        .join('\n')
      description += description
        ? `\n\nUntimed items:\n${untimedBlock}`
        : `Untimed items:\n${untimedBlock}`
    }

    const category = day.isServiceDay
      ? 'Service Day'
      : day.deadlineType === 'grocery'
        ? 'Grocery'
        : 'Prep'

    calEvents.push({
      uid,
      summary: `Prep Day: ${day.label}`,
      description,
      dtStart: day.date,
      dtEnd: addCalendarDays(day.date, 1),
      allDay: true,
      categories: [category],
    })
  }

  const feed: ICalFeed = {
    prodId: PRODID,
    calendarName: options?.calendarName ?? 'ChefFlow Prep Timeline',
    events: calEvents,
  }

  return generateICalFeed(feed)
}

// ── Export: Event Timeline (Day-Of) ─────────────────────────────────────────

/**
 * Generate an iCal (.ics) string from an event's day-of timeline.
 * Each timeline block (travel, setup, prep, fire, plate, serve, cleanup)
 * becomes a timed calendar event at the exact scheduled time.
 */
export async function exportEventTimelineAsICal(
  eventId: string,
  options?: ExportOptions
): Promise<string> {
  await requireChef()

  const timeline = await getEventTimeline(eventId)
  if (!timeline || !timeline.blocks || timeline.blocks.length === 0) {
    throw new Error('No event timeline data for this event')
  }

  const calEvents: ICalEvent[] = []

  for (const block of timeline.blocks) {
    // Skip completed blocks if option says so
    if (options?.includeCompleted === false && block.completed_at) continue

    const uid = `timeline-${eventId}-${block.id}@chefflow`
    const startDate = new Date(block.start_time)
    const endDate = new Date(block.end_time)

    let description = ''
    if (block.notes) {
      description = block.notes
    }
    if (block.is_parallel) {
      description += description
        ? '\n(Runs parallel with previous block)'
        : '(Runs parallel with previous block)'
    }

    calEvents.push({
      uid,
      summary: block.label,
      description,
      dtStart: startDate,
      dtEnd: endDate,
      allDay: false,
      categories: [block.block_type],
    })
  }

  const feed: ICalFeed = {
    prodId: PRODID,
    calendarName: options?.calendarName ?? 'ChefFlow Event Timeline',
    events: calEvents,
  }

  return generateICalFeed(feed)
}

// ── Export: Weekly Schedule ─────────────────────────────────────────────────

/**
 * Generate an iCal (.ics) string for all events in a given week.
 * Each event becomes an all-day calendar event on its date.
 * If events have timelines, the timeline blocks are included as timed events.
 *
 * @param weekStart - ISO date string (YYYY-MM-DD) for the Monday of the week
 */
export async function exportWeeklyScheduleAsICal(
  weekStart: string,
  options?: ExportOptions
): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Calculate week end (Sunday)
  const startDate = new Date(weekStart)
  const endDate = addCalendarDays(startDate, 7)
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  // Fetch events in this week
  const { data: events } = await db
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, event_time, guest_count, status, client:clients(full_name)'
    )
    .eq('tenant_id', tenantId)
    .gte('event_date', weekStart)
    .lt('event_date', endStr)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    throw new Error('No events found for this week')
  }

  const calEvents: ICalEvent[] = []

  for (const event of events as any[]) {
    const eventDate = new Date(event.event_date)
    const uid = `event-${event.id}@chefflow`

    // Build description
    const descParts: string[] = []
    if (event.client?.full_name) {
      descParts.push(`Client: ${event.client.full_name}`)
    }
    if (event.guest_count) {
      descParts.push(`Guests: ${event.guest_count}`)
    }
    if (event.status) {
      descParts.push(`Status: ${event.status}`)
    }
    const description = descParts.join('\n')

    const title = event.occasion || 'Event'
    const clientSuffix = event.client?.full_name ? ` (${event.client.full_name})` : ''

    // If event has a serve time, create a timed event
    const timeStr = event.serve_time || event.event_time
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number)
      const start = new Date(eventDate)
      start.setHours(h, m, 0, 0)
      // Default 4-hour event duration
      const end = new Date(start)
      end.setHours(end.getHours() + 4)

      calEvents.push({
        uid,
        summary: `${title}${clientSuffix}`,
        description,
        dtStart: start,
        dtEnd: end,
        allDay: false,
        categories: ['Event'],
      })
    } else {
      // All-day event
      calEvents.push({
        uid,
        summary: `${title}${clientSuffix}`,
        description,
        dtStart: eventDate,
        dtEnd: addCalendarDays(eventDate, 1),
        allDay: true,
        categories: ['Event'],
      })
    }

    // Try to include timeline blocks for this event
    try {
      const timeline = await getEventTimeline(event.id)
      if (timeline?.blocks && timeline.blocks.length > 0) {
        for (const block of timeline.blocks) {
          if (options?.includeCompleted === false && block.completed_at) continue

          const blockUid = `timeline-${event.id}-${block.id}@chefflow`
          const blockStart = new Date(block.start_time)
          const blockEnd = new Date(block.end_time)

          calEvents.push({
            uid: blockUid,
            summary: `${block.label} [${title}]`,
            description: block.notes || '',
            dtStart: blockStart,
            dtEnd: blockEnd,
            allDay: false,
            categories: [block.block_type, 'Event Timeline'],
          })
        }
      }
    } catch {
      // No timeline for this event; skip silently
    }
  }

  const feed: ICalFeed = {
    prodId: PRODID,
    calendarName: options?.calendarName ?? `ChefFlow Week of ${weekStart}`,
    events: calEvents,
  }

  return generateICalFeed(feed)
}

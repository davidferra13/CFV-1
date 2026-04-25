'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getEventPrepTimeline } from './actions'
import type { PrepItem } from './compute-timeline'

function formatICalDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function escapeICalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function foldICalLine(line: string): string {
  const chunks: string[] = []
  let remaining = line

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75))
    remaining = ` ${remaining.slice(75)}`
  }

  chunks.push(remaining)
  return chunks.join('\r\n')
}

/**
 * Generate an iCal (.ics) string for an event's prep timeline.
 * Each prep day becomes an all-day calendar event with item list in description.
 */
export async function generatePrepTimelineICal(eventId: string): Promise<string> {
  await requireChef()
  const { timeline } = await getEventPrepTimeline(eventId)

  if (!timeline || timeline.days.length === 0) {
    throw new Error('No prep timeline data for this event')
  }

  const now = new Date()
  const dtstamp = `${now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')}`
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChefFlow//PrepTimeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const day of timeline.days) {
    const dateStr = formatICalDate(day.date)
    const endStr = formatICalDate(addCalendarDays(day.date, 1))
    const itemLines = (day.items || []).map((item: PrepItem) => {
      const name = item.recipeName || item.componentName || 'Item'
      const time = item.activeMinutes ? ` (${item.activeMinutes}min active)` : ''
      return `- ${name}${time}`
    })
    const description =
      itemLines.length > 0
        ? itemLines.join('\n')
        : day.deadlineType === 'grocery'
          ? 'Buy everything for this event'
          : ''
    const uid = `prep-${eventId}-${dateStr}@chefflow`

    lines.push('BEGIN:VEVENT')
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`)
    lines.push(`DTEND;VALUE=DATE:${endStr}`)
    lines.push(foldICalLine(`DTSTAMP:${dtstamp}`))
    lines.push(foldICalLine(`SUMMARY:${escapeICalText(`Prep Day - ${day.label || dateStr}`)}`))
    lines.push(foldICalLine(`DESCRIPTION:${escapeICalText(description)}`))
    lines.push(foldICalLine(`UID:${escapeICalText(uid)}`))
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

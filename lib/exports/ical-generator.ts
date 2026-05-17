// Pure iCal Generator
// Produces valid RFC 5545 .ics content from ICalFeed data.
// No database calls, no server actions, no side effects.

import type { ICalFeed, ICalEvent } from './ical-types'

// ── RFC 5545 Text Escaping ──────────────────────────────────────────────────

/**
 * Escape special characters per RFC 5545 Section 3.3.11.
 * Backslash, semicolons, commas, and newlines must be escaped.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Fold content lines to 75 octets per RFC 5545 Section 3.1.
 * Lines longer than 75 characters are broken with CRLF + space continuation.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line

  const chunks: string[] = []
  let remaining = line

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75))
    remaining = ` ${remaining.slice(75)}`
  }

  chunks.push(remaining)
  return chunks.join('\r\n')
}

// ── Date Formatting ─────────────────────────────────────────────────────────

/**
 * Format a Date as iCal DATE value: YYYYMMDD
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * Format a Date as iCal DATETIME value: YYYYMMDDTHHMMSS
 * Uses local time (no Z suffix) since chef events are in their local timezone.
 */
function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${mo}${d}T${h}${mi}${s}`
}

/**
 * Format current timestamp as DTSTAMP (UTC).
 */
function formatDtStamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

// ── VEVENT Rendering ────────────────────────────────────────────────────────

function renderEvent(event: ICalEvent, dtstamp: string): string[] {
  const lines: string[] = ['BEGIN:VEVENT']

  // DTSTAMP is required by RFC 5545
  lines.push(`DTSTAMP:${dtstamp}`)

  // UID is required
  lines.push(foldLine(`UID:${escapeText(event.uid)}`))

  // DTSTART / DTEND
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.dtStart)}`)
    lines.push(`DTEND;VALUE=DATE:${formatDate(event.dtEnd)}`)
  } else {
    lines.push(`DTSTART:${formatDateTime(event.dtStart)}`)
    lines.push(`DTEND:${formatDateTime(event.dtEnd)}`)
  }

  // SUMMARY
  lines.push(foldLine(`SUMMARY:${escapeText(event.summary)}`))

  // DESCRIPTION
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(event.description)}`))
  }

  // LOCATION
  if (event.location) {
    lines.push(foldLine(`LOCATION:${escapeText(event.location)}`))
  }

  // CATEGORIES
  if (event.categories && event.categories.length > 0) {
    lines.push(foldLine(`CATEGORIES:${event.categories.map(escapeText).join(',')}`))
  }

  lines.push('END:VEVENT')
  return lines
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a complete RFC 5545 iCal feed string from structured data.
 *
 * Returns a valid .ics file content string with CRLF line endings.
 * Each ICalEvent becomes a VEVENT block.
 *
 * @param feed - The calendar feed data (events, metadata)
 * @returns Valid .ics file content
 */
export function generateICalFeed(feed: ICalFeed): string {
  const dtstamp = formatDtStamp()

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    foldLine(`PRODID:${escapeText(feed.prodId)}`),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeText(feed.calendarName)}`),
  ]

  for (const event of feed.events) {
    lines.push(...renderEvent(event, dtstamp))
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

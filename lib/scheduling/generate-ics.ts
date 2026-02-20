// ICS Calendar Event Generator
// Extracted from calendar-sync.ts to avoid the @ts-nocheck overhead of the
// deferred Google Calendar OAuth code in that file.
// generateICS is a pure function — no DB access, no auth required.

/**
 * Generate an RFC 5545-compliant iCalendar (.ics) string for a single event.
 * Suitable for email attachments, direct downloads (Apple Calendar, Outlook),
 * and as input to the Google Calendar deep-link URL builder.
 *
 * @param event   Event details to encode
 * @param sequence  Increment when updating an existing calendar entry (default 0)
 */
export function generateICS(
  event: {
    id: string
    title: string
    eventDate: string   // 'YYYY-MM-DD'
    startTime?: string  // 'HH:MM' (24-hour)
    endTime?: string    // 'HH:MM' (24-hour)
    location?: string
    description?: string
    guestCount?: number
  },
  sequence = 0,
): string {
  const start = event.startTime
    ? `${event.eventDate.replace(/-/g, '')}T${event.startTime.replace(/:/g, '')}00`
    : `${event.eventDate.replace(/-/g, '')}T180000`

  const end = event.endTime
    ? `${event.eventDate.replace(/-/g, '')}T${event.endTime.replace(/:/g, '')}00`
    : `${event.eventDate.replace(/-/g, '')}T220000`

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChefFlow//V1//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.id}@chefflow.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `SEQUENCE:${sequence}`,
  ]

  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`)

  const descParts = [
    event.description || '',
    event.guestCount ? `Guests: ${event.guestCount}` : '',
    'Managed by ChefFlow',
  ].filter(Boolean)
  lines.push(`DESCRIPTION:${escapeICS(descParts.join('\\n'))}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

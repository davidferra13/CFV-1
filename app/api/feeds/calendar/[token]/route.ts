import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { dateToDateString } from '@/lib/utils/format'

// Public iCal feed endpoint - no auth required.
// URL: /api/feeds/calendar/{ical_feed_token}
// Returns: .ics file with all upcoming events for the chef.
// Compatible with Apple Calendar, Outlook, Google Calendar (subscribe by URL).

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid feed token' }, { status: 400 })
  }

  // Rate limit: 60 requests per minute per token (calendar apps poll periodically)
  try {
    await checkRateLimit(`ical-feed:${token}`, 60, 60_000)
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const db = createServerClient({ admin: true })

  // Look up chef by feed token
  const { data: chef } = await (db
    .from('chefs')
    .select('id, business_name')
    .eq('ical_feed_token' as any, token)
    .eq('ical_feed_enabled' as any, true)
    .single() as any)

  if (!chef) {
    return NextResponse.json({ error: 'Feed not found or disabled' }, { status: 404 })
  }

  // Fetch events - include upcoming and recent past (30 days back)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await (db
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, departure_time, status, location_address, guest_count, site_notes, created_at, updated_at'
    )
    .eq('tenant_id', chef.id)
    .gte('event_date', thirtyDaysAgo.split('T')[0])
    .in('status', [
      'draft',
      'proposed',
      'accepted',
      'paid',
      'confirmed',
      'in_progress',
      'completed',
    ])
    .is('deleted_at', null)
    .order('event_date', { ascending: true })
    .limit(500) as any)

  const calName = chef.business_name || 'ChefFlow'
  const icsEvents = (events || []).map((event: any) => formatIcsEvent(event, chef.id))

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//ChefFlow//Calendar Feed//EN`,
    `X-WR-CALNAME:${escapeIcs(calName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...icsEvents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="chefflow-calendar.ics"',
      // SECURITY: 'private' prevents CDN/proxy caching of calendar data.
      // The feed URL contains a secret token - if leaked, only the browser
      // should cache the response, not shared intermediaries.
      'Cache-Control': 'private, max-age=300',
    },
  })
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function normalizeTimeTo24h(timeStr: string): string | null {
  // Handle "18:00:00" or "18:00" (24h with optional seconds)
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (match24) {
    const h = parseInt(match24[1])
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${match24[2]}`
  }
  // Handle "7:00 PM" or "07:00 AM" (12h with AM/PM)
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let h = parseInt(match12[1])
    const m = match12[2]
    const period = match12[3].toUpperCase()
    if (period === 'PM' && h !== 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}`
  }
  return null
}

function formatIcsDate(dateStr: string, timeStr?: string | null): string {
  // dateStr: "2026-03-15", timeStr: "18:00" / "18:00:00" / "7:00 PM" / null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return ''
  const [year, month, day] = dateStr.split('-')
  if (timeStr) {
    const normalized = normalizeTimeTo24h(timeStr)
    if (!normalized) return `${year}${month}${day}`
    const [hour, minute] = normalized.split(':')
    return `${year}${month}${day}T${hour}${minute}00`
  }
  return `${year}${month}${day}`
}

function formatIcsTimestamp(isoStr: string): string {
  return isoStr.replace(/[-:]/g, '').replace(/\.\d+/, '').replace('Z', '') + 'Z'
}

function formatIcsEvent(
  event: {
    id: string
    occasion: string | null
    event_date: string
    serve_time: string | null
    departure_time: string | null
    status: string
    location_address: string | null
    guest_count: number | null
    site_notes: string | null
    created_at: string | null
    updated_at: string | null
  },
  chefId: string
): string {
  const uid = `${event.id}@cheflowhq.com`
  const summary = event.occasion || 'Private Chef Event'

  const statusLabels: Record<string, string> = {
    draft: 'TENTATIVE',
    proposed: 'TENTATIVE',
    accepted: 'CONFIRMED',
    paid: 'CONFIRMED',
    confirmed: 'CONFIRMED',
    in_progress: 'CONFIRMED',
    completed: 'CONFIRMED',
    cancelled: 'CANCELLED',
  }

  const eventDateStr = dateToDateString(event.event_date as Date | string)
  const dtStart = formatIcsDate(eventDateStr, event.serve_time)
  const dtEnd = event.departure_time
    ? formatIcsDate(eventDateStr, event.departure_time)
    : event.serve_time
      ? (() => {
          const normalized = normalizeTimeTo24h(event.serve_time!)
          if (!normalized) return null
          const [hStr, mStr] = normalized.split(':')
          const endHour = Math.min(parseInt(hStr) + 3, 23)
          return formatIcsDate(eventDateStr, `${endHour}:${mStr}`)
        })()
      : null

  const isAllDay = !event.serve_time

  // RFC 5545: SEQUENCE increments on reschedule. Derive from whether event was modified.
  const wasModified = event.updated_at && event.created_at && event.updated_at !== event.created_at
  const sequence = wasModified ? 1 : 0

  const descParts: string[] = []
  if (event.guest_count) descParts.push(`Guests: ${event.guest_count}`)
  if (event.status) descParts.push(`Status: ${event.status}`)
  if (event.site_notes) descParts.push(event.site_notes)

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsTimestamp(new Date().toISOString())}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
  ]

  if (dtEnd && !isAllDay) {
    lines.push(`DTEND:${dtEnd}`)
  }

  lines.push(`SUMMARY:${escapeIcs(summary)}`)
  lines.push(`SEQUENCE:${sequence}`)

  if (event.updated_at) {
    lines.push(`LAST-MODIFIED:${formatIcsTimestamp(new Date(event.updated_at).toISOString())}`)
  }

  if (event.location_address) {
    lines.push(`LOCATION:${escapeIcs(event.location_address)}`)
  }

  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcs(descParts.join('\\n'))}`)
  }

  lines.push(`STATUS:${statusLabels[event.status] || 'TENTATIVE'}`)
  lines.push('END:VEVENT')

  return lines.join('\r\n')
}

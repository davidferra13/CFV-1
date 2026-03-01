import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Public iCal feed endpoint — no auth required.
// URL: /api/feeds/calendar/{ical_feed_token}
// Returns: .ics file with all upcoming events for the chef.
// Compatible with Apple Calendar, Outlook, Google Calendar (subscribe by URL).

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid feed token' }, { status: 400 })
  }

  const supabase = createServerClient({ admin: true })

  // Look up chef by feed token
  const { data: chef } = await (supabase
    .from('chefs')
    .select('id, business_name')
    .eq('ical_feed_token' as any, token)
    .eq('ical_feed_enabled' as any, true)
    .single() as any)

  if (!chef) {
    return NextResponse.json({ error: 'Feed not found or disabled' }, { status: 404 })
  }

  // Fetch events — include upcoming and recent past (30 days back)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await (supabase
    .from('events')
    .select('id, occasion, event_date, start_time, end_time, status, location, guest_count, notes')
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
      // The feed URL contains a secret token — if leaked, only the browser
      // should cache the response, not shared intermediaries.
      'Cache-Control': 'private, max-age=300',
    },
  })
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function formatIcsDate(dateStr: string, timeStr?: string | null): string {
  // dateStr: "2026-03-15", timeStr: "18:00" or null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return ''
  const [year, month, day] = dateStr.split('-')
  if (timeStr) {
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return `${year}${month}${day}`
    const [hour, minute] = timeStr.split(':')
    return `${year}${month}${day}T${hour.padStart(2, '0')}${minute}00`
  }
  return `${year}${month}${day}`
}

function formatIcsEvent(
  event: {
    id: string
    occasion: string | null
    event_date: string
    start_time: string | null
    end_time: string | null
    status: string
    location: string | null
    guest_count: number | null
    notes: string | null
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

  const dtStart = formatIcsDate(event.event_date, event.start_time)
  const dtEnd = event.end_time
    ? formatIcsDate(event.event_date, event.end_time)
    : event.start_time
      ? (() => {
          const startHour = parseInt(event.start_time.split(':')[0])
          const endHour = Math.min(startHour + 3, 23) // Cap at 23:xx to avoid invalid iCal time
          return formatIcsDate(event.event_date, `${endHour}:${event.start_time.split(':')[1]}`)
        })()
      : null

  const isAllDay = !event.start_time

  const descParts: string[] = []
  if (event.guest_count) descParts.push(`Guests: ${event.guest_count}`)
  if (event.status) descParts.push(`Status: ${event.status}`)
  if (event.notes) descParts.push(event.notes)

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
  ]

  if (dtEnd && !isAllDay) {
    lines.push(`DTEND:${dtEnd}`)
  }

  lines.push(`SUMMARY:${escapeIcs(summary)}`)

  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`)
  }

  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcs(descParts.join('\\n'))}`)
  }

  lines.push(`STATUS:${statusLabels[event.status] || 'TENTATIVE'}`)
  lines.push('END:VEVENT')

  return lines.join('\r\n')
}

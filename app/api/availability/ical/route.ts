// iCal Export for Chef Availability
// Generates a standard .ics file containing blocked dates and confirmed events.
// Auth via HMAC token in query string (allows external calendar subscription).

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@/lib/db/server'

function generateToken(chefId: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  return crypto.createHmac('sha256', secret).update(chefId).digest('hex').slice(0, 32)
}

function formatDateIcal(dateStr: string): string {
  // Convert "2026-05-10" to "20260510"
  return dateStr.replace(/-/g, '')
}

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function escapeIcalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token || !token.includes('.')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const [chefId, hmac] = token.split('.', 2)
  if (!chefId || !hmac) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Validate HMAC
  const expectedHmac = generateToken(chefId)
  if (hmac !== expectedHmac) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Verify chef exists
  const db: any = createServerClient()
  const { data: chef } = await db
    .from('chefs')
    .select('id, business_name')
    .eq('id', chefId)
    .maybeSingle()

  if (!chef) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Date range: past 30 days to next 365 days
  const now = new Date()
  const past30 = new Date(now)
  past30.setDate(past30.getDate() - 30)
  const future365 = new Date(now)
  future365.setDate(future365.getDate() + 365)

  const startDate = `${past30.getFullYear()}-${String(past30.getMonth() + 1).padStart(2, '0')}-${String(past30.getDate()).padStart(2, '0')}`
  const endDate = `${future365.getFullYear()}-${String(future365.getMonth() + 1).padStart(2, '0')}-${String(future365.getDate()).padStart(2, '0')}`

  // Fetch blocks and events in parallel
  const [blocksResult, eventsResult] = await Promise.all([
    db
      .from('chef_availability_blocks')
      .select('id, block_date, block_type, reason, is_event_auto')
      .eq('chef_id', chefId)
      .gte('block_date', startDate)
      .lte('block_date', endDate),
    db
      .from('events')
      .select('id, event_date, occasion, status')
      .eq('tenant_id', chefId)
      .in('status', ['confirmed', 'paid', 'in_progress'])
      .gte('event_date', startDate)
      .lte('event_date', endDate),
  ])

  const blocks: any[] = blocksResult.data ?? []
  const events: any[] = eventsResult.data ?? []

  // Build VEVENT entries
  const vevents: string[] = []

  for (const block of blocks) {
    const dtstart = formatDateIcal(block.block_date)
    const dtend = nextDay(block.block_date)
    let summary = 'Blocked'
    if (block.reason) {
      summary = `Blocked: ${block.reason}`
    }
    if (block.is_event_auto) {
      summary = 'Booked (event)'
    }

    vevents.push(
      [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:${escapeIcalText(summary)}`,
        `UID:block-${block.id}@chefflow`,
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n')
    )
  }

  for (const event of events) {
    const eventDate =
      typeof event.event_date === 'string' ? event.event_date.slice(0, 10) : event.event_date
    const dtstart = formatDateIcal(eventDate)
    const dtend = nextDay(eventDate)
    const occasion = event.occasion || 'Private Event'
    const statusLabel = event.status.charAt(0).toUpperCase() + event.status.slice(1)
    const summary = `${occasion} - ${statusLabel}`

    vevents.push(
      [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:${escapeIcalText(summary)}`,
        `UID:event-${event.id}@chefflow`,
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n')
    )
  }

  // Assemble calendar
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChefFlow//Availability//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ChefFlow Availability',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(calendar, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="chefflow-availability.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

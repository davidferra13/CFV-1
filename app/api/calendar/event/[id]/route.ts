// GET /api/calendar/event/[id]
// Returns an RFC 5545-compliant .ics file for a confirmed client event.
//
// Auth: requireClient() - client must own the event.
// Only events in [paid, confirmed, in_progress, completed] states are downloadable.
// The file is streamed as text/calendar so browsers / mobile OS handlers
// pick it up and offer to add it to Apple Calendar, Outlook, etc.

import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { generateICS } from '@/lib/scheduling/generate-ics'

const DOWNLOADABLE_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireClient()
    const supabase: any = createServerClient()
    const eventId = params.id

    // Fetch event - must belong to this client
    const { data: event } = await supabase
      .from('events')
      .select(
        'id, status, occasion, event_date, serve_time, location_address, location_city, location_state, guest_count, special_requests'
      )
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!DOWNLOADABLE_STATUSES.includes(event.status)) {
      return NextResponse.json(
        { error: 'Calendar export is only available for confirmed events' },
        { status: 400 }
      )
    }

    const locationParts = [
      event.location_address,
      event.location_city,
      event.location_state,
    ].filter(Boolean)
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined

    const icsString = generateICS({
      id: event.id,
      title: event.occasion || 'Private Chef Dinner',
      eventDate: event.event_date,
      startTime: event.serve_time ?? undefined,
      location,
      description: event.special_requests ?? undefined,
      guestCount: event.guest_count ?? undefined,
    })

    // Sanitize filename to prevent Content-Disposition header injection.
    // Strip control chars, quotes, backslashes, path separators, and non-ASCII.
    const safeOccasion = (event.occasion || 'event')
      .replace(/[^\w\s-]/g, '') // keep only word chars, spaces, hyphens
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 80) // cap length to prevent oversized headers
    const filename = `${safeOccasion || 'event'}.ics`

    return new NextResponse(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/calendar/event/[id]]', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

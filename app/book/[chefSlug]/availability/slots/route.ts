// Public Time Slots API - /book/[chefSlug]/availability/slots?date=YYYY-MM-DD&event_type_id=uuid
// Returns available time slots for a specific date and event type.
// No auth required.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@/lib/booking/availability-actions'

export async function GET(request: NextRequest, { params }: { params: { chefSlug: string } }) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const eventTypeId = searchParams.get('event_type_id')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date (expected YYYY-MM-DD)' }, { status: 400 })
  }

  if (!eventTypeId) {
    return NextResponse.json({ error: 'event_type_id is required' }, { status: 400 })
  }

  try {
    // Resolve slug to chef ID
    const supabase = createServerClient({ admin: true })
    const { data: chef } = await supabase
      .from('chefs')
      .select('id, booking_enabled')
      .eq('booking_slug', params.chefSlug)
      .single()

    if (!chef || !chef.booking_enabled) {
      return NextResponse.json({ error: 'Booking page not available' }, { status: 404 })
    }

    const slots = await getAvailableSlots(chef.id as string, date, eventTypeId)

    return NextResponse.json(slots, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error('[BookingSlots] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

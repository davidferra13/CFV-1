// Public Availability API — /book/[chefSlug]/availability?year=2026&month=3
// Returns date availability for the booking calendar. No auth required.
// Status: 'available' | 'blocked' | 'unavailable'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { chefSlug: string } }
) {
  const { searchParams } = request.nextUrl
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  try {
    const supabase = createServerClient({ admin: true })

    // Resolve slug → chef
    const { data: chef } = await (supabase as any)
      .from('chefs')
      .select('id, booking_enabled, booking_min_notice_days')
      .eq('booking_slug', params.chefSlug)
      .single()

    if (!chef || !chef.booking_enabled) {
      return NextResponse.json({ error: 'Booking page not available' }, { status: 404 })
    }

    const tenantId = chef.id as string
    const minNoticeDays = (chef.booking_min_notice_days as number) || 7

    // Date range for this month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Fetch confirmed/in_progress events (block those dates)
    const [eventsResult, blocksResult] = await Promise.all([
      (supabase as any)
        .from('events')
        .select('event_date')
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'in_progress', 'paid', 'accepted'])
        .gte('event_date', startDate)
        .lte('event_date', endDate + 'T23:59:59Z'),
      (supabase as any)
        .from('chef_availability_blocks')
        .select('block_date, block_type')
        .eq('chef_id', tenantId)
        .gte('block_date', startDate)
        .lte('block_date', endDate),
    ])

    const bookedDates = new Set(
      (eventsResult.data ?? []).map((e: any) => (e.event_date as string).slice(0, 10))
    )
    const manualBlocks = new Set(
      (blocksResult.data ?? []).map((b: any) => b.block_date as string)
    )

    // Build result map
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const cutoff = new Date(today)
    cutoff.setUTCDate(today.getUTCDate() + minNoticeDays)

    const availability: Record<string, 'available' | 'blocked' | 'unavailable'> = {}

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const date = new Date(dateStr + 'T12:00:00Z')

      if (date < cutoff) {
        // Too soon — not enough notice
        availability[dateStr] = 'unavailable'
      } else if (bookedDates.has(dateStr) || manualBlocks.has(dateStr)) {
        availability[dateStr] = 'blocked'
      } else {
        availability[dateStr] = 'available'
      }
    }

    return NextResponse.json({ availability }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    console.error('[BookingAvailability] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

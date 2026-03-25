// Public Availability API - /book/[chefSlug]/availability?year=2026&month=3
// Returns date availability for the booking calendar. No auth required.
// Status: 'available' | 'blocked' | 'unavailable'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest, { params }: { params: { chefSlug: string } }) {
  const { searchParams } = request.nextUrl
  const year = Number.parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const month = Number.parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10)
  const startDateParam = searchParams.get('start_date')
  const endDateParam = searchParams.get('end_date')

  const hasRange = Boolean(startDateParam && endDateParam)
  if (
    hasRange &&
    (!ISO_DATE.test(startDateParam as string) || !ISO_DATE.test(endDateParam as string))
  ) {
    return NextResponse.json(
      { error: 'Invalid start_date/end_date (expected YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  if (!hasRange && (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12)) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  try {
    const db = createServerClient({ admin: true })

    // Resolve slug -> chef
    const { data: chef } = await db
      .from('chefs')
      .select('id, booking_enabled, booking_min_notice_days')
      .eq('booking_slug', params.chefSlug)
      .single()

    if (!chef || !chef.booking_enabled) {
      return NextResponse.json({ error: 'Booking page not available' }, { status: 404 })
    }

    const tenantId = chef.id as string
    const minNoticeDays = (chef.booking_min_notice_days as number) || 7

    const startDate = hasRange
      ? (startDateParam as string)
      : `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = hasRange
      ? (endDateParam as string)
      : `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`

    const startValue = new Date(`${startDate}T00:00:00.000Z`)
    const endValue = new Date(`${endDate}T00:00:00.000Z`)
    if (
      Number.isNaN(startValue.getTime()) ||
      Number.isNaN(endValue.getTime()) ||
      endValue < startValue
    ) {
      return NextResponse.json({ error: 'Invalid availability date range' }, { status: 400 })
    }

    const daySpan =
      Math.floor((endValue.getTime() - startValue.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (daySpan > 180) {
      return NextResponse.json({ error: 'Date range too large (max 180 days)' }, { status: 400 })
    }

    // Fetch confirmed/in_progress events (block those dates)
    const [eventsResult, blocksResult] = await Promise.all([
      db
        .from('events')
        .select('event_date')
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'in_progress', 'paid', 'accepted'])
        .gte('event_date', startDate)
        .lte('event_date', `${endDate}T23:59:59Z`),
      db
        .from('chef_availability_blocks')
        .select('block_date, block_type')
        .eq('chef_id', tenantId)
        .gte('block_date', startDate)
        .lte('block_date', endDate),
    ])

    const bookedDates = new Set(
      (eventsResult.data ?? []).map((e: any) => (e.event_date as string).slice(0, 10))
    )
    const manualBlocks = new Set((blocksResult.data ?? []).map((b: any) => b.block_date as string))

    // Build result map
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const cutoff = new Date(today)
    cutoff.setUTCDate(today.getUTCDate() + minNoticeDays)

    const availability: Record<string, 'available' | 'blocked' | 'unavailable'> = {}
    const conflictDetails: Record<string, string[]> = {}

    const cursor = new Date(startValue)
    while (cursor.getTime() <= endValue.getTime()) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const date = new Date(`${dateStr}T12:00:00Z`)

      if (date < cutoff) {
        availability[dateStr] = 'unavailable'
        conflictDetails[dateStr] = [
          `Minimum notice is ${minNoticeDays} day${minNoticeDays === 1 ? '' : 's'}`,
        ]
      } else if (bookedDates.has(dateStr) || manualBlocks.has(dateStr)) {
        availability[dateStr] = 'blocked'
        const reasons: string[] = []
        if (bookedDates.has(dateStr)) reasons.push('Existing confirmed event')
        if (manualBlocks.has(dateStr)) reasons.push('Chef blocked availability')
        conflictDetails[dateStr] = reasons
      } else {
        availability[dateStr] = 'available'
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return NextResponse.json(
      {
        availability,
        conflict_details: conflictDetails,
        start_date: startDate,
        end_date: endDate,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err) {
    console.error('[BookingAvailability] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

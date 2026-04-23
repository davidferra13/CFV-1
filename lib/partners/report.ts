// Partner Report Data Aggregation
// Assembles comprehensive data for partner monthly reports

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export type PartnerReportData = {
  partner: {
    id: string
    name: string
    partner_type: string
    contact_name: string | null
    email: string | null
  }
  period: {
    from: string
    to: string
    label: string
  }
  summary: {
    total_referrals: number
    events_completed: number
    guests_served: number
    revenue_cents: number
    conversion_rate: number
  }
  events: {
    id: string
    event_date: string
    occasion: string | null
    guest_count: number
    status: string
    quoted_price_cents: number | null
    location_name: string | null
  }[]
  location_breakdown: {
    location_id: string
    location_name: string
    inquiry_click_count: number
    booking_click_count: number
    referral_count: number
    event_count: number
    completed_event_count: number
    revenue_cents: number
  }[]
}

export async function getPartnerReportData(
  partnerId: string,
  month?: Date
): Promise<PartnerReportData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const targetMonth = month || new Date()
  const from = startOfMonth(targetMonth).toISOString()
  const to = endOfMonth(targetMonth).toISOString()

  // Get partner
  const { data: partner, error } = await db
    .from('referral_partners')
    .select('id, name, partner_type, contact_name, email')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !partner) return null

  // Get inquiries for this partner in the period
  const { data: inquiries } = await db
    .from('inquiries')
    .select('id, partner_location_id, status')
    .eq('tenant_id', user.tenantId!)
    .eq('referral_partner_id', partnerId)
    .gte('created_at', from)
    .lte('created_at', to)

  // Get events for this partner (all time, for comprehensive view)
  const { data: events } = await db
    .from('events')
    .select(
      'id, event_date, occasion, guest_count, status, quoted_price_cents, partner_location_id, location_address'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('referral_partner_id', partnerId)
    .gte('event_date', from)
    .lte('event_date', to)
    .order('event_date', { ascending: true })

  // Get partner locations for breakdown
  const { data: locations } = await db
    .from('partner_locations')
    .select('id, name')
    .eq('partner_id', partnerId)
    .eq('tenant_id', user.tenantId!)

  const locationMap: Record<string, string> = {}
  for (const loc of locations || []) {
    locationMap[loc.id] = loc.name
  }

  // Calculate summary
  const completedEvents = (events || []).filter((e: any) => e.status === 'completed')
  const totalReferrals = (inquiries || []).length
  const eventsCompleted = completedEvents.length
  const guestsServed = completedEvents.reduce((sum: any, e: any) => sum + (e.guest_count || 0), 0)
  const revenueCents = completedEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents || 0),
    0
  )
  const conversionRate =
    totalReferrals > 0 ? Math.round((eventsCompleted / totalReferrals) * 100) : 0

  // Location breakdown
  const locBreakdown: Record<
    string,
    {
      inquiry_click_count: number
      booking_click_count: number
      referral_count: number
      event_count: number
      completed_event_count: number
      revenue_cents: number
    }
  > = {}

  const ensureLocationBreakdown = (locationId: string) => {
    if (!locBreakdown[locationId]) {
      locBreakdown[locationId] = {
        inquiry_click_count: 0,
        booking_click_count: 0,
        referral_count: 0,
        event_count: 0,
        completed_event_count: 0,
        revenue_cents: 0,
      }
    }
    return locBreakdown[locationId]
  }

  for (const inq of inquiries || []) {
    if (inq.partner_location_id && locationMap[inq.partner_location_id]) {
      ensureLocationBreakdown(inq.partner_location_id).referral_count++
    }
  }
  for (const evt of events || []) {
    if (evt.partner_location_id && locationMap[evt.partner_location_id]) {
      const stats = ensureLocationBreakdown(evt.partner_location_id)
      stats.event_count++
      if (evt.status === 'completed') {
        stats.completed_event_count++
        stats.revenue_cents += evt.quoted_price_cents || 0
      }
    }
  }

  const locationIds = Object.keys(locationMap)
  if (locationIds.length > 0) {
    const observabilityDb: any = createServerClient({ admin: true })
    const { data: locationClicks } = await observabilityDb
      .from('platform_observability_events')
      .select('event_key, subject_id')
      .eq('tenant_id', user.tenantId!)
      .eq('subject_type', 'location')
      .in('subject_id', locationIds)
      .in('event_key', [
        'conversion.location_inquiry_link_clicked',
        'conversion.location_booking_link_clicked',
      ])
      .gte('occurred_at', from)
      .lte('occurred_at', to)

    for (const click of locationClicks || []) {
      if (!click.subject_id || !locationMap[click.subject_id]) continue
      const stats = ensureLocationBreakdown(click.subject_id)
      if (click.event_key === 'conversion.location_inquiry_link_clicked') {
        stats.inquiry_click_count++
      }
      if (click.event_key === 'conversion.location_booking_link_clicked') {
        stats.booking_click_count++
      }
    }
  }

  return {
    partner,
    period: {
      from,
      to,
      label: format(targetMonth, 'MMMM yyyy'),
    },
    summary: {
      total_referrals: totalReferrals,
      events_completed: eventsCompleted,
      guests_served: guestsServed,
      revenue_cents: revenueCents,
      conversion_rate: conversionRate,
    },
    events: (events || []).map((e: any) => ({
      id: e.id,
      event_date: e.event_date,
      occasion: e.occasion,
      guest_count: e.guest_count,
      status: e.status,
      quoted_price_cents: e.quoted_price_cents,
      location_name: e.partner_location_id ? locationMap[e.partner_location_id] || null : null,
    })),
    location_breakdown: Object.entries(locBreakdown).map(([id, stats]) => ({
      location_id: id,
      location_name: locationMap[id],
      ...stats,
    })),
  }
}

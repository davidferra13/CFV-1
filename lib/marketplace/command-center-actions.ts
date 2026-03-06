'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { MARKETPLACE_PLATFORMS, getMarketplacePlatform } from './platforms'

// All marketplace channel values for the DB query
const ALL_MARKETPLACE_CHANNELS = MARKETPLACE_PLATFORMS.map((p) => p.channel)

export type MarketplaceLead = {
  inquiryId: string
  clientName: string
  channel: string
  platformLabel: string
  status: string
  createdAt: string
  ageHours: number
  occasion: string | null
  date: string | null
  location: string | null
  guestCount: number | null
  nextActionRequired: string | null
  externalLink: string | null
  isStale: boolean
}

export type MarketplaceBooking = {
  eventId: string
  inquiryId: string | null
  clientName: string
  channel: string
  platformLabel: string
  eventDate: string
  status: string
  occasion: string | null
  quotedPriceCents: number | null
  externalLink: string | null
}

export type MarketplaceCommandCenterData = {
  summary: {
    totalLeads: number
    untouchedLeadCount: number
    staleLeadCount: number
    upcomingBookingCount: number
    platformBreakdown: { channel: string; label: string; count: number }[]
  }
  leads: MarketplaceLead[]
  upcomingBookings: MarketplaceBooking[]
}

/**
 * Fetches leads and bookings from ALL marketplace platforms.
 * Complements the TAC-specific command center with a cross-platform view.
 */
export async function getMarketplaceCommandCenter(): Promise<MarketplaceCommandCenterData> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch all marketplace inquiries that are active
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      `id, channel, status, created_at, confirmed_occasion, confirmed_date,
       confirmed_location, confirmed_guest_count, next_action_required,
       external_link, converted_to_event_id,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .in('channel', ALL_MARKETPLACE_CHANNELS)
    .in('status', ['new', 'awaiting_chef', 'awaiting_client', 'quoted', 'confirmed'])
    .order('created_at', { ascending: false })

  const allInquiries = inquiries ?? []

  // Build leads (new / awaiting_chef only)
  const leads: MarketplaceLead[] = allInquiries
    .filter((inq: any) => inq.status === 'new' || inq.status === 'awaiting_chef')
    .map((inq: any) => {
      const ageHours = Math.floor((now - new Date(inq.created_at).getTime()) / 3600000)
      const client = Array.isArray(inq.client) ? inq.client[0] : inq.client
      const platform = getMarketplacePlatform(inq.channel)
      return {
        inquiryId: inq.id,
        clientName: client?.full_name ?? 'Unknown',
        channel: inq.channel,
        platformLabel: platform?.label ?? inq.channel,
        status: inq.status,
        createdAt: inq.created_at,
        ageHours,
        occasion: inq.confirmed_occasion ?? null,
        date: inq.confirmed_date ?? null,
        location: inq.confirmed_location ?? null,
        guestCount: inq.confirmed_guest_count ?? null,
        nextActionRequired: inq.next_action_required ?? null,
        externalLink: inq.external_link ?? null,
        isStale: inq.status === 'new' && ageHours > 24,
      }
    })
    .sort((a: MarketplaceLead, b: MarketplaceLead) => b.ageHours - a.ageHours)

  // Fetch upcoming events linked to marketplace inquiries
  const linkedEventIds = allInquiries
    .map((inq: any) => inq.converted_to_event_id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

  let upcomingBookings: MarketplaceBooking[] = []

  if (linkedEventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select(
        'id, inquiry_id, event_date, status, occasion, quoted_price_cents, client:clients(full_name)'
      )
      .eq('tenant_id', tenantId)
      .in('id', linkedEventIds)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(20)

    const inquiryByEventId = new Map<string, any>()
    for (const inq of allInquiries) {
      if (inq.converted_to_event_id) inquiryByEventId.set(inq.converted_to_event_id, inq)
    }

    upcomingBookings = (events ?? []).map((event: any) => {
      const inquiry = inquiryByEventId.get(event.id)
      const client = Array.isArray(event.client) ? event.client[0] : event.client
      const platform = getMarketplacePlatform(inquiry?.channel)
      return {
        eventId: event.id,
        inquiryId: inquiry?.id ?? null,
        clientName: client?.full_name ?? 'Unknown',
        channel: inquiry?.channel ?? 'unknown',
        platformLabel: platform?.label ?? inquiry?.channel ?? 'Unknown',
        eventDate: event.event_date,
        status: event.status,
        occasion: event.occasion ?? null,
        quotedPriceCents: event.quoted_price_cents ?? null,
        externalLink: inquiry?.external_link ?? null,
      }
    })
  }

  // Platform breakdown
  const channelCounts = new Map<string, number>()
  for (const inq of allInquiries) {
    const ch = inq.channel as string
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1)
  }
  const platformBreakdown = Array.from(channelCounts.entries())
    .map(([channel, count]) => ({
      channel,
      label: getMarketplacePlatform(channel)?.label ?? channel,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    summary: {
      totalLeads: leads.length,
      untouchedLeadCount: leads.filter((l) => l.status === 'new').length,
      staleLeadCount: leads.filter((l) => l.isStale).length,
      upcomingBookingCount: upcomingBookings.length,
      platformBreakdown,
    },
    leads,
    upcomingBookings,
  }
}

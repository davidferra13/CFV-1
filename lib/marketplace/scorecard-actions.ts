'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { MARKETPLACE_PLATFORMS, getMarketplacePlatform } from './platforms'

const ALL_MARKETPLACE_CHANNELS = MARKETPLACE_PLATFORMS.map((p) => p.channel)

export type MarketplaceScorecard = {
  // Response speed
  medianResponseHours: number | null
  avgResponseHours: number | null
  respondedWithin24hPercent: number | null

  // Funnel conversion
  totalInquiries: number
  proposalSentCount: number
  proposalSentPercent: number | null
  bookedCount: number
  conversionPercent: number | null
  declinedCount: number

  // Financial
  grossBookedCents: number
  estimatedCommissionCents: number
  avgBookingCents: number | null

  // Direct conversion
  totalMarketplaceClients: number
  directConvertedClients: number
  directConversionPercent: number | null

  // Per-platform
  platformScores: {
    channel: string
    label: string
    inquiries: number
    booked: number
    conversionPercent: number | null
    medianResponseHours: number | null
    grossBookedCents: number
  }[]
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export async function getMarketplaceScorecard(): Promise<MarketplaceScorecard> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. All marketplace inquiries (all time, all statuses)
  const { data: inquiries } = await db
    .from('inquiries')
    .select(
      'id, channel, status, created_at, confirmed_budget_cents, converted_to_event_id, client_id'
    )
    .eq('tenant_id', tenantId)
    .in('channel', ALL_MARKETPLACE_CHANNELS)
    .order('created_at', { ascending: false })

  const allInquiries = inquiries ?? []
  const totalInquiries = allInquiries.length

  if (totalInquiries === 0) {
    return {
      medianResponseHours: null,
      avgResponseHours: null,
      respondedWithin24hPercent: null,
      totalInquiries: 0,
      proposalSentCount: 0,
      proposalSentPercent: null,
      bookedCount: 0,
      conversionPercent: null,
      declinedCount: 0,
      grossBookedCents: 0,
      estimatedCommissionCents: 0,
      avgBookingCents: null,
      totalMarketplaceClients: 0,
      directConvertedClients: 0,
      directConversionPercent: null,
      platformScores: [],
    }
  }

  // 2. Get first status transitions for all marketplace inquiries (response time)
  const inquiryIds = allInquiries.map((i: any) => i.id)

  // Fetch the first non-'new' transition for each inquiry
  const { data: transitions } = await db
    .from('inquiry_state_transitions')
    .select('inquiry_id, from_status, to_status, transitioned_at')
    .eq('tenant_id', tenantId)
    .in('inquiry_id', inquiryIds)
    .eq('from_status', 'new')
    .order('transitioned_at', { ascending: true })

  // Map inquiry_id -> first response time
  const firstResponseByInquiry = new Map<string, string>()
  for (const t of transitions ?? []) {
    if (!firstResponseByInquiry.has(t.inquiry_id)) {
      firstResponseByInquiry.set(t.inquiry_id, t.transitioned_at)
    }
  }

  // Calculate response times in hours
  const responseTimes: number[] = []
  const responseTimesByChannel = new Map<string, number[]>()
  let respondedWithin24h = 0

  for (const inq of allInquiries) {
    const firstResponse = firstResponseByInquiry.get(inq.id)
    if (!firstResponse) continue

    const createdMs = new Date(inq.created_at).getTime()
    const respondedMs = new Date(firstResponse).getTime()
    const hours = (respondedMs - createdMs) / 3600000

    if (hours >= 0 && hours < 8760) {
      // ignore negative or > 1 year (bad data)
      responseTimes.push(hours)
      if (hours <= 24) respondedWithin24h++

      const ch = inq.channel as string
      if (!responseTimesByChannel.has(ch)) responseTimesByChannel.set(ch, [])
      responseTimesByChannel.get(ch)!.push(hours)
    }
  }

  const medianResponseHours = median(responseTimes)
  const avgResponseHours =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null
  const respondedWithin24hPercent =
    responseTimes.length > 0 ? Math.round((respondedWithin24h / responseTimes.length) * 100) : null

  // 3. Funnel metrics
  const quotedStatuses = new Set(['quoted', 'confirmed', 'declined'])
  const bookedStatuses = new Set(['confirmed'])

  const proposalSentCount = allInquiries.filter(
    (i: any) => quotedStatuses.has(i.status) || i.converted_to_event_id
  ).length
  const bookedCount = allInquiries.filter(
    (i: any) => bookedStatuses.has(i.status) || i.converted_to_event_id
  ).length
  const declinedCount = allInquiries.filter((i: any) => i.status === 'declined').length

  // 4. Financial (from linked events)
  const eventIds = allInquiries
    .map((i: any) => i.converted_to_event_id)
    .filter((id: unknown): id is string => typeof id === 'string')

  let grossBookedCents = 0
  const eventsByInquiryId = new Map<string, any>()

  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, inquiry_id, quoted_price_cents, status')
      .eq('tenant_id', tenantId)
      .in('id', eventIds)

    for (const event of events ?? []) {
      grossBookedCents += event.quoted_price_cents ?? 0
      if (event.inquiry_id) eventsByInquiryId.set(event.inquiry_id, event)
    }
  }

  // Estimate commission using platform default rates
  let estimatedCommissionCents = 0
  for (const inq of allInquiries) {
    const event = eventsByInquiryId.get(inq.id)
    if (!event?.quoted_price_cents) continue
    const platform = getMarketplacePlatform(inq.channel)
    const rate = (platform?.defaultCommissionPercent ?? 20) / 100
    estimatedCommissionCents += Math.round(event.quoted_price_cents * rate)
  }

  // 5. Direct conversion (clients who rebooked without marketplace)
  const marketplaceClientIds = new Set<string>()
  for (const inq of allInquiries) {
    if (inq.client_id) marketplaceClientIds.add(inq.client_id)
  }

  const marketplaceEventIdSet = new Set(eventIds)
  let directConvertedClients = 0

  if (marketplaceClientIds.size > 0) {
    const { data: allClientEvents } = await db
      .from('events')
      .select('id, client_id')
      .eq('tenant_id', tenantId)
      .in('client_id', Array.from(marketplaceClientIds))
      .in('status', ['completed', 'confirmed', 'in_progress', 'paid'])

    const clientsWithDirectBooking = new Set<string>()
    for (const event of allClientEvents ?? []) {
      if (!marketplaceEventIdSet.has(event.id) && event.client_id) {
        clientsWithDirectBooking.add(event.client_id)
      }
    }
    directConvertedClients = clientsWithDirectBooking.size
  }

  // 6. Per-platform breakdown
  const channelInquiries = new Map<string, any[]>()
  for (const inq of allInquiries) {
    const ch = inq.channel as string
    if (!channelInquiries.has(ch)) channelInquiries.set(ch, [])
    channelInquiries.get(ch)!.push(inq)
  }

  const platformScores = Array.from(channelInquiries.entries())
    .map(([channel, inqs]) => {
      const platform = getMarketplacePlatform(channel)
      const booked = inqs.filter(
        (i: any) => i.status === 'confirmed' || i.converted_to_event_id
      ).length
      const channelGross = inqs.reduce((sum: number, inq: any) => {
        const event = eventsByInquiryId.get(inq.id)
        return sum + (event?.quoted_price_cents ?? 0)
      }, 0)

      return {
        channel,
        label: platform?.label ?? channel,
        inquiries: inqs.length,
        booked,
        conversionPercent: inqs.length > 0 ? Math.round((booked / inqs.length) * 100) : null,
        medianResponseHours: median(responseTimesByChannel.get(channel) ?? []),
        grossBookedCents: channelGross,
      }
    })
    .sort((a, b) => b.inquiries - a.inquiries)

  return {
    medianResponseHours:
      medianResponseHours != null ? Math.round(medianResponseHours * 10) / 10 : null,
    avgResponseHours: avgResponseHours != null ? Math.round(avgResponseHours * 10) / 10 : null,
    respondedWithin24hPercent,
    totalInquiries,
    proposalSentCount,
    proposalSentPercent:
      totalInquiries > 0 ? Math.round((proposalSentCount / totalInquiries) * 100) : null,
    bookedCount,
    conversionPercent: totalInquiries > 0 ? Math.round((bookedCount / totalInquiries) * 100) : null,
    declinedCount,
    grossBookedCents,
    estimatedCommissionCents,
    avgBookingCents: bookedCount > 0 ? Math.round(grossBookedCents / bookedCount) : null,
    totalMarketplaceClients: marketplaceClientIds.size,
    directConvertedClients,
    directConversionPercent:
      marketplaceClientIds.size > 0
        ? Math.round((directConvertedClients / marketplaceClientIds.size) * 100)
        : null,
    platformScores,
  }
}

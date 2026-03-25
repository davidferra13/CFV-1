'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { MARKETPLACE_PLATFORMS, getMarketplacePlatform, isMarketplaceSource } from './platforms'

export type MarketplaceROISummary = {
  // How many clients originally came from marketplaces
  totalMarketplaceClients: number
  // How many of those clients have rebooked at least once (direct or via marketplace)
  clientsWhoRebooked: number
  // How many direct (non-marketplace) rebookings happened
  directRebookingCount: number
  // Total revenue from direct rebookings (no commission paid)
  directRebookingRevenueCents: number
  // Estimated commission saved on those direct rebookings
  estimatedCommissionSavedCents: number
  // Per-platform breakdown
  platformBreakdown: {
    channel: string
    label: string
    firstBookings: number
    directRebookings: number
    estimatedSavedCents: number
  }[]
}

/**
 * Calculate ROI from converting marketplace clients to direct bookings.
 * Compares: first event came from marketplace vs subsequent events were direct.
 */
export async function getMarketplaceROI(): Promise<MarketplaceROISummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const allChannels = MARKETPLACE_PLATFORMS.map((p) => p.channel)

  // 1. Find all clients who originally came from a marketplace
  //    (either client.referral_source or their first inquiry channel)
  const { data: marketplaceInquiries } = await db
    .from('inquiries')
    .select('id, client_id, channel, converted_to_event_id')
    .eq('tenant_id', tenantId)
    .in('channel', allChannels)

  if (!marketplaceInquiries || marketplaceInquiries.length === 0) {
    return {
      totalMarketplaceClients: 0,
      clientsWhoRebooked: 0,
      directRebookingCount: 0,
      directRebookingRevenueCents: 0,
      estimatedCommissionSavedCents: 0,
      platformBreakdown: [],
    }
  }

  // Map client_id to their marketplace origin channel
  const clientOrigin = new Map<string, string>()
  for (const inq of marketplaceInquiries) {
    if (!inq.client_id) continue
    // Keep the first marketplace channel we find for this client
    if (!clientOrigin.has(inq.client_id)) {
      clientOrigin.set(inq.client_id, inq.channel)
    }
  }

  const marketplaceClientIds = Array.from(clientOrigin.keys())
  if (marketplaceClientIds.length === 0) {
    return {
      totalMarketplaceClients: 0,
      clientsWhoRebooked: 0,
      directRebookingCount: 0,
      directRebookingRevenueCents: 0,
      estimatedCommissionSavedCents: 0,
      platformBreakdown: [],
    }
  }

  // 2. Find ALL events for these clients
  const { data: allEvents } = await db
    .from('events')
    .select('id, client_id, inquiry_id, event_date, status, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('client_id', marketplaceClientIds)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid'])
    .order('event_date', { ascending: true })

  if (!allEvents || allEvents.length === 0) {
    return {
      totalMarketplaceClients: marketplaceClientIds.length,
      clientsWhoRebooked: 0,
      directRebookingCount: 0,
      directRebookingRevenueCents: 0,
      estimatedCommissionSavedCents: 0,
      platformBreakdown: [],
    }
  }

  // 3. For each client, identify which events are marketplace vs direct
  const marketplaceEventIds = new Set(
    marketplaceInquiries.map((inq: any) => inq.converted_to_event_id).filter(Boolean)
  )

  // Group events by client
  const eventsByClient = new Map<string, typeof allEvents>()
  for (const event of allEvents) {
    if (!event.client_id) continue
    if (!eventsByClient.has(event.client_id)) eventsByClient.set(event.client_id, [])
    eventsByClient.get(event.client_id)!.push(event)
  }

  // 4. Calculate savings
  let directRebookingCount = 0
  let directRebookingRevenueCents = 0
  let clientsWhoRebooked = 0

  const platformStats = new Map<
    string,
    { firstBookings: number; directRebookings: number; savedCents: number }
  >()

  for (const [clientId, events] of eventsByClient) {
    const originChannel = clientOrigin.get(clientId)!
    const platform = getMarketplacePlatform(originChannel)
    const commissionRate = (platform?.defaultCommissionPercent ?? 20) / 100

    if (!platformStats.has(originChannel)) {
      platformStats.set(originChannel, { firstBookings: 0, directRebookings: 0, savedCents: 0 })
    }
    const stats = platformStats.get(originChannel)!

    let hasDirectRebooking = false
    let isFirst = true

    for (const event of events) {
      const isMarketplaceEvent = marketplaceEventIds.has(event.id)

      if (isFirst) {
        stats.firstBookings++
        isFirst = false
        continue
      }

      // This is a subsequent event (rebooking)
      if (!isMarketplaceEvent) {
        // Direct rebooking: no marketplace commission
        directRebookingCount++
        const revenue = event.quoted_price_cents ?? 0
        directRebookingRevenueCents += revenue
        const saved = Math.round(revenue * commissionRate)
        stats.directRebookings++
        stats.savedCents += saved
        hasDirectRebooking = true
      }
    }

    if (hasDirectRebooking) clientsWhoRebooked++
  }

  const estimatedCommissionSavedCents = Array.from(platformStats.values()).reduce(
    (sum, s) => sum + s.savedCents,
    0
  )

  const platformBreakdown = Array.from(platformStats.entries())
    .map(([channel, stats]) => ({
      channel,
      label: getMarketplacePlatform(channel)?.label ?? channel,
      firstBookings: stats.firstBookings,
      directRebookings: stats.directRebookings,
      estimatedSavedCents: stats.savedCents,
    }))
    .sort((a, b) => b.estimatedSavedCents - a.estimatedSavedCents)

  return {
    totalMarketplaceClients: marketplaceClientIds.length,
    clientsWhoRebooked,
    directRebookingCount,
    directRebookingRevenueCents,
    estimatedCommissionSavedCents,
    platformBreakdown,
  }
}

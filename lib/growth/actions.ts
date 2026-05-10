// Growth Metrics Server Actions
// Unified data layer for marketing, reviews, and reputation growth loop.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { subDays, format, startOfMonth, subMonths } from 'date-fns'

// ============================================
// 1. GROWTH DASHBOARD (aggregate snapshot)
// ============================================

export type GrowthDashboard = {
  totalClients: number
  newClientsLast30Days: number
  repeatBookingRate: number
  avgReviewRating: number
  reviewResponseRate: number
  referralPercentage: number
  totalCampaignsSent: number
  campaignReachLast30Days: number
}

export async function getGrowthDashboard(): Promise<GrowthDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  try {
    // Fetch clients, events, reviews, campaigns in parallel
    const [clientsRes, eventsRes, reviewsRes, campaignsRes, recentCampaignsRes] = await Promise.all(
      [
        db.from('clients').select('id, referral_source, created_at').eq('tenant_id', tid),
        db.from('events').select('id, client_id, status').eq('tenant_id', tid),
        db.from('client_reviews').select('id, rating, event_id').eq('tenant_id', tid),
        db
          .from('campaigns')
          .select('id, recipient_count, status')
          .eq('tenant_id', tid)
          .in('status', ['sent', 'completed']),
        db
          .from('campaigns')
          .select('id, recipient_count')
          .eq('tenant_id', tid)
          .in('status', ['sent', 'completed'])
          .gte('sent_at', thirtyDaysAgo),
      ]
    )

    const clients = clientsRes.data ?? []
    const events = eventsRes.data ?? []
    const reviews = reviewsRes.data ?? []
    const campaigns = campaignsRes.data ?? []
    const recentCampaigns = recentCampaignsRes.data ?? []

    const totalClients = clients.length

    // New clients in last 30 days
    const newClientsLast30Days = clients.filter(
      (c: any) => c.created_at && new Date(c.created_at) >= new Date(thirtyDaysAgo)
    ).length

    // Repeat booking rate: clients with 2+ events
    const clientEventCounts = new Map<string, number>()
    for (const e of events) {
      if (e.client_id) {
        clientEventCounts.set(e.client_id, (clientEventCounts.get(e.client_id) ?? 0) + 1)
      }
    }
    const clientsWithEvents = clientEventCounts.size
    const repeatClients = Array.from(clientEventCounts.values()).filter(
      (count) => count >= 2
    ).length
    const repeatBookingRate = clientsWithEvents > 0 ? (repeatClients / clientsWithEvents) * 100 : 0

    // Average review rating
    const ratingsWithValues = reviews.filter((r: any) => r.rating != null)
    const avgReviewRating =
      ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum: number, r: any) => sum + r.rating, 0) /
          ratingsWithValues.length
        : 0

    // Review response rate: reviews / completed events
    const completedEvents = events.filter((e: any) => e.status === 'completed')
    const reviewResponseRate =
      completedEvents.length > 0 ? (reviews.length / completedEvents.length) * 100 : 0

    // Referral percentage
    const referralClients = clients.filter(
      (c: any) => c.referral_source && c.referral_source !== 'none' && c.referral_source !== ''
    ).length
    const referralPercentage = totalClients > 0 ? (referralClients / totalClients) * 100 : 0

    // Campaign metrics
    const totalCampaignsSent = campaigns.length
    const campaignReachLast30Days = recentCampaigns.reduce(
      (sum: number, c: any) => sum + (c.recipient_count ?? 0),
      0
    )

    return {
      totalClients,
      newClientsLast30Days,
      repeatBookingRate: Math.round(repeatBookingRate * 10) / 10,
      avgReviewRating: Math.round(avgReviewRating * 10) / 10,
      reviewResponseRate: Math.round(reviewResponseRate * 10) / 10,
      referralPercentage: Math.round(referralPercentage * 10) / 10,
      totalCampaignsSent,
      campaignReachLast30Days,
    }
  } catch (error) {
    console.error('[getGrowthDashboard] Error:', error)
    return {
      totalClients: 0,
      newClientsLast30Days: 0,
      repeatBookingRate: 0,
      avgReviewRating: 0,
      reviewResponseRate: 0,
      referralPercentage: 0,
      totalCampaignsSent: 0,
      campaignReachLast30Days: 0,
    }
  }
}

// ============================================
// 2. CLIENT ACQUISITION BY CHANNEL
// ============================================

export type ChannelAcquisition = {
  source: string
  clientCount: number
  eventCount: number
  totalRevenueCents: number
}

export async function getClientAcquisitionByChannel(): Promise<ChannelAcquisition[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!

  try {
    const [clientsRes, eventsRes, ledgerRes] = await Promise.all([
      db.from('clients').select('id, referral_source').eq('tenant_id', tid),
      db.from('events').select('id, client_id').eq('tenant_id', tid),
      // Revenue per event from ledger. entry_type filter excludes refunds/tips for clean revenue.
      db
        .from('ledger_entries')
        .select('event_id, amount_cents, entry_type, is_refund')
        .eq('tenant_id', tid)
        .eq('is_refund', false)
        .not('entry_type', 'eq', 'tip'),
    ])

    const clients = clientsRes.data ?? []
    const events = eventsRes.data ?? []
    const ledgerEntries = ledgerRes.data ?? []

    // Map client_id -> referral_source
    const clientSourceMap = new Map<string, string>()
    for (const c of clients) {
      clientSourceMap.set(c.id, c.referral_source || 'unknown')
    }

    // Map client_id -> event count
    const clientEventCount = new Map<string, number>()
    const clientEventIds = new Map<string, string[]>()
    for (const e of events) {
      if (e.client_id) {
        clientEventCount.set(e.client_id, (clientEventCount.get(e.client_id) ?? 0) + 1)
        const ids = clientEventIds.get(e.client_id) ?? []
        ids.push(e.id)
        clientEventIds.set(e.client_id, ids)
      }
    }

    // Map event_id -> revenue cents
    const eventRevenue = new Map<string, number>()
    for (const le of ledgerEntries) {
      if (le.event_id) {
        eventRevenue.set(le.event_id, (eventRevenue.get(le.event_id) ?? 0) + le.amount_cents)
      }
    }

    // Group by source
    const sourceMap = new Map<
      string,
      { clientCount: number; eventCount: number; revenueCents: number }
    >()
    for (const c of clients) {
      const source = c.referral_source || 'unknown'
      const entry = sourceMap.get(source) ?? { clientCount: 0, eventCount: 0, revenueCents: 0 }
      entry.clientCount += 1
      entry.eventCount += clientEventCount.get(c.id) ?? 0

      // Sum revenue for all events of this client
      const eids = clientEventIds.get(c.id) ?? []
      for (const eid of eids) {
        entry.revenueCents += eventRevenue.get(eid) ?? 0
      }

      sourceMap.set(source, entry)
    }

    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        clientCount: data.clientCount,
        eventCount: data.eventCount,
        totalRevenueCents: data.revenueCents,
      }))
      .sort((a, b) => b.clientCount - a.clientCount)
  } catch (error) {
    console.error('[getClientAcquisitionByChannel] Error:', error)
    return []
  }
}

// ============================================
// 3. REVIEW IMPACT METRICS
// ============================================

export type ReviewImpactMetrics = {
  reviewedEventsCount: number
  unreviewedEventsCount: number
  rebookRateReviewed: number
  rebookRateUnreviewed: number
  avgRatingRebookers: number
}

export async function getReviewImpactMetrics(): Promise<ReviewImpactMetrics> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!

  try {
    const [eventsRes, reviewsRes] = await Promise.all([
      db.from('events').select('id, client_id, status').eq('tenant_id', tid),
      db.from('client_reviews').select('id, event_id, rating').eq('tenant_id', tid),
    ])

    const events = eventsRes.data ?? []
    const reviews = reviewsRes.data ?? []

    const completedEvents = events.filter((e: any) => e.status === 'completed')
    const reviewedEventIds = new Set(reviews.map((r: any) => r.event_id))

    // Split completed events into reviewed vs not
    const reviewedEvents = completedEvents.filter((e: any) => reviewedEventIds.has(e.id))
    const unreviewedEvents = completedEvents.filter((e: any) => !reviewedEventIds.has(e.id))

    // Find clients with 2+ events (rebookers)
    const clientEventCounts = new Map<string, number>()
    for (const e of events) {
      if (e.client_id) {
        clientEventCounts.set(e.client_id, (clientEventCounts.get(e.client_id) ?? 0) + 1)
      }
    }
    const rebookerIds = new Set(
      Array.from(clientEventCounts.entries())
        .filter(([, count]) => count >= 2)
        .map(([id]) => id)
    )

    // Clients who left reviews on completed events
    const reviewedClientIds = new Set(reviewedEvents.map((e: any) => e.client_id).filter(Boolean))
    // Clients with completed events but no review
    const unreviewedClientIds = new Set(
      unreviewedEvents.map((e: any) => e.client_id).filter(Boolean)
    )

    // Rebook rate for each group
    const reviewedRebookers = Array.from(reviewedClientIds).filter((id) =>
      rebookerIds.has(id as string)
    ).length
    const unreviewedRebookers = Array.from(unreviewedClientIds).filter((id) =>
      rebookerIds.has(id as string)
    ).length

    const rebookRateReviewed =
      reviewedClientIds.size > 0 ? (reviewedRebookers / reviewedClientIds.size) * 100 : 0
    const rebookRateUnreviewed =
      unreviewedClientIds.size > 0 ? (unreviewedRebookers / unreviewedClientIds.size) * 100 : 0

    // Average rating from rebookers
    const rebookerReviews = reviews.filter((r: any) => {
      const event = completedEvents.find((e: any) => e.id === r.event_id)
      return event && rebookerIds.has(event.client_id) && r.rating != null
    })
    const avgRatingRebookers =
      rebookerReviews.length > 0
        ? rebookerReviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
          rebookerReviews.length
        : 0

    return {
      reviewedEventsCount: reviewedEvents.length,
      unreviewedEventsCount: unreviewedEvents.length,
      rebookRateReviewed: Math.round(rebookRateReviewed * 10) / 10,
      rebookRateUnreviewed: Math.round(rebookRateUnreviewed * 10) / 10,
      avgRatingRebookers: Math.round(avgRatingRebookers * 10) / 10,
    }
  } catch (error) {
    console.error('[getReviewImpactMetrics] Error:', error)
    return {
      reviewedEventsCount: 0,
      unreviewedEventsCount: 0,
      rebookRateReviewed: 0,
      rebookRateUnreviewed: 0,
      avgRatingRebookers: 0,
    }
  }
}

// ============================================
// 4. MONTHLY GROWTH TREND
// ============================================

export type MonthlyGrowthTrend = {
  month: string
  newClients: number
  completedEvents: number
  reviewsReceived: number
  avgRating: number | null
}

export async function getMonthlyGrowthTrend(months: number = 12): Promise<MonthlyGrowthTrend[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!

  try {
    const cutoff = startOfMonth(subMonths(new Date(), months)).toISOString()

    const [clientsRes, eventsRes, reviewsRes] = await Promise.all([
      db.from('clients').select('id, created_at').eq('tenant_id', tid).gte('created_at', cutoff),
      db
        .from('events')
        .select('id, event_date, status')
        .eq('tenant_id', tid)
        .eq('status', 'completed')
        .gte('event_date', cutoff),
      db
        .from('client_reviews')
        .select('id, rating, created_at')
        .eq('tenant_id', tid)
        .gte('created_at', cutoff),
    ])

    const clients = clientsRes.data ?? []
    const events = eventsRes.data ?? []
    const reviews = reviewsRes.data ?? []

    // Build month buckets
    const buckets = new Map<
      string,
      { newClients: number; completedEvents: number; ratings: number[] }
    >()

    for (let i = 0; i < months; i++) {
      const monthKey = format(subMonths(new Date(), i), 'yyyy-MM')
      buckets.set(monthKey, { newClients: 0, completedEvents: 0, ratings: [] })
    }

    for (const c of clients) {
      if (c.created_at) {
        const key = format(new Date(c.created_at), 'yyyy-MM')
        const bucket = buckets.get(key)
        if (bucket) bucket.newClients += 1
      }
    }

    for (const e of events) {
      if (e.event_date) {
        const key = format(new Date(e.event_date), 'yyyy-MM')
        const bucket = buckets.get(key)
        if (bucket) bucket.completedEvents += 1
      }
    }

    for (const r of reviews) {
      if (r.created_at) {
        const key = format(new Date(r.created_at), 'yyyy-MM')
        const bucket = buckets.get(key)
        if (bucket) {
          if (r.rating != null) bucket.ratings.push(r.rating)
          else bucket.ratings.push(-1) // placeholder to count reviews without rating
        }
      }
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const validRatings = data.ratings.filter((r) => r > 0)
        return {
          month,
          newClients: data.newClients,
          completedEvents: data.completedEvents,
          reviewsReceived: data.ratings.length,
          avgRating:
            validRatings.length > 0
              ? Math.round((validRatings.reduce((s, r) => s + r, 0) / validRatings.length) * 10) /
                10
              : null,
        }
      })
  } catch (error) {
    console.error('[getMonthlyGrowthTrend] Error:', error)
    return []
  }
}

// ============================================
// 5. GROWTH LOOP HEALTH
// ============================================

export type GrowthLoopHealth = {
  completedEventsLast90Days: number
  reviewsCollectedLast90Days: number
  reviewCollectionRate: number
  testimonialApprovalRate: number
  campaignsSentLast90Days: number
  avgCampaignOpenRate: number | null
  loopScore: number
}

export async function getGrowthLoopHealth(): Promise<GrowthLoopHealth> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!
  const ninetyDaysAgo = subDays(new Date(), 90).toISOString()

  try {
    const [eventsRes, reviewsRes, testimonialsRes, campaignsRes] = await Promise.all([
      db
        .from('events')
        .select('id')
        .eq('tenant_id', tid)
        .eq('status', 'completed')
        .gte('event_date', ninetyDaysAgo),
      db.from('client_reviews').select('id').eq('tenant_id', tid).gte('created_at', ninetyDaysAgo),
      db.from('testimonials').select('id, is_approved').eq('tenant_id', tid),
      db
        .from('campaigns')
        .select('id, sent_count, open_count')
        .eq('tenant_id', tid)
        .in('status', ['sent', 'completed'])
        .gte('sent_at', ninetyDaysAgo),
    ])

    const completedEvents = eventsRes.data ?? []
    const reviews = reviewsRes.data ?? []
    const testimonials = testimonialsRes.data ?? []
    const campaigns = campaignsRes.data ?? []

    const completedEventsLast90Days = completedEvents.length
    const reviewsCollectedLast90Days = reviews.length

    const reviewCollectionRate =
      completedEventsLast90Days > 0
        ? (reviewsCollectedLast90Days / completedEventsLast90Days) * 100
        : 0

    // Testimonial approval rate (all-time, since testimonials are curated)
    const approvedTestimonials = testimonials.filter((t: any) => t.is_approved).length
    const testimonialApprovalRate =
      testimonials.length > 0 ? (approvedTestimonials / testimonials.length) * 100 : 0

    const campaignsSentLast90Days = campaigns.length

    // Average campaign open rate from sent_count and open_count
    let avgCampaignOpenRate: number | null = null
    const campaignsWithData = campaigns.filter((c: any) => c.sent_count && c.sent_count > 0)
    if (campaignsWithData.length > 0) {
      const totalOpenRate = campaignsWithData.reduce((sum: number, c: any) => {
        return sum + (c.open_count ?? 0) / c.sent_count
      }, 0)
      avgCampaignOpenRate = Math.round((totalOpenRate / campaignsWithData.length) * 1000) / 10
    }

    // Loop score: composite 0-100 health metric
    // Weighted: review collection (40%), testimonial curation (20%),
    // campaign activity (20%), open rate quality (20%)
    const reviewScore = Math.min(reviewCollectionRate, 100) * 0.4
    const testimonialScore = Math.min(testimonialApprovalRate, 100) * 0.2
    const campaignScore = Math.min(campaignsSentLast90Days * 10, 100) * 0.2
    const openRateScore = avgCampaignOpenRate != null ? Math.min(avgCampaignOpenRate, 100) * 0.2 : 0
    const loopScore = Math.round(reviewScore + testimonialScore + campaignScore + openRateScore)

    return {
      completedEventsLast90Days,
      reviewsCollectedLast90Days,
      reviewCollectionRate: Math.round(reviewCollectionRate * 10) / 10,
      testimonialApprovalRate: Math.round(testimonialApprovalRate * 10) / 10,
      campaignsSentLast90Days,
      avgCampaignOpenRate,
      loopScore,
    }
  } catch (error) {
    console.error('[getGrowthLoopHealth] Error:', error)
    return {
      completedEventsLast90Days: 0,
      reviewsCollectedLast90Days: 0,
      reviewCollectionRate: 0,
      testimonialApprovalRate: 0,
      campaignsSentLast90Days: 0,
      avgCampaignOpenRate: null,
      loopScore: 0,
    }
  }
}

// Referral Source Analytics Server Actions
// Queries for referral source funnel, client acquisition, top referrers, and time series

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { subMonths, format, startOfMonth } from 'date-fns'

// ============================================
// TYPES
// ============================================

export type ReferralSourceSummary = {
  source: string
  inquiryCount: number
  quoteCount: number
  acceptedCount: number
  completedCount: number
  totalRevenueCents: number
  avgEventValueCents: number
  conversionRate: number
}

export type ClientAcquisitionBySource = {
  source: string
  clientCount: number
  avgLifetimeValueCents: number
  totalLifetimeValueCents: number
}

export type TopReferrer = {
  name: string
  clientCount: number
  eventCount: number
  totalRevenueCents: number
}

export type ReferralTimeSeries = {
  month: string
  [source: string]: string | number
}

export type ReferralAnalyticsData = {
  funnel: {
    sources: ReferralSourceSummary[]
    totals: {
      totalInquiries: number
      totalCompleted: number
      overallConversionRate: number
      totalRevenueCents: number
    }
  }
  clientAcquisition: ClientAcquisitionBySource[]
  topReferrers: TopReferrer[]
  timeSeries: ReferralTimeSeries[]
  timeSeriesSources: string[]
}

// ============================================
// HELPERS
// ============================================

const CHANNEL_LABELS: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  referral: 'Referral',
  walk_in: 'Walk-In',
  instagram: 'Instagram',
  take_a_chef: 'Take a Chef',
  website: 'Website',
  wix: 'Wix',
  other: 'Other',
}

const REFERRAL_SOURCE_LABELS: Record<string, string> = {
  take_a_chef: 'Take a Chef',
  instagram: 'Instagram',
  referral: 'Referral',
  website: 'Website',
  phone: 'Phone',
  email: 'Email',
  other: 'Other',
}

/**
 * Build a unified source label: prefer referral_source text if present, else fall back to channel enum.
 */
function unifiedSourceLabel(channel: string | null, referralSource: string | null): string {
  if (referralSource) {
    return REFERRAL_SOURCE_LABELS[referralSource] || referralSource
  }
  if (channel) {
    return CHANNEL_LABELS[channel] || channel
  }
  return 'Unknown'
}

// ============================================
// 1. REFERRAL FUNNEL DATA
// ============================================

export async function getReferralFunnelData(): Promise<{
  sources: ReferralSourceSummary[]
  totals: {
    totalInquiries: number
    totalCompleted: number
    overallConversionRate: number
    totalRevenueCents: number
  }
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all inquiries with channel, referral_source, and status
  const { data: inquiries, error: inqError } = await supabase
    .from('inquiries')
    .select('id, channel, referral_source, status, converted_to_event_id')
    .eq('tenant_id', user.tenantId!)

  if (inqError) {
    console.error('[getReferralFunnelData] inquiries error:', inqError)
    return {
      sources: [],
      totals: {
        totalInquiries: 0,
        totalCompleted: 0,
        overallConversionRate: 0,
        totalRevenueCents: 0,
      },
    }
  }

  // Collect all event IDs from converted inquiries
  const eventIds = (inquiries || [])
    .map((i) => i.converted_to_event_id)
    .filter((id): id is string => id != null)

  // Fetch events for those IDs to determine stage progression and revenue
  let eventMap: Record<string, { status: string; quoted_price_cents: number | null }> = {}
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, status, quoted_price_cents')
      .eq('tenant_id', user.tenantId!)
      .in('id', eventIds)

    for (const evt of events || []) {
      eventMap[evt.id] = { status: evt.status, quoted_price_cents: evt.quoted_price_cents }
    }
  }

  // Group by unified source label
  const sourceData: Record<
    string,
    {
      inquiryCount: number
      quoteCount: number
      acceptedCount: number
      completedCount: number
      totalRevenueCents: number
    }
  > = {}

  for (const inq of inquiries || []) {
    const label = unifiedSourceLabel(inq.channel, inq.referral_source)
    if (!sourceData[label]) {
      sourceData[label] = {
        inquiryCount: 0,
        quoteCount: 0,
        acceptedCount: 0,
        completedCount: 0,
        totalRevenueCents: 0,
      }
    }
    sourceData[label].inquiryCount++

    // Check if inquiry reached quote stage
    if (inq.status === 'quoted' || inq.status === 'confirmed') {
      sourceData[label].quoteCount++
    }

    // Check event progression
    if (inq.converted_to_event_id && eventMap[inq.converted_to_event_id]) {
      const evt = eventMap[inq.converted_to_event_id]
      const acceptedStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']
      const completedStatuses = ['completed']

      if (acceptedStatuses.includes(evt.status)) {
        sourceData[label].acceptedCount++
      }
      if (completedStatuses.includes(evt.status)) {
        sourceData[label].completedCount++
        sourceData[label].totalRevenueCents += evt.quoted_price_cents || 0
      }
    }
  }

  const sources: ReferralSourceSummary[] = Object.entries(sourceData)
    .map(([source, data]) => ({
      source,
      inquiryCount: data.inquiryCount,
      quoteCount: data.quoteCount,
      acceptedCount: data.acceptedCount,
      completedCount: data.completedCount,
      totalRevenueCents: data.totalRevenueCents,
      avgEventValueCents:
        data.completedCount > 0 ? Math.round(data.totalRevenueCents / data.completedCount) : 0,
      conversionRate:
        data.inquiryCount > 0
          ? Math.round((data.completedCount / data.inquiryCount) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)

  const totalInquiries = sources.reduce((sum, s) => sum + s.inquiryCount, 0)
  const totalCompleted = sources.reduce((sum, s) => sum + s.completedCount, 0)
  const totalRevenueCents = sources.reduce((sum, s) => sum + s.totalRevenueCents, 0)

  return {
    sources,
    totals: {
      totalInquiries,
      totalCompleted,
      overallConversionRate:
        totalInquiries > 0 ? Math.round((totalCompleted / totalInquiries) * 1000) / 10 : 0,
      totalRevenueCents,
    },
  }
}

// ============================================
// 2. CLIENT ACQUISITION BY SOURCE
// ============================================

export async function getClientAcquisitionBySource(): Promise<ClientAcquisitionBySource[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('referral_source, lifetime_value_cents')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getClientAcquisitionBySource] error:', error)
    return []
  }

  const sourceData: Record<string, { clientCount: number; totalLTV: number }> = {}

  for (const client of clients || []) {
    const label = client.referral_source
      ? REFERRAL_SOURCE_LABELS[client.referral_source] || client.referral_source
      : 'Unknown'
    if (!sourceData[label]) {
      sourceData[label] = { clientCount: 0, totalLTV: 0 }
    }
    sourceData[label].clientCount++
    sourceData[label].totalLTV += client.lifetime_value_cents || 0
  }

  return Object.entries(sourceData)
    .map(([source, data]) => ({
      source,
      clientCount: data.clientCount,
      avgLifetimeValueCents:
        data.clientCount > 0 ? Math.round(data.totalLTV / data.clientCount) : 0,
      totalLifetimeValueCents: data.totalLTV,
    }))
    .sort((a, b) => b.totalLifetimeValueCents - a.totalLifetimeValueCents)
}

// ============================================
// 3. TOP REFERRERS (named referrers)
// ============================================

export async function getTopReferrers(): Promise<TopReferrer[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get clients who came via referral and have a named referrer
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, referral_source_detail')
    .eq('tenant_id', user.tenantId!)
    .eq('referral_source', 'referral')
    .not('referral_source_detail', 'is', null)

  if (error || !clients || clients.length === 0) {
    return []
  }

  // Group clients by referrer name
  const referrerClients: Record<string, string[]> = {}
  for (const client of clients) {
    const name = (client.referral_source_detail || '').trim()
    if (!name) continue
    if (!referrerClients[name]) referrerClients[name] = []
    referrerClients[name].push(client.id)
  }

  if (Object.keys(referrerClients).length === 0) return []

  // Get all client IDs to look up events
  const allClientIds = Object.values(referrerClients).flat()

  const { data: events } = await supabase
    .from('events')
    .select('client_id, status, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .in('client_id', allClientIds)

  // Build a map of client_id -> event stats
  const clientEventStats: Record<string, { eventCount: number; revenueCents: number }> = {}
  for (const evt of events || []) {
    if (!evt.client_id) continue
    if (!clientEventStats[evt.client_id]) {
      clientEventStats[evt.client_id] = { eventCount: 0, revenueCents: 0 }
    }
    clientEventStats[evt.client_id].eventCount++
    if (evt.status === 'completed') {
      clientEventStats[evt.client_id].revenueCents += evt.quoted_price_cents || 0
    }
  }

  return Object.entries(referrerClients)
    .map(([name, clientIds]) => {
      let eventCount = 0
      let totalRevenueCents = 0
      for (const cid of clientIds) {
        const stats = clientEventStats[cid]
        if (stats) {
          eventCount += stats.eventCount
          totalRevenueCents += stats.revenueCents
        }
      }
      return {
        name,
        clientCount: clientIds.length,
        eventCount,
        totalRevenueCents,
      }
    })
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
}

// ============================================
// 4. REFERRAL TIME SERIES
// ============================================

export async function getReferralTimeSeries(months = 12): Promise<{
  timeSeries: ReferralTimeSeries[]
  sources: string[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1)).toISOString()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('channel, referral_source, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)

  if (error) {
    console.error('[getReferralTimeSeries] error:', error)
    return { timeSeries: [], sources: [] }
  }

  // Initialize all months
  const monthData: Record<string, Record<string, number>> = {}
  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, months - 1 - i)
    const key = format(monthDate, 'MMM yyyy')
    monthData[key] = {}
  }

  // Count inquiries per month per unified source
  const allSources = new Set<string>()
  for (const inq of inquiries || []) {
    const key = format(new Date(inq.created_at), 'MMM yyyy')
    const label = unifiedSourceLabel(inq.channel, inq.referral_source)
    allSources.add(label)
    if (monthData[key]) {
      monthData[key][label] = (monthData[key][label] || 0) + 1
    }
  }

  const timeSeries: ReferralTimeSeries[] = Object.entries(monthData).map(([month, channels]) => ({
    month,
    ...channels,
  }))

  return {
    timeSeries,
    sources: Array.from(allSources).sort(),
  }
}

// ============================================
// 5. ORCHESTRATOR
// ============================================

export async function getReferralAnalytics(): Promise<ReferralAnalyticsData> {
  const [funnel, clientAcquisition, topReferrers, timeSeriesResult] = await Promise.all([
    getReferralFunnelData(),
    getClientAcquisitionBySource(),
    getTopReferrers(),
    getReferralTimeSeries(12),
  ])

  return {
    funnel,
    clientAcquisition,
    topReferrers,
    timeSeries: timeSeriesResult.timeSeries,
    timeSeriesSources: timeSeriesResult.sources,
  }
}

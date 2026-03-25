// Channel/Source Analytics Server Actions
// Tracks booking sources and analyzes which channels produce the most bookings
// Uses inquiries.channel (inquiry_channel enum) + events for conversion/revenue data

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getSourceLabel } from '@/lib/constants/booking-sources'
import { subMonths, format, startOfMonth } from 'date-fns'

// ============================================
// TYPES
// ============================================

export type ChannelSourceStats = {
  source: string
  sourceLabel: string
  inquiryCount: number
  bookedCount: number
  conversionRate: number
  totalRevenueCents: number
  avgRevenueCents: number
}

export type SourceOverTimeEntry = {
  month: string
  sources: Record<string, number>
}

export type ChannelAnalyticsData = {
  bySource: ChannelSourceStats[]
  topSources: string[]
  sourceOverTime: SourceOverTimeEntry[]
  totalInquiries: number
  totalBooked: number
  overallConversionRate: number
}

export type SourceBreakdownEntry = {
  source: string
  sourceLabel: string
  count: number
  percentage: number
}

// ============================================
// DATE RANGE HELPERS
// ============================================

type DateRangePreset = 'this_month' | 'last_3_months' | 'last_year' | 'all_time'

function getDateRangeStart(preset: DateRangePreset): string | null {
  const now = new Date()
  switch (preset) {
    case 'this_month':
      return startOfMonth(now).toISOString()
    case 'last_3_months':
      return startOfMonth(subMonths(now, 2)).toISOString()
    case 'last_year':
      return startOfMonth(subMonths(now, 11)).toISOString()
    case 'all_time':
      return null
  }
}

// ============================================
// 1. CHANNEL ANALYTICS (main dashboard data)
// ============================================

export async function getChannelAnalytics(
  dateRange: DateRangePreset = 'all_time'
): Promise<ChannelAnalyticsData> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const rangeStart = getDateRangeStart(dateRange)

  // Fetch inquiries with channel info
  let inqQuery = db
    .from('inquiries')
    .select('id, channel, referral_source, converted_to_event_id, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (rangeStart) {
    inqQuery = inqQuery.gte('created_at', rangeStart)
  }

  const { data: inquiries, error: inqError } = await inqQuery

  if (inqError) {
    console.error('[getChannelAnalytics] inquiries error:', inqError)
    return {
      bySource: [],
      topSources: [],
      sourceOverTime: [],
      totalInquiries: 0,
      totalBooked: 0,
      overallConversionRate: 0,
    }
  }

  // Collect event IDs from converted inquiries
  const eventIds = (inquiries || [])
    .map((i: any) => i.converted_to_event_id)
    .filter((id: any): id is string => id != null)

  // Fetch event data + financial summary for revenue
  let eventMap: Record<string, { status: string; netRevenueCents: number }> = {}
  if (eventIds.length > 0) {
    // Get events with their financial summaries
    const { data: events } = await db
      .from('events')
      .select('id, status, quoted_price_cents')
      .eq('tenant_id', tenantId)
      .in('id', eventIds)

    // Get financial summaries for revenue data
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents')
      .in('event_id', eventIds)

    const financialMap: Record<string, number> = {}
    for (const f of financials || []) {
      financialMap[f.event_id] = f.net_revenue_cents || 0
    }

    for (const evt of events || []) {
      eventMap[evt.id] = {
        status: evt.status,
        netRevenueCents: financialMap[evt.id] || evt.quoted_price_cents || 0,
      }
    }
  }

  // Booked statuses (past draft/proposed)
  const bookedStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']

  // Group by channel
  const sourceData: Record<
    string,
    {
      inquiryCount: number
      bookedCount: number
      totalRevenueCents: number
    }
  > = {}

  // Track monthly data
  const monthlyData: Record<string, Record<string, number>> = {}

  for (const inq of inquiries || []) {
    const channel = inq.channel || 'other'

    if (!sourceData[channel]) {
      sourceData[channel] = { inquiryCount: 0, bookedCount: 0, totalRevenueCents: 0 }
    }
    sourceData[channel].inquiryCount++

    // Check if converted and booked
    if (inq.converted_to_event_id && eventMap[inq.converted_to_event_id]) {
      const evt = eventMap[inq.converted_to_event_id]
      if (bookedStatuses.includes(evt.status)) {
        sourceData[channel].bookedCount++
        sourceData[channel].totalRevenueCents += evt.netRevenueCents
      }
    }

    // Monthly tracking
    const monthKey = format(new Date(inq.created_at), 'MMM yyyy')
    if (!monthlyData[monthKey]) monthlyData[monthKey] = {}
    monthlyData[monthKey][channel] = (monthlyData[monthKey][channel] || 0) + 1
  }

  // Build bySource array
  const bySource: ChannelSourceStats[] = Object.entries(sourceData)
    .map(([source, data]) => ({
      source,
      sourceLabel: getSourceLabel(source),
      inquiryCount: data.inquiryCount,
      bookedCount: data.bookedCount,
      conversionRate:
        data.inquiryCount > 0 ? Math.round((data.bookedCount / data.inquiryCount) * 1000) / 10 : 0,
      totalRevenueCents: data.totalRevenueCents,
      avgRevenueCents:
        data.bookedCount > 0 ? Math.round(data.totalRevenueCents / data.bookedCount) : 0,
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)

  // Top sources by revenue
  const topSources = bySource.filter((s) => s.totalRevenueCents > 0).map((s) => s.sourceLabel)

  // Source over time (sorted chronologically)
  const sourceOverTime: SourceOverTimeEntry[] = Object.entries(monthlyData)
    .sort((a, b) => {
      const dateA = new Date(a[0])
      const dateB = new Date(b[0])
      return dateA.getTime() - dateB.getTime()
    })
    .map(([month, sources]) => ({ month, sources }))

  const totalInquiries = bySource.reduce((sum, s) => sum + s.inquiryCount, 0)
  const totalBooked = bySource.reduce((sum, s) => sum + s.bookedCount, 0)

  return {
    bySource,
    topSources,
    sourceOverTime,
    totalInquiries,
    totalBooked,
    overallConversionRate:
      totalInquiries > 0 ? Math.round((totalBooked / totalInquiries) * 1000) / 10 : 0,
  }
}

// ============================================
// 2. SOURCE BREAKDOWN (simple counts)
// ============================================

export async function getSourceBreakdown(): Promise<SourceBreakdownEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: inquiries, error } = await db
    .from('inquiries')
    .select('channel')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (error) {
    console.error('[getSourceBreakdown] error:', error)
    return []
  }

  const counts: Record<string, number> = {}
  const total = (inquiries || []).length

  for (const inq of inquiries || []) {
    const channel = inq.channel || 'other'
    counts[channel] = (counts[channel] || 0) + 1
  }

  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      sourceLabel: getSourceLabel(source),
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

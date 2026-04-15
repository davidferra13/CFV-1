// Source Analytics Server Actions
// Queries for lead source distribution, conversion rates, revenue attribution, and trends

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { deriveProvenance } from '@/lib/analytics/source-provenance'

// ============================================
// TYPES
// ============================================

export type DateRange = {
  from: string // ISO date string
  to: string // ISO date string
}

export type SourceDataPoint = {
  name: string
  count: number
}

export type ConversionData = {
  name: string
  inquiries: number
  confirmed: number
  completed: number
}

export type RevenueData = {
  name: string
  revenue_cents: number
}

export type TrendDataPoint = {
  month: string
  [source: string]: string | number
}

export type PartnerLeaderboardEntry = {
  id: string
  name: string
  partner_type: string
  inquiry_count: number
  event_count: number
  completed_count: number
  revenue_cents: number
  guest_count: number
  conversion_rate: number
}

// ============================================
// HELPERS
// ============================================

function getDefaultRange(): DateRange {
  const now = new Date()
  return {
    from: startOfMonth(subMonths(now, 11)).toISOString(),
    to: endOfMonth(now).toISOString(),
  }
}

function getCurrentMonthRange(): DateRange {
  const now = new Date()
  return {
    from: startOfMonth(now).toISOString(),
    to: endOfMonth(now).toISOString(),
  }
}

// ============================================
// 1. SOURCE DISTRIBUTION
// ============================================

export async function getSourceDistribution(range?: DateRange): Promise<SourceDataPoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { from, to } = range || getDefaultRange()

  const { data: inquiries, error } = await db
    .from('inquiries')
    .select('channel, unknown_fields, utm_medium, external_platform')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) {
    console.error('[getSourceDistribution] Error:', error)
    return []
  }

  const counts: Record<string, number> = {}
  for (const inq of inquiries || []) {
    const { label } = deriveProvenance(inq)
    counts[label] = (counts[label] || 0) + 1
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================
// 2. CONVERSION RATES BY SOURCE
// ============================================

export async function getConversionRatesBySource(range?: DateRange): Promise<ConversionData[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { from, to } = range || getDefaultRange()

  const { data: inquiries, error } = await db
    .from('inquiries')
    .select('id, channel, status, unknown_fields, utm_medium, external_platform')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) {
    console.error('[getConversionRatesBySource] Error:', error)
    return []
  }

  // Also get events that were converted from inquiries in this range
  const { data: events } = await db
    .from('events')
    .select('referral_partner_id, status, inquiry_id')
    .eq('tenant_id', user.tenantId!)
    .not('inquiry_id', 'is', null)

  // Map inquiry_id to event status
  const eventByInquiry: Record<string, string> = {}
  for (const evt of events || []) {
    if (evt.inquiry_id) {
      eventByInquiry[evt.inquiry_id] = evt.status
    }
  }

  const COMMITTED_STATUSES = new Set(['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])

  const data: Record<string, { inquiries: number; confirmed: number; completed: number }> = {}

  for (const inq of inquiries || []) {
    const { label } = deriveProvenance(inq)
    if (!data[label]) data[label] = { inquiries: 0, confirmed: 0, completed: 0 }
    data[label].inquiries++

    const linkedStatus = eventByInquiry[inq.id]
    if (linkedStatus) {
      // Has linked event: use event status for confirmed and completed
      if (COMMITTED_STATUSES.has(linkedStatus)) data[label].confirmed++
      if (linkedStatus === 'completed') data[label].completed++
    } else if (inq.status === 'confirmed') {
      // Legacy fallback: no linked event, use inquiry's own status
      data[label].confirmed++
    }
  }

  return Object.entries(data)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.inquiries - a.inquiries)
}

// ============================================
// 3. REVENUE BY SOURCE
// ============================================

export async function getRevenueBySource(range?: DateRange): Promise<RevenueData[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { from, to } = range || getDefaultRange()

  // Get completed events with their inquiry channel
  const { data: events, error } = await db
    .from('events')
    .select('quoted_price_cents, inquiry_id, referral_partner_id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', from)
    .lte('event_date', to)

  if (error) {
    console.error('[getRevenueBySource] Error:', error)
    return []
  }

  // Get the inquiry channel for each event
  const inquiryIds = (events || [])
    .map((e: any) => e.inquiry_id)
    .filter((id: any): id is string => id != null)
  const { data: inquiries } =
    inquiryIds.length > 0
      ? await db
          .from('inquiries')
          .select('id, channel, unknown_fields, utm_medium, external_platform')
          .in('id', inquiryIds)
      : { data: [] }

  const provenanceMap: Record<string, string> = {}
  for (const inq of inquiries || []) {
    provenanceMap[inq.id] = deriveProvenance(inq).label
  }

  const revenue: Record<string, number> = {}
  for (const evt of events || []) {
    const label = evt.inquiry_id ? (provenanceMap[evt.inquiry_id] ?? 'Direct') : 'Direct'
    revenue[label] = (revenue[label] || 0) + (evt.quoted_price_cents || 0)
  }

  return Object.entries(revenue)
    .map(([name, revenue_cents]) => ({ name, revenue_cents }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
}

// ============================================
// 3b. PLATFORM INDEPENDENCE SCORE
// ============================================

// Labels that identify third-party marketplace revenue (commission-bearing platforms)
const PLATFORM_LABELS = new Set(['Take a Chef', 'Wix Form'])

export type PlatformIndependenceScore = {
  directPercent: number
  platformPercent: number
  directCents: number
  platformCents: number
  totalCents: number
  hasData: boolean
}

export async function getPlatformIndependenceScore(
  range?: DateRange
): Promise<PlatformIndependenceScore> {
  const bySource = await getRevenueBySource(range)
  const empty: PlatformIndependenceScore = {
    directPercent: 0,
    platformPercent: 0,
    directCents: 0,
    platformCents: 0,
    totalCents: 0,
    hasData: false,
  }
  if (!bySource.length) return empty

  let directCents = 0
  let platformCents = 0
  for (const row of bySource) {
    if (PLATFORM_LABELS.has(row.name)) {
      platformCents += row.revenue_cents
    } else {
      directCents += row.revenue_cents
    }
  }
  const totalCents = directCents + platformCents
  if (totalCents === 0) return empty

  return {
    directPercent: Math.round((directCents / totalCents) * 1000) / 10,
    platformPercent: Math.round((platformCents / totalCents) * 1000) / 10,
    directCents,
    platformCents,
    totalCents,
    hasData: true,
  }
}

// ============================================
// 4. SOURCE TRENDS (MONTHLY)
// ============================================

export async function getSourceTrends(months = 12): Promise<TrendDataPoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1)).toISOString()

  const { data: inquiries, error } = await db
    .from('inquiries')
    .select('channel, created_at, unknown_fields, utm_medium, external_platform')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)

  if (error) {
    console.error('[getSourceTrends] Error:', error)
    return []
  }

  // Group by month and provenance lane
  const monthData: Record<string, Record<string, number>> = {}

  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, months - 1 - i)
    const key = format(monthDate, 'MMM yyyy')
    monthData[key] = {}
  }

  for (const inq of inquiries || []) {
    const key = format(new Date(inq.created_at), 'MMM yyyy')
    const { label } = deriveProvenance(inq)
    if (monthData[key]) {
      monthData[key][label] = (monthData[key][label] || 0) + 1
    }
  }

  return Object.entries(monthData).map(([month, channels]) => ({
    month,
    ...channels,
  }))
}

// ============================================
// 5. PARTNER LEADERBOARD
// ============================================

export async function getPartnerLeaderboard(range?: DateRange): Promise<PartnerLeaderboardEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { from, to } = range || getDefaultRange()

  // Get all active partners
  const { data: partners, error } = await db
    .from('referral_partners')
    .select('id, name, partner_type')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (error || !partners || partners.length === 0) return []

  const partnerIds = partners.map((p: any) => p.id)

  // Get inquiries in range linked to partners
  const { data: inquiries } = await db
    .from('inquiries')
    .select('referral_partner_id, status')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)
    .gte('created_at', from)
    .lte('created_at', to)

  // Get events linked to partners
  const { data: events } = await db
    .from('events')
    .select('referral_partner_id, status, quoted_price_cents, guest_count')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)

  // Aggregate
  const stats: Record<
    string,
    {
      inquiry_count: number
      event_count: number
      completed_count: number
      revenue_cents: number
      guest_count: number
    }
  > = {}

  for (const pid of partnerIds) {
    stats[pid] = {
      inquiry_count: 0,
      event_count: 0,
      completed_count: 0,
      revenue_cents: 0,
      guest_count: 0,
    }
  }

  for (const inq of inquiries || []) {
    if (inq.referral_partner_id && stats[inq.referral_partner_id]) {
      stats[inq.referral_partner_id].inquiry_count++
    }
  }

  for (const evt of events || []) {
    if (evt.referral_partner_id && stats[evt.referral_partner_id]) {
      stats[evt.referral_partner_id].event_count++
      if (evt.status === 'completed') {
        stats[evt.referral_partner_id].completed_count++
        stats[evt.referral_partner_id].revenue_cents += evt.quoted_price_cents || 0
        stats[evt.referral_partner_id].guest_count += evt.guest_count || 0
      }
    }
  }

  return partners
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      partner_type: p.partner_type,
      ...stats[p.id],
      conversion_rate:
        stats[p.id].inquiry_count > 0
          ? Math.round((stats[p.id].completed_count / stats[p.id].inquiry_count) * 100)
          : 0,
    }))
    .filter((p: any) => p.inquiry_count > 0 || p.event_count > 0)
    .sort((a: any, b: any) => b.revenue_cents - a.revenue_cents)
}

// ============================================
// 6. TOP SOURCES THIS MONTH (for dashboard)
// ============================================

export async function getTopSourcesThisMonth(): Promise<{ name: string; count: number }[]> {
  const range = getCurrentMonthRange()
  const distribution = await getSourceDistribution(range)
  return distribution.slice(0, 3)
}

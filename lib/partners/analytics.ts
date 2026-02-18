// Source Analytics Server Actions
// Queries for lead source distribution, conversion rates, revenue attribution, and trends

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

// ============================================
// TYPES
// ============================================

export type DateRange = {
  from: string  // ISO date string
  to: string    // ISO date string
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

const CHANNEL_LABELS: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  referral: 'Referral',
  walk_in: 'Walk-In',
  instagram: 'Instagram',
  take_a_chef: 'Take a Chef',
  website: 'Website',
  other: 'Other',
}

// ============================================
// 1. SOURCE DISTRIBUTION
// ============================================

export async function getSourceDistribution(range?: DateRange): Promise<SourceDataPoint[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  const { from, to } = range || getDefaultRange()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('channel')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) {
    console.error('[getSourceDistribution] Error:', error)
    return []
  }

  const counts: Record<string, number> = {}
  for (const inq of inquiries || []) {
    const label = CHANNEL_LABELS[inq.channel] || inq.channel
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
  const supabase = createServerClient()
  const { from, to } = range || getDefaultRange()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('channel, status')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) {
    console.error('[getConversionRatesBySource] Error:', error)
    return []
  }

  // Also get events that were converted from inquiries in this range
  const { data: events } = await supabase
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

  const data: Record<string, { inquiries: number; confirmed: number; completed: number }> = {}

  for (const inq of inquiries || []) {
    const label = CHANNEL_LABELS[inq.channel] || inq.channel
    if (!data[label]) data[label] = { inquiries: 0, confirmed: 0, completed: 0 }
    data[label].inquiries++
    if (inq.status === 'confirmed') data[label].confirmed++
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
  const supabase = createServerClient()
  const { from, to } = range || getDefaultRange()

  // Get completed events with their inquiry channel
  const { data: events, error } = await supabase
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
  const inquiryIds = (events || []).map(e => e.inquiry_id).filter(Boolean)
  const { data: inquiries } = inquiryIds.length > 0
    ? await supabase
        .from('inquiries')
        .select('id, channel')
        .in('id', inquiryIds)
    : { data: [] }

  const channelMap: Record<string, string> = {}
  for (const inq of inquiries || []) {
    channelMap[inq.id] = inq.channel
  }

  const revenue: Record<string, number> = {}
  for (const evt of events || []) {
    const channel = evt.inquiry_id ? channelMap[evt.inquiry_id] : null
    const label = channel ? (CHANNEL_LABELS[channel] || channel) : 'Direct'
    revenue[label] = (revenue[label] || 0) + (evt.quoted_price_cents || 0)
  }

  return Object.entries(revenue)
    .map(([name, revenue_cents]) => ({ name, revenue_cents }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
}

// ============================================
// 4. SOURCE TRENDS (MONTHLY)
// ============================================

export async function getSourceTrends(months = 12): Promise<TrendDataPoint[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1)).toISOString()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('channel, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)

  if (error) {
    console.error('[getSourceTrends] Error:', error)
    return []
  }

  // Group by month and channel
  const monthData: Record<string, Record<string, number>> = {}

  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, months - 1 - i)
    const key = format(monthDate, 'MMM yyyy')
    monthData[key] = {}
  }

  for (const inq of inquiries || []) {
    const key = format(new Date(inq.created_at), 'MMM yyyy')
    const label = CHANNEL_LABELS[inq.channel] || inq.channel
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
  const supabase = createServerClient()
  const { from, to } = range || getDefaultRange()

  // Get all active partners
  const { data: partners, error } = await supabase
    .from('referral_partners')
    .select('id, name, partner_type')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')

  if (error || !partners || partners.length === 0) return []

  const partnerIds = partners.map(p => p.id)

  // Get inquiries in range linked to partners
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('referral_partner_id, status')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)
    .gte('created_at', from)
    .lte('created_at', to)

  // Get events linked to partners
  const { data: events } = await supabase
    .from('events')
    .select('referral_partner_id, status, quoted_price_cents, guest_count')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)

  // Aggregate
  const stats: Record<string, {
    inquiry_count: number
    event_count: number
    completed_count: number
    revenue_cents: number
    guest_count: number
  }> = {}

  for (const pid of partnerIds) {
    stats[pid] = { inquiry_count: 0, event_count: 0, completed_count: 0, revenue_cents: 0, guest_count: 0 }
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
    .map(p => ({
      id: p.id,
      name: p.name,
      partner_type: p.partner_type,
      ...stats[p.id],
      conversion_rate: stats[p.id].inquiry_count > 0
        ? Math.round((stats[p.id].completed_count / stats[p.id].inquiry_count) * 100)
        : 0,
    }))
    .filter(p => p.inquiry_count > 0 || p.event_count > 0)
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
}

// ============================================
// 6. TOP SOURCES THIS MONTH (for dashboard)
// ============================================

export async function getTopSourcesThisMonth(): Promise<{ name: string; count: number }[]> {
  const range = getCurrentMonthRange()
  const distribution = await getSourceDistribution(range)
  return distribution.slice(0, 3)
}

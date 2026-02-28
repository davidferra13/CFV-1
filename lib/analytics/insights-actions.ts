// Clientele Intelligence Server Actions
// Statistics across all dimensions: dining patterns, occasions, client demographics,
// seasonal trends, retention, financials, and operational efficiency.
// All aggregation is done in JS after minimal Supabase fetches (no RPC calls, no migrations needed).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { format, subMonths, startOfMonth } from 'date-fns'

// ============================================
// TYPES
// ============================================

export type DinnerTimeSlot = { hour: string; count: number }

export type OccasionStat = {
  occasion: string
  count: number
  avg_revenue_cents: number
  total_revenue_cents: number
}

export type ServiceStyleStat = { name: string; count: number }

export type GuestCountBucket = { label: string; count: number }

export type DietaryFrequency = { restriction: string; count: number }

export type MonthlyVolume = {
  month: string
  events: number
  revenue_cents: number
  completed: number
}

export type DayOfWeekStat = { day: string; count: number }

export type RevenueTrendPoint = { period: string; revenue_cents: number }

export type ClientAcquisitionStats = {
  bySource: { name: string; count: number }[]
  byStatus: { name: string; count: number }[]
  byLoyaltyTier: { tier: string; count: number }[]
  total: number
}

export type RetentionStats = {
  total: number
  newClients: number
  returningClients: number
  dormant: number
  repeatRate: number
  avgEventsPerClient: number
  eventsPerClientHistogram: { events: string; clients: number }[]
}

export type LTVBucket = { label: string; clients: number }

export type PhaseTimeStats = {
  phaseAverages: { phase: string; avg_minutes: number }[]
  avgTotalMinutes: number
  avgServiceMinPerGuest: number
  eventCount: number
}

export type AARTrends = {
  trend: {
    period: string
    calm: number | null
    preparation: number | null
    execution: number | null
  }[]
  topForgotten: { item: string; count: number }[]
}

export type FinancialIntelligence = {
  revenueByOccasion: { occasion: string; total_cents: number; avg_cents: number; count: number }[]
  avgValueByStyle: { style: string; avg_cents: number }[]
  avgTipRate: number
  tipParticipationRate: number
  avgEventValue: number
}

// ============================================
// HELPERS
// ============================================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function safeAvg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10
}

// Parse a "YYYY-MM-DD" date string safely (avoids timezone shifts)
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

const SOURCE_LABELS: Record<string, string> = {
  take_a_chef: 'Take a Chef',
  instagram: 'Instagram',
  referral: 'Referral',
  website: 'Website',
  phone: 'Phone',
  email: 'Email',
  other: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  dormant: 'Dormant',
  repeat_ready: 'Repeat Ready',
  vip: 'VIP',
}

// ============================================
// 1. DINNER TIME DISTRIBUTION
// ============================================

export async function getDinnerTimeDistribution(): Promise<DinnerTimeSlot[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('serve_time')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'confirmed', 'in_progress'])
    .not('serve_time', 'is', null)

  if (error) {
    console.error('[getDinnerTimeDistribution]', error)
    return []
  }

  const hourBuckets: Record<number, number> = {}
  for (const e of events ?? []) {
    const hour = parseInt((e.serve_time as string).slice(0, 2), 10)
    hourBuckets[hour] = (hourBuckets[hour] ?? 0) + 1
  }

  // Build 11am–11pm range
  return Array.from({ length: 13 }, (_, i) => {
    const h = i + 11
    const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
    return { hour: label, count: hourBuckets[h] ?? 0 }
  })
}

// ============================================
// 2. OCCASION STATS
// ============================================

export async function getOccasionStats(): Promise<OccasionStat[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('occasion, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .not('occasion', 'is', null)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])

  if (error) {
    console.error('[getOccasionStats]', error)
    return []
  }

  type Agg = { count: number; total: number }
  const map: Record<string, Agg> = {}

  for (const e of events ?? []) {
    const key = (e.occasion as string).trim().toLowerCase()
    if (!key) continue
    if (!map[key]) map[key] = { count: 0, total: 0 }
    map[key].count++
    map[key].total += e.quoted_price_cents ?? 0
  }

  return Object.entries(map)
    .map(([occasion, d]) => ({
      occasion: capitalize(occasion),
      count: d.count,
      avg_revenue_cents: d.count > 0 ? Math.round(d.total / d.count) : 0,
      total_revenue_cents: d.total,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

// ============================================
// 3. SERVICE STYLE DISTRIBUTION
// ============================================

export async function getServiceStyleDistribution(): Promise<ServiceStyleStat[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('service_style')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])
    .not('service_style', 'is', null)

  if (error) {
    console.error('[getServiceStyleDistribution]', error)
    return []
  }

  const counts: Record<string, number> = {}
  for (const e of events ?? []) {
    const key = e.service_style as string
    counts[key] = (counts[key] ?? 0) + 1
  }

  return Object.entries(counts)
    .map(([style, count]) => ({ name: SERVICE_STYLE_LABELS[style] ?? capitalize(style), count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================
// 4. GUEST COUNT DISTRIBUTION
// ============================================

export async function getGuestCountDistribution(): Promise<GuestCountBucket[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('guest_count')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'confirmed'])
    .not('guest_count', 'is', null)

  if (error) {
    console.error('[getGuestCountDistribution]', error)
    return []
  }

  const BUCKETS = [
    { label: '1–2', min: 1, max: 2 },
    { label: '3–4', min: 3, max: 4 },
    { label: '5–6', min: 5, max: 6 },
    { label: '7–8', min: 7, max: 8 },
    { label: '9–12', min: 9, max: 12 },
    { label: '13–20', min: 13, max: 20 },
    { label: '21+', min: 21, max: Infinity },
  ]

  const counts = BUCKETS.map((b) => ({ label: b.label, count: 0, min: b.min, max: b.max }))

  for (const e of events ?? []) {
    const g = e.guest_count as number
    const bucket = counts.find((b) => g >= b.min && g <= b.max)
    if (bucket) bucket.count++
  }

  return counts.map(({ label, count }) => ({ label, count }))
}

// ============================================
// 5. DIETARY RESTRICTION FREQUENCY
// ============================================

export async function getDietaryRestrictionFrequency(): Promise<DietaryFrequency[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [{ data: clientRows, error: clientErr }, { data: eventRows, error: eventErr }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('dietary_restrictions')
        .eq('tenant_id', user.tenantId!)
        .not('dietary_restrictions', 'is', null),
      supabase
        .from('events')
        .select('dietary_restrictions')
        .eq('tenant_id', user.tenantId!)
        .in('status', ['completed', 'confirmed', 'in_progress'])
        .not('dietary_restrictions', 'is', null),
    ])

  if (clientErr) console.error('[getDietaryRestrictionFrequency] clients:', clientErr)
  if (eventErr) console.error('[getDietaryRestrictionFrequency] events:', eventErr)

  const freq: Record<string, number> = {}

  const processArray = (arr: string[] | null) => {
    if (!arr) return
    for (const item of arr) {
      const key = item.trim().toLowerCase()
      if (key) freq[key] = (freq[key] ?? 0) + 1
    }
  }

  for (const row of clientRows ?? []) processArray(row.dietary_restrictions as string[] | null)
  for (const row of eventRows ?? []) processArray(row.dietary_restrictions as string[] | null)

  return Object.entries(freq)
    .map(([restriction, count]) => ({ restriction: capitalize(restriction), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
}

// ============================================
// 6. MONTHLY EVENT VOLUME (all calendar months)
// ============================================

export async function getMonthlyEventVolume(): Promise<MonthlyVolume[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('event_date, quoted_price_cents, status')
    .eq('tenant_id', user.tenantId!)
    .not('event_date', 'is', null)
    .not('status', 'in', '("draft","cancelled")')

  if (error) {
    console.error('[getMonthlyEventVolume]', error)
    return []
  }

  const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  type MonthAgg = { count: number; totalCents: number; completedCount: number }
  const agg: MonthAgg[] = Array.from({ length: 12 }, () => ({
    count: 0,
    totalCents: 0,
    completedCount: 0,
  }))

  for (const e of events ?? []) {
    const month = parseDate(e.event_date as string).getMonth()
    agg[month].count++
    agg[month].totalCents += e.quoted_price_cents ?? 0
    if (e.status === 'completed') agg[month].completedCount++
  }

  return agg.map((d, i) => ({
    month: MONTH_NAMES[i],
    events: d.count,
    revenue_cents: d.totalCents,
    completed: d.completedCount,
  }))
}

// ============================================
// 7. DAY OF WEEK DISTRIBUTION
// ============================================

export async function getDayOfWeekDistribution(): Promise<DayOfWeekStat[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'confirmed'])
    .not('event_date', 'is', null)

  if (error) {
    console.error('[getDayOfWeekDistribution]', error)
    return []
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts = DAY_NAMES.map((day) => ({ day, count: 0 }))

  for (const e of events ?? []) {
    const dow = parseDate(e.event_date as string).getDay()
    counts[dow].count++
  }

  return counts
}

// ============================================
// 8. MONTHLY REVENUE TREND (18 months rolling)
// ============================================

export async function getMonthlyRevenueTrend(months = 18): Promise<RevenueTrendPoint[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1)).toISOString()

  const { data: ledger, error } = await supabase
    .from('ledger_entries')
    .select('entry_type, amount_cents, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)

  if (error) {
    console.error('[getMonthlyRevenueTrend]', error)
    return []
  }

  // Build month scaffold
  const scaffold: Record<string, number> = {}
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(now, months - 1 - i), 'MMM yy')
    scaffold[key] = 0
  }

  for (const entry of ledger ?? []) {
    const key = format(new Date(entry.created_at as string), 'MMM yy')
    if (scaffold[key] === undefined) continue
    const amount =
      entry.entry_type === 'refund' ? -Math.abs(entry.amount_cents ?? 0) : (entry.amount_cents ?? 0)
    scaffold[key] += amount
  }

  return Object.entries(scaffold).map(([period, revenue_cents]) => ({ period, revenue_cents }))
}

// ============================================
// 9. CLIENT ACQUISITION STATS
// ============================================

export async function getClientAcquisitionStats(): Promise<ClientAcquisitionStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('referral_source, status, loyalty_tier')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getClientAcquisitionStats]', error)
    return { bySource: [], byStatus: [], byLoyaltyTier: [], total: 0 }
  }

  const sourceCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = {}
  const loyaltyCounts: Record<string, number> = {}

  for (const c of clients ?? []) {
    const src = c.referral_source
      ? (SOURCE_LABELS[c.referral_source] ?? capitalize(c.referral_source))
      : 'Unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1

    const st = c.status ?? 'active'
    const stLabel = STATUS_LABELS[st] ?? capitalize(st)
    statusCounts[stLabel] = (statusCounts[stLabel] ?? 0) + 1

    const tier = c.loyalty_tier ?? 'standard'
    const tierLabel = capitalize(tier)
    loyaltyCounts[tierLabel] = (loyaltyCounts[tierLabel] ?? 0) + 1
  }

  return {
    total: clients?.length ?? 0,
    bySource: Object.entries(sourceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: Object.entries(statusCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byLoyaltyTier: Object.entries(loyaltyCounts)
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ============================================
// 10. CLIENT RETENTION STATS
// ============================================

export async function getRetentionStats(): Promise<RetentionStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('total_events_count, last_event_date')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getRetentionStats]', error)
    return {
      total: 0,
      newClients: 0,
      returningClients: 0,
      dormant: 0,
      repeatRate: 0,
      avgEventsPerClient: 0,
      eventsPerClientHistogram: [],
    }
  }

  const all = clients ?? []
  const total = all.length
  const newClients = all.filter((c) => (c.total_events_count ?? 0) <= 1).length
  const returningClients = all.filter((c) => (c.total_events_count ?? 0) > 1).length

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const dormant = all.filter((c) => {
    if (!c.last_event_date) return false
    return parseDate(c.last_event_date as string) < sixMonthsAgo
  }).length

  const totalEvents = all.reduce((s, c) => s + (c.total_events_count ?? 0), 0)
  const repeatRate = total > 0 ? Math.round((returningClients / total) * 100) : 0
  const avgEventsPerClient = total > 0 ? Math.round((totalEvents / total) * 10) / 10 : 0

  // Events-per-client histogram — excludes clients with 0 events (not yet booked)
  const histogram: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 }
  for (const c of all) {
    const n = c.total_events_count ?? 0
    if (n === 0) continue
    const key = n >= 6 ? '6+' : String(n)
    histogram[key] = (histogram[key] ?? 0) + 1
  }

  return {
    total,
    newClients,
    returningClients,
    dormant,
    repeatRate,
    avgEventsPerClient,
    eventsPerClientHistogram: Object.entries(histogram).map(([events, clients]) => ({
      events,
      clients,
    })),
  }
}

// ============================================
// 11. CLIENT LIFETIME VALUE DISTRIBUTION
// ============================================

export async function getClientLTVDistribution(): Promise<LTVBucket[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('lifetime_value_cents')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getClientLTVDistribution]', error)
    return []
  }

  const BUCKETS = [
    { label: '<$500', min: 0, max: 49999 },
    { label: '$500–1k', min: 50000, max: 99999 },
    { label: '$1k–2.5k', min: 100000, max: 249999 },
    { label: '$2.5k–5k', min: 250000, max: 499999 },
    { label: '$5k–10k', min: 500000, max: 999999 },
    { label: '$10k+', min: 1000000, max: Infinity },
  ]

  const counts = BUCKETS.map((b) => ({ label: b.label, clients: 0, min: b.min, max: b.max }))

  for (const c of clients ?? []) {
    const v = c.lifetime_value_cents ?? 0
    const bucket = counts.find((b) => v >= b.min && v <= b.max)
    if (bucket) bucket.clients++
  }

  return counts.map(({ label, clients }) => ({ label, clients }))
}

// ============================================
// 12. OPERATIONAL PHASE TIME STATS
// ============================================

export async function getPhaseTimeStats(): Promise<PhaseTimeStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(
      'time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes, guest_count'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')

  if (error) {
    console.error('[getPhaseTimeStats]', error)
    return { phaseAverages: [], avgTotalMinutes: 0, avgServiceMinPerGuest: 0, eventCount: 0 }
  }

  const all = events ?? []

  type PhaseKey =
    | 'time_shopping_minutes'
    | 'time_prep_minutes'
    | 'time_travel_minutes'
    | 'time_service_minutes'
    | 'time_reset_minutes'

  const PHASES: { label: string; key: PhaseKey }[] = [
    { label: 'Shopping', key: 'time_shopping_minutes' },
    { label: 'Prep', key: 'time_prep_minutes' },
    { label: 'Travel', key: 'time_travel_minutes' },
    { label: 'Service', key: 'time_service_minutes' },
    { label: 'Reset', key: 'time_reset_minutes' },
  ]

  type PhaseAgg = { sum: number; count: number }
  const agg: Record<string, PhaseAgg> = {}
  for (const p of PHASES) agg[p.label] = { sum: 0, count: 0 }

  let totalMinutesSum = 0
  let serviceSum = 0
  let serviceCount = 0
  let guestSum = 0
  let guestCount = 0

  for (const e of all) {
    let eventTotal = 0
    for (const p of PHASES) {
      const val = e[p.key] as number | null
      if (val != null && val > 0) {
        agg[p.label].sum += val
        agg[p.label].count++
        eventTotal += val
        if (p.label === 'Service') {
          serviceSum += val
          serviceCount++
        }
      }
    }
    totalMinutesSum += eventTotal
    const gc = e.guest_count as number | null
    if (gc && gc > 0) {
      guestSum += gc
      guestCount++
    }
  }

  const avgGuests = guestCount > 0 ? guestSum / guestCount : 0
  const avgServiceMin = serviceCount > 0 ? serviceSum / serviceCount : 0
  const avgServiceMinPerGuest =
    avgGuests > 0 ? Math.round((avgServiceMin / avgGuests) * 10) / 10 : 0

  return {
    phaseAverages: PHASES.map((p) => ({
      phase: p.label,
      avg_minutes: agg[p.label].count > 0 ? Math.round(agg[p.label].sum / agg[p.label].count) : 0,
    })),
    avgTotalMinutes: all.length > 0 ? Math.round(totalMinutesSum / all.length) : 0,
    avgServiceMinPerGuest,
    eventCount: all.length,
  }
}

// ============================================
// 13. AAR RATING TRENDS
// ============================================

export async function getAARRatingTrends(months = 12): Promise<AARTrends> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1)).toISOString()

  const { data: aars, error } = await supabase
    .from('after_action_reviews')
    .select('calm_rating, preparation_rating, execution_rating, forgotten_items, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', from)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getAARRatingTrends]', error)
    return { trend: [], topForgotten: [] }
  }

  // Build month scaffold
  const scaffold: Record<string, { calm: number[]; prep: number[]; exec: number[] }> = {}
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(now, months - 1 - i), 'MMM yy')
    scaffold[key] = { calm: [], prep: [], exec: [] }
  }

  const forgottenFreq: Record<string, number> = {}

  for (const aar of aars ?? []) {
    const key = format(new Date(aar.created_at as string), 'MMM yy')
    if (scaffold[key]) {
      scaffold[key].calm.push(aar.calm_rating as number)
      scaffold[key].prep.push(aar.preparation_rating as number)
      if (aar.execution_rating != null) scaffold[key].exec.push(aar.execution_rating as number)
    }
    const items = aar.forgotten_items as string[] | null
    for (const item of items ?? []) {
      const k = item.trim().toLowerCase()
      if (k) forgottenFreq[k] = (forgottenFreq[k] ?? 0) + 1
    }
  }

  return {
    trend: Object.entries(scaffold).map(([period, d]) => ({
      period,
      calm: safeAvg(d.calm),
      preparation: safeAvg(d.prep),
      execution: safeAvg(d.exec),
    })),
    topForgotten: Object.entries(forgottenFreq)
      .map(([item, count]) => ({ item: capitalize(item), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }
}

// ============================================
// 14. FINANCIAL INTELLIGENCE
// ============================================

export async function getFinancialIntelligenceStats(): Promise<FinancialIntelligence> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('occasion, service_style, quoted_price_cents, tip_amount_cents, guest_count')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')

  if (error) {
    console.error('[getFinancialIntelligenceStats]', error)
    return {
      revenueByOccasion: [],
      avgValueByStyle: [],
      avgTipRate: 0,
      tipParticipationRate: 0,
      avgEventValue: 0,
    }
  }

  const all = events ?? []
  const total = all.length

  type Agg = { total: number; count: number }
  const occasionRev: Record<string, Agg> = {}
  const styleValue: Record<string, Agg> = {}

  let totalTips = 0
  let totalRevenue = 0
  let tippedEvents = 0

  for (const e of all) {
    const rev = e.quoted_price_cents ?? 0
    const tip = e.tip_amount_cents ?? 0
    totalRevenue += rev
    totalTips += tip
    if (tip > 0) tippedEvents++

    if (e.occasion) {
      const key = (e.occasion as string).trim().toLowerCase()
      if (!occasionRev[key]) occasionRev[key] = { total: 0, count: 0 }
      occasionRev[key].total += rev
      occasionRev[key].count++
    }

    if (e.service_style) {
      const key = e.service_style as string
      if (!styleValue[key]) styleValue[key] = { total: 0, count: 0 }
      styleValue[key].total += rev
      styleValue[key].count++
    }
  }

  return {
    revenueByOccasion: Object.entries(occasionRev)
      .map(([occasion, d]) => ({
        occasion: capitalize(occasion),
        total_cents: d.total,
        avg_cents: d.count > 0 ? Math.round(d.total / d.count) : 0,
        count: d.count,
      }))
      .sort((a, b) => b.total_cents - a.total_cents),
    avgValueByStyle: Object.entries(styleValue)
      .map(([style, d]) => ({
        style: SERVICE_STYLE_LABELS[style] ?? capitalize(style),
        avg_cents: d.count > 0 ? Math.round(d.total / d.count) : 0,
      }))
      .sort((a, b) => b.avg_cents - a.avg_cents),
    avgTipRate: totalRevenue > 0 ? Math.round((totalTips / totalRevenue) * 1000) / 10 : 0,
    tipParticipationRate: total > 0 ? Math.round((tippedEvents / total) * 100) : 0,
    avgEventValue: total > 0 ? Math.round(totalRevenue / total) : 0,
  }
}

// ============================================
// 13. TAKE A CHEF ROI STATS
// ============================================

export type TakeAChefROI = {
  tacClientCount: number
  totalEventsFromTacClients: number
  platformBookingsCount: number // inquiries with channel = take_a_chef
  directBookingsCount: number // repeat events from TAC clients, non-platform channel
  conversionRate: number // % of TAC clients who booked direct again
  estimatedCommissionPaidCents: number // expenses tagged as platform commission
  estimatedCommissionSavedCents: number // direct bookings × avg event value × 25%
  avgEventValueCents: number
  topTacClients: { clientId: string; name: string; totalEvents: number; directEvents: number }[]
}

export async function getTakeAChefROI(): Promise<TakeAChefROI> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const empty: TakeAChefROI = {
    tacClientCount: 0,
    totalEventsFromTacClients: 0,
    platformBookingsCount: 0,
    directBookingsCount: 0,
    conversionRate: 0,
    estimatedCommissionPaidCents: 0,
    estimatedCommissionSavedCents: 0,
    avgEventValueCents: 0,
    topTacClients: [],
  }

  try {
    // 1. Get all TakeaChef-sourced clients
    const { data: tacClients, error: clientErr } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .eq('referral_source', 'take_a_chef')

    if (clientErr || !tacClients || tacClients.length === 0) return empty

    const tacClientIds = tacClients.map((c) => c.id)

    // 2. Get all events from TAC clients (completed/non-cancelled)
    const { data: events } = await supabase
      .from('events')
      .select('id, client_id, inquiry_id, quoted_price_cents, status')
      .eq('tenant_id', tenantId)
      .in('client_id', tacClientIds)
      .not('status', 'in', '("cancelled","draft")')

    const allEvents = events ?? []

    // 3. Get inquiry channels for these events to split platform vs direct
    const inquiryIds = allEvents.map((e) => e.inquiry_id).filter(Boolean) as string[]

    let inquiryChannelMap: Record<string, string> = {}
    if (inquiryIds.length > 0) {
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('id, channel')
        .in('id', inquiryIds)

      for (const inq of inquiries ?? []) {
        if (inq.id) inquiryChannelMap[inq.id] = inq.channel
      }
    }

    // 4. Split events: platform vs direct
    let platformBookings = 0
    let directBookings = 0
    let totalRevenueCents = 0
    const clientEventCounts: Record<string, { name: string; total: number; direct: number }> = {}

    for (const event of allEvents) {
      const isPlatform = event.inquiry_id && inquiryChannelMap[event.inquiry_id] === 'take_a_chef'
      if (isPlatform) {
        platformBookings++
      } else {
        directBookings++
      }

      totalRevenueCents += event.quoted_price_cents ?? 0

      const clientId = event.client_id
      if (clientId) {
        if (!clientEventCounts[clientId]) {
          const clientRecord = tacClients.find((c) => c.id === clientId)
          clientEventCounts[clientId] = {
            name: clientRecord?.full_name ?? 'Unknown',
            total: 0,
            direct: 0,
          }
        }
        clientEventCounts[clientId].total++
        if (!isPlatform) clientEventCounts[clientId].direct++
      }
    }

    // 5. Get actual commission expenses
    const { data: commissionExpenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('vendor_name', 'Take a Chef')
      .eq('category', 'professional_services')

    const commissionPaidCents = (commissionExpenses ?? []).reduce(
      (sum, e) => sum + (e.amount_cents ?? 0),
      0
    )

    // 6. Estimate commission saved on direct bookings
    const avgEventValueCents =
      allEvents.length > 0 ? Math.round(totalRevenueCents / allEvents.length) : 0
    const estimatedCommissionSavedCents = Math.round(directBookings * avgEventValueCents * 0.25)

    // 7. Conversion rate: TAC clients with at least one direct booking
    const clientsWithDirectBookings = Object.values(clientEventCounts).filter(
      (c) => c.direct > 0
    ).length
    const conversionRate =
      tacClients.length > 0 ? Math.round((clientsWithDirectBookings / tacClients.length) * 100) : 0

    // 8. Top TAC clients by total events
    const topTacClients = Object.entries(clientEventCounts)
      .map(([clientId, data]) => ({
        clientId,
        name: data.name,
        totalEvents: data.total,
        directEvents: data.direct,
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, 5)

    return {
      tacClientCount: tacClients.length,
      totalEventsFromTacClients: allEvents.length,
      platformBookingsCount: platformBookings,
      directBookingsCount: directBookings,
      conversionRate,
      estimatedCommissionPaidCents: commissionPaidCents,
      estimatedCommissionSavedCents,
      avgEventValueCents,
      topTacClients,
    }
  } catch (err) {
    console.error('[getTakeAChefROI]', err)
    return empty
  }
}

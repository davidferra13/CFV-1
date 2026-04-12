'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClientRetentionStats {
  activeClients: number
  repeatClients: number
  repeatBookingRate: number // % of events from returning clients
  retentionRate: number // % of clients who booked again in next 6 months
}

export interface ClientChurnStats {
  totalAtRisk: number // 120+ days inactive after 2+ events
  dormantCount: number // 90+ days with no engagement
  churnRate: number // % of historical clients now dormant
  avgDaysSinceLastEvent: number
}

export interface RevenueConcentrationStats {
  top5Clients: Array<{ clientId: string; name: string; revenueCents: number; sharePercent: number }>
  top5SharePercent: number // % of total revenue from top 5
  herfindahlIndex: number // 0–1 concentration score (higher = more concentrated)
}

export interface ClientAcquisitionStats {
  newClientsThisPeriod: number
  totalMarketingSpendCents: number
  cacCents: number // cost per new client
  cacRatio: number // CAC vs avg first-event value
}

export interface ReferralConversionStats {
  referredInquiries: number
  referredConversions: number
  referralConversionRate: number
  referralRevenueCents: number
}

export interface WinbackStats {
  dormantContacted: number
  dormantReactivated: number
  winbackRate: number
}

export interface NpsStats {
  npsScore: number // % promoters - % detractors (-100 to 100)
  promoters: number
  passives: number
  detractors: number
  totalResponses: number
  avgOverallRating: number
  avgFoodQualityRating: number
  avgServiceRating: number
  avgValueRating: number
  avgPresentationRating: number
  wouldRebookPercent: number
  responseRate: number // responded / sent
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10 // 1 decimal place
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getClientRetentionStats(): Promise<ClientRetentionStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Count distinct clients with completed events
  const { data: events } = await db
    .from('events')
    .select('client_id, event_date')
    .eq('tenant_id', chef.tenantId!)
    .eq('status', 'completed')
    .not('client_id', 'is', null)
    .order('client_id')
    .order('event_date')

  if (!events?.length) {
    return { activeClients: 0, repeatClients: 0, repeatBookingRate: 0, retentionRate: 0 }
  }

  // Group events by client
  const clientEvents = new Map<string, string[]>()
  for (const e of events) {
    if (!e.client_id) continue
    const list = clientEvents.get(e.client_id) ?? []
    list.push(e.event_date)
    clientEvents.set(e.client_id, list)
  }

  const activeClients = clientEvents.size
  const repeatClients = Array.from(clientEvents.values()).filter(
    (dates) => dates.length >= 2
  ).length

  // Repeat booking rate: events from clients with 2+ events / total events
  let eventsFromRepeatClients = 0
  for (const dates of clientEvents.values()) {
    if (dates.length >= 2) eventsFromRepeatClients += dates.length
  }
  const repeatBookingRate = pct(eventsFromRepeatClients, events.length)

  // Retention: clients who had an event in first half of year and also in second half
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  const cohortClients = new Set<string>()
  const retainedClients = new Set<string>()
  for (const [clientId, dates] of clientEvents) {
    const inCohort = dates.some((d) => new Date(d) >= oneYearAgo && new Date(d) < sixMonthsAgo)
    if (inCohort) {
      cohortClients.add(clientId)
      const retained = dates.some((d) => new Date(d) >= sixMonthsAgo)
      if (retained) retainedClients.add(clientId)
    }
  }

  return {
    activeClients,
    repeatClients,
    repeatBookingRate,
    retentionRate: pct(retainedClients.size, cohortClients.size),
  }
}

export async function getClientChurnStats(): Promise<ClientChurnStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const oneTwentyDaysAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString()

  // Get all clients with their last completed event date and total event count
  const { data } = await db
    .from('clients')
    .select('id, last_event_date, total_events_count')
    .eq('tenant_id', chef.tenantId!)
    .not('last_event_date', 'is', null)
    .gt('total_events_count', 0)

  if (!data?.length) {
    return { totalAtRisk: 0, dormantCount: 0, churnRate: 0, avgDaysSinceLastEvent: 0 }
  }

  let atRiskCount = 0
  let dormantCount = 0
  let totalDaysSince = 0

  for (const client of data) {
    const lastDate = new Date(client.last_event_date!)
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    totalDaysSince += daysSince

    if (client.last_event_date! < oneTwentyDaysAgo && (client.total_events_count ?? 0) >= 2) {
      atRiskCount++
    }
    if (client.last_event_date! < ninetyDaysAgo) {
      dormantCount++
    }
  }

  return {
    totalAtRisk: atRiskCount,
    dormantCount,
    churnRate: pct(dormantCount, data.length),
    avgDaysSinceLastEvent: Math.round(totalDaysSince / data.length),
  }
}

export async function getRevenueConcentration(): Promise<RevenueConcentrationStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get total revenue per client from ledger
  const { data: ledger } = await db
    .from('ledger_entries')
    .select('client_id, amount_cents, is_refund')
    .eq('tenant_id', chef.tenantId!)
    .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment', 'add_on', 'credit'])

  if (!ledger?.length) {
    return { top5Clients: [], top5SharePercent: 0, herfindahlIndex: 0 }
  }

  // Sum by client
  const clientRevenue = new Map<string, number>()
  let totalRevenue = 0
  for (const entry of ledger) {
    if (!entry.client_id) continue
    const current = clientRevenue.get(entry.client_id) ?? 0
    const amount = entry.is_refund ? -entry.amount_cents : entry.amount_cents
    clientRevenue.set(entry.client_id, current + amount)
    totalRevenue += amount
  }

  if (totalRevenue === 0) {
    return { top5Clients: [], top5SharePercent: 0, herfindahlIndex: 0 }
  }

  // Sort by revenue, take top 5
  const sorted = Array.from(clientRevenue.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Get client names
  const clientIds = sorted.map(([id]) => id)
  const { data: clients } = await db.from('clients').select('id, full_name').in('id', clientIds)

  const nameMap = new Map<string, string>()
  for (const c of clients ?? []) {
    nameMap.set(c.id, c.full_name)
  }

  const top5Clients = sorted.map(([clientId, revenueCents]) => ({
    clientId,
    name: nameMap.get(clientId) ?? 'Unknown',
    revenueCents,
    sharePercent: pct(revenueCents, totalRevenue),
  }))

  const top5SharePercent = pct(
    sorted.reduce((sum, [, r]) => sum + r, 0),
    totalRevenue
  )

  // Herfindahl-Hirschman Index: sum of squared market shares (0 = perfect spread, 1 = monopoly)
  const allShares = Array.from(clientRevenue.values()).map((r) => r / totalRevenue)
  const hhi = allShares.reduce((sum, s) => sum + s * s, 0)

  return {
    top5Clients,
    top5SharePercent,
    herfindahlIndex: Math.round(hhi * 1000) / 1000,
  }
}

export async function getClientAcquisitionStats(
  startDate: string,
  endDate: string
): Promise<ClientAcquisitionStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // New clients in period = clients whose first_event_date falls in range
  const { count: newClients } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.tenantId!)
    .gte('first_event_date', startDate)
    .lte('first_event_date', endDate)

  // Marketing spend in period - from marketing_spend_log table (migration 20260411000002)
  let totalSpend = 0
  try {
    const { data: spendRows } = await db
      .from('marketing_spend_log')
      .select('amount_cents')
      .eq('chef_id', chef.entityId)
      .gte('spend_date', startDate.substring(0, 10))
      .lte('spend_date', endDate.substring(0, 10))
    totalSpend = (spendRows ?? []).reduce(
      (sum: number, row: { amount_cents: number }) => sum + row.amount_cents,
      0
    )
  } catch {
    // Table may not exist yet if migration hasn't been applied
    totalSpend = 0
  }
  const newClientCount = newClients ?? 0
  const cac = newClientCount > 0 ? Math.round(totalSpend / newClientCount) : 0

  // Average first-event value
  const { data: firstEvents } = await db
    .from('clients')
    .select('average_spend_cents')
    .eq('tenant_id', chef.tenantId!)
    .gte('first_event_date', startDate)
    .lte('first_event_date', endDate)

  const avgFirstValue = firstEvents?.length
    ? Math.round(
        (firstEvents ?? []).reduce((sum: any, c: any) => sum + (c.average_spend_cents ?? 0), 0) /
          firstEvents.length
      )
    : 0

  return {
    newClientsThisPeriod: newClientCount,
    totalMarketingSpendCents: totalSpend,
    cacCents: cac,
    cacRatio: avgFirstValue > 0 ? Math.round((cac / avgFirstValue) * 100) / 100 : 0,
  }
}

export async function getReferralConversionStats(): Promise<ReferralConversionStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: inquiries } = await db
    .from('inquiries')
    .select('status, converted_to_event_id')
    .eq('tenant_id', chef.tenantId!)
    .eq('channel', 'referral')

  const referred = inquiries?.length ?? 0
  const converted = (inquiries ?? []).filter((i: any) => i.converted_to_event_id != null).length

  // Revenue from referral-sourced events
  const eventIds = (inquiries ?? [])
    .map((i: any) => i.converted_to_event_id)
    .filter(Boolean) as string[]

  let referralRevenue = 0
  if (eventIds.length > 0) {
    const { data: ledger } = await db
      .from('ledger_entries')
      .select('amount_cents, is_refund')
      .eq('tenant_id', chef.tenantId!)
      .in('event_id', eventIds)
      .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment', 'add_on'])

    referralRevenue = (ledger ?? []).reduce(
      (sum: any, e: any) => sum + (e.is_refund ? -e.amount_cents : e.amount_cents),
      0
    )
  }

  return {
    referredInquiries: referred,
    referredConversions: converted,
    referralConversionRate: pct(converted, referred),
    referralRevenueCents: referralRevenue,
  }
}

export async function getNpsStats(): Promise<NpsStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: surveys, error } = await db
    .from('client_satisfaction_surveys')
    .select(
      'nps_score, overall_rating, food_quality_rating, food_rating, service_rating, value_rating, presentation_rating, would_rebook, sent_at, responded_at'
    )
    .eq('chef_id', chef.entityId)
    .not('sent_at', 'is', null)

  if (error) {
    console.error('[getNpsStats]', error)
    return {
      npsScore: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      totalResponses: 0,
      avgOverallRating: 0,
      avgFoodQualityRating: 0,
      avgServiceRating: 0,
      avgValueRating: 0,
      avgPresentationRating: 0,
      wouldRebookPercent: 0,
      responseRate: 0,
    }
  }

  const all = surveys ?? []
  const responded = all.filter((s: any) => s.responded_at != null)

  if (all.length === 0) {
    return {
      npsScore: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      totalResponses: 0,
      avgOverallRating: 0,
      avgFoodQualityRating: 0,
      avgServiceRating: 0,
      avgValueRating: 0,
      avgPresentationRating: 0,
      wouldRebookPercent: 0,
      responseRate: 0,
    }
  }

  const withNps = responded.filter((s: any) => s.nps_score != null)
  const promoters = withNps.filter((s: any) => s.nps_score >= 9).length
  const detractors = withNps.filter((s: any) => s.nps_score <= 6).length
  const passives = withNps.filter((s: any) => s.nps_score >= 7 && s.nps_score <= 8).length
  const npsScore =
    withNps.length > 0
      ? Math.round((promoters / withNps.length - detractors / withNps.length) * 100)
      : 0

  function avgField(field: string): number {
    const vals = responded
      .map((s: any) => s[field])
      .filter((v: any): v is number => typeof v === 'number' && v > 0)
    return vals.length > 0
      ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10
      : 0
  }

  const wouldRebook = responded.filter((s: any) => s.would_rebook === true).length
  const wouldRebookPercent = responded.length > 0 ? pct(wouldRebook, responded.length) : 0

  return {
    npsScore,
    promoters,
    passives,
    detractors,
    totalResponses: responded.length,
    avgOverallRating: avgField('overall_rating'),
    avgFoodQualityRating: avgField('food_quality_rating') || avgField('food_rating'),
    avgServiceRating: avgField('service_rating'),
    avgValueRating: avgField('value_rating'),
    avgPresentationRating: avgField('presentation_rating'),
    wouldRebookPercent,
    responseRate: pct(responded.length, all.length),
  }
}

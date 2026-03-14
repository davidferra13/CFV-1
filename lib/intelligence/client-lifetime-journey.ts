'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClientJourney {
  clientId: string
  clientName: string
  firstContactDate: string
  firstEventDate: string | null
  lastEventDate: string | null
  totalEvents: number
  totalRevenueCents: number
  totalProfitCents: number
  lifetimeDays: number
  avgRevenuePerEventCents: number
  avgDaysBetweenEvents: number | null
  stage: 'prospect' | 'first_timer' | 'returning' | 'loyal' | 'champion' | 'dormant'
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  nextExpectedEventDate: string | null
  growthRate: number // % change in per-event revenue over time
}

export interface StageDistribution {
  stage: string
  count: number
  percent: number
  avgRevenueCents: number
}

export interface CohortAnalysis {
  cohort: string // e.g., "2025-Q1"
  clientsAcquired: number
  retained: number // clients with 2+ events
  retentionRate: number
  avgLifetimeRevenueCents: number
}

export interface ClientLifetimeResult {
  journeys: ClientJourney[]
  stageDistribution: StageDistribution[]
  cohorts: CohortAnalysis[]
  avgLifetimeValueCents: number
  avgEventsPerClient: number
  avgClientLifetimeDays: number
  retentionRate: number // % of clients who rebook
  topClients: ClientJourney[] // by revenue
  atRiskClients: ClientJourney[] // high risk
  avgDaysBetweenFirstInquiryAndEvent: number | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getClientLifetimeJourneys(): Promise<ClientLifetimeResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch clients
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('id, full_name, created_at')
    .eq('tenant_id', tenantId)

  if (cErr || !clients || clients.length < 3) return null

  // Fetch all events (completed or near-complete)
  const { data: events, error: eErr } = await supabase
    .from('events')
    .select('id, client_id, event_date, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])
    .order('event_date', { ascending: true })

  if (eErr) return null

  // Fetch inquiries for first contact
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, client_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  // Fetch expenses for profit
  const completedIds = (events || [])
    .filter((e: any) => e.status === 'completed')
    .map((e: any) => e.id)
  const { data: expenses } =
    completedIds.length > 0
      ? await supabase
          .from('expenses')
          .select('event_id, amount_cents')
          .in('event_id', completedIds)
      : { data: [] }

  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    expenseByEvent.set(
      exp.event_id,
      (expenseByEvent.get(exp.event_id) || 0) + (exp.amount_cents || 0)
    )
  }

  const now = Date.now()

  // First inquiry per client
  const firstInquiry = new Map<string, string>()
  for (const inq of inquiries || []) {
    if (inq.client_id && !firstInquiry.has(inq.client_id)) {
      firstInquiry.set(inq.client_id, inq.created_at)
    }
  }

  // Events grouped by client
  const clientEvents = new Map<string, any[]>()
  for (const ev of events || []) {
    if (!ev.client_id) continue
    if (!clientEvents.has(ev.client_id)) clientEvents.set(ev.client_id, [])
    clientEvents.get(ev.client_id)!.push(ev)
  }

  // Build journeys
  const journeys: ClientJourney[] = []

  for (const client of clients) {
    const evts = clientEvents.get(client.id) || []
    const firstContact = firstInquiry.get(client.id) || client.created_at
    const firstEventDate = evts.length > 0 ? evts[0].event_date : null
    const lastEventDate = evts.length > 0 ? evts[evts.length - 1].event_date : null

    const totalRevenue = evts.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0)
    const totalProfit = evts.reduce((s: number, e: any) => {
      const revenue = e.quoted_price_cents || 0
      return s + revenue - (expenseByEvent.get(e.id) || 0)
    }, 0)

    const lifetimeDays = lastEventDate
      ? Math.max(
          1,
          Math.floor(
            (new Date(lastEventDate).getTime() - new Date(firstContact).getTime()) / 86400000
          )
        )
      : Math.floor((now - new Date(firstContact).getTime()) / 86400000)

    const avgRevenue = evts.length > 0 ? Math.round(totalRevenue / evts.length) : 0

    // Average days between events
    let avgDaysBetween: number | null = null
    if (evts.length >= 2) {
      const gaps: number[] = []
      for (let i = 1; i < evts.length; i++) {
        const gap =
          (new Date(evts[i].event_date).getTime() - new Date(evts[i - 1].event_date).getTime()) /
          86400000
        if (gap > 0) gaps.push(gap)
      }
      if (gaps.length > 0) {
        avgDaysBetween = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
      }
    }

    // Stage classification
    const daysSinceLast = lastEventDate
      ? Math.floor((now - new Date(lastEventDate).getTime()) / 86400000)
      : 9999

    let stage: ClientJourney['stage']
    if (evts.length === 0) stage = 'prospect'
    else if (evts.length === 1 && daysSinceLast < 180) stage = 'first_timer'
    else if (evts.length >= 6) stage = 'champion'
    else if (evts.length >= 3) stage = 'loyal'
    else if (evts.length >= 2) stage = 'returning'
    else stage = 'dormant'

    if (daysSinceLast > 365 && evts.length > 0) stage = 'dormant'

    // Risk level
    let riskLevel: ClientJourney['riskLevel'] = 'none'
    if (stage === 'prospect') riskLevel = 'none'
    else if (daysSinceLast > 180 && stage !== 'dormant') riskLevel = 'high'
    else if (avgDaysBetween && daysSinceLast > avgDaysBetween * 1.5) riskLevel = 'medium'
    else if (avgDaysBetween && daysSinceLast > avgDaysBetween * 1.2) riskLevel = 'low'

    // Next expected event
    let nextExpected: string | null = null
    if (avgDaysBetween && lastEventDate) {
      const next = new Date(new Date(lastEventDate).getTime() + avgDaysBetween * 86400000)
      nextExpected = next.toISOString().split('T')[0]
    }

    // Growth rate (per-event revenue change)
    let growthRate = 0
    if (evts.length >= 3) {
      const halfIdx = Math.floor(evts.length / 2)
      const firstHalf = evts.slice(0, halfIdx)
      const secondHalf = evts.slice(halfIdx)
      const firstAvg =
        firstHalf.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) /
        firstHalf.length
      const secondAvg =
        secondHalf.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) /
        secondHalf.length
      growthRate = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0
    }

    journeys.push({
      clientId: client.id,
      clientName: client.full_name || 'Unknown',
      firstContactDate: new Date(firstContact).toISOString().split('T')[0],
      firstEventDate,
      lastEventDate,
      totalEvents: evts.length,
      totalRevenueCents: totalRevenue,
      totalProfitCents: totalProfit,
      lifetimeDays,
      avgRevenuePerEventCents: avgRevenue,
      avgDaysBetweenEvents: avgDaysBetween,
      stage,
      riskLevel,
      nextExpectedEventDate: nextExpected,
      growthRate,
    })
  }

  // Stage distribution
  const stageCounts = new Map<string, { count: number; totalRevenue: number }>()
  for (const j of journeys) {
    if (!stageCounts.has(j.stage)) stageCounts.set(j.stage, { count: 0, totalRevenue: 0 })
    const s = stageCounts.get(j.stage)!
    s.count++
    s.totalRevenue += j.totalRevenueCents
  }

  const stageDistribution: StageDistribution[] = Array.from(stageCounts.entries())
    .map(([stage, s]) => ({
      stage,
      count: s.count,
      percent: Math.round((s.count / journeys.length) * 100),
      avgRevenueCents: s.count > 0 ? Math.round(s.totalRevenue / s.count) : 0,
    }))
    .sort((a, b) => b.avgRevenueCents - a.avgRevenueCents)

  // Cohort analysis (by quarter of first contact)
  const cohortMap = new Map<
    string,
    { clients: Set<string>; retained: Set<string>; totalRevenue: number }
  >()
  for (const j of journeys) {
    const d = new Date(j.firstContactDate)
    const quarter = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`
    if (!cohortMap.has(quarter))
      cohortMap.set(quarter, { clients: new Set(), retained: new Set(), totalRevenue: 0 })
    const c = cohortMap.get(quarter)!
    c.clients.add(j.clientId)
    if (j.totalEvents >= 2) c.retained.add(j.clientId)
    c.totalRevenue += j.totalRevenueCents
  }

  const cohorts: CohortAnalysis[] = Array.from(cohortMap.entries())
    .map(([cohort, c]) => ({
      cohort,
      clientsAcquired: c.clients.size,
      retained: c.retained.size,
      retentionRate: c.clients.size > 0 ? Math.round((c.retained.size / c.clients.size) * 100) : 0,
      avgLifetimeRevenueCents: c.clients.size > 0 ? Math.round(c.totalRevenue / c.clients.size) : 0,
    }))
    .sort((a, b) => a.cohort.localeCompare(b.cohort))

  // Summary stats
  const withEvents = journeys.filter((j) => j.totalEvents > 0)
  const avgLTV =
    withEvents.length > 0
      ? Math.round(withEvents.reduce((s, j) => s + j.totalRevenueCents, 0) / withEvents.length)
      : 0
  const avgEventsPerClient =
    withEvents.length > 0
      ? Math.round((withEvents.reduce((s, j) => s + j.totalEvents, 0) / withEvents.length) * 10) /
        10
      : 0
  const avgLifetime =
    withEvents.length > 0
      ? Math.round(withEvents.reduce((s, j) => s + j.lifetimeDays, 0) / withEvents.length)
      : 0
  const rebooked = withEvents.filter((j) => j.totalEvents >= 2).length
  const retentionRate = withEvents.length > 0 ? Math.round((rebooked / withEvents.length) * 100) : 0

  // Time from first inquiry to first event
  const conversionTimes: number[] = []
  for (const j of journeys) {
    if (j.firstEventDate) {
      const days =
        (new Date(j.firstEventDate).getTime() - new Date(j.firstContactDate).getTime()) / 86400000
      if (days >= 0 && days < 365) conversionTimes.push(days)
    }
  }
  const avgConversion =
    conversionTimes.length > 0
      ? Math.round(conversionTimes.reduce((s, d) => s + d, 0) / conversionTimes.length)
      : null

  // Sort by revenue for display
  journeys.sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)

  const topClients = journeys.filter((j) => j.totalEvents > 0).slice(0, 10)
  const atRiskClients = journeys
    .filter((j) => j.riskLevel === 'high' || j.riskLevel === 'medium')
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2, none: 3 }
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    })
    .slice(0, 10)

  return {
    journeys: journeys.slice(0, 30),
    stageDistribution,
    cohorts,
    avgLifetimeValueCents: avgLTV,
    avgEventsPerClient,
    avgClientLifetimeDays: avgLifetime,
    retentionRate,
    topClients,
    atRiskClients,
    avgDaysBetweenFirstInquiryAndEvent: avgConversion,
  }
}

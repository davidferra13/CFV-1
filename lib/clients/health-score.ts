'use server'

// Client Health Score
// Computes a 0-100 score for each client based on six dimensions:
//   Recency (25pts)             - days since last event
//   Frequency (20pts)           - events per year
//   Monetary (20pts)            - lifetime value vs chef median
//   Engagement (15pts)          - profile completeness + referrals
//   Payment Promptness (10pts)  - balance status + tipping behavior
//   Relationship Signals (10pts) - referral source, dietary info, upcoming events, notes
//
// Also computes a trend indicator (improving/stable/declining) and alert flags.
//
// Used as a badge on client cards, a filter on the client list,
// and as a trigger condition for automations.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  CLIENT_PROFILE_COMPLETENESS_FIELDS,
  getClientProfileEngagementPoints,
} from '@/lib/clients/completeness'

export type ClientHealthTier = 'champion' | 'loyal' | 'at_risk' | 'dormant' | 'new'

export type ClientHealthTrend = 'improving' | 'stable' | 'declining'

export type ClientHealthScore = {
  clientId: string
  score: number // 0-100
  tier: ClientHealthTier
  recencyScore: number // 0-25
  frequencyScore: number // 0-20
  monetaryScore: number // 0-20
  engagementScore: number // 0-15
  paymentScore: number // 0-10
  relationshipScore: number // 0-10
  daysSinceLastEvent: number | null
  totalEvents: number
  lifetimeValueCents: number
  trend: ClientHealthTrend
  trendReason: string
  isAlert: boolean
  alertReason: string | null
}

export type ClientHealthSummary = {
  scores: ClientHealthScore[]
  medianLtv: number
  avgEventsPerYear: number
}

export type HealthScoreDistribution = {
  meanScore: number
  tierDistribution: Record<ClientHealthTier, number>
  percentHealthy: number
  totalClients: number
  alertCount: number
}

// ---- Internal helpers -------------------------------------------------------

function recencyScore(daysSince: number | null): number {
  if (daysSince === null) return 0 // never had an event
  if (daysSince <= 30) return 25
  if (daysSince <= 60) return 20
  if (daysSince <= 90) return 15
  if (daysSince <= 180) return 10
  if (daysSince <= 365) return 4
  return 0
}

function frequencyScore(eventsPerYear: number): number {
  if (eventsPerYear >= 6) return 20
  if (eventsPerYear >= 4) return 16
  if (eventsPerYear >= 2) return 12
  if (eventsPerYear >= 1) return 8
  if (eventsPerYear >= 0.5) return 4
  return 0
}

function monetaryScore(ltv: number, medianVal: number): number {
  if (medianVal === 0) return ltv > 0 ? 12 : 0
  const ratio = ltv / medianVal
  if (ratio >= 3) return 20
  if (ratio >= 2) return 16
  if (ratio >= 1) return 12
  if (ratio >= 0.5) return 6
  return 2
}

/** Payment Promptness (0-10): balance status + tipping behavior */
function paymentScore(outstandingBalanceCents: number, averageTipPercentage: number): number {
  let score = 0

  // Balance component (0-5)
  if (outstandingBalanceCents === 0) {
    score += 5 // no outstanding balance, full marks
  } else if (outstandingBalanceCents > 0) {
    score += 2 // partial credit for having some balance (not delinquent)
  }

  // Tipping component (0-5)
  if (averageTipPercentage >= 0.15) {
    score += 5 // generous tipper (15%+)
  } else if (averageTipPercentage > 0) {
    score += 3 // they tip at all
  }

  return Math.min(score, 10)
}

/** Relationship Signals (0-10): referral source, dietary info, upcoming events, notes */
function relationshipScore(opts: {
  hasReferralSource: boolean
  wasReferred: boolean
  hasDietaryRestrictions: boolean
  hasUpcomingEvent: boolean
  hasNotes: boolean
}): number {
  let score = 0

  // Has referral_source or was referred by another client (+3)
  if (opts.hasReferralSource || opts.wasReferred) score += 3

  // Has filled dietary restrictions (+2)
  if (opts.hasDietaryRestrictions) score += 2

  // Has upcoming event (recent activity signal) (+3)
  if (opts.hasUpcomingEvent) score += 3

  // Has vibe notes or other qualitative info (+2)
  if (opts.hasNotes) score += 2

  return Math.min(score, 10)
}

/** Compute trend based on current snapshot heuristics (no historical storage) */
function computeTrend(
  daysSince: number | null,
  totalEvents: number,
  outstandingBalanceCents: number
): { trend: ClientHealthTrend; trendReason: string } {
  // Improving: recent activity or repeat bookings building
  if (daysSince !== null && daysSince <= 30) {
    return { trend: 'improving', trendReason: 'Active in last 30 days' }
  }
  if (daysSince !== null && daysSince <= 60 && totalEvents > 1) {
    return { trend: 'improving', trendReason: 'Repeat bookings building' }
  }

  // Declining: trending toward dormant or has outstanding balance
  if (daysSince !== null && daysSince > 90 && daysSince <= 365) {
    return { trend: 'declining', trendReason: `No events in ${daysSince} days` }
  }
  if (daysSince !== null && daysSince > 365) {
    return { trend: 'declining', trendReason: `No events in ${daysSince} days` }
  }
  if (outstandingBalanceCents > 0) {
    const dollars = (outstandingBalanceCents / 100).toFixed(2)
    return { trend: 'declining', trendReason: `Outstanding balance of $${dollars}` }
  }

  return { trend: 'stable', trendReason: 'Steady engagement' }
}

/** Determine if a client needs an alert (active client whose score dropped low) */
function computeAlert(
  score: number,
  totalEvents: number
): { isAlert: boolean; alertReason: string | null } {
  // Only alert for clients who have had events (not new clients)
  // and whose score is below 40
  if (score < 40 && totalEvents > 0) {
    return {
      isAlert: true,
      alertReason: 'Health score dropped below threshold',
    }
  }
  return { isAlert: false, alertReason: null }
}

function tier(score: number, daysSince: number | null, totalEvents: number): ClientHealthTier {
  if (totalEvents === 0) return 'new'
  if (daysSince !== null && daysSince > 365) return 'dormant'
  if (daysSince !== null && daysSince > 180) return 'at_risk'
  if (score >= 70) return 'champion'
  return 'loyal'
}

function medianCalc(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ---- Main action ------------------------------------------------------------

/**
 * Compute health scores for all active clients of the logged-in chef.
 * Returns scores sorted highest first.
 */
export async function getClientHealthScores(): Promise<ClientHealthSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch client financial summary (includes payment and balance data)
  // cast as any: some columns may not be in generated types
  const { data: summaries } = await db
    .from('client_financial_summary')
    .select(
      'client_id, lifetime_value_cents, total_events, days_since_last_event, outstanding_balance_cents, average_tip_percentage'
    )
    .eq('tenant_id', user.tenantId!)

  // Fetch client profile fields for completeness + relationship signals.
  // vibe_notes is already in CLIENT_PROFILE_COMPLETENESS_FIELDS, so no need to add it again.
  const { data: clients } = await db
    .from('clients')
    .select(
      [
        'id',
        'referral_source',
        'referred_by_client_id',
        ...CLIENT_PROFILE_COMPLETENESS_FIELDS,
      ].join(', ')
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  // Fetch referral counts per client (how many new clients they've referred)
  // cast as any: referred_by_client_id not in generated types yet
  const { data: referrals } = await db
    .from('clients')
    .select('referred_by_client_id')
    .eq('tenant_id', user.tenantId!)
    .not('referred_by_client_id', 'is', null)

  const { data: circleProfiles } = await db
    .from('hub_guest_profiles')
    .select('client_id, hub_group_members(group_id)')
    .not('client_id', 'is', null)
    .in('id', db.from('hub_group_members').select('profile_id'))

  const circleCountMap = new Map<string, number>()
  for (const p of circleProfiles ?? []) {
    if (p.client_id) {
      const count = Array.isArray(p.hub_group_members) ? p.hub_group_members.length : 0
      circleCountMap.set(p.client_id, (circleCountMap.get(p.client_id) ?? 0) + count)
    }
  }

  const referralMap = new Map<string, number>()
  for (const r of referrals ?? []) {
    if (r.referred_by_client_id) {
      referralMap.set(r.referred_by_client_id, (referralMap.get(r.referred_by_client_id) ?? 0) + 1)
    }
  }

  const summaryMap = new Map<string, any>()
  for (const s of summaries ?? []) summaryMap.set(s.client_id, s)

  // Compute median LTV across all clients with at least one event
  const ltvValues = ((summaries ?? []) as any[])
    .filter((s: any) => s.total_events > 0)
    .map((s: any) => s.lifetime_value_cents ?? 0)
  const medianLtv = medianCalc(ltvValues)

  const clientMap = new Map<string, any>()
  for (const c of clients ?? []) clientMap.set(c.id, c)

  const allClientIds = new Set([
    ...(summaries ?? []).map((s: any) => s.client_id),
    ...(clients ?? []).map((c: any) => c.id),
  ])

  const scores: ClientHealthScore[] = []

  for (const clientId of allClientIds) {
    const summary = summaryMap.get(clientId)
    const client = clientMap.get(clientId)
    if (!client) continue // skip deleted/inactive

    const totalEvents: number = summary?.total_events ?? 0
    const ltv: number = summary?.lifetime_value_cents ?? 0
    const daysSince: number | null = summary?.days_since_last_event ?? null
    const outstandingCents: number = summary?.outstanding_balance_cents ?? 0
    const avgTipPct: number = summary?.average_tip_percentage ?? 0

    // Frequency: events per year based on account age (rough: total_events / max(1, months/12))
    const eventsPerYear = totalEvents // simplified; can refine with event history

    // Engagement: profile completeness (0-10) + referrals (0-5) + circles (0-3)
    let engScore = getClientProfileEngagementPoints(client, 10)
    const refs = referralMap.get(clientId) ?? 0
    engScore += Math.min(refs * 2, 5)
    const circleCount = circleCountMap.get(clientId) ?? 0
    engScore += Math.min(circleCount * 1, 3)
    engScore = Math.min(engScore, 15)

    // Payment promptness
    const pay = paymentScore(outstandingCents, avgTipPct)

    // Relationship signals
    const rel = relationshipScore({
      hasReferralSource: !!client.referral_source,
      wasReferred: !!client.referred_by_client_id,
      hasDietaryRestrictions:
        Array.isArray(client.dietary_restrictions) && client.dietary_restrictions.length > 0,
      hasUpcomingEvent: daysSince !== null && daysSince <= 30,
      hasNotes: typeof client.vibe_notes === 'string' && client.vibe_notes.trim().length > 0,
    })

    const r = recencyScore(daysSince)
    const f = frequencyScore(eventsPerYear)
    const m = monetaryScore(ltv, medianLtv)
    const totalScore = Math.min(r + f + m + engScore + pay + rel, 100)

    // Trend and alert computation
    const { trend: trendVal, trendReason } = computeTrend(daysSince, totalEvents, outstandingCents)
    const { isAlert, alertReason } = computeAlert(totalScore, totalEvents)

    scores.push({
      clientId,
      score: totalScore,
      tier: tier(totalScore, daysSince, totalEvents),
      recencyScore: r,
      frequencyScore: f,
      monetaryScore: m,
      engagementScore: engScore,
      paymentScore: pay,
      relationshipScore: rel,
      daysSinceLastEvent: daysSince,
      totalEvents,
      lifetimeValueCents: ltv,
      trend: trendVal,
      trendReason,
      isAlert,
      alertReason,
    })
  }

  scores.sort((a, b) => b.score - a.score)

  return {
    scores,
    medianLtv,
    avgEventsPerYear:
      ltvValues.length > 0
        ? (summaries ?? []).reduce((s: number, x: any) => s + (x.total_events ?? 0), 0) /
          ltvValues.length
        : 0,
  }
}

/**
 * Get health score for a single client (used on client detail page).
 */
export async function getSingleClientHealthScore(
  clientId: string
): Promise<ClientHealthScore | null> {
  const summary = await getClientHealthScores()
  return summary.scores.find((s) => s.clientId === clientId) ?? null
}

export async function getHealthScoreDistribution(): Promise<HealthScoreDistribution> {
  const { scores } = await getClientHealthScores()

  if (scores.length === 0) {
    return {
      meanScore: 0,
      tierDistribution: { champion: 0, loyal: 0, at_risk: 0, dormant: 0, new: 0 },
      percentHealthy: 0,
      totalClients: 0,
      alertCount: 0,
    }
  }

  const tierDistribution: Record<ClientHealthTier, number> = {
    champion: 0,
    loyal: 0,
    at_risk: 0,
    dormant: 0,
    new: 0,
  }

  let totalScore = 0
  let alertCount = 0

  for (const s of scores) {
    totalScore += s.score
    tierDistribution[s.tier]++
    if (s.isAlert) alertCount++
  }

  const total = scores.length
  const healthyCount = tierDistribution.champion + tierDistribution.loyal

  return {
    meanScore: Math.round((totalScore / total) * 10) / 10,
    tierDistribution,
    percentHealthy: Math.round((healthyCount / total) * 100),
    totalClients: total,
    alertCount,
  }
}

// TIER_LABELS and TIER_COLORS moved to lib/clients/health-score-utils.ts
// (cannot export non-async values from a 'use server' file)

'use server'

// Client Health Score
// Computes a 0–100 score for each client based on four dimensions:
//   Recency (30pts)  — days since last event
//   Frequency (25pts) — events per year
//   Monetary (25pts)  — lifetime value vs chef median
//   Engagement (20pts) — profile completeness + referrals
//
// Used as a badge on client cards, a filter on the client list,
// and as a trigger condition for automations.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type ClientHealthTier = 'champion' | 'loyal' | 'at_risk' | 'dormant' | 'new'

export type ClientHealthScore = {
  clientId: string
  score: number           // 0–100
  tier: ClientHealthTier
  recencyScore: number    // 0–30
  frequencyScore: number  // 0–25
  monetaryScore: number   // 0–25
  engagementScore: number // 0–20
  daysSinceLastEvent: number | null
  totalEvents: number
  lifetimeValueCents: number
}

export type ClientHealthSummary = {
  scores: ClientHealthScore[]
  medianLtv: number
  avgEventsPerYear: number
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function recencyScore(daysSince: number | null): number {
  if (daysSince === null) return 0 // never had an event
  if (daysSince <= 30) return 30
  if (daysSince <= 60) return 25
  if (daysSince <= 90) return 20
  if (daysSince <= 180) return 12
  if (daysSince <= 365) return 5
  return 0
}

function frequencyScore(eventsPerYear: number): number {
  if (eventsPerYear >= 6) return 25
  if (eventsPerYear >= 4) return 20
  if (eventsPerYear >= 2) return 15
  if (eventsPerYear >= 1) return 10
  if (eventsPerYear >= 0.5) return 5
  return 0
}

function monetaryScore(ltv: number, median: number): number {
  if (median === 0) return ltv > 0 ? 15 : 0
  const ratio = ltv / median
  if (ratio >= 3) return 25
  if (ratio >= 2) return 20
  if (ratio >= 1) return 15
  if (ratio >= 0.5) return 8
  return 3
}

function tier(score: number, daysSince: number | null, totalEvents: number): ClientHealthTier {
  if (totalEvents === 0) return 'new'
  if (daysSince !== null && daysSince > 365) return 'dormant'
  if (daysSince !== null && daysSince > 180) return 'at_risk'
  if (score >= 75) return 'champion'
  return 'loyal'
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── Main action ──────────────────────────────────────────────────────────────

/**
 * Compute health scores for all active clients of the logged-in chef.
 * Returns scores sorted highest first.
 */
export async function getClientHealthScores(): Promise<ClientHealthSummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch client financial summary + event counts
  // cast as any — total_events/days_since_last_event may not be in generated types
  const { data: summaries } = await (supabase as any)
    .from('client_financial_summary')
    .select('client_id, lifetime_value_cents, total_events, days_since_last_event')
    .eq('tenant_id', user.tenantId!)

  // Fetch client profile completeness indicators
  // cast as any — some columns may not be in generated types yet
  const { data: clients } = await (supabase as any)
    .from('clients')
    .select('id, allergies, dietary_preferences, kitchen_constraints, what_they_care_about, personal_milestones')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  // Fetch referral counts per client (how many new clients they've referred)
  // cast as any — referred_by_client_id not in generated types yet
  const { data: referrals } = await (supabase as any)
    .from('clients')
    .select('referred_by_client_id')
    .eq('tenant_id', user.tenantId!)
    .not('referred_by_client_id', 'is', null)

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
  const medianLtv = median(ltvValues)

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

    // Frequency: events per year based on account age (rough: total_events / max(1, months/12))
    const eventsPerYear = totalEvents // simplified — if we have event history we can refine

    // Engagement: profile completeness (0–15) + referrals (0–5)
    let engagementScore = 0
    if (client) {
      if (client.allergies) engagementScore += 4
      if (client.dietary_preferences) engagementScore += 3
      if (client.kitchen_constraints) engagementScore += 3
      if (client.what_they_care_about) engagementScore += 3
      if (client.personal_milestones) engagementScore += 2
    }
    const refs = referralMap.get(clientId) ?? 0
    engagementScore += Math.min(refs * 2, 5) // up to 5 pts for referrals
    engagementScore = Math.min(engagementScore, 20)

    const r = recencyScore(daysSince)
    const f = frequencyScore(eventsPerYear)
    const m = monetaryScore(ltv, medianLtv)
    const totalScore = Math.min(r + f + m + engagementScore, 100)

    scores.push({
      clientId,
      score: totalScore,
      tier: tier(totalScore, daysSince, totalEvents),
      recencyScore: r,
      frequencyScore: f,
      monetaryScore: m,
      engagementScore,
      daysSinceLastEvent: daysSince,
      totalEvents,
      lifetimeValueCents: ltv,
    })
  }

  scores.sort((a, b) => b.score - a.score)

  return {
    scores,
    medianLtv,
    avgEventsPerYear: ltvValues.length > 0
      ? (summaries ?? []).reduce((s: number, x: any) => s + (x.total_events ?? 0), 0) / ltvValues.length
      : 0,
  }
}

/**
 * Get health score for a single client (used on client detail page).
 */
export async function getSingleClientHealthScore(clientId: string): Promise<ClientHealthScore | null> {
  const summary = await getClientHealthScores()
  return summary.scores.find(s => s.clientId === clientId) ?? null
}

// TIER_LABELS and TIER_COLORS moved to lib/clients/health-score-utils.ts
// (cannot export non-async values from a 'use server' file)

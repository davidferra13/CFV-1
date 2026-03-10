'use server'

// Recurring Client Outreach Automation
// Surfaces at-risk and dormant clients, generates deterministic outreach templates,
// and tracks outreach history to prevent spam. Formula > AI: all templates are
// deterministic, no Ollama needed.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getAtRiskClients, type ChurnRisk } from '@/lib/clients/churn-score'
import { getDormantClients, type DormantClientEntry } from '@/lib/clients/dormancy'
import { getClientHealthScores, type ClientHealthTier } from '@/lib/clients/health-score'

// ─── Types ───────────────────────────────────────────────────────────────

export type OutreachCandidate = {
  clientId: string
  clientName: string
  email: string | null
  urgency: 'high' | 'medium' | 'low'
  healthTier: ClientHealthTier
  daysSinceLastEvent: number
  lifetimeValueCents: number
  lastEventDate: string | null
  lastOutreachDate: string | null
  suggestedAction: string
  suggestedMessage: string
}

export type OutreachRecord = {
  id: string
  clientId: string
  clientName: string
  method: 'email' | 'sms' | 'call'
  sentAt: string
  notes: string | null
}

// ─── Deterministic Templates ─────────────────────────────────────────────

const MONTHS_LABELS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'holiday'
}

function getSeasonalHook(): string {
  const season = getCurrentSeason()
  switch (season) {
    case 'spring':
      return 'Spring is a beautiful time for a fresh, seasonal dinner.'
    case 'summer':
      return 'Summer gatherings are the perfect excuse for a great meal.'
    case 'fall':
      return 'Fall is the perfect season for a cozy dinner with friends and family.'
    case 'holiday':
      return 'The holiday season is coming up, and it is the perfect time to plan something special.'
    default:
      return ''
  }
}

function generateOutreachMessage(
  clientName: string,
  daysSince: number,
  tier: ClientHealthTier
): string {
  const firstName = clientName.split(' ')[0] || clientName
  const months = Math.floor(daysSince / 30)
  const seasonalHook = getSeasonalHook()

  if (tier === 'dormant' || daysSince > 180) {
    return (
      `Hi ${firstName}, it has been a while since we last cooked for you (about ${months} months). ` +
      `We would love to reconnect. ${seasonalHook} ` +
      `Would you like to plan something?`
    )
  }

  if (tier === 'at_risk' || daysSince > 90) {
    return (
      `Hi ${firstName}, it has been about ${months} months since your last event. ` +
      `${seasonalHook} ` +
      `Let us know if you would like to book your next experience.`
    )
  }

  return (
    `Hi ${firstName}, we hope you are doing well! ${seasonalHook} ` +
    `We would love to cook for you again. Let us know if you are interested.`
  )
}

// ─── Main Actions ────────────────────────────────────────────────────────

/**
 * Combines at-risk + dormant clients with their health scores,
 * last outreach date, and generates a suggested outreach message.
 */
export async function getOutreachCandidates(): Promise<OutreachCandidate[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch data in parallel
  const [atRiskClients, dormantClients, healthSummary] = await Promise.all([
    getAtRiskClients(),
    getDormantClients(50),
    getClientHealthScores(),
  ])

  // Build health score map
  const healthMap = new Map(healthSummary.scores.map((s) => [s.clientId, s]))

  // Build a combined set of candidate client IDs (deduplicated)
  const candidateMap = new Map<
    string,
    {
      clientId: string
      clientName: string
      daysSinceLastEvent: number
      lifetimeValueCents: number
      lastEventDate: string | null
      urgency: 'high' | 'medium' | 'low'
      source: 'at_risk' | 'dormant'
    }
  >()

  for (const risk of atRiskClients) {
    candidateMap.set(risk.clientId, {
      clientId: risk.clientId,
      clientName: risk.clientName,
      daysSinceLastEvent: risk.daysSinceLastEvent,
      lifetimeValueCents: 0,
      lastEventDate: null,
      urgency: risk.riskLevel,
      source: 'at_risk',
    })
  }

  for (const dormant of dormantClients) {
    if (!candidateMap.has(dormant.clientId)) {
      candidateMap.set(dormant.clientId, {
        clientId: dormant.clientId,
        clientName: dormant.clientName,
        daysSinceLastEvent: dormant.daysSinceLastEvent,
        lifetimeValueCents: dormant.lifetimeValueCents,
        lastEventDate: dormant.lastEventDate,
        urgency: dormant.daysSinceLastEvent > 180 ? 'high' : 'medium',
        source: 'dormant',
      })
    } else {
      // Merge LTV and last event date if we already have this client
      const existing = candidateMap.get(dormant.clientId)!
      existing.lifetimeValueCents = dormant.lifetimeValueCents
      existing.lastEventDate = dormant.lastEventDate
    }
  }

  if (candidateMap.size === 0) return []

  // Fetch emails for all candidates
  const clientIds = [...candidateMap.keys()]
  const { data: clients } = await supabase
    .from('clients')
    .select('id, email')
    .in('id', clientIds)
    .eq('tenant_id', user.tenantId!)

  const emailMap = new Map<string, string | null>(
    (clients ?? []).map((c: any) => [c.id, c.email ?? null])
  )

  // Fetch outreach history (most recent per client)
  const { data: outreachRecords } = await supabase
    .from('client_outreach_log')
    .select('client_id, sent_at')
    .in('client_id', clientIds)
    .eq('tenant_id', user.tenantId!)
    .order('sent_at', { ascending: false })

  const lastOutreachMap = new Map<string, string>()
  for (const record of outreachRecords ?? []) {
    if (!lastOutreachMap.has(record.client_id)) {
      lastOutreachMap.set(record.client_id, record.sent_at)
    }
  }

  // Build final candidates
  const candidates: OutreachCandidate[] = []

  for (const [, candidate] of candidateMap) {
    const health = healthMap.get(candidate.clientId)
    const tier = health?.tier ?? 'at_risk'
    const ltv = health?.lifetimeValueCents ?? candidate.lifetimeValueCents

    candidates.push({
      clientId: candidate.clientId,
      clientName: candidate.clientName,
      email: emailMap.get(candidate.clientId) ?? null,
      urgency: candidate.urgency,
      healthTier: tier,
      daysSinceLastEvent: candidate.daysSinceLastEvent,
      lifetimeValueCents: ltv,
      lastEventDate: candidate.lastEventDate,
      lastOutreachDate: lastOutreachMap.get(candidate.clientId) ?? null,
      suggestedAction:
        candidate.urgency === 'high'
          ? 'Send a personal check-in message'
          : 'Follow up with seasonal menu ideas',
      suggestedMessage: generateOutreachMessage(
        candidate.clientName,
        candidate.daysSinceLastEvent,
        tier
      ),
    })
  }

  // Sort: high urgency first, then by days since last event (descending)
  candidates.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    }
    return b.daysSinceLastEvent - a.daysSinceLastEvent
  })

  return candidates
}

/**
 * Generate outreach suggestions for a list of candidates.
 * Deterministic templates only (Formula > AI).
 */
export async function generateOutreachSuggestions(
  clientIds: string[]
): Promise<Record<string, string>> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .in('id', clientIds)
    .eq('tenant_id', user.tenantId!)

  const healthSummary = await getClientHealthScores()
  const healthMap = new Map(healthSummary.scores.map((s) => [s.clientId, s]))

  const suggestions: Record<string, string> = {}

  for (const client of clients ?? []) {
    const health = healthMap.get(client.id)
    const daysSince = health?.daysSinceLastEvent ?? 180
    const tier = health?.tier ?? 'at_risk'
    suggestions[client.id] = generateOutreachMessage(client.full_name ?? 'there', daysSince, tier)
  }

  return suggestions
}

/**
 * Record that outreach was sent to a client (prevents spam by tracking history).
 */
export async function markOutreachSent(
  clientId: string,
  method: 'email' | 'sms' | 'call',
  notes?: string
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('client_outreach_log').insert({
    tenant_id: user.tenantId!,
    client_id: clientId,
    method,
    sent_at: new Date().toISOString(),
    sent_by: user.id,
    notes: notes ?? null,
  })

  if (error) {
    console.error('[markOutreachSent] Insert failed:', error)
    return { success: false }
  }

  return { success: true }
}

/**
 * Get outreach history for a specific client.
 */
export async function getOutreachHistory(clientId: string): Promise<OutreachRecord[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch client name
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: records } = await supabase
    .from('client_outreach_log')
    .select('id, client_id, method, sent_at, notes')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('sent_at', { ascending: false })
    .limit(50)

  return (records ?? []).map((r: any) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: client?.full_name ?? 'Unknown',
    method: r.method,
    sentAt: r.sent_at,
    notes: r.notes,
  }))
}

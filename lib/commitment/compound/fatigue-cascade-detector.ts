import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { CommitmentDomain } from '../types'
import { DOMAIN_LABELS } from '../types'

// Fatigue Cascade Detector (#25)
// Burnout score combining: override frequency trending up, response time
// degrading, closeout backlog growing, capacity near max.
// Predicts operational crash before it happens.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface FatigueCascadeDetection {
  detected: boolean
  burnoutScore: number // 0-100
  severity: 'low' | 'moderate' | 'high' | 'critical'
  signals: FatigueCascadeSignal[]
  recommendation: string
}

export interface FatigueCascadeSignal {
  factor: 'override_trend' | 'closeout_backlog' | 'capacity_pressure' | 'multi_domain_stress'
  label: string
  score: number // 0-25 each
  detail: string
}

/**
 * Detect fatigue cascade: burnout score from multiple operational signals.
 * Each factor contributes 0-25 points to a 0-100 burnout score.
 *   0-25: low
 *   26-50: moderate
 *   51-75: high
 *   76-100: critical
 */
export async function detectFatigueCascade(tenantId: string): Promise<FatigueCascadeDetection> {
  const client = createServerClient()
  const signals: FatigueCascadeSignal[] = []
  const now = Date.now()

  // Factor 1: Override frequency trending up (compare last 14d vs prior 14d)
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000)
  const twentyEightDaysAgo = new Date(now - 28 * 24 * 60 * 60 * 1000)

  const { data: recentOverrides } = await client
    .from('commitment_overrides' as any)
    .select('id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', fourteenDaysAgo.toISOString())

  const { data: priorOverrides } = await client
    .from('commitment_overrides' as any)
    .select('id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', twentyEightDaysAgo.toISOString())
    .lt('created_at', fourteenDaysAgo.toISOString())

  const recentCount = recentOverrides?.length ?? 0
  const priorCount = priorOverrides?.length ?? 0

  let overrideTrendScore = 0
  if (recentCount > 0 && priorCount === 0) {
    overrideTrendScore = 20
  } else if (priorCount > 0) {
    const ratio = recentCount / priorCount
    if (ratio >= 3) overrideTrendScore = 25
    else if (ratio >= 2) overrideTrendScore = 20
    else if (ratio >= 1.5) overrideTrendScore = 15
    else if (ratio >= 1) overrideTrendScore = 10
    else overrideTrendScore = 5
  }

  signals.push({
    factor: 'override_trend',
    label: 'Override Frequency Trend',
    score: overrideTrendScore,
    detail: `${recentCount} overrides in last 14 days vs ${priorCount} in prior 14 days`,
  })

  // Factor 2: Closeout backlog (active commitments in closeout domain with overrides)
  const { data: closeoutCommitments } = await client
    .from('commitments' as any)
    .select('id, override_count')
    .eq('tenant_id', tenantId)
    .eq('domain', 'closeout')
    .eq('status', 'active')

  const totalUnclosed = (closeoutCommitments ?? []).reduce(
    (sum: number, c: any) => sum + ((c.override_count as number) ?? 0),
    0
  )

  let closeoutScore = 0
  if (totalUnclosed >= 5) closeoutScore = 25
  else if (totalUnclosed >= 3) closeoutScore = 20
  else if (totalUnclosed >= 2) closeoutScore = 15
  else if (totalUnclosed >= 1) closeoutScore = 10

  signals.push({
    factor: 'closeout_backlog',
    label: 'Closeout Backlog',
    score: closeoutScore,
    detail: `${totalUnclosed} closeout overrides across active commitments`,
  })

  // Factor 3: Capacity pressure (capacity domain commitments nearing limits)
  const { data: capacityCommitments } = await client
    .from('commitments' as any)
    .select('id, rule, override_count')
    .eq('tenant_id', tenantId)
    .eq('domain', 'capacity')
    .eq('status', 'active')

  let capacityScore = 0
  const capacityOverrides = (capacityCommitments ?? []).reduce(
    (sum: number, c: any) => sum + ((c.override_count as number) ?? 0),
    0
  )
  if (capacityOverrides >= 4) capacityScore = 25
  else if (capacityOverrides >= 3) capacityScore = 20
  else if (capacityOverrides >= 2) capacityScore = 15
  else if (capacityOverrides >= 1) capacityScore = 10

  signals.push({
    factor: 'capacity_pressure',
    label: 'Capacity Pressure',
    score: capacityScore,
    detail: `${capacityOverrides} capacity commitment overrides`,
  })

  // Factor 4: Multi-domain stress (how many domains have recent overrides)
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const { data: recentAllOverrides } = await client
    .from('commitment_overrides' as any)
    .select('commitment_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  let multiDomainScore = 0
  if (recentAllOverrides && recentAllOverrides.length > 0) {
    const commitmentIds = [...new Set(recentAllOverrides.map((o: any) => o.commitment_id as string))]

    const { data: commitmentDomains } = await client
      .from('commitments' as any)
      .select('id, domain')
      .eq('tenant_id', tenantId)
      .in('id', commitmentIds)

    const uniqueDomains = new Set(
      (commitmentDomains ?? []).map((c: any) => c.domain as CommitmentDomain)
    )

    if (uniqueDomains.size >= 5) multiDomainScore = 25
    else if (uniqueDomains.size >= 4) multiDomainScore = 20
    else if (uniqueDomains.size >= 3) multiDomainScore = 15
    else if (uniqueDomains.size >= 2) multiDomainScore = 10
    else if (uniqueDomains.size >= 1) multiDomainScore = 5
  }

  signals.push({
    factor: 'multi_domain_stress',
    label: 'Multi-Domain Stress',
    score: multiDomainScore,
    detail: `Overrides spread across domains in the last 30 days`,
  })

  const burnoutScore = signals.reduce((sum, s) => sum + s.score, 0)

  let severity: 'low' | 'moderate' | 'high' | 'critical'
  if (burnoutScore <= 25) severity = 'low'
  else if (burnoutScore <= 50) severity = 'moderate'
  else if (burnoutScore <= 75) severity = 'high'
  else severity = 'critical'

  let recommendation: string
  if (severity === 'critical') {
    recommendation = 'Block new bookings immediately. Clear closeout backlog and review all active commitments.'
  } else if (severity === 'high') {
    recommendation = 'Reduce booking rate this week. Prioritize clearing overdue closeouts.'
  } else if (severity === 'moderate') {
    recommendation = 'Review override patterns. Consider whether workload adjustments are needed.'
  } else {
    recommendation = 'Operations are sustainable. Continue monitoring.'
  }

  return {
    detected: burnoutScore > 25,
    burnoutScore,
    severity,
    signals,
    recommendation,
  }
}

/**
 * Convert fatigue cascade detection into CIL proactive signals.
 */
export async function analyzeFatigueCascadeSignals(tenantId: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = []
  const cascade = await detectFatigueCascade(tenantId)

  if (!cascade.detected) return signals

  const urgencyMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
    low: 1,
    moderate: 2,
    high: 4,
    critical: 5,
  }

  const activeFactors = cascade.signals
    .filter((s) => s.score > 10)
    .map((s) => s.label)
    .join(', ')

  signals.push({
    id: generateId(),
    domain: 'commitment',
    urgency: urgencyMap[cascade.severity],
    confidence: Math.min(0.5 + cascade.burnoutScore / 200, 0.95),
    title: `Fatigue cascade: burnout score ${cascade.burnoutScore}/100`,
    detail: `Operational stress indicators are elevated. Contributing factors: ${activeFactors}. ${cascade.recommendation}`,
    suggestedAction: cascade.recommendation,
    actionType: 'navigate',
    actionPayload: { path: '/analytics/intelligence' },
    entityIds: [],
    source: 'commitment.fatigue_cascade',
    createdAt: Date.now(),
  })

  return signals
}

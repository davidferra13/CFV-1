import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '@/lib/cil/types'

// New Client Risk Detector (#26)
// First-time client events have higher override rates.
// Compares override rates for first-time vs repeat clients and
// suggests stricter commitments for first engagements.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface NewClientRiskDetection {
  detected: boolean
  firstTimeOverrideRate: number // 0.0-1.0
  repeatOverrideRate: number // 0.0-1.0
  riskMultiplier: number // how much higher is first-time rate
  firstTimeEventCount: number
  repeatEventCount: number
  severity: 'low' | 'moderate' | 'high'
  recommendation: string
}

/**
 * Detect whether first-time client events produce more overrides than repeat clients.
 * Queries commitment_overrides with event context to segment by client history.
 */
export async function detectNewClientRisk(tenantId: string): Promise<NewClientRiskDetection> {
  const client = createServerClient()

  // Get overrides from the last 90 days that have event context
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('id, context, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo)

  if (!overrides || overrides.length === 0) {
    return {
      detected: false,
      firstTimeOverrideRate: 0,
      repeatOverrideRate: 0,
      riskMultiplier: 1,
      firstTimeEventCount: 0,
      repeatEventCount: 0,
      severity: 'low',
      recommendation: 'Not enough data to assess new client risk.',
    }
  }

  // Partition overrides by client type from context
  let firstTimeOverrides = 0
  let repeatOverrides = 0
  const firstTimeEvents = new Set<string>()
  const repeatEvents = new Set<string>()

  for (const o of overrides) {
    const ctx = o.context as Record<string, unknown> | null
    if (!ctx || !ctx.eventId) continue

    const eventId = ctx.eventId as string
    const isFirstTime = ctx.isFirstTimeClient === true

    if (isFirstTime) {
      firstTimeOverrides++
      firstTimeEvents.add(eventId)
    } else {
      repeatOverrides++
      repeatEvents.add(eventId)
    }
  }

  const firstTimeEventCount = firstTimeEvents.size
  const repeatEventCount = repeatEvents.size

  // Calculate rates (overrides per event)
  const firstTimeRate = firstTimeEventCount > 0 ? firstTimeOverrides / firstTimeEventCount : 0
  const repeatRate = repeatEventCount > 0 ? repeatOverrides / repeatEventCount : 0

  const riskMultiplier = repeatRate > 0 ? firstTimeRate / repeatRate : firstTimeRate > 0 ? 2 : 1

  let severity: 'low' | 'moderate' | 'high'
  if (riskMultiplier >= 2.5) severity = 'high'
  else if (riskMultiplier >= 1.5) severity = 'moderate'
  else severity = 'low'

  let recommendation: string
  if (severity === 'high') {
    recommendation = 'First-time clients generate significantly more overrides. Consider stricter commitments (higher friction tiers) for initial engagements until a working relationship is established.'
  } else if (severity === 'moderate') {
    recommendation = 'First-time clients show elevated override rates. Review which commitment domains are most affected and consider event-specific contracts for new clients.'
  } else {
    recommendation = 'Override rates are comparable between new and repeat clients. No adjustment needed.'
  }

  return {
    detected: riskMultiplier >= 1.5 && firstTimeEventCount >= 2,
    firstTimeOverrideRate: Math.round(firstTimeRate * 100) / 100,
    repeatOverrideRate: Math.round(repeatRate * 100) / 100,
    riskMultiplier: Math.round(riskMultiplier * 100) / 100,
    firstTimeEventCount,
    repeatEventCount,
    severity,
    recommendation,
  }
}

/**
 * Convert new client risk detection into CIL proactive signals.
 */
export async function analyzeNewClientRiskSignals(tenantId: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = []
  const risk = await detectNewClientRisk(tenantId)

  if (!risk.detected) return signals

  const urgencyMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
    low: 1,
    moderate: 3,
    high: 4,
  }

  signals.push({
    id: generateId(),
    domain: 'commitment',
    urgency: urgencyMap[risk.severity],
    confidence: Math.min(0.6 + (risk.firstTimeEventCount / 20), 0.9),
    title: 'New client risk: ' + risk.riskMultiplier + 'x higher override rate',
    detail: 'First-time client events average ' + risk.firstTimeOverrideRate + ' overrides per event vs ' + risk.repeatOverrideRate + ' for repeat clients (' + risk.firstTimeEventCount + ' first-time events, ' + risk.repeatEventCount + ' repeat events in 90 days). ' + risk.recommendation,
    suggestedAction: risk.recommendation,
    actionType: 'navigate',
    actionPayload: { path: '/analytics/intelligence' },
    entityIds: [],
    source: 'commitment.new_client_risk',
    createdAt: Date.now(),
  })

  return signals
}

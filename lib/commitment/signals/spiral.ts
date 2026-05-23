import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { CommitmentDomain } from '../types'
import { DOMAIN_LABELS } from '../types'

// ── Compound Signal: Spiral Detector ────────────────────────────────────────
// Overrides across 3+ domains within a 2-week window = spiral alert.
// This is a leading indicator of systemic breakdown: when a chef starts
// cutting corners in multiple areas simultaneously, each compromise
// makes the next one easier.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface SpiralDetection {
  detected: boolean
  affectedDomains: CommitmentDomain[]
  overrideCount: number
  windowDays: number
  severity: 'warning' | 'urgent' | 'critical'
}

/**
 * Detect override spirals: 3+ domains overridden within 14 days.
 * Returns a SpiralDetection with severity based on domain count:
 *   3 domains = warning
 *   4-5 domains = urgent
 *   6+ domains = critical
 */
export async function detectSpiral(tenantId: string): Promise<SpiralDetection> {
  const client = createServerClient()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('commitment_id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', fourteenDaysAgo.toISOString())

  if (!overrides || overrides.length === 0) {
    return { detected: false, affectedDomains: [], overrideCount: 0, windowDays: 14, severity: 'warning' }
  }

  // Get commitment domains
  const commitmentIds = [...new Set(overrides.map((o: any) => o.commitment_id as string))]

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain')
    .in('id', commitmentIds)
    .eq('tenant_id', tenantId)

  if (!commitments) {
    return { detected: false, affectedDomains: [], overrideCount: 0, windowDays: 14, severity: 'warning' }
  }

  const commitmentDomainMap = new Map<string, CommitmentDomain>()
  for (const c of commitments) {
    commitmentDomainMap.set(c.id as string, c.domain as CommitmentDomain)
  }

  // Collect unique domains with overrides in the window
  const affectedDomains = new Set<CommitmentDomain>()
  for (const o of overrides) {
    const domain = commitmentDomainMap.get(o.commitment_id as string)
    if (domain) affectedDomains.add(domain)
  }

  const domainArray = [...affectedDomains]
  const detected = domainArray.length >= 3

  let severity: 'warning' | 'urgent' | 'critical' = 'warning'
  if (domainArray.length >= 6) severity = 'critical'
  else if (domainArray.length >= 4) severity = 'urgent'

  return {
    detected,
    affectedDomains: domainArray,
    overrideCount: overrides.length,
    windowDays: 14,
    severity,
  }
}

/**
 * Analyze for spiral patterns and emit CIL proactive signals.
 * Called by the CIL analyzer pipeline.
 */
export async function analyzeSpiralSignals(tenantId: string): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = []
  const now = Date.now()

  const spiral = await detectSpiral(tenantId)
  if (!spiral.detected) return signals

  const domainLabels = spiral.affectedDomains
    .map((d) => DOMAIN_LABELS[d])
    .join(', ')

  const urgencyMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
    warning: 3,
    urgent: 4,
    critical: 5,
  }

  signals.push({
    id: generateId(),
    domain: 'commitment',
    urgency: urgencyMap[spiral.severity],
    confidence: 0.85,
    title: `Override spiral: ${spiral.affectedDomains.length} domains in 2 weeks`,
    detail: `${spiral.overrideCount} overrides across ${spiral.affectedDomains.length} domains (${domainLabels}) in the last 14 days. Overrides in multiple areas at once often compound into larger problems.`,
    suggestedAction:
      spiral.severity === 'critical'
        ? 'Pause new bookings and review all active commitments immediately'
        : spiral.severity === 'urgent'
          ? 'Block time this week to review override patterns and address root causes'
          : 'Review which domains are under pressure and whether workload adjustments are needed',
    actionType: 'navigate',
    actionPayload: { path: '/analytics/intelligence' },
    entityIds: [],
    source: 'commitment.spiral',
    createdAt: now,
  })

  return signals
}

import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, CommitmentIntegrityScore } from './types'
import { DOMAIN_SEVERITY_ORDER } from './types'

const SEVERITY_WEIGHTS: Partial<Record<CommitmentDomain, number>> = {
  dietary: 3,
  contingency: 2,
}

function getWeight(domain: CommitmentDomain): number {
  return SEVERITY_WEIGHTS[domain] ?? 1
}

export async function calculateIntegrityScore(tenantId: string): Promise<CommitmentIntegrityScore> {
  const client = createServerClient()

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!commitments || commitments.length === 0) {
    return { overall: 100, byDomain: {}, trend: 'stable', windowDays: 90 }
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('commitment_id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo.toISOString())

  const allOverrides = overrides ?? []

  // Map commitment_id to domain
  const commitmentDomainMap = new Map<string, CommitmentDomain>()
  for (const c of commitments) {
    commitmentDomainMap.set(c.id as string, c.domain as CommitmentDomain)
  }

  // Group overrides by domain with unique days
  const domainOverrideDays = new Map<CommitmentDomain, Set<string>>()
  const domainOverrideDaysLast30 = new Map<CommitmentDomain, Set<string>>()
  const domainOverrideDaysPrev30 = new Map<CommitmentDomain, Set<string>>()

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000

  for (const o of allOverrides) {
    const domain = commitmentDomainMap.get(o.commitment_id as string)
    if (!domain) continue

    const createdAt = new Date(o.created_at as string)
    const dayKey = createdAt.toISOString().slice(0, 10)

    if (!domainOverrideDays.has(domain)) domainOverrideDays.set(domain, new Set())
    domainOverrideDays.get(domain)!.add(dayKey)

    if (createdAt.getTime() > thirtyDaysAgo) {
      if (!domainOverrideDaysLast30.has(domain)) domainOverrideDaysLast30.set(domain, new Set())
      domainOverrideDaysLast30.get(domain)!.add(dayKey)
    } else if (createdAt.getTime() > sixtyDaysAgo) {
      if (!domainOverrideDaysPrev30.has(domain)) domainOverrideDaysPrev30.set(domain, new Set())
      domainOverrideDaysPrev30.get(domain)!.add(dayKey)
    }
  }

  // Per-domain scores
  const byDomain: Partial<Record<CommitmentDomain, number>> = {}
  const activeDomains = new Set<CommitmentDomain>()
  for (const c of commitments) {
    activeDomains.add(c.domain as CommitmentDomain)
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const domain of activeDomains) {
    const uniqueDays = domainOverrideDays.get(domain)?.size ?? 0
    const score = Math.max(0, Math.min(100, ((90 - uniqueDays) / 90) * 100))
    byDomain[domain] = Math.round(score * 10) / 10

    const weight = getWeight(domain)
    weightedSum += score * weight
    totalWeight += weight
  }

  const overall = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 100

  // Trend: compare last 30 days to previous 30 days (days 31-60)
  let last30Total = 0
  let prev30Total = 0
  for (const domain of activeDomains) {
    const last30Days = domainOverrideDaysLast30.get(domain)?.size ?? 0
    const prev30Days = domainOverrideDaysPrev30.get(domain)?.size ?? 0
    const w = getWeight(domain)
    // Score for 30-day window (scaled to 30 days)
    last30Total += ((30 - last30Days) / 30) * 100 * w
    prev30Total += ((30 - prev30Days) / 30) * 100 * w
  }

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (totalWeight > 0) {
    const last30Score = last30Total / totalWeight
    const prev30Score = prev30Total / totalWeight
    if (last30Score > prev30Score + 5) trend = 'improving'
    else if (last30Score < prev30Score - 5) trend = 'declining'
  }

  return { overall, byDomain, trend, windowDays: 90 }
}

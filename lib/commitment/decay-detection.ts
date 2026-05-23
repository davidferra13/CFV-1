import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from '@/lib/commitment/types'
import { DOMAIN_LABELS } from '@/lib/commitment/types'

// Commitment Decay Detection (#51)
// Detects gradual threshold erosion: floor creeping down, override frequency
// increasing, friction tier ineffectiveness, commitment abandonment.

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id, tenantId: row.tenant_id, domain: row.domain, source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status, frictionLevel: row.friction_level, overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak, longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter, seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
  }
}

export type DecaySignal = 'floor-creep' | 'frequency-increase' | 'friction-ineffective' | 'abandoned' | 'streak-collapse'

export interface DecayIndicator {
  commitmentId: string
  domain: CommitmentDomain
  domainLabel: string
  signal: DecaySignal
  severity: 'low' | 'medium' | 'high' | 'critical'
  detail: string
  evidence: Record<string, unknown>
}

export interface DecayReport {
  tenantId: string
  decaying: DecayIndicator[]
  healthy: number
  totalCommitments: number
  overallDecayRisk: number
  summary: string
}

export interface ErosionTrend {
  domain: CommitmentDomain
  domainLabel: string
  periods: { period: string; overrideCount: number; avgFriction: number }[]
  direction: 'eroding' | 'stable' | 'strengthening'
}

/**
 * Detect decay across all active commitments.
 */
export async function detectDecay(tenantId: string): Promise<DecayIndicator[]> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!commitmentRows || commitmentRows.length === 0) return []

  const commitments = (commitmentRows as any[]).map(mapCommitmentRow)
  const indicators: DecayIndicator[] = []
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

  for (const c of commitments) {
    const { data: overrideRows } = await client
      .from('commitment_overrides' as any)
      .select('id, created_at, friction_tier_at_override')
      .eq('commitment_id', c.id)
      .order('created_at', { ascending: false })

    const overrides = (overrideRows ?? []) as any[]

    // Signal 1: Frequency increase
    const recentOverrides = overrides.filter((o) => new Date(o.created_at).getTime() > thirtyDaysAgo).length
    const olderOverrides = overrides.filter((o) => {
      const t = new Date(o.created_at).getTime()
      return t > sixtyDaysAgo && t <= thirtyDaysAgo
    }).length

    if (recentOverrides > olderOverrides && recentOverrides >= 3) {
      indicators.push({
        commitmentId: c.id, domain: c.domain, domainLabel: DOMAIN_LABELS[c.domain] ?? c.domain,
        signal: 'frequency-increase', severity: recentOverrides >= 5 ? 'high' : 'medium',
        detail: 'Override frequency increasing: ' + recentOverrides + ' in last 30 days vs ' + olderOverrides + ' in prior 30 days.',
        evidence: { recentOverrides, olderOverrides },
      })
    }

    // Signal 2: Friction tier ineffectiveness
    if (c.frictionLevel >= 3 && recentOverrides >= 2) {
      indicators.push({
        commitmentId: c.id, domain: c.domain, domainLabel: DOMAIN_LABELS[c.domain] ?? c.domain,
        signal: 'friction-ineffective', severity: c.frictionLevel >= 4 ? 'high' : 'medium',
        detail: 'Friction tier ' + c.frictionLevel + ' is not preventing overrides (' + recentOverrides + ' in 30 days).',
        evidence: { frictionLevel: c.frictionLevel, recentOverrides },
      })
    }

    // Signal 3: Abandoned
    if (c.currentStreak === 0 && c.overrideCount >= 5) {
      const last90Overrides = overrides.filter((o) => new Date(o.created_at).getTime() > ninetyDaysAgo).length
      if (last90Overrides >= 5) {
        indicators.push({
          commitmentId: c.id, domain: c.domain, domainLabel: DOMAIN_LABELS[c.domain] ?? c.domain,
          signal: 'abandoned', severity: 'critical',
          detail: 'Effectively abandoned: ' + last90Overrides + ' overrides in 90 days, zero streak. Consider retiring or resetting.',
          evidence: { last90Overrides, totalOverrides: c.overrideCount, currentStreak: 0 },
        })
      }
    }

    // Signal 4: Streak collapse
    if (c.longestStreak >= 14 && c.currentStreak === 0 && c.lastOverrideAt) {
      const daysSinceOverride = (now - c.lastOverrideAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceOverride < 14) {
        indicators.push({
          commitmentId: c.id, domain: c.domain, domainLabel: DOMAIN_LABELS[c.domain] ?? c.domain,
          signal: 'streak-collapse', severity: c.longestStreak >= 30 ? 'high' : 'medium',
          detail: 'Streak collapsed from ' + c.longestStreak + ' days to 0. Recent override ' + Math.round(daysSinceOverride) + ' days ago.',
          evidence: { longestStreak: c.longestStreak, currentStreak: 0, daysSinceOverride: Math.round(daysSinceOverride) },
        })
      }
    }
  }

  return indicators
}

/**
 * Get a full decay report with summary.
 */
export async function getDecayReport(tenantId: string): Promise<DecayReport> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const totalCommitments = (commitmentRows ?? []).length
  const indicators = await detectDecay(tenantId)
  const decayingIds = new Set(indicators.map((i) => i.commitmentId))
  const healthy = totalCommitments - decayingIds.size

  const severityWeights: Record<string, number> = { low: 5, medium: 15, high: 25, critical: 40 }
  const totalWeight = indicators.reduce((s, i) => s + (severityWeights[i.severity] ?? 0), 0)
  const overallDecayRisk = Math.min(100, Math.round(totalCommitments > 0 ? (totalWeight / totalCommitments) * 10 : 0))

  let summary: string
  if (indicators.length === 0) {
    summary = 'All commitments are healthy. No decay detected.'
  } else if (overallDecayRisk >= 60) {
    summary = 'Significant decay detected: ' + decayingIds.size + ' of ' + totalCommitments + ' commitments showing erosion. Immediate review recommended.'
  } else if (overallDecayRisk >= 30) {
    summary = 'Moderate decay: ' + decayingIds.size + ' commitment(s) showing signs of erosion. Schedule a review this week.'
  } else {
    summary = 'Minor decay: ' + decayingIds.size + ' commitment(s) with early warning signs. Monitor over the next few weeks.'
  }

  return { tenantId, decaying: indicators, healthy, totalCommitments, overallDecayRisk, summary }
}

/**
 * Get erosion trends for a specific domain over time.
 */
export async function getErosionTrends(tenantId: string, domain: CommitmentDomain): Promise<ErosionTrend> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('domain', domain)

  const commitmentIds = ((commitmentRows ?? []) as any[]).map((c) => c.id as string)

  if (commitmentIds.length === 0) {
    return { domain, domainLabel: DOMAIN_LABELS[domain] ?? domain, periods: [], direction: 'stable' }
  }

  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('created_at, friction_tier_at_override')
    .in('commitment_id', commitmentIds)
    .order('created_at', { ascending: true })

  const overrides = (overrideRows ?? []) as any[]
  const periods: { period: string; overrideCount: number; avgFriction: number }[] = []
  const now = Date.now()

  for (let i = 5; i >= 0; i--) {
    const periodStart = now - (i + 1) * 30 * 24 * 60 * 60 * 1000
    const periodEnd = now - i * 30 * 24 * 60 * 60 * 1000

    const periodOverrides = overrides.filter((o) => {
      const t = new Date(o.created_at).getTime()
      return t >= periodStart && t < periodEnd
    })

    const avgFriction = periodOverrides.length > 0
      ? Math.round((periodOverrides.reduce((s: number, o: any) => s + ((o.friction_tier_at_override as number) ?? 1), 0) / periodOverrides.length) * 10) / 10
      : 0

    const startDate = new Date(periodStart)
    const periodLabel = startDate.getFullYear() + '-' + (startDate.getMonth() + 1).toString().padStart(2, '0')

    periods.push({ period: periodLabel, overrideCount: periodOverrides.length, avgFriction })
  }

  let direction: ErosionTrend['direction'] = 'stable'
  if (periods.length >= 3) {
    const recent = periods.slice(-2)
    const older = periods.slice(0, 2)
    const recentAvg = recent.reduce((s, p) => s + p.overrideCount, 0) / recent.length
    const olderAvg = older.reduce((s, p) => s + p.overrideCount, 0) / older.length
    if (recentAvg > olderAvg + 1) direction = 'eroding'
    else if (recentAvg < olderAvg - 1) direction = 'strengthening'
  }

  return { domain, domainLabel: DOMAIN_LABELS[domain] ?? domain, periods, direction }
}

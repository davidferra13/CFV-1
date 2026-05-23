import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain } from './types'

// Override-Then-Issue Correlation (#29, CIL Pattern 6)
// Correlate overrides with post-event issues to prove
// that overrides have real consequences.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface OverrideIssueCorrelation {
  overrideId: string
  commitmentId: string
  domain: CommitmentDomain
  overrideReason: string
  overrideDate: Date
  eventId: string | null
  issueFound: boolean
  issueDescription: string | null
  issueDate: Date | null
  daysBetween: number | null
}

export interface CorrelationReport {
  totalOverrides: number
  overridesWithIssues: number
  correlationRate: number // 0.0-1.0
  byDomain: Partial<Record<CommitmentDomain, DomainCorrelation>>
  topConsequences: ConsequenceSummary[]
  lookbackDays: number
}

export interface DomainCorrelation {
  domain: CommitmentDomain
  overrideCount: number
  issueCount: number
  correlationRate: number
}

export interface ConsequenceSummary {
  domain: CommitmentDomain
  ruleType: string
  issueCount: number
  avgDaysBetween: number
  sample: string // a representative issue description
}

export interface OverrideConsequenceScore {
  commitmentId: string
  domain: CommitmentDomain
  score: number // 0-100, higher = overrides more dangerous
  totalOverrides: number
  issuesFollowing: number
  label: string
}

/**
 * Correlate overrides with post-event issues.
 * Queries overrides and looks for issues (recorded in event data or CIL signals)
 * that occurred within 14 days after the override.
 */
export async function correlateOverridesWithIssues(
  tenantId: string,
  lookbackDays: number = 90
): Promise<OverrideIssueCorrelation[]> {
  const client = createServerClient()
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  // Get overrides
  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('id, commitment_id, reason, context, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (!overrideRows || overrideRows.length === 0) return []

  // Get commitment domains
  const commitmentIds = [...new Set(overrideRows.map((o: any) => o.commitment_id as string))]
  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id, domain, rule')
    .eq('tenant_id', tenantId)
    .in('id', commitmentIds)

  const commitmentMap = new Map<string, { domain: CommitmentDomain; rule: Record<string, any> }>()
  for (const c of commitmentRows ?? []) {
    commitmentMap.set(c.id as string, {
      domain: c.domain as CommitmentDomain,
      rule: c.rule as Record<string, any>,
    })
  }

  const correlations: OverrideIssueCorrelation[] = []

  for (const override of overrideRows) {
    const ctx = override.context as Record<string, unknown> | null
    const eventId = (ctx?.eventId as string) ?? null
    const commitment = commitmentMap.get(override.commitment_id as string)
    if (!commitment) continue

    const overrideDate = new Date(override.created_at as string)
    const windowEnd = new Date(overrideDate.getTime() + 14 * 24 * 60 * 60 * 1000)

    let issueFound = false
    let issueDescription: string | null = null
    let issueDate: Date | null = null
    let daysBetween: number | null = null

    // Check if the override context recorded a consequence
    if (ctx?.consequence) {
      issueFound = true
      issueDescription = ctx.consequence as string
      issueDate = ctx.consequenceDate ? new Date(ctx.consequenceDate as string) : overrideDate
      daysBetween = Math.round(
        (issueDate.getTime() - overrideDate.getTime()) / (24 * 60 * 60 * 1000)
      )
    }

    // Check for cascade: more overrides in the same domain within 14 days
    if (!issueFound) {
      const { data: followUpOverrides } = await client
        .from('commitment_overrides' as any)
        .select('id, commitment_id, created_at')
        .eq('tenant_id', tenantId)
        .neq('id', override.id)
        .gte('created_at', overrideDate.toISOString())
        .lte('created_at', windowEnd.toISOString())

      // Filter to same domain
      if (followUpOverrides && followUpOverrides.length > 0) {
        for (const follow of followUpOverrides) {
          const followCommitment = commitmentMap.get(follow.commitment_id as string)
          if (followCommitment && followCommitment.domain === commitment.domain) {
            issueFound = true
            issueDescription = 'Cascade: additional override in ' + commitment.domain + ' domain'
            issueDate = new Date(follow.created_at as string)
            daysBetween = Math.round(
              (issueDate.getTime() - overrideDate.getTime()) / (24 * 60 * 60 * 1000)
            )
            break
          }
        }
      }
    }

    correlations.push({
      overrideId: override.id as string,
      commitmentId: override.commitment_id as string,
      domain: commitment.domain,
      overrideReason: override.reason as string,
      overrideDate,
      eventId,
      issueFound,
      issueDescription,
      issueDate,
      daysBetween,
    })
  }

  return correlations
}

/**
 * Generate a correlation report summarizing override consequences.
 */
export async function getCorrelationReport(
  tenantId: string,
  lookbackDays: number = 90
): Promise<CorrelationReport> {
  const correlations = await correlateOverridesWithIssues(tenantId, lookbackDays)

  const totalOverrides = correlations.length
  const overridesWithIssues = correlations.filter((c) => c.issueFound).length
  const correlationRate = totalOverrides > 0 ? overridesWithIssues / totalOverrides : 0

  // Group by domain
  const byDomain: Partial<Record<CommitmentDomain, DomainCorrelation>> = {}
  for (const c of correlations) {
    if (!byDomain[c.domain]) {
      byDomain[c.domain] = {
        domain: c.domain,
        overrideCount: 0,
        issueCount: 0,
        correlationRate: 0,
      }
    }
    byDomain[c.domain]!.overrideCount++
    if (c.issueFound) byDomain[c.domain]!.issueCount++
  }

  // Calculate per-domain correlation rates
  for (const dc of Object.values(byDomain)) {
    if (dc) {
      dc.correlationRate = dc.overrideCount > 0 ? dc.issueCount / dc.overrideCount : 0
    }
  }

  // Top consequences: group by domain, pick highest-issue domains
  const topConsequences: ConsequenceSummary[] = []
  const issueCorrelations = correlations.filter((c) => c.issueFound)

  const domainGroups = new Map<CommitmentDomain, OverrideIssueCorrelation[]>()
  for (const c of issueCorrelations) {
    const group = domainGroups.get(c.domain) ?? []
    group.push(c)
    domainGroups.set(c.domain, group)
  }

  for (const [domain, group] of domainGroups) {
    const avgDays = group.reduce((sum, c) => sum + (c.daysBetween ?? 0), 0) / group.length
    topConsequences.push({
      domain,
      ruleType: domain,
      issueCount: group.length,
      avgDaysBetween: Math.round(avgDays * 10) / 10,
      sample: group[0].issueDescription ?? 'Issue detected after override',
    })
  }

  topConsequences.sort((a, b) => b.issueCount - a.issueCount)

  return {
    totalOverrides,
    overridesWithIssues,
    correlationRate: Math.round(correlationRate * 100) / 100,
    byDomain,
    topConsequences: topConsequences.slice(0, 5),
    lookbackDays,
  }
}

/**
 * Get a per-commitment consequence score: how dangerous is it to override this commitment?
 * Score 0-100: higher = overrides in this commitment more often lead to issues.
 */
export async function getOverrideConsequenceScore(
  tenantId: string,
  commitmentId: string
): Promise<OverrideConsequenceScore | null> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id, domain')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!commitmentRows || commitmentRows.length === 0) return null

  const domain = commitmentRows[0].domain as CommitmentDomain

  // Get all overrides for this commitment
  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('id, context, created_at')
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)

  const overrides = overrideRows ?? []
  if (overrides.length === 0) {
    return {
      commitmentId,
      domain,
      score: 0,
      totalOverrides: 0,
      issuesFollowing: 0,
      label: 'No override history',
    }
  }

  // Count overrides that have consequences recorded in context
  let issuesFollowing = 0
  for (const o of overrides) {
    const ctx = o.context as Record<string, unknown> | null
    if (ctx?.consequence) issuesFollowing++
  }

  const rate = issuesFollowing / overrides.length
  const score = Math.round(rate * 100)

  let label: string
  if (score >= 70) label = 'High consequence: most overrides lead to issues'
  else if (score >= 40) label = 'Moderate consequence: some overrides cause problems'
  else if (score > 0) label = 'Low consequence: occasional issues after override'
  else label = 'No recorded consequences from overrides'

  return {
    commitmentId,
    domain,
    score,
    totalOverrides: overrides.length,
    issuesFollowing,
    label,
  }
}

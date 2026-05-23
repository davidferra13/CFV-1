import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from '@/lib/commitment/types'
import { DOMAIN_LABELS } from '@/lib/commitment/types'

// Commitment Cockpit (#11)
// Server-side data aggregation for the cockpit dashboard widget.
// Pure data, no UI.

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

export interface DomainHealth {
  domain: CommitmentDomain
  label: string
  score: number
  trend: 'improving' | 'stable' | 'declining'
  commitmentCount: number
  overridesLast30: number
}

export interface ActiveStreak {
  commitmentId: string
  domain: CommitmentDomain
  domainLabel: string
  ruleType: string
  streakDays: number
}

export interface RecentOverride {
  id: string
  commitmentId: string
  domain: CommitmentDomain
  domainLabel: string
  ruleType: string
  category: string | null
  reason: string
  createdAt: Date
}

export interface SystemSuggestion {
  type: 'warning' | 'improvement' | 'celebration'
  title: string
  detail: string
  priority: number
}

export interface CockpitData {
  overallIntegrityScore: number
  domainHealthGrid: DomainHealth[]
  activeStreaks: ActiveStreak[]
  recentOverrides: RecentOverride[]
  systemSuggestions: SystemSuggestion[]
  pressureGauge: number
  totalCommitments: number
  activeCommitments: number
}

/**
 * Get all cockpit data in a single call for the dashboard widget.
 */
export async function getCockpitData(tenantId: string): Promise<CockpitData> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)

  const allCommitments = ((commitmentRows ?? []) as any[]).map(mapCommitmentRow)
  const activeCommitments = allCommitments.filter((c) => c.status === 'active')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('id, commitment_id, category, reason, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  const overrides = (overrideRows ?? []) as any[]

  const commitmentMap = new Map<string, Commitment>()
  for (const c of allCommitments) commitmentMap.set(c.id, c)

  // Domain Health Grid
  const domainHealthGrid: DomainHealth[] = []
  const domainGroups = new Map<CommitmentDomain, Commitment[]>()
  for (const c of activeCommitments) {
    const arr = domainGroups.get(c.domain) ?? []
    arr.push(c)
    domainGroups.set(c.domain, arr)
  }

  for (const [domain, domainCmts] of domainGroups) {
    const overridesLast30 = overrides.filter((o) => {
      const c = commitmentMap.get(o.commitment_id as string)
      return c?.domain === domain && new Date(o.created_at).getTime() > thirtyDaysAgo.getTime()
    }).length

    const overridesLast60 = overrides.filter((o) => {
      const c = commitmentMap.get(o.commitment_id as string)
      const t = new Date(o.created_at).getTime()
      return c?.domain === domain && t > sixtyDaysAgo.getTime() && t <= thirtyDaysAgo.getTime()
    }).length

    const avgStreak = domainCmts.reduce((s, c) => s + c.currentStreak, 0) / domainCmts.length
    const streakBonus = Math.min(20, Math.round(avgStreak / 3))
    const overridePenalty = overridesLast30 * 12
    const score = Math.max(0, Math.min(100, 80 + streakBonus - overridePenalty))

    let trend: DomainHealth['trend'] = 'stable'
    if (overridesLast30 < overridesLast60) trend = 'improving'
    else if (overridesLast30 > overridesLast60) trend = 'declining'

    domainHealthGrid.push({ domain, label: DOMAIN_LABELS[domain] ?? domain, score, trend, commitmentCount: domainCmts.length, overridesLast30 })
  }

  domainHealthGrid.sort((a, b) => a.score - b.score)

  const overallIntegrityScore = domainHealthGrid.length > 0
    ? Math.round(domainHealthGrid.reduce((s, d) => s + d.score, 0) / domainHealthGrid.length)
    : 100

  // Active Streaks (top 5)
  const activeStreaks: ActiveStreak[] = activeCommitments
    .filter((c) => c.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 5)
    .map((c) => ({
      commitmentId: c.id, domain: c.domain, domainLabel: DOMAIN_LABELS[c.domain] ?? c.domain,
      ruleType: (c.rule as Record<string, any>).type ?? 'unknown', streakDays: c.currentStreak,
    }))

  // Recent Overrides (last 10)
  const recentOverrides: RecentOverride[] = overrides.slice(0, 10).map((o) => {
    const c = commitmentMap.get(o.commitment_id as string)
    return {
      id: o.id as string, commitmentId: o.commitment_id as string,
      domain: (c?.domain ?? 'business_health') as CommitmentDomain,
      domainLabel: DOMAIN_LABELS[(c?.domain ?? 'business_health') as CommitmentDomain] ?? '',
      ruleType: c ? (c.rule as Record<string, any>).type ?? 'unknown' : 'unknown',
      category: o.category as string | null, reason: o.reason as string, createdAt: new Date(o.created_at as string),
    }
  })

  // System Suggestions (top 3)
  const systemSuggestions: SystemSuggestion[] = []

  for (const dh of domainHealthGrid) {
    if (dh.score < 40) {
      systemSuggestions.push({ type: 'warning', title: dh.label + ' needs attention', detail: 'Score of ' + dh.score + ' with ' + dh.overridesLast30 + ' overrides in 30 days.', priority: 9 })
    }
  }

  for (const streak of activeStreaks) {
    if (streak.streakDays >= 30) {
      systemSuggestions.push({ type: 'celebration', title: streak.streakDays + '-day streak in ' + streak.domainLabel, detail: 'You have maintained this commitment for ' + streak.streakDays + ' consecutive days.', priority: 3 })
    }
  }

  const uncommittedDomains: CommitmentDomain[] = (Object.keys(DOMAIN_LABELS) as CommitmentDomain[]).filter((d) => !domainGroups.has(d))
  if (uncommittedDomains.length > 0 && activeCommitments.length > 0) {
    systemSuggestions.push({ type: 'improvement', title: uncommittedDomains.length + ' domain(s) have no commitments', detail: 'Consider adding commitments for: ' + uncommittedDomains.map((d) => DOMAIN_LABELS[d]).join(', ') + '.', priority: 5 })
  }

  systemSuggestions.sort((a, b) => b.priority - a.priority)

  // Pressure Gauge
  let pressureGauge = 0

  const { data: upcomingEvents } = await client
    .from('events' as any)
    .select('id, event_date, guest_count')
    .eq('tenant_id', tenantId)
    .gte('event_date', new Date().toISOString())
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(30)

  const upcoming = (upcomingEvents ?? []) as any[]

  if (upcoming.length > 0) {
    const sevenDaysOut = Date.now() + 7 * 24 * 60 * 60 * 1000
    const nextWeekEvents = upcoming.filter((e) => new Date(e.event_date).getTime() <= sevenDaysOut).length
    pressureGauge = Math.min(100, nextWeekEvents * 20)

    const capacityCommitments = activeCommitments.filter((c) => c.domain === 'capacity' || c.domain === 'scheduling')
    for (const cc of capacityCommitments) {
      const rule = cc.rule as Record<string, any>
      if (rule.type === 'max_events_per_week' && nextWeekEvents >= (rule.limit as number)) {
        pressureGauge = Math.min(100, pressureGauge + 30)
      }
    }
  }

  return {
    overallIntegrityScore, domainHealthGrid, activeStreaks, recentOverrides,
    systemSuggestions: systemSuggestions.slice(0, 3), pressureGauge,
    totalCommitments: allCommitments.length, activeCommitments: activeCommitments.length,
  }
}

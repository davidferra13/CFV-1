import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain } from '@/lib/commitment/types'
import { DOMAIN_LABELS } from '@/lib/commitment/types'

// Best-Month Mirror (#33)
// Identifies the chef's best-performing month based on commitment adherence.
// Chef compared to own peak, not industry benchmarks.

export interface MonthScore {
  month: string
  overrideCount: number
  commitmentCount: number
  longestStreak: number
  integrityScore: number
  domainScores: Partial<Record<CommitmentDomain, number>>
}

export interface BestMonthSnapshot {
  month: string
  integrityScore: number
  overrideCount: number
  longestStreak: number
  topDomains: { domain: CommitmentDomain; label: string; score: number }[]
}

export interface DriftReport {
  bestMonth: MonthScore
  currentMonth: MonthScore
  overrideDelta: number
  integrityDelta: number
  streakDelta: number
  driftingDomains: { domain: CommitmentDomain; label: string; bestScore: number; currentScore: number }[]
  improvingDomains: { domain: CommitmentDomain; label: string; bestScore: number; currentScore: number }[]
  summary: string
}

async function buildMonthScores(tenantId: string): Promise<MonthScore[]> {
  const client = createServerClient()

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('id, commitment_id, created_at')
    .eq('tenant_id', tenantId)

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain, current_streak, longest_streak, override_count, created_at')
    .eq('tenant_id', tenantId)

  if (!commitments || commitments.length === 0) return []

  const commitmentMap = new Map<string, any>()
  for (const c of commitments) {
    commitmentMap.set(c.id as string, c)
  }

  const monthOverrides = new Map<string, number>()
  const monthDomainOverrides = new Map<string, Map<CommitmentDomain, number>>()

  for (const o of (overrides ?? []) as any[]) {
    const date = new Date(o.created_at)
    const monthKey = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0')
    monthOverrides.set(monthKey, (monthOverrides.get(monthKey) ?? 0) + 1)

    const commitment = commitmentMap.get(o.commitment_id as string)
    if (commitment) {
      const domainMap = monthDomainOverrides.get(monthKey) ?? new Map()
      const domain = commitment.domain as CommitmentDomain
      domainMap.set(domain, (domainMap.get(domain) ?? 0) + 1)
      monthDomainOverrides.set(monthKey, domainMap)
    }
  }

  const earliestDate = commitments.reduce((min: Date, c: any) => {
    const d = new Date(c.created_at as string)
    return d < min ? d : min
  }, new Date())

  const months: MonthScore[] = []
  const now = new Date()
  const cursor = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)

  while (cursor <= now) {
    const monthKey = cursor.getFullYear() + '-' + (cursor.getMonth() + 1).toString().padStart(2, '0')
    const overrideCount = monthOverrides.get(monthKey) ?? 0

    const domainOverridesForMonth = monthDomainOverrides.get(monthKey) ?? new Map()
    const domainScores: Partial<Record<CommitmentDomain, number>> = {}
    for (const c of commitments) {
      const domain = c.domain as CommitmentDomain
      const domOverrides = domainOverridesForMonth.get(domain) ?? 0
      domainScores[domain] = Math.max(0, 100 - domOverrides * 15)
    }

    const integrityScore = Math.max(0, 100 - overrideCount * 10)
    const longestStreak = commitments.reduce(
      (max: number, c: any) => Math.max(max, (c.longest_streak as number) ?? 0),
      0
    )

    months.push({ month: monthKey, overrideCount, commitmentCount: commitments.length, longestStreak, integrityScore, domainScores })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

/**
 * Calculate the best month: highest integrity, fewest overrides, longest streak.
 */
export async function calculateBestMonth(tenantId: string): Promise<MonthScore | null> {
  const months = await buildMonthScores(tenantId)
  if (months.length === 0) return null

  months.sort((a, b) => {
    if (b.integrityScore !== a.integrityScore) return b.integrityScore - a.integrityScore
    if (a.overrideCount !== b.overrideCount) return a.overrideCount - b.overrideCount
    return b.longestStreak - a.longestStreak
  })

  return months[0]!
}

/**
 * Get a snapshot of the best month for display.
 */
export async function getBestMonthSnapshot(tenantId: string): Promise<BestMonthSnapshot | null> {
  const best = await calculateBestMonth(tenantId)
  if (!best) return null

  const topDomains = Object.entries(best.domainScores)
    .map(([domain, score]) => ({
      domain: domain as CommitmentDomain,
      label: DOMAIN_LABELS[domain as CommitmentDomain] ?? domain,
      score: score ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return { month: best.month, integrityScore: best.integrityScore, overrideCount: best.overrideCount, longestStreak: best.longestStreak, topDomains }
}

/**
 * Compare a specific month to the best month.
 */
export async function compareToBestMonth(
  tenantId: string,
  currentMonth: string
): Promise<{ bestMonth: MonthScore; delta: { overrides: number; integrity: number; streak: number } } | null> {
  const best = await calculateBestMonth(tenantId)
  if (!best) return null

  const client = createServerClient()
  const startDate = new Date(currentMonth + '-01T00:00:00.000Z')
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1)

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())

  const currentOverrides = (overrides ?? []).length
  const currentIntegrity = Math.max(0, 100 - currentOverrides * 10)

  return { bestMonth: best, delta: { overrides: currentOverrides - best.overrideCount, integrity: currentIntegrity - best.integrityScore, streak: 0 } }
}

/**
 * Get a full drift report comparing current state to the best month.
 */
export async function getDriftReport(tenantId: string): Promise<DriftReport | null> {
  const best = await calculateBestMonth(tenantId)
  if (!best) return null

  const now = new Date()
  const currentMonthKey = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0')
  const client = createServerClient()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('commitment_id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain, current_streak, longest_streak')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const currentOverrides = (overrides ?? []).length
  const currentIntegrity = Math.max(0, 100 - currentOverrides * 10)

  const commitmentMap = new Map<string, any>()
  for (const c of (commitments ?? []) as any[]) {
    commitmentMap.set(c.id as string, c)
  }

  const domainOverrideCounts = new Map<CommitmentDomain, number>()
  for (const o of (overrides ?? []) as any[]) {
    const c = commitmentMap.get(o.commitment_id as string)
    if (c) {
      const domain = c.domain as CommitmentDomain
      domainOverrideCounts.set(domain, (domainOverrideCounts.get(domain) ?? 0) + 1)
    }
  }

  const currentDomainScores: Partial<Record<CommitmentDomain, number>> = {}
  for (const c of (commitments ?? []) as any[]) {
    const domain = c.domain as CommitmentDomain
    const domOverrides = domainOverrideCounts.get(domain) ?? 0
    currentDomainScores[domain] = Math.max(0, 100 - domOverrides * 15)
  }

  const currentStreak = (commitments ?? []).reduce(
    (max: number, c: any) => Math.max(max, (c.current_streak as number) ?? 0), 0
  )

  const currentMonth: MonthScore = {
    month: currentMonthKey, overrideCount: currentOverrides, commitmentCount: (commitments ?? []).length,
    longestStreak: currentStreak, integrityScore: currentIntegrity, domainScores: currentDomainScores,
  }

  const driftingDomains: DriftReport['driftingDomains'] = []
  const improvingDomains: DriftReport['improvingDomains'] = []

  const allDomains = new Set([...Object.keys(best.domainScores), ...Object.keys(currentDomainScores)]) as Set<CommitmentDomain>

  for (const domain of allDomains) {
    const bestScore = best.domainScores[domain] ?? 100
    const currentScore = currentDomainScores[domain] ?? 100
    if (currentScore < bestScore - 10) {
      driftingDomains.push({ domain, label: DOMAIN_LABELS[domain] ?? domain, bestScore, currentScore })
    } else if (currentScore > bestScore + 10) {
      improvingDomains.push({ domain, label: DOMAIN_LABELS[domain] ?? domain, bestScore, currentScore })
    }
  }

  const overrideDelta = currentOverrides - best.overrideCount
  const integrityDelta = currentIntegrity - best.integrityScore

  let summary: string
  if (integrityDelta >= 0) {
    summary = 'You are matching or exceeding your best month (' + best.month + ').'
  } else if (integrityDelta >= -20) {
    summary = 'Slightly below your best month (' + best.month + '). ' + driftingDomains.length + ' domain(s) drifting.'
  } else {
    summary = 'Significant drift from your best month (' + best.month + '). ' + overrideDelta + ' more overrides, ' + driftingDomains.length + ' domain(s) slipping.'
  }

  return { bestMonth: best, currentMonth, overrideDelta, integrityDelta, streakDelta: currentStreak - best.longestStreak, driftingDomains, improvingDomains, summary }
}

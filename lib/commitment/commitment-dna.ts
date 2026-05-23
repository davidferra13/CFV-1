import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain } from '@/lib/commitment/types'
import { DOMAIN_LABELS } from '@/lib/commitment/types'

// Commitment DNA (#41)
// Operational personality typing from commitment patterns.
// Types: Perfectionist, Hustler, Balanced, Artisan, Caretaker.

export type DNAType = 'Perfectionist' | 'Hustler' | 'Balanced' | 'Artisan' | 'Caretaker'

export interface DNAProfile {
  tenantId: string
  primaryType: DNAType
  secondaryType: DNAType | null
  confidence: number
  traits: DNATrait[]
  dominantDomains: { domain: CommitmentDomain; label: string; score: number }[]
  weakDomains: { domain: CommitmentDomain; label: string; score: number }[]
  summary: string
}

export interface DNATrait {
  name: string
  value: number
  description: string
}

export interface DNAEvolution {
  tenantId: string
  snapshots: DNASnapshot[]
  trend: string
}

export interface DNASnapshot {
  month: string
  primaryType: DNAType
  confidence: number
  traitScores: Record<string, number>
}

const DNA_DESCRIPTIONS: Record<DNAType, string> = {
  Perfectionist: 'You prioritize quality and dietary safety above all. Rarely cuts corners on standards, even under pressure.',
  Hustler: 'You maximize throughput and revenue. Strong on scheduling and pricing discipline, flexible on everything else.',
  Balanced: 'Even commitment across all domains. No single area dominates your override pattern.',
  Artisan: 'You protect creative freedom and menu integrity. Quality and menu commitments are sacred.',
  Caretaker: 'You prioritize client relationships and communication. Rarely lets a client request go unmet.',
}

interface DomainStats {
  domain: CommitmentDomain
  commitmentCount: number
  overrideCount: number
  avgStreak: number
  avgFriction: number
}

async function getDomainStats(tenantId: string): Promise<DomainStats[]> {
  const client = createServerClient()

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain, override_count, current_streak, friction_level, status')
    .eq('tenant_id', tenantId)

  if (!commitments || commitments.length === 0) return []

  const domainMap = new Map<CommitmentDomain, { count: number; overrides: number; streaks: number[]; frictions: number[] }>()

  for (const c of commitments as any[]) {
    const domain = c.domain as CommitmentDomain
    const existing = domainMap.get(domain) ?? { count: 0, overrides: 0, streaks: [], frictions: [] }
    existing.count++
    existing.overrides += (c.override_count as number) ?? 0
    existing.streaks.push((c.current_streak as number) ?? 0)
    existing.frictions.push((c.friction_level as number) ?? 1)
    domainMap.set(domain, existing)
  }

  return [...domainMap.entries()].map(([domain, stats]) => ({
    domain,
    commitmentCount: stats.count,
    overrideCount: stats.overrides,
    avgStreak: stats.streaks.length > 0
      ? Math.round(stats.streaks.reduce((a, b) => a + b, 0) / stats.streaks.length)
      : 0,
    avgFriction: stats.frictions.length > 0
      ? Math.round((stats.frictions.reduce((a, b) => a + b, 0) / stats.frictions.length) * 10) / 10
      : 1,
  }))
}

function domainGroupScore(stats: DomainStats[], domains: CommitmentDomain[]): number {
  const relevant = stats.filter((s) => domains.includes(s.domain))
  if (relevant.length === 0) return 50
  const avgStreak = relevant.reduce((s, r) => s + r.avgStreak, 0) / relevant.length
  const avgOverrides = relevant.reduce((s, r) => s + r.overrideCount, 0) / relevant.length
  return Math.min(100, Math.max(0, Math.round(
    (Math.min(avgStreak / 30, 1) * 60) + (Math.max(0, 1 - avgOverrides / 10) * 40)
  )))
}

function classifyDNA(stats: DomainStats[]): { primary: DNAType; secondary: DNAType | null; confidence: number; traits: DNATrait[] } {
  if (stats.length === 0) {
    return { primary: 'Balanced', secondary: null, confidence: 0, traits: [] }
  }

  const perfectionismScore = domainGroupScore(stats, ['quality', 'dietary'])
  const hustleScore = domainGroupScore(stats, ['pricing', 'scheduling', 'capacity'])
  const artisanScore = domainGroupScore(stats, ['menu', 'quality'])
  const caretakerScore = domainGroupScore(stats, ['communication', 'dietary', 'closeout'])

  // Balance score: low variance across all domains
  const allScores = stats.map((s) => {
    const streakScore = Math.min(s.avgStreak / 30, 1) * 60
    const overrideScore = Math.max(0, 1 - s.overrideCount / 10) * 40
    return streakScore + overrideScore
  })
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length
  const variance = allScores.reduce((s, v) => s + (v - mean) ** 2, 0) / allScores.length
  const balanceScore = Math.max(0, Math.round(100 - variance))

  const traits: DNATrait[] = [
    { name: 'perfectionism', value: perfectionismScore, description: 'Quality and safety commitment adherence' },
    { name: 'hustle', value: hustleScore, description: 'Pricing and scheduling discipline' },
    { name: 'artistry', value: artisanScore, description: 'Menu and creative integrity' },
    { name: 'caretaking', value: caretakerScore, description: 'Communication and client care' },
    { name: 'balance', value: balanceScore, description: 'Evenness across all commitment domains' },
  ]

  const typeScores: { type: DNAType; score: number }[] = [
    { type: 'Perfectionist', score: perfectionismScore },
    { type: 'Hustler', score: hustleScore },
    { type: 'Artisan', score: artisanScore },
    { type: 'Caretaker', score: caretakerScore },
    { type: 'Balanced', score: balanceScore },
  ]

  typeScores.sort((a, b) => b.score - a.score)
  const primary = typeScores[0]!
  const secondary = typeScores[1]!

  const gap = primary.score - secondary.score
  const confidence = Math.min(100, Math.max(20, Math.round(50 + gap)))

  return { primary: primary.type, secondary: gap < 15 ? secondary.type : null, confidence, traits }
}

/**
 * Analyze commitment patterns to determine operational DNA type.
 */
export async function analyzeCommitmentDNA(tenantId: string): Promise<DNAProfile> {
  const stats = await getDomainStats(tenantId)
  const { primary, secondary, confidence, traits } = classifyDNA(stats)

  const domainScores = stats.map((s) => ({
    domain: s.domain,
    label: DOMAIN_LABELS[s.domain] ?? s.domain,
    score: Math.round((Math.min(s.avgStreak / 30, 1) * 60) + (Math.max(0, 1 - s.overrideCount / 10) * 40)),
  }))

  domainScores.sort((a, b) => b.score - a.score)

  return {
    tenantId, primaryType: primary, secondaryType: secondary, confidence, traits,
    dominantDomains: domainScores.slice(0, 3),
    weakDomains: domainScores.slice(-3).reverse(),
    summary: DNA_DESCRIPTIONS[primary],
  }
}

/**
 * Get the DNA profile (currently recalculates; future: cache in DB).
 */
export async function getDNAProfile(tenantId: string): Promise<DNAProfile> {
  return analyzeCommitmentDNA(tenantId)
}

/**
 * Get DNA evolution over time via monthly snapshots from override history.
 */
export async function getDNAEvolution(tenantId: string): Promise<DNAEvolution> {
  const client = createServerClient()

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain, override_count, current_streak, friction_level, created_at')
    .eq('tenant_id', tenantId)

  if (!commitments || commitments.length === 0) {
    return { tenantId, snapshots: [], trend: 'No commitment data yet.' }
  }

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('commitment_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  const commitmentDomainMap = new Map<string, CommitmentDomain>()
  for (const c of commitments as any[]) {
    commitmentDomainMap.set(c.id as string, c.domain as CommitmentDomain)
  }

  const monthDomainOverrides = new Map<string, Map<CommitmentDomain, number>>()
  for (const o of (overrides ?? []) as any[]) {
    const date = new Date(o.created_at as string)
    const monthKey = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0')
    const domain = commitmentDomainMap.get(o.commitment_id as string)
    if (!domain) continue

    const domainMap = monthDomainOverrides.get(monthKey) ?? new Map()
    domainMap.set(domain, (domainMap.get(domain) ?? 0) + 1)
    monthDomainOverrides.set(monthKey, domainMap)
  }

  const snapshots: DNASnapshot[] = []
  const months = [...monthDomainOverrides.keys()].sort()

  const domains = new Set<CommitmentDomain>()
  for (const c of commitments as any[]) {
    domains.add(c.domain as CommitmentDomain)
  }

  for (const month of months) {
    const domainOverridesMap = monthDomainOverrides.get(month)!
    const monthStats: DomainStats[] = []

    for (const domain of domains) {
      monthStats.push({ domain, commitmentCount: 1, overrideCount: domainOverridesMap.get(domain) ?? 0, avgStreak: 0, avgFriction: 1 })
    }

    const { primary, confidence, traits } = classifyDNA(monthStats)
    const traitScores: Record<string, number> = {}
    for (const t of traits) traitScores[t.name] = t.value

    snapshots.push({ month, primaryType: primary, confidence, traitScores })
  }

  let trend = 'Not enough data for trend analysis.'
  if (snapshots.length >= 3) {
    const recent = snapshots[snapshots.length - 1]!
    const older = snapshots[snapshots.length - 3]!
    if (recent.primaryType === older.primaryType) {
      trend = 'Consistently ' + recent.primaryType + ' over the last 3 months.'
    } else {
      trend = 'Shifted from ' + older.primaryType + ' to ' + recent.primaryType + ' over the last 3 months.'
    }
  }

  return { tenantId, snapshots, trend }
}

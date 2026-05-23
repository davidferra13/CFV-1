import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentDomain,
  CommitmentSeason,
  CommitmentSource,
  CommitmentStatus,
  CommitmentRule,
  FrictionTier,
} from './types'

// ── Milestone Configuration ─────────────────────────────────────────────────

export const MILESTONE_VALUES = [30, 60, 90, 180, 365] as const
export type MilestoneDay = (typeof MILESTONE_VALUES)[number]

export interface MilestoneInfo {
  days: MilestoneDay
  label: string
  description: string
}

export const MILESTONE_DETAILS: Record<MilestoneDay, MilestoneInfo> = {
  30: { days: 30, label: '30-Day Mark', description: 'One month of consistency' },
  60: { days: 60, label: '60-Day Mark', description: 'Two months strong' },
  90: { days: 90, label: 'Quarter Milestone', description: 'A full quarter of discipline' },
  180: { days: 180, label: 'Half-Year Milestone', description: 'Six months of integrity' },
  365: { days: 365, label: 'Full Year', description: 'One year of commitment' },
}

// ── Loss Aversion ───────────────────────────────────────────────────────────

export interface LossProjection {
  currentStreak: number
  nextMilestone: MilestoneDay | null
  daysToNextMilestone: number | null
  streakValueLabel: string
  lossWarning: string
}

/**
 * Calculate what the chef would lose by breaking a streak.
 * Uses loss aversion framing to reinforce commitment.
 */
export function calculateLossProjection(commitment: Commitment): LossProjection {
  const streak = commitment.currentStreak

  // Find next milestone
  let nextMilestone: MilestoneDay | null = null
  for (const m of MILESTONE_VALUES) {
    if (streak < m) {
      nextMilestone = m
      break
    }
  }

  const daysToNextMilestone = nextMilestone !== null ? nextMilestone - streak : null

  // Value label based on streak length
  let streakValueLabel = 'Building'
  if (streak >= 365) streakValueLabel = 'Exceptional'
  else if (streak >= 180) streakValueLabel = 'Outstanding'
  else if (streak >= 90) streakValueLabel = 'Strong'
  else if (streak >= 60) streakValueLabel = 'Solid'
  else if (streak >= 30) streakValueLabel = 'Growing'

  // Loss warning framing
  let lossWarning: string
  if (nextMilestone !== null && daysToNextMilestone !== null && daysToNextMilestone <= 7) {
    lossWarning = `Only ${daysToNextMilestone} days from your ${MILESTONE_DETAILS[nextMilestone].label}. Breaking now resets to zero.`
  } else if (streak >= 90) {
    lossWarning = `${streak} days of discipline would reset to zero. That is ${Math.floor(streak / 30)} months of consistency.`
  } else if (streak >= 30) {
    lossWarning = `${streak} consecutive days of keeping this commitment would be lost.`
  } else if (streak > 0) {
    lossWarning = `Your ${streak}-day streak resets to zero with an override.`
  } else {
    lossWarning = 'No active streak to lose.'
  }

  return {
    currentStreak: streak,
    nextMilestone,
    daysToNextMilestone,
    streakValueLabel,
    lossWarning,
  }
}

// ── Rolling 90-Day Score ────────────────────────────────────────────────────

export interface Rolling90DayScore {
  score: number // 0-100
  overrideDays: number
  totalDays: 90
  activeDomains: number
}

/**
 * Calculate a rolling 90-day integrity score across all domains.
 * Score = weighted average of (clean days / 90) per domain.
 */
export async function calculateRolling90DayScore(
  tenantId: string
): Promise<Rolling90DayScore> {
  const client = createServerClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: commitments } = await client
    .from('commitments' as any)
    .select('id, domain')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!commitments || commitments.length === 0) {
    return { score: 100, overrideDays: 0, totalDays: 90, activeDomains: 0 }
  }

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

  // Count unique override days per domain
  const domainOverrideDays = new Map<CommitmentDomain, Set<string>>()
  for (const o of allOverrides) {
    const domain = commitmentDomainMap.get(o.commitment_id as string)
    if (!domain) continue
    const dayKey = new Date(o.created_at as string).toISOString().slice(0, 10)
    if (!domainOverrideDays.has(domain)) domainOverrideDays.set(domain, new Set())
    domainOverrideDays.get(domain)!.add(dayKey)
  }

  const activeDomains = new Set<CommitmentDomain>()
  for (const c of commitments) {
    activeDomains.add(c.domain as CommitmentDomain)
  }

  // Severity weights (dietary=3, contingency=2, rest=1)
  const WEIGHTS: Partial<Record<CommitmentDomain, number>> = {
    dietary: 3,
    contingency: 2,
  }

  let weightedSum = 0
  let totalWeight = 0
  let totalOverrideDays = 0

  for (const domain of activeDomains) {
    const uniqueDays = domainOverrideDays.get(domain)?.size ?? 0
    totalOverrideDays += uniqueDays
    const domainScore = Math.max(0, ((90 - uniqueDays) / 90) * 100)
    const weight = WEIGHTS[domain] ?? 1
    weightedSum += domainScore * weight
    totalWeight += weight
  }

  const score = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 10) / 10
    : 100

  return {
    score,
    overrideDays: totalOverrideDays,
    totalDays: 90,
    activeDomains: activeDomains.size,
  }
}

// ── Per-Commitment Streak Operations ────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Commitment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    domain: row.domain as CommitmentDomain,
    source: row.source as CommitmentSource,
    rule: (typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule) as CommitmentRule,
    status: row.status as CommitmentStatus,
    frictionLevel: row.friction_level as FrictionTier,
    overrideCount: (row.override_count as number) ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at as string) : null,
    currentStreak: (row.current_streak as number) ?? 0,
    longestStreak: (row.longest_streak as number) ?? 0,
    futureSelfletter: (row.future_self_letter as string) ?? null,
    seasonalProfile: (row.seasonal_profile as CommitmentSeason) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Increment streaks for all active commitments (called by daily cron).
 * Returns the number of commitments updated.
 */
export async function updateAllStreaks(tenantId: string): Promise<number> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('id, current_streak, longest_streak')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return 0

  const now = new Date().toISOString()
  let updated = 0

  for (const row of rows) {
    const newStreak = ((row.current_streak as number) ?? 0) + 1
    const currentLongest = (row.longest_streak as number) ?? 0
    const newLongest = Math.max(newStreak, currentLongest)

    const { error } = await client
      .from('commitments' as any)
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        updated_at: now,
      })
      .eq('id', row.id)
      .eq('tenant_id', tenantId)

    if (!error) updated++
  }

  return updated
}

/**
 * Reset streak for a single commitment (called on override).
 */
export async function resetStreak(commitmentId: string, tenantId: string): Promise<void> {
  const client = createServerClient()

  const { error } = await client
    .from('commitments' as any)
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[commitment/streak] resetStreak failed:', error.message)
  }
}

/**
 * Get commitments that are at milestone streak values.
 */
export async function getStreakMilestones(tenantId: string): Promise<Commitment[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return []

  return rows
    .filter((row: any) => MILESTONE_VALUES.includes(row.current_streak as MilestoneDay))
    .map((row: any) => mapRow(row))
}

/**
 * Get the next milestone for a given streak count.
 */
export function getNextMilestone(currentStreak: number): MilestoneDay | null {
  for (const m of MILESTONE_VALUES) {
    if (currentStreak < m) return m
  }
  return null
}

/**
 * Get all commitments with their streak details and loss projections.
 */
export async function getStreakSummary(
  tenantId: string
): Promise<Array<{ commitment: Commitment; loss: LossProjection }>> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gt('current_streak', 0)
    .order('current_streak', { ascending: false })

  if (!rows || rows.length === 0) return []

  return rows.map((row: any) => {
    const commitment = mapRow(row)
    return {
      commitment,
      loss: calculateLossProjection(commitment),
    }
  })
}

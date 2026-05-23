'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getActiveCommitments } from './engine'
import { calculateIntegrityScore } from './integrity'
import type { Commitment, CommitmentDomain } from './types'
import type {
  CommitmentStreak,
  CommitmentStreakSummary,
  IntegrityScore,
  IntegrityTrendPoint,
  Milestone,
  MilestoneType,
} from './streak-types'
import { MILESTONE_DAY_VALUES } from './streak-types'

// -- Helpers ------------------------------------------------------------------

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

function fail<T>(error: string): ActionResult<T> {
  return { success: false, error }
}

function ok<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

function mapStreakRow(row: Record<string, unknown>): CommitmentStreak {
  return {
    id: row.id as string,
    commitmentId: row.commitment_id as string,
    tenantId: row.tenant_id as string,
    currentStreakDays: (row.current_streak_days as number) ?? 0,
    longestStreak: (row.longest_streak as number) ?? 0,
    lastHonoredAt: row.last_honored_at ? new Date(row.last_honored_at as string) : null,
    lastBrokenAt: row.last_broken_at ? new Date(row.last_broken_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

function deriveMilestones(streak: CommitmentStreak): Milestone[] {
  const milestones: Milestone[] = []
  const entries = Object.entries(MILESTONE_DAY_VALUES) as [MilestoneType, number][]

  for (const [type, days] of entries) {
    if (streak.longestStreak >= days && streak.lastHonoredAt) {
      // Estimate when the milestone was reached based on current streak timing
      const msPerDay = 24 * 60 * 60 * 1000
      const daysAgo = streak.currentStreakDays - days
      const reachedAt =
        daysAgo >= 0 && streak.lastHonoredAt
          ? new Date(streak.lastHonoredAt.getTime() - daysAgo * msPerDay)
          : streak.lastHonoredAt
      milestones.push({ type, reachedAt })
    }
  }

  return milestones
}

// -- Server Actions -----------------------------------------------------------

/**
 * Get per-commitment consecutive days honored.
 * Returns streak records for all active commitments, optionally filtered by domain.
 */
export async function getCommitmentStreaks(
  domain?: CommitmentDomain
): Promise<ActionResult<CommitmentStreakSummary[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string

    const commitments = await getActiveCommitments(tenantId, domain)
    if (commitments.length === 0) return ok([])

    const client = createServerClient()
    const commitmentIds = commitments.map((c) => c.id)

    const { data: rows } = await client
      .from('commitment_streaks' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .in('commitment_id', commitmentIds)

    const streakMap = new Map<string, CommitmentStreak>()
    for (const row of (rows ?? []) as Record<string, unknown>[]) {
      const streak = mapStreakRow(row)
      streakMap.set(streak.commitmentId, streak)
    }

    // Build summaries; for commitments without a dedicated streak row,
    // fall back to the inline streak fields on the commitment itself
    const summaries: CommitmentStreakSummary[] = commitments.map((c) => {
      const streak = streakMap.get(c.id) ?? fallbackStreak(c)
      const milestones = deriveMilestones(streak)
      return {
        commitmentId: c.id,
        domain: c.domain,
        streak,
        milestones,
      }
    })

    return ok(summaries)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load commitment streaks')
  }
}

/**
 * Rolling 90-day integrity score (0-100) across all domains.
 */
export async function getIntegrityScore(): Promise<ActionResult<IntegrityScore>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string

    const raw = await calculateIntegrityScore(tenantId)

    const score: IntegrityScore = {
      score: raw.overall,
      domainScores: raw.byDomain,
      calculatedAt: new Date(),
    }

    return ok(score)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to calculate integrity score')
  }
}

/**
 * Get 30/60/90/180/365-day milestone markers across all active commitments.
 */
export async function getMilestones(): Promise<ActionResult<Record<string, Milestone[]>>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string

    const commitments = await getActiveCommitments(tenantId)
    if (commitments.length === 0) return ok({})

    const client = createServerClient()
    const commitmentIds = commitments.map((c) => c.id)

    const { data: rows } = await client
      .from('commitment_streaks' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .in('commitment_id', commitmentIds)

    const result: Record<string, Milestone[]> = {}

    for (const c of commitments) {
      const row = (rows ?? []).find(
        (r: any) => (r as Record<string, unknown>).commitment_id === c.id
      )
      const streak = row ? mapStreakRow(row as Record<string, unknown>) : fallbackStreak(c)
      const milestones = deriveMilestones(streak)
      if (milestones.length > 0) {
        result[c.id] = milestones
      }
    }

    return ok(result)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load milestones')
  }
}

/**
 * Score history over time. Uses override data to reconstruct approximate
 * integrity scores at weekly intervals over the past 90 days.
 */
export async function getIntegrityTrend(): Promise<ActionResult<IntegrityTrendPoint[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string

    const client = createServerClient()
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const { data: commitments } = await client
      .from('commitments' as any)
      .select('id, domain, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'paused'])

    if (!commitments || commitments.length === 0) {
      return ok([])
    }

    const { data: overrides } = await client
      .from('commitment_overrides' as any)
      .select('commitment_id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const allOverrides = (overrides ?? []) as { commitment_id: string; created_at: string }[]

    // Build weekly snapshots (13 weeks in 90 days)
    const points: IntegrityTrendPoint[] = []
    const msPerDay = 24 * 60 * 60 * 1000
    const now = Date.now()

    for (let weeksAgo = 12; weeksAgo >= 0; weeksAgo--) {
      const windowEnd = now - weeksAgo * 7 * msPerDay
      const windowStart = windowEnd - 90 * msPerDay
      const windowEndDate = new Date(windowEnd)
      const dateStr = windowEndDate.toISOString().slice(0, 10)

      // Count unique override days in this 90-day window
      const overrideDays = new Set<string>()
      for (const o of allOverrides) {
        const ts = new Date(o.created_at).getTime()
        if (ts >= windowStart && ts <= windowEnd) {
          overrideDays.add(new Date(o.created_at).toISOString().slice(0, 10))
        }
      }

      const score = Math.max(0, Math.min(100, ((90 - overrideDays.size) / 90) * 100))
      points.push({
        date: dateStr,
        score: Math.round(score * 10) / 10,
      })
    }

    return ok(points)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load integrity trend')
  }
}

// -- Internal helpers ---------------------------------------------------------

/**
 * Build a CommitmentStreak from inline fields on the Commitment row
 * when no dedicated streak row exists yet.
 */
function fallbackStreak(c: Commitment): CommitmentStreak {
  return {
    id: `fallback-${c.id}`,
    commitmentId: c.id,
    tenantId: c.tenantId,
    currentStreakDays: c.currentStreak,
    longestStreak: c.longestStreak,
    lastHonoredAt: c.updatedAt,
    lastBrokenAt: c.lastOverrideAt,
    createdAt: c.createdAt,
  }
}

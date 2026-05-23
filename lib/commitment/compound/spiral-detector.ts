'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, CommitmentOverride } from '@/lib/commitment/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpiralEvent {
  /** Unique domains involved in the spiral window */
  domains: CommitmentDomain[]
  /** All overrides within the 2-week window */
  overrides: SpiralOverrideEntry[]
  /** When the spiral was first detected (earliest override in window) */
  windowStart: Date
  /** When the spiral ended (latest override in window) */
  windowEnd: Date
}

export interface SpiralOverrideEntry {
  id: string
  commitmentId: string
  domain: CommitmentDomain
  reason: string
  createdAt: Date
}

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

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Detect override spirals: 3+ distinct domains overridden within any 2-week window.
 * Uses a sliding window over all overrides in the last 90 days.
 */
export async function detectSpiral(): Promise<ActionResult<SpiralEvent | null>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const client = createServerClient()

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all overrides in the last 90 days, joined with commitment domain
    const { data: overrideRows, error } = await client
      .from('commitment_overrides' as any)
      .select('id, commitment_id, reason, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true })

    if (error) {
      return fail(`Failed to query overrides: ${error.message}`)
    }

    if (!overrideRows || overrideRows.length < 3) {
      return ok(null)
    }

    // Fetch associated commitments to get domains
    const commitmentIds = [...new Set(overrideRows.map((r: any) => r.commitment_id))]
    const { data: commitmentRows } = await client
      .from('commitments' as any)
      .select('id, domain')
      .eq('tenant_id', tenantId)
      .in('id', commitmentIds)

    const domainMap = new Map<string, CommitmentDomain>()
    for (const c of commitmentRows ?? []) {
      domainMap.set(c.id as string, c.domain as CommitmentDomain)
    }

    // Enrich overrides with domain info
    const enriched: SpiralOverrideEntry[] = overrideRows
      .map((r: any) => ({
        id: r.id as string,
        commitmentId: r.commitment_id as string,
        domain: domainMap.get(r.commitment_id as string)!,
        reason: r.reason as string,
        createdAt: new Date(r.created_at as string),
      }))
      .filter((e: SpiralOverrideEntry) => e.domain != null)

    // Sliding window: for each override, look forward 2 weeks and count distinct domains
    for (let i = 0; i < enriched.length; i++) {
      const windowStart = enriched[i].createdAt.getTime()
      const windowEnd = windowStart + TWO_WEEKS_MS
      const windowOverrides: SpiralOverrideEntry[] = []
      const windowDomains = new Set<CommitmentDomain>()

      for (let j = i; j < enriched.length; j++) {
        if (enriched[j].createdAt.getTime() > windowEnd) break
        windowOverrides.push(enriched[j])
        windowDomains.add(enriched[j].domain)
      }

      if (windowDomains.size >= 3) {
        return ok({
          domains: [...windowDomains],
          overrides: windowOverrides,
          windowStart: enriched[i].createdAt,
          windowEnd: windowOverrides[windowOverrides.length - 1].createdAt,
        })
      }
    }

    return ok(null)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to detect spiral')
  }
}

/**
 * Get historical spiral events from the last N days (default 180).
 * Scans all overrides and returns each detected 2-week spiral window.
 */
export async function getSpiralHistory(
  lookbackDays: number = 180
): Promise<ActionResult<SpiralEvent[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const client = createServerClient()

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: overrideRows, error } = await client
      .from('commitment_overrides' as any)
      .select('id, commitment_id, reason, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) {
      return fail(`Failed to query overrides: ${error.message}`)
    }

    if (!overrideRows || overrideRows.length < 3) {
      return ok([])
    }

    const commitmentIds = [...new Set(overrideRows.map((r: any) => r.commitment_id))]
    const { data: commitmentRows } = await client
      .from('commitments' as any)
      .select('id, domain')
      .eq('tenant_id', tenantId)
      .in('id', commitmentIds)

    const domainMap = new Map<string, CommitmentDomain>()
    for (const c of commitmentRows ?? []) {
      domainMap.set(c.id as string, c.domain as CommitmentDomain)
    }

    const enriched: SpiralOverrideEntry[] = overrideRows
      .map((r: any) => ({
        id: r.id as string,
        commitmentId: r.commitment_id as string,
        domain: domainMap.get(r.commitment_id as string)!,
        reason: r.reason as string,
        createdAt: new Date(r.created_at as string),
      }))
      .filter((e: SpiralOverrideEntry) => e.domain != null)

    const spirals: SpiralEvent[] = []
    const consumed = new Set<number>()

    for (let i = 0; i < enriched.length; i++) {
      if (consumed.has(i)) continue

      const windowStart = enriched[i].createdAt.getTime()
      const windowEnd = windowStart + TWO_WEEKS_MS
      const windowOverrides: SpiralOverrideEntry[] = []
      const windowDomains = new Set<CommitmentDomain>()
      const windowIndices: number[] = []

      for (let j = i; j < enriched.length; j++) {
        if (enriched[j].createdAt.getTime() > windowEnd) break
        windowOverrides.push(enriched[j])
        windowDomains.add(enriched[j].domain)
        windowIndices.push(j)
      }

      if (windowDomains.size >= 3) {
        spirals.push({
          domains: [...windowDomains],
          overrides: windowOverrides,
          windowStart: enriched[i].createdAt,
          windowEnd: windowOverrides[windowOverrides.length - 1].createdAt,
        })
        // Mark consumed to avoid overlapping spirals
        for (const idx of windowIndices) {
          consumed.add(idx)
        }
      }
    }

    return ok(spirals)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to get spiral history')
  }
}

/**
 * Get a spiral risk score (0-100) based on recent override patterns.
 * - 0-25: Low risk, overrides are isolated
 * - 26-50: Moderate, overrides clustering in 2 domains
 * - 51-75: High, approaching spiral threshold
 * - 76-100: Critical, active spiral detected
 */
export async function getSpiralRiskScore(): Promise<
  ActionResult<{
    score: number
    level: 'low' | 'moderate' | 'high' | 'critical'
    recentDomains: CommitmentDomain[]
    overrideCount14d: number
  }>
> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const client = createServerClient()

    const fourteenDaysAgo = new Date(Date.now() - TWO_WEEKS_MS).toISOString()

    const { data: overrideRows, error } = await client
      .from('commitment_overrides' as any)
      .select('id, commitment_id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: true })

    if (error) {
      return fail(`Failed to query overrides: ${error.message}`)
    }

    if (!overrideRows || overrideRows.length === 0) {
      return ok({ score: 0, level: 'low', recentDomains: [], overrideCount14d: 0 })
    }

    const commitmentIds = [...new Set(overrideRows.map((r: any) => r.commitment_id))]
    const { data: commitmentRows } = await client
      .from('commitments' as any)
      .select('id, domain')
      .eq('tenant_id', tenantId)
      .in('id', commitmentIds)

    const domainMap = new Map<string, CommitmentDomain>()
    for (const c of commitmentRows ?? []) {
      domainMap.set(c.id as string, c.domain as CommitmentDomain)
    }

    const recentDomains = new Set<CommitmentDomain>()
    for (const r of overrideRows) {
      const domain = domainMap.get(r.commitment_id as string)
      if (domain) recentDomains.add(domain)
    }

    const domainCount = recentDomains.size
    const overrideCount = overrideRows.length

    // Score calculation:
    // - Domain spread contributes 40% (3+ domains = max)
    // - Override volume contributes 30% (6+ overrides = max)
    // - Override density contributes 30% (overrides per day)
    const domainScore = Math.min((domainCount / 3) * 40, 40)
    const volumeScore = Math.min((overrideCount / 6) * 30, 30)
    const daysInWindow = 14
    const density = overrideCount / daysInWindow
    const densityScore = Math.min((density / 0.5) * 30, 30)

    const score = Math.round(domainScore + volumeScore + densityScore)

    let level: 'low' | 'moderate' | 'high' | 'critical'
    if (score <= 25) level = 'low'
    else if (score <= 50) level = 'moderate'
    else if (score <= 75) level = 'high'
    else level = 'critical'

    return ok({
      score,
      level,
      recentDomains: [...recentDomains],
      overrideCount14d: overrideCount,
    })
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to calculate spiral risk score')
  }
}

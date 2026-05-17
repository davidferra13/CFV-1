'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  HeuristicPhase,
  HeuristicEvaluation,
  HeuristicGateResult,
  HeuristicSummary,
} from './heuristic-gate-types'

const TABLE = 'heuristic_evaluations'

function toEvaluation(row: any): HeuristicEvaluation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    phase: row.phase as HeuristicPhase,
    ruleName: row.rule_name,
    passed: row.passed,
    details: row.details ?? null,
    evaluatedAt: row.evaluated_at,
  }
}

function computePhaseScore(evals: HeuristicEvaluation[], phase: HeuristicPhase): number {
  const phaseEvals = evals.filter((e) => e.phase === phase)
  if (phaseEvals.length === 0) return 100
  const passed = phaseEvals.filter((e) => e.passed).length
  return Math.round((passed / phaseEvals.length) * 100)
}

function buildGateResult(route: string, evals: HeuristicEvaluation[]): HeuristicGateResult {
  const scanScore = computePhaseScore(evals, 'scan')
  const understandScore = computePhaseScore(evals, 'understand')
  const actScore = computePhaseScore(evals, 'act')
  const overallScore = Math.round((scanScore + understandScore + actScore) / 3)
  const failedRules = evals.filter((e) => !e.passed)

  return {
    route,
    scanScore,
    understandScore,
    actScore,
    overallScore,
    passed: failedRules.length === 0,
    failedRules,
    evaluatedAt:
      evals.length > 0
        ? evals.reduce(
            (latest, e) => (e.evaluatedAt > latest ? e.evaluatedAt : latest),
            evals[0].evaluatedAt
          )
        : new Date().toISOString(),
  }
}

/**
 * Record a heuristic evaluation for a route.
 */
export async function evaluateRoute(
  route: string,
  phase: HeuristicPhase,
  ruleName: string,
  passed: boolean,
  details?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const validPhases: HeuristicPhase[] = ['scan', 'understand', 'act']
    if (!validPhases.includes(phase)) {
      return { success: false, error: 'Invalid phase' }
    }
    if (!route || !ruleName) {
      return { success: false, error: 'Route and ruleName are required' }
    }

    const { error } = await db.from(TABLE).insert({
      tenant_id: user.tenantId!,
      route,
      phase,
      rule_name: ruleName,
      passed,
      details: details ?? null,
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Unknown error' }
  }
}

/**
 * Get aggregated gate result for a single route.
 * Uses the latest evaluation per rule (deduped).
 */
export async function getGateResult(route: string): Promise<HeuristicGateResult | null> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('route', route)
      .order('evaluated_at', { ascending: false })

    if (error || !data || data.length === 0) return null

    // Keep latest evaluation per rule
    const seen = new Set<string>()
    const latest: HeuristicEvaluation[] = []
    for (const row of data) {
      const key = `${row.phase}:${row.rule_name}`
      if (!seen.has(key)) {
        seen.add(key)
        latest.push(toEvaluation(row))
      }
    }

    return buildGateResult(route, latest)
  } catch {
    return null
  }
}

/**
 * Get overall heuristic summary across all routes.
 */
export async function getHeuristicSummary(): Promise<HeuristicSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('evaluated_at', { ascending: false })

  if (error || !data || data.length === 0) {
    return { totalRoutes: 0, evaluated: 0, passing: 0, failing: 0, avgScore: 0, worstRoutes: [] }
  }

  // Group by route, dedupe by latest per rule
  const byRoute = new Map<string, HeuristicEvaluation[]>()
  const seenPerRoute = new Map<string, Set<string>>()

  for (const row of data) {
    const route = row.route as string
    if (!byRoute.has(route)) {
      byRoute.set(route, [])
      seenPerRoute.set(route, new Set())
    }
    const key = `${row.phase}:${row.rule_name}`
    if (!seenPerRoute.get(route)!.has(key)) {
      seenPerRoute.get(route)!.add(key)
      byRoute.get(route)!.push(toEvaluation(row))
    }
  }

  const results: HeuristicGateResult[] = []
  const routeKeys = Array.from(byRoute.keys())
  for (const route of routeKeys) {
    results.push(buildGateResult(route, byRoute.get(route)!))
  }

  const passing = results.filter((r) => r.passed).length
  const failing = results.length - passing
  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length)
      : 0

  const worstRoutes = results
    .filter((r) => !r.passed)
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, 10)

  return {
    totalRoutes: byRoute.size,
    evaluated: byRoute.size,
    passing,
    failing,
    avgScore,
    worstRoutes,
  }
}

/**
 * Get routes that fail the heuristic gate, optionally filtered by phase.
 */
export async function getFailingRoutes(phase?: HeuristicPhase): Promise<HeuristicGateResult[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('evaluated_at', { ascending: false })

  if (phase) {
    query = query.eq('phase', phase)
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) return []

  // Group by route, dedupe
  const byRoute = new Map<string, HeuristicEvaluation[]>()
  const seenPerRoute = new Map<string, Set<string>>()

  for (const row of data) {
    const route = row.route as string
    if (!byRoute.has(route)) {
      byRoute.set(route, [])
      seenPerRoute.set(route, new Set())
    }
    const key = `${row.phase}:${row.rule_name}`
    if (!seenPerRoute.get(route)!.has(key)) {
      seenPerRoute.get(route)!.add(key)
      byRoute.get(route)!.push(toEvaluation(row))
    }
  }

  const results: HeuristicGateResult[] = []
  const routeKeys2 = Array.from(byRoute.keys())
  for (const route of routeKeys2) {
    const result = buildGateResult(route, byRoute.get(route)!)
    if (!result.passed) results.push(result)
  }

  return results.sort((a, b) => a.overallScore - b.overallScore)
}

/**
 * Evaluate multiple routes at once, returning gate results for each.
 */
export async function getBatchGateResults(routes: string[]): Promise<HeuristicGateResult[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!routes.length) return []

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('route', routes)
    .order('evaluated_at', { ascending: false })

  if (error || !data || data.length === 0) {
    return routes.map((route) => ({
      route,
      scanScore: 100,
      understandScore: 100,
      actScore: 100,
      overallScore: 100,
      passed: true,
      failedRules: [],
      evaluatedAt: new Date().toISOString(),
    }))
  }

  // Group by route, dedupe
  const byRoute = new Map<string, HeuristicEvaluation[]>()
  const seenPerRoute = new Map<string, Set<string>>()

  for (const row of data) {
    const route = row.route as string
    if (!byRoute.has(route)) {
      byRoute.set(route, [])
      seenPerRoute.set(route, new Set())
    }
    const key = `${row.phase}:${row.rule_name}`
    if (!seenPerRoute.get(route)!.has(key)) {
      seenPerRoute.get(route)!.add(key)
      byRoute.get(route)!.push(toEvaluation(row))
    }
  }

  return routes.map((route) => {
    const evals = byRoute.get(route)
    if (!evals || evals.length === 0) {
      return {
        route,
        scanScore: 100,
        understandScore: 100,
        actScore: 100,
        overallScore: 100,
        passed: true,
        failedRules: [],
        evaluatedAt: new Date().toISOString(),
      }
    }
    return buildGateResult(route, evals)
  })
}

/**
 * Get score trend over time for a route.
 */
export async function getHeuristicTrend(
  route: string,
  limit: number = 20
): Promise<HeuristicGateResult[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)
    .order('evaluated_at', { ascending: false })

  if (error || !data || data.length === 0) return []

  // Group evaluations by timestamp (rounded to minute for bucketing)
  const buckets = new Map<string, HeuristicEvaluation[]>()
  for (const row of data) {
    const ts = row.evaluated_at as string
    // Bucket by minute
    const bucket = ts.slice(0, 16)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket)!.push(toEvaluation(row))
  }

  // Build gate result per bucket, sorted newest first
  const results: HeuristicGateResult[] = []
  const bucketKeys = Array.from(buckets.keys())
  for (const key of bucketKeys) {
    results.push(buildGateResult(route, buckets.get(key)!))
  }

  results.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))
  return results.slice(0, limit)
}

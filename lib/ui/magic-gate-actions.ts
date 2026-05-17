'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MagicDimension,
  MagicScore,
  MagicGateEvaluation,
  MagicGateThreshold,
  MagicGateSummary,
} from './magic-gate-types'

export async function evaluateMagicGate(
  route: string,
  scores: MagicScore[]
): Promise<MagicGateEvaluation> {
  const user = await requireChef()
  const db: any = createServerClient()

  const overallScore =
    scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0

  // Check thresholds to determine pass/fail
  const thresholds = await db
    .from('magic_gate_thresholds')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('active', true)

  let passed = true
  if (thresholds && thresholds.length > 0) {
    for (const threshold of thresholds) {
      const matchingScore = scores.find((s) => s.dimension === threshold.dimension)
      if (matchingScore && matchingScore.score < threshold.min_score) {
        passed = false
        break
      }
    }
  }

  const [row] = await db
    .from('magic_gate_evaluations')
    .insert({
      tenant_id: user.tenantId,
      route,
      scores: JSON.stringify(scores),
      overall_score: overallScore,
      passed,
      evaluated_by: user.email,
    })
    .returning('*')

  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
    overallScore: row.overall_score,
    passed: row.passed,
    evaluatedBy: row.evaluated_by,
    evaluatedAt: new Date(row.evaluated_at),
  }
}

export async function getMagicGateResult(route: string): Promise<MagicGateEvaluation | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('magic_gate_evaluations')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('route', route)
    .orderBy('evaluated_at', 'desc')
    .limit(1)

  if (!rows || rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
    overallScore: row.overall_score,
    passed: row.passed,
    evaluatedBy: row.evaluated_by,
    evaluatedAt: new Date(row.evaluated_at),
  }
}

export async function getMagicGateThresholds(): Promise<MagicGateThreshold[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('magic_gate_thresholds')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('active', true)

  if (!rows) return []

  return rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    dimension: row.dimension as MagicDimension,
    minScore: row.min_score,
    weight: row.weight,
    active: row.active,
  }))
}

export async function updateMagicGateThreshold(
  dimension: MagicDimension,
  minScore: number,
  weight: number
): Promise<MagicGateThreshold> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [row] = await db
    .from('magic_gate_thresholds')
    .upsert(
      {
        tenant_id: user.tenantId,
        dimension,
        min_score: minScore,
        weight,
        active: true,
      },
      { onConflict: ['tenant_id', 'dimension'] }
    )
    .returning('*')

  return {
    id: row.id,
    tenantId: row.tenant_id,
    dimension: row.dimension as MagicDimension,
    minScore: row.min_score,
    weight: row.weight,
    active: row.active,
  }
}

export async function getMagicGateSummary(): Promise<MagicGateSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db.from('magic_gate_evaluations').select('*').eq('tenant_id', user.tenantId)

  if (!rows || rows.length === 0) {
    return {
      totalEvaluated: 0,
      passing: 0,
      failing: 0,
      avgScore: 0,
      worstDimension: null,
      bestDimension: null,
    }
  }

  // Deduplicate: keep latest evaluation per route
  const latestByRoute = new Map<string, any>()
  for (const row of rows) {
    const existing = latestByRoute.get(row.route)
    if (!existing || new Date(row.evaluated_at) > new Date(existing.evaluated_at)) {
      latestByRoute.set(row.route, row)
    }
  }

  const latest = Array.from(latestByRoute.values())
  const totalEvaluated = latest.length
  const passing = latest.filter((r) => r.passed).length
  const failing = totalEvaluated - passing
  const avgScore =
    totalEvaluated > 0
      ? Math.round(latest.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / totalEvaluated)
      : 0

  // Aggregate dimension scores across all latest evaluations
  const dimensionTotals = new Map<MagicDimension, { sum: number; count: number }>()
  for (const row of latest) {
    const scores: MagicScore[] =
      typeof row.scores === 'string' ? JSON.parse(row.scores) : (row.scores ?? [])
    for (const s of scores) {
      const entry = dimensionTotals.get(s.dimension) ?? { sum: 0, count: 0 }
      entry.sum += s.score
      entry.count += 1
      dimensionTotals.set(s.dimension, entry)
    }
  }

  let worstDimension: MagicDimension | null = null
  let bestDimension: MagicDimension | null = null
  let worstAvg = Infinity
  let bestAvg = -Infinity

  for (const [dim, entry] of Array.from(dimensionTotals.entries())) {
    const avg = entry.sum / entry.count
    if (avg < worstAvg) {
      worstAvg = avg
      worstDimension = dim
    }
    if (avg > bestAvg) {
      bestAvg = avg
      bestDimension = dim
    }
  }

  return { totalEvaluated, passing, failing, avgScore, worstDimension, bestDimension }
}

export async function getRoutesByMagicScore(
  minScore?: number,
  maxScore?: number,
  limit?: number
): Promise<MagicGateEvaluation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('magic_gate_evaluations')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .orderBy('evaluated_at', 'desc')

  const rows = await query

  if (!rows) return []

  // Deduplicate: latest per route
  const latestByRoute = new Map<string, any>()
  for (const row of rows) {
    const existing = latestByRoute.get(row.route)
    if (!existing || new Date(row.evaluated_at) > new Date(existing.evaluated_at)) {
      latestByRoute.set(row.route, row)
    }
  }

  let results = Array.from(latestByRoute.values())

  if (minScore !== undefined) {
    results = results.filter((r) => (r.overall_score ?? 0) >= minScore)
  }
  if (maxScore !== undefined) {
    results = results.filter((r) => (r.overall_score ?? 0) <= maxScore)
  }

  results.sort((a, b) => (a.overall_score ?? 0) - (b.overall_score ?? 0))

  if (limit !== undefined && limit > 0) {
    results = results.slice(0, limit)
  }

  return results.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
    overallScore: row.overall_score,
    passed: row.passed,
    evaluatedBy: row.evaluated_by,
    evaluatedAt: new Date(row.evaluated_at),
  }))
}

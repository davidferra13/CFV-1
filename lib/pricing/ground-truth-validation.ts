/**
 * PIE Ground Truth Validation Pipeline
 *
 * The missing piece: measures PIE accuracy against REAL prices, not self-referential
 * consistency checks. When receipt prices arrive, this module:
 *
 *   1. Records the ground truth comparison (receipt price vs PIE estimate)
 *   2. Resolves any pending compound learning predictions
 *   3. Computes real accuracy metrics against the 15% SLA target
 *
 * NOT a 'use server' file. Called by receipt pipeline and cron.
 */

import { pgClient as sql } from '@/lib/db'
import { resolvePrice } from './resolve-price'
import { resolvePredictions, computeMonthlyAccuracy } from './compound-learning'
import type { ReceiptPriceSignal } from './receipt-price-bridge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroundTruthComparison {
  ingredientId: string
  ingredientName: string
  region: string | null
  receiptPriceCents: number
  pieEstimateCents: number | null
  pieResolutionTier: string | null
  deltaPct: number | null
  withinSla: boolean
  timestamp: string
}

export interface GroundTruthResult {
  comparisonsRecorded: number
  predictionsResolved: number
  withinSlaCount: number
  outsideSlaCount: number
  averageDeltaPct: number | null
  comparisons: GroundTruthComparison[]
  durationMs: number
}

export interface AccuracyReport {
  timestamp: string
  totalComparisons: number
  withinSlaPct: number
  meanAbsoluteErrorPct: number
  medianAbsoluteErrorPct: number
  p90ErrorPct: number
  slaTarget: number
  slaMet: boolean
  byCategory: CategoryAccuracy[]
  byTier: TierAccuracy[]
  byState: StateAccuracy[]
  worstOffenders: WorstOffender[]
  trendVsPriorMonth: number | null
}

export interface CategoryAccuracy {
  category: string
  comparisons: number
  withinSlaPct: number
  meanErrorPct: number
}

export interface TierAccuracy {
  tier: string
  comparisons: number
  withinSlaPct: number
  meanErrorPct: number
}

export interface StateAccuracy {
  state: string
  comparisons: number
  withinSlaPct: number
  meanErrorPct: number
}

export interface WorstOffender {
  ingredientId: string
  ingredientName: string
  receiptCents: number
  pieCents: number
  deltaPct: number
  tier: string | null
  state: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLA_TARGET_PCT = 90 // 90% of prices within 15%
const SLA_THRESHOLD_PCT = 15 // "accurate" = within 15%

// ---------------------------------------------------------------------------
// Core: Record Ground Truth Comparison
// ---------------------------------------------------------------------------

/**
 * When receipt prices arrive, compare each against PIE's current estimate
 * and record the comparison with full metadata.
 */
export async function recordGroundTruthComparisons(
  signals: ReceiptPriceSignal[]
): Promise<GroundTruthResult> {
  const start = Date.now()
  const comparisons: GroundTruthComparison[] = []
  let predictionsResolved = 0

  for (const signal of signals) {
    try {
      // Get PIE's current best estimate for this ingredient in this region
      const pieResult = await resolvePrice(signal.ingredientId, signal.tenantId, {
        state: signal.storeState || undefined,
      })

      const pieEstimateCents = pieResult?.cents ?? null
      const pieResolutionTier = pieResult?.resolutionTier ?? null
      const region = signal.storeState || null

      let deltaPct: number | null = null
      let withinSla = false

      if (pieEstimateCents !== null && signal.priceCents > 0) {
        deltaPct =
          Math.round(
            (Math.abs(pieEstimateCents - signal.priceCents) / signal.priceCents) * 100 * 10
          ) / 10
        withinSla = deltaPct <= SLA_THRESHOLD_PCT
      }

      // Record into pie_ground_truth with the comparison data
      await sql`
        INSERT INTO pie_ground_truth
        (ingredient_id, price_cents, unit, quantity, store_name, store_state, store_zip, purchase_date, tenant_id, created_at)
        VALUES (${signal.ingredientId}, ${signal.priceCents}, ${signal.unit}, ${signal.quantity}, ${signal.storeName}, ${signal.storeState}, ${signal.storeZip}, ${signal.purchaseDate}, ${signal.tenantId}, NOW())
        ON CONFLICT DO NOTHING
      `

      // Record the accuracy comparison in pie_prediction_resolutions
      if (pieEstimateCents !== null && deltaPct !== null) {
        await sql`
          INSERT INTO pie_prediction_resolutions
          (ingredient_id, predicted_cents, actual_cents, deviation_pct, resolution_tier, resolved_at, source)
          VALUES (${signal.ingredientId}, ${pieEstimateCents}, ${signal.priceCents}, ${deltaPct}, ${pieResolutionTier}, NOW(), 'receipt_ground_truth')
          ON CONFLICT DO NOTHING
        `
      }

      // Resolve any pending compound learning predictions for this ingredient
      // If we have a real price, resolve synthetic predictions that predicted this ingredient
      if (signal.priceCents > 0) {
        const resolved = await resolveCompoundPrediction(
          signal.ingredientId,
          signal.priceCents,
          signal.storeState
        )
        predictionsResolved += resolved
      }

      comparisons.push({
        ingredientId: signal.ingredientId,
        ingredientName: signal.ingredientName,
        region,
        receiptPriceCents: signal.priceCents,
        pieEstimateCents,
        pieResolutionTier,
        deltaPct,
        withinSla,
        timestamp: new Date().toISOString(),
      })
    } catch {
      // Skip failed resolutions
    }
  }

  const withinSlaCount = comparisons.filter((c) => c.withinSla).length
  const outsideSlaCount = comparisons.filter((c) => !c.withinSla && c.deltaPct !== null).length
  const deltas = comparisons.map((c) => c.deltaPct).filter((d): d is number => d !== null)
  const averageDeltaPct =
    deltas.length > 0
      ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
      : null

  return {
    comparisonsRecorded: comparisons.length,
    predictionsResolved,
    withinSlaCount,
    outsideSlaCount,
    averageDeltaPct,
    comparisons,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Compound Learning Resolution
// ---------------------------------------------------------------------------

/**
 * When a real price arrives, resolve any unresolved synthetic predictions
 * for that ingredient. This is how the compound learning system gets feedback.
 */
async function resolveCompoundPrediction(
  ingredientId: string,
  actualCents: number,
  state: string | null
): Promise<number> {
  try {
    // Find unresolved predictions for this ingredient in openclaw.price_predictions
    const result = await sql`
      UPDATE openclaw.price_predictions pp
      SET
        actual_cents = ${actualCents},
        actual_source = 'receipt_ground_truth',
        actual_observed_at = now(),
        resolved_at = now(),
        error_pct = ROUND(
          (pp.predicted_cents::numeric - ${actualCents}::numeric)
          / GREATEST(${actualCents}::numeric, 1) * 100,
          3
        ),
        abs_error_pct = ROUND(
          ABS(pp.predicted_cents::numeric - ${actualCents}::numeric)
          / GREATEST(${actualCents}::numeric, 1) * 100,
          3
        )
      WHERE pp.canonical_ingredient_id = ${ingredientId}
        AND pp.actual_cents IS NULL
        AND pp.predicted_at > now() - interval '90 days'
        AND (
          pp.pricing_region_id IS NULL
          OR pp.pricing_region_id IN (
            SELECT id FROM openclaw.pricing_regions WHERE state = ${state || ''}
          )
        )
    `
    return result.count
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Full Accuracy Report
// ---------------------------------------------------------------------------

/**
 * Generate a comprehensive accuracy report from all ground truth data.
 * This is the real accuracy measurement, not self-consistency.
 */
export async function generateAccuracyReport(opts?: { days?: number }): Promise<AccuracyReport> {
  const days = opts?.days ?? 30

  // Overall stats from pie_prediction_resolutions where source is receipt-based
  const [overall] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN deviation_pct <= ${SLA_THRESHOLD_PCT} THEN 1 END) as within_sla,
      ROUND(AVG(deviation_pct)::numeric, 2) as mean_error,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY deviation_pct)::numeric, 2) as median_error,
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY deviation_pct)::numeric, 2) as p90_error
    FROM pie_prediction_resolutions
    WHERE resolved_at > NOW() - make_interval(days => ${days})
      AND source IN ('receipt', 'receipt_ground_truth')
  `

  const totalComparisons = parseInt(overall.total) || 0
  const withinSlaCount = parseInt(overall.within_sla) || 0
  const withinSlaPct =
    totalComparisons > 0 ? Math.round((withinSlaCount / totalComparisons) * 1000) / 10 : 0
  const meanAbsoluteErrorPct = parseFloat(overall.mean_error) || 0
  const medianAbsoluteErrorPct = parseFloat(overall.median_error) || 0
  const p90ErrorPct = parseFloat(overall.p90_error) || 0

  // By category (join with canonical_ingredients)
  const byCategoryRows = await sql`
    SELECT
      COALESCE(ci.category, 'unknown') as category,
      COUNT(*) as comparisons,
      COUNT(CASE WHEN pr.deviation_pct <= ${SLA_THRESHOLD_PCT} THEN 1 END) as within_sla,
      ROUND(AVG(pr.deviation_pct)::numeric, 2) as mean_error
    FROM pie_prediction_resolutions pr
    LEFT JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = pr.ingredient_id
    WHERE pr.resolved_at > NOW() - make_interval(days => ${days})
      AND pr.source IN ('receipt', 'receipt_ground_truth')
    GROUP BY COALESCE(ci.category, 'unknown')
    HAVING COUNT(*) >= 3
    ORDER BY AVG(pr.deviation_pct) DESC
  `

  const byCategory: CategoryAccuracy[] = byCategoryRows.map((r) => ({
    category: r.category as string,
    comparisons: parseInt(r.comparisons),
    withinSlaPct:
      parseInt(r.comparisons) > 0
        ? Math.round((parseInt(r.within_sla) / parseInt(r.comparisons)) * 1000) / 10
        : 0,
    meanErrorPct: parseFloat(r.mean_error) || 0,
  }))

  // By resolution tier
  const byTierRows = await sql`
    SELECT
      COALESCE(resolution_tier, 'unknown') as tier,
      COUNT(*) as comparisons,
      COUNT(CASE WHEN deviation_pct <= ${SLA_THRESHOLD_PCT} THEN 1 END) as within_sla,
      ROUND(AVG(deviation_pct)::numeric, 2) as mean_error
    FROM pie_prediction_resolutions
    WHERE resolved_at > NOW() - make_interval(days => ${days})
      AND source IN ('receipt', 'receipt_ground_truth')
    GROUP BY COALESCE(resolution_tier, 'unknown')
    ORDER BY AVG(deviation_pct) ASC
  `

  const byTier: TierAccuracy[] = byTierRows.map((r) => ({
    tier: r.tier as string,
    comparisons: parseInt(r.comparisons),
    withinSlaPct:
      parseInt(r.comparisons) > 0
        ? Math.round((parseInt(r.within_sla) / parseInt(r.comparisons)) * 1000) / 10
        : 0,
    meanErrorPct: parseFloat(r.mean_error) || 0,
  }))

  // By state (from ground truth table)
  const byStateRows = await sql`
    SELECT
      COALESCE(gt.store_state, 'unknown') as state,
      COUNT(*) as comparisons,
      COUNT(CASE WHEN pr.deviation_pct <= ${SLA_THRESHOLD_PCT} THEN 1 END) as within_sla,
      ROUND(AVG(pr.deviation_pct)::numeric, 2) as mean_error
    FROM pie_prediction_resolutions pr
    JOIN pie_ground_truth gt ON gt.ingredient_id = pr.ingredient_id
      AND gt.created_at > pr.resolved_at - interval '1 hour'
      AND gt.created_at < pr.resolved_at + interval '1 hour'
    WHERE pr.resolved_at > NOW() - make_interval(days => ${days})
      AND pr.source IN ('receipt', 'receipt_ground_truth')
      AND gt.store_state IS NOT NULL
    GROUP BY gt.store_state
    HAVING COUNT(*) >= 3
    ORDER BY AVG(pr.deviation_pct) DESC
  `

  const byState: StateAccuracy[] = byStateRows.map((r) => ({
    state: r.state as string,
    comparisons: parseInt(r.comparisons),
    withinSlaPct:
      parseInt(r.comparisons) > 0
        ? Math.round((parseInt(r.within_sla) / parseInt(r.comparisons)) * 1000) / 10
        : 0,
    meanErrorPct: parseFloat(r.mean_error) || 0,
  }))

  // Worst offenders
  const worstRows = await sql`
    SELECT
      pr.ingredient_id,
      COALESCE(ci.name, pr.ingredient_id) as ingredient_name,
      pr.actual_cents as receipt_cents,
      pr.predicted_cents as pie_cents,
      pr.deviation_pct as delta_pct,
      pr.resolution_tier as tier,
      gt.store_state as state
    FROM pie_prediction_resolutions pr
    LEFT JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = pr.ingredient_id
    LEFT JOIN pie_ground_truth gt ON gt.ingredient_id = pr.ingredient_id
      AND gt.created_at > pr.resolved_at - interval '1 hour'
      AND gt.created_at < pr.resolved_at + interval '1 hour'
    WHERE pr.resolved_at > NOW() - make_interval(days => ${days})
      AND pr.source IN ('receipt', 'receipt_ground_truth')
      AND pr.deviation_pct > ${SLA_THRESHOLD_PCT}
    ORDER BY pr.deviation_pct DESC
    LIMIT 20
  `

  const worstOffenders: WorstOffender[] = worstRows.map((r) => ({
    ingredientId: r.ingredient_id as string,
    ingredientName: r.ingredient_name as string,
    receiptCents: parseInt(r.receipt_cents),
    pieCents: parseInt(r.pie_cents),
    deltaPct: parseFloat(r.delta_pct),
    tier: r.tier as string | null,
    state: r.state as string | null,
  }))

  // Trend vs prior month
  const [priorMonth] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN deviation_pct <= ${SLA_THRESHOLD_PCT} THEN 1 END) as within_sla
    FROM pie_prediction_resolutions
    WHERE resolved_at > NOW() - make_interval(days => ${days * 2})
      AND resolved_at <= NOW() - make_interval(days => ${days})
      AND source IN ('receipt', 'receipt_ground_truth')
  `

  const priorTotal = parseInt(priorMonth?.total) || 0
  const priorWithinSla = parseInt(priorMonth?.within_sla) || 0
  const priorPct = priorTotal > 0 ? (priorWithinSla / priorTotal) * 100 : null
  const trendVsPriorMonth =
    priorPct !== null && totalComparisons > 0
      ? Math.round((withinSlaPct - priorPct) * 10) / 10
      : null

  return {
    timestamp: new Date().toISOString(),
    totalComparisons,
    withinSlaPct,
    meanAbsoluteErrorPct,
    medianAbsoluteErrorPct,
    p90ErrorPct,
    slaTarget: SLA_TARGET_PCT,
    slaMet: withinSlaPct >= SLA_TARGET_PCT,
    byCategory,
    byTier,
    byState,
    worstOffenders,
    trendVsPriorMonth,
  }
}

// ---------------------------------------------------------------------------
// Full Ground Truth Validation Run (for cron)
// ---------------------------------------------------------------------------

/**
 * Complete validation pipeline run:
 *   1. Resolve pending compound learning predictions
 *   2. Recompute monthly accuracy
 *   3. Generate the full accuracy report
 *   4. Return structured results
 */
export async function runGroundTruthValidation(opts?: { days?: number }): Promise<{
  predictionsResolved: number
  monthlyRollupsUpdated: number
  report: AccuracyReport
  durationMs: number
}> {
  const start = Date.now()

  // Step 1: Resolve any pending predictions against real observations
  const predictionsResolved = await resolvePredictions()

  // Step 2: Recompute monthly accuracy rollups
  const monthlyRollupsUpdated = await computeMonthlyAccuracy()

  // Step 3: Generate comprehensive accuracy report
  const report = await generateAccuracyReport(opts)

  return {
    predictionsResolved,
    monthlyRollupsUpdated,
    report,
    durationMs: Date.now() - start,
  }
}

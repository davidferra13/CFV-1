/**
 * PIE Law 7: Compound Learning Engine
 *
 * Records synthetic price predictions, resolves them against real observations,
 * and computes monthly accuracy metrics. The system gets smarter over time.
 *
 * NOT a 'use server' file. Called by cron and synthetic engine.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictionRecord {
  canonicalIngredientId: string
  pricingRegionId: string | null
  predictedCents: number
  predictedUnit: string
  derivationMethod: string
  confidence: number
}

export interface LearningRunResult {
  predictionsResolved: number
  newPredictionsRecorded: number
  monthlyRollupsUpdated: number
  durationMs: number
  currentAccuracy: number | null
  priorAccuracy: number | null
  improved: boolean | null
}

export interface LearningStatus {
  totalPredictions: number
  resolvedPredictions: number
  unresolvedPredictions: number
  currentMonthAccuracy: number | null
  priorMonthAccuracy: number | null
  improved: boolean | null
  meanAbsErrorPct: number | null
  byMethod: Array<{
    method: string
    predictions: number
    resolved: number
    accuracyPct: number | null
    meanAbsErrorPct: number | null
  }>
}

// ---------------------------------------------------------------------------
// Record a prediction (called by synthetic engine)
// ---------------------------------------------------------------------------

export async function recordPrediction(record: PredictionRecord): Promise<void> {
  const sql = pgClient
  await sql`
    INSERT INTO openclaw.price_predictions (
      canonical_ingredient_id, pricing_region_id,
      predicted_cents, predicted_unit,
      derivation_method, confidence
    ) VALUES (
      ${record.canonicalIngredientId}, ${record.pricingRegionId},
      ${record.predictedCents}, ${record.predictedUnit},
      ${record.derivationMethod}, ${record.confidence}
    )
  `
}

export async function recordPredictionsBatch(records: PredictionRecord[]): Promise<number> {
  if (records.length === 0) return 0
  const sql = pgClient

  // Insert in chunks of 500
  let inserted = 0
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500)
    const values = chunk.map((r) => ({
      canonical_ingredient_id: r.canonicalIngredientId,
      pricing_region_id: r.pricingRegionId,
      predicted_cents: r.predictedCents,
      predicted_unit: r.predictedUnit,
      derivation_method: r.derivationMethod,
      confidence: r.confidence,
    }))

    const result = await sql`
      INSERT INTO openclaw.price_predictions ${sql(values)}
    `
    inserted += result.count
  }
  return inserted
}

// ---------------------------------------------------------------------------
// Resolve predictions against real observations
// ---------------------------------------------------------------------------

export async function resolvePredictions(): Promise<number> {
  const sql = pgClient

  // Find unresolved predictions where a real (non-synthetic) price now exists
  // in resolved_prices that was observed AFTER the prediction was made
  const result = await sql`
    UPDATE openclaw.price_predictions pp
    SET
      actual_cents = rp.price_cents,
      actual_source = rp.computation_method,
      actual_observed_at = rp.freshest_observation,
      resolved_at = now(),
      error_pct = ROUND(
        (pp.predicted_cents::numeric - rp.price_cents::numeric)
        / GREATEST(rp.price_cents::numeric, 1) * 100,
        3
      ),
      abs_error_pct = ROUND(
        ABS(pp.predicted_cents::numeric - rp.price_cents::numeric)
        / GREATEST(rp.price_cents::numeric, 1) * 100,
        3
      )
    FROM openclaw.resolved_prices rp
    WHERE pp.actual_cents IS NULL
      AND rp.canonical_ingredient_id = pp.canonical_ingredient_id
      AND (
        pp.pricing_region_id IS NULL
        OR rp.pricing_region_id = pp.pricing_region_id
      )
      AND rp.is_synthetic = false
      AND rp.confidence > 0.3
      AND rp.freshest_observation > pp.predicted_at
  `

  return result.count
}

// ---------------------------------------------------------------------------
// Compute monthly accuracy rollups
// ---------------------------------------------------------------------------

export async function computeMonthlyAccuracy(): Promise<number> {
  const sql = pgClient

  // Compute for current and prior month
  const result = await sql`
    INSERT INTO openclaw.learning_accuracy (
      month, derivation_method,
      total_predictions, resolved_predictions,
      mean_abs_error_pct, median_abs_error_pct, p90_abs_error_pct,
      accuracy_pct, improved_vs_prior, computed_at
    )
    SELECT
      date_trunc('month', pp.predicted_at)::date AS month,
      pp.derivation_method,
      count(*) AS total_predictions,
      count(*) FILTER (WHERE pp.actual_cents IS NOT NULL) AS resolved_predictions,
      ROUND(AVG(pp.abs_error_pct) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 3),
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pp.abs_error_pct)
        FILTER (WHERE pp.abs_error_pct IS NOT NULL), 3),
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY pp.abs_error_pct)
        FILTER (WHERE pp.abs_error_pct IS NOT NULL), 3),
      ROUND(
        100.0 * count(*) FILTER (WHERE pp.abs_error_pct IS NOT NULL AND pp.abs_error_pct <= 15)
        / GREATEST(count(*) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 1),
        2
      ),
      NULL,  -- computed below
      now()
    FROM openclaw.price_predictions pp
    WHERE pp.predicted_at >= date_trunc('month', now()) - INTERVAL '2 months'
    GROUP BY date_trunc('month', pp.predicted_at), pp.derivation_method
    ON CONFLICT (month, derivation_method) DO UPDATE SET
      total_predictions = EXCLUDED.total_predictions,
      resolved_predictions = EXCLUDED.resolved_predictions,
      mean_abs_error_pct = EXCLUDED.mean_abs_error_pct,
      median_abs_error_pct = EXCLUDED.median_abs_error_pct,
      p90_abs_error_pct = EXCLUDED.p90_abs_error_pct,
      accuracy_pct = EXCLUDED.accuracy_pct,
      computed_at = EXCLUDED.computed_at
  `

  // Now compute improved_vs_prior by comparing each month to its predecessor
  await sql`
    UPDATE openclaw.learning_accuracy la
    SET improved_vs_prior = (
      la.accuracy_pct > COALESCE(prior.accuracy_pct, 0)
    )
    FROM openclaw.learning_accuracy prior
    WHERE prior.month = la.month - INTERVAL '1 month'
      AND prior.derivation_method = la.derivation_method
      AND la.resolved_predictions > 0
      AND prior.resolved_predictions > 0
  `

  return result.count
}

// ---------------------------------------------------------------------------
// Get learning status (for compliance dashboard)
// ---------------------------------------------------------------------------

export async function getLearningStatus(): Promise<LearningStatus> {
  const sql = pgClient

  const [totals] = await sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE actual_cents IS NOT NULL) AS resolved,
      count(*) FILTER (WHERE actual_cents IS NULL) AS unresolved
    FROM openclaw.price_predictions
  `

  const currentMonth = await sql`
    SELECT derivation_method, accuracy_pct, mean_abs_error_pct,
           total_predictions, resolved_predictions
    FROM openclaw.learning_accuracy
    WHERE month = date_trunc('month', now())::date
    ORDER BY resolved_predictions DESC
  `

  const [priorMonth] = await sql`
    SELECT
      ROUND(AVG(accuracy_pct) FILTER (WHERE resolved_predictions > 10), 2) AS avg_accuracy
    FROM openclaw.learning_accuracy
    WHERE month = (date_trunc('month', now()) - INTERVAL '1 month')::date
  `

  const overallAccuracy =
    currentMonth.length > 0
      ? Math.round(
          (currentMonth.reduce(
            (sum, r) => sum + Number(r.accuracy_pct || 0) * Number(r.resolved_predictions),
            0
          ) /
            Math.max(
              currentMonth.reduce((sum, r) => sum + Number(r.resolved_predictions), 0),
              1
            )) *
            100
        ) / 100
      : null

  const overallMae =
    currentMonth.length > 0
      ? Math.round(
          (currentMonth.reduce(
            (sum, r) => sum + Number(r.mean_abs_error_pct || 0) * Number(r.resolved_predictions),
            0
          ) /
            Math.max(
              currentMonth.reduce((sum, r) => sum + Number(r.resolved_predictions), 0),
              1
            )) *
            1000
        ) / 1000
      : null

  const priorAccuracy = priorMonth?.avg_accuracy ? Number(priorMonth.avg_accuracy) : null

  return {
    totalPredictions: Number(totals?.total ?? 0),
    resolvedPredictions: Number(totals?.resolved ?? 0),
    unresolvedPredictions: Number(totals?.unresolved ?? 0),
    currentMonthAccuracy: overallAccuracy,
    priorMonthAccuracy: priorAccuracy,
    improved:
      overallAccuracy !== null && priorAccuracy !== null ? overallAccuracy > priorAccuracy : null,
    meanAbsErrorPct: overallMae,
    byMethod: currentMonth.map((r) => ({
      method: r.derivation_method,
      predictions: Number(r.total_predictions),
      resolved: Number(r.resolved_predictions),
      accuracyPct: r.accuracy_pct ? Number(r.accuracy_pct) : null,
      meanAbsErrorPct: r.mean_abs_error_pct ? Number(r.mean_abs_error_pct) : null,
    })),
  }
}

// ---------------------------------------------------------------------------
// Full learning run (called by cron)
// ---------------------------------------------------------------------------

export async function runCompoundLearning(): Promise<LearningRunResult> {
  const start = Date.now()

  const predictionsResolved = await resolvePredictions()
  const monthlyRollupsUpdated = await computeMonthlyAccuracy()
  const status = await getLearningStatus()

  return {
    predictionsResolved,
    newPredictionsRecorded: 0, // synthetic engine records these separately
    monthlyRollupsUpdated,
    durationMs: Date.now() - start,
    currentAccuracy: status.currentMonthAccuracy,
    priorAccuracy: status.priorMonthAccuracy,
    improved: status.improved,
  }
}

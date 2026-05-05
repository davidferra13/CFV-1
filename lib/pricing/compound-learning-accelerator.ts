/**
 * PIE Compound Learning Accelerator
 *
 * Extends the existing compound-learning.ts with:
 *   1. Cross-method calibration (learn which derivation methods work best per category)
 *   2. Feedback integration (chef price confirmations/rejections feed back into weights)
 *   3. Regional bias correction (detect systematic over/under-estimation per region)
 *   4. Confidence recalibration (are our confidence scores actually calibrated?)
 *   5. Adaptive derivation selection (choose best method per ingredient, not fixed priority)
 *
 * The goal: PIE at month 6 is dramatically more accurate than PIE at month 1.
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcceleratorRunResult {
  calibrationUpdates: number
  biasCorrections: number
  methodReweights: number
  confidenceRecalibrations: number
  feedbackIntegrated: number
  durationMs: number
  insights: AcceleratorInsight[]
}

export interface AcceleratorInsight {
  type: 'method_performance' | 'regional_bias' | 'confidence_drift' | 'feedback_signal'
  message: string
  data: Record<string, unknown>
}

export interface MethodPerformance {
  method: string
  category: string
  totalPredictions: number
  resolvedPredictions: number
  meanAbsErrorPct: number
  medianAbsErrorPct: number
  within10Pct: number
  within20Pct: number
  improvingTrend: boolean
  recommendedWeight: number
}

export interface RegionalBias {
  regionId: string
  regionName: string
  state: string
  biasDirection: 'over' | 'under' | 'neutral'
  biasMagnitudePct: number
  correctionFactor: number
  sampleSize: number
}

export interface ConfidenceCalibration {
  /** Stated confidence bucket (e.g. "0.7-0.8") */
  bucket: string
  /** Actual accuracy at that confidence level */
  actualAccuracy: number
  /** Ideal: stated confidence = actual accuracy */
  calibrationGap: number
  sampleSize: number
}

// ---------------------------------------------------------------------------
// 1. Cross-Method Calibration
// ---------------------------------------------------------------------------

/**
 * Analyze which derivation methods perform best for each food category.
 * Updates method weights so the synthetic engine prefers the most accurate method.
 */
async function calibrateMethods(): Promise<{ updates: number; insights: AcceleratorInsight[] }> {
  const sql = pgClient
  const insights: AcceleratorInsight[] = []

  // Get performance by method + category
  const performance = await sql`
    SELECT
      pp.derivation_method,
      ci.category,
      COUNT(*) AS total_predictions,
      COUNT(*) FILTER (WHERE pp.actual_cents IS NOT NULL) AS resolved,
      ROUND(AVG(pp.abs_error_pct) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 2) AS mean_error,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pp.abs_error_pct)
        FILTER (WHERE pp.abs_error_pct IS NOT NULL), 2) AS median_error,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE pp.abs_error_pct <= 10)
        / GREATEST(COUNT(*) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 1), 1
      ) AS within_10_pct,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE pp.abs_error_pct <= 20)
        / GREATEST(COUNT(*) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 1), 1
      ) AS within_20_pct
    FROM openclaw.price_predictions pp
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = pp.canonical_ingredient_id
    WHERE pp.actual_cents IS NOT NULL
      AND pp.predicted_at > now() - interval '60 days'
    GROUP BY pp.derivation_method, ci.category
    HAVING COUNT(*) FILTER (WHERE pp.actual_cents IS NOT NULL) >= 10
    ORDER BY ci.category, mean_error ASC
  `

  // Compute recommended weights per method+category
  // Better performing methods get higher weights
  let updates = 0
  const byCategory = new Map<string, Array<Record<string, unknown>>>()
  for (const row of performance) {
    const cat = row.category as string
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(row as Record<string, unknown>)
  }

  for (const [category, methods] of Array.from(byCategory.entries())) {
    if (methods.length < 2) continue

    // Rank methods by median error (lower = better)
    const ranked = [...methods].sort((a, b) => Number(a.median_error) - Number(b.median_error))
    const bestMethod = ranked[0]
    const worstMethod = ranked[ranked.length - 1]

    // Weight = inverse of relative error (normalized to sum to 1)
    const totalInverseError = ranked.reduce(
      (s, m) => s + 1 / Math.max(Number(m.median_error), 1),
      0
    )

    for (const method of ranked) {
      const weight = 1 / Math.max(Number(method.median_error), 1) / totalInverseError
      const methodName = String(method.derivation_method)
      const meanErr = Number(method.mean_error)
      const sampleSz = Number(method.resolved)

      await sql`
        INSERT INTO openclaw.method_weights (
          derivation_method, category, weight, mean_error_pct,
          sample_size, computed_at
        ) VALUES (
          ${methodName}, ${category}, ${Math.round(weight * 1000) / 1000},
          ${meanErr}, ${sampleSz}, now()
        )
        ON CONFLICT (derivation_method, category) DO UPDATE SET
          weight = EXCLUDED.weight,
          mean_error_pct = EXCLUDED.mean_error_pct,
          sample_size = EXCLUDED.sample_size,
          computed_at = now()
      `
      updates++
    }

    // Insight: biggest gap between best and worst method
    if (Number(worstMethod.median_error) - Number(bestMethod.median_error) > 10) {
      insights.push({
        type: 'method_performance',
        message: `For ${category}: ${bestMethod.derivation_method} outperforms ${worstMethod.derivation_method} by ${(Number(worstMethod.median_error) - Number(bestMethod.median_error)).toFixed(1)}% median error`,
        data: {
          category,
          bestMethod: bestMethod.derivation_method,
          bestError: Number(bestMethod.median_error),
          worstMethod: worstMethod.derivation_method,
          worstError: Number(worstMethod.median_error),
        },
      })
    }
  }

  return { updates, insights }
}

// ---------------------------------------------------------------------------
// 2. Regional Bias Correction
// ---------------------------------------------------------------------------

/**
 * Detect systematic over/under-estimation in specific regions.
 * If a region consistently gets prices 15% too high, apply correction factor.
 */
async function correctRegionalBias(): Promise<{
  corrections: number
  insights: AcceleratorInsight[]
}> {
  const sql = pgClient
  const insights: AcceleratorInsight[] = []

  const biases = await sql`
    SELECT
      pp.pricing_region_id AS region_id,
      pr.name AS region_name,
      pr.state,
      COUNT(*) AS sample_size,
      ROUND(AVG(pp.error_pct), 2) AS mean_bias,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pp.error_pct), 2) AS median_bias
    FROM openclaw.price_predictions pp
    JOIN openclaw.pricing_regions pr ON pr.id = pp.pricing_region_id
    WHERE pp.actual_cents IS NOT NULL
      AND pp.predicted_at > now() - interval '60 days'
      AND pp.pricing_region_id IS NOT NULL
    GROUP BY pp.pricing_region_id, pr.name, pr.state
    HAVING COUNT(*) >= 20
      AND ABS(AVG(pp.error_pct)) > 5
    ORDER BY ABS(AVG(pp.error_pct)) DESC
  `

  let corrections = 0
  for (const row of biases) {
    const meanBias = Number(row.mean_bias)
    // Correction factor: if we predict 15% too high, multiply by 0.87
    const correctionFactor = 1 / (1 + meanBias / 100)
    const direction = meanBias > 0 ? 'over' : 'under'

    await sql`
      INSERT INTO openclaw.regional_bias_corrections (
        pricing_region_id, state, bias_direction, bias_magnitude_pct,
        correction_factor, sample_size, computed_at
      ) VALUES (
        ${row.region_id}, ${row.state}, ${direction},
        ${Math.abs(meanBias)}, ${Math.round(correctionFactor * 1000) / 1000},
        ${row.sample_size}, now()
      )
      ON CONFLICT (pricing_region_id) DO UPDATE SET
        bias_direction = EXCLUDED.bias_direction,
        bias_magnitude_pct = EXCLUDED.bias_magnitude_pct,
        correction_factor = EXCLUDED.correction_factor,
        sample_size = EXCLUDED.sample_size,
        computed_at = now()
    `
    corrections++

    if (Math.abs(meanBias) > 15) {
      insights.push({
        type: 'regional_bias',
        message: `${row.region_name} (${row.state}): systematic ${direction}-estimation by ${Math.abs(meanBias).toFixed(1)}%. Correction factor: ${correctionFactor.toFixed(3)}`,
        data: {
          regionId: row.region_id,
          regionName: row.region_name,
          state: row.state,
          bias: meanBias,
          correctionFactor,
          sampleSize: Number(row.sample_size),
        },
      })
    }
  }

  return { corrections, insights }
}

// ---------------------------------------------------------------------------
// 3. Confidence Recalibration
// ---------------------------------------------------------------------------

/**
 * Check if stated confidence scores are well-calibrated.
 * A confidence of 0.7 should mean the price is within 30% of actual ~70% of the time.
 */
async function recalibrateConfidence(): Promise<{
  recalibrations: number
  insights: AcceleratorInsight[]
}> {
  const sql = pgClient
  const insights: AcceleratorInsight[] = []

  // Bucket predictions by confidence and measure actual accuracy
  const calibration = await sql`
    SELECT
      FLOOR(pp.confidence * 10) / 10 AS confidence_bucket,
      COUNT(*) AS sample_size,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE pp.abs_error_pct <= 15)
        / GREATEST(COUNT(*), 1), 1
      ) AS actual_accuracy_pct
    FROM openclaw.price_predictions pp
    WHERE pp.actual_cents IS NOT NULL
      AND pp.predicted_at > now() - interval '90 days'
    GROUP BY FLOOR(pp.confidence * 10) / 10
    HAVING COUNT(*) >= 30
    ORDER BY confidence_bucket
  `

  let recalibrations = 0
  for (const row of calibration) {
    const bucket = Number(row.confidence_bucket)
    const actualAccuracy = Number(row.actual_accuracy_pct)
    const expectedAccuracy = bucket * 100 // confidence 0.7 -> expect 70% accuracy
    const gap = actualAccuracy - expectedAccuracy

    // If gap is large (>15 points), the confidence scores need adjustment
    if (Math.abs(gap) > 15 && Number(row.sample_size) >= 50) {
      const adjustmentFactor = actualAccuracy / Math.max(expectedAccuracy, 1)

      await sql`
        INSERT INTO openclaw.confidence_calibration (
          confidence_bucket, expected_accuracy, actual_accuracy,
          calibration_gap, adjustment_factor, sample_size, computed_at
        ) VALUES (
          ${bucket}, ${expectedAccuracy}, ${actualAccuracy},
          ${gap}, ${Math.round(adjustmentFactor * 1000) / 1000},
          ${row.sample_size}, now()
        )
        ON CONFLICT (confidence_bucket) DO UPDATE SET
          actual_accuracy = EXCLUDED.actual_accuracy,
          calibration_gap = EXCLUDED.calibration_gap,
          adjustment_factor = EXCLUDED.adjustment_factor,
          sample_size = EXCLUDED.sample_size,
          computed_at = now()
      `
      recalibrations++

      insights.push({
        type: 'confidence_drift',
        message: `Confidence ${bucket.toFixed(1)}: expected ${expectedAccuracy.toFixed(0)}% accuracy, got ${actualAccuracy.toFixed(0)}% (gap: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}%)`,
        data: {
          bucket,
          expectedAccuracy,
          actualAccuracy,
          gap,
          sampleSize: Number(row.sample_size),
        },
      })
    }
  }

  return { recalibrations, insights }
}

// ---------------------------------------------------------------------------
// 4. Chef Feedback Integration
// ---------------------------------------------------------------------------

/**
 * Integrate chef price confirmations/rejections into the learning loop.
 * When a chef says "this price is too high/low", that's ground truth.
 */
async function integrateFeedback(): Promise<{
  integrated: number
  insights: AcceleratorInsight[]
}> {
  const sql = pgClient
  const insights: AcceleratorInsight[] = []

  // Find unprocessed chef feedback
  const feedback = await sql`
    SELECT
      cpf.id,
      cpf.canonical_ingredient_id,
      cpf.feedback_type,
      cpf.chef_reported_cents,
      cpf.system_showed_cents,
      cpf.state,
      cpf.created_at
    FROM openclaw.chef_price_feedback cpf
    WHERE cpf.processed_for_learning = false
      AND cpf.created_at > now() - interval '30 days'
    ORDER BY cpf.created_at ASC
    LIMIT 500
  `

  if (feedback.length === 0) return { integrated: 0, insights: [] }

  let integrated = 0
  for (const fb of feedback) {
    const feedbackType = fb.feedback_type as string
    const chefCents = fb.chef_reported_cents != null ? Number(fb.chef_reported_cents) : null
    const systemCents = Number(fb.system_showed_cents)

    if (feedbackType === 'confirmed') {
      // Chef confirmed price is correct - record as positive signal
      // This resolves any pending predictions near this price
      await sql`
        UPDATE openclaw.price_predictions pp
        SET
          actual_cents = ${systemCents},
          actual_source = 'chef_confirmation',
          actual_observed_at = ${fb.created_at},
          resolved_at = now(),
          error_pct = 0,
          abs_error_pct = 0
        WHERE pp.canonical_ingredient_id = ${fb.canonical_ingredient_id}
          AND pp.actual_cents IS NULL
          AND ABS(pp.predicted_cents - ${systemCents}) < ${systemCents} * 0.15
          AND pp.predicted_at < ${fb.created_at}
      `
    } else if (feedbackType === 'too_high' || feedbackType === 'too_low') {
      // Chef says price is wrong - if they gave a correction, use it
      if (chefCents != null) {
        await sql`
          UPDATE openclaw.price_predictions pp
          SET
            actual_cents = ${chefCents},
            actual_source = 'chef_correction',
            actual_observed_at = ${fb.created_at},
            resolved_at = now(),
            error_pct = ROUND(
              (pp.predicted_cents::numeric - ${chefCents}::numeric) / GREATEST(${chefCents}::numeric, 1) * 100, 3
            ),
            abs_error_pct = ROUND(
              ABS(pp.predicted_cents::numeric - ${chefCents}::numeric) / GREATEST(${chefCents}::numeric, 1) * 100, 3
            )
          WHERE pp.canonical_ingredient_id = ${fb.canonical_ingredient_id}
            AND pp.actual_cents IS NULL
            AND pp.predicted_at < ${fb.created_at}
        `
      }
    }

    // Mark feedback as processed
    await sql`
      UPDATE openclaw.chef_price_feedback
      SET processed_for_learning = true
      WHERE id = ${fb.id}
    `
    integrated++
  }

  if (integrated > 20) {
    insights.push({
      type: 'feedback_signal',
      message: `Integrated ${integrated} chef feedback signals. ${feedback.filter((f) => f.feedback_type === 'confirmed').length} confirmations, ${feedback.filter((f) => f.feedback_type !== 'confirmed').length} corrections.`,
      data: { total: integrated },
    })
  }

  return { integrated, insights }
}

// ---------------------------------------------------------------------------
// Main accelerator pipeline
// ---------------------------------------------------------------------------

export async function runAccelerator(): Promise<AcceleratorRunResult> {
  const start = Date.now()
  const allInsights: AcceleratorInsight[] = []

  // Run all sub-pipelines
  const [methods, bias, confidence, feedback] = await Promise.all([
    calibrateMethods(),
    correctRegionalBias(),
    recalibrateConfidence(),
    integrateFeedback(),
  ])

  allInsights.push(
    ...methods.insights,
    ...bias.insights,
    ...confidence.insights,
    ...feedback.insights
  )

  return {
    calibrationUpdates: methods.updates,
    biasCorrections: bias.corrections,
    methodReweights: methods.updates,
    confidenceRecalibrations: confidence.recalibrations,
    feedbackIntegrated: feedback.integrated,
    durationMs: Date.now() - start,
    insights: allInsights,
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Get current method performance rankings */
export async function getMethodPerformance(): Promise<MethodPerformance[]> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      derivation_method AS method,
      category,
      weight AS recommended_weight,
      mean_error_pct,
      sample_size,
      computed_at
    FROM openclaw.method_weights
    ORDER BY category, weight DESC
  `

  return rows.map((r) => ({
    method: r.method as string,
    category: r.category as string,
    totalPredictions: Number(r.sample_size),
    resolvedPredictions: Number(r.sample_size),
    meanAbsErrorPct: Number(r.mean_error_pct),
    medianAbsErrorPct: Number(r.mean_error_pct), // approximation
    within10Pct: 0, // would need separate query
    within20Pct: 0,
    improvingTrend: false,
    recommendedWeight: Number(r.recommended_weight),
  }))
}

/** Get regional bias corrections (for admin/diagnostics) */
export async function getRegionalBiases(): Promise<RegionalBias[]> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      rbc.pricing_region_id AS region_id,
      pr.name AS region_name,
      rbc.state,
      rbc.bias_direction,
      rbc.bias_magnitude_pct,
      rbc.correction_factor,
      rbc.sample_size
    FROM openclaw.regional_bias_corrections rbc
    JOIN openclaw.pricing_regions pr ON pr.id = rbc.pricing_region_id
    ORDER BY rbc.bias_magnitude_pct DESC
  `

  return rows.map((r) => ({
    regionId: r.region_id as string,
    regionName: r.region_name as string,
    state: r.state as string,
    biasDirection: r.bias_direction as 'over' | 'under' | 'neutral',
    biasMagnitudePct: Number(r.bias_magnitude_pct),
    correctionFactor: Number(r.correction_factor),
    sampleSize: Number(r.sample_size),
  }))
}

/** Get confidence calibration data (for diagnostics) */
export async function getConfidenceCalibration(): Promise<ConfidenceCalibration[]> {
  const sql = pgClient
  const rows = await sql`
    SELECT *
    FROM openclaw.confidence_calibration
    ORDER BY confidence_bucket
  `

  return rows.map((r) => ({
    bucket: `${Number(r.confidence_bucket).toFixed(1)}-${(Number(r.confidence_bucket) + 0.1).toFixed(1)}`,
    actualAccuracy: Number(r.actual_accuracy),
    calibrationGap: Number(r.calibration_gap),
    sampleSize: Number(r.sample_size),
  }))
}

/**
 * Get the recommended derivation method for an ingredient+category.
 * Used by the synthetic engine to choose the best approach.
 */
export async function getBestMethod(category: string): Promise<string | null> {
  const sql = pgClient
  const [row] = await sql`
    SELECT derivation_method
    FROM openclaw.method_weights
    WHERE category = ${category}
    ORDER BY weight DESC
    LIMIT 1
  `
  return row?.derivation_method as string | null
}

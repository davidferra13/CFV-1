/**
 * PIE Learning Corrections
 *
 * Applies compound-learning-accelerator outputs to resolved prices:
 *   - Regional bias correction (systematic over/under-estimation per region)
 *   - Confidence calibration (adjust stated confidence to match actual accuracy)
 *
 * CANARY SAFETY: corrections only apply when the accelerator has
 * sufficient observations (sample_size > 10). Empty tables or missing
 * data = no correction applied. Learning failure never breaks resolution.
 *
 * NOT a 'use server' file. Internal helper for resolve-price.ts.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { ResolvedPrice } from './resolve-price-helpers'

// ---------------------------------------------------------------------------
// In-memory cache (avoids DB hit on every price resolution)
// Refreshed every 10 minutes; accelerator runs every 6 hours so this is fine.
// ---------------------------------------------------------------------------

interface BiasCorrection {
  state: string
  correctionFactor: number
  sampleSize: number
}

interface ConfidenceAdjustment {
  bucket: number
  adjustmentFactor: number
  sampleSize: number
}

let biasCacheExpiry = 0
let biasCache: Map<string, BiasCorrection> = new Map()

let confidenceCacheExpiry = 0
let confidenceCache: Map<number, ConfidenceAdjustment> = new Map()

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ---------------------------------------------------------------------------
// Regional bias correction
// ---------------------------------------------------------------------------

async function loadBiasCorrections(): Promise<Map<string, BiasCorrection>> {
  try {
    const rows = await db.execute(sql`
      SELECT state, correction_factor, sample_size
      FROM openclaw.regional_bias_corrections
      WHERE sample_size > 10
        AND computed_at > now() - interval '7 days'
    `)
    const map = new Map<string, BiasCorrection>()
    for (const row of rows as unknown as Array<{
      state: string
      correction_factor: number
      sample_size: number
    }>) {
      map.set((row.state as string).toLowerCase(), {
        state: row.state as string,
        correctionFactor: Number(row.correction_factor),
        sampleSize: Number(row.sample_size),
      })
    }
    return map
  } catch {
    // Table may not exist or query may fail; return empty (no corrections)
    return new Map()
  }
}

/**
 * Get regional bias correction factor for a state.
 * Returns 1.0 (no correction) if no data available.
 */
export async function getRegionalBiasCorrection(
  state: string | null
): Promise<BiasCorrection | null> {
  if (!state) return null

  const now = Date.now()
  if (now > biasCacheExpiry) {
    biasCache = await loadBiasCorrections()
    biasCacheExpiry = now + CACHE_TTL_MS
  }

  return biasCache.get(state.toLowerCase()) || null
}

// ---------------------------------------------------------------------------
// Confidence calibration
// ---------------------------------------------------------------------------

async function loadConfidenceCalibration(): Promise<Map<number, ConfidenceAdjustment>> {
  try {
    const rows = await db.execute(sql`
      SELECT confidence_bucket, adjustment_factor, sample_size
      FROM openclaw.confidence_calibration
      WHERE sample_size > 10
        AND computed_at > now() - interval '7 days'
    `)
    const map = new Map<number, ConfidenceAdjustment>()
    for (const row of rows as unknown as Array<{
      confidence_bucket: number
      adjustment_factor: number
      sample_size: number
    }>) {
      const bucket = Math.round(Number(row.confidence_bucket) * 10) / 10
      map.set(bucket, {
        bucket,
        adjustmentFactor: Number(row.adjustment_factor),
        sampleSize: Number(row.sample_size),
      })
    }
    return map
  } catch {
    // Table may not exist; return empty (no adjustments)
    return new Map()
  }
}

/**
 * Get confidence adjustment factor for a given raw confidence score.
 * Returns null if no calibration data for this bucket.
 */
export async function getConfidenceAdjustment(
  rawConfidence: number
): Promise<ConfidenceAdjustment | null> {
  const now = Date.now()
  if (now > confidenceCacheExpiry) {
    confidenceCache = await loadConfidenceCalibration()
    confidenceCacheExpiry = now + CACHE_TTL_MS
  }

  // Map confidence to the nearest 0.1 bucket
  const bucket = Math.round((Math.floor(rawConfidence * 10) / 10) * 10) / 10
  return confidenceCache.get(bucket) || null
}

// ---------------------------------------------------------------------------
// Combined application (single entry point for resolve-price.ts)
// ---------------------------------------------------------------------------

/**
 * Apply compound-learning corrections to a resolved price:
 *   1. Regional bias correction on price cents
 *   2. Confidence calibration on confidence score
 *
 * SAFETY: Never modifies chef overrides or receipt prices (tier 0, 1).
 * Only applies to lower-trust tiers where synthetic/estimated prices benefit.
 */
export async function applyLearningCorrections(
  price: ResolvedPrice,
  state: string | null
): Promise<ResolvedPrice> {
  // Skip corrections for high-trust sources (chef confirmed prices)
  // These are ground truth and should never be modified
  const skipSources: string[] = ['chef_override', 'receipt']
  if (skipSources.includes(price.source)) return price

  let correctedCents = price.cents
  let correctedConfidence = price.confidence
  let correctionApplied = false
  const reasons: string[] = []

  try {
    // 1. Regional bias correction on price
    const bias = await getRegionalBiasCorrection(state)
    if (bias && bias.sampleSize > 10) {
      // Only apply correction if it's meaningful (> 3% bias)
      const factor = bias.correctionFactor
      if (Math.abs(factor - 1.0) > 0.03) {
        correctedCents = Math.round(price.cents * factor)
        correctionApplied = true
        reasons.push(
          `Regional bias correction for ${bias.state}: x${factor.toFixed(3)} (${bias.sampleSize} observations)`
        )
      }
    }

    // 2. Confidence calibration
    const calibration = await getConfidenceAdjustment(price.confidence)
    if (calibration && calibration.sampleSize > 10) {
      const factor = calibration.adjustmentFactor
      // Clamp adjusted confidence to [0.05, 0.99]
      correctedConfidence = Math.max(0.05, Math.min(0.99, price.confidence * factor))
      if (Math.abs(correctedConfidence - price.confidence) > 0.01) {
        correctionApplied = true
        reasons.push(
          `Confidence calibrated: ${price.confidence.toFixed(2)} -> ${correctedConfidence.toFixed(2)}`
        )
      }
    }
  } catch {
    // Learning correction failure must never break price resolution
    return price
  }

  if (!correctionApplied) return price

  // Build corrected price (preserves all other fields)
  const reason = [price.reason, ...reasons].filter(Boolean).join('; ')
  return {
    ...price,
    cents: correctedCents,
    confidence: correctedConfidence,
    // Recompute effective confidence (mirrors withDecay behavior)
    effectiveConfidence: correctedConfidence,
    reason: reason || null,
  }
}

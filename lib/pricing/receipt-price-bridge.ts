/**
 * Receipt-to-PIE Price Signal Bridge
 *
 * Connects the receipt scanning pipeline to PIE's pricing intelligence.
 * When a chef scans a receipt and confirms prices, this bridge:
 *
 *   1. Records ground-truth observations (actual shelf prices at store/date/location)
 *   2. Compares receipt price vs what PIE would have served (accuracy signal)
 *   3. Feeds anonymized aggregates into regional price pool
 *   4. Updates compound learning predictions for accuracy tracking
 *
 * This is the "passive signal engine" from the PIE National Vision spec.
 * Chef scans receipt for expense tracking; PIE learns from it for free.
 *
 * NOT a 'use server' file. Called by receipt-scan-actions after import.
 */

import { pgClient as sql } from '@/lib/db'
import { resolvePrice } from './resolve-price'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceiptPriceSignal {
  ingredientId: string
  ingredientName: string
  priceCents: number
  unit: string
  quantity: number
  storeName: string
  storeState: string | null
  storeZip: string | null
  purchaseDate: string
  tenantId: string
}

export interface AccuracyComparison {
  ingredientId: string
  ingredientName: string
  receiptPriceCents: number
  piePriceCents: number | null
  pieResolutionTier: string | null
  deviationPct: number | null
  pieWasAccurate: boolean
  receiptUnit: string
}

export interface BridgeResult {
  signalsProcessed: number
  accuracyComparisons: AccuracyComparison[]
  averageDeviation: number | null
  aggregatesUpdated: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Ground Truth Recording
// ---------------------------------------------------------------------------

/**
 * Record receipt price signals as ground-truth observations.
 * Stored in pie_ground_truth table for accuracy validation.
 */
async function recordGroundTruth(signals: ReceiptPriceSignal[]): Promise<number> {
  if (signals.length === 0) return 0

  // Batch insert ground truth observations
  let inserted = 0
  for (const s of signals) {
    try {
      await sql`
        INSERT INTO pie_ground_truth
        (ingredient_id, price_cents, unit, quantity, store_name, store_state, store_zip, purchase_date, tenant_id, created_at)
        VALUES (${s.ingredientId}, ${s.priceCents}, ${s.unit}, ${s.quantity}, ${s.storeName}, ${s.storeState}, ${s.storeZip}, ${s.purchaseDate}, ${s.tenantId}, NOW())
        ON CONFLICT DO NOTHING
      `
      inserted++
    } catch {
      // Skip duplicates or constraint violations
    }
  }

  return inserted
}

// ---------------------------------------------------------------------------
// Accuracy Comparison
// ---------------------------------------------------------------------------

/**
 * Compare receipt prices against what PIE would serve.
 * This is the core accuracy signal: reality vs prediction.
 */
async function compareWithPie(signals: ReceiptPriceSignal[]): Promise<AccuracyComparison[]> {
  const comparisons: AccuracyComparison[] = []

  for (const signal of signals) {
    try {
      // Get what PIE would serve for this ingredient in this region
      // Use the tenant's context for price resolution
      const pieResult = await resolvePrice(signal.ingredientId, signal.tenantId, {
        state: signal.storeState || undefined,
      })

      const piePriceCents = pieResult?.cents ?? null
      const pieResolutionTier = pieResult?.resolutionTier ?? null

      let deviationPct: number | null = null
      let pieWasAccurate = false

      if (piePriceCents !== null && signal.priceCents > 0) {
        deviationPct = (Math.abs(piePriceCents - signal.priceCents) / signal.priceCents) * 100
        // "Accurate" = within 15% (PIE national vision SLA)
        pieWasAccurate = deviationPct <= 15
      }

      comparisons.push({
        ingredientId: signal.ingredientId,
        ingredientName: signal.ingredientName,
        receiptPriceCents: signal.priceCents,
        piePriceCents,
        pieResolutionTier,
        deviationPct,
        pieWasAccurate,
        receiptUnit: signal.unit,
      })
    } catch {
      // Skip ingredients that fail resolution
    }
  }

  return comparisons
}

// ---------------------------------------------------------------------------
// Regional Aggregate Feed
// ---------------------------------------------------------------------------

/**
 * Feed anonymized price signals into regional aggregate pool.
 * Strips tenant identity; keeps store/state/date/price for regional averaging.
 */
async function feedRegionalAggregates(signals: ReceiptPriceSignal[]): Promise<number> {
  let updated = 0

  for (const signal of signals) {
    if (!signal.storeState) continue

    try {
      // Upsert into regional price observations (anonymized)
      await sql`
        INSERT INTO pie_regional_observations
        (ingredient_id, price_cents, unit, store_name, state, zip, observed_at, source)
        VALUES (${signal.ingredientId}, ${signal.priceCents}, ${signal.unit}, ${signal.storeName}, ${signal.storeState}, ${signal.storeZip}, ${signal.purchaseDate}, 'receipt')
        ON CONFLICT (ingredient_id, store_name, observed_at) DO UPDATE
        SET price_cents = EXCLUDED.price_cents
      `
      updated++
    } catch {
      // Skip constraint violations
    }
  }

  return updated
}

// ---------------------------------------------------------------------------
// Compound Learning Integration
// ---------------------------------------------------------------------------

/**
 * Record accuracy results for compound learning system.
 * Synthetic predictions get resolved against receipt ground truth.
 */
async function recordLearningSignals(comparisons: AccuracyComparison[]): Promise<void> {
  for (const comp of comparisons) {
    if (comp.piePriceCents === null || comp.deviationPct === null) continue

    try {
      // Record resolution event for compound learning
      await sql`
        INSERT INTO pie_prediction_resolutions
        (ingredient_id, predicted_cents, actual_cents, deviation_pct, resolution_tier, resolved_at, source)
        VALUES (${comp.ingredientId}, ${comp.piePriceCents}, ${comp.receiptPriceCents}, ${comp.deviationPct}, ${comp.pieResolutionTier}, NOW(), 'receipt')
        ON CONFLICT DO NOTHING
      `
    } catch {
      // Non-critical; skip
    }
  }
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Process receipt price signals through the full PIE bridge pipeline.
 * Called after a chef confirms a receipt import in receipt-scan-actions.
 *
 * Pipeline: record ground truth -> compare accuracy -> feed aggregates -> update learning
 */
export async function processReceiptSignals(signals: ReceiptPriceSignal[]): Promise<BridgeResult> {
  const start = Date.now()

  if (signals.length === 0) {
    return {
      signalsProcessed: 0,
      accuracyComparisons: [],
      averageDeviation: null,
      aggregatesUpdated: 0,
      durationMs: 0,
    }
  }

  // Step 1: Record ground truth
  await recordGroundTruth(signals)

  // Step 2: Compare with PIE predictions
  const comparisons = await compareWithPie(signals)

  // Step 3: Feed regional aggregates
  const aggregatesUpdated = await feedRegionalAggregates(signals)

  // Step 4: Record compound learning signals
  await recordLearningSignals(comparisons)

  // Calculate average deviation
  const deviations = comparisons.map((c) => c.deviationPct).filter((d): d is number => d !== null)
  const averageDeviation =
    deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : null

  return {
    signalsProcessed: signals.length,
    accuracyComparisons: comparisons,
    averageDeviation,
    aggregatesUpdated,
    durationMs: Date.now() - start,
  }
}

/**
 * Get PIE accuracy stats from ground truth comparisons.
 * Used by /pie-accuracy to validate pricing quality.
 */
export async function getAccuracyStats(opts?: { days?: number; state?: string }): Promise<{
  totalComparisons: number
  accurateCount: number
  accuracyPct: number
  avgDeviationPct: number
  byTier: Array<{ tier: string; count: number; accuracyPct: number; avgDeviation: number }>
}> {
  const days = opts?.days ?? 30

  const rows = opts?.state
    ? await sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN deviation_pct <= 15 THEN 1 END) as accurate,
          AVG(deviation_pct) as avg_deviation,
          resolution_tier
        FROM pie_prediction_resolutions
        WHERE resolved_at > NOW() - make_interval(days => ${days})
        GROUP BY resolution_tier
        ORDER BY COUNT(*) DESC
      `
    : await sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN deviation_pct <= 15 THEN 1 END) as accurate,
          AVG(deviation_pct) as avg_deviation,
          resolution_tier
        FROM pie_prediction_resolutions
        WHERE resolved_at > NOW() - make_interval(days => ${days})
        GROUP BY resolution_tier
        ORDER BY COUNT(*) DESC
      `

  const totalComparisons = rows.reduce((s, r) => s + parseInt(r.total), 0)
  const accurateCount = rows.reduce((s, r) => s + parseInt(r.accurate), 0)
  const accuracyPct = totalComparisons > 0 ? (accurateCount / totalComparisons) * 100 : 0
  const avgDeviationPct =
    rows.length > 0
      ? rows.reduce((s, r) => s + parseFloat(r.avg_deviation || '0') * parseInt(r.total), 0) /
        totalComparisons
      : 0

  const byTier = rows.map((r) => ({
    tier: r.resolution_tier || 'unknown',
    count: parseInt(r.total),
    accuracyPct: parseInt(r.total) > 0 ? (parseInt(r.accurate) / parseInt(r.total)) * 100 : 0,
    avgDeviation: parseFloat(r.avg_deviation || '0'),
  }))

  return { totalComparisons, accurateCount, accuracyPct, avgDeviationPct, byTier }
}

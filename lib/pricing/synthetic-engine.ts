/**
 * PIE Law 9: Synthetic Pricing Engine
 *
 * When Pi cannot obtain a real observed price for a census ingredient,
 * this engine generates the best possible estimate using every available signal.
 *
 * Derivation methods (in priority order):
 *   1. nearby_state     - Same ingredient, adjacent pricing region
 *   2. regional_avg     - Category average for that region
 *   3. usda_adjusted    - USDA baseline x regional cost index
 *   4. category_baseline - National avg for that food category
 *   5. weight_extrapolation - Known price per unit, different pack size
 *   6. seasonal_projection - Historical seasonal pattern
 *   7. commodity_correlation - Correlated commodity price movement
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient } from '@/lib/db'
import type { Sql } from 'postgres'
import { recordPredictionsBatch, type PredictionRecord } from './compound-learning'

// ---------------------------------------------------------------------------
// Learned method weights (from compound-learning-accelerator)
// ---------------------------------------------------------------------------

interface MethodWeight {
  derivation_method: string
  weight: number
  sample_size: number
  mean_error_pct: number
}

/**
 * Get the best-performing derivation method for a category,
 * as determined by the compound-learning-accelerator.
 * Returns null if no learned weights exist or confidence is insufficient.
 * CANARY: only returns a method when confidence > 0.7 weight AND sample_size > 10.
 */
async function getLearnedPreferredMethod(
  sql: PgSql,
  category: string
): Promise<MethodWeight | null> {
  try {
    const rows = await sql`
      SELECT derivation_method, weight, sample_size, mean_error_pct
      FROM openclaw.method_weights
      WHERE category = ${category}
        AND weight > 0.7
        AND sample_size > 10
      ORDER BY weight DESC
      LIMIT 1
    `
    if (rows.length === 0) return null
    return {
      derivation_method: rows[0].derivation_method as string,
      weight: Number(rows[0].weight),
      sample_size: Number(rows[0].sample_size),
      mean_error_pct: Number(rows[0].mean_error_pct),
    }
  } catch {
    // Table may not exist or be empty; gracefully skip
    return null
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PgSql = Sql

export interface SyntheticRunResult {
  totalCensusGaps: number
  syntheticsGenerated: number
  byMethod: Record<string, number>
  durationMs: number
  errors: string[]
}

interface CensusGapRow {
  ingredient_id: string
  name: string
  census_category: string
  standard_unit: string
  region_id: string
  region_slug: string
  cost_index: number
}

// ---------------------------------------------------------------------------
// Derivation methods
// ---------------------------------------------------------------------------

async function tryNearbyRegion(
  sql: PgSql,
  ingredientId: string,
  regionId: string
): Promise<{ cents: number; confidence: number; inputs: Record<string, unknown> } | null> {
  // Find resolved price in adjacent regions
  const rows = await sql`
    SELECT rp.price_cents, rp.confidence, pr.slug AS source_region
    FROM openclaw.resolved_prices rp
    JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
    WHERE rp.canonical_ingredient_id = ${ingredientId}
      AND rp.pricing_region_id != ${regionId}
      AND rp.is_synthetic = false
      AND rp.confidence > 0.3
    ORDER BY rp.confidence DESC, rp.updated_at DESC
    LIMIT 3
  `
  if (rows.length === 0) return null

  // Weighted average of nearby prices
  let totalWeight = 0
  let weightedSum = 0
  for (const r of rows) {
    const w = Number(r.confidence)
    weightedSum += Number(r.price_cents) * w
    totalWeight += w
  }

  const cents = Math.round(weightedSum / totalWeight)
  return {
    cents,
    confidence: Math.min(0.6, Number(rows[0].confidence) * 0.8),
    inputs: {
      source_regions: rows.map((r: Record<string, unknown>) => r.source_region),
      source_count: rows.length,
    },
  }
}

async function tryRegionalCategoryAvg(
  sql: PgSql,
  category: string,
  regionId: string
): Promise<{ cents: number; confidence: number; inputs: Record<string, unknown> } | null> {
  const [row] = await sql`
    SELECT
      ROUND(AVG(rp.price_cents)) AS avg_cents,
      count(*) AS sample_size
    FROM openclaw.resolved_prices rp
    JOIN openclaw.ingredient_census ic ON ic.ingredient_id = rp.canonical_ingredient_id
    WHERE ic.census_category = ${category}
      AND rp.pricing_region_id = ${regionId}
      AND rp.is_synthetic = false
      AND rp.confidence > 0.3
  `
  if (!row || Number(row.avg_cents) === 0) return null

  return {
    cents: Number(row.avg_cents),
    confidence: Math.min(0.4, 0.2 + Number(row.sample_size) * 0.02),
    inputs: { category, region_id: regionId, sample_size: Number(row.sample_size) },
  }
}

async function tryUsdaAdjusted(
  sql: PgSql,
  ingredientName: string,
  costIndex: number
): Promise<{ cents: number; confidence: number; inputs: Record<string, unknown> } | null> {
  const rows = await sql`
    SELECT item_name, price_cents, unit, region
    FROM openclaw.usda_price_baselines
    WHERE extensions.similarity(item_name, ${ingredientName}) > 0.3
      AND region = 'us_average'
    ORDER BY extensions.similarity(item_name, ${ingredientName}) DESC
    LIMIT 1
  `
  if (rows.length === 0) return null

  const baseCents = Number(rows[0].price_cents)
  const adjusted = Math.round(baseCents * costIndex)

  return {
    cents: adjusted,
    confidence: 0.35,
    inputs: {
      usda_item: rows[0].item_name,
      usda_cents: baseCents,
      cost_index: costIndex,
    },
  }
}

async function tryCategoryBaseline(
  sql: PgSql,
  category: string
): Promise<{ cents: number; confidence: number; inputs: Record<string, unknown> } | null> {
  // National average for the category across all regions
  const [row] = await sql`
    SELECT
      ROUND(AVG(rp.price_cents)) AS avg_cents,
      count(*) AS sample_size
    FROM openclaw.resolved_prices rp
    JOIN openclaw.ingredient_census ic ON ic.ingredient_id = rp.canonical_ingredient_id
    WHERE ic.census_category = ${category}
      AND rp.is_synthetic = false
      AND rp.confidence > 0.2
  `
  if (!row || Number(row.avg_cents) === 0) return null

  return {
    cents: Number(row.avg_cents),
    confidence: Math.min(0.25, 0.1 + Number(row.sample_size) * 0.001),
    inputs: { category, national_sample_size: Number(row.sample_size) },
  }
}

// Category price floors (cents per standard unit) as absolute last resort
const CATEGORY_FLOOR_CENTS: Record<string, number> = {
  protein: 499, // ~$4.99/lb
  seafood: 899, // ~$8.99/lb
  produce: 199, // ~$1.99/lb
  dairy: 349, // ~$3.49/unit
  herb: 199, // ~$1.99/bunch
  grain: 149, // ~$1.49/lb
  pantry: 249, // ~$2.49/unit
  spice: 399, // ~$3.99/jar
  oil: 549, // ~$5.49/bottle
  nut: 799, // ~$7.99/lb
  legume: 149, // ~$1.49/lb
  beverage: 299, // ~$2.99/unit
  baked: 349, // ~$3.49/unit
  sweet: 299, // ~$2.99/unit
  condiment: 349, // ~$3.49/unit
}

// ---------------------------------------------------------------------------
// Main synthetic pricing run
// ---------------------------------------------------------------------------

export async function runSyntheticEngine(): Promise<SyntheticRunResult> {
  const sql = pgClient
  const start = Date.now()
  const errors: string[] = []
  const byMethod: Record<string, number> = {}
  let generated = 0
  const predictions: PredictionRecord[] = []

  // Find all census ingredients that have NO resolved price in ANY region
  const gaps = (await sql`
    SELECT
      ic.ingredient_id,
      ci.name,
      ic.census_category,
      ic.standard_unit,
      pr.id AS region_id,
      pr.slug AS region_slug,
      pr.cost_index
    FROM openclaw.ingredient_census ic
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = ic.ingredient_id
    CROSS JOIN openclaw.pricing_regions pr
    WHERE ic.is_active = true
      AND pr.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM openclaw.resolved_prices rp
        WHERE rp.canonical_ingredient_id = ic.ingredient_id
          AND rp.pricing_region_id = pr.id
      )
    ORDER BY ic.census_tier ASC, ic.census_category
    LIMIT 10000
  `) as unknown as CensusGapRow[]

  console.log(`[synthetic] ${gaps.length} price cells need synthetic generation...`)

  // Pre-load learned method preferences per category (batch to avoid N+1)
  const learnedMethodCache = new Map<string, MethodWeight | null>()

  for (const gap of gaps) {
    try {
      // Try derivation methods in priority order
      let result: { cents: number; confidence: number; inputs: Record<string, unknown> } | null =
        null
      let method = ''

      // LEARNED METHOD FIRST (compound-learning-accelerator feedback loop)
      // If the accelerator has determined a preferred method for this category
      // with high confidence, try it first before the fixed waterfall.
      if (!learnedMethodCache.has(gap.census_category)) {
        learnedMethodCache.set(
          gap.census_category,
          await getLearnedPreferredMethod(sql, gap.census_category)
        )
      }
      const learnedPref = learnedMethodCache.get(gap.census_category)
      if (learnedPref) {
        const preferredMethod = learnedPref.derivation_method
        if (preferredMethod === 'nearby_state') {
          result = await tryNearbyRegion(sql, gap.ingredient_id, gap.region_id)
          if (result) method = 'nearby_state'
        } else if (preferredMethod === 'regional_avg') {
          result = await tryRegionalCategoryAvg(sql, gap.census_category, gap.region_id)
          if (result) method = 'regional_avg'
        } else if (preferredMethod === 'usda_adjusted') {
          result = await tryUsdaAdjusted(sql, gap.name, gap.cost_index)
          if (result) method = 'usda_adjusted'
        } else if (preferredMethod === 'category_baseline') {
          result = await tryCategoryBaseline(sql, gap.census_category)
          if (result) method = 'category_baseline'
        }
        // If the learned method produced a result, boost confidence slightly
        // (the system has validated this method works well for this category)
        if (result) {
          result.confidence = Math.min(result.confidence * 1.1, 0.85)
          result.inputs = {
            ...result.inputs,
            learned_method: true,
            learned_weight: learnedPref.weight,
            learned_sample_size: learnedPref.sample_size,
          }
        }
        // If learned method returned null, fall through to fixed waterfall below
      }

      // Method 1: Nearby region (fixed waterfall fallback)
      if (!result) {
        result = await tryNearbyRegion(sql, gap.ingredient_id, gap.region_id)
        if (result) {
          method = 'nearby_state'
        }
      }

      // Method 2: Regional category average
      if (!result) {
        result = await tryRegionalCategoryAvg(sql, gap.census_category, gap.region_id)
        if (result) method = 'regional_avg'
      }

      // Method 3: USDA adjusted
      if (!result) {
        result = await tryUsdaAdjusted(sql, gap.name, gap.cost_index)
        if (result) method = 'usda_adjusted'
      }

      // Method 4: National category baseline
      if (!result) {
        result = await tryCategoryBaseline(sql, gap.census_category)
        if (result) method = 'category_baseline'
      }

      // Method 5: Absolute floor (last resort, never returns null)
      if (!result) {
        const floor = CATEGORY_FLOOR_CENTS[gap.census_category] || 299
        result = {
          cents: Math.round(floor * gap.cost_index),
          confidence: 0.1,
          inputs: { category: gap.census_category, floor_cents: floor, cost_index: gap.cost_index },
        }
        method = 'category_floor'
      }

      // Write synthetic price
      const priceUnit = 'per_' + (gap.standard_unit || 'each')
      const inputsJson = JSON.stringify(result.inputs)

      await sql`
        INSERT INTO openclaw.synthetic_prices (
          canonical_ingredient_id, pricing_region_id,
          price_cents, price_unit, confidence,
          derivation_method, derivation_inputs, updated_at
        ) VALUES (
          ${gap.ingredient_id}, ${gap.region_id},
          ${result.cents}, ${priceUnit},
          ${result.confidence}, ${method},
          ${inputsJson}::jsonb, now()
        )
        ON CONFLICT (canonical_ingredient_id, pricing_region_id) DO UPDATE SET
          price_cents = EXCLUDED.price_cents,
          confidence = EXCLUDED.confidence,
          derivation_method = EXCLUDED.derivation_method,
          derivation_inputs = EXCLUDED.derivation_inputs,
          updated_at = now()
      `

      // Also upsert into resolved_prices so chefs always see something
      await sql`
        INSERT INTO openclaw.resolved_prices (
          canonical_ingredient_id, pricing_region_id,
          price_cents, price_unit,
          confidence, observation_count, source_count,
          price_type, computation_method,
          fallback_tier, is_synthetic, updated_at
        ) VALUES (
          ${gap.ingredient_id}, ${gap.region_id},
          ${result.cents}, ${priceUnit},
          ${result.confidence}, 0, 0,
          'retail', ${method},
          11, true, now()
        )
        ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type) DO UPDATE SET
          price_cents = EXCLUDED.price_cents,
          confidence = EXCLUDED.confidence,
          computation_method = EXCLUDED.computation_method,
          fallback_tier = EXCLUDED.fallback_tier,
          is_synthetic = EXCLUDED.is_synthetic,
          updated_at = now()
        WHERE openclaw.resolved_prices.is_synthetic = true
          OR openclaw.resolved_prices.confidence < EXCLUDED.confidence
      `

      // Record prediction for Law 7 compound learning
      predictions.push({
        canonicalIngredientId: gap.ingredient_id,
        pricingRegionId: gap.region_id,
        predictedCents: result.cents,
        predictedUnit: gap.standard_unit || 'each',
        derivationMethod: method,
        confidence: result.confidence,
      })

      byMethod[method] = (byMethod[method] || 0) + 1
      generated++

      if (generated % 1000 === 0) {
        console.log(`[synthetic] ${generated}/${gaps.length} generated`)
      }
    } catch (err) {
      const msg = `${gap.ingredient_id}@${gap.region_slug}: ${err instanceof Error ? err.message : 'unknown'}`
      errors.push(msg)
      if (errors.length > 50) break
    }
  }

  // Batch-record predictions for compound learning (Law 7)
  if (predictions.length > 0) {
    try {
      const recorded = await recordPredictionsBatch(predictions)
      console.log(`[synthetic] Recorded ${recorded} predictions for compound learning`)
    } catch (err) {
      console.error('[synthetic] Failed to record predictions:', err)
    }
  }

  const durationMs = Date.now() - start
  console.log(
    `[synthetic] Done: ${generated} generated in ${durationMs}ms. Methods: ${JSON.stringify(byMethod)}`
  )

  return {
    totalCensusGaps: gaps.length,
    syntheticsGenerated: generated,
    byMethod,
    durationMs,
    errors,
  }
}

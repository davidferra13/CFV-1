/**
 * Cross-Store Regional Average Pricing
 * Reads from the regional_price_averages materialized view.
 * Provides Tier 6 in the 10-tier resolution chain.
 *
 * With state grouping: prefers state-matched row, falls back to any available.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface RegionalAverage {
  ingredientId: string
  ingredientName: string
  category: string | null
  storeCount: number
  avgPricePerUnitCents: number
  minPricePerUnitCents: number
  maxPricePerUnitCents: number
  mostCommonUnit: string
  mostRecentDate: string
}

interface RegionalAvgRow {
  ingredient_id: string
  ingredient_name: string
  category: string | null
  store_state: string | null
  store_count: number
  avg_price_per_unit_cents: number
  min_price_per_unit_cents: number
  max_price_per_unit_cents: number
  most_common_unit: string
  most_recent_date: string
}

function mapRow(row: RegionalAvgRow): RegionalAverage {
  return {
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    category: row.category,
    storeCount: Number(row.store_count),
    avgPricePerUnitCents: Number(row.avg_price_per_unit_cents),
    minPricePerUnitCents: Number(row.min_price_per_unit_cents),
    maxPricePerUnitCents: Number(row.max_price_per_unit_cents),
    mostCommonUnit: row.most_common_unit || 'each',
    mostRecentDate: row.most_recent_date,
  }
}

/**
 * Get cross-store average price for a single ingredient.
 * Prefers state-matched row, falls back to any available.
 * Returns null if the materialized view has no data or fewer than 2 stores.
 */
export async function getRegionalAverage(
  ingredientId: string,
  state?: string | null
): Promise<RegionalAverage | null> {
  try {
    const rows = (await db.execute(sql`
      SELECT ingredient_id, ingredient_name, category, store_state, store_count,
             avg_price_per_unit_cents, min_price_per_unit_cents, max_price_per_unit_cents,
             most_common_unit, most_recent_date
      FROM regional_price_averages
      WHERE ingredient_id = ${ingredientId}
      ORDER BY
        CASE WHEN ${state} IS NOT NULL AND store_state = ${state} THEN 0 ELSE 1 END,
        store_count DESC
      LIMIT 1
    `)) as unknown as RegionalAvgRow[]

    if (rows.length === 0) return null
    const row = rows[0]
    if (!row.avg_price_per_unit_cents || row.avg_price_per_unit_cents <= 0) return null

    return mapRow(row)
  } catch (err) {
    // View may not exist yet (migration not applied). Gracefully skip.
    console.warn(
      `[regional-avg] Failed to query regional_price_averages: ${err instanceof Error ? err.message : 'unknown'}`
    )
    return null
  }
}

/**
 * Batch lookup: get regional averages for multiple ingredients.
 * Returns a Map from ingredient_id to RegionalAverage.
 * Prefers state-matched rows per ingredient.
 */
export async function getRegionalAveragesBatch(
  ingredientIds: string[],
  state?: string | null
): Promise<Map<string, RegionalAverage>> {
  const result = new Map<string, RegionalAverage>()
  if (ingredientIds.length === 0) return result

  try {
    const rows = (await db.execute(sql`
      SELECT DISTINCT ON (ingredient_id)
             ingredient_id, ingredient_name, category, store_state, store_count,
             avg_price_per_unit_cents, min_price_per_unit_cents, max_price_per_unit_cents,
             most_common_unit, most_recent_date
      FROM regional_price_averages
      WHERE ingredient_id = ANY(${ingredientIds})
      ORDER BY ingredient_id,
        CASE WHEN ${state} IS NOT NULL AND store_state = ${state} THEN 0 ELSE 1 END,
        store_count DESC
    `)) as unknown as RegionalAvgRow[]

    for (const row of rows) {
      if (row.avg_price_per_unit_cents && row.avg_price_per_unit_cents > 0) {
        result.set(row.ingredient_id, mapRow(row))
      }
    }
  } catch (err) {
    console.warn(
      `[regional-avg] Batch query failed: ${err instanceof Error ? err.message : 'unknown'}`
    )
  }

  return result
}

/**
 * Refresh both materialized views. Call after sync completes.
 * Uses CONCURRENTLY to avoid locking reads during refresh.
 */
export async function refreshPriceViews(): Promise<{ success: boolean; error?: string }> {
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY regional_price_averages`)
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY category_price_baselines`)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[regional-avg] Failed to refresh views: ${msg}`)
    return { success: false, error: msg }
  }
}

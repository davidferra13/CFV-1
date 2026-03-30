/**
 * Category Price Baselines
 * Reads from the category_price_baselines materialized view.
 * Provides Tier 9 in the 10-tier resolution chain (last resort before "none").
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface CategoryBaseline {
  category: string
  ingredientCount: number
  avgCentsPerUnit: number
  medianCentsPerUnit: number
  mostCommonUnit: string
}

interface BaselineRow {
  category: string
  ingredient_count: number
  avg_cents_per_unit: number
  median_cents_per_unit: number
  most_common_unit: string
}

/**
 * Get category-level baseline price for an ingredient category.
 * Returns the median price per unit across all ingredients in this category.
 * Returns null if the category doesn't exist in the view or has too few data points.
 */
export async function getCategoryBaseline(category: string): Promise<CategoryBaseline | null> {
  if (!category) return null

  try {
    const rows = (await db.execute(sql`
      SELECT category, ingredient_count, avg_cents_per_unit,
             median_cents_per_unit, most_common_unit
      FROM category_price_baselines
      WHERE category = ${category}
    `)) as unknown as BaselineRow[]

    if (rows.length === 0) return null
    const row = rows[0]
    if (!row.median_cents_per_unit || row.median_cents_per_unit <= 0) return null

    return {
      category: row.category,
      ingredientCount: Number(row.ingredient_count),
      avgCentsPerUnit: Number(row.avg_cents_per_unit),
      medianCentsPerUnit: Math.round(Number(row.median_cents_per_unit)),
      mostCommonUnit: row.most_common_unit || 'each',
    }
  } catch (err) {
    // View may not exist yet. Gracefully skip.
    console.warn(
      `[category-baseline] Failed to query: ${err instanceof Error ? err.message : 'unknown'}`
    )
    return null
  }
}

/**
 * Batch lookup: get baselines for multiple categories at once.
 * Returns a Map from category name to CategoryBaseline.
 */
export async function getCategoryBaselinesBatch(
  categories: string[]
): Promise<Map<string, CategoryBaseline>> {
  const result = new Map<string, CategoryBaseline>()
  const uniqueCategories = [...new Set(categories.filter(Boolean))]
  if (uniqueCategories.length === 0) return result

  try {
    const rows = (await db.execute(sql`
      SELECT category, ingredient_count, avg_cents_per_unit,
             median_cents_per_unit, most_common_unit
      FROM category_price_baselines
      WHERE category = ANY(${uniqueCategories})
    `)) as unknown as BaselineRow[]

    for (const row of rows) {
      if (row.median_cents_per_unit && row.median_cents_per_unit > 0) {
        result.set(row.category, {
          category: row.category,
          ingredientCount: Number(row.ingredient_count),
          avgCentsPerUnit: Number(row.avg_cents_per_unit),
          medianCentsPerUnit: Math.round(Number(row.median_cents_per_unit)),
          mostCommonUnit: row.most_common_unit || 'each',
        })
      }
    }
  } catch (err) {
    console.warn(
      `[category-baseline] Batch query failed: ${err instanceof Error ? err.message : 'unknown'}`
    )
  }

  return result
}

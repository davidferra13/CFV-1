'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ============================================
// COSTING COVERAGE
// ============================================

export interface CostingCoverage {
  totalIngredients: number
  pricedIngredients: number
  coveragePct: number | null
  avgConfidence: number | null
  weakestLinks: { name: string; reason: string }[]
}

/**
 * Get costing coverage for a recipe.
 * Counts ingredients with non-null cost_per_unit_cents vs total.
 */
export async function getRecipeCostingCoverageAction(recipeId: string): Promise<CostingCoverage> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all recipe ingredients with their ingredient details
  const { data: riRows } = await db
    .from('recipe_ingredients')
    .select(
      'ingredient_id, ingredient:ingredients(name, cost_per_unit_cents, last_price_confidence)'
    )
    .eq('recipe_id', recipeId)

  if (!riRows || riRows.length === 0) {
    return {
      totalIngredients: 0,
      pricedIngredients: 0,
      coveragePct: null,
      avgConfidence: null,
      weakestLinks: [],
    }
  }

  const total = riRows.length
  let priced = 0
  let confidenceSum = 0
  let confidenceCount = 0
  const weakestLinks: { name: string; reason: string }[] = []

  for (const ri of riRows) {
    const ing = ri.ingredient as any
    if (!ing) continue

    if (ing.cost_per_unit_cents != null && ing.cost_per_unit_cents > 0) {
      priced++
      if (ing.last_price_confidence != null) {
        confidenceSum += Number(ing.last_price_confidence)
        confidenceCount++
      }
    } else {
      weakestLinks.push({ name: ing.name || 'Unknown', reason: 'No price data' })
    }
  }

  return {
    totalIngredients: total,
    pricedIngredients: priced,
    coveragePct: total > 0 ? Math.round((priced / total) * 100) : null,
    avgConfidence:
      confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) / 100 : null,
    weakestLinks: weakestLinks.slice(0, 10),
  }
}

/**
 * Get costing coverage for a menu.
 * Deduplicates ingredients across all recipes in the menu.
 */
export async function getMenuCostingCoverageAction(menuId: string): Promise<CostingCoverage> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Walk the hierarchy: menu -> dishes -> components -> recipes -> recipe_ingredients
  const { data: dishes } = await db.from('dishes').select('id').eq('menu_id', menuId)

  if (!dishes || dishes.length === 0) {
    return {
      totalIngredients: 0,
      pricedIngredients: 0,
      coveragePct: null,
      avgConfidence: null,
      weakestLinks: [],
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)

  if (!components) {
    return {
      totalIngredients: 0,
      pricedIngredients: 0,
      coveragePct: null,
      avgConfidence: null,
      weakestLinks: [],
    }
  }

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id).filter(Boolean))]
  if (recipeIds.length === 0) {
    return {
      totalIngredients: 0,
      pricedIngredients: 0,
      coveragePct: null,
      avgConfidence: null,
      weakestLinks: [],
    }
  }

  // Get all recipe ingredients, deduplicated by ingredient_id
  const { data: riRows } = await db
    .from('recipe_ingredients')
    .select(
      'ingredient_id, ingredient:ingredients(name, cost_per_unit_cents, last_price_confidence)'
    )
    .in('recipe_id', recipeIds)

  if (!riRows) {
    return {
      totalIngredients: 0,
      pricedIngredients: 0,
      coveragePct: null,
      avgConfidence: null,
      weakestLinks: [],
    }
  }

  // Deduplicate by ingredient_id (butter in 3 recipes counts once)
  const seen = new Map<string, any>()
  for (const ri of riRows) {
    if (!seen.has(ri.ingredient_id)) {
      seen.set(ri.ingredient_id, ri.ingredient)
    }
  }

  const total = seen.size
  let priced = 0
  let confidenceSum = 0
  let confidenceCount = 0
  const weakestLinks: { name: string; reason: string }[] = []

  for (const [, ing] of seen) {
    if (!ing) continue

    if (ing.cost_per_unit_cents != null && ing.cost_per_unit_cents > 0) {
      priced++
      if (ing.last_price_confidence != null) {
        confidenceSum += Number(ing.last_price_confidence)
        confidenceCount++
      }
    } else {
      weakestLinks.push({ name: ing.name || 'Unknown', reason: 'No price data' })
    }
  }

  return {
    totalIngredients: total,
    pricedIngredients: priced,
    coveragePct: total > 0 ? Math.round((priced / total) * 100) : null,
    avgConfidence:
      confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) / 100 : null,
    weakestLinks: weakestLinks.slice(0, 10),
  }
}

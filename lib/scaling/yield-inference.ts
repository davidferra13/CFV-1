// Yield Inference Engine - Deterministic (Formula > AI)
// Infers a canonical default yield for recipes when yield_quantity is not set.
// Read-only computation; never auto-writes to DB.
//
// Priority:
// 1. Explicit yield_quantity (chef entered it)
// 2. Servings field (fallback)
// 3. Inferred from protein weight / standard portion size
//
// All math, no LLM.

import { convertQuantity } from '@/lib/units/conversion-engine'

// ── Types ────────────────────────────────────────────────────────────────

export type YieldSource = 'explicit' | 'servings' | 'inferred'

export type InferredYield = {
  value: number // estimated number of servings/portions
  source: YieldSource // how it was determined
  confidence: number // 0-1 (1.0 for explicit, 0.9 for servings, 0.3-0.7 for inferred)
}

export type IngredientForYield = {
  quantity: number
  unit: string
  category: string // ingredient_category: protein, produce, dairy, etc.
  name: string
}

// ── Standard Portion Sizes (grams) ───────────────────────────────────────
// These are industry-standard per-person portion sizes for plated service.
// Used to estimate how many servings a recipe makes from its ingredient quantities.

const PORTION_SIZES_G: Record<string, number> = {
  protein: 170, // 6 oz cooked protein (standard entree portion)
  produce: 115, // ~4 oz per side
  dairy: 30, // ~1 oz (cheese, cream component)
  pantry: 85, // ~3 oz (starch, grain base)
  baking: 60, // ~2 oz per dessert serving
  frozen: 115, // treated like produce
  canned: 85, // treated like pantry
}

// ── Core Inference ───────────────────────────────────────────────────────

/**
 * Infer the yield (serving count) for a recipe.
 *
 * Returns the estimated number of servings with a confidence score
 * and the source of the estimate.
 *
 * This is a pure function: no DB calls, no side effects.
 */
export function inferYieldQuantity(recipe: {
  yieldQuantity: number | null
  servings: number | null
  ingredients: IngredientForYield[]
}): InferredYield {
  // Priority 1: Explicit yield_quantity
  if (recipe.yieldQuantity && recipe.yieldQuantity > 0) {
    return {
      value: recipe.yieldQuantity,
      source: 'explicit',
      confidence: 1.0,
    }
  }

  // Priority 2: Servings field
  if (recipe.servings && recipe.servings > 0) {
    return {
      value: recipe.servings,
      source: 'servings',
      confidence: 0.9,
    }
  }

  // Priority 3: Infer from ingredient weights
  // Strategy: sum total weight per category, divide by standard portion size,
  // take the median estimate across categories that have ingredients.
  if (recipe.ingredients.length === 0) {
    return { value: 4, source: 'inferred', confidence: 0.2 }
  }

  const categoryWeightsG = new Map<string, number>()

  for (const ing of recipe.ingredients) {
    const portionSize = PORTION_SIZES_G[ing.category]
    if (!portionSize) continue // skip categories we can not reason about (spice, oil, etc.)

    // Try to convert ingredient quantity to grams
    let grams: number | null = null

    // Direct weight conversion
    grams = convertQuantity(ing.quantity, ing.unit, 'g')

    if (grams === null) {
      // For count-based items, use rough heuristics
      const unitLower = ing.unit.toLowerCase()
      if (['each', 'ea', 'piece', 'pieces'].includes(unitLower)) {
        // Rough per-item weight estimates by category
        if (ing.category === 'protein')
          grams = ing.quantity * 200 // ~7 oz per piece
        else if (ing.category === 'produce') grams = ing.quantity * 150 // ~5 oz per piece
      }
    }

    if (grams !== null && grams > 0) {
      const current = categoryWeightsG.get(ing.category) ?? 0
      categoryWeightsG.set(ing.category, current + grams)
    }
  }

  if (categoryWeightsG.size === 0) {
    return { value: 4, source: 'inferred', confidence: 0.2 }
  }

  // Compute estimated servings per category
  const estimates: number[] = []
  for (const [category, totalGrams] of categoryWeightsG) {
    const portionSize = PORTION_SIZES_G[category]
    if (!portionSize) continue
    const estimated = totalGrams / portionSize
    if (estimated >= 1) {
      estimates.push(estimated)
    }
  }

  if (estimates.length === 0) {
    return { value: 4, source: 'inferred', confidence: 0.2 }
  }

  // Use median for robustness (avoids outlier categories skewing the result)
  estimates.sort((a, b) => a - b)
  const median =
    estimates.length % 2 === 0
      ? (estimates[estimates.length / 2 - 1] + estimates[estimates.length / 2]) / 2
      : estimates[Math.floor(estimates.length / 2)]

  // Round to nearest 0.5
  const rounded = Math.round(median * 2) / 2

  // Confidence scales with how many categories contributed
  const confidence = Math.min(0.7, 0.3 + estimates.length * 0.1)

  return {
    value: Math.max(1, rounded),
    source: 'inferred',
    confidence,
  }
}

// Recipe Scaling by Guest Count - Pure Deterministic Functions
// 4-category scaling model: Bulk, Flavor, Structure, Finishing
//
// This is a simplified categorical wrapper around the existing per-ingredient-category
// scaling system in portion-standards.ts. It groups the DB ingredient_category enum
// values into 4 broad scaling buckets for UI display and quick mental model.
//
// For the actual math, it delegates to the fine-grained exponents in portion-standards.ts
// so that existing smart scaling behavior is preserved.

import { smartScale } from '@/lib/recipes/portion-standards'

// ── Scaling Categories ─────────────────────────────────────────────────────────

export type ScalingCategory = 'bulk' | 'flavor' | 'structure' | 'finishing'

// Scaling rates per category (used for the simplified 4-category model)
const CATEGORY_RATES: Record<ScalingCategory, number> = {
  bulk: 1.0, // Linear: proteins, starches, vegetables
  flavor: 0.75, // Sub-linear: spices, herbs, aromatics
  structure: 1.0, // Linear but warn above 4x: flour, eggs, leavening
  finishing: 0.6, // Heavily sub-linear: garnishes, plating sauces
}

// Map from DB ingredient_category enum to our 4 scaling categories
const CATEGORY_MAP: Record<string, ScalingCategory> = {
  protein: 'bulk',
  produce: 'bulk',
  dairy: 'bulk',
  frozen: 'bulk',
  beverage: 'bulk',
  other: 'bulk',
  // Flavor
  spice: 'flavor',
  fresh_herb: 'flavor',
  dry_herb: 'flavor',
  condiment: 'flavor',
  pantry: 'flavor',
  oil: 'flavor',
  alcohol: 'flavor',
  specialty: 'flavor',
  // Structure
  baking: 'structure',
  // Finishing
  // (No DB category maps directly to finishing - garnish/sauce items
  //  are typically categorized as produce/condiment in the DB.
  //  This category is available for explicit assignment.)
}

// ── Public Functions ───────────────────────────────────────────────────────────

/**
 * Determine the 4-category scaling bucket for a given ingredient category.
 * Uses the DB ingredient_category enum value (protein, spice, baking, etc.).
 */
export function getScalingCategory(ingredientCategory: string): ScalingCategory {
  return CATEGORY_MAP[ingredientCategory] ?? 'bulk'
}

/**
 * Get the scaling rate for a given scaling category.
 */
export function getScalingRate(category: ScalingCategory): number {
  return CATEGORY_RATES[category]
}

/**
 * Human-readable label for each scaling category.
 */
export function getScalingCategoryLabel(category: ScalingCategory): string {
  switch (category) {
    case 'bulk':
      return 'Bulk (linear)'
    case 'flavor':
      return 'Flavor (75%)'
    case 'structure':
      return 'Structure (linear)'
    case 'finishing':
      return 'Finishing (60%)'
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScalableIngredient = {
  ingredientId: string
  name: string
  quantity: number
  unit: string
  ingredientCategory: string // DB category (protein, spice, etc.)
}

export type ScaledIngredient = {
  ingredientId: string
  name: string
  originalQty: number
  scaledQty: number
  unit: string
  scalingCategory: ScalingCategory
  scaleFactor: number
}

export type ScaleResult = {
  scaledIngredients: ScaledIngredient[]
  scaleFactor: number
  warnings: string[]
}

// ── Core Scaling Function ──────────────────────────────────────────────────────

/**
 * Scale a recipe's ingredients from originalYield to targetYield.
 *
 * Uses the fine-grained per-ingredient-category exponents from portion-standards.ts
 * for the actual math, but reports the simplified 4-category bucket for UI display.
 *
 * @param ingredients - Array of ingredients with quantities and DB categories
 * @param originalYield - The recipe's base yield (servings)
 * @param targetYield - The desired yield (servings/guests)
 * @returns Scaled ingredients with category info and any warnings
 */
export function scaleRecipe(
  ingredients: ScalableIngredient[],
  originalYield: number,
  targetYield: number
): ScaleResult {
  if (originalYield <= 0 || targetYield <= 0) {
    return {
      scaledIngredients: ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        name: ing.name,
        originalQty: ing.quantity,
        scaledQty: ing.quantity,
        unit: ing.unit,
        scalingCategory: getScalingCategory(ing.ingredientCategory),
        scaleFactor: 1,
      })),
      scaleFactor: 1,
      warnings: ['Invalid yield values. Returning original quantities.'],
    }
  }

  const scaleFactor = targetYield / originalYield
  const warnings: string[] = []

  if (scaleFactor > 4) {
    warnings.push(
      'Large batch scaling (over 4x) may need manual adjustment, especially for baking and structure ingredients.'
    )
  }

  const scaledIngredients: ScaledIngredient[] = ingredients.map((ing) => {
    const scalingCategory = getScalingCategory(ing.ingredientCategory)

    // Use the fine-grained smartScale from portion-standards for actual math
    const scaledQty = smartScale(ing.quantity, scaleFactor, ing.ingredientCategory)

    return {
      ingredientId: ing.ingredientId,
      name: ing.name,
      originalQty: ing.quantity,
      scaledQty: Math.round(scaledQty * 100) / 100, // Round to 2 decimal places
      unit: ing.unit,
      scalingCategory,
      scaleFactor,
    }
  })

  return { scaledIngredients, scaleFactor, warnings }
}

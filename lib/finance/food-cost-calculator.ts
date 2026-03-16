// Food Cost Calculator - pure deterministic functions (Formula > AI)
// No server dependencies, no database calls. Pure math.

import { computeIngredientCost, lookupDensity } from '@/lib/units/conversion-engine'

export type FoodCostRating = 'excellent' | 'good' | 'fair' | 'high'

export interface FoodCostRatingResult {
  rating: FoodCostRating
  label: string
  color: string // tailwind color class
}

/**
 * Sum ingredient costs for a recipe.
 * Each ingredient has qty, unit cost per unit, and a total cost.
 */
export function calculateRecipeFoodCost(
  ingredients: Array<{ qty: number; costPerUnitCents: number }>
): number {
  let total = 0
  for (const ing of ingredients) {
    total += Math.round(ing.qty * ing.costPerUnitCents)
  }
  return total
}

/**
 * Unit-aware recipe food cost calculation.
 * Handles cases where recipe unit differs from ingredient cost unit
 * (e.g., recipe uses cups but ingredient is priced per lb).
 * Falls back to simple multiplication when units match or conversion isn't possible.
 */
export function calculateRecipeFoodCostWithUnits(
  ingredients: Array<{
    qty: number
    recipeUnit: string
    costPerUnitCents: number
    costUnit: string
    ingredientName?: string
    densityGPerMl?: number | null
  }>
): { totalCents: number; itemCosts: Array<{ costCents: number; converted: boolean }> } {
  let totalCents = 0
  const itemCosts: Array<{ costCents: number; converted: boolean }> = []

  for (const ing of ingredients) {
    // Try unit-aware conversion first
    const density =
      ing.densityGPerMl ?? (ing.ingredientName ? lookupDensity(ing.ingredientName) : null)
    const cost = computeIngredientCost(
      ing.qty,
      ing.recipeUnit,
      ing.costPerUnitCents,
      ing.costUnit,
      density
    )

    if (cost !== null) {
      totalCents += cost
      itemCosts.push({ costCents: cost, converted: true })
    } else {
      // Fallback: assume same unit (existing behavior)
      const fallback = Math.round(ing.qty * ing.costPerUnitCents)
      totalCents += fallback
      itemCosts.push({ costCents: fallback, converted: false })
    }
  }

  return { totalCents, itemCosts }
}

/**
 * Industry-standard food cost percentage: (food cost / revenue) * 100
 * Returns 0 if revenue is zero (avoids division by zero).
 */
export function calculateFoodCostPercentage(foodCostCents: number, revenueCents: number): number {
  if (revenueCents <= 0) return 0
  return Math.round((foodCostCents / revenueCents) * 1000) / 10
}

/**
 * Rate food cost percentage against industry benchmarks for private chefs.
 * < 25%: excellent (green)
 * 25-30%: good (emerald)
 * 30-35%: fair (amber)
 * > 35%: high (red)
 */
export function getFoodCostRating(percentage: number): FoodCostRatingResult {
  if (percentage < 25) {
    return { rating: 'excellent', label: 'Excellent', color: 'text-green-500' }
  }
  if (percentage <= 30) {
    return { rating: 'good', label: 'Good', color: 'text-emerald-500' }
  }
  if (percentage <= 35) {
    return { rating: 'fair', label: 'Fair', color: 'text-amber-500' }
  }
  return { rating: 'high', label: 'High', color: 'text-red-500' }
}

/**
 * Badge color class for food cost percentage display.
 */
export function getFoodCostBadgeColor(percentage: number): string {
  if (percentage < 25) return 'bg-green-500/10 text-green-500 border-green-500/20'
  if (percentage <= 30) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  if (percentage <= 35) return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  return 'bg-red-500/10 text-red-500 border-red-500/20'
}

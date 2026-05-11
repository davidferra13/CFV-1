// Menu Cost Provenance
// Aggregates recipe-level confidence across all dishes in a menu.
// Pure function: no DB calls, no AI. Consumes RecipeCostProvenance results.
// This is the second layer: recipe confidence -> menu confidence -> quote confidence.

import type {
  CostConfidenceLevel,
  ProvenanceIssue,
  RecipeCostProvenance,
} from './recipe-cost-provenance'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DishProvenance = {
  dishId: string
  dishName: string
  recipeCount: number
  avgConfidenceScore: number
  confidenceLevel: CostConfidenceLevel
  worstRecipeName: string | null
  worstRecipeScore: number | null
  totalIngredients: number
  pricedCount: number
  missingCount: number
  staleCount: number
}

export type MenuCostProvenance = {
  // Overall menu verdict
  confidenceLevel: CostConfidenceLevel
  confidenceScore: number // 0-100, weighted average by ingredient count
  confidenceLabel: string

  // Dish summary
  dishCount: number
  componentCount: number
  dishes: DishProvenance[]

  // Aggregate ingredient stats (deduplicated across recipes)
  totalIngredients: number
  pricedCount: number
  missingCount: number
  staleCount: number

  // Menu-level issues
  issues: ProvenanceIssue[]
}

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export type DishProvenanceInput = {
  dishId: string
  dishName: string
  recipes: Array<{
    recipeName: string
    provenance: RecipeCostProvenance
  }>
}

export type MenuProvenanceInput = {
  dishes: DishProvenanceInput[]
  componentCount: number
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

export function computeMenuCostProvenance(input: MenuProvenanceInput): MenuCostProvenance {
  const { dishes, componentCount } = input

  // Per-dish provenance
  const dishProvenances: DishProvenance[] = []

  let totalWeightedScore = 0
  let totalWeight = 0
  let menuTotalIngredients = 0
  let menuPricedCount = 0
  let menuMissingCount = 0
  let menuStaleCount = 0

  for (const dish of dishes) {
    if (dish.recipes.length === 0) {
      dishProvenances.push({
        dishId: dish.dishId,
        dishName: dish.dishName,
        recipeCount: 0,
        avgConfidenceScore: 0,
        confidenceLevel: 'insufficient',
        worstRecipeName: null,
        worstRecipeScore: null,
        totalIngredients: 0,
        pricedCount: 0,
        missingCount: 0,
        staleCount: 0,
      })
      continue
    }

    let dishTotalIngredients = 0
    let dishPricedCount = 0
    let dishMissingCount = 0
    let dishStaleCount = 0
    let dishWeightedScore = 0
    let dishWeight = 0
    let worstRecipeName: string | null = null
    let worstRecipeScore: number | null = null

    for (const recipe of dish.recipes) {
      const p = recipe.provenance
      const weight = p.totalIngredients || 1

      dishWeightedScore += p.confidenceScore * weight
      dishWeight += weight
      dishTotalIngredients += p.totalIngredients
      dishPricedCount += p.pricedCount
      dishMissingCount += p.noPriceCount
      dishStaleCount += p.staleCount

      if (worstRecipeScore === null || p.confidenceScore < worstRecipeScore) {
        worstRecipeScore = p.confidenceScore
        worstRecipeName = recipe.recipeName
      }
    }

    const avgScore = dishWeight > 0 ? Math.round(dishWeightedScore / dishWeight) : 0

    dishProvenances.push({
      dishId: dish.dishId,
      dishName: dish.dishName,
      recipeCount: dish.recipes.length,
      avgConfidenceScore: avgScore,
      confidenceLevel: scoreToLevel(avgScore, dishTotalIngredients),
      worstRecipeName,
      worstRecipeScore,
      totalIngredients: dishTotalIngredients,
      pricedCount: dishPricedCount,
      missingCount: dishMissingCount,
      staleCount: dishStaleCount,
    })

    totalWeightedScore += dishWeightedScore
    totalWeight += dishWeight
    menuTotalIngredients += dishTotalIngredients
    menuPricedCount += dishPricedCount
    menuMissingCount += dishMissingCount
    menuStaleCount += dishStaleCount
  }

  // Overall menu score (weighted by ingredient count across all recipes)
  const menuScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0
  const menuLevel = scoreToLevel(menuScore, menuTotalIngredients)

  // Build menu-level label
  const confidenceLabel = buildMenuLabel(
    menuLevel,
    menuTotalIngredients,
    menuPricedCount,
    menuMissingCount,
    menuStaleCount,
    dishes.length
  )

  // Build menu-level issues
  const issues = buildMenuIssues(
    dishProvenances,
    menuTotalIngredients,
    menuPricedCount,
    menuMissingCount,
    menuStaleCount
  )

  return {
    confidenceLevel: menuLevel,
    confidenceScore: menuScore,
    confidenceLabel,
    dishCount: dishes.length,
    componentCount,
    dishes: dishProvenances,
    totalIngredients: menuTotalIngredients,
    pricedCount: menuPricedCount,
    missingCount: menuMissingCount,
    staleCount: menuStaleCount,
    issues,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreToLevel(score: number, totalIngredients: number): CostConfidenceLevel {
  if (totalIngredients === 0) return 'insufficient'
  if (score >= 75) return 'high'
  if (score >= 45) return 'moderate'
  return 'low'
}

function buildMenuLabel(
  level: CostConfidenceLevel,
  total: number,
  priced: number,
  missing: number,
  stale: number,
  dishCount: number
): string {
  if (level === 'insufficient') {
    if (total === 0)
      return `No recipes linked across ${dishCount} dishes. Cost cannot be calculated.`
    return `${missing} of ${total} ingredients have no price data across the menu.`
  }

  const parts: string[] = []
  parts.push(`${priced}/${total} ingredients priced across ${dishCount} dishes`)

  if (stale > 0) {
    parts.push(`${stale} stale`)
  }

  if (missing > 0 && missing < total) {
    parts.push(`${missing} missing`)
  }

  return parts.join(', ') + '.'
}

function buildMenuIssues(
  dishProvenances: DishProvenance[],
  totalIngredients: number,
  pricedCount: number,
  missingCount: number,
  staleCount: number
): ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = []

  // Dishes with no recipes linked
  const noRecipeDishes = dishProvenances.filter((d) => d.recipeCount === 0)
  if (noRecipeDishes.length > 0) {
    const names = noRecipeDishes.map((d) => d.dishName)
    issues.push({
      severity: noRecipeDishes.length === dishProvenances.length ? 'critical' : 'warning',
      code: 'dishes_no_recipes',
      message: `${noRecipeDishes.length} of ${dishProvenances.length} dishes have no linked recipes: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` (+${names.length - 3} more)` : ''}.`,
    })
  }

  // Low confidence dishes
  const lowDishes = dishProvenances.filter(
    (d) =>
      d.recipeCount > 0 && (d.confidenceLevel === 'low' || d.confidenceLevel === 'insufficient')
  )
  if (lowDishes.length > 0) {
    const names = lowDishes.map((d) => d.dishName)
    issues.push({
      severity: lowDishes.length > dishProvenances.length * 0.5 ? 'critical' : 'warning',
      code: 'dishes_low_confidence',
      message: `${lowDishes.length} of ${dishProvenances.length} dishes have low cost confidence: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` (+${names.length - 3} more)` : ''}.`,
    })
  }

  // Majority unpriced across menu
  if (totalIngredients > 0 && missingCount > totalIngredients * 0.5) {
    issues.push({
      severity: 'critical',
      code: 'menu_majority_unpriced',
      message: `${missingCount} of ${totalIngredients} ingredients across the menu have no price. Total cost is unreliable.`,
    })
  } else if (missingCount > 0) {
    issues.push({
      severity: 'warning',
      code: 'menu_missing_prices',
      message: `${missingCount} ingredient${missingCount > 1 ? 's' : ''} across the menu missing price data.`,
    })
  }

  // Stale prices across menu
  if (staleCount > 0) {
    issues.push({
      severity: staleCount > 3 ? 'warning' : 'info',
      code: 'menu_stale_prices',
      message: `${staleCount} ingredient${staleCount > 1 ? 's' : ''} across the menu priced over 90 days ago.`,
    })
  }

  return issues
}

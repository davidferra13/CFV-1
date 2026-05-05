/**
 * PIE Intelligence Layer 3: Menu Economics
 *
 * Per-dish margin analysis and menu optimization suggestions.
 * Helps chefs understand the true profitability of every dish and
 * make data-driven menu decisions.
 *
 * Capabilities:
 *   1. Dish Cost Analysis - True food cost per serving
 *   2. Margin Mapping - Profit margin per dish at current pricing
 *   3. Menu Optimization - Suggestions to improve overall menu profitability
 *   4. What-If Scenarios - "What if ingredient X goes up 20%?"
 *   5. Seasonal Menu Intelligence - Best dishes for each season by margin
 *
 * NOT a 'use server' file. Called by server actions.
 */

import { pgClient } from '@/lib/db'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DishEconomics {
  recipeId: string
  recipeName: string
  /** Total food cost per serving in cents */
  costPerServingCents: number
  /** Suggested price per serving in cents (target margin applied) */
  suggestedPriceCents: number
  /** Current margin percentage if chef has a price set */
  currentMarginPct: number | null
  /** Target margin percentage (industry standard for this dish type) */
  targetMarginPct: number
  /** Food cost percentage (cost/price * 100) */
  foodCostPct: number | null
  /** Most expensive ingredient and its share of total cost */
  costDriver: { name: string; cents: number; sharePct: number } | null
  /** Ingredients with rising prices (trend data) */
  risingCosts: Array<{ name: string; trendPct: number }>
  /** Ingredients with falling prices (opportunity) */
  fallingCosts: Array<{ name: string; trendPct: number }>
  /** Seasonal index: is this dish cheaper or more expensive right now? */
  seasonalIndex: number | null
  /** Number of ingredients with real vs synthetic prices */
  priceQuality: { real: number; synthetic: number; total: number }
  analyzedAt: string
}

export interface MenuOptimization {
  type: 'swap_ingredient' | 'adjust_portion' | 'seasonal_rotation' | 'remove_dish' | 'reprice'
  priority: 'high' | 'medium' | 'low'
  recipeId: string
  recipeName: string
  message: string
  impactCents: number
  details: Record<string, unknown>
}

export interface WhatIfResult {
  recipeId: string
  recipeName: string
  currentCostCents: number
  projectedCostCents: number
  changeCents: number
  changePct: number
  newMarginPct: number | null
}

export interface MenuSummary {
  totalDishes: number
  avgFoodCostPct: number
  avgMarginPct: number
  highestMarginDish: { name: string; marginPct: number } | null
  lowestMarginDish: { name: string; marginPct: number } | null
  totalMonthlyFoodCostCents: number
  optimizationCount: number
  potentialSavingsCents: number
}

// ---------------------------------------------------------------------------
// Industry Standards
// ---------------------------------------------------------------------------

const TARGET_MARGINS: Record<string, number> = {
  appetizer: 72,
  salad: 75,
  soup: 78,
  entree: 65,
  pasta: 72,
  seafood: 60,
  dessert: 75,
  bread: 80,
  side: 72,
  beverage: 80,
  default: 68,
}

function getTargetMargin(category: string | null): number {
  if (!category) return TARGET_MARGINS.default
  const lower = category.toLowerCase()
  for (const [key, value] of Object.entries(TARGET_MARGINS)) {
    if (lower.includes(key)) return value
  }
  return TARGET_MARGINS.default
}

// ---------------------------------------------------------------------------
// Seasonal Index
// ---------------------------------------------------------------------------

/**
 * Compute aggregate seasonal index for a set of ingredients.
 * Queries openclaw.seasonal_patterns for any canonical_ingredient_ids.
 * Returns: <100 means in-season (cheaper now), >100 means out-of-season (more expensive now).
 * null if no seasonal data available.
 */
async function computeSeasonalIndex(
  ingredients: Array<{ canonical_ingredient_id: string | null }>
): Promise<number | null> {
  const canonicalIds = ingredients
    .map((i) => i.canonical_ingredient_id)
    .filter((id): id is string => id !== null)

  if (canonicalIds.length === 0) return null

  const pgSql = pgClient
  const rows = await pgSql`
    SELECT current_seasonal_index
    FROM openclaw.seasonal_patterns
    WHERE ingredient_id = ANY(${canonicalIds})
  `

  if (rows.length === 0) return null

  const avg = rows.reduce((sum, r) => sum + Number(r.current_seasonal_index), 0) / rows.length
  return Math.round(avg)
}

// ---------------------------------------------------------------------------
// Dish Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze economics of a single recipe.
 * Uses resolved prices for each ingredient to compute true cost.
 */
export async function analyzeDish(
  recipeId: string,
  tenantId: string
): Promise<DishEconomics | null> {
  // Get recipe with its ingredients
  const [recipe] = (await db.execute(sql`
    SELECT id, name, servings, category, price_per_serving_cents
    FROM recipes
    WHERE id = ${recipeId} AND tenant_id = ${tenantId}
  `)) as unknown as Array<{
    id: string
    name: string
    servings: number
    category: string | null
    price_per_serving_cents: number | null
  }>

  if (!recipe) return null

  const ingredients = (await db.execute(sql`
    SELECT
      ri.ingredient_id,
      ri.canonical_ingredient_id,
      ri.name,
      ri.quantity,
      ri.unit,
      ri.cost_cents
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = ${recipeId}
  `)) as unknown as Array<{
    ingredient_id: string
    canonical_ingredient_id: string | null
    name: string
    quantity: number
    unit: string
    cost_cents: number | null
  }>

  if (ingredients.length === 0) return null

  // Sum costs
  let totalCostCents = 0
  let realPrices = 0
  let syntheticPrices = 0
  let costDriverName = ''
  let costDriverCents = 0
  const risingCosts: DishEconomics['risingCosts'] = []
  const fallingCosts: DishEconomics['fallingCosts'] = []

  for (const ing of ingredients) {
    const cost = Number(ing.cost_cents || 0)
    totalCostCents += cost

    if (cost > costDriverCents) {
      costDriverCents = cost
      costDriverName = ing.name
    }

    // Check if price is from a real or synthetic source
    if (ing.canonical_ingredient_id) {
      const pgSql = pgClient
      const [trend] = await pgSql`
        SELECT direction, change_pct
        FROM openclaw.ingredient_trends
        WHERE ingredient_id = ${ing.canonical_ingredient_id}
        LIMIT 1
      `
      if (trend) {
        if (trend.direction === 'rising' && Number(trend.change_pct) > 5) {
          risingCosts.push({ name: ing.name, trendPct: Number(trend.change_pct) })
        } else if (trend.direction === 'falling' && Number(trend.change_pct) < -5) {
          fallingCosts.push({ name: ing.name, trendPct: Number(trend.change_pct) })
        }
      }

      // Check source quality
      const [resolved] = await pgSql`
        SELECT is_synthetic
        FROM openclaw.resolved_prices
        WHERE canonical_ingredient_id = ${ing.canonical_ingredient_id}
        LIMIT 1
      `
      if (resolved?.is_synthetic) syntheticPrices++
      else realPrices++
    } else {
      syntheticPrices++
    }
  }

  const servings = Math.max(1, recipe.servings || 1)
  const costPerServing = Math.round(totalCostCents / servings)
  const targetMargin = getTargetMargin(recipe.category)
  const suggestedPrice = Math.round(costPerServing / (1 - targetMargin / 100))

  let currentMargin: number | null = null
  let foodCostPct: number | null = null
  if (recipe.price_per_serving_cents && recipe.price_per_serving_cents > 0) {
    foodCostPct = Math.round((costPerServing / recipe.price_per_serving_cents) * 100)
    currentMargin = 100 - foodCostPct
  }

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    costPerServingCents: costPerServing,
    suggestedPriceCents: suggestedPrice,
    currentMarginPct: currentMargin,
    targetMarginPct: targetMargin,
    foodCostPct,
    costDriver:
      totalCostCents > 0
        ? {
            name: costDriverName,
            cents: costDriverCents,
            sharePct: Math.round((costDriverCents / totalCostCents) * 100),
          }
        : null,
    risingCosts,
    fallingCosts,
    seasonalIndex: await computeSeasonalIndex(ingredients),
    priceQuality: { real: realPrices, synthetic: syntheticPrices, total: ingredients.length },
    analyzedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Menu-Level Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze all recipes for a tenant and return menu-level economics.
 */
export async function analyzeMenu(tenantId: string): Promise<{
  dishes: DishEconomics[]
  summary: MenuSummary
  optimizations: MenuOptimization[]
}> {
  // Get all recipes
  const recipes = (await db.execute(sql`
    SELECT id FROM recipes WHERE tenant_id = ${tenantId} AND is_archived = false
  `)) as unknown as Array<{ id: string }>

  const dishes: DishEconomics[] = []
  for (const r of recipes) {
    const dish = await analyzeDish(r.id, tenantId)
    if (dish) dishes.push(dish)
  }

  // Compute summary
  const withMargin = dishes.filter((d) => d.currentMarginPct !== null)
  const avgFoodCostPct =
    dishes.length > 0
      ? Math.round(dishes.reduce((s, d) => s + (d.foodCostPct || 50), 0) / dishes.length)
      : 0
  const avgMarginPct =
    withMargin.length > 0
      ? Math.round(
          withMargin.reduce((s, d) => s + (d.currentMarginPct || 0), 0) / withMargin.length
        )
      : 0

  const sorted = [...withMargin].sort(
    (a, b) => (b.currentMarginPct || 0) - (a.currentMarginPct || 0)
  )

  // Generate optimizations
  const optimizations = generateOptimizations(dishes)

  const summary: MenuSummary = {
    totalDishes: dishes.length,
    avgFoodCostPct,
    avgMarginPct,
    highestMarginDish: sorted[0]
      ? { name: sorted[0].recipeName, marginPct: sorted[0].currentMarginPct! }
      : null,
    lowestMarginDish: sorted[sorted.length - 1]
      ? {
          name: sorted[sorted.length - 1].recipeName,
          marginPct: sorted[sorted.length - 1].currentMarginPct!,
        }
      : null,
    totalMonthlyFoodCostCents: dishes.reduce((s, d) => s + d.costPerServingCents * 10, 0), // rough estimate
    optimizationCount: optimizations.length,
    potentialSavingsCents: optimizations.reduce((s, o) => s + Math.abs(o.impactCents), 0),
  }

  return { dishes, summary, optimizations }
}

// ---------------------------------------------------------------------------
// Optimization Engine
// ---------------------------------------------------------------------------

function generateOptimizations(dishes: DishEconomics[]): MenuOptimization[] {
  const optimizations: MenuOptimization[] = []

  for (const dish of dishes) {
    // 1. Reprice: food cost > 40% (industry threshold)
    if (dish.foodCostPct !== null && dish.foodCostPct > 40) {
      const idealPrice = Math.round(dish.costPerServingCents / 0.32) // target 32% food cost
      const currentPrice = Math.round(dish.costPerServingCents / (dish.foodCostPct / 100))
      optimizations.push({
        type: 'reprice',
        priority: dish.foodCostPct > 50 ? 'high' : 'medium',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `Food cost at ${dish.foodCostPct}% (target: 32%). Consider raising price by $${((idealPrice - currentPrice) / 100).toFixed(2)}/serving.`,
        impactCents: idealPrice - currentPrice,
        details: { currentFoodCostPct: dish.foodCostPct, idealPrice },
      })
    }

    // 2. Rising cost alert
    if (dish.risingCosts.length > 0) {
      const worstRiser = dish.risingCosts.sort((a, b) => b.trendPct - a.trendPct)[0]
      if (worstRiser.trendPct > 15) {
        optimizations.push({
          type: 'swap_ingredient',
          priority: worstRiser.trendPct > 30 ? 'high' : 'medium',
          recipeId: dish.recipeId,
          recipeName: dish.recipeName,
          message: `${worstRiser.name} up ${worstRiser.trendPct}% in 30 days. Consider seasonal substitute.`,
          impactCents: Math.round(dish.costPerServingCents * (worstRiser.trendPct / 100)),
          details: { ingredient: worstRiser.name, trendPct: worstRiser.trendPct },
        })
      }
    }

    // 3. Seasonal rotation opportunity
    if (dish.seasonalIndex !== null && dish.seasonalIndex > 120) {
      optimizations.push({
        type: 'seasonal_rotation',
        priority: 'low',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `Currently ${dish.seasonalIndex - 100}% above seasonal average. Consider rotating to in-season alternatives.`,
        impactCents: Math.round(dish.costPerServingCents * ((dish.seasonalIndex - 100) / 100)),
        details: { seasonalIndex: dish.seasonalIndex },
      })
    }

    // 4. Cost driver concentration risk
    if (dish.costDriver && dish.costDriver.sharePct > 60) {
      optimizations.push({
        type: 'adjust_portion',
        priority: 'low',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `${dish.costDriver.name} is ${dish.costDriver.sharePct}% of dish cost. Consider reducing portion or finding value alternative.`,
        impactCents: Math.round(dish.costDriver.cents * 0.15), // 15% reduction potential
        details: { driver: dish.costDriver.name, sharePct: dish.costDriver.sharePct },
      })
    }
  }

  // Sort by impact
  optimizations.sort((a, b) => Math.abs(b.impactCents) - Math.abs(a.impactCents))
  return optimizations
}

// ---------------------------------------------------------------------------
// What-If Scenarios
// ---------------------------------------------------------------------------

/**
 * Model the impact of an ingredient price change on all affected recipes.
 */
export async function whatIfPriceChange(
  ingredientId: string,
  changePct: number,
  tenantId: string
): Promise<WhatIfResult[]> {
  // Find all recipes using this ingredient
  const affected = (await db.execute(sql`
    SELECT
      r.id AS recipe_id,
      r.name AS recipe_name,
      r.servings,
      r.price_per_serving_cents,
      ri.cost_cents AS ingredient_cost_cents,
      (SELECT SUM(ri2.cost_cents) FROM recipe_ingredients ri2 WHERE ri2.recipe_id = r.id) AS total_recipe_cost_cents
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    WHERE r.tenant_id = ${tenantId}
      AND ri.canonical_ingredient_id = ${ingredientId}
      AND r.is_archived = false
  `)) as unknown as Array<{
    recipe_id: string
    recipe_name: string
    servings: number
    price_per_serving_cents: number | null
    ingredient_cost_cents: number
    total_recipe_cost_cents: number
  }>

  return affected.map((r) => {
    const ingredientCost = Number(r.ingredient_cost_cents || 0)
    const totalCost = Number(r.total_recipe_cost_cents || 0)
    const servings = Math.max(1, r.servings || 1)

    const costChange = Math.round(ingredientCost * (changePct / 100))
    const newTotalCost = totalCost + costChange
    const currentCostPerServing = Math.round(totalCost / servings)
    const newCostPerServing = Math.round(newTotalCost / servings)

    let newMargin: number | null = null
    if (r.price_per_serving_cents && r.price_per_serving_cents > 0) {
      newMargin = Math.round((1 - newCostPerServing / r.price_per_serving_cents) * 100)
    }

    return {
      recipeId: r.recipe_id,
      recipeName: r.recipe_name,
      currentCostCents: currentCostPerServing,
      projectedCostCents: newCostPerServing,
      changeCents: newCostPerServing - currentCostPerServing,
      changePct:
        currentCostPerServing > 0
          ? Math.round(((newCostPerServing - currentCostPerServing) / currentCostPerServing) * 100)
          : 0,
      newMarginPct: newMargin,
    }
  })
}

// ---------------------------------------------------------------------------
// Seasonal Menu Intelligence
// ---------------------------------------------------------------------------

/**
 * Rank dishes by current seasonal advantage.
 * Returns dishes sorted by how "in season" their ingredients are right now.
 */
export async function getSeasonalMenuRanking(tenantId: string): Promise<
  Array<{
    recipeId: string
    recipeName: string
    seasonalScore: number
    inSeasonIngredients: string[]
    outOfSeasonIngredients: string[]
    seasonalSavingsPct: number
  }>
> {
  const pgSql = pgClient

  // Get all recipes with canonical ingredients
  const recipes = (await db.execute(sql`
    SELECT
      r.id AS recipe_id,
      r.name AS recipe_name,
      ARRAY_AGG(ri.canonical_ingredient_id) FILTER (
        WHERE ri.canonical_ingredient_id IS NOT NULL
      ) AS ingredient_ids,
      ARRAY_AGG(ri.name) FILTER (
        WHERE ri.canonical_ingredient_id IS NOT NULL
      ) AS ingredient_names
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    WHERE r.tenant_id = ${tenantId} AND r.is_archived = false
    GROUP BY r.id, r.name
  `)) as unknown as Array<{
    recipe_id: string
    recipe_name: string
    ingredient_ids: string[] | null
    ingredient_names: string[] | null
  }>

  const results: Array<{
    recipeId: string
    recipeName: string
    seasonalScore: number
    inSeasonIngredients: string[]
    outOfSeasonIngredients: string[]
    seasonalSavingsPct: number
  }> = []

  for (const recipe of recipes) {
    if (!recipe.ingredient_ids || recipe.ingredient_ids.length === 0) continue

    // Get seasonal patterns for these ingredients
    const patterns = await pgSql`
      SELECT ingredient_id, ingredient_name, current_seasonal_index, in_season
      FROM openclaw.seasonal_patterns
      WHERE ingredient_id = ANY(${recipe.ingredient_ids})
    `

    if (patterns.length === 0) continue

    const inSeason = patterns.filter((p) => p.in_season).map((p) => p.ingredient_name as string)
    const outOfSeason = patterns
      .filter((p) => !p.in_season && Number(p.current_seasonal_index) > 110)
      .map((p) => p.ingredient_name as string)

    const avgIndex =
      patterns.reduce((s, p) => s + Number(p.current_seasonal_index), 0) / patterns.length
    // Score: lower index = more in season = better score
    const seasonalScore = Math.round(200 - avgIndex) // 100 = neutral, >100 = in season

    const seasonalSavings = avgIndex < 100 ? Math.round(100 - avgIndex) : 0

    results.push({
      recipeId: recipe.recipe_id,
      recipeName: recipe.recipe_name,
      seasonalScore,
      inSeasonIngredients: inSeason,
      outOfSeasonIngredients: outOfSeason,
      seasonalSavingsPct: seasonalSavings,
    })
  }

  results.sort((a, b) => b.seasonalScore - a.seasonalScore)
  return results
}

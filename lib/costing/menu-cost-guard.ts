// Menu Cost Guard
// Server action that walks menu -> dishes -> components -> recipes -> ingredients
// to compute per-recipe provenance, then aggregates into menu-level provenance.
// Same pattern as quote-cost-guard: server fetches, client displays.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computeRecipeCostProvenance } from './recipe-cost-provenance'
import {
  computeMenuCostProvenance,
  type MenuCostProvenance,
  type DishProvenanceInput,
} from './menu-cost-provenance'

/**
 * Evaluate cost provenance for an entire menu.
 * Single query to get all ingredient data, then pure computation.
 */
export async function evaluateMenuCostProvenance(
  menuId: string
): Promise<MenuCostProvenance | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get dishes for this menu
  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_name, course_number, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const dishIds = dishes.map((d: any) => d.id)

  // 2. Get components with recipe ingredient data in one query
  const { data: components } = await db
    .from('components')
    .select(
      `
      id,
      name,
      dish_id,
      recipe_id,
      recipe:recipes(
        id,
        name,
        recipe_ingredients(
          quantity,
          unit,
          computed_cost_cents,
          cost_status,
          ingredient:ingredients(
            name,
            cost_per_unit_cents,
            last_price_cents,
            last_price_date,
            last_price_source,
            last_price_confidence,
            price_trend_direction,
            price_trend_pct,
            default_yield_pct
          )
        )
      )
    `
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .not('recipe_id', 'is', null)

  // 3. Group components by dish, compute per-recipe provenance
  const dishInputs: DishProvenanceInput[] = []
  let totalComponentCount = 0

  // Count all components (including those without recipes)
  const { count: allComponentCount } = await db
    .from('components')
    .select('id', { count: 'exact', head: true })
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)

  totalComponentCount = allComponentCount ?? 0

  for (const dish of dishes) {
    const dishComponents = (components ?? []).filter((c: any) => c.dish_id === dish.id)
    const recipes: DishProvenanceInput['recipes'] = []

    // Track recipe IDs we already processed for this dish (avoid duplicates)
    const seenRecipeIds = new Set<string>()

    for (const comp of dishComponents) {
      const recipe = (comp as any).recipe
      if (!recipe?.id || seenRecipeIds.has(recipe.id)) continue
      seenRecipeIds.add(recipe.id)

      const recipeIngredients = recipe.recipe_ingredients ?? []

      // Build input matching RecipeProvenanceInput shape
      const ingredients = recipeIngredients
        .filter((ri: any) => ri.ingredient)
        .map((ri: any) => ({
          ingredient: {
            name: ri.ingredient.name,
            last_price_source: ri.ingredient.last_price_source,
            last_price_confidence: ri.ingredient.last_price_confidence,
            price_trend_direction: ri.ingredient.price_trend_direction,
            price_trend_pct: ri.ingredient.price_trend_pct,
          },
          quantity: ri.quantity ?? 0,
          unit: ri.unit ?? '',
          computedCostCents: ri.computed_cost_cents ?? null,
          costStatus: deriveCostStatus(ri),
        }))

      const pricedCount = ingredients.filter((i: any) => i.costStatus !== 'no_price').length
      const missingPrices = ingredients.length - pricedCount
      const stalePrices = ingredients.filter((i: any) => i.costStatus === 'stale').length

      // Estimate unit mismatches (if computed cost is null but price exists)
      const unitMismatches = ingredients.filter(
        (i: any) => i.computedCostCents == null && i.costStatus !== 'no_price'
      ).length

      const totalCostCents = ingredients.reduce(
        (sum: number, i: any) => sum + (i.computedCostCents ?? 0),
        0
      )

      // Compute average confidence from priced ingredients
      const confidenceValues = ingredients
        .filter(
          (i: any) => i.ingredient.last_price_confidence != null && i.costStatus !== 'no_price'
        )
        .map((i: any) => i.ingredient.last_price_confidence as number)

      const avgPriceConfidence =
        confidenceValues.length > 0
          ? confidenceValues.reduce((s: number, v: number) => s + v, 0) / confidenceValues.length
          : null

      const lowConfidenceCount = confidenceValues.filter((c: number) => c < 0.5).length

      const provenance = computeRecipeCostProvenance({
        ingredients,
        costSummary: {
          ingredientCount: ingredients.length,
          totalCostCents: totalCostCents > 0 ? totalCostCents : null,
          hasAllPrices: missingPrices === 0,
          avgPriceConfidence,
          lowConfidenceCount,
          lastPriceUpdatedAt: null,
        },
        costIssues: {
          missingPrices,
          unitMismatches,
          stalePrices,
        },
        rawIngredients: recipeIngredients
          .filter((ri: any) => ri.ingredient)
          .map((ri: any) => ({
            name: ri.ingredient.name,
            lastPriceDate: ri.ingredient.last_price_date,
            yieldPct: null,
            defaultYieldPct: ri.ingredient.default_yield_pct ?? 1.0,
          })),
      })

      recipes.push({
        recipeName: recipe.name,
        provenance,
      })
    }

    dishInputs.push({
      dishId: dish.id,
      dishName: dish.course_name,
      recipes,
    })
  }

  return computeMenuCostProvenance({
    dishes: dishInputs,
    componentCount: totalComponentCount,
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveCostStatus(ri: any): 'accurate' | 'estimated' | 'stale' | 'no_price' {
  const ing = ri.ingredient
  if (!ing) return 'no_price'

  // Check if there's any price data
  const costPerUnit = ing.cost_per_unit_cents ?? ing.last_price_cents ?? null
  if (costPerUnit == null || costPerUnit <= 0) return 'no_price'

  // Use explicit cost_status if present on the recipe_ingredient row
  if (ri.cost_status && ['accurate', 'estimated', 'stale', 'no_price'].includes(ri.cost_status)) {
    return ri.cost_status
  }

  // Check freshness
  if (ing.last_price_date) {
    const days = Math.floor((Date.now() - new Date(ing.last_price_date).getTime()) / 86_400_000)
    if (days > 90) return 'stale'
  }

  return 'accurate'
}

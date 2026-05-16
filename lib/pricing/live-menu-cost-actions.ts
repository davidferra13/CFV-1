'use server'

/**
 * Live Menu Cost Resolution via PIE
 *
 * When menu_cost_summary view has no data (recipes not yet costed),
 * this action resolves ingredient prices live via the full PIE chain
 * (including Pi bridge at port 7700) and returns per-dish and total costs.
 *
 * Graceful fallback: if Pi bridge is unavailable or resolution fails,
 * returns a clear "unavailable" signal. Never returns $0 or fake numbers.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'
import type { ResolvedPrice } from '@/lib/pricing/resolve-price'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveMenuCostDish {
  dishId: string
  dishName: string
  courseName: string | null
  recipeName: string | null
  ingredientCount: number
  resolvedCount: number
  costCents: number
  /** Average confidence across resolved ingredients (0-1) */
  avgConfidence: number
}

export interface LiveMenuCostResult {
  available: true
  totalFoodCostCents: number
  costPerGuestCents: number
  guestCount: number
  dishes: LiveMenuCostDish[]
  /** Fraction of ingredients that resolved from real data (not synthetic) */
  coveragePercent: number
  /** Average confidence across all resolved prices */
  avgConfidence: number
  /** How many ingredients had no price at all (should be 0 due to PIE Law 9) */
  unresolvedCount: number
}

export interface LiveMenuCostUnavailable {
  available: false
  reason: string
}

export type LiveMenuCostResponse = LiveMenuCostResult | LiveMenuCostUnavailable

// ---------------------------------------------------------------------------
// Main Action
// ---------------------------------------------------------------------------

export async function resolveEventMenuCostLive(eventId: string): Promise<LiveMenuCostResponse> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // 1. Get event with menu
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id, menu_id, guest_count')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventErr || !event || !event.menu_id) {
      return { available: false, reason: 'No menu linked to this event' }
    }

    const guestCount = Math.max(event.guest_count || 1, 1)

    // 2. Get dishes from menu
    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, course_name, linked_recipe_id')
      .eq('menu_id', event.menu_id)
      .eq('tenant_id', tenantId)

    if (!dishes || dishes.length === 0) {
      return { available: false, reason: 'Menu has no dishes' }
    }

    // 3. Get recipe ingredients for all linked recipes
    const recipeIds = dishes.map((d: any) => d.linked_recipe_id).filter(Boolean) as string[]

    if (recipeIds.length === 0) {
      return { available: false, reason: 'No recipes linked to menu dishes' }
    }

    // Get recipe names
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name, servings')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    const recipeMap = new Map<string, { name: string; servings: number }>()
    for (const r of (recipes ?? []) as any[]) {
      recipeMap.set(r.id, { name: r.name, servings: r.servings || 4 })
    }

    // Get all recipe_ingredients
    const { data: recipeIngredients } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, quantity, unit')
      .in('recipe_id', recipeIds)

    if (!recipeIngredients || recipeIngredients.length === 0) {
      return { available: false, reason: 'Recipes have no ingredients' }
    }

    // 4. Collect unique ingredient IDs
    const allIngredientIds = [
      ...new Set((recipeIngredients as any[]).map((ri: any) => ri.ingredient_id).filter(Boolean)),
    ] as string[]

    if (allIngredientIds.length === 0) {
      return { available: false, reason: 'No ingredients found in recipes' }
    }

    // 5. Batch resolve all ingredient prices via PIE
    let priceMap: Map<string, ResolvedPrice>
    try {
      priceMap = await resolvePricesBatch(allIngredientIds, tenantId)
    } catch (err) {
      console.error('[resolveEventMenuCostLive] PIE batch resolution failed:', err)
      return { available: false, reason: 'Price resolution unavailable' }
    }

    // 6. Group recipe_ingredients by recipe
    const riByRecipe = new Map<string, any[]>()
    for (const ri of recipeIngredients as any[]) {
      if (!riByRecipe.has(ri.recipe_id)) riByRecipe.set(ri.recipe_id, [])
      riByRecipe.get(ri.recipe_id)!.push(ri)
    }

    // 7. Calculate per-dish costs
    const resultDishes: LiveMenuCostDish[] = []
    let totalCostCents = 0
    let totalResolved = 0
    let totalIngredients = 0
    let totalConfidenceSum = 0
    let syntheticCount = 0

    for (const dish of dishes as any[]) {
      const recipeId = dish.linked_recipe_id
      if (!recipeId) {
        resultDishes.push({
          dishId: dish.id,
          dishName: dish.name || 'Unnamed dish',
          courseName: dish.course_name || null,
          recipeName: null,
          ingredientCount: 0,
          resolvedCount: 0,
          costCents: 0,
          avgConfidence: 0,
        })
        continue
      }

      const recipe = recipeMap.get(recipeId)
      const ingredients = riByRecipe.get(recipeId) || []
      let dishCostCents = 0
      let dishResolved = 0
      let dishConfidenceSum = 0

      for (const ri of ingredients) {
        const price = priceMap.get(ri.ingredient_id)
        if (price && price.cents > 0) {
          // Scale by quantity (default 1 if not specified)
          const qty = ri.quantity || 1
          dishCostCents += Math.round(price.cents * qty)
          dishResolved++
          dishConfidenceSum += price.confidence
          if (price.source === 'synthetic') syntheticCount++
        }
      }

      // Scale recipe cost for guest count vs recipe servings
      const servings = recipe?.servings || 4
      const portionMultiplier = guestCount / servings
      const scaledDishCost = Math.round(dishCostCents * portionMultiplier)

      totalCostCents += scaledDishCost
      totalResolved += dishResolved
      totalIngredients += ingredients.length
      totalConfidenceSum += dishConfidenceSum

      resultDishes.push({
        dishId: dish.id,
        dishName: dish.name || 'Unnamed dish',
        courseName: dish.course_name || null,
        recipeName: recipe?.name || null,
        ingredientCount: ingredients.length,
        resolvedCount: dishResolved,
        costCents: scaledDishCost,
        avgConfidence:
          dishResolved > 0 ? Math.round((dishConfidenceSum / dishResolved) * 100) / 100 : 0,
      })
    }

    if (totalResolved === 0) {
      return { available: false, reason: 'Could not resolve any ingredient prices' }
    }

    const realDataCount = totalResolved - syntheticCount
    const coveragePercent =
      totalIngredients > 0 ? Math.round((realDataCount / totalIngredients) * 100) : 0
    const avgConfidence =
      totalResolved > 0 ? Math.round((totalConfidenceSum / totalResolved) * 100) / 100 : 0

    return {
      available: true,
      totalFoodCostCents: totalCostCents,
      costPerGuestCents: Math.round(totalCostCents / guestCount),
      guestCount,
      dishes: resultDishes,
      coveragePercent,
      avgConfidence,
      unresolvedCount: totalIngredients - totalResolved,
    }
  } catch (err) {
    console.error('[resolveEventMenuCostLive] Unexpected error:', err)
    return { available: false, reason: 'Cost estimation unavailable' }
  }
}

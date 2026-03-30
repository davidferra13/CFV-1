'use server'

/**
 * Menu Cost Estimator Server Actions
 * Paste dish names, get instant cost estimates with gap detection.
 * Uses fuzzy matching to find recipes, then costs them via the existing pipeline.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// --- Types ---

export interface DishEstimate {
  dishName: string
  status: 'costed' | 'partial' | 'no_recipe' | 'no_prices'
  matchedRecipe: {
    id: string
    name: string
    category: string | null
  } | null
  costCents: number | null
  costPerGuestCents: number | null
  ingredientCount: number
  pricedIngredientCount: number
  missingIngredients: string[]
  confidence: number
  scaleFactor: number
}

export interface MenuEstimate {
  dishes: DishEstimate[]
  totalCostCents: number
  costPerGuestCents: number | null
  guestCount: number
  costedCount: number
  partialCount: number
  missingCount: number
  completeness: number
  foodCostPercentage: number | null
}

interface RecipeMatch {
  id: string
  name: string
  category: string | null
  similarity: number
  yield_quantity: number | null
}

// --- Name normalization for matching ---

function normalizeDishName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^(homemade|fresh|classic|traditional|signature|house)\s+/gi, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Token overlap matching ---

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1)
  )
  const tokensB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1)
  )
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let shared = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) shared++
  }

  const total = new Set([...tokensA, ...tokensB]).size
  return total > 0 ? shared / total : 0
}

// --- Core matching ---

async function matchDishToRecipes(
  dishName: string,
  tenantId: string,
  db: any
): Promise<RecipeMatch[]> {
  const normalized = normalizeDishName(dishName)

  // Strategy 1: Exact ILIKE match
  const { data: exactMatches } = await db
    .from('recipes')
    .select('id, name, category, yield_quantity')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .ilike('name', normalized)
    .limit(3)

  if (exactMatches?.length) {
    return exactMatches.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      similarity: 1.0,
      yield_quantity: r.yield_quantity,
    }))
  }

  // Strategy 2: ILIKE with wildcards
  const { data: fuzzyMatches } = await db
    .from('recipes')
    .select('id, name, category, yield_quantity')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .ilike('name', `%${normalized}%`)
    .limit(10)

  if (fuzzyMatches?.length) {
    // Score by token overlap and return best matches
    const scored = fuzzyMatches
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        yield_quantity: r.yield_quantity,
        similarity: tokenOverlap(normalized, r.name),
      }))
      .filter((r: RecipeMatch) => r.similarity > 0.2)
      .sort((a: RecipeMatch, b: RecipeMatch) => b.similarity - a.similarity)

    if (scored.length > 0) return scored.slice(0, 3)
  }

  // Strategy 3: Token-based search (split dish name, search each token)
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 2)
  if (tokens.length > 0) {
    // Search for recipes containing the longest token
    const longestToken = tokens.sort((a, b) => b.length - a.length)[0]
    const { data: tokenMatches } = await db
      .from('recipes')
      .select('id, name, category, yield_quantity')
      .eq('tenant_id', tenantId)
      .eq('archived', false)
      .ilike('name', `%${longestToken}%`)
      .limit(10)

    if (tokenMatches?.length) {
      const scored = tokenMatches
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          yield_quantity: r.yield_quantity,
          similarity: tokenOverlap(normalized, r.name),
        }))
        .filter((r: RecipeMatch) => r.similarity > 0.2)
        .sort((a: RecipeMatch, b: RecipeMatch) => b.similarity - a.similarity)

      if (scored.length > 0) return scored.slice(0, 3)
    }
  }

  return []
}

// --- Main estimation action ---

export async function estimateMenuCost(input: {
  dishNames: string[]
  guestCount: number
  eventPriceCents?: number
}): Promise<{ success: true; estimate: MenuEstimate } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { dishNames, guestCount, eventPriceCents } = input

    if (!dishNames?.length) {
      return { success: false, error: 'No dish names provided' }
    }
    if (guestCount < 1) {
      return { success: false, error: 'Guest count must be at least 1' }
    }

    // Deduplicate dish names
    const uniqueDishes = [...new Set(dishNames.map((d) => d.trim()).filter(Boolean))]
    const dishes: DishEstimate[] = []

    // Process in batches of 20
    for (let i = 0; i < uniqueDishes.length; i += 20) {
      const batch = uniqueDishes.slice(i, i + 20)

      for (const dishName of batch) {
        const matches = await matchDishToRecipes(dishName, user.tenantId!, db)

        if (matches.length === 0) {
          dishes.push({
            dishName,
            status: 'no_recipe',
            matchedRecipe: null,
            costCents: null,
            costPerGuestCents: null,
            ingredientCount: 0,
            pricedIngredientCount: 0,
            missingIngredients: [],
            confidence: 0,
            scaleFactor: 1,
          })
          continue
        }

        // Use best match
        const bestMatch = matches[0]

        // Get cost data from recipe_cost_summary
        const { data: costData } = await db
          .from('recipe_cost_summary')
          .select(
            'total_ingredient_cost_cents, has_all_prices, ingredient_count, cost_per_portion_cents'
          )
          .eq('recipe_id', bestMatch.id)
          .maybeSingle()

        if (!costData || costData.total_ingredient_cost_cents === null) {
          dishes.push({
            dishName,
            status: 'no_prices',
            matchedRecipe: {
              id: bestMatch.id,
              name: bestMatch.name,
              category: bestMatch.category,
            },
            costCents: null,
            costPerGuestCents: null,
            ingredientCount: costData?.ingredient_count ?? 0,
            pricedIngredientCount: 0,
            missingIngredients: [],
            confidence: 0,
            scaleFactor: 1,
          })
          continue
        }

        // Get ingredient-level detail for gap detection
        const { data: ingredientDetails } = await db
          .from('recipe_ingredients')
          .select('ingredients(name), computed_cost_cents')
          .eq('recipe_id', bestMatch.id)

        const missingIngredients: string[] = []
        let pricedCount = 0
        let totalConfidence = 0

        for (const ri of ingredientDetails || []) {
          if (ri.computed_cost_cents !== null && ri.computed_cost_cents > 0) {
            pricedCount++
            totalConfidence += 0.7 // Default confidence for priced ingredients
          } else {
            const name = (ri.ingredients as any)?.name
            if (name) missingIngredients.push(name)
          }
        }

        const totalIngredients = (ingredientDetails || []).length
        const avgConfidence = totalIngredients > 0 ? totalConfidence / totalIngredients : 0

        // Scale cost to guest count
        const yieldQty = bestMatch.yield_quantity || guestCount
        const scaleFactor = guestCount / yieldQty
        const scaledCost = Math.round(costData.total_ingredient_cost_cents * scaleFactor)
        const costPerGuest = Math.round(scaledCost / guestCount)

        const status =
          costData.has_all_prices && missingIngredients.length === 0
            ? 'costed'
            : pricedCount > 0
              ? 'partial'
              : 'no_prices'

        dishes.push({
          dishName,
          status,
          matchedRecipe: {
            id: bestMatch.id,
            name: bestMatch.name,
            category: bestMatch.category,
          },
          costCents: scaledCost,
          costPerGuestCents: costPerGuest,
          ingredientCount: totalIngredients,
          pricedIngredientCount: pricedCount,
          missingIngredients,
          confidence: Math.round(avgConfidence * 100) / 100,
          scaleFactor: Math.round(scaleFactor * 100) / 100,
        })
      }
    }

    // Aggregate totals
    const costedDishes = dishes.filter((d) => d.status === 'costed' || d.status === 'partial')
    const totalCostCents = costedDishes.reduce((sum, d) => sum + (d.costCents || 0), 0)
    const costPerGuestCents = guestCount > 0 ? Math.round(totalCostCents / guestCount) : null

    const costedCount = dishes.filter((d) => d.status === 'costed').length
    const partialCount = dishes.filter((d) => d.status === 'partial').length
    const missingCount = dishes.filter((d) => d.status === 'no_recipe').length

    const totalDishes = dishes.length
    const completeness =
      totalDishes > 0 ? Math.round(((costedCount + partialCount) / totalDishes) * 100) : 0

    const foodCostPercentage =
      eventPriceCents && eventPriceCents > 0
        ? Math.round((totalCostCents / eventPriceCents) * 100)
        : null

    return {
      success: true,
      estimate: {
        dishes,
        totalCostCents,
        costPerGuestCents,
        guestCount,
        costedCount,
        partialCount,
        missingCount,
        completeness,
        foodCostPercentage,
      },
    }
  } catch (err) {
    console.error('[estimateMenuCost] Error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Estimation failed' }
  }
}

// --- Editor dish cost breakdown ---

export async function getEditorDishCostBreakdown(menuId: string): Promise<
  | {
      success: true
      dishes: DishEstimate[]
      totals: Omit<MenuEstimate, 'dishes'>
    }
  | { success: false; error: string }
> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Get all dishes for this menu with their components and linked recipes
    const { data: menuDishes } = await db
      .from('dishes')
      .select(
        `
        id, name, sort_order,
        components(id, name, recipe_id, scale_factor,
          recipes:recipe_id(id, name, category, yield_quantity)
        )
      `
      )
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('sort_order', { ascending: true })

    if (!menuDishes?.length) {
      return {
        success: true,
        dishes: [],
        totals: {
          totalCostCents: 0,
          costPerGuestCents: null,
          guestCount: 1,
          costedCount: 0,
          partialCount: 0,
          missingCount: 0,
          completeness: 0,
          foodCostPercentage: null,
        },
      }
    }

    // Get guest count from menu
    const { data: menu } = await db
      .from('menus')
      .select('guest_count, price_per_person_cents')
      .eq('id', menuId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()

    const guestCount = menu?.guest_count || 1
    const eventPriceCents = menu?.price_per_person_cents
      ? menu.price_per_person_cents * guestCount
      : null

    const dishes: DishEstimate[] = []

    for (const dish of menuDishes) {
      const components = dish.components || []

      // If no components or no linked recipe, it's a "recipe needed" dish
      if (components.length === 0) {
        dishes.push({
          dishName: dish.name,
          status: 'no_recipe',
          matchedRecipe: null,
          costCents: null,
          costPerGuestCents: null,
          ingredientCount: 0,
          pricedIngredientCount: 0,
          missingIngredients: [],
          confidence: 0,
          scaleFactor: 1,
        })
        continue
      }

      // Sum costs across all components for this dish
      let dishCostCents = 0
      let dishIngredientCount = 0
      let dishPricedCount = 0
      let dishMissing: string[] = []
      let hasAnyPrices = false
      let hasAllPrices = true
      const firstRecipe = components[0]?.recipes

      for (const comp of components) {
        if (!comp.recipe_id || !comp.recipes) {
          hasAllPrices = false
          continue
        }

        const { data: costData } = await db
          .from('recipe_cost_summary')
          .select('total_ingredient_cost_cents, has_all_prices, ingredient_count')
          .eq('recipe_id', comp.recipe_id)
          .maybeSingle()

        if (!costData || costData.total_ingredient_cost_cents === null) {
          hasAllPrices = false
          continue
        }

        if (!costData.has_all_prices) hasAllPrices = false
        hasAnyPrices = true

        const yieldQty = comp.recipes.yield_quantity || guestCount
        const scale = (comp.scale_factor || 1) * (guestCount / yieldQty)
        dishCostCents += Math.round(costData.total_ingredient_cost_cents * scale)
        dishIngredientCount += costData.ingredient_count || 0

        // Get ingredient details for missing tracking
        const { data: ingDetails } = await db
          .from('recipe_ingredients')
          .select('ingredients(name), computed_cost_cents')
          .eq('recipe_id', comp.recipe_id)

        for (const ri of ingDetails || []) {
          if (ri.computed_cost_cents !== null && ri.computed_cost_cents > 0) {
            dishPricedCount++
          } else {
            const name = (ri.ingredients as any)?.name
            if (name) dishMissing.push(name)
          }
        }
      }

      const costPerGuest = guestCount > 0 ? Math.round(dishCostCents / guestCount) : null
      const avgConfidence =
        dishIngredientCount > 0 ? (dishPricedCount / dishIngredientCount) * 0.85 : 0

      const status = !hasAnyPrices
        ? 'no_prices'
        : hasAllPrices && dishMissing.length === 0
          ? 'costed'
          : 'partial'

      dishes.push({
        dishName: dish.name,
        status,
        matchedRecipe: firstRecipe
          ? { id: firstRecipe.id, name: firstRecipe.name, category: firstRecipe.category }
          : null,
        costCents: hasAnyPrices ? dishCostCents : null,
        costPerGuestCents: hasAnyPrices ? costPerGuest : null,
        ingredientCount: dishIngredientCount,
        pricedIngredientCount: dishPricedCount,
        missingIngredients: dishMissing,
        confidence: Math.round(avgConfidence * 100) / 100,
        scaleFactor:
          guestCount > 0
            ? Math.round((guestCount / (firstRecipe?.yield_quantity || guestCount)) * 100) / 100
            : 1,
      })
    }

    // Aggregate
    const costedDishes = dishes.filter((d) => d.status === 'costed' || d.status === 'partial')
    const totalCostCents = costedDishes.reduce((sum, d) => sum + (d.costCents || 0), 0)
    const costPerGuestCents = guestCount > 0 ? Math.round(totalCostCents / guestCount) : null
    const costedCount = dishes.filter((d) => d.status === 'costed').length
    const partialCount = dishes.filter((d) => d.status === 'partial').length
    const missingCount = dishes.filter((d) => d.status === 'no_recipe').length
    const completeness =
      dishes.length > 0 ? Math.round(((costedCount + partialCount) / dishes.length) * 100) : 0
    const foodCostPercentage =
      eventPriceCents && eventPriceCents > 0
        ? Math.round((totalCostCents / eventPriceCents) * 100)
        : null

    return {
      success: true,
      dishes,
      totals: {
        totalCostCents,
        costPerGuestCents,
        guestCount,
        costedCount,
        partialCount,
        missingCount,
        completeness,
        foodCostPercentage,
      },
    }
  } catch (err) {
    console.error('[getEditorDishCostBreakdown] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load cost breakdown',
    }
  }
}

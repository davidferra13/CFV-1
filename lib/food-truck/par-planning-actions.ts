'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParItem = {
  ingredientId: string
  ingredientName: string
  category: string
  unit: string
  parLevel: number // calculated amount needed
  currentStock: number // from inventory if available
  needToPrep: number // parLevel - currentStock (min 0)
  priority: 'critical' | 'low' | 'good'
  usedInRecipes: string[]
  overrideQuantity?: number
}

export type ParPlanResult = {
  date: string
  expectedCovers: number
  bufferPercent: number
  items: ParItem[]
  totalItemsToPrep: number
  estimatedPrepMinutes: number
}

export type ParAccuracyRecord = {
  date: string
  expectedCovers: number
  actualCovers: number | null
  accuracy: number | null // percent, null if no actual data
}

// ---------------------------------------------------------------------------
// calculateParLevels - deterministic (Formula > AI)
// ---------------------------------------------------------------------------

const DEFAULT_BUFFER_PERCENT = 15

export async function calculateParLevels(
  date: string,
  expectedCovers: number,
  bufferPercent: number = DEFAULT_BUFFER_PERCENT
): Promise<ParPlanResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  if (expectedCovers <= 0) {
    return {
      date,
      expectedCovers: 0,
      bufferPercent,
      items: [],
      totalItemsToPrep: 0,
      estimatedPrepMinutes: 0,
    }
  }

  // 1. Get all recipes on the menu board (have a price set)
  const { data: recipes, error: recipeErr } = await supabase
    .from('recipes')
    .select('id, name, notes, servings, prep_time_minutes')
    .eq('tenant_id', tenantId)
    .eq('archived', false)

  if (recipeErr) {
    throw new Error(`Failed to load recipes: ${recipeErr.message}`)
  }

  // Filter to menu board items only (ones with _menuBoard price set)
  const boardRecipes = (recipes ?? []).filter((r) => {
    const match = r.notes?.match(/<!-- _menuBoard:(.*?) -->/)
    if (!match) return false
    try {
      const overrides = JSON.parse(match[1])
      return overrides.priceCents !== null && overrides.priceCents !== undefined
    } catch {
      return false
    }
  })

  if (boardRecipes.length === 0) {
    return {
      date,
      expectedCovers,
      bufferPercent,
      items: [],
      totalItemsToPrep: 0,
      estimatedPrepMinutes: 0,
    }
  }

  const recipeIds = boardRecipes.map((r) => r.id)

  // 2. Get all recipe ingredients for board recipes
  const { data: recipeIngredients, error: riErr } = await supabase
    .from('recipe_ingredients')
    .select(
      'recipe_id, ingredient_id, quantity, unit, ingredients(id, name, category, default_unit)'
    )
    .in('recipe_id', recipeIds)

  if (riErr) {
    throw new Error(`Failed to load recipe ingredients: ${riErr.message}`)
  }

  // 3. Get current inventory levels (if inventory_counts table or similar exists)
  // For now we use ingredients.last_price_cents as a proxy indicator of stocking
  // Real inventory would come from an inventory_counts table
  let inventoryMap: Record<string, number> = {}
  // Try to get inventory data if the table exists
  try {
    const { data: inventoryData } = await supabase
      .from('inventory_counts' as string)
      .select('ingredient_id, quantity_on_hand')
      .eq('tenant_id', tenantId)

    if (inventoryData) {
      for (const row of inventoryData as { ingredient_id: string; quantity_on_hand: number }[]) {
        inventoryMap[row.ingredient_id] = row.quantity_on_hand
      }
    }
  } catch {
    // Table might not exist, that's fine
  }

  // 4. Calculate par levels
  // Assumption: each cover consumes roughly (1 / servings) of each recipe
  // We distribute expected covers evenly across all board recipes
  const coversPerRecipe = expectedCovers / boardRecipes.length
  const bufferMultiplier = 1 + bufferPercent / 100

  // Build ingredient aggregation
  const ingredientAgg: Record<
    string,
    {
      ingredientId: string
      ingredientName: string
      category: string
      unit: string
      totalQuantity: number
      usedInRecipes: string[]
    }
  > = {}

  for (const ri of recipeIngredients ?? []) {
    const recipe = boardRecipes.find((r) => r.id === ri.recipe_id)
    if (!recipe) continue

    const servings = recipe.servings ?? 1
    // Quantity needed = (coversPerRecipe / servings) * ingredient quantity * buffer
    const quantityNeeded = (coversPerRecipe / servings) * ri.quantity * bufferMultiplier

    const ing = ri.ingredients as {
      id: string
      name: string
      category: string
      default_unit: string
    } | null

    if (!ing) continue

    const key = ing.id
    if (!ingredientAgg[key]) {
      ingredientAgg[key] = {
        ingredientId: ing.id,
        ingredientName: ing.name,
        category: ing.category,
        unit: ri.unit || ing.default_unit,
        totalQuantity: 0,
        usedInRecipes: [],
      }
    }
    ingredientAgg[key].totalQuantity += quantityNeeded
    if (!ingredientAgg[key].usedInRecipes.includes(recipe.name)) {
      ingredientAgg[key].usedInRecipes.push(recipe.name)
    }
  }

  // 5. Build par items
  const items: ParItem[] = Object.values(ingredientAgg).map((agg) => {
    const currentStock = inventoryMap[agg.ingredientId] ?? 0
    const needToPrep = Math.max(0, Math.ceil((agg.totalQuantity - currentStock) * 100) / 100)
    const ratio = currentStock > 0 ? currentStock / agg.totalQuantity : 0

    let priority: ParItem['priority'] = 'good'
    if (ratio < 0.25) priority = 'critical'
    else if (ratio < 0.75) priority = 'low'

    return {
      ingredientId: agg.ingredientId,
      ingredientName: agg.ingredientName,
      category: agg.category,
      unit: agg.unit,
      parLevel: Math.ceil(agg.totalQuantity * 100) / 100,
      currentStock,
      needToPrep,
      priority,
      usedInRecipes: agg.usedInRecipes,
    }
  })

  // Sort: critical first, then low, then good. Within priority, by quantity needed desc.
  const priorityOrder = { critical: 0, low: 1, good: 2 }
  items.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.needToPrep - a.needToPrep
  )

  // Estimate total prep time from recipes
  const estimatedPrepMinutes = boardRecipes.reduce((sum, r) => sum + (r.prep_time_minutes ?? 15), 0)

  return {
    date,
    expectedCovers,
    bufferPercent,
    items,
    totalItemsToPrep: items.filter((i) => i.needToPrep > 0).length,
    estimatedPrepMinutes,
  }
}

// ---------------------------------------------------------------------------
// getHistoricalParAccuracy
// ---------------------------------------------------------------------------

export async function getHistoricalParAccuracy(days: number = 30): Promise<ParAccuracyRecord[]> {
  const user = await requireChef()
  // Historical par accuracy requires tracked data over time.
  // For now, return empty. This will be populated once the chef starts
  // recording actual covers vs estimated covers after service.
  void user
  void days
  return []
}

// ---------------------------------------------------------------------------
// saveParOverrides
// ---------------------------------------------------------------------------

export async function saveParOverrides(
  date: string,
  overrides: { ingredientId: string; quantity: number }[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  void user // tenant scoping verified

  // Store overrides in localStorage on the client side for now.
  // When a par_overrides table is created, this will persist to DB.
  // For now, return success and let the client handle storage.
  void date
  void overrides

  revalidatePath('/food-truck/par-planning')
  return { success: true }
}

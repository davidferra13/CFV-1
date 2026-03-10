// Cascading Ingredient Cost Propagation Engine
// When an ingredient price changes, this engine recomputes costs
// through every recipe that uses it, then up through sub-recipe
// parents, then through menus, then flags affected events.
//
// All money in cents (integers). Yield-aware calculations.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface CostBreakdownItem {
  type: 'ingredient' | 'sub_recipe'
  id: string
  name: string
  quantity: number
  unit: string
  unitCostCents: number | null
  yieldPct: number
  computedCostCents: number | null
  prepAction: string | null
  // Only for sub_recipe type
  children?: CostBreakdownItem[]
  totalCostCents?: number
}

export interface RecipeCostBreakdown {
  recipeId: string
  recipeName: string
  totalCostCents: number
  costPerServingCents: number | null
  yieldQuantity: number | null
  yieldUnit: string | null
  ingredients: CostBreakdownItem[]
  subRecipes: CostBreakdownItem[]
  hasAllPrices: boolean
  missingPriceCount: number
}

export interface CascadeResult {
  recipesUpdated: string[]
  menusAffected: string[]
  eventsFlagged: string[]
}

// ============================================
// CORE: Recompute a single recipe's costs
// ============================================

export async function recomputeRecipeCost(recipeId: string): Promise<{
  totalCostCents: number
  costPerServingCents: number | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all recipe_ingredients with their ingredient pricing
  const { data: items, error: itemsErr } = await supabase
    .from('recipe_ingredients')
    .select(
      `
      id,
      quantity,
      unit,
      yield_pct,
      prep_action,
      ingredient:ingredients!inner(
        id,
        cost_per_unit_cents,
        last_price_cents,
        default_yield_pct
      )
    `
    )
    .eq('recipe_id', recipeId)

  if (itemsErr) {
    console.error('[recomputeRecipeCost] Failed to fetch ingredients:', itemsErr)
    throw new Error('Failed to fetch recipe ingredients')
  }

  // Fetch sub-recipe costs (they should already be computed)
  const { data: subRecipes } = await supabase
    .from('recipe_sub_recipes')
    .select(
      `
      id,
      quantity,
      child_recipe:recipes!recipe_sub_recipes_child_recipe_id_fkey(
        id,
        total_cost_cents,
        yield_quantity
      )
    `
    )
    .eq('parent_recipe_id', recipeId)

  // Compute ingredient costs (yield-aware)
  let totalCents = 0
  const updates: Array<{ id: string; computedCostCents: number | null }> = []

  for (const item of items || []) {
    const ing = item.ingredient
    const unitCost = ing.cost_per_unit_cents ?? ing.last_price_cents
    if (unitCost == null) {
      updates.push({ id: item.id, computedCostCents: null })
      continue
    }

    const yieldPct = item.yield_pct || ing.default_yield_pct || 100
    const cost = calculateCostWithYield(unitCost, item.quantity, yieldPct)
    totalCents += cost
    updates.push({ id: item.id, computedCostCents: cost })
  }

  // Add sub-recipe costs
  for (const sub of subRecipes || []) {
    const child = sub.child_recipe
    if (child?.total_cost_cents != null) {
      // If child recipe has yield, cost per batch = total_cost / yield * quantity used
      if (child.yield_quantity && child.yield_quantity > 0) {
        totalCents += Math.round((child.total_cost_cents / child.yield_quantity) * sub.quantity)
      } else {
        // No yield info, treat quantity as batch multiplier
        totalCents += Math.round(child.total_cost_cents * sub.quantity)
      }
    }
  }

  // Update recipe_ingredients.computed_cost_cents
  for (const upd of updates) {
    await supabase
      .from('recipe_ingredients')
      .update({ computed_cost_cents: upd.computedCostCents })
      .eq('id', upd.id)
  }

  // Get recipe yield for per-serving calc
  const { data: recipe } = await supabase
    .from('recipes')
    .select('yield_quantity')
    .eq('id', recipeId)
    .single()

  const yieldQty = recipe?.yield_quantity
  const costPerServing = yieldQty && yieldQty > 0 ? Math.round(totalCents / yieldQty) : null

  // Store computed costs on the recipe
  const { error: updateErr } = await supabase
    .from('recipes')
    .update({
      total_cost_cents: totalCents,
      cost_per_serving_cents: costPerServing,
    })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (updateErr) {
    console.error('[recomputeRecipeCost] Failed to update recipe:', updateErr)
    throw new Error('Failed to update recipe costs')
  }

  return { totalCostCents: totalCents, costPerServingCents: costPerServing }
}

// ============================================
// CORE: Cascade an ingredient price change
// ============================================

export async function cascadeIngredientPriceChange(
  ingredientId: string,
  newCostPerUnitCents: number
): Promise<CascadeResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Update the ingredient's canonical cost
  const { error: ingErr } = await supabase
    .from('ingredients')
    .update({ cost_per_unit_cents: newCostPerUnitCents })
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)

  if (ingErr) {
    console.error('[cascadeIngredientPriceChange] Update ingredient failed:', ingErr)
    throw new Error('Failed to update ingredient cost')
  }

  // 2. Find all recipes using this ingredient (direct usage)
  const { data: usages } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .eq('ingredient_id', ingredientId)

  const directRecipeIds = [...new Set((usages || []).map((u: any) => u.recipe_id))]

  // 3. Recompute each direct recipe
  const recipesUpdated: string[] = []
  for (const recipeId of directRecipeIds) {
    await recomputeRecipeCost(recipeId)
    recipesUpdated.push(recipeId)
  }

  // 4. Find parent recipes that use any of these as sub-recipes, cascade upward
  const parentIds = await findParentRecipes(directRecipeIds)
  for (const parentId of parentIds) {
    if (!recipesUpdated.includes(parentId)) {
      await recomputeRecipeCost(parentId)
      recipesUpdated.push(parentId)
    }
  }

  // 5. Find menus affected (via components linking to updated recipes)
  const menusAffected = await findAffectedMenus(recipesUpdated)

  // 6. Flag events linked to affected menus
  const eventsFlagged = await flagEventsForCostRefresh(menusAffected, tenantId)

  // Revalidate relevant paths
  revalidatePath('/recipes')
  revalidatePath('/menus')

  return { recipesUpdated, menusAffected, eventsFlagged }
}

// ============================================
// CORE: Recompute menu cost
// ============================================

export async function recomputeMenuCost(menuId: string): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all components on this menu with their recipes
  const { data: components } = await supabase
    .from('components')
    .select(
      `
      id,
      recipe_id,
      scale_factor,
      recipe:recipes!components_recipe_id_fkey(
        total_cost_cents
      ),
      dish:dishes!inner(
        menu_id
      )
    `
    )
    .eq('dish.menu_id', menuId)

  let totalCents = 0
  for (const comp of components || []) {
    if (comp.recipe?.total_cost_cents != null) {
      totalCents += Math.round(comp.recipe.total_cost_cents * (comp.scale_factor || 1))
    }
  }

  return totalCents
}

// ============================================
// CORE: Get detailed cost breakdown for a recipe
// ============================================

export async function getRecipeCostBreakdown(recipeId: string): Promise<RecipeCostBreakdown> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch recipe info
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name, total_cost_cents, cost_per_serving_cents, yield_quantity, yield_unit')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Recipe not found')

  // Fetch ingredients with pricing
  const { data: items } = await supabase
    .from('recipe_ingredients')
    .select(
      `
      id,
      quantity,
      unit,
      yield_pct,
      prep_action,
      computed_cost_cents,
      ingredient:ingredients!inner(
        id,
        name,
        cost_per_unit_cents,
        last_price_cents,
        default_yield_pct
      )
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order')

  // Fetch sub-recipes
  const { data: subRecipes } = await supabase
    .from('recipe_sub_recipes')
    .select(
      `
      id,
      quantity,
      unit,
      notes,
      child_recipe:recipes!recipe_sub_recipes_child_recipe_id_fkey(
        id,
        name,
        total_cost_cents,
        cost_per_serving_cents,
        yield_quantity,
        yield_unit
      )
    `
    )
    .eq('parent_recipe_id', recipeId)
    .order('sort_order')

  let missingPriceCount = 0

  const ingredients: CostBreakdownItem[] = (items || []).map((item: any) => {
    const ing = item.ingredient
    const unitCost = ing.cost_per_unit_cents ?? ing.last_price_cents
    if (unitCost == null) missingPriceCount++

    return {
      type: 'ingredient' as const,
      id: ing.id,
      name: ing.name,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitCostCents: unitCost,
      yieldPct: item.yield_pct || ing.default_yield_pct || 100,
      computedCostCents: item.computed_cost_cents,
      prepAction: item.prep_action,
    }
  })

  const subRecipeItems: CostBreakdownItem[] = (subRecipes || []).map((sub: any) => {
    const child = sub.child_recipe
    let computedCost: number | null = null
    if (child?.total_cost_cents != null) {
      if (child.yield_quantity && child.yield_quantity > 0) {
        computedCost = Math.round((child.total_cost_cents / child.yield_quantity) * sub.quantity)
      } else {
        computedCost = Math.round(child.total_cost_cents * sub.quantity)
      }
    }

    return {
      type: 'sub_recipe' as const,
      id: child?.id ?? sub.id,
      name: child?.name ?? 'Unknown',
      quantity: Number(sub.quantity),
      unit: sub.unit,
      unitCostCents: child?.total_cost_cents ?? null,
      yieldPct: 100,
      computedCostCents: computedCost,
      prepAction: null,
      totalCostCents: child?.total_cost_cents ?? null,
    }
  })

  const totalCostCents = recipe.total_cost_cents ?? 0

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    totalCostCents,
    costPerServingCents: recipe.cost_per_serving_cents,
    yieldQuantity: recipe.yield_quantity ? Number(recipe.yield_quantity) : null,
    yieldUnit: recipe.yield_unit,
    ingredients,
    subRecipes: subRecipeItems,
    hasAllPrices: missingPriceCount === 0,
    missingPriceCount,
  }
}

// ============================================
// CORE: Flag event for cost refresh
// ============================================

export async function flagEventCostRefresh(eventId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('events')
    .update({
      cost_needs_refresh: true,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[flagEventCostRefresh] Failed:', error)
  }
}

export async function clearEventCostRefresh(eventId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('events')
    .update({
      cost_needs_refresh: false,
      cost_refreshed_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[clearEventCostRefresh] Failed:', error)
    throw new Error('Failed to clear cost refresh flag')
  }

  revalidatePath(`/events/${eventId}`)
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Calculate cost with yield adjustment.
 * cost = (unitCost * quantity * 100) / yieldPct
 * e.g. $5/lb of onions at 85% yield = $5.88/lb of usable product
 */
function calculateCostWithYield(unitCostCents: number, quantity: number, yieldPct: number): number {
  const effectiveYield = Math.max(1, Math.min(100, yieldPct))
  return Math.round((unitCostCents * quantity * 100) / effectiveYield)
}

/**
 * Walk upward through the sub-recipe tree to find all parent recipes
 * that transitively depend on any of the given recipe IDs.
 */
async function findParentRecipes(recipeIds: string[]): Promise<string[]> {
  if (recipeIds.length === 0) return []
  const supabase: any = createServerClient()

  const visited = new Set<string>()
  let frontier = [...recipeIds]
  const parents: string[] = []

  // BFS upward through the sub-recipe hierarchy
  while (frontier.length > 0) {
    const { data: parentLinks } = await supabase
      .from('recipe_sub_recipes')
      .select('parent_recipe_id')
      .in('child_recipe_id', frontier)

    frontier = []
    for (const link of parentLinks || []) {
      const pid = link.parent_recipe_id
      if (!visited.has(pid) && !recipeIds.includes(pid)) {
        visited.add(pid)
        parents.push(pid)
        frontier.push(pid)
      }
    }
  }

  return parents
}

/**
 * Find all menus that contain components linked to any of the given recipes.
 */
async function findAffectedMenus(recipeIds: string[]): Promise<string[]> {
  if (recipeIds.length === 0) return []
  const supabase: any = createServerClient()

  const { data: components } = await supabase
    .from('components')
    .select('dish:dishes!inner(menu_id)')
    .in('recipe_id', recipeIds)

  const menuIds = new Set<string>()
  for (const comp of components || []) {
    if (comp.dish?.menu_id) menuIds.add(comp.dish.menu_id)
  }

  return [...menuIds]
}

/**
 * Flag all events linked to the given menus for cost refresh.
 */
async function flagEventsForCostRefresh(menuIds: string[], tenantId: string): Promise<string[]> {
  if (menuIds.length === 0) return []
  const supabase: any = createServerClient()

  // Find events with these menus
  const { data: menus } = await supabase
    .from('menus')
    .select('event_id')
    .in('id', menuIds)
    .not('event_id', 'is', null)

  const eventIds = [...new Set((menus || []).map((m: any) => m.event_id).filter(Boolean))]

  if (eventIds.length === 0) return []

  // Flag them
  const { error } = await supabase
    .from('events')
    .update({ cost_needs_refresh: true })
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[flagEventsForCostRefresh] Failed:', error)
  }

  return eventIds
}

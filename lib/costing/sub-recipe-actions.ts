// Sub-Recipe Management Server Actions
// Link/unlink sub-recipes, get cost trees, scale recipes.
// All tenant-scoped via requireChef().

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { recomputeRecipeCost, getRecipeCostBreakdown } from './cascade-engine'
import type { CostBreakdownItem } from './cascade-engine'

// ============================================
// TYPES
// ============================================

export interface SubRecipeTreeNode {
  recipeId: string
  recipeName: string
  quantity: number
  unit: string
  totalCostCents: number | null
  costPerServingCents: number | null
  yieldQuantity: number | null
  yieldUnit: string | null
  children: SubRecipeTreeNode[]
  depth: number
}

// ============================================
// Link a sub-recipe to a parent
// ============================================

export async function linkSubRecipe(
  parentRecipeId: string,
  childRecipeId: string,
  quantity: number = 1,
  unit: string = 'batch'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Prevent self-reference
  if (parentRecipeId === childRecipeId) {
    return { success: false, error: 'A recipe cannot be a sub-recipe of itself.' }
  }

  // Verify both recipes belong to this tenant
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .in('id', [parentRecipeId, childRecipeId])

  if (!recipes || recipes.length !== 2) {
    return { success: false, error: 'One or both recipes not found.' }
  }

  // Insert (DB trigger will prevent circular refs)
  const { error } = await supabase.from('recipe_sub_recipes').insert({
    parent_recipe_id: parentRecipeId,
    child_recipe_id: childRecipeId,
    quantity,
    unit,
  })

  if (error) {
    if (error.message?.includes('circular')) {
      return {
        success: false,
        error: 'Cannot link: this would create a circular reference.',
      }
    }
    if (error.code === '23505') {
      return {
        success: false,
        error: 'This sub-recipe is already linked.',
      }
    }
    console.error('[linkSubRecipe] Error:', error)
    return { success: false, error: 'Failed to link sub-recipe.' }
  }

  // Recompute parent recipe cost
  try {
    await recomputeRecipeCost(parentRecipeId)
  } catch (err) {
    console.error('[linkSubRecipe] Cost recompute failed (non-blocking):', err)
  }

  revalidatePath('/recipes')
  return { success: true }
}

// ============================================
// Unlink a sub-recipe from a parent
// ============================================

export async function unlinkSubRecipe(
  parentRecipeId: string,
  childRecipeId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify parent belongs to tenant
  const { data: parent } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', parentRecipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!parent) {
    return { success: false, error: 'Recipe not found.' }
  }

  const { error } = await supabase
    .from('recipe_sub_recipes')
    .delete()
    .eq('parent_recipe_id', parentRecipeId)
    .eq('child_recipe_id', childRecipeId)

  if (error) {
    console.error('[unlinkSubRecipe] Error:', error)
    return { success: false, error: 'Failed to unlink sub-recipe.' }
  }

  // Recompute parent recipe cost
  try {
    await recomputeRecipeCost(parentRecipeId)
  } catch (err) {
    console.error('[unlinkSubRecipe] Cost recompute failed (non-blocking):', err)
  }

  revalidatePath('/recipes')
  return { success: true }
}

// ============================================
// Get the full sub-recipe tree with costs
// ============================================

export async function getSubRecipeTree(
  recipeId: string,
  maxDepth: number = 10
): Promise<SubRecipeTreeNode> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  async function buildNode(
    nodeRecipeId: string,
    quantity: number,
    unit: string,
    depth: number
  ): Promise<SubRecipeTreeNode> {
    // Fetch recipe info
    const { data: recipe } = await supabase
      .from('recipes')
      .select('id, name, total_cost_cents, cost_per_serving_cents, yield_quantity, yield_unit')
      .eq('id', nodeRecipeId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!recipe) {
      return {
        recipeId: nodeRecipeId,
        recipeName: 'Unknown',
        quantity,
        unit,
        totalCostCents: null,
        costPerServingCents: null,
        yieldQuantity: null,
        yieldUnit: null,
        children: [],
        depth,
      }
    }

    // Fetch child sub-recipes
    let children: SubRecipeTreeNode[] = []
    if (depth < maxDepth) {
      const { data: subs } = await supabase
        .from('recipe_sub_recipes')
        .select('child_recipe_id, quantity, unit')
        .eq('parent_recipe_id', nodeRecipeId)
        .order('sort_order')

      if (subs && subs.length > 0) {
        children = await Promise.all(
          subs.map((sub: any) =>
            buildNode(sub.child_recipe_id, Number(sub.quantity), sub.unit, depth + 1)
          )
        )
      }
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      quantity,
      unit,
      totalCostCents: recipe.total_cost_cents,
      costPerServingCents: recipe.cost_per_serving_cents,
      yieldQuantity: recipe.yield_quantity ? Number(recipe.yield_quantity) : null,
      yieldUnit: recipe.yield_unit,
      children,
      depth,
    }
  }

  return buildNode(recipeId, 1, 'batch', 0)
}

// ============================================
// Scale a recipe's ingredients proportionally
// ============================================

export async function scaleRecipe(
  recipeId: string,
  targetYield: number
): Promise<{
  success: boolean
  scaledIngredients?: Array<{
    id: string
    name: string
    originalQuantity: number
    scaledQuantity: number
    unit: string
    computedCostCents: number | null
  }>
  scaleFactor?: number
  error?: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the recipe's current yield
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, yield_quantity, yield_unit')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) {
    return { success: false, error: 'Recipe not found.' }
  }

  const currentYield = recipe.yield_quantity ? Number(recipe.yield_quantity) : null
  if (!currentYield || currentYield <= 0) {
    return {
      success: false,
      error: 'Recipe has no yield quantity set. Cannot scale without a base yield.',
    }
  }

  if (targetYield <= 0) {
    return { success: false, error: 'Target yield must be greater than zero.' }
  }

  const scaleFactor = targetYield / currentYield

  // Get all ingredients
  const { data: items } = await supabase
    .from('recipe_ingredients')
    .select(
      `
      id,
      quantity,
      unit,
      yield_pct,
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

  if (!items) {
    return { success: false, error: 'Failed to fetch ingredients.' }
  }

  // Compute scaled quantities and costs (read-only, does not persist)
  const scaledIngredients = items.map((item: any) => {
    const ing = item.ingredient
    const originalQty = Number(item.quantity)
    const scaledQty = Number((originalQty * scaleFactor).toFixed(3))
    const unitCost = ing.cost_per_unit_cents ?? ing.last_price_cents
    const yieldPct = item.yield_pct || ing.default_yield_pct || 100

    let computedCost: number | null = null
    if (unitCost != null) {
      computedCost = Math.round((unitCost * scaledQty * 100) / yieldPct)
    }

    return {
      id: item.id,
      name: ing.name,
      originalQuantity: originalQty,
      scaledQuantity: scaledQty,
      unit: item.unit,
      computedCostCents: computedCost,
    }
  })

  return { success: true, scaledIngredients, scaleFactor }
}

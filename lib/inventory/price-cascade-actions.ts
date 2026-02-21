// Price Cascade Server Actions
// Chef-only: Preview and apply ingredient price changes across all affected recipes

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type AffectedRecipe = {
  recipeId: string
  recipeName: string
  ingredientName: string
  quantityUsed: number
  unit: string
  oldCostCents: number
  newCostCents: number
  deltaCents: number
  oldRecipeTotalCents: number
  newRecipeTotalCents: number
}

export type PriceCascadePreview = {
  ingredientId: string
  ingredientName: string
  oldPriceCents: number
  newPriceCents: number
  priceDeltaCents: number
  affectedRecipes: AffectedRecipe[]
  totalRecipeCostImpactCents: number
}

export type PriceCascadeResult = {
  ingredientId: string
  pricePointUpdated: boolean
  recipesUpdated: number
  totalImpactCents: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const PreviewPriceCascadeSchema = z.object({
  ingredientId: z.string().uuid('Valid ingredient ID is required'),
  newPriceCents: z.number().int().min(0, 'Price cannot be negative'),
})

const CascadeIngredientPriceSchema = z.object({
  ingredientId: z.string().uuid('Valid ingredient ID is required'),
  newPriceCents: z.number().int().min(0, 'Price cannot be negative'),
})

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Preview the impact of changing an ingredient's price on all recipes that use it.
 * Does NOT write any changes — read-only analysis.
 */
export async function previewPriceCascade(
  ingredientId: string,
  newPriceCents: number
): Promise<PriceCascadePreview> {
  const user = await requireChef()
  PreviewPriceCascadeSchema.parse({ ingredientId, newPriceCents })
  const supabase = createServerClient()

  // Get the current price point for this ingredient
  const { data: pricePoint, error: priceError } = await (supabase as any)
    .from('vendor_price_points')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .eq('chef_id', user.tenantId!)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (priceError || !pricePoint) {
    throw new Error('No price point found for this ingredient')
  }

  const oldPriceCents = pricePoint.price_cents

  // Get all recipe_ingredients rows that reference this ingredient
  const { data: recipeIngredients, error: riError } = await (supabase as any)
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_id, quantity, unit, cost_cents')
    .eq('ingredient_id', ingredientId)

  if (riError) throw new Error(`Failed to fetch recipe ingredients: ${riError.message}`)

  if (!recipeIngredients || recipeIngredients.length === 0) {
    return {
      ingredientId,
      ingredientName: pricePoint.ingredient_name || ingredientId,
      oldPriceCents,
      newPriceCents,
      priceDeltaCents: newPriceCents - oldPriceCents,
      affectedRecipes: [],
      totalRecipeCostImpactCents: 0,
    }
  }

  // Get all affected recipe IDs to fetch recipe details
  const recipeIds = [...new Set(recipeIngredients.map((ri: any) => ri.recipe_id))]

  // Fetch recipe details — tenant-scoped
  const { data: recipes, error: recipesError } = await (supabase as any)
    .from('recipes')
    .select('id, name, total_cost_cents')
    .eq('chef_id', user.tenantId!)
    .in('id', recipeIds)

  if (recipesError) throw new Error(`Failed to fetch recipes: ${recipesError.message}`)

  const recipeMap = new Map<string, any>()
  for (const recipe of recipes || []) {
    recipeMap.set(recipe.id, recipe)
  }

  // Also get ALL recipe_ingredients for the affected recipes (to compute new totals)
  const { data: allRecipeIngredients, error: allRiError } = await (supabase as any)
    .from('recipe_ingredients')
    .select('recipe_id, cost_cents')
    .in('recipe_id', recipeIds)

  if (allRiError) throw new Error(`Failed to fetch all recipe ingredients: ${allRiError.message}`)

  // Sum cost_cents per recipe for the current totals
  const recipeCostMap = new Map<string, number>()
  for (const ri of allRecipeIngredients || []) {
    const current = recipeCostMap.get(ri.recipe_id) || 0
    recipeCostMap.set(ri.recipe_id, current + (ri.cost_cents || 0))
  }

  // Build affected recipe list
  const affectedRecipes: AffectedRecipe[] = []
  let totalRecipeCostImpactCents = 0

  for (const ri of recipeIngredients) {
    const recipe = recipeMap.get(ri.recipe_id)
    if (!recipe) continue // recipe not owned by this chef

    const qty = parseFloat(ri.quantity) || 0
    const oldCost = ri.cost_cents || 0

    // Compute new cost for this ingredient line:
    // If old price was nonzero, scale proportionally; otherwise use new price * quantity
    let newCost: number
    if (oldPriceCents > 0 && qty > 0) {
      newCost = Math.round((newPriceCents / oldPriceCents) * oldCost)
    } else {
      newCost = Math.round(newPriceCents * qty)
    }

    const deltaCents = newCost - oldCost
    const oldRecipeTotal = recipeCostMap.get(ri.recipe_id) || 0
    const newRecipeTotal = oldRecipeTotal + deltaCents

    totalRecipeCostImpactCents += deltaCents

    affectedRecipes.push({
      recipeId: ri.recipe_id,
      recipeName: recipe.name,
      ingredientName: pricePoint.ingredient_name || ingredientId,
      quantityUsed: qty,
      unit: ri.unit || '',
      oldCostCents: oldCost,
      newCostCents: newCost,
      deltaCents,
      oldRecipeTotalCents: oldRecipeTotal,
      newRecipeTotalCents: newRecipeTotal,
    })
  }

  return {
    ingredientId,
    ingredientName: pricePoint.ingredient_name || ingredientId,
    oldPriceCents,
    newPriceCents,
    priceDeltaCents: newPriceCents - oldPriceCents,
    affectedRecipes,
    totalRecipeCostImpactCents,
  }
}

/**
 * Update an ingredient's price point and recalculate all affected recipe costs.
 * This is a write operation that cascades the price change through recipe_ingredients
 * and updates recipe total_cost_cents.
 */
export async function cascadeIngredientPrice(
  ingredientId: string,
  newPriceCents: number
): Promise<PriceCascadeResult> {
  const user = await requireChef()
  CascadeIngredientPriceSchema.parse({ ingredientId, newPriceCents })
  const supabase = createServerClient()

  // Get preview first to know what needs to change
  const preview = await previewPriceCascade(ingredientId, newPriceCents)

  // Insert a new price point (append-only: we don't update the old one)
  const { error: insertError } = await (supabase as any)
    .from('vendor_price_points')
    .insert({
      chef_id: user.tenantId!,
      ingredient_id: ingredientId,
      ingredient_name: preview.ingredientName,
      price_cents: newPriceCents,
      effective_date: new Date().toISOString().split('T')[0],
    })

  if (insertError) throw new Error(`Failed to insert price point: ${insertError.message}`)

  // Update each affected recipe_ingredient cost
  let recipesUpdated = 0
  const updatedRecipeIds = new Set<string>()

  for (const affected of preview.affectedRecipes) {
    // Update the recipe_ingredient cost_cents for this specific line
    const { error: riUpdateError } = await (supabase as any)
      .from('recipe_ingredients')
      .update({ cost_cents: affected.newCostCents })
      .eq('recipe_id', affected.recipeId)
      .eq('ingredient_id', ingredientId)

    if (riUpdateError) {
      console.error(
        `[cascadeIngredientPrice] Failed to update recipe_ingredient for recipe ${affected.recipeId}: ${riUpdateError.message}`
      )
      continue
    }

    updatedRecipeIds.add(affected.recipeId)
  }

  // Update total_cost_cents on each affected recipe
  for (const recipeId of updatedRecipeIds) {
    // Sum all recipe_ingredients for this recipe
    const { data: ingredients, error: sumError } = await (supabase as any)
      .from('recipe_ingredients')
      .select('cost_cents')
      .eq('recipe_id', recipeId)

    if (sumError) {
      console.error(
        `[cascadeIngredientPrice] Failed to sum recipe ingredients for ${recipeId}: ${sumError.message}`
      )
      continue
    }

    const newTotal = (ingredients || []).reduce(
      (sum: number, ri: any) => sum + (ri.cost_cents || 0),
      0
    )

    const { error: recipeUpdateError } = await (supabase as any)
      .from('recipes')
      .update({ total_cost_cents: newTotal })
      .eq('id', recipeId)
      .eq('chef_id', user.tenantId!)

    if (recipeUpdateError) {
      console.error(
        `[cascadeIngredientPrice] Failed to update recipe total for ${recipeId}: ${recipeUpdateError.message}`
      )
      continue
    }

    recipesUpdated++
  }

  revalidatePath('/inventory')
  revalidatePath('/recipes')
  revalidatePath('/culinary/recipes')

  return {
    ingredientId,
    pricePointUpdated: true,
    recipesUpdated,
    totalImpactCents: preview.totalRecipeCostImpactCents,
  }
}

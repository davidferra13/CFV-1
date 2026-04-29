// Price Cascade Server Actions
// Chef-only: Preview and apply ingredient price changes across all affected recipes

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

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
 * Does NOT write any changes - read-only analysis.
 */
export async function previewPriceCascade(
  ingredientId: string,
  newPriceCents: number
): Promise<PriceCascadePreview> {
  const user = await requireChef()
  PreviewPriceCascadeSchema.parse({ ingredientId, newPriceCents })
  const db: any = createServerClient()

  // Get the current price point for this ingredient
  // vendor_price_points uses item_name (not ingredient_name) and recorded_at (not effective_date)
  const { data: pricePoint, error: priceError } = await (db.from('vendor_price_points') as any)
    .select('*')
    .eq('ingredient_id', ingredientId)
    .eq('chef_id', user.tenantId!)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  if (priceError || !pricePoint) {
    throw new Error('No price point found for this ingredient')
  }

  const oldPriceCents = (pricePoint as any).price_cents

  // Get all recipe_ingredients rows that reference this ingredient
  // Note: recipe_ingredients does not have cost_cents in the DB schema,
  // so we compute costs from the price point and quantity
  const { data: recipeIngredients, error: riError } = await db
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_id, quantity, unit')
    .eq('ingredient_id', ingredientId)

  if (riError) throw new Error(`Failed to fetch recipe ingredients: ${riError.message}`)

  if (!recipeIngredients || recipeIngredients.length === 0) {
    return {
      ingredientId,
      ingredientName: (pricePoint as any).item_name || ingredientId,
      oldPriceCents,
      newPriceCents,
      priceDeltaCents: newPriceCents - oldPriceCents,
      affectedRecipes: [],
      totalRecipeCostImpactCents: 0,
    }
  }

  // Get all affected recipe IDs to fetch recipe details
  const recipeIds = [...new Set((recipeIngredients as any[]).map((ri: any) => ri.recipe_id))]

  // Fetch recipe details - tenant-scoped (recipes use tenant_id)
  const { data: recipes, error: recipesError } = await db
    .from('recipes')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .in('id', recipeIds)

  if (recipesError) throw new Error(`Failed to fetch recipes: ${recipesError.message}`)

  const recipeMap = new Map<string, any>()
  for (const recipe of (recipes || []) as any[]) {
    recipeMap.set(recipe.id, recipe)
  }

  // Build affected recipe list
  const affectedRecipes: AffectedRecipe[] = []
  let totalRecipeCostImpactCents = 0

  for (const ri of recipeIngredients as any[]) {
    const recipe = recipeMap.get(ri.recipe_id)
    if (!recipe) continue // recipe not owned by this chef

    const qty = Number(ri.quantity) || 0

    // Compute old and new costs based on price * quantity
    const oldCost = Math.round(qty * oldPriceCents)
    const newCost = Math.round(qty * newPriceCents)
    const deltaCents = newCost - oldCost

    totalRecipeCostImpactCents += deltaCents

    affectedRecipes.push({
      recipeId: ri.recipe_id,
      recipeName: recipe.name,
      ingredientName: (pricePoint as any).item_name || ingredientId,
      quantityUsed: qty,
      unit: ri.unit || '',
      oldCostCents: oldCost,
      newCostCents: newCost,
      deltaCents,
      oldRecipeTotalCents: 0, // Would need full recipe costing to compute
      newRecipeTotalCents: 0,
    })
  }

  return {
    ingredientId,
    ingredientName: (pricePoint as any).item_name || ingredientId,
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
  const db: any = createServerClient()

  // Get preview first to know what needs to change
  const preview = await previewPriceCascade(ingredientId, newPriceCents)

  // Insert a new price point (append-only: we don't update the old one)
  // vendor_price_points requires: chef_id, item_name, price_cents, unit, vendor_id
  // We need to fetch the existing price point to get the vendor_id and unit
  const { data: existingPP } = await (db.from('vendor_price_points') as any)
    .select('vendor_id, unit')
    .eq('ingredient_id', ingredientId)
    .eq('chef_id', user.tenantId!)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  const { error: insertError } = await (db.from('vendor_price_points') as any).insert({
    chef_id: user.tenantId!,
    ingredient_id: ingredientId,
    item_name: preview.ingredientName,
    price_cents: newPriceCents,
    unit: (existingPP as any)?.unit || 'each',
    vendor_id: (existingPP as any)?.vendor_id,
    recorded_at: new Date().toISOString(),
  })

  if (insertError) throw new Error(`Failed to insert price point: ${(insertError as any).message}`)

  // Update ingredient.last_price_cents
  try {
    await db
      .from('ingredients')
      .update({ last_price_cents: newPriceCents } as any)
      .eq('id', ingredientId)
  } catch (err) {
    console.error('[cascadeIngredientPrice] Failed to update ingredient last_price_cents', err)
  }

  const recipesUpdated = preview.affectedRecipes.length

  // Propagate price change to recipes (non-blocking)
  try {
    const { propagatePriceChange } = await import('@/lib/pricing/cost-refresh-actions')
    await propagatePriceChange([ingredientId])
  } catch (err) {
    console.error('[cascadeIngredientPrice] Price cascade failed (non-blocking):', err)
  }

  revalidatePath('/inventory')
  revalidatePath('/recipes')

  return {
    ingredientId,
    pricePointUpdated: true,
    recipesUpdated,
    totalImpactCents: preview.totalRecipeCostImpactCents,
  }
}

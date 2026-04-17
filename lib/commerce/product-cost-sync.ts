// Commerce Engine V1 - Product Cost Sync
// Cascades ingredient/recipe cost changes to product_projections.cost_cents.
// Call after ingredient price updates or recipe changes.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

export type CostSyncResult = {
  productsChecked: number
  productsUpdated: number
  updates: Array<{
    productId: string
    productName: string
    oldCostCents: number | null
    newCostCents: number | null
    recipeName: string
  }>
}

// ─── Sync All Product Costs from Recipes ─────────────────────────

/**
 * Recompute cost_cents for every product_projection linked to a recipe.
 * Uses the DB function compute_recipe_cost_cents() for yield-aware calculation.
 * Only updates products whose cost actually changed (avoids unnecessary writes).
 */
export async function syncAllProductCosts(): Promise<CostSyncResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all products with recipe links
  const { data: products, error: prodErr } = await (db
    .from('product_projections')
    .select('id, name, recipe_id, cost_cents')
    .eq('tenant_id', user.tenantId!)
    .not('recipe_id', 'is', null) as any)

  if (prodErr) throw new Error(`Failed to load products: ${prodErr.message}`)
  if (!products || products.length === 0) {
    return { productsChecked: 0, productsUpdated: 0, updates: [] }
  }

  // Get current recipe costs from the view (uses compute_recipe_cost_cents under the hood)
  const recipeIds = [...new Set(products.map((p: any) => p.recipe_id))]
  const { data: recipeCosts, error: costErr } = await (db
    .from('recipe_cost_summary' as any)
    .select('recipe_id, recipe_name, total_ingredient_cost_cents, cost_per_portion_cents')
    .in('recipe_id', recipeIds) as any)

  if (costErr) throw new Error(`Failed to load recipe costs: ${costErr.message}`)

  const costMap = new Map<
    string,
    { totalCost: number | null; perPortion: number | null; name: string }
  >()
  for (const rc of recipeCosts ?? []) {
    costMap.set((rc as any).recipe_id, {
      totalCost: (rc as any).total_ingredient_cost_cents,
      perPortion: (rc as any).cost_per_portion_cents,
      name: (rc as any).recipe_name ?? 'Unknown',
    })
  }

  const updates: CostSyncResult['updates'] = []

  for (const product of products) {
    const recipeCost = costMap.get((product as any).recipe_id)
    if (!recipeCost) continue

    // Use per-portion cost if available, otherwise total cost
    const newCostCents = recipeCost.perPortion ?? recipeCost.totalCost
    const oldCostCents = (product as any).cost_cents

    // Skip if cost hasn't changed
    if (newCostCents === oldCostCents) continue
    if (newCostCents == null && oldCostCents == null) continue

    const { error: updateErr } = await (db
      .from('product_projections')
      .update({ cost_cents: newCostCents } as any)
      .eq('id', product.id)
      .eq('tenant_id', user.tenantId!) as any)

    if (updateErr) {
      console.error(`[product-cost-sync] Failed to update ${product.id}:`, updateErr.message)
      continue
    }

    updates.push({
      productId: product.id,
      productName: (product as any).name,
      oldCostCents,
      newCostCents,
      recipeName: recipeCost.name,
    })
  }

  if (updates.length > 0) {
    revalidatePath('/commerce/products')
    revalidatePath('/commerce/register')
  }

  return {
    productsChecked: products.length,
    productsUpdated: updates.length,
    updates,
  }
}

// ─── Sync Single Product Cost ────────────────────────────────────

/**
 * Recompute cost_cents for a single product projection from its linked recipe.
 * Returns the updated cost or null if no recipe is linked.
 */
export async function syncProductCost(productId: string): Promise<{
  updated: boolean
  oldCostCents: number | null
  newCostCents: number | null
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: product, error: prodErr } = await (db
    .from('product_projections')
    .select('id, recipe_id, cost_cents')
    .eq('id', productId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (prodErr || !product) return null
  if (!(product as any).recipe_id) return null

  const { data: recipeCost } = await (db
    .from('recipe_cost_summary' as any)
    .select('cost_per_portion_cents, total_ingredient_cost_cents')
    .eq('recipe_id', (product as any).recipe_id)
    .single() as any)

  if (!recipeCost) return null

  const newCostCents =
    (recipeCost as any).cost_per_portion_cents ?? (recipeCost as any).total_ingredient_cost_cents
  const oldCostCents = (product as any).cost_cents

  if (newCostCents === oldCostCents) {
    return { updated: false, oldCostCents, newCostCents }
  }

  const { error } = await (db
    .from('product_projections')
    .update({ cost_cents: newCostCents } as any)
    .eq('id', productId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to sync product cost: ${error.message}`)

  revalidatePath('/commerce/products')
  return { updated: true, oldCostCents, newCostCents }
}

// ─── Cascade from Ingredient ─────────────────────────────────────

/**
 * When an ingredient price changes, recompute all recipes using it,
 * then cascade to product projections.
 * Call this from ingredient price update flows.
 */
export async function cascadeIngredientPriceChange(ingredientId: string): Promise<{
  recipesRecomputed: number
  productsUpdated: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find all recipes using this ingredient
  const { data: recipeLinks } = await (db
    .from('recipe_ingredients')
    .select('recipe_id')
    .eq('ingredient_id', ingredientId) as any)

  if (!recipeLinks || recipeLinks.length === 0) {
    return { recipesRecomputed: 0, productsUpdated: 0 }
  }

  const recipeIds = [...new Set(recipeLinks.map((r: any) => r.recipe_id))]

  // Recompute recipe costs via DB functions (yield-aware)
  for (const recipeId of recipeIds) {
    try {
      await (db.rpc('recompute_recipe_ingredient_costs', { p_recipe_id: recipeId }) as any)
      await (db.rpc('recompute_and_store_recipe_cost', { p_recipe_id: recipeId }) as any)
    } catch (err) {
      console.error(`[cascade] Failed to recompute recipe ${recipeId}:`, err)
    }
  }

  // Now cascade to product projections
  const result = await syncAllProductCosts()

  // Flag affected events for cost review
  const { data: eventLinks } = await (db
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('cost_needs_refresh', false)
    .in('status', ['draft', 'proposed', 'accepted', 'confirmed']) as any)

  if (eventLinks && eventLinks.length > 0) {
    // Check which events use affected recipes
    for (const event of eventLinks) {
      const { data: menuDishes } = await (db
        .from('menu_dishes')
        .select('recipe_id, menus!inner(event_id)')
        .in('recipe_id', recipeIds)
        .eq('menus.event_id', event.id) as any)

      if (menuDishes && menuDishes.length > 0) {
        await (db
          .from('events')
          .update({ cost_needs_refresh: true } as any)
          .eq('id', event.id)
          .eq('tenant_id', user.tenantId!) as any)
      }
    }
  }

  revalidatePath('/commerce/products')
  revalidatePath('/culinary/recipes')

  return {
    recipesRecomputed: recipeIds.length,
    productsUpdated: result.productsUpdated,
  }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { propagatePriceChange } from '@/lib/pricing/cost-refresh-actions'
import { resolvePrice, resolvePricesBatch } from '@/lib/pricing/resolve-price'
import { computeRecipeIngredientCost, refreshRecipeTotalCost } from '@/lib/recipes/actions'
import type {
  PropagationResult,
  CostImpactPreview,
  AffectedRecipe,
  AffectedMenu,
  AffectedEvent,
} from './cost-propagation-types'

// ============================================
// PROPAGATE COST CHANGE (ingredient -> recipes -> menus -> events)
// ============================================

/**
 * When an ingredient price changes, cascade the update through:
 * recipes (recompute ingredient costs + totals) ->
 * menus (flag linked events) ->
 * events (set cost_needs_refresh)
 *
 * Auth-gated, tenant-scoped.
 */
export async function propagateCostChange(
  ingredientId: string
): Promise<PropagationResult> {
  const start = Date.now()
  const user = await requireChef()
  const tenantId = user.tenantId!
  const errors: string[] = []

  try {
    // Delegate to the existing cascade engine
    await propagatePriceChange([ingredientId], { tenantId })
  } catch (err) {
    errors.push(`Propagation failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Count what was affected
  const db: any = createServerClient()

  let recipesUpdated = 0
  let menusAffected = 0
  let eventsFlagged = 0

  try {
    // Count recipes using this ingredient
    const { count: recipeCount } = await db
      .from('recipe_ingredients')
      .select('id', { count: 'exact', head: true })
      .eq('ingredient_id', ingredientId)

    recipesUpdated = recipeCount ?? 0

    // Count menus via component -> dish -> menu chain
    const { data: menuRows } = await db
      .from('recipe_ingredients')
      .select('recipe_id')
      .eq('ingredient_id', ingredientId)

    if (menuRows && menuRows.length > 0) {
      const recipeIds = Array.from(new Set<string>(menuRows.map((r: any) => r.recipe_id as string)))

      const { data: components } = await db
        .from('components')
        .select('dish_id')
        .in('recipe_id', recipeIds)

      if (components && components.length > 0) {
        const dishIds = Array.from(new Set<string>(components.map((c: any) => c.dish_id as string)))

        const { data: dishes } = await db
          .from('dishes')
          .select('menu_id')
          .in('id', dishIds)
          .not('menu_id', 'is', null)

        if (dishes) {
          menusAffected = new Set<string>(dishes.map((d: any) => d.menu_id as string)).size
        }
      }
    }

    // Count events flagged for refresh
    const { count: flaggedCount } = await db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('cost_needs_refresh', true)

    eventsFlagged = flaggedCount ?? 0
  } catch (err) {
    errors.push(`Count query failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Bust caches for affected surfaces
  revalidatePath('/menus')
  revalidatePath('/events')
  revalidatePath('/culinary/costing')
  revalidatePath('/culinary/recipes')
  revalidateTag('recipe-costs')

  return {
    ingredientIds: [ingredientId],
    recipesUpdated,
    menusAffected,
    eventsFlagged,
    errors,
    elapsedMs: Date.now() - start,
  }
}

// ============================================
// RECALCULATE MENU COSTS
// ============================================

/**
 * Force recalculate all costs for a menu by re-resolving prices
 * for every ingredient in every recipe linked to the menu's components.
 * Auth-gated, tenant-scoped.
 */
export async function recalculateMenuCosts(
  menuId: string
): Promise<PropagationResult> {
  const start = Date.now()
  const user = await requireChef()
  const tenantId = user.tenantId!
  const errors: string[] = []
  const db: any = createServerClient()

  // 1. Get all recipe IDs from menu -> dishes -> components
  const { data: components } = await db
    .from('components')
    .select('recipe_id, dish_id')
    .eq('tenant_id', tenantId)
    .in(
      'dish_id',
      db
        .from('dishes')
        .select('id')
        .eq('menu_id', menuId)
        .eq('tenant_id', tenantId)
    )
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) {
    return {
      ingredientIds: [],
      recipesUpdated: 0,
      menusAffected: 0,
      eventsFlagged: 0,
      errors: [],
      elapsedMs: Date.now() - start,
    }
  }

  const recipeIds: string[] = Array.from(new Set<string>(components.map((c: any) => c.recipe_id as string)))

  // 2. Get all recipe_ingredients for these recipes
  const { data: riRows } = await db
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_id, quantity, unit, yield_pct')
    .in('recipe_id', recipeIds)

  if (!riRows || riRows.length === 0) {
    return {
      ingredientIds: [],
      recipesUpdated: 0,
      menusAffected: 1,
      eventsFlagged: 0,
      errors: [],
      elapsedMs: Date.now() - start,
    }
  }

  const ingredientIds: string[] = Array.from(new Set<string>(
    riRows
      .filter((ri: any) => ri.ingredient_id)
      .map((ri: any) => ri.ingredient_id as string)
  ))

  // 3. Recompute each recipe ingredient cost using resolvePrice
  let recipesUpdated = 0
  for (const ri of riRows) {
    try {
      const result = await computeRecipeIngredientCost(
        db,
        tenantId,
        ri.ingredient_id,
        ri.quantity ?? 1,
        ri.unit || 'each',
        ri.yield_pct ?? undefined
      )
      await db
        .from('recipe_ingredients')
        .update({ computed_cost_cents: result.costCents } as any)
        .eq('id', ri.id)
        .eq('recipe_id', ri.recipe_id)
    } catch (err) {
      errors.push(`Failed to recompute ri ${ri.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 4. Refresh each recipe total
  for (const recipeId of recipeIds) {
    try {
      await refreshRecipeTotalCost(db, tenantId, recipeId)
      recipesUpdated++
    } catch (err) {
      errors.push(`Failed to refresh recipe ${recipeId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 5. Flag linked event if any
  let eventsFlagged = 0
  try {
    const { data: events } = await db
      .from('events')
      .select('id')
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .eq('cost_needs_refresh', false)

    for (const evt of events ?? []) {
      await db
        .from('events')
        .update({ cost_needs_refresh: true } as any)
        .eq('id', evt.id)
        .eq('tenant_id', tenantId)
      eventsFlagged++
    }
  } catch (err) {
    errors.push(`Event flagging failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 6. Bust caches
  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)
  revalidatePath('/events')
  revalidatePath('/culinary/costing')
  revalidateTag('recipe-costs')

  return {
    ingredientIds,
    recipesUpdated,
    menusAffected: 1,
    eventsFlagged,
    errors,
    elapsedMs: Date.now() - start,
  }
}

// ============================================
// RECALCULATE EVENT COSTS
// ============================================

/**
 * Force recalculate all costs for an event by recalculating its menu.
 * Auth-gated, tenant-scoped.
 */
export async function recalculateEventCosts(
  eventId: string
): Promise<PropagationResult> {
  const start = Date.now()
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get event's menu
  const { data: event } = await db
    .from('events')
    .select('menu_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.menu_id) {
    return {
      ingredientIds: [],
      recipesUpdated: 0,
      menusAffected: 0,
      eventsFlagged: 0,
      errors: ['Event has no linked menu'],
      elapsedMs: Date.now() - start,
    }
  }

  // Delegate to menu recalculation
  const result = await recalculateMenuCosts(event.menu_id)

  // Clear the refresh flag since we just recalculated
  try {
    await db
      .from('events')
      .update({
        cost_needs_refresh: false,
        cost_refreshed_at: new Date().toISOString(),
      } as any)
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
  } catch {
    // Non-critical
  }

  revalidatePath(`/events/${eventId}`)

  return {
    ...result,
    elapsedMs: Date.now() - start,
  }
}

// ============================================
// COST IMPACT PREVIEW
// ============================================

/**
 * Preview what menus/events would be affected by a price change
 * without actually making the change. Read-only.
 * Auth-gated, tenant-scoped.
 */
export async function getCostImpactPreview(
  ingredientId: string,
  newPriceCents: number
): Promise<CostImpactPreview> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get ingredient info
  const { data: ingredient } = await db
    .from('ingredients')
    .select('name, cost_per_unit_cents, last_price_cents')
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .single()

  const currentCents = ingredient?.cost_per_unit_cents ?? ingredient?.last_price_cents ?? null

  // Find all recipes using this ingredient
  const { data: riRows } = await db
    .from('recipe_ingredients')
    .select('recipe_id, quantity, unit')
    .eq('ingredient_id', ingredientId)

  const recipeIds = Array.from(new Set<string>((riRows ?? []).map((ri: any) => ri.recipe_id as string)))

  // Get recipe details
  const affectedRecipes: AffectedRecipe[] = []
  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name, total_cost_cents')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    for (const recipe of recipes ?? []) {
      affectedRecipes.push({
        recipeId: recipe.id,
        recipeName: recipe.name || 'Untitled',
        currentTotalCostCents: recipe.total_cost_cents,
        estimatedNewCostCents: null, // Would require full recomputation; kept null for preview
      })
    }
  }

  // Find menus via component -> dish -> menu chain
  const affectedMenus: AffectedMenu[] = []
  const affectedEvents: AffectedEvent[] = []

  if (recipeIds.length > 0) {
    const { data: components } = await db
      .from('components')
      .select('dish_id, recipe_id')
      .in('recipe_id', recipeIds)

    if (components && components.length > 0) {
      const dishIds = Array.from(new Set<string>(components.map((c: any) => c.dish_id as string)))

      const { data: dishes } = await db
        .from('dishes')
        .select('id, menu_id, menus:menu_id(id, name)')
        .in('id', dishIds)
        .not('menu_id', 'is', null)

      const menuMap = new Map<string, { menuName: string; recipeCount: number }>()
      for (const dish of dishes ?? []) {
        const menuId = dish.menu_id as string
        const existing = menuMap.get(menuId)
        if (existing) {
          existing.recipeCount++
        } else {
          menuMap.set(menuId, {
            menuName: (dish.menus as any)?.name || 'Untitled Menu',
            recipeCount: 1,
          })
        }
      }

      const menuIds = [...menuMap.keys()]

      // Find events linked to these menus
      if (menuIds.length > 0) {
        const { data: events } = await db
          .from('events')
          .select('id, event_date, menu_id, cost_needs_refresh, client:clients(full_name)')
          .in('menu_id', menuIds)
          .eq('tenant_id', tenantId)

        for (const evt of events ?? []) {
          const menuInfo = menuMap.get(evt.menu_id as string)
          affectedEvents.push({
            eventId: evt.id,
            eventDate: evt.event_date,
            clientName: (evt.client as any)?.full_name || null,
            menuId: evt.menu_id,
            menuName: menuInfo?.menuName || null,
            costNeedsRefresh: evt.cost_needs_refresh ?? false,
          })
        }
      }

      for (const [menuId, info] of menuMap) {
        const linkedEvent = affectedEvents.find((e) => e.menuId === menuId)
        affectedMenus.push({
          menuId,
          menuName: info.menuName,
          eventId: linkedEvent?.eventId || null,
          eventName: linkedEvent?.clientName || null,
          recipeCount: info.recipeCount,
        })
      }
    }
  }

  return {
    ingredient: {
      ingredientId,
      ingredientName: ingredient?.name || 'Unknown',
      currentCents,
      newCents: newPriceCents,
      deltaCents: newPriceCents - (currentCents ?? 0),
      affectedRecipeCount: affectedRecipes.length,
      affectedMenuCount: affectedMenus.length,
      affectedEventCount: affectedEvents.length,
    },
    affectedRecipes,
    affectedMenus,
    affectedEvents,
  }
}

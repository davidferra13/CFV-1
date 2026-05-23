// Costing Rollup Actions
// Rolls up ingredient costs from recipes through menus to events.
// Recipe cost -> Menu cost (sum of component recipes) -> Event cost (menu * guests + labor + travel)
// Auth-gated, tenant-scoped.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  calculateTruePlateCost,
  IRS_MILEAGE_RATE_CENTS_2026,
  DEFAULT_OVERHEAD_PERCENT,
  DEFAULT_HOURLY_RATE_CENTS,
  type TruePlateCost,
} from '@/lib/formulas/true-plate-cost'

// ============================================
// TYPES
// ============================================

export type RecipeCostLine = {
  recipeId: string
  recipeName: string
  componentName: string
  dishName: string
  totalCostCents: number | null
  ingredientCount: number
  pricedCount: number
  scaleFactor: number
  scaledCostCents: number | null
}

export type MenuCostRollup = {
  menuId: string
  menuName: string
  recipeCostLines: RecipeCostLine[]
  totalIngredientCostCents: number
  totalIngredientCount: number
  totalPricedCount: number
  coveragePct: number | null
  hasCompletePricing: boolean
}

export type EventCostRollup = {
  eventId: string
  eventName: string
  eventDate: string | null
  guestCount: number
  menus: MenuCostRollup[]
  totalIngredientCostCents: number
  plateCost: TruePlateCost | null
  perGuestCostCents: number | null
  quotedPriceCents: number | null
  marginPercent: number | null
  coveragePct: number | null
}

// ============================================
// 1. MENU COST ROLLUP
// ============================================

/**
 * Compute the full cost rollup for a menu.
 * Walks: menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
 * Returns per-recipe cost lines and aggregated totals.
 */
export async function getMenuCostRollup(menuId: string): Promise<MenuCostRollup | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: menu } = await db
    .from('menus')
    .select('id, name')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) return null

  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_name, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return {
      menuId: menu.id,
      menuName: menu.name,
      recipeCostLines: [],
      totalIngredientCostCents: 0,
      totalIngredientCount: 0,
      totalPricedCount: 0,
      coveragePct: null,
      hasCompletePricing: false,
    }
  }

  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map<string, any>(dishes.map((d: any) => [d.id, d]))

  const { data: components } = await db
    .from('components')
    .select('id, name, dish_id, recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)

  if (!components || components.length === 0) {
    return {
      menuId: menu.id,
      menuName: menu.name,
      recipeCostLines: [],
      totalIngredientCostCents: 0,
      totalIngredientCount: 0,
      totalPricedCount: 0,
      coveragePct: null,
      hasCompletePricing: false,
    }
  }

  const recipeIds = [
    ...new Set(components.filter((c: any) => c.recipe_id).map((c: any) => c.recipe_id)),
  ]
  let recipeMap = new Map<string, any>()

  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name, total_cost_cents')
      .in('id', recipeIds)

    recipeMap = new Map((recipes || []).map((r: any) => [r.id, r]))
  }

  // Count priced ingredients per recipe
  const pricedCountMap = new Map<string, { total: number; priced: number }>()
  if (recipeIds.length > 0) {
    const { data: riRows } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, ingredient:ingredients(cost_per_unit_cents)')
      .in('recipe_id', recipeIds)

    if (riRows) {
      for (const ri of riRows) {
        const entry = pricedCountMap.get(ri.recipe_id) || { total: 0, priced: 0 }
        entry.total++
        const ing = ri.ingredient as any
        if (ing?.cost_per_unit_cents != null && ing.cost_per_unit_cents > 0) {
          entry.priced++
        }
        pricedCountMap.set(ri.recipe_id, entry)
      }
    }
  }

  const recipeCostLines: RecipeCostLine[] = []
  let totalIngredientCost = 0
  let totalIngredients = 0
  let totalPriced = 0

  for (const comp of components) {
    const recipe = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null
    const dish = dishMap.get(comp.dish_id)
    const counts = comp.recipe_id ? pricedCountMap.get(comp.recipe_id) : null

    const scaleFactor = comp.scale_factor ?? 1.0
    const recipeCost = recipe?.total_cost_cents ?? null
    const scaledCost = recipeCost != null ? Math.round(recipeCost * scaleFactor) : null

    recipeCostLines.push({
      recipeId: recipe?.id ?? comp.id,
      recipeName: recipe?.name ?? comp.name,
      componentName: comp.name,
      dishName: dish?.course_name ?? 'Unknown',
      totalCostCents: recipeCost,
      ingredientCount: counts?.total ?? 0,
      pricedCount: counts?.priced ?? 0,
      scaleFactor,
      scaledCostCents: scaledCost,
    })

    if (scaledCost != null) {
      totalIngredientCost += scaledCost
    }
    if (counts) {
      totalIngredients += counts.total
      totalPriced += counts.priced
    }
  }

  const coveragePct =
    totalIngredients > 0 ? Math.round((totalPriced / totalIngredients) * 100) : null

  return {
    menuId: menu.id,
    menuName: menu.name,
    recipeCostLines,
    totalIngredientCostCents: totalIngredientCost,
    totalIngredientCount: totalIngredients,
    totalPricedCount: totalPriced,
    coveragePct,
    hasCompletePricing: totalIngredients > 0 && totalPriced === totalIngredients,
  }
}

// ============================================
// 2. EVENT COST ROLLUP
// ============================================

/**
 * Compute the full cost rollup for an event.
 * Includes all menus, plate cost calculation, margin analysis.
 */
export async function getEventCostRollup(eventId: string): Promise<EventCostRollup | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, quoted_price_cents, mileage_miles, labor_hours')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const menuRollups: MenuCostRollup[] = []
  let totalIngredientCost = 0

  if (menus && menus.length > 0) {
    for (const menu of menus) {
      const rollup = await getMenuCostRollup(menu.id)
      if (rollup) {
        menuRollups.push(rollup)
        totalIngredientCost += rollup.totalIngredientCostCents
      }
    }
  }

  // Chef pricing config
  const { data: config } = await db
    .from('pricing_config')
    .select('hourly_rate_cents, overhead_pct')
    .eq('chef_id', tenantId)
    .single()

  const hourlyRateCents = config?.hourly_rate_cents ?? DEFAULT_HOURLY_RATE_CENTS
  const overheadPct = config?.overhead_pct ?? DEFAULT_OVERHEAD_PERCENT
  const guestCount = event.guest_count ?? 0
  const laborHours = event.labor_hours ?? 0
  const travelMiles = event.mileage_miles ?? 0

  let plateCost: TruePlateCost | null = null
  if (guestCount > 0 && totalIngredientCost > 0) {
    plateCost = calculateTruePlateCost({
      ingredientCostCents: totalIngredientCost,
      guestCount,
      laborHours,
      hourlyRateCents,
      travelMiles,
      mileageRateCents: IRS_MILEAGE_RATE_CENTS_2026,
      overheadPercent: overheadPct,
      quotedPriceCents: event.quoted_price_cents ?? undefined,
    })
  }

  const perGuestCostCents =
    guestCount > 0 && totalIngredientCost > 0 ? Math.round(totalIngredientCost / guestCount) : null

  const totalIngredientsAll = menuRollups.reduce((sum, m) => sum + m.totalIngredientCount, 0)
  const totalPricedAll = menuRollups.reduce((sum, m) => sum + m.totalPricedCount, 0)
  const coveragePct =
    totalIngredientsAll > 0 ? Math.round((totalPricedAll / totalIngredientsAll) * 100) : null

  return {
    eventId: event.id,
    eventName: event.occasion ?? 'Unnamed Event',
    eventDate: event.event_date,
    guestCount,
    menus: menuRollups,
    totalIngredientCostCents: totalIngredientCost,
    plateCost,
    perGuestCostCents,
    quotedPriceCents: event.quoted_price_cents ?? null,
    marginPercent: plateCost?.marginPercent ?? null,
    coveragePct,
  }
}

// ============================================
// 3. REFRESH EVENT COSTS
// ============================================

/**
 * Recompute recipe totals for all recipes in an event's menus,
 * then clear cost_needs_refresh flag.
 */
export async function refreshEventCosts(eventId: string): Promise<{
  success: boolean
  recipesUpdated: number
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  try {
    const { refreshRecipeTotalCost } = await import('@/lib/recipes/actions')

    const { data: menus } = await db
      .from('menus')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)

    if (!menus || menus.length === 0) {
      return { success: true, recipesUpdated: 0 }
    }

    const menuIds = menus.map((m: any) => m.id)

    const { data: dishes } = await db.from('dishes').select('id').in('menu_id', menuIds)

    if (!dishes || dishes.length === 0) {
      return { success: true, recipesUpdated: 0 }
    }

    const dishIds = dishes.map((d: any) => d.id)

    const { data: components } = await db
      .from('components')
      .select('recipe_id')
      .in('dish_id', dishIds)

    const recipeIds: string[] = [
      ...new Set<string>((components || []).map((c: any) => c.recipe_id as string).filter(Boolean)),
    ]

    let updated = 0
    for (const recipeId of recipeIds) {
      try {
        await refreshRecipeTotalCost(db, tenantId, recipeId)
        updated++
      } catch (err) {
        console.error(`[refreshEventCosts] Failed for recipe ${recipeId}:`, err)
      }
    }

    await db
      .from('events')
      .update({
        cost_needs_refresh: false,
        cost_refreshed_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('tenant_id', tenantId)

    revalidatePath(`/events/${eventId}`)
    revalidatePath('/culinary/costing')
    return { success: true, recipesUpdated: updated }
  } catch (err: any) {
    console.error('[refreshEventCosts]', err)
    return { success: false, recipesUpdated: 0, error: 'Failed to refresh costs.' }
  }
}

'use server'

// Margin Feedback Engine
// Detects menus needing repricing and ingredient spikes across the entire tenant.
// Feeds the chef's dashboard with actionable pricing signals.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { resolvePricesBatch, type ResolvedPrice } from './resolve-price'

// ── Types ─────────────���──────────────────────────────────────────────────

export type MenuRepricingFlag = {
  menuId: string
  menuName: string
  eventId: string | null
  eventName: string | null
  eventDate: string | null
  projectedFoodCostCents: number
  quotedPriceCents: number
  targetFoodCostPercent: number
  actualFoodCostPercent: number
  overTargetByPct: number
  severity: 'warning' | 'critical'
}

export type IngredientSpikeAlert = {
  ingredientId: string
  ingredientName: string
  currentPriceCents: number
  averagePriceCents: number
  spikePercent: number
  unit: string | null
  affectedMenuCount: number
  affectedMenuNames: string[]
}

export type MarginFeedbackResult = {
  menusNeedingRepricing: MenuRepricingFlag[]
  ingredientSpikes: IngredientSpikeAlert[]
  summary: {
    totalMenusChecked: number
    menusOverTarget: number
    ingredientsWithSpikes: number
    worstFoodCostPercent: number | null
    averageFoodCostPercent: number | null
  }
}

// ── Constants ────────────────────────────────────────────────────────────

const SPIKE_THRESHOLD_PCT = 30

// ── Main ─────────────────���───────────────────────────────────────────────

/**
 * Scan ALL active menus for repricing signals.
 * Returns menus where food cost % exceeds target and ingredients with price spikes.
 */
export async function getMarginFeedback(): Promise<MarginFeedbackResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get all menus with cost data from the menu_cost_summary view
  const { data: menuRows } = await db
    .from('menu_cost_summary')
    .select(
      `menu_id, menu_name, event_id, event_name, event_date,
       total_recipe_cost_cents, cost_per_guest_cents,
       food_cost_percentage, quoted_price_cents,
       total_component_count, has_all_recipe_costs`
    )
    .eq('tenant_id', tenantId)
    .not('total_recipe_cost_cents', 'is', null)
    .gt('total_recipe_cost_cents', 0)
    .order('event_date', { ascending: false, nullsFirst: false })
    .limit(100)

  if (!menuRows || menuRows.length === 0) {
    return {
      menusNeedingRepricing: [],
      ingredientSpikes: [],
      summary: {
        totalMenusChecked: 0,
        menusOverTarget: 0,
        ingredientsWithSpikes: 0,
        worstFoodCostPercent: null,
        averageFoodCostPercent: null,
      },
    }
  }

  // 2. Get chef's target food cost %
  const { data: config } = await db
    .from('chef_pricing_config')
    .select('target_food_cost_percent')
    .eq('chef_id', tenantId)
    .single()

  const targetFoodCostPercent = config?.target_food_cost_percent ?? 30

  // 3. Detect menus needing repricing
  const menusNeedingRepricing: MenuRepricingFlag[] = []
  const foodCostValues: number[] = []

  for (const row of menuRows as any[]) {
    const foodCostPct = Number(row.food_cost_percentage)
    const quotedCents = Number(row.quoted_price_cents || 0)
    const projectedCents = Number(row.total_recipe_cost_cents || 0)

    if (!Number.isFinite(foodCostPct) || foodCostPct <= 0) continue
    foodCostValues.push(foodCostPct)

    if (foodCostPct > targetFoodCostPercent && quotedCents > 0) {
      const overBy = Math.round((foodCostPct - targetFoodCostPercent) * 10) / 10
      menusNeedingRepricing.push({
        menuId: row.menu_id,
        menuName: row.menu_name || 'Untitled menu',
        eventId: row.event_id ?? null,
        eventName: row.event_name ?? null,
        eventDate: row.event_date ?? null,
        projectedFoodCostCents: projectedCents,
        quotedPriceCents: quotedCents,
        targetFoodCostPercent,
        actualFoodCostPercent: foodCostPct,
        overTargetByPct: overBy,
        severity: overBy >= 10 ? 'critical' : 'warning',
      })
    }
  }

  // Sort: critical first, then by how far over target
  menusNeedingRepricing.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
    return b.overTargetByPct - a.overTargetByPct
  })

  // 4. Detect ingredient spikes across all active menu ingredients
  // Get all ingredient IDs used in any active menu
  const menuIds = (menuRows as any[]).map((r: any) => r.menu_id)

  const { data: menuIngredients } = await db
    .from('recipe_ingredients')
    .select(
      `ingredient_id, ingredients!inner(id, name, cost_per_unit_cents, average_price_cents, last_price_cents, price_unit),
       recipes!inner(id, dishes!inner(menu_id))`
    )
    .in('recipes.dishes.menu_id', menuIds.slice(0, 50))
    .eq('tenant_id', tenantId)
    .limit(500)

  // Build ingredient -> menu mapping and detect spikes
  const ingredientMenuMap = new Map<string, Set<string>>()
  const ingredientData = new Map<string, any>()

  for (const row of (menuIngredients ?? []) as any[]) {
    if (!row.ingredient_id || !row.ingredients) continue
    const ing = row.ingredients
    const ingId = ing.id

    if (!ingredientMenuMap.has(ingId)) {
      ingredientMenuMap.set(ingId, new Set())
      ingredientData.set(ingId, ing)
    }

    // Extract menu_id from the nested join
    const dishes = row.recipes?.dishes
    if (Array.isArray(dishes)) {
      for (const d of dishes) {
        if (d.menu_id) ingredientMenuMap.get(ingId)!.add(d.menu_id)
      }
    } else if (dishes?.menu_id) {
      ingredientMenuMap.get(ingId)!.add(dishes.menu_id)
    }
  }

  // Detect spikes: current price vs average price
  const ingredientSpikes: IngredientSpikeAlert[] = []

  for (const [ingId, ing] of ingredientData) {
    const currentCents = Number(ing.last_price_cents || ing.cost_per_unit_cents || 0)
    const avgCents = Number(ing.average_price_cents || 0)

    if (currentCents <= 0 || avgCents <= 0) continue

    const spikePercent = Math.round(((currentCents - avgCents) / avgCents) * 1000) / 10
    if (spikePercent < SPIKE_THRESHOLD_PCT) continue

    const menuIdSet = ingredientMenuMap.get(ingId) ?? new Set()
    const affectedMenuNames = (menuRows as any[])
      .filter((r: any) => menuIdSet.has(r.menu_id))
      .map((r: any) => r.menu_name || 'Untitled')

    ingredientSpikes.push({
      ingredientId: ingId,
      ingredientName: ing.name || 'Unknown',
      currentPriceCents: currentCents,
      averagePriceCents: avgCents,
      spikePercent,
      unit: ing.price_unit ?? null,
      affectedMenuCount: menuIdSet.size,
      affectedMenuNames,
    })
  }

  // Sort by spike severity (highest first)
  ingredientSpikes.sort((a, b) => b.spikePercent - a.spikePercent)

  // 5. Build summary
  const avgFoodCost =
    foodCostValues.length > 0
      ? Math.round((foodCostValues.reduce((s, v) => s + v, 0) / foodCostValues.length) * 10) / 10
      : null

  const worstFoodCost = foodCostValues.length > 0 ? Math.max(...foodCostValues) : null

  return {
    menusNeedingRepricing: menusNeedingRepricing.slice(0, 20),
    ingredientSpikes: ingredientSpikes.slice(0, 20),
    summary: {
      totalMenusChecked: menuRows.length,
      menusOverTarget: menusNeedingRepricing.length,
      ingredientsWithSpikes: ingredientSpikes.length,
      worstFoodCostPercent: worstFoodCost,
      averageFoodCostPercent: avgFoodCost,
    },
  }
}

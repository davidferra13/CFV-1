// Menu Intelligence: Cost analysis, margin checking, price alerts, vendor hints, budget compliance
// All deterministic (Formula > AI). No LLM calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidateMenuIntelligenceCache } from './cache-utils'
import {
  MARGIN_WARNING_THRESHOLD,
  MARGIN_CRITICAL_THRESHOLD,
  PRICE_SPIKE_THRESHOLD,
  BUDGET_WARNING_THRESHOLD,
  BUDGET_CRITICAL_THRESHOLD,
  type MarginAlert,
  type MenuCostBreakdown,
  type CourseBreakdown,
  type ComponentBreakdown,
  type IngredientBreakdown,
  type PriceAlert,
  type BudgetComplianceResult,
  type MenuVendorHint,
} from './shared'

// ============================================
// 1. MARGIN CHECKING
// ============================================

export async function checkMenuMargins(menuId: string): Promise<{
  alerts: MarginAlert[]
  costBreakdown: {
    totalCostCents: number | null
    costPerGuestCents: number | null
    foodCostPercent: number | null
    hasAllPrices: boolean
    componentCount: number
    oldestPriceDaysAgo: number | null
  }
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_cost_summary')
    .select(
      'total_recipe_cost_cents, cost_per_guest_cents, food_cost_percentage, has_all_recipe_costs, total_component_count'
    )
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[checkMenuMargins] Error:', error)
    throw new UnknownAppError('Failed to check menu margins')
  }

  // Check price staleness: oldest price date across all ingredients in this menu
  let oldestPriceDaysAgo: number | null = null
  try {
    const { pgClient: pg } = await import('@/lib/db/index')
    const [staleRow] = await pg`
      SELECT MIN(i.last_price_date) AS oldest_price_date
      FROM dishes d
      JOIN components c ON c.dish_id = d.id
      JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE d.menu_id = ${menuId}
        AND i.last_price_date IS NOT NULL
    `
    if (staleRow?.oldest_price_date) {
      const oldest = new Date(staleRow.oldest_price_date)
      oldestPriceDaysAgo = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24))
    }
  } catch {
    // Non-critical; staleness is advisory
  }

  const alerts: MarginAlert[] = []
  const foodCostPct = data?.food_cost_percentage ?? null

  if (foodCostPct !== null) {
    if (foodCostPct > MARGIN_CRITICAL_THRESHOLD) {
      alerts.push({
        level: 'critical',
        message: `Food cost is ${foodCostPct.toFixed(1)}% - you may be losing money on this menu`,
        foodCostPercent: foodCostPct,
        targetPercent: 30,
      })
    } else if (foodCostPct > MARGIN_WARNING_THRESHOLD) {
      alerts.push({
        level: 'warning',
        message: `Food cost is ${foodCostPct.toFixed(1)}% (target: 25-30%)`,
        foodCostPercent: foodCostPct,
        targetPercent: 30,
      })
    }
  }

  if (data && !data.has_all_recipe_costs) {
    alerts.push({
      level: 'warning',
      message: 'Some ingredients are missing prices. Cost calculation is incomplete.',
      foodCostPercent: foodCostPct ?? 0,
      targetPercent: 30,
    })
  }

  // Stale price warning (>90 days)
  if (oldestPriceDaysAgo !== null && oldestPriceDaysAgo > 90) {
    alerts.push({
      level: 'warning',
      message: `Some ingredient prices are ${oldestPriceDaysAgo} days old. Costs may have shifted.`,
      foodCostPercent: foodCostPct ?? 0,
      targetPercent: 30,
    })
  }

  return {
    alerts,
    costBreakdown: {
      totalCostCents: data?.total_recipe_cost_cents ?? null,
      costPerGuestCents: data?.cost_per_guest_cents ?? null,
      foodCostPercent: foodCostPct,
      hasAllPrices: data?.has_all_recipe_costs ?? false,
      componentCount: data?.total_component_count ?? 0,
      oldestPriceDaysAgo,
    },
  }
}

// ============================================
// 2. FULL MENU BREAKDOWN
// ============================================

export async function getMenuBreakdown(menuId: string): Promise<MenuCostBreakdown | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch menu with event context
  const { data: menu } = await db
    .from('menus')
    .select('id, name, target_guest_count, event_id, status')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) return null

  // Fetch event for guest count and quoted price
  let guestCount = menu.target_guest_count || 0
  let quotedPriceCents: number | null = null

  if (menu.event_id) {
    const { data: event } = await db
      .from('events')
      .select('guest_count, quoted_price_cents')
      .eq('id', menu.event_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (event) {
      guestCount = event.guest_count || guestCount
      quotedPriceCents = event.quoted_price_cents
    }
  }

  // Fetch dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_number, course_name, name, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes?.length) {
    return {
      menuId: menu.id,
      menuName: menu.name,
      totalCostCents: 0,
      costPerGuestCents: 0,
      foodCostPercent: null,
      guestCount,
      quotedPriceCents,
      hasAllPrices: true,
      missingPriceCount: 0,
      alerts: [],
      courses: [],
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  // Fetch components with recipe info
  const { data: components } = await db
    .from('components')
    .select('id, dish_id, name, category, scale_factor, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  // Fetch recipe details for components that have recipes
  const recipeIds = (components || [])
    .map((c: any) => c.recipe_id)
    .filter((id: string | null) => id !== null)

  let recipeMap = new Map<string, { name: string; yield_quantity: number | null }>()
  let ingredientsByRecipe = new Map<string, any[]>()

  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name, yield_quantity')
      .in('id', recipeIds)

    if (recipes) {
      for (const r of recipes) {
        recipeMap.set(r.id, { name: r.name, yield_quantity: r.yield_quantity })
      }
    }

    // Fetch recipe_ingredients with ingredient details
    const { data: recipeIngredients } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, quantity, unit')
      .in('recipe_id', recipeIds)
      .order('sort_order', { ascending: true })

    if (recipeIngredients?.length) {
      const ingredientIds = [
        ...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id)),
      ] as string[]

      const { data: ingredients } = await db
        .from('ingredients')
        .select('id, name, price_unit, category')
        .in('id', ingredientIds)

      const ingredientMap = new Map<string, any>()
      if (ingredients) {
        for (const ing of ingredients) {
          ingredientMap.set(ing.id, ing)
        }
      }

      // Resolve prices via unified 8-tier chain (batch: 3 queries total, not N+1)
      const { resolvePricesBatch } = await import('@/lib/pricing/resolve-price')
      const resolvedPrices = await resolvePricesBatch(ingredientIds, user.tenantId!)

      // Group ingredients by recipe
      for (const ri of recipeIngredients) {
        const existing = ingredientsByRecipe.get(ri.recipe_id) || []
        const ingData = ingredientMap.get(ri.ingredient_id)
        const resolved = resolvedPrices.get(ri.ingredient_id)
        existing.push({
          ingredientId: ri.ingredient_id,
          name: ingData?.name || 'Unknown',
          quantity: ri.quantity || 0,
          unit: ri.unit || '',
          priceCents: resolved?.cents ?? null,
          category: ingData?.category || 'other',
        })
        ingredientsByRecipe.set(ri.recipe_id, existing)
      }
    }
  }

  // Build breakdown tree
  let totalCostCents = 0
  let missingPriceCount = 0

  const courses: CourseBreakdown[] = dishes.map((dish: any) => {
    const dishComponents = (components || []).filter((c: any) => c.dish_id === dish.id)
    let dishCost = 0

    const componentBreakdowns: ComponentBreakdown[] = dishComponents.map((comp: any) => {
      const recipe = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null
      const recipeIngs = comp.recipe_id ? ingredientsByRecipe.get(comp.recipe_id) || [] : []
      const scaleFactor = comp.scale_factor || 1

      let recipeCostCents = 0
      let allPriced = true

      const ingredients: IngredientBreakdown[] = recipeIngs.map((ing: any) => {
        const scaledQuantity = ing.quantity * scaleFactor
        const hasMissingPrice = ing.priceCents === null
        if (hasMissingPrice) {
          allPriced = false
          missingPriceCount++
        }
        const scaledCostCents = hasMissingPrice ? null : Math.round(ing.priceCents * scaleFactor)
        if (scaledCostCents !== null) {
          recipeCostCents += scaledCostCents
        }

        return {
          ingredientId: ing.ingredientId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          priceCents: ing.priceCents,
          scaledQuantity,
          scaledCostCents,
          hasMissingPrice,
        }
      })

      dishCost += recipeCostCents

      return {
        componentId: comp.id,
        componentName: comp.name,
        category: comp.category || 'other',
        scaleFactor,
        recipeId: comp.recipe_id,
        recipeName: recipe?.name || null,
        recipeCostCents: allPriced ? recipeCostCents : null,
        scaledCostCents: allPriced ? recipeCostCents : null,
        ingredients,
      }
    })

    totalCostCents += dishCost

    return {
      courseNumber: dish.course_number,
      courseName: dish.course_name,
      dishId: dish.id,
      dishName: dish.name,
      totalCostCents: dishCost,
      components: componentBreakdowns,
    }
  })

  const costPerGuestCents = guestCount > 0 ? Math.round(totalCostCents / guestCount) : 0
  const foodCostPercent =
    quotedPriceCents && quotedPriceCents > 0 ? (totalCostCents / quotedPriceCents) * 100 : null

  // Generate alerts
  const alerts: MarginAlert[] = []
  if (foodCostPercent !== null) {
    if (foodCostPercent > MARGIN_CRITICAL_THRESHOLD) {
      alerts.push({
        level: 'critical',
        message: `Food cost is ${foodCostPercent.toFixed(1)}% - you may be losing money`,
        foodCostPercent,
        targetPercent: 30,
      })
    } else if (foodCostPercent > MARGIN_WARNING_THRESHOLD) {
      alerts.push({
        level: 'warning',
        message: `Food cost is ${foodCostPercent.toFixed(1)}% (target: 25-30%)`,
        foodCostPercent,
        targetPercent: 30,
      })
    }
  }

  if (missingPriceCount > 0) {
    alerts.push({
      level: 'warning',
      message: `${missingPriceCount} ingredient${missingPriceCount > 1 ? 's' : ''} missing prices`,
      foodCostPercent: foodCostPercent ?? 0,
      targetPercent: 30,
    })
  }

  return {
    menuId: menu.id,
    menuName: menu.name,
    totalCostCents,
    costPerGuestCents,
    foodCostPercent,
    guestCount,
    quotedPriceCents,
    hasAllPrices: missingPriceCount === 0,
    missingPriceCount,
    alerts,
    courses,
  }
}

// ============================================
// 4. INGREDIENT PRICE ALERTS
// ============================================

export async function getIngredientPriceAlerts(): Promise<PriceAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get ingredients where last_price is significantly above average
  const { data: ingredients, error } = await db
    .from('ingredients')
    .select('id, name, last_price_cents, average_price_cents')
    .eq('tenant_id', user.tenantId!)
    .not('last_price_cents', 'is', null)
    .not('average_price_cents', 'is', null)

  if (error) {
    console.error('[getIngredientPriceAlerts] Error:', error)
    throw new UnknownAppError('Failed to fetch price alerts')
  }

  // Identify all spiked ingredients first
  const spikedIngredients: Array<{
    id: string
    name: string
    last_price_cents: number
    average_price_cents: number
    spikePercent: number
  }> = []

  for (const ing of ingredients || []) {
    if (!ing.last_price_cents || !ing.average_price_cents || ing.average_price_cents === 0) continue
    const ratio = ing.last_price_cents / ing.average_price_cents
    if (ratio >= PRICE_SPIKE_THRESHOLD) {
      spikedIngredients.push({
        ...ing,
        spikePercent: Math.round((ratio - 1) * 100),
      })
    }
  }

  if (!spikedIngredients.length) return []

  const spikedIds = spikedIngredients.map((i) => i.id)

  // Bulk query 1: recipe_ingredients for all spiked ingredients
  const { data: allUsage } = await db
    .from('recipe_ingredients')
    .select('ingredient_id, recipe_id')
    .in('ingredient_id', spikedIds)

  // Build ingredient -> recipe IDs map
  const ingToRecipes = new Map<string, Set<string>>()
  const allRecipeIds = new Set<string>()
  for (const u of allUsage || []) {
    if (!ingToRecipes.has(u.ingredient_id)) ingToRecipes.set(u.ingredient_id, new Set())
    ingToRecipes.get(u.ingredient_id)!.add(u.recipe_id)
    allRecipeIds.add(u.recipe_id)
  }

  // Bulk query 2: components for all recipes
  let recipeToDishIds = new Map<string, Set<string>>()
  const allDishIds = new Set<string>()
  if (allRecipeIds.size > 0) {
    const { data: comps } = await db
      .from('components')
      .select('recipe_id, dish_id')
      .in('recipe_id', [...allRecipeIds])
      .eq('tenant_id', user.tenantId!)

    for (const c of comps || []) {
      if (!recipeToDishIds.has(c.recipe_id)) recipeToDishIds.set(c.recipe_id, new Set())
      recipeToDishIds.get(c.recipe_id)!.add(c.dish_id)
      allDishIds.add(c.dish_id)
    }
  }

  // Bulk query 3: dishes -> menu IDs
  let dishToMenuIds = new Map<string, string>()
  const allMenuIds = new Set<string>()
  if (allDishIds.size > 0) {
    const { data: dishMenus } = await db
      .from('dishes')
      .select('id, menu_id')
      .in('id', [...allDishIds])
      .eq('tenant_id', user.tenantId!)

    for (const d of dishMenus || []) {
      dishToMenuIds.set(d.id, d.menu_id)
      allMenuIds.add(d.menu_id)
    }
  }

  // Bulk query 4: menu names
  const menuNameMap = new Map<string, string>()
  if (allMenuIds.size > 0) {
    const { data: menus } = await db
      .from('menus')
      .select('id, name')
      .in('id', [...allMenuIds])
      .eq('tenant_id', user.tenantId!)
      .in('status', ['draft', 'shared'])

    for (const m of menus || []) {
      menuNameMap.set(m.id, m.name)
    }
  }

  // Assemble alerts using the maps
  const alerts: PriceAlert[] = spikedIngredients.map((ing) => {
    const recipeIdsForIng = ingToRecipes.get(ing.id) || new Set<string>()
    const menuNamesForIng = new Set<string>()

    for (const recipeId of recipeIdsForIng) {
      const dishIdsForRecipe = recipeToDishIds.get(recipeId) || new Set<string>()
      for (const dishId of dishIdsForRecipe) {
        const menuId = dishToMenuIds.get(dishId)
        if (menuId) {
          const menuName = menuNameMap.get(menuId)
          if (menuName) menuNamesForIng.add(menuName)
        }
      }
    }

    return {
      ingredientId: ing.id,
      ingredientName: ing.name,
      currentPriceCents: ing.last_price_cents,
      averagePriceCents: ing.average_price_cents,
      spikePercent: ing.spikePercent,
      affectedMenus: [...menuNamesForIng],
    }
  })

  // Sort by spike severity
  alerts.sort((a, b) => b.spikePercent - a.spikePercent)

  return alerts
}

// ============================================
// VENDOR BEST PRICES FOR MENU INGREDIENTS
// ============================================

/**
 * Find ingredients in this menu where a different vendor offers a lower price.
 * Only returns hints where savings > 5%.
 */
export async function getMenuVendorHints(menuId: string): Promise<MenuVendorHint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all ingredients in this menu
  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) return []

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  const recipeIds = (components || [])
    .map((c: any) => c.recipe_id)
    .filter((id: string | null) => id !== null)

  if (!recipeIds.length) return []

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('ingredient_id')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients?.length) return []

  const ingredientIds = [
    ...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id)),
  ] as string[]

  // Get ingredient names
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds)

  if (!ingredients?.length) return []

  // Resolve prices via unified 8-tier chain
  const { resolvePricesBatch } = await import('@/lib/pricing/resolve-price')
  const resolvedPrices = await resolvePricesBatch(ingredientIds, user.tenantId!)

  // Get vendor price points for these ingredients
  const { data: vendorPrices } = await db
    .from('vendor_price_points')
    .select('ingredient_id, vendor_id, price_cents, vendors(name)')
    .eq('tenant_id', user.tenantId!)
    .in('ingredient_id', ingredientIds)
    .eq('is_active', true)
    .order('price_cents', { ascending: true })

  if (!vendorPrices?.length) return []

  const hints: MenuVendorHint[] = []
  const ingredientMap = new Map<string, { name: string; price: number | null }>(
    ingredients.map((i: any) => [
      i.id,
      { name: i.name, price: resolvedPrices.get(i.id)?.cents ?? null },
    ])
  )

  // Group vendor prices by ingredient
  const pricesByIngredient = new Map<string, any[]>()
  for (const vp of vendorPrices) {
    const existing = pricesByIngredient.get(vp.ingredient_id) || []
    existing.push(vp)
    pricesByIngredient.set(vp.ingredient_id, existing)
  }

  for (const [ingId, prices] of pricesByIngredient.entries()) {
    const ing = ingredientMap.get(ingId)
    if (!ing || !ing.price || prices.length < 1) continue

    const best = prices[0] // already sorted ascending
    if (best.price_cents >= ing.price) continue

    const savingsCents = ing.price - best.price_cents
    const savingsPercent = (savingsCents / ing.price) * 100

    if (savingsPercent < 5) continue // only show meaningful savings

    const vendorName = (best.vendors as any)?.name || 'Unknown vendor'

    hints.push({
      ingredientName: ing.name,
      ingredientId: ingId,
      currentPriceCents: ing.price,
      bestVendorName: vendorName,
      bestPriceCents: best.price_cents,
      savingsCents,
      savingsPercent: Math.round(savingsPercent),
    })
  }

  return hints.sort((a, b) => b.savingsCents - a.savingsCents).slice(0, 10)
}

// ============================================
// BUDGET COMPLIANCE CHECK
// ============================================

/**
 * Compare food cost against the quoted event price.
 * Returns null if no event is linked or no quoted price exists.
 */
export async function checkMenuBudgetCompliance(
  menuId: string
): Promise<BudgetComplianceResult | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get menu -> event -> quoted price
  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu?.event_id) return null

  const { data: event } = await db
    .from('events')
    .select('quoted_price_cents')
    .eq('id', menu.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event?.quoted_price_cents) return { noQuoteSet: true }

  // Get menu cost from the summary view
  const { data: costData } = await db
    .from('menu_cost_summary')
    .select('total_recipe_cost_cents')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  const totalCostCents = costData?.total_recipe_cost_cents
  if (totalCostCents === null || totalCostCents === undefined) return null

  const marginPercent = (totalCostCents / event.quoted_price_cents) * 100

  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (marginPercent >= BUDGET_CRITICAL_THRESHOLD) {
    status = 'critical'
  } else if (marginPercent >= BUDGET_WARNING_THRESHOLD) {
    status = 'warning'
  }

  return {
    quotedPriceCents: event.quoted_price_cents,
    totalCostCents,
    marginPercent,
    status,
  }
}

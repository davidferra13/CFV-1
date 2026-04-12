// Menu Intelligence Server Actions
// Phase 1: Core Automation - margin alerts, breakdown, scaling, price alerts, event init
// Phase 2: Assembly - deep copy dishes from sources, add recipes as components
// All deterministic (Formula > AI). No LLM calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'

import {
  MENU_CONTEXT_CACHE_TAG,
  MENU_PERF_CACHE_TAG,
  MENU_SEASONAL_CACHE_TAG,
  MENU_TASTE_CACHE_TAG,
} from '@/lib/menus/menu-intelligence-cache'

/** Bust all menu intelligence caches for a given menu */
export async function revalidateMenuIntelligenceCache(menuId: string) {
  revalidateTag(`${MENU_CONTEXT_CACHE_TAG}-${menuId}`)
  revalidateTag(`${MENU_PERF_CACHE_TAG}-${menuId}`)
  revalidateTag(`${MENU_SEASONAL_CACHE_TAG}-${menuId}`)
  revalidateTag(`${MENU_TASTE_CACHE_TAG}-${menuId}`)
}
import { getDuplicateCourseError } from '@/lib/menus/course-utils'

// ============================================
// TYPES
// ============================================

export type MarginAlertLevel = 'ok' | 'warning' | 'critical'

export interface MarginAlert {
  level: MarginAlertLevel
  message: string
  foodCostPercent: number
  targetPercent: number
}

export interface MenuCostBreakdown {
  menuId: string
  menuName: string
  totalCostCents: number
  costPerGuestCents: number
  foodCostPercent: number | null
  guestCount: number
  quotedPriceCents: number | null
  hasAllPrices: boolean
  missingPriceCount: number
  alerts: MarginAlert[]
  courses: CourseBreakdown[]
}

export interface CourseBreakdown {
  courseNumber: number
  courseName: string
  dishId: string
  dishName: string | null
  totalCostCents: number
  components: ComponentBreakdown[]
}

export interface ComponentBreakdown {
  componentId: string
  componentName: string
  category: string
  scaleFactor: number
  recipeId: string | null
  recipeName: string | null
  recipeCostCents: number | null
  scaledCostCents: number | null
  ingredients: IngredientBreakdown[]
}

export interface IngredientBreakdown {
  ingredientId: string
  name: string
  quantity: number
  unit: string
  priceCents: number | null
  scaledQuantity: number
  scaledCostCents: number | null
  hasMissingPrice: boolean
}

export interface PriceAlert {
  ingredientId: string
  ingredientName: string
  currentPriceCents: number
  averagePriceCents: number
  spikePercent: number
  affectedMenus: string[]
}

export interface ScalingSummary {
  menuId: string
  previousGuestCount: number
  newGuestCount: number
  componentsScaled: number
  previousCostPerGuest: number | null
  newCostPerGuest: number | null
  adjustments: ScalingAdjustment[]
}

export interface ScalingAdjustment {
  componentName: string
  previousScale: number
  newScale: number
  note: string | null
}

export interface BudgetComplianceResult {
  quotedPriceCents: number
  totalCostCents: number
  marginPercent: number
  status: 'ok' | 'warning' | 'critical'
}

export interface DietaryConflict {
  ingredientName: string
  dishName: string
  clientPreference: string
}

// Margin thresholds (deterministic, from design doc)
const MARGIN_WARNING_THRESHOLD = 35
const MARGIN_CRITICAL_THRESHOLD = 45
const PRICE_SPIKE_THRESHOLD = 1.3 // 30% above average
const BUDGET_WARNING_THRESHOLD = 40 // food cost > 40% of quoted price
const BUDGET_CRITICAL_THRESHOLD = 50 // food cost > 50% of quoted price

// Culinary scaling adjustments
const SALT_SPICE_SCALE_FACTOR = 0.7
const LEAVENING_SCALE_FACTOR = 0.75
const BATCH_SPLIT_THRESHOLD = 3.0
const SMALL_BATCH_THRESHOLD = 0.5

// Ingredient categories that get non-linear scaling
const SALT_SPICE_CATEGORIES = ['spice', 'dry_herb', 'fresh_herb']
const LEAVENING_NAMES = ['baking powder', 'baking soda', 'yeast', 'cream of tartar']

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

  return {
    alerts,
    costBreakdown: {
      totalCostCents: data?.total_recipe_cost_cents ?? null,
      costPerGuestCents: data?.cost_per_guest_cents ?? null,
      foodCostPercent: foodCostPct,
      hasAllPrices: data?.has_all_recipe_costs ?? false,
      componentCount: data?.total_component_count ?? 0,
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
// 3. GUEST COUNT AUTO-SCALING
// ============================================

export async function scaleMenuToGuestCount(
  menuId: string,
  newGuestCount: number
): Promise<ScalingSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (newGuestCount < 1 || newGuestCount > 500) {
    throw new UnknownAppError('Guest count must be between 1 and 500')
  }

  // Get menu + current guest count
  const { data: menu } = await db
    .from('menus')
    .select('id, target_guest_count, status, event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')
  if (menu.status === 'locked') throw new UnknownAppError('Cannot scale a locked menu')

  const previousGuestCount = menu.target_guest_count || newGuestCount

  // Fetch all dishes and components
  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) {
    // Update menu guest count even if no dishes
    await db
      .from('menus')
      .update({ target_guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menuId)

    revalidatePath(`/culinary/menus/${menuId}`)
    revalidateMenuIntelligenceCache(menuId)
    return {
      menuId,
      previousGuestCount,
      newGuestCount,
      componentsScaled: 0,
      previousCostPerGuest: null,
      newCostPerGuest: null,
      adjustments: [],
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('id, name, scale_factor, recipe_id, dish_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  if (!components?.length) {
    await db
      .from('menus')
      .update({ target_guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menuId)

    revalidatePath(`/culinary/menus/${menuId}`)
    revalidateMenuIntelligenceCache(menuId)
    return {
      menuId,
      previousGuestCount,
      newGuestCount,
      componentsScaled: 0,
      previousCostPerGuest: null,
      newCostPerGuest: null,
      adjustments: [],
    }
  }

  // Fetch recipe yield info for components with recipes
  const recipeIds = components
    .map((c: any) => c.recipe_id)
    .filter((id: string | null) => id !== null)

  const recipeYieldMap = new Map<string, number>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, yield_quantity')
      .in('id', recipeIds)

    if (recipes) {
      for (const r of recipes) {
        if (r.yield_quantity) recipeYieldMap.set(r.id, r.yield_quantity)
      }
    }
  }

  // Calculate new scale factors
  const adjustments: ScalingAdjustment[] = []
  const scaleRatio = previousGuestCount > 0 ? newGuestCount / previousGuestCount : 1

  for (const comp of components) {
    const previousScale = comp.scale_factor || 1
    let newScale: number

    if (comp.recipe_id && recipeYieldMap.has(comp.recipe_id)) {
      // Recipe has yield: scale directly from yield
      const yieldQty = recipeYieldMap.get(comp.recipe_id)!
      newScale = newGuestCount / yieldQty
    } else {
      // No yield data: use ratio-based scaling
      newScale = previousScale * scaleRatio
    }

    // Round to 2 decimal places
    newScale = Math.round(newScale * 100) / 100

    let note: string | null = null
    if (newScale > BATCH_SPLIT_THRESHOLD) {
      note = 'Consider batch splitting at this scale'
    } else if (newScale < SMALL_BATCH_THRESHOLD) {
      note = 'Small batch: adjust seasoning carefully'
    }

    if (Math.abs(newScale - previousScale) > 0.01) {
      adjustments.push({
        componentName: comp.name,
        previousScale,
        newScale,
        note,
      })

      // Update component
      await db
        .from('components')
        .update({ scale_factor: newScale })
        .eq('id', comp.id)
        .eq('tenant_id', user.tenantId!)
    }
  }

  // Update menu guest count
  await db
    .from('menus')
    .update({ target_guest_count: newGuestCount, updated_by: user.id })
    .eq('id', menuId)

  // Also update event guest count if linked
  if (menu.event_id) {
    await db
      .from('events')
      .update({ guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menu.event_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/culinary/menus/${menuId}`)
  revalidateMenuIntelligenceCache(menuId)
  if (menu.event_id) {
    revalidatePath(`/events/${menu.event_id}`)
  }

  // Get updated cost per guest
  const { data: costData } = await db
    .from('menu_cost_summary')
    .select('cost_per_guest_cents')
    .eq('menu_id', menuId)
    .maybeSingle()

  return {
    menuId,
    previousGuestCount,
    newGuestCount,
    componentsScaled: adjustments.length,
    previousCostPerGuest: null,
    newCostPerGuest: costData?.cost_per_guest_cents ?? null,
    adjustments,
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
// 5. MENU INITIATION FOR EVENT
// ============================================

// Season lookup (deterministic)
function getSeason(date: Date): string {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

// Guest tier (deterministic)
function getGuestTier(count: number): string {
  if (count <= 8) return 'intimate'
  if (count <= 20) return 'small'
  if (count <= 50) return 'medium'
  if (count <= 100) return 'large'
  return 'banquet'
}

// Occasion to service style inference (deterministic)
const OCCASION_SERVICE_MAP: Record<string, string> = {
  'wedding reception': 'buffet',
  wedding: 'plated',
  'rehearsal dinner': 'plated',
  'birthday party': 'family_style',
  birthday: 'plated',
  'dinner party': 'plated',
  'holiday dinner': 'plated',
  'corporate event': 'buffet',
  'cocktail party': 'cocktail',
  brunch: 'family_style',
  'tasting menu': 'tasting_menu',
  'wine dinner': 'tasting_menu',
}

export async function initializeMenuForEvent(eventId: string): Promise<{
  success: boolean
  menuId: string
  contextTags: {
    season: string
    guestTier: string
    serviceStyle: string | null
    clientDietary: string[]
    clientAllergies: string[]
  }
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client info
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, service_style, client_id, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found')
  }

  // Don't create duplicate menu
  if (event.menu_id) {
    throw new UnknownAppError('Event already has a menu attached')
  }

  // Fetch client dietary info
  let clientDietary: string[] = []
  let clientAllergies: string[] = []
  let clientLastName = ''

  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name, dietary_restrictions, allergies')
      .eq('id', event.client_id)
      .single()

    if (client) {
      // Use last word of full_name as surname for menu naming
      const parts = (client.full_name || '').split(' ')
      clientLastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''
      clientDietary = client.dietary_restrictions || []
      clientAllergies = client.allergies || []
    }
  }

  // Derive context
  const eventDate = event.event_date ? new Date(event.event_date) : new Date()
  const season = getSeason(eventDate)
  const guestTier = getGuestTier(event.guest_count || 4)
  const occasion = (event.occasion || '').toLowerCase()

  // Infer service style if not set
  let serviceStyle = event.service_style || null
  if (!serviceStyle && occasion) {
    serviceStyle = OCCASION_SERVICE_MAP[occasion] || null
  }

  // Build menu name
  const occasionLabel = event.occasion || 'Event'
  const menuName = clientLastName
    ? `${occasionLabel} Menu - ${clientLastName}`
    : `${occasionLabel} Menu`

  // Create the draft menu
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: menuName,
      service_style: serviceStyle,
      target_guest_count: event.guest_count,
      event_id: eventId,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (menuErr || !menu) {
    console.error('[initializeMenuForEvent] Error:', menuErr)
    throw new UnknownAppError('Failed to create menu for event')
  }

  // Log state transition
  await db.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: menu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
  })

  // Link menu to event
  await db
    .from('events')
    .update({ menu_id: menu.id, updated_by: user.id })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/culinary/menus')
  revalidateMenuIntelligenceCache(menu.id)

  const contextTags = {
    season,
    guestTier,
    serviceStyle,
    clientDietary,
    clientAllergies,
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'menu_initialized_for_event',
      domain: 'menu',
      entityType: 'menu',
      entityId: menu.id,
      summary: `Auto-initialized menu "${menuName}" for event`,
      context: { eventId, ...contextTags },
    })
  } catch (err) {
    console.error('[initializeMenuForEvent] Activity log failed (non-blocking):', err)
  }

  return {
    success: true,
    menuId: menu.id,
    contextTags,
  }
}

// ============================================
// 6. CONTEXT DATA FOR MENU EDITOR
// ============================================

type MenuContextResult = {
  clientDietary: string[]
  clientAllergies: string[]
  clientName: string | null
  previousMenus: Array<{
    id: string
    name: string
    eventDate: string | null
    guestCount: number | null
  }>
  matchingTemplates: Array<{ id: string; name: string; serviceStyle: string | null }>
  season: string
  guestTier: string
}

const _getMenuContextDataCached = (menuId: string, tenantId: string) =>
  unstable_cache(
    async (): Promise<MenuContextResult> => {
      return _getMenuContextDataInner(menuId, tenantId)
    },
    [`menu-context-${menuId}-${tenantId}`],
    { revalidate: 60, tags: [`${MENU_CONTEXT_CACHE_TAG}-${menuId}`] }
  )()

async function _getMenuContextDataInner(
  menuId: string,
  tenantId: string
): Promise<MenuContextResult> {
  const db: any = createAdminClient()

  // Get menu with event context
  const { data: menu } = await db
    .from('menus')
    .select('id, event_id, target_guest_count, service_style')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')

  let clientDietary: string[] = []
  let clientAllergies: string[] = []
  let clientName: string | null = null
  let clientId: string | null = null
  let eventDate: Date = new Date()

  if (menu.event_id) {
    const { data: event } = await db
      .from('events')
      .select('client_id, event_date, guest_count')
      .eq('id', menu.event_id)
      .single()

    if (event) {
      clientId = event.client_id
      if (event.event_date) eventDate = new Date(event.event_date)

      if (event.client_id) {
        const { data: client } = await db
          .from('clients')
          .select('full_name, dietary_restrictions, allergies')
          .eq('id', event.client_id)
          .single()

        if (client) {
          clientName = client.full_name || null
          clientDietary = client.dietary_restrictions || []
          clientAllergies = client.allergies || []
        }
      }
    }
  }

  // Previous menus for same client
  let previousMenus: Array<{
    id: string
    name: string
    eventDate: string | null
    guestCount: number | null
  }> = []

  if (clientId) {
    const { data: clientEvents } = await db
      .from('events')
      .select('menu_id, event_date, guest_count')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .not('menu_id', 'is', null)
      .neq('menu_id', menuId)
      .order('event_date', { ascending: false })
      .limit(5)

    if (clientEvents?.length) {
      const prevMenuIds = clientEvents.map((e: any) => e.menu_id)
      const { data: prevMenus } = await db.from('menus').select('id, name').in('id', prevMenuIds)

      if (prevMenus) {
        previousMenus = prevMenus.map((m: any) => {
          const evt = clientEvents.find((e: any) => e.menu_id === m.id)
          return {
            id: m.id,
            name: m.name,
            eventDate: evt?.event_date || null,
            guestCount: evt?.guest_count || null,
          }
        })
      }
    }
  }

  // Matching templates (by service style)
  let matchingTemplates: Array<{
    id: string
    name: string
    serviceStyle: string | null
  }> = []

  const { data: templates } = await db
    .from('menus')
    .select('id, name, service_style')
    .eq('tenant_id', tenantId)
    .eq('is_template', true)
    .order('times_used', { ascending: false })
    .limit(10)

  if (templates) {
    // Prioritize matching service style
    const serviceStyle = menu.service_style
    matchingTemplates = templates
      .sort((a: any, b: any) => {
        if (serviceStyle) {
          const aMatch = a.service_style === serviceStyle ? 1 : 0
          const bMatch = b.service_style === serviceStyle ? 1 : 0
          return bMatch - aMatch
        }
        return 0
      })
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        serviceStyle: t.service_style,
      }))
  }

  return {
    clientDietary,
    clientAllergies,
    clientName,
    previousMenus,
    matchingTemplates,
    season: getSeason(eventDate),
    guestTier: getGuestTier(menu.target_guest_count || 4),
  }
}

export async function getMenuContextData(menuId: string): Promise<MenuContextResult> {
  const user = await requireChef()
  return _getMenuContextDataCached(menuId, user.tenantId!)
}

// ============================================
// CROSS-REFERENCING: INVENTORY STOCK CHECK
// ============================================

export interface MenuIngredientStock {
  ingredientId: string
  ingredientName: string
  neededQuantity: number
  neededUnit: string
  onHandQuantity: number
  onHandUnit: string | null
  status: 'ok' | 'low' | 'out'
}

/**
 * Check current pantry stock for all ingredients in a menu's recipes.
 * Returns stock status per ingredient so the chef sees shortages during menu building.
 */
export async function getMenuIngredientStock(menuId: string): Promise<MenuIngredientStock[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all recipe ingredients for this menu's components
  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) return []

  const dishIds = dishes.map((d: any) => d.id)
  const { data: components } = await db
    .from('components')
    .select('recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components?.length) return []

  // Collect recipe ingredients with scaled quantities
  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id))]
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients?.length) return []

  // Build needed quantities per ingredient (aggregate across all components)
  const needed = new Map<string, { quantity: number; unit: string }>()
  for (const ri of recipeIngredients as any[]) {
    const matchingComps = (components as any[]).filter((c: any) => c.recipe_id === ri.recipe_id)
    for (const comp of matchingComps) {
      const scale = comp.scale_factor || 1
      const key = ri.ingredient_id
      const existing = needed.get(key)
      const qty = (ri.quantity || 0) * scale
      if (existing) {
        existing.quantity += qty
      } else {
        needed.set(key, { quantity: qty, unit: ri.unit || '' })
      }
    }
  }

  if (needed.size === 0) return []

  // Get ingredient names
  const ingredientIds = [...needed.keys()]
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds)

  // Get pantry stock for these ingredients
  const { data: pantryItems } = await db
    .from('pantry_items')
    .select('ingredient_id, quantity, unit')
    .eq('tenant_id', user.tenantId!)
    .in('ingredient_id', ingredientIds)

  // Aggregate pantry stock per ingredient
  const stock = new Map<string, { quantity: number; unit: string | null }>()
  for (const pi of (pantryItems || []) as any[]) {
    const existing = stock.get(pi.ingredient_id)
    if (existing) {
      existing.quantity += Number(pi.quantity || 0)
    } else {
      stock.set(pi.ingredient_id, { quantity: Number(pi.quantity || 0), unit: pi.unit })
    }
  }

  const nameMap = new Map((ingredients || []).map((i: any) => [i.id, i.name]))

  const results: MenuIngredientStock[] = []
  for (const [ingredientId, need] of needed) {
    const onHand = stock.get(ingredientId)
    const onHandQty = onHand?.quantity ?? 0
    let status: 'ok' | 'low' | 'out' = 'ok'
    if (onHandQty <= 0) status = 'out'
    else if (onHandQty < need.quantity) status = 'low'

    results.push({
      ingredientId,
      ingredientName: (nameMap.get(ingredientId) as string) || 'Unknown',
      neededQuantity: Math.round(need.quantity * 100) / 100,
      neededUnit: need.unit,
      onHandQuantity: Math.round(onHandQty * 100) / 100,
      onHandUnit: onHand?.unit ?? null,
      status,
    })
  }

  // Sort: out first, then low, then ok
  const ORDER = { out: 0, low: 1, ok: 2 }
  results.sort((a, b) => ORDER[a.status] - ORDER[b.status])

  return results
}

// ============================================
// CROSS-REFERENCING: ALLERGEN VALIDATION
// ============================================

export interface MenuAllergenWarning {
  dishName: string
  ingredientName: string
  allergen: string
  severity: 'critical' | 'warning'
}

/**
 * Validate all menu dishes against the linked client's allergies and dietary restrictions.
 * Returns conflicts so the chef sees warnings inline during menu composition.
 */
export async function validateMenuAllergens(menuId: string): Promise<{
  warnings: MenuAllergenWarning[]
  clientName: string | null
  allergies: string[]
  restrictions: string[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get menu + event + client
  const { data: menu } = await db
    .from('menus')
    .select('id, event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu?.event_id) {
    return { warnings: [], clientName: null, allergies: [], restrictions: [] }
  }

  const { data: event } = await db
    .from('events')
    .select('client_id, dietary_restrictions, allergies')
    .eq('id', menu.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event?.client_id) {
    return { warnings: [], clientName: null, allergies: [], restrictions: [] }
  }

  const { data: client } = await db
    .from('clients')
    .select('full_name, dietary_restrictions, allergies')
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Merge event + client level allergens
  const allergies = [...(event.allergies || []), ...(client?.allergies || [])].filter(
    (v: string, i: number, a: string[]) => a.indexOf(v) === i
  )
  const restrictions = [
    ...(event.dietary_restrictions || []),
    ...(client?.dietary_restrictions || []),
  ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

  if (allergies.length === 0 && restrictions.length === 0) {
    const clientName = client ? client.full_name || null : null
    return { warnings: [], clientName, allergies: [], restrictions: [] }
  }

  // Get all dishes + their ingredients via components + recipes
  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_name')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) {
    const clientName = client ? client.full_name || null : null
    return { warnings: [], clientName, allergies, restrictions }
  }

  const dishIds = dishes.map((d: any) => d.id)
  const { data: components } = await db
    .from('components')
    .select('dish_id, name, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  // Get all recipe ingredient names
  const recipeIds = (components || []).filter((c: any) => c.recipe_id).map((c: any) => c.recipe_id)

  let ingredientNames: Map<string, string[]> = new Map() // dish_id -> ingredient names
  if (recipeIds.length > 0) {
    const { data: recipeIngrs } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id')
      .in('recipe_id', recipeIds)

    const ingrIds = [...new Set((recipeIngrs || []).map((ri: any) => ri.ingredient_id))]
    const { data: ingrs } = await db.from('ingredients').select('id, name').in('id', ingrIds)

    const ingrNameMap = new Map<string, string>((ingrs || []).map((i: any) => [i.id, i.name]))
    const recipeIngrMap = new Map<string, string[]>()
    for (const ri of (recipeIngrs || []) as any[]) {
      const name = ingrNameMap.get(ri.ingredient_id)
      if (!name) continue
      const existing = recipeIngrMap.get(ri.recipe_id) || []
      existing.push(name)
      recipeIngrMap.set(ri.recipe_id, existing)
    }

    // Map dish_id -> ingredient names via components
    for (const comp of (components || []) as any[]) {
      if (!comp.recipe_id) continue
      const names = recipeIngrMap.get(comp.recipe_id) || []
      const existing = ingredientNames.get(comp.dish_id) || []
      ingredientNames.set(comp.dish_id, [...existing, ...names])
    }
  }

  // Import and use the allergen check utility
  const { ALLERGEN_INGREDIENT_MAP } = await import('@/lib/menus/allergen-check')

  const CRITICAL_TERMS = ['peanut', 'tree_nut', 'shellfish', 'fish', 'sesame']
  const warnings: MenuAllergenWarning[] = []

  for (const dish of dishes as any[]) {
    const dishIngredients = ingredientNames.get(dish.id) || []
    const dishName = dish.course_name || 'Unnamed dish'

    for (const allergen of [...allergies, ...restrictions]) {
      const normalizedAllergen = allergen.toLowerCase().replace(/[^a-z]/g, '_')
      // Find matching allergen in the lookup table
      const matchingKeys = Object.keys(ALLERGEN_INGREDIENT_MAP).filter(
        (key) =>
          key === normalizedAllergen ||
          normalizedAllergen.includes(key) ||
          key.includes(normalizedAllergen)
      )

      for (const key of matchingKeys) {
        const triggerTerms = (ALLERGEN_INGREDIENT_MAP as Record<string, string[]>)[key] || []
        for (const ingredient of dishIngredients) {
          const lower = ingredient.toLowerCase()
          const match = triggerTerms.find((term) => lower.includes(term))
          if (match) {
            const severity = CRITICAL_TERMS.some((t) => key.includes(t)) ? 'critical' : 'warning'
            warnings.push({ dishName, ingredientName: ingredient, allergen, severity })
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  const unique = warnings.filter((w) => {
    const key = `${w.dishName}:${w.allergen}:${w.ingredientName}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  unique.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1))

  const clientName = client?.full_name ?? null

  return { warnings: unique, clientName, allergies, restrictions }
}

// ============================================
// CROSS-REFERENCING: RECIPE USAGE LOOKUP
// ============================================

export interface RecipeUsageEntry {
  menuId: string
  menuName: string
  eventId: string | null
  eventDate: string | null
  clientName: string | null
  dishName: string | null
}

/**
 * Find all menus that use a given recipe (via components).
 * Enables "Used in X menus" display on recipe detail pages.
 */
export async function getRecipeUsage(recipeId: string): Promise<RecipeUsageEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find components that reference this recipe
  const { data: components } = await db
    .from('components')
    .select('dish_id')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (!components?.length) return []

  const dishIds = [...new Set(components.map((c: any) => c.dish_id))]
  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id, course_name')
    .in('id', dishIds)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) return []

  const menuIds = [...new Set(dishes.map((d: any) => d.menu_id))]
  const { data: menus } = await db
    .from('menus')
    .select('id, name, event_id')
    .in('id', menuIds)
    .eq('tenant_id', user.tenantId!)

  if (!menus?.length) return []

  // Get event + client info for menus that have events
  const eventIds = menus.filter((m: any) => m.event_id).map((m: any) => m.event_id)
  let eventMap = new Map<string, { date: string | null; clientName: string | null }>()

  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, event_date, client_id')
      .in('id', eventIds)

    const clientIds = (events || []).filter((e: any) => e.client_id).map((e: any) => e.client_id)
    let clientMap = new Map<string, string>()
    if (clientIds.length > 0) {
      const { data: clients } = await db.from('clients').select('id, full_name').in('id', clientIds)

      for (const c of (clients || []) as any[]) {
        clientMap.set(c.id, c.full_name || '')
      }
    }

    for (const e of (events || []) as any[]) {
      eventMap.set(e.id, {
        date: e.event_date,
        clientName: e.client_id ? clientMap.get(e.client_id) || null : null,
      })
    }
  }

  const dishMenuMap = new Map(
    dishes.map((d: any) => [d.id, { menuId: d.menu_id, dishName: d.course_name }])
  )

  const results: RecipeUsageEntry[] = menus.map((m: any) => {
    const eventInfo = m.event_id ? eventMap.get(m.event_id) : null
    // Find which dish in this menu uses the recipe
    const matchingDish = dishes.find((d: any) => d.menu_id === m.id)
    return {
      menuId: m.id,
      menuName: m.name,
      eventId: m.event_id,
      eventDate: eventInfo?.date || null,
      clientName: eventInfo?.clientName || null,
      dishName: matchingDish?.course_name || null,
    }
  })

  results.sort((a, b) => {
    if (a.eventDate && b.eventDate)
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    if (a.eventDate) return -1
    if (b.eventDate) return 1
    return 0
  })

  return results
}

// ============================================
// CROSS-REFERENCING: MENU-EVENT SCALE MISMATCH
// ============================================

/**
 * Check if a menu's scale doesn't match its event's guest count.
 * Returns null if no mismatch, or the suggested guest count.
 */
export async function checkMenuScaleMismatch(menuId: string): Promise<{
  menuGuestCount: number
  eventGuestCount: number
  eventName: string | null
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu } = await db
    .from('menus')
    .select('id, event_id, target_guest_count')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu?.event_id) return null

  const { data: event } = await db
    .from('events')
    .select('guest_count, name')
    .eq('id', menu.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event?.guest_count) return null

  const menuGuests = menu.target_guest_count || 4
  if (menuGuests === event.guest_count) return null

  return {
    menuGuestCount: menuGuests,
    eventGuestCount: event.guest_count,
    eventName: event.name,
  }
}

// ============================================
// CROSS-REFERENCING: MENU INQUIRY LINK
// ============================================

/**
 * Get the inquiry linked to a menu (via event).
 * Enables "Back to Inquiry" link from the menu editor.
 */
export async function getMenuInquiryLink(menuId: string): Promise<{
  inquiryId: string
  inquiryStatus: string | null
} | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu?.event_id) return null

  const { data: inquiry } = await db
    .from('inquiries')
    .select('id, status')
    .eq('event_id', menu.event_id)
    .eq('tenant_id', user.tenantId!)
    .limit(1)
    .single()

  if (!inquiry) return null

  return { inquiryId: inquiry.id, inquiryStatus: inquiry.status }
}

// ============================================
// CROSS-REFERENCING: SEASONAL INGREDIENT WARNINGS
// ============================================

export interface SeasonalIngredientWarning {
  ingredientName: string
  dishName: string
  eventMonth: number
  seasonLabel: string
  note: string
}

const _getMenuSeasonalWarningsCached = (menuId: string, tenantId: string) =>
  unstable_cache(
    async (): Promise<SeasonalIngredientWarning[]> => {
      return _getMenuSeasonalWarningsInner(menuId, tenantId)
    },
    [`menu-seasonal-${menuId}-${tenantId}`],
    { revalidate: 60, tags: [`${MENU_SEASONAL_CACHE_TAG}-${menuId}`] }
  )()

async function _getMenuSeasonalWarningsInner(
  menuId: string,
  tenantId: string
): Promise<SeasonalIngredientWarning[]> {
  const db: any = createAdminClient()

  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu?.event_id) return []

  const { data: event } = await db
    .from('events')
    .select('event_date')
    .eq('id', menu.event_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.event_date) return []

  const eventMonth = new Date(event.event_date + 'T00:00:00').getMonth() + 1

  const { getSeasonalProduceGrouped } = await import('@/lib/calendar/seasonal-produce')
  const seasonal = getSeasonalProduceGrouped(eventMonth)
  const seasonalNames = new Set(
    seasonal.groups.flatMap((g) => g.items.map((i) => i.name.toLowerCase()))
  )

  const { data: dishes } = await db
    .from('dishes')
    .select('id, name')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)

  if (!dishes?.length) return []

  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map(dishes.map((d: any) => [d.id, d.name]))

  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)

  const recipeIds = (components || [])
    .map((c: any) => c.recipe_id)
    .filter((id: string | null) => id !== null)

  if (!recipeIds.length) return []

  // Map recipe -> dish for attribution
  const recipeToDish = new Map<string, string>()
  for (const c of components || []) {
    if (c.recipe_id) recipeToDish.set(c.recipe_id, c.dish_id)
  }

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients?.length) return []

  const ingredientIds = [...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id))]

  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds)

  if (!ingredients?.length) return []

  const ingredientMap = new Map(ingredients.map((i: any) => [i.id, i.name as string]))

  // Known seasonal produce terms (fruits, vegetables, proteins that have clear seasons)
  // We flag an ingredient if its name partially matches a known seasonal item from a
  // DIFFERENT season, meaning it's likely out of season for this event.
  // We collect all seasonal items from ALL seasons to detect out-of-season usage.
  const allSeasons = [1, 3, 5, 7, 9, 11] // one month per season period
  const seasonalByItem = new Map<string, { months: number[]; label: string }>()

  for (const m of allSeasons) {
    const s = getSeasonalProduceGrouped(m)
    for (const g of s.groups) {
      for (const item of g.items) {
        const key = item.name.toLowerCase()
        if (!seasonalByItem.has(key)) {
          seasonalByItem.set(key, { months: [], label: s.seasonLabel })
        }
        // Map to the two months of this season
        const monthPairs: Record<number, number[]> = {
          1: [1, 2],
          3: [3, 4],
          5: [5, 6],
          7: [7, 8],
          9: [9, 10],
          11: [11, 12],
        }
        seasonalByItem.get(key)!.months.push(...(monthPairs[m] || []))
      }
    }
  }

  const warnings: SeasonalIngredientWarning[] = []
  const seen = new Set<string>()

  for (const ri of recipeIngredients as any[]) {
    const ingName = ingredientMap.get(ri.ingredient_id) as string | undefined
    if (!ingName) continue

    const ingLower = ingName.toLowerCase()

    // Check if this ingredient matches a known seasonal item
    for (const [seasonalName, data] of seasonalByItem.entries()) {
      if (ingLower.includes(seasonalName) || seasonalName.includes(ingLower)) {
        // It's a seasonal item - check if it's in season for the event month
        if (!data.months.includes(eventMonth)) {
          const dishId = recipeToDish.get(ri.recipe_id) || ''
          const key = `${ingName}-${dishId}`
          if (seen.has(key)) continue
          seen.add(key)

          warnings.push({
            ingredientName: ingName,
            dishName: (dishMap.get(dishId) as string) || 'Unknown dish',
            eventMonth,
            seasonLabel: seasonal.seasonLabel,
            note: `${ingName} is typically available in ${data.label}, not ${seasonal.seasonLabel}. Expect higher cost or limited availability.`,
          })
        }
        break
      }
    }
  }

  return warnings
}

export async function getMenuSeasonalWarnings(
  menuId: string
): Promise<SeasonalIngredientWarning[]> {
  const user = await requireChef()
  return _getMenuSeasonalWarningsCached(menuId, user.tenantId!)
}

// ============================================
// CROSS-REFERENCING: MENU PERFORMANCE HISTORY
// ============================================

export interface MenuPerformanceHistory {
  timesUsed: number
  lastUsedDate: string | null
  lastUsedClient: string | null
  lastUsedEventId: string | null
  avgMarginPercent: number | null
  totalRevenueCents: number
}

const _getMenuPerformanceCached = (menuId: string, tenantId: string) =>
  unstable_cache(
    async (): Promise<MenuPerformanceHistory | null> => {
      return _getMenuPerformanceInner(menuId, tenantId)
    },
    [`menu-perf-${menuId}-${tenantId}`],
    { revalidate: 60, tags: [`${MENU_PERF_CACHE_TAG}-${menuId}`] }
  )()

async function _getMenuPerformanceInner(
  menuId: string,
  tenantId: string
): Promise<MenuPerformanceHistory | null> {
  const db: any = createAdminClient()

  const { data: events } = await db
    .from('events')
    .select('id, event_date, client_id, quoted_price_cents, status')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .order('event_date', { ascending: false })

  if (!events?.length) return null

  let lastClient: string | null = null
  if (events[0].client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', events[0].client_id)
      .eq('tenant_id', tenantId)
      .single()
    lastClient = client?.full_name || null
  }

  const completedIds = events.filter((e: any) => e.status === 'completed').map((e: any) => e.id)

  let totalRevenue = 0
  let totalCost = 0

  if (completedIds.length > 0) {
    const { data: summaries } = await db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents')
      .in('event_id', completedIds)

    if (summaries) {
      for (const s of summaries) {
        totalRevenue += s.total_paid_cents || 0
      }
    }

    const { data: costData } = await db
      .from('menu_cost_summary')
      .select('menu_id, total_recipe_cost_cents')
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (costData?.total_recipe_cost_cents) {
      totalCost = costData.total_recipe_cost_cents * completedIds.length
    }
  }

  const avgMargin =
    totalRevenue > 0 && totalCost > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null

  return {
    timesUsed: events.length,
    lastUsedDate: events[0].event_date,
    lastUsedClient: lastClient,
    lastUsedEventId: events[0].id,
    avgMarginPercent: avgMargin !== null ? Math.round(avgMargin * 10) / 10 : null,
    totalRevenueCents: totalRevenue,
  }
}

export async function getMenuPerformance(menuId: string): Promise<MenuPerformanceHistory | null> {
  const user = await requireChef()
  return _getMenuPerformanceCached(menuId, user.tenantId!)
}

// ============================================
// CROSS-REFERENCING: CLIENT TASTE PROFILE (MENU CONTEXT)
// ============================================

export interface MenuClientTasteSummary {
  clientId: string
  clientName: string
  loved: string[]
  disliked: string[]
  cuisinePreferences: string[]
  pastEventCount: number
}

const _getMenuClientTasteCached = (menuId: string, tenantId: string) =>
  unstable_cache(
    async (): Promise<MenuClientTasteSummary | null> => {
      return _getMenuClientTasteInner(menuId, tenantId)
    },
    [`menu-taste-${menuId}-${tenantId}`],
    { revalidate: 60, tags: [`${MENU_TASTE_CACHE_TAG}-${menuId}`] }
  )()

async function _getMenuClientTasteInner(
  menuId: string,
  tenantId: string
): Promise<MenuClientTasteSummary | null> {
  const db: any = createAdminClient()

  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu?.event_id) return null

  const { data: event } = await db
    .from('events')
    .select('client_id')
    .eq('id', menu.event_id)
    .single()

  if (!event?.client_id) return null

  const { data: client } = await db
    .from('clients')
    .select('full_name')
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return null

  const { data: prefs } = await db
    .from('client_preferences')
    .select('item_type, item_name, rating')
    .eq('tenant_id', tenantId)
    .eq('client_id', event.client_id)
    .order('observed_at', { ascending: false })

  const loved: string[] = []
  const disliked: string[] = []
  const cuisines: string[] = []

  for (const p of prefs || []) {
    if (p.rating === 'loved' || p.rating === 'liked') {
      if (p.item_type === 'cuisine') cuisines.push(p.item_name)
      else loved.push(p.item_name)
    } else if (p.rating === 'disliked') {
      disliked.push(p.item_name)
    }
  }

  const { count } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', event.client_id)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])

  return {
    clientId: event.client_id,
    clientName: client.full_name,
    loved: loved.slice(0, 8),
    disliked: disliked.slice(0, 8),
    cuisinePreferences: cuisines.slice(0, 5),
    pastEventCount: count || 0,
  }
}

export async function getMenuClientTaste(menuId: string): Promise<MenuClientTasteSummary | null> {
  const user = await requireChef()
  return _getMenuClientTasteCached(menuId, user.tenantId!)
}

// ============================================
// CROSS-REFERENCING: PREP TIME ESTIMATE FOR MENU
// ============================================

export interface MenuPrepEstimate {
  estimatedTotalMinutes: number
  estimatedPrepMinutes: number
  estimatedServiceMinutes: number
  confidence: 'high' | 'medium' | 'low'
  basedOnEvents: number
}

/**
 * Get prep time estimate for the menu's event guest count and occasion.
 * Wraps the existing estimatePrepTime with menu context resolution.
 */
export async function getMenuPrepEstimate(menuId: string): Promise<MenuPrepEstimate | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu } = await db
    .from('menus')
    .select('event_id, target_guest_count')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) return null

  let guestCount = menu.target_guest_count || 0
  let occasion: string | undefined

  if (menu.event_id) {
    const { data: event } = await db
      .from('events')
      .select('guest_count, occasion')
      .eq('id', menu.event_id)
      .single()

    if (event) {
      guestCount = event.guest_count || guestCount
      occasion = event.occasion || undefined
    }
  }

  if (guestCount < 1) return null

  const { estimatePrepTime } = await import('@/lib/intelligence/prep-time-estimator')
  const estimate = await estimatePrepTime(guestCount, occasion)
  if (!estimate) return null

  return {
    estimatedTotalMinutes: estimate.estimatedTotalMinutes,
    estimatedPrepMinutes: estimate.estimatedPrepMinutes,
    estimatedServiceMinutes: estimate.estimatedServiceMinutes,
    confidence: estimate.confidence,
    basedOnEvents: estimate.basedOnEvents,
  }
}

// ============================================
// CROSS-REFERENCING: VENDOR BEST PRICES FOR MENU INGREDIENTS
// ============================================

export interface MenuVendorHint {
  ingredientName: string
  ingredientId: string
  currentPriceCents: number
  bestVendorName: string
  bestPriceCents: number
  savingsCents: number
  savingsPercent: number
}

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

  if (!event?.quoted_price_cents) return null

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

// ============================================
// ACTIVE DIETARY CONFLICT DETECTION
// ============================================

/**
 * Cross-check menu ingredients against client disliked items from client_preferences.
 * Returns conflicts where a disliked item appears in the menu.
 */
export async function detectMenuDietaryConflicts(
  menuId: string
): Promise<{ conflicts: DietaryConflict[]; clientName: string | null } | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get menu -> event -> client chain
  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu?.event_id) return null

  const { data: event } = await db
    .from('events')
    .select('client_id')
    .eq('id', menu.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event?.client_id) return null

  const { data: client } = await db
    .from('clients')
    .select('full_name')
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Get disliked items from client preferences
  const { data: prefs } = await db
    .from('client_preferences')
    .select('item_name')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', event.client_id)
    .eq('rating', 'disliked')

  if (!prefs?.length) return null

  const dislikedSet = new Set(prefs.map((p: any) => p.item_name.toLowerCase()))

  // Get all menu ingredients with dish attribution
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) return null

  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map(dishes.map((d: any) => [d.id, d.name as string]))

  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  const recipeToDish = new Map<string, string>()
  const recipeIds: string[] = []
  for (const c of components || []) {
    if (c.recipe_id) {
      recipeToDish.set(c.recipe_id, c.dish_id)
      recipeIds.push(c.recipe_id)
    }
  }

  if (!recipeIds.length) return null

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients?.length) return null

  const ingredientIds = [...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id))]

  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds)

  if (!ingredients?.length) return null

  const ingredientMap = new Map(ingredients.map((i: any) => [i.id, i.name as string]))

  // Cross-reference: find menu ingredients that match disliked items
  const conflicts: DietaryConflict[] = []
  const seen = new Set<string>()

  for (const ri of recipeIngredients as any[]) {
    const ingName = ingredientMap.get(ri.ingredient_id) as string | undefined
    if (!ingName) continue

    const ingLower = ingName.toLowerCase()

    for (const disliked of dislikedSet) {
      if (ingLower.includes(disliked as string) || (disliked as string).includes(ingLower)) {
        const dishId = recipeToDish.get(ri.recipe_id) || ''
        const key = `${ingName}-${dishId}`
        if (seen.has(key)) continue
        seen.add(key)

        conflicts.push({
          ingredientName: ingName,
          dishName: (dishMap.get(dishId) as string) || 'Unknown dish',
          clientPreference: disliked as string,
        })
      }
    }
  }

  return {
    conflicts: conflicts.sort((a, b) => a.dishName.localeCompare(b.dishName)),
    clientName: client?.full_name || null,
  }
}

// ============================================
// PHASE 2: MENU ASSEMBLY
// ============================================

export interface AssemblySource {
  id: string
  name: string
  type: 'template' | 'past_menu' | 'recipe'
  serviceStyle: string | null
  guestCount: number | null
  cuisineType: string | null
  eventDate: string | null
  clientName: string | null
  dishCount: number
}

export interface AssemblyDish {
  id: string
  name: string | null
  courseName: string
  courseNumber: number
  description: string | null
  dietaryTags: string[]
  componentCount: number
  hasRecipe: boolean
}

export interface AddDishResult {
  success: boolean
  newDishId: string
  componentsAdded: number
  scaleAdjusted: boolean
  newScaleFactor: number | null
}

// ============================================
// 7. GET ASSEMBLY SOURCES (Templates + Past Menus)
// ============================================

export async function getAssemblySources(filters?: {
  type?: 'template' | 'past_menu'
  search?: string
  serviceStyle?: string
  cuisineType?: string
}): Promise<AssemblySource[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('menus')
    .select(
      'id, name, service_style, cuisine_type, target_guest_count, is_template, event_id, created_at'
    )
    .eq('tenant_id', user.tenantId!)

  // Filter by type
  if (filters?.type === 'template') {
    query = query.eq('is_template', true)
  } else if (filters?.type === 'past_menu') {
    query = query.eq('is_template', false)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters?.serviceStyle) {
    query = query.eq('service_style', filters.serviceStyle)
  }

  if (filters?.cuisineType) {
    query = query.ilike('cuisine_type', `%${filters.cuisineType}%`)
  }

  query = query.order('created_at', { ascending: false }).limit(50)

  const { data: menus, error } = await query

  if (error) {
    console.error('[getAssemblySources] Error:', error)
    throw new UnknownAppError('Failed to fetch assembly sources')
  }

  if (!menus?.length) return []

  // Get dish counts per menu
  const menuIds = menus.map((m: any) => m.id)
  const { data: dishes } = await db
    .from('dishes')
    .select('menu_id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  const dishCountMap = new Map<string, number>()
  for (const d of dishes || []) {
    dishCountMap.set(d.menu_id, (dishCountMap.get(d.menu_id) || 0) + 1)
  }

  // Get client names for event-linked menus
  const eventIds = menus.filter((m: any) => m.event_id).map((m: any) => m.event_id)
  const clientNameMap = new Map<string, string>()
  const eventDateMap = new Map<string, string>()

  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, client_id, event_date')
      .in('id', eventIds)
      .eq('tenant_id', user.tenantId!)

    if (events?.length) {
      for (const e of events) {
        if (e.event_date) eventDateMap.set(e.id, e.event_date)
      }

      const clientIds = events.filter((e: any) => e.client_id).map((e: any) => e.client_id)
      if (clientIds.length > 0) {
        const { data: clients } = await db
          .from('clients')
          .select('id, full_name')
          .in('id', clientIds)
          .eq('tenant_id', user.tenantId!)

        if (clients) {
          const clientMap = new Map<string, string>()
          for (const c of clients) {
            clientMap.set(c.id, c.full_name || '')
          }
          for (const e of events) {
            if (e.client_id && clientMap.has(e.client_id)) {
              clientNameMap.set(e.id, clientMap.get(e.client_id)!)
            }
          }
        }
      }
    }
  }

  return menus.map((m: any) => ({
    id: m.id,
    name: m.name,
    type: m.is_template ? ('template' as const) : ('past_menu' as const),
    serviceStyle: m.service_style,
    guestCount: m.target_guest_count,
    cuisineType: m.cuisine_type,
    eventDate: m.event_id ? eventDateMap.get(m.event_id) || null : null,
    clientName: m.event_id ? clientNameMap.get(m.event_id) || null : null,
    dishCount: dishCountMap.get(m.id) || 0,
  }))
}

// ============================================
// 8. GET DISHES FROM A SOURCE MENU
// ============================================

export async function getDishesFromMenu(sourceMenuId: string): Promise<AssemblyDish[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: dishes, error } = await db
    .from('dishes')
    .select('id, name, course_name, course_number, description, dietary_tags')
    .eq('menu_id', sourceMenuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getDishesFromMenu] Error:', error)
    throw new UnknownAppError('Failed to fetch dishes')
  }

  if (!dishes?.length) return []

  const dishIds = dishes.map((d: any) => d.id)

  // Get component info
  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  const compCountMap = new Map<string, number>()
  const hasRecipeMap = new Map<string, boolean>()
  for (const c of components || []) {
    compCountMap.set(c.dish_id, (compCountMap.get(c.dish_id) || 0) + 1)
    if (c.recipe_id) hasRecipeMap.set(c.dish_id, true)
  }

  return dishes.map((d: any) => ({
    id: d.id,
    name: d.name,
    courseName: d.course_name,
    courseNumber: d.course_number,
    description: d.description,
    dietaryTags: d.dietary_tags || [],
    componentCount: compCountMap.get(d.id) || 0,
    hasRecipe: hasRecipeMap.get(d.id) || false,
  }))
}

// ============================================
// 9. ADD DISH FROM SOURCE (Deep Copy)
// ============================================

export async function addDishFromSource(
  targetMenuId: string,
  sourceDishId: string,
  targetCourseNumber: number,
  targetCourseName?: string
): Promise<AddDishResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify target menu exists and is editable
  const { data: targetMenu } = await db
    .from('menus')
    .select('id, status, target_guest_count')
    .eq('id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!targetMenu) throw new UnknownAppError('Target menu not found')
  if (targetMenu.status === 'locked')
    throw new UnknownAppError('Cannot add dishes to a locked menu')

  // Fetch source dish with full detail
  const { data: sourceDish } = await db
    .from('dishes')
    .select('*')
    .eq('id', sourceDishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!sourceDish) throw new UnknownAppError('Source dish not found')

  // Get source menu guest count for scale adjustment
  const { data: sourceMenu } = await db
    .from('menus')
    .select('target_guest_count')
    .eq('id', sourceDish.menu_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  const sourceGuestCount = sourceMenu?.target_guest_count || 0
  const targetGuestCount = targetMenu.target_guest_count || 0

  const { data: existingDish } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .eq('course_number', targetCourseNumber)
    .maybeSingle()

  if (existingDish) {
    throw new UnknownAppError(getDuplicateCourseError(targetCourseNumber))
  }

  // Deep copy the dish
  const { data: newDish, error: dishErr } = await db
    .from('dishes')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: targetMenuId,
      course_name: targetCourseName || sourceDish.course_name,
      course_number: targetCourseNumber,
      name: sourceDish.name,
      description: sourceDish.description,
      dietary_tags: sourceDish.dietary_tags || [],
      allergen_flags: sourceDish.allergen_flags || [],
      chef_notes: sourceDish.chef_notes,
      client_notes: sourceDish.client_notes,
      plating_instructions: sourceDish.plating_instructions ?? null,
      beverage_pairing: sourceDish.beverage_pairing ?? null,
      beverage_pairing_notes: sourceDish.beverage_pairing_notes ?? null,
      sort_order: targetCourseNumber,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (dishErr || !newDish) {
    console.error('[addDishFromSource] Dish copy error:', dishErr)
    if (dishErr?.code === '23505') {
      throw new UnknownAppError(getDuplicateCourseError(targetCourseNumber))
    }
    throw new UnknownAppError('Failed to copy dish')
  }

  // Deep copy components
  const { data: sourceComponents } = await db
    .from('components')
    .select('*')
    .eq('dish_id', sourceDishId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  let componentsAdded = 0
  let scaleAdjusted = false
  let newScaleFactor: number | null = null

  for (const comp of sourceComponents || []) {
    let scaleFactor = comp.scale_factor || 1

    // Auto-adjust scale if guest counts differ
    if (sourceGuestCount > 0 && targetGuestCount > 0 && sourceGuestCount !== targetGuestCount) {
      scaleFactor = scaleFactor * (targetGuestCount / sourceGuestCount)
      scaleFactor = Math.round(scaleFactor * 100) / 100
      scaleAdjusted = true
      newScaleFactor = scaleFactor
    }

    const { error: compErr } = await db.from('components').insert({
      tenant_id: user.tenantId!,
      dish_id: newDish.id,
      name: comp.name,
      category: comp.category,
      description: comp.description,
      recipe_id: comp.recipe_id,
      scale_factor: scaleFactor,
      is_make_ahead: comp.is_make_ahead,
      make_ahead_window_hours: comp.make_ahead_window_hours,
      transport_category: comp.transport_category,
      execution_notes: comp.execution_notes,
      storage_notes: comp.storage_notes,
      sort_order: comp.sort_order,
      portion_quantity: comp.portion_quantity ?? null,
      portion_unit: comp.portion_unit ?? null,
      prep_day_offset: comp.prep_day_offset ?? 0,
      prep_time_of_day: comp.prep_time_of_day ?? null,
      prep_station: comp.prep_station ?? null,
      created_by: user.id,
      updated_by: user.id,
    } as any)

    if (compErr) {
      console.error('[addDishFromSource] Component copy error:', compErr)
    } else {
      componentsAdded++
    }
  }

  revalidatePath(`/culinary/menus/${targetMenuId}`)
  revalidateMenuIntelligenceCache(targetMenuId)

  return {
    success: true,
    newDishId: newDish.id,
    componentsAdded,
    scaleAdjusted,
    newScaleFactor,
  }
}

// ============================================
// 10. ADD RECIPE AS COMPONENT
// ============================================

export async function addRecipeAsComponent(
  targetMenuId: string,
  targetDishId: string,
  recipeId: string
): Promise<{ success: boolean; componentId: string; scaleFactor: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify target menu is editable
  const { data: targetMenu } = await db
    .from('menus')
    .select('id, status, target_guest_count')
    .eq('id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!targetMenu) throw new UnknownAppError('Target menu not found')
  if (targetMenu.status === 'locked') throw new UnknownAppError('Cannot modify a locked menu')

  // Verify dish belongs to this menu
  const { data: dish } = await db
    .from('dishes')
    .select('id, menu_id')
    .eq('id', targetDishId)
    .eq('menu_id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) throw new UnknownAppError('Dish not found in this menu')

  // Fetch recipe for name and yield
  const { data: recipe } = await db
    .from('recipes')
    .select('id, name, yield_quantity, category')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new UnknownAppError('Recipe not found')

  // Calculate scale factor from recipe yield vs menu guest count
  let scaleFactor = 1
  const targetGuestCount = targetMenu.target_guest_count || 0
  if (recipe.yield_quantity && recipe.yield_quantity > 0 && targetGuestCount > 0) {
    scaleFactor = targetGuestCount / recipe.yield_quantity
    scaleFactor = Math.round(scaleFactor * 100) / 100
  }

  // Determine sort order (append)
  const { data: existingComps } = await db
    .from('components')
    .select('sort_order')
    .eq('dish_id', targetDishId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = existingComps?.length ? (existingComps[0].sort_order || 0) + 1 : 0

  // Map recipe category to component category
  const categoryMap: Record<string, string> = {
    protein: 'protein',
    starch: 'starch',
    vegetable: 'vegetable',
    sauce: 'sauce',
    dessert: 'dessert',
    bread: 'bread',
    soup: 'soup',
    salad: 'salad',
    appetizer: 'other',
    pasta: 'starch',
    beverage: 'other',
    condiment: 'sauce',
    fruit: 'other',
  }
  const componentCategory = categoryMap[recipe.category] || 'other'

  const { data: component, error } = await db
    .from('components')
    .insert({
      tenant_id: user.tenantId!,
      dish_id: targetDishId,
      name: recipe.name,
      category: componentCategory,
      recipe_id: recipeId,
      scale_factor: scaleFactor,
      sort_order: nextSort,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error || !component) {
    console.error('[addRecipeAsComponent] Error:', error)
    throw new UnknownAppError('Failed to add recipe as component')
  }

  revalidatePath(`/culinary/menus/${targetMenuId}`)
  revalidateMenuIntelligenceCache(targetMenuId)

  return {
    success: true,
    componentId: component.id,
    scaleFactor,
  }
}

// ============================================
// 11. QUICK ADD DISH (Empty dish, no source)
// ============================================

export async function quickAddDish(
  targetMenuId: string,
  dishName: string,
  courseNumber: number,
  courseName: string
): Promise<{ success: boolean; dishId: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu is editable
  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')
  if (menu.status === 'locked') throw new UnknownAppError('Cannot add dishes to a locked menu')

  const { data: existingDish } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .eq('course_number', courseNumber)
    .maybeSingle()

  if (existingDish) {
    throw new UnknownAppError(getDuplicateCourseError(courseNumber))
  }

  const { data: dish, error } = await db
    .from('dishes')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: targetMenuId,
      course_name: courseName,
      course_number: courseNumber,
      name: dishName,
      sort_order: courseNumber,
      dietary_tags: [],
      allergen_flags: [],
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error || !dish) {
    console.error('[quickAddDish] Error:', error)
    if (error?.code === '23505') {
      throw new UnknownAppError(getDuplicateCourseError(courseNumber))
    }
    throw new UnknownAppError('Failed to add dish')
  }

  revalidatePath(`/culinary/menus/${targetMenuId}`)
  revalidateMenuIntelligenceCache(targetMenuId)

  return { success: true, dishId: dish.id }
}

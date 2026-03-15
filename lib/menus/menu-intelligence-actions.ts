// Menu Intelligence Server Actions
// Phase 1: Core Automation - margin alerts, breakdown, scaling, price alerts, event init
// All deterministic (Formula > AI). No LLM calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'

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

// Margin thresholds (deterministic, from design doc)
const MARGIN_WARNING_THRESHOLD = 35
const MARGIN_CRITICAL_THRESHOLD = 45
const PRICE_SPIKE_THRESHOLD = 1.3 // 30% above average

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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  // Fetch menu with event context
  const { data: menu } = await supabase
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
    const { data: event } = await supabase
      .from('events')
      .select('guest_count, quoted_price_cents')
      .eq('id', menu.event_id)
      .single()

    if (event) {
      guestCount = event.guest_count || guestCount
      quotedPriceCents = event.quoted_price_cents
    }
  }

  // Fetch dishes
  const { data: dishes } = await supabase
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
  const { data: components } = await supabase
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
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, yield_quantity')
      .in('id', recipeIds)

    if (recipes) {
      for (const r of recipes) {
        recipeMap.set(r.id, { name: r.name, yield_quantity: r.yield_quantity })
      }
    }

    // Fetch recipe_ingredients with ingredient details
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, quantity, unit')
      .in('recipe_id', recipeIds)
      .order('sort_order', { ascending: true })

    if (recipeIngredients?.length) {
      const ingredientIds = [...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id))]

      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, name, last_price_cents, price_unit, category')
        .in('id', ingredientIds)

      const ingredientMap = new Map<string, any>()
      if (ingredients) {
        for (const ing of ingredients) {
          ingredientMap.set(ing.id, ing)
        }
      }

      // Group ingredients by recipe
      for (const ri of recipeIngredients) {
        const existing = ingredientsByRecipe.get(ri.recipe_id) || []
        const ingData = ingredientMap.get(ri.ingredient_id)
        existing.push({
          ingredientId: ri.ingredient_id,
          name: ingData?.name || 'Unknown',
          quantity: ri.quantity || 0,
          unit: ri.unit || '',
          priceCents: ingData?.last_price_cents ?? null,
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
  const supabase: any = createServerClient()

  if (newGuestCount < 1 || newGuestCount > 500) {
    throw new UnknownAppError('Guest count must be between 1 and 500')
  }

  // Get menu + current guest count
  const { data: menu } = await supabase
    .from('menus')
    .select('id, target_guest_count, status, event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')
  if (menu.status === 'locked') throw new UnknownAppError('Cannot scale a locked menu')

  const previousGuestCount = menu.target_guest_count || newGuestCount

  // Fetch all dishes and components
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) {
    // Update menu guest count even if no dishes
    await supabase
      .from('menus')
      .update({ target_guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menuId)

    revalidatePath(`/culinary/menus/${menuId}`)
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

  const { data: components } = await supabase
    .from('components')
    .select('id, name, scale_factor, recipe_id, dish_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  if (!components?.length) {
    await supabase
      .from('menus')
      .update({ target_guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menuId)

    revalidatePath(`/culinary/menus/${menuId}`)
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
    const { data: recipes } = await supabase
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
      await supabase
        .from('components')
        .update({ scale_factor: newScale })
        .eq('id', comp.id)
        .eq('tenant_id', user.tenantId!)
    }
  }

  // Update menu guest count
  await supabase
    .from('menus')
    .update({ target_guest_count: newGuestCount, updated_by: user.id })
    .eq('id', menuId)

  // Also update event guest count if linked
  if (menu.event_id) {
    await supabase
      .from('events')
      .update({ guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menu.event_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/culinary/menus/${menuId}`)
  if (menu.event_id) {
    revalidatePath(`/events/${menu.event_id}`)
  }

  // Get updated cost per guest
  const { data: costData } = await supabase
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
  const supabase: any = createServerClient()

  // Get ingredients where last_price is significantly above average
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('id, name, last_price_cents, average_price_cents')
    .eq('tenant_id', user.tenantId!)
    .not('last_price_cents', 'is', null)
    .not('average_price_cents', 'is', null)

  if (error) {
    console.error('[getIngredientPriceAlerts] Error:', error)
    throw new UnknownAppError('Failed to fetch price alerts')
  }

  const alerts: PriceAlert[] = []

  for (const ing of ingredients || []) {
    if (!ing.last_price_cents || !ing.average_price_cents || ing.average_price_cents === 0) continue

    const ratio = ing.last_price_cents / ing.average_price_cents
    if (ratio >= PRICE_SPIKE_THRESHOLD) {
      const spikePercent = Math.round((ratio - 1) * 100)

      // Find menus using this ingredient (via recipe_ingredients + components)
      const { data: usage } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .eq('ingredient_id', ing.id)

      const recipeIds = (usage || []).map((u: any) => u.recipe_id)
      let affectedMenuNames: string[] = []

      if (recipeIds.length > 0) {
        const { data: comps } = await supabase
          .from('components')
          .select('dish_id')
          .in('recipe_id', recipeIds)
          .eq('tenant_id', user.tenantId!)

        if (comps?.length) {
          const dishIds = [...new Set(comps.map((c: any) => c.dish_id))]
          const { data: dishMenus } = await supabase
            .from('dishes')
            .select('menu_id')
            .in('id', dishIds)
            .eq('tenant_id', user.tenantId!)

          if (dishMenus?.length) {
            const menuIds = [...new Set(dishMenus.map((d: any) => d.menu_id))]
            const { data: menus } = await supabase
              .from('menus')
              .select('name')
              .in('id', menuIds)
              .eq('tenant_id', user.tenantId!)
              .in('status', ['draft', 'shared'])

            affectedMenuNames = (menus || []).map((m: any) => m.name)
          }
        }
      }

      alerts.push({
        ingredientId: ing.id,
        ingredientName: ing.name,
        currentPriceCents: ing.last_price_cents,
        averagePriceCents: ing.average_price_cents,
        spikePercent,
        affectedMenus: affectedMenuNames,
      })
    }
  }

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
  const supabase: any = createServerClient()

  // Fetch event with client info
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, occasion, event_date, guest_count, service_style, client_id, menu_id')
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
    const { data: client } = await supabase
      .from('clients')
      .select('last_name, dietary_restrictions, allergies')
      .eq('id', event.client_id)
      .single()

    if (client) {
      clientLastName = client.last_name || ''
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
  const occasionLabel = event.occasion || event.title || 'Event'
  const menuName = clientLastName
    ? `${occasionLabel} Menu - ${clientLastName}`
    : `${occasionLabel} Menu`

  // Create the draft menu
  const { data: menu, error: menuErr } = await supabase
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
  await supabase.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: menu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
  })

  // Link menu to event
  await supabase
    .from('events')
    .update({ menu_id: menu.id, updated_by: user.id })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/culinary/menus')

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

export async function getMenuContextData(menuId: string): Promise<{
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
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get menu with event context
  const { data: menu } = await supabase
    .from('menus')
    .select('id, event_id, target_guest_count, service_style')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')

  let clientDietary: string[] = []
  let clientAllergies: string[] = []
  let clientName: string | null = null
  let clientId: string | null = null
  let eventDate: Date = new Date()

  if (menu.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('client_id, event_date, guest_count')
      .eq('id', menu.event_id)
      .single()

    if (event) {
      clientId = event.client_id
      if (event.event_date) eventDate = new Date(event.event_date)

      if (event.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('first_name, last_name, dietary_restrictions, allergies')
          .eq('id', event.client_id)
          .single()

        if (client) {
          clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || null
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
    const { data: clientEvents } = await supabase
      .from('events')
      .select('menu_id, event_date, guest_count')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .not('menu_id', 'is', null)
      .neq('menu_id', menuId)
      .order('event_date', { ascending: false })
      .limit(5)

    if (clientEvents?.length) {
      const prevMenuIds = clientEvents.map((e: any) => e.menu_id)
      const { data: prevMenus } = await supabase
        .from('menus')
        .select('id, name')
        .in('id', prevMenuIds)

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

  const { data: templates } = await supabase
    .from('menus')
    .select('id, name, service_style')
    .eq('tenant_id', user.tenantId!)
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

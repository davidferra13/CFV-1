// Menu Intelligence: Cross-referencing queries
// Context data, allergens, seasonal warnings, dietary conflicts, client taste,
// stock check, recipe usage, inquiry link, performance history, prep estimate,
// scale mismatch detection.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { unstable_cache } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import { dateToDateString } from '@/lib/utils/format'
import {
  buildDietaryConflictsFromVector,
  mapClientProfileVectorToMenuClientTasteSummary,
  type MenuConflictDish,
} from '@/lib/clients/client-profile-chef-workflow'
import { getClientProfileVectorForTenant } from '@/lib/clients/client-profile-service'
import {
  MENU_CONTEXT_CACHE_TAG,
  MENU_PERF_CACHE_TAG,
  MENU_SEASONAL_CACHE_TAG,
  MENU_TASTE_CACHE_TAG,
} from '@/lib/menus/menu-intelligence-cache'

import {
  getSeason,
  getGuestTier,
  loadMenuLinkedClientContext,
  type MenuIngredientStock,
  type MenuAllergenWarning,
  type RecipeUsageEntry,
  type SeasonalIngredientWarning,
  type MenuPerformanceHistory,
  type MenuPrepEstimate,
  type MenuClientTasteSummary,
  type DietaryConflict,
} from './shared'

// ============================================
// CONTEXT DATA FOR MENU EDITOR
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
// INVENTORY STOCK CHECK
// ============================================

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
// ALLERGEN VALIDATION
// ============================================

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
// RECIPE USAGE LOOKUP
// ============================================

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
// MENU-EVENT SCALE MISMATCH
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
// MENU INQUIRY LINK
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
// SEASONAL INGREDIENT WARNINGS
// ============================================

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

  const eventMonth =
    new Date(dateToDateString(event.event_date as Date | string) + 'T00:00:00').getMonth() + 1

  const { getSeasonalProduceGrouped } = await import('@/lib/calendar/seasonal-produce')
  const seasonal = getSeasonalProduceGrouped(eventMonth)

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
        // It's a seasonal item; check if it's in season for the event month
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
// MENU PERFORMANCE HISTORY
// ============================================

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
// CLIENT TASTE PROFILE (MENU CONTEXT)
// ============================================

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
  const clientContext = await loadMenuLinkedClientContext(menuId, tenantId, db)
  if (!clientContext) return null

  const vector = await getClientProfileVectorForTenant(clientContext.clientId, tenantId, {
    dbClient: db,
  })
  if (!vector) return null

  const { count } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', clientContext.clientId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])

  return mapClientProfileVectorToMenuClientTasteSummary({
    vector,
    clientName: clientContext.clientName,
    pastEventCount: Number(count ?? 0),
  })
}

export async function getMenuClientTaste(menuId: string): Promise<MenuClientTasteSummary | null> {
  const user = await requireChef()
  return _getMenuClientTasteCached(menuId, user.tenantId!)
}

// ============================================
// PREP TIME ESTIMATE FOR MENU
// ============================================

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
// DIETARY CONFLICT DETECTION
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
  const clientContext = await loadMenuLinkedClientContext(menuId, user.tenantId!, db)
  if (!clientContext) return null

  const vector = await getClientProfileVectorForTenant(clientContext.clientId, user.tenantId!, {
    dbClient: db,
  })
  if (!vector) return null

  // Get all menu ingredients with dish attribution
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, allergen_flags')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) return null

  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map<string, MenuConflictDish>(
    dishes.map((dish: any) => [
      dish.id,
      {
        dishName: dish.name || 'Unknown dish',
        ingredientNames: [],
        labelNames: [
          dish.name || 'Unknown dish',
          ...((dish.allergen_flags as string[] | null) ?? []),
        ],
      },
    ])
  )

  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  const recipeToDishIds = new Map<string, string[]>()
  const recipeIds = new Set<string>()
  for (const c of components || []) {
    if (c.recipe_id) {
      const dishIdsForRecipe = recipeToDishIds.get(c.recipe_id) ?? []
      dishIdsForRecipe.push(c.dish_id)
      recipeToDishIds.set(c.recipe_id, dishIdsForRecipe)
      recipeIds.add(c.recipe_id)
    }
  }

  const recipeIngredients =
    recipeIds.size > 0
      ? (
          await db
            .from('recipe_ingredients')
            .select('recipe_id, ingredient_id')
            .in('recipe_id', [...recipeIds])
        ).data
      : []

  if (recipeIngredients?.length) {
    const ingredientIds = [...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id))]
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, name')
      .in('id', ingredientIds)
    const ingredientMap = new Map<string, string>(
      (ingredients || []).map((ingredient: any) => [ingredient.id, ingredient.name as string])
    )

    for (const recipeIngredient of recipeIngredients as any[]) {
      const ingredientName = ingredientMap.get(recipeIngredient.ingredient_id)
      if (!ingredientName) continue

      for (const dishId of recipeToDishIds.get(recipeIngredient.recipe_id) ?? []) {
        dishMap.get(dishId)?.ingredientNames.push(ingredientName)
      }
    }
  }

  const conflicts = buildDietaryConflictsFromVector({
    vector,
    menuDishes: [...dishMap.values()],
  })

  if (conflicts.length === 0) return null

  return {
    conflicts,
    clientName: clientContext.clientName,
  }
}

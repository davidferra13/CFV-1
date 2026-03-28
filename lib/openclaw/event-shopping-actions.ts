'use server'

/**
 * Event-Driven Shopping Intelligence
 * Pulls ingredients from upcoming events and runs them through the Pi optimizer.
 * Connects: events -> menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type EventIngredient = {
  ingredientId: string
  ingredientName: string
  category: string
  unit: string
  totalQuantity: number
  eventCount: number
  events: string[]
}

export type EventShoppingPlan = {
  dateRange: { start: string; end: string }
  eventCount: number
  events: { id: string; occasion: string; eventDate: string; guestCount: number }[]
  ingredients: EventIngredient[]
  optimization: {
    singleStoreBest: {
      store: string
      totalCents: number
      availableCount: number
      missingCount: number
    } | null
    multiStoreOptimal: {
      totalCents: number
      savingsVsSingleStore: number
      stores: { store: string; items: string[]; subtotalCents: number }[]
    } | null
    storeRanking: {
      store: string
      avgCents: number
      itemCount: number
      wins: number
      coveragePct: number
    }[]
  } | null
}

// --- Actions ---

/**
 * Get all unique ingredients needed for upcoming events in the next N days.
 * Traverses: events -> menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
 */
export async function getUpcomingEventShoppingPlan(daysAhead = 14): Promise<EventShoppingPlan> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]

  // Step 1: Get upcoming confirmed events
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .lte('event_date', endDate)
    .in('status', ['accepted', 'paid', 'confirmed'])
    .order('event_date', { ascending: true })

  if (!events?.length) {
    return {
      dateRange: { start: today, end: endDate },
      eventCount: 0,
      events: [],
      ingredients: [],
      optimization: null,
    }
  }

  const eventIds = events.map((e: any) => e.id)

  // Step 2: Get menus for these events
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  if (!menus?.length) {
    return {
      dateRange: { start: today, end: endDate },
      eventCount: events.length,
      events: events.map((e: any) => ({
        id: e.id,
        occasion: e.occasion || 'Event',
        eventDate: e.event_date,
        guestCount: e.guest_count || 0,
      })),
      ingredients: [],
      optimization: null,
    }
  }

  // Step 3: Get dishes -> components -> recipe IDs
  const menuIds = menus.map((m: any) => m.id)
  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

  if (!dishes?.length) {
    return buildEmptyResult(today, endDate, events)
  }

  const dishIds = dishes.map((d: any) => d.id)
  const { data: components } = await db
    .from('components')
    .select('recipe_id, scale_factor, dish_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components?.length) {
    return buildEmptyResult(today, endDate, events)
  }

  // Build dish -> menu -> event mapping for per-event tracking
  const dishToMenu = new Map<string, string>()
  for (const d of dishes) dishToMenu.set(d.id, d.menu_id)
  const menuToEvent = new Map<string, string>()
  for (const m of menus) menuToEvent.set(m.id, m.event_id)

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id))]

  // Step 4: Get recipe ingredients
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients?.length) {
    return buildEmptyResult(today, endDate, events)
  }

  // Step 5: Get ingredient details
  const ingredientIds = [...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id))]
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category, default_unit')
    .in('id', ingredientIds)

  const ingredientMap = new Map<string, any>()
  for (const ing of ingredients || []) {
    ingredientMap.set(ing.id, ing)
  }

  // Step 6: Aggregate quantities across events
  // Track which events use each ingredient
  const ingredientAgg = new Map<
    string,
    {
      totalQuantity: number
      unit: string
      eventIds: Set<string>
    }
  >()

  for (const comp of components) {
    const scale = Number(comp.scale_factor) || 1
    const menuId = dishToMenu.get(comp.dish_id)
    const eventId = menuId ? menuToEvent.get(menuId) : null

    const compRecipeIngs = recipeIngredients.filter((ri: any) => ri.recipe_id === comp.recipe_id)

    for (const ri of compRecipeIngs) {
      const existing = ingredientAgg.get(ri.ingredient_id) || {
        totalQuantity: 0,
        unit: ri.unit || 'each',
        eventIds: new Set<string>(),
      }
      existing.totalQuantity += (Number(ri.quantity) || 0) * scale
      if (eventId) existing.eventIds.add(eventId)
      ingredientAgg.set(ri.ingredient_id, existing)
    }
  }

  // Build ingredient list
  const eventIngredients: EventIngredient[] = []
  for (const [ingId, agg] of ingredientAgg) {
    const ing = ingredientMap.get(ingId)
    if (!ing) continue
    eventIngredients.push({
      ingredientId: ingId,
      ingredientName: ing.name,
      category: ing.category || 'uncategorized',
      unit: agg.unit,
      totalQuantity: Math.round(agg.totalQuantity * 100) / 100,
      eventCount: agg.eventIds.size,
      events: [...agg.eventIds],
    })
  }

  // Step 7: Run through Pi optimizer + store scorecard
  const ingredientNames = eventIngredients.map((i) => i.ingredientName)
  let optimization: EventShoppingPlan['optimization'] = null

  if (ingredientNames.length > 0) {
    try {
      const [optimizerRes, scorecardRes] = await Promise.all([
        fetch(`${OPENCLAW_API}/api/optimize/shopping-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: ingredientNames }),
          signal: AbortSignal.timeout(15000),
        }),
        fetch(`${OPENCLAW_API}/api/stores/scorecard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: ingredientNames }),
          signal: AbortSignal.timeout(15000),
        }),
      ])

      const optData = optimizerRes.ok ? await optimizerRes.json() : null
      const scoreData = scorecardRes.ok ? await scorecardRes.json() : null

      const bestSingleStore = optData?.singleStoreRanking?.[0] || null
      const optimalTotal = optData?.optimal?.totalCents || 0

      optimization = {
        singleStoreBest: bestSingleStore
          ? {
              store: bestSingleStore.store,
              totalCents: bestSingleStore.totalCents,
              availableCount: bestSingleStore.available,
              missingCount: bestSingleStore.missing,
            }
          : null,
        multiStoreOptimal: optData?.optimal
          ? {
              totalCents: optimalTotal,
              savingsVsSingleStore: bestSingleStore ? bestSingleStore.totalCents - optimalTotal : 0,
              stores: (optData.optimal.items || []).reduce((acc: any[], item: any) => {
                const existing = acc.find((s: any) => s.store === item.store)
                if (existing) {
                  existing.items.push(item.name)
                  existing.subtotalCents += item.priceCents
                } else {
                  acc.push({
                    store: item.store,
                    items: [item.name],
                    subtotalCents: item.priceCents,
                  })
                }
                return acc
              }, []),
            }
          : null,
        storeRanking: (scoreData?.stores || []).slice(0, 8),
      }
    } catch {
      // Pi offline, optimization unavailable
    }
  }

  return {
    dateRange: { start: today, end: endDate },
    eventCount: events.length,
    events: events.map((e: any) => ({
      id: e.id,
      occasion: e.occasion || 'Event',
      eventDate: e.event_date,
      guestCount: e.guest_count || 0,
    })),
    ingredients: eventIngredients.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)),
    optimization,
  }
}

function buildEmptyResult(start: string, end: string, events: any[]): EventShoppingPlan {
  return {
    dateRange: { start, end },
    eventCount: events.length,
    events: events.map((e: any) => ({
      id: e.id,
      occasion: e.occasion || 'Event',
      eventDate: e.event_date,
      guestCount: e.guest_count || 0,
    })),
    ingredients: [],
    optimization: null,
  }
}

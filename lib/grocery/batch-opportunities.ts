'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type BatchOpportunity = {
  ingredientId: string
  ingredientName: string
  category: string
  totalQuantity: number
  unit: string
  eventCount: number
  events: { id: string; name: string; date: string }[]
}

/**
 * Finds shared ingredients across events in a date range.
 * Pure database query + set math, no AI.
 * Only surfaces when 2+ events share the same ingredient.
 */
export async function getBatchOpportunities(
  startDate: string,
  endDate: string
): Promise<BatchOpportunity[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Step 1: Get all events in the date range that have menus
  const { data: events } = await db
    .from('events')
    .select('id, title, event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .not('status', 'eq', 'cancelled')

  if (!events || events.length < 2) return []

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map<string, { id: string; name: string; date: string }>()
  for (const e of events) {
    eventMap.set(e.id, { id: e.id, name: e.title || 'Untitled Event', date: e.event_date })
  }

  // Step 2: Get all menus for these events
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .in('event_id', eventIds)
    .eq('tenant_id', tenantId)

  if (!menus || menus.length === 0) return []

  const menuEventMap = new Map<string, string>() // menu_id -> event_id
  for (const m of menus) {
    if (m.event_id) menuEventMap.set(m.id, m.event_id)
  }

  const menuIds = menus.map((m: any) => m.id)

  // Step 3: Get all dishes for these menus
  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id')
    .in('menu_id', menuIds)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) return []

  const dishMenuMap = new Map<string, string>() // dish_id -> menu_id
  for (const d of dishes) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  const dishIds = dishes.map((d: any) => d.id)

  // Step 4: Get all components with recipe links
  const { data: components } = await db
    .from('components')
    .select('id, dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id).filter(Boolean))]
  if (recipeIds.length === 0) return []

  // Build component -> event mapping
  const recipeEventMap = new Map<string, Set<string>>() // recipe_id -> Set<event_id>
  for (const c of components) {
    if (!c.recipe_id) continue
    const menuId = dishMenuMap.get(c.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    if (!recipeEventMap.has(c.recipe_id)) recipeEventMap.set(c.recipe_id, new Set())
    recipeEventMap.get(c.recipe_id)!.add(eventId)
  }

  // Step 5: Get recipe_ingredients for all recipes
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) return []

  const ingredientIds = [...new Set(recipeIngredients.map((ri: any) => ri.ingredient_id))]

  // Step 6: Get ingredient names
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category')
    .in('id', ingredientIds)
    .eq('tenant_id', tenantId)

  if (!ingredients) return []

  const ingredientInfo = new Map<string, { name: string; category: string }>()
  for (const ing of ingredients) {
    ingredientInfo.set(ing.id, { name: ing.name, category: ing.category })
  }

  // Step 7: Aggregate ingredients by event
  // ingredient_id -> { total quantity, unit, event ids }
  const aggregation = new Map<
    string,
    { totalQuantity: number; unit: string; eventIds: Set<string> }
  >()

  for (const ri of recipeIngredients) {
    const eventIds = recipeEventMap.get(ri.recipe_id)
    if (!eventIds) continue

    const key = ri.ingredient_id
    if (!aggregation.has(key)) {
      aggregation.set(key, { totalQuantity: 0, unit: ri.unit || '', eventIds: new Set() })
    }

    const agg = aggregation.get(key)!
    agg.totalQuantity += Number(ri.quantity) * eventIds.size
    for (const eid of eventIds) {
      agg.eventIds.add(eid)
    }
  }

  // Step 8: Filter to ingredients appearing in 2+ events
  const opportunities: BatchOpportunity[] = []

  for (const [ingredientId, agg] of aggregation) {
    if (agg.eventIds.size < 2) continue

    const info = ingredientInfo.get(ingredientId)
    if (!info) continue

    const eventList = [...agg.eventIds]
      .map((eid) => eventMap.get(eid))
      .filter(Boolean) as BatchOpportunity['events']

    opportunities.push({
      ingredientId,
      ingredientName: info.name,
      category: info.category,
      totalQuantity: Math.round(agg.totalQuantity * 100) / 100,
      unit: agg.unit,
      eventCount: agg.eventIds.size,
      events: eventList,
    })
  }

  // Sort by event count (desc), then ingredient name
  opportunities.sort((a, b) => {
    if (a.eventCount !== b.eventCount) return b.eventCount - a.eventCount
    return a.ingredientName.localeCompare(b.ingredientName)
  })

  return opportunities
}

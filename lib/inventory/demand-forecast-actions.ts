// Demand Forecast Server Actions
// Chef-only: Predict ingredient needs from upcoming events, suggest reorders, detect shortages

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildStockCoverageMap,
  consolidateIngredientRows,
  estimateIngredientCostCents,
  fetchCurrentStockRows,
  fetchIngredientPlanningMeta,
  getIngredientPlanningKey,
  type IngredientQuantityRow,
} from './planning-support'

export type ForecastItem = {
  ingredientId: string
  ingredientName: string
  unit: string
  totalNeeded: number
  currentStock: number
  deficit: number
  firstEventDate: string | null
  eventCount: number
  estimatedCostCents: number
}

export type ReorderGroup = {
  vendorName: string | null
  vendorId: string | null
  items: Array<{
    ingredientId: string
    ingredientName: string
    deficit: number
    unit: string
    estimatedCostCents: number
  }>
  totalCostCents: number
}

export type ShortageAlert = {
  ingredientId: string
  ingredientName: string
  unit: string
  needed: number
  onHand: number
  shortfall: number
  costImpactCents: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Walk the event -> menu -> dishes -> components -> recipes -> recipe_ingredients chain
 * and return raw ingredient-demand rows plus the event dates that drive each ingredient.
 */
async function aggregateIngredientDemandRows(
  db: any,
  tenantId: string,
  eventFilter: { ids?: string[]; daysAhead?: number }
): Promise<{ rows: IngredientQuantityRow[]; eventDatesByIngredient: Map<string, string[]> }> {
  let eventsQuery = db
    .from('events')
    .select('id, event_date, status')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted'])

  if (eventFilter.ids) {
    eventsQuery = eventsQuery.in('id', eventFilter.ids)
  } else if (eventFilter.daysAhead != null) {
    const now = new Date()
    const formatLocalDate = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

    eventsQuery = eventsQuery
      .gte('event_date', formatLocalDate(now))
      .lte(
        'event_date',
        formatLocalDate(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + eventFilter.daysAhead)
        )
      )
  }

  const { data: events, error: eventsError } = await eventsQuery
  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`)
  if (!events || events.length === 0) return { rows: [], eventDatesByIngredient: new Map() }

  const eventIds = (events as any[]).map((event) => event.id)
  const eventDateMap = new Map<string, string>()
  for (const event of events as any[]) {
    eventDateMap.set(event.id, event.event_date)
  }

  const { data: menus, error: menusError } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (menusError) throw new Error(`Failed to fetch menus: ${menusError.message}`)
  if (!menus || menus.length === 0) return { rows: [], eventDatesByIngredient: new Map() }

  const menuIds = (menus as any[]).map((menu) => menu.id)
  const menuEventMap = new Map<string, string>()
  for (const menu of menus as any[]) {
    menuEventMap.set(menu.id, menu.event_id)
  }

  const { data: dishes, error: dishesError } = await db
    .from('dishes')
    .select('id, menu_id')
    .in('menu_id', menuIds)

  if (dishesError) throw new Error(`Failed to fetch dishes: ${dishesError.message}`)
  if (!dishes || dishes.length === 0) return { rows: [], eventDatesByIngredient: new Map() }

  const dishIds = (dishes as any[]).map((dish) => dish.id)
  const dishMenuMap = new Map<string, string>()
  for (const dish of dishes as any[]) {
    dishMenuMap.set(dish.id, dish.menu_id)
  }

  const { data: components, error: componentsError } = await db
    .from('components')
    .select('dish_id, recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (componentsError) throw new Error(`Failed to fetch components: ${componentsError.message}`)
  if (!components || components.length === 0) return { rows: [], eventDatesByIngredient: new Map() }

  const recipeToUsages = new Map<string, Array<{ scaleFactor: number; eventId: string }>>()
  for (const component of components as any[]) {
    const menuId = dishMenuMap.get(component.dish_id)
    if (!menuId) continue

    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    const usage = {
      scaleFactor: Number(component.scale_factor) || 1,
      eventId,
    }
    const existing = recipeToUsages.get(component.recipe_id) ?? []
    existing.push(usage)
    recipeToUsages.set(component.recipe_id, existing)
  }

  const recipeIds = [...recipeToUsages.keys()]
  if (recipeIds.length === 0) return { rows: [], eventDatesByIngredient: new Map() }

  const { data: recipeIngredients, error: recipeIngredientsError } = await (
    db.from('recipe_ingredients') as any
  )
    .select(
      `
      recipe_id, ingredient_id, quantity, unit,
      ingredient:ingredients(id, name)
    `
    )
    .in('recipe_id', recipeIds)

  if (recipeIngredientsError) {
    throw new Error(
      `Failed to fetch recipe ingredients: ${(recipeIngredientsError as any).message}`
    )
  }
  if (!recipeIngredients) return { rows: [], eventDatesByIngredient: new Map() }

  const rows: IngredientQuantityRow[] = []
  const eventDateSets = new Map<string, Set<string>>()

  for (const recipeIngredient of recipeIngredients as any[]) {
    const ingredient = recipeIngredient.ingredient as any
    if (!ingredient?.id) continue

    const usages = recipeToUsages.get(recipeIngredient.recipe_id) ?? []
    const baseQty = Number(recipeIngredient.quantity) || 0

    for (const usage of usages) {
      const scaledQty = baseQty * usage.scaleFactor
      if (scaledQty === 0) continue

      rows.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: scaledQty,
        unit: recipeIngredient.unit || '',
      })

      const eventDate = eventDateMap.get(usage.eventId)
      if (eventDate) {
        const existing = eventDateSets.get(ingredient.id) ?? new Set<string>()
        existing.add(eventDate)
        eventDateSets.set(ingredient.id, existing)
      }
    }
  }

  return {
    rows,
    eventDatesByIngredient: new Map(
      [...eventDateSets.entries()].map(([ingredientId, dates]) => [ingredientId, [...dates]])
    ),
  }
}

export async function getDemandForecast(daysAhead: number = 14): Promise<ForecastItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { rows, eventDatesByIngredient } = await aggregateIngredientDemandRows(db, user.tenantId!, {
    daysAhead,
  })
  if (rows.length === 0) return []

  const ingredientIds = [...new Set(rows.map((row) => row.ingredientId))]
  const metaByIngredient = await fetchIngredientPlanningMeta(db, ingredientIds)
  const normalizedDemand = consolidateIngredientRows(rows, metaByIngredient)
  const stockRows = await fetchCurrentStockRows(db, user.tenantId!, ingredientIds)
  const stockCoverage = buildStockCoverageMap(normalizedDemand, stockRows, metaByIngredient)

  const result = normalizedDemand.map((need) => {
    const coverage =
      stockCoverage.get(getIngredientPlanningKey(need.ingredientId, need.unit)) ?? null
    const currentStock = Math.max(0, coverage?.onHandQty ?? 0)
    const deficit = Math.max(0, need.quantity - currentStock)
    const eventDates = [...(eventDatesByIngredient.get(need.ingredientId) ?? [])].sort()
    const meta = metaByIngredient.get(need.ingredientId)

    return {
      ingredientId: need.ingredientId,
      ingredientName: need.ingredientName,
      unit: need.unit,
      totalNeeded: round2(need.quantity),
      currentStock: round2(currentStock),
      deficit: round2(deficit),
      firstEventDate: eventDates[0] ?? null,
      eventCount: eventDates.length,
      estimatedCostCents: estimateIngredientCostCents(deficit, need.unit, meta),
    }
  })

  result.sort((a, b) => b.deficit - a.deficit)
  return result
}

/**
 * Get reorder suggestions grouped by vendor.
 * Combines demand forecast (14-day lookahead) with par-level shortfalls from inventory_counts.
 */
export async function getReorderSuggestions(): Promise<ReorderGroup[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const forecast = await getDemandForecast(14)
  const deficitItems = forecast.filter((item) => item.deficit > 0)

  const { data: parAlerts } = await (db.from('inventory_counts') as any)
    .select('ingredient_id, ingredient_name, current_qty, par_level, unit, vendor_id')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)

  const mergedMap = new Map<
    string,
    {
      ingredientId: string
      ingredientName: string
      deficit: number
      unit: string
      estimatedCostCents: number
    }
  >()

  for (const item of deficitItems) {
    mergedMap.set(getIngredientPlanningKey(item.ingredientId, item.unit), {
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      deficit: item.deficit,
      unit: item.unit,
      estimatedCostCents: item.estimatedCostCents,
    })
  }

  for (const row of (parAlerts as any[]) ?? []) {
    const currentQty = Number(row.current_qty) || 0
    const parLevel = Number(row.par_level) || 0
    if (currentQty >= parLevel || !row.ingredient_id) continue

    const parDeficit = parLevel - currentQty
    const key = getIngredientPlanningKey(row.ingredient_id, row.unit || '')

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!
      if (parDeficit > existing.deficit) existing.deficit = parDeficit
    } else {
      mergedMap.set(key, {
        ingredientId: row.ingredient_id,
        ingredientName: row.ingredient_name,
        deficit: parDeficit,
        unit: row.unit,
        estimatedCostCents: 0,
      })
    }
  }

  if (mergedMap.size === 0) return []

  const ingredientIds = [...new Set([...mergedMap.values()].map((item) => item.ingredientId))]
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, preferred_vendor')
    .in('id', ingredientIds)

  const ingredientVendorMap = new Map<string, string | null>()
  for (const ingredient of (ingredients ?? []) as any[]) {
    ingredientVendorMap.set(ingredient.id, ingredient.preferred_vendor ?? null)
  }

  const vendorIds = [
    ...new Set(
      [...ingredientVendorMap.values()].filter((vendorId): vendorId is string => !!vendorId)
    ),
  ]
  const vendorNameMap = new Map<string, string>()

  if (vendorIds.length > 0) {
    const { data: vendors } = await (db.from('vendors') as any)
      .select('id, name')
      .in('id', vendorIds)

    for (const vendor of (vendors ?? []) as any[]) {
      vendorNameMap.set(vendor.id, vendor.name)
    }
  }

  const groups = new Map<string | null, ReorderGroup>()

  for (const item of mergedMap.values()) {
    const vendorId = ingredientVendorMap.get(item.ingredientId) ?? null
    const vendorName = vendorId ? (vendorNameMap.get(vendorId) ?? null) : null

    if (!groups.has(vendorId)) {
      groups.set(vendorId, {
        vendorName,
        vendorId,
        items: [],
        totalCostCents: 0,
      })
    }

    const group = groups.get(vendorId)!
    group.items.push({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      deficit: round3(item.deficit),
      unit: item.unit,
      estimatedCostCents: item.estimatedCostCents,
    })
    group.totalCostCents += item.estimatedCostCents
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.vendorId === null) return 1
    if (b.vendorId === null) return -1
    return (a.vendorName || '').localeCompare(b.vendorName || '')
  })
}

/**
 * Get shortage alerts for a specific event.
 * Walks event -> menu -> recipes -> ingredients and compares to current stock.
 */
export async function getShortageAlerts(eventId: string): Promise<ShortageAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { rows } = await aggregateIngredientDemandRows(db, user.tenantId!, { ids: [eventId] })
  if (rows.length === 0) return []

  const ingredientIds = [...new Set(rows.map((row) => row.ingredientId))]
  const metaByIngredient = await fetchIngredientPlanningMeta(db, ingredientIds)
  const normalizedDemand = consolidateIngredientRows(rows, metaByIngredient)
  const stockRows = await fetchCurrentStockRows(db, user.tenantId!, ingredientIds)
  const stockCoverage = buildStockCoverageMap(normalizedDemand, stockRows, metaByIngredient)

  const alerts: ShortageAlert[] = []

  for (const need of normalizedDemand) {
    const coverage =
      stockCoverage.get(getIngredientPlanningKey(need.ingredientId, need.unit)) ?? null
    const onHand = Math.max(0, coverage?.onHandQty ?? 0)
    if (onHand >= need.quantity) continue

    const shortfall = need.quantity - onHand
    const meta = metaByIngredient.get(need.ingredientId)

    alerts.push({
      ingredientId: need.ingredientId,
      ingredientName: need.ingredientName,
      unit: need.unit,
      needed: round2(need.quantity),
      onHand: round2(onHand),
      shortfall: round2(shortfall),
      costImpactCents: estimateIngredientCostCents(shortfall, need.unit, meta),
    })
  }

  alerts.sort((a, b) => b.costImpactCents - a.costImpactCents)
  return alerts
}

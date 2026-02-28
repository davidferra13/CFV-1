// Demand Forecast Server Actions
// Chef-only: Predict ingredient needs from upcoming events, suggest reorders, detect shortages

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Supabase helper ────────────────────────────────────────────
function db(supabase: any) {
  return {
    transactions: () => supabase.from('inventory_transactions' as any) as any,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Walk the event -> menu -> dishes -> components -> recipes -> recipe_ingredients chain
 * and aggregate ingredient demand. Returns a Map of ingredientId -> aggregate info.
 */
async function aggregateIngredientDemand(
  supabase: any,
  tenantId: string,
  eventFilter: { ids?: string[]; daysAhead?: number }
): Promise<
  Map<
    string,
    {
      ingredientId: string
      ingredientName: string
      unit: string
      totalNeeded: number
      lastPriceCents: number
      eventDates: string[]
    }
  >
> {
  // Fetch upcoming confirmed/paid events within the window
  let eventsQuery = supabase
    .from('events')
    .select('id, event_date, status')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted'])

  if (eventFilter.ids) {
    eventsQuery = eventsQuery.in('id', eventFilter.ids)
  } else if (eventFilter.daysAhead != null) {
    const now = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + eventFilter.daysAhead)
    eventsQuery = eventsQuery
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', cutoff.toISOString().split('T')[0])
  }

  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`)
  if (!events || events.length === 0) return new Map()

  const eventIds = (events as any[]).map((e: any) => e.id)
  const eventDateMap = new Map<string, string>()
  for (const e of events as any[]) {
    eventDateMap.set(e.id, e.event_date)
  }

  // Fetch menus for these events
  const { data: menus, error: menusError } = await supabase
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (menusError) throw new Error(`Failed to fetch menus: ${menusError.message}`)
  if (!menus || menus.length === 0) return new Map()

  const menuIds = (menus as any[]).map((m: any) => m.id)
  const menuEventMap = new Map<string, string>()
  for (const m of menus as any[]) {
    menuEventMap.set(m.id, m.event_id)
  }

  // Fetch dishes
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('id, menu_id')
    .in('menu_id', menuIds)

  if (dishesError) throw new Error(`Failed to fetch dishes: ${dishesError.message}`)
  if (!dishes || dishes.length === 0) return new Map()

  const dishIds = (dishes as any[]).map((d: any) => d.id)
  const dishMenuMap = new Map<string, string>()
  for (const d of dishes as any[]) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  // Fetch components with recipe links and scale factors
  const { data: components, error: compsError } = await supabase
    .from('components')
    .select('id, dish_id, recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (compsError) throw new Error(`Failed to fetch components: ${compsError.message}`)
  if (!components || components.length === 0) return new Map()

  // Build recipe_id -> [{scaleFactor, eventId}]
  const recipeToUsages = new Map<string, Array<{ scaleFactor: number; eventId: string }>>()
  for (const comp of components as any[]) {
    const menuId = dishMenuMap.get(comp.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    const usage = {
      scaleFactor: Number(comp.scale_factor) || 1,
      eventId,
    }
    const existing = recipeToUsages.get(comp.recipe_id) || []
    existing.push(usage)
    recipeToUsages.set(comp.recipe_id, existing)
  }

  const recipeIds = [...recipeToUsages.keys()]
  if (recipeIds.length === 0) return new Map()

  // Fetch recipe_ingredients with ingredient details
  const { data: recipeIngredients, error: riError } = await (
    supabase.from('recipe_ingredients') as any
  )
    .select(
      `
      recipe_id, ingredient_id, quantity, unit,
      ingredient:ingredients(id, name, last_price_cents)
    `
    )
    .in('recipe_id', recipeIds)

  if (riError) throw new Error(`Failed to fetch recipe ingredients: ${(riError as any).message}`)
  if (!recipeIngredients) return new Map()

  // Aggregate by ingredient across all recipe usages
  const demand = new Map<
    string,
    {
      ingredientId: string
      ingredientName: string
      unit: string
      totalNeeded: number
      lastPriceCents: number
      eventDates: string[]
    }
  >()

  for (const ri of recipeIngredients as any[]) {
    const ingredient = ri.ingredient as any
    if (!ingredient || !ingredient.id) continue

    const usages = recipeToUsages.get(ri.recipe_id) || []
    const qty = Number(ri.quantity) || 0

    for (const usage of usages) {
      const scaledQty = qty * usage.scaleFactor
      const eventDate = eventDateMap.get(usage.eventId) || null

      const existing = demand.get(ingredient.id) || {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ri.unit || '',
        totalNeeded: 0,
        lastPriceCents: Number(ingredient.last_price_cents) || 0,
        eventDates: [] as string[],
      }

      existing.totalNeeded += scaledQty
      if (eventDate && !existing.eventDates.includes(eventDate)) {
        existing.eventDates.push(eventDate)
      }

      demand.set(ingredient.id, existing)
    }
  }

  return demand
}

/**
 * Get current on-hand stock for a set of ingredient IDs by summing inventory_transactions.
 */
async function getCurrentStock(
  supabase: any,
  tenantId: string,
  ingredientIds: string[]
): Promise<Map<string, number>> {
  const stockMap = new Map<string, number>()
  if (ingredientIds.length === 0) return stockMap

  // Sum inventory_transactions per ingredient
  const { data: transactions, error } = await db(supabase)
    .transactions()
    .select('ingredient_id, quantity')
    .eq('chef_id', tenantId)
    .in('ingredient_id', ingredientIds)

  if (error) {
    console.error(
      '[getCurrentStock] Failed to fetch inventory transactions:',
      (error as any).message
    )
    return stockMap
  }

  for (const tx of (transactions as any[]) || []) {
    if (!tx.ingredient_id) continue
    const current = stockMap.get(tx.ingredient_id) || 0
    stockMap.set(tx.ingredient_id, current + (Number(tx.quantity) || 0))
  }

  return stockMap
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Get demand forecast for the next N days.
 * Walks upcoming events -> menus -> dishes -> components -> recipes -> recipe_ingredients.
 * Compares to current stock (from inventory_transactions).
 * Returns ForecastItem[] with deficit = max(0, totalNeeded - currentStock).
 */
export async function getDemandForecast(daysAhead: number = 14): Promise<ForecastItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const demand = await aggregateIngredientDemand(supabase, user.tenantId!, { daysAhead })

  if (demand.size === 0) return []

  const ingredientIds = [...demand.keys()]
  const stockMap = await getCurrentStock(supabase, user.tenantId!, ingredientIds)

  const result: ForecastItem[] = []

  for (const [ingredientId, info] of demand.entries()) {
    const currentStock = Math.max(0, stockMap.get(ingredientId) || 0)
    const deficit = Math.max(0, info.totalNeeded - currentStock)
    const estimatedCostCents = Math.round(deficit * info.lastPriceCents)

    // Sort event dates to get the first one
    const sortedDates = info.eventDates.sort()

    result.push({
      ingredientId,
      ingredientName: info.ingredientName,
      unit: info.unit,
      totalNeeded: Math.round(info.totalNeeded * 100) / 100,
      currentStock: Math.round(currentStock * 100) / 100,
      deficit: Math.round(deficit * 100) / 100,
      firstEventDate: sortedDates[0] ?? null,
      eventCount: info.eventDates.length,
      estimatedCostCents,
    })
  }

  // Sort by deficit descending (most urgent first)
  result.sort((a, b) => b.deficit - a.deficit)

  return result
}

/**
 * Get reorder suggestions grouped by vendor.
 * Combines demand forecast (14-day lookahead) with par-level shortfalls from inventory_counts.
 * Groups by ingredient's preferred vendor for easy ordering.
 */
export async function getReorderSuggestions(): Promise<ReorderGroup[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get demand forecast items with a deficit
  const forecast = await getDemandForecast(14)
  const deficitItems = forecast.filter((item) => item.deficit > 0)

  // Also check inventory_counts for items below par_level
  const { data: parAlerts } = await (supabase.from('inventory_counts') as any)
    .select('ingredient_id, ingredient_name, current_qty, par_level, unit, vendor_id')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)

  // Merge par-level shortfalls into the deficit items map
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

  // Add forecast deficits
  for (const item of deficitItems) {
    mergedMap.set(item.ingredientId, {
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      deficit: item.deficit,
      unit: item.unit,
      estimatedCostCents: item.estimatedCostCents,
    })
  }

  // Add par-level shortfalls (merge if already in forecast)
  for (const row of (parAlerts as any[]) || []) {
    const currentQty = Number(row.current_qty) || 0
    const parLevel = Number(row.par_level) || 0
    if (currentQty >= parLevel) continue
    if (!row.ingredient_id) continue

    const parDeficit = parLevel - currentQty

    if (mergedMap.has(row.ingredient_id)) {
      // Take the larger deficit between forecast and par-level
      const existing = mergedMap.get(row.ingredient_id)!
      if (parDeficit > existing.deficit) {
        existing.deficit = parDeficit
      }
    } else {
      mergedMap.set(row.ingredient_id, {
        ingredientId: row.ingredient_id,
        ingredientName: row.ingredient_name,
        deficit: parDeficit,
        unit: row.unit,
        estimatedCostCents: 0, // no price data from par alerts alone
      })
    }
  }

  if (mergedMap.size === 0) return []

  // Look up preferred vendors for these ingredients
  // Note: ingredients table has preferred_vendor (not preferred_vendor_id)
  const ingredientIds = [...mergedMap.keys()]

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, preferred_vendor')
    .in('id', ingredientIds)

  // Build ingredient -> vendorId mapping
  const ingredientVendorMap = new Map<string, string | null>()
  for (const ing of (ingredients as any[]) || []) {
    ingredientVendorMap.set(ing.id, ing.preferred_vendor ?? null)
  }

  // Fetch vendor names
  const vendorIds = [
    ...new Set([...ingredientVendorMap.values()].filter((id): id is string => !!id)),
  ]
  const vendorNameMap = new Map<string, string>()

  if (vendorIds.length > 0) {
    const { data: vendors } = await (supabase.from('vendors') as any)
      .select('id, name')
      .in('id', vendorIds)

    for (const v of (vendors as any[]) || []) {
      vendorNameMap.set(v.id, v.name)
    }
  }

  // Group items by vendor
  const groups = new Map<string | null, ReorderGroup>()

  for (const [ingredientId, item] of mergedMap.entries()) {
    const vendorId = ingredientVendorMap.get(ingredientId) ?? null
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
      deficit: item.deficit,
      unit: item.unit,
      estimatedCostCents: item.estimatedCostCents,
    })
    group.totalCostCents += item.estimatedCostCents
  }

  // Sort: named vendors first, null vendor last
  return Array.from(groups.values()).sort((a, b) => {
    if (a.vendorId === null) return 1
    if (b.vendorId === null) return -1
    return (a.vendorName || '').localeCompare(b.vendorName || '')
  })
}

/**
 * Get shortage alerts for a specific event.
 * Walks event -> menu -> recipes -> ingredients and compares to current stock.
 * Returns items where on-hand stock is less than what the event requires.
 */
export async function getShortageAlerts(eventId: string): Promise<ShortageAlert[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const demand = await aggregateIngredientDemand(supabase, user.tenantId!, { ids: [eventId] })

  if (demand.size === 0) return []

  const ingredientIds = [...demand.keys()]
  const stockMap = await getCurrentStock(supabase, user.tenantId!, ingredientIds)

  const alerts: ShortageAlert[] = []

  for (const [ingredientId, info] of demand.entries()) {
    const onHand = Math.max(0, stockMap.get(ingredientId) || 0)

    if (onHand >= info.totalNeeded) continue // no shortage

    const shortfall = info.totalNeeded - onHand
    const costImpactCents = Math.round(shortfall * info.lastPriceCents)

    alerts.push({
      ingredientId,
      ingredientName: info.ingredientName,
      unit: info.unit,
      needed: Math.round(info.totalNeeded * 100) / 100,
      onHand: Math.round(onHand * 100) / 100,
      shortfall: Math.round(shortfall * 100) / 100,
      costImpactCents,
    })
  }

  // Sort by cost impact descending
  alerts.sort((a, b) => b.costImpactCents - a.costImpactCents)

  return alerts
}

// Stock Lookup Actions
// Cross-reference between recipe ingredients and inventory.
// Combines inventory_current_stock (transaction ledger), inventory_counts, and pantry_items
// to give a unified on-hand picture per ingredient.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type IngredientStockStatus = {
  ingredientId: string
  ingredientName: string
  onHand: number
  unit: string
  /** 'stocked' = on-hand covers need, 'partial' = some on hand, 'none' = nothing tracked */
  status: 'stocked' | 'partial' | 'none'
  sources: Array<{ source: 'ledger' | 'counts' | 'pantry'; qty: number; unit: string }>
}

/**
 * Get aggregated on-hand stock for a list of ingredient IDs.
 * Pulls from three sources:
 *   1. inventory_current_stock view (transaction ledger sums)
 *   2. inventory_counts (manual count entries)
 *   3. pantry_items (location-based pantry tracking)
 *
 * Returns a map of ingredientId -> IngredientStockStatus
 */
export async function getStockForIngredients(
  ingredientIds: string[]
): Promise<Map<string, IngredientStockStatus>> {
  const result = new Map<string, IngredientStockStatus>()
  if (ingredientIds.length === 0) return result

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch all three sources in parallel
  const [ledgerResult, countsResult, pantryResult, ingredientNames] = await Promise.all([
    db
      .from('inventory_current_stock' as any)
      .select('ingredient_id, unit, current_qty')
      .eq('chef_id', tenantId)
      .in('ingredient_id', ingredientIds)
      .then((r: any) => r.data ?? [])
      .catch(() => []),
    db
      .from('inventory_counts')
      .select('ingredient_id, ingredient_name, current_qty, unit')
      .eq('chef_id', tenantId)
      .in('ingredient_id', ingredientIds)
      .then((r: any) => r.data ?? [])
      .catch(() => []),
    db
      .from('pantry_items')
      .select('ingredient_id, name, quantity, unit')
      .eq('tenant_id', tenantId)
      .in('ingredient_id', ingredientIds)
      .gt('quantity', 0)
      .then((r: any) => r.data ?? [])
      .catch(() => []),
    db
      .from('ingredients')
      .select('id, name, default_unit')
      .in('id', ingredientIds)
      .then((r: any) => r.data ?? [])
      .catch(() => []),
  ])

  // Build name/unit lookup
  const nameMap = new Map<string, { name: string; unit: string }>()
  for (const row of ingredientNames as any[]) {
    nameMap.set(row.id, { name: row.name, unit: row.default_unit ?? 'unit' })
  }

  // Initialize all requested ingredients
  for (const id of ingredientIds) {
    const info = nameMap.get(id)
    result.set(id, {
      ingredientId: id,
      ingredientName: info?.name ?? 'Unknown',
      onHand: 0,
      unit: info?.unit ?? 'unit',
      status: 'none',
      sources: [],
    })
  }

  // Aggregate ledger stock
  for (const row of ledgerResult as any[]) {
    if (!row.ingredient_id) continue
    const entry = result.get(row.ingredient_id)
    if (!entry) continue
    const qty = Number(row.current_qty) || 0
    if (qty > 0) {
      entry.onHand += qty
      entry.sources.push({ source: 'ledger', qty, unit: row.unit ?? entry.unit })
    }
  }

  // Aggregate inventory counts (only if no ledger data for that ingredient, to avoid double-counting)
  for (const row of countsResult as any[]) {
    if (!row.ingredient_id) continue
    const entry = result.get(row.ingredient_id)
    if (!entry) continue
    const hasLedger = entry.sources.some((s) => s.source === 'ledger')
    if (hasLedger) continue // ledger is authoritative when present
    const qty = Number(row.current_qty) || 0
    if (qty > 0) {
      entry.onHand += qty
      entry.sources.push({ source: 'counts', qty, unit: row.unit ?? entry.unit })
    }
  }

  // Aggregate pantry items (additive; pantry is a separate tracking layer)
  for (const row of pantryResult as any[]) {
    if (!row.ingredient_id) continue
    const entry = result.get(row.ingredient_id)
    if (!entry) continue
    const qty = Number(row.quantity) || 0
    if (qty > 0) {
      entry.onHand += qty
      entry.sources.push({ source: 'pantry', qty, unit: row.unit ?? entry.unit })
    }
  }

  // Set status
  for (const [, entry] of result) {
    if (entry.onHand > 0) {
      entry.status = 'stocked'
    }
    // status stays 'none' if nothing tracked
  }

  return result
}

/**
 * For a recipe's ingredient list, compute stock coverage.
 * Returns per-ingredient: needed qty, on-hand qty, deficit, and a color status.
 */
export type RecipeStockItem = {
  ingredientId: string
  ingredientName: string
  neededQty: number
  neededUnit: string
  onHandQty: number
  deficit: number
  /** 'green' = fully stocked, 'yellow' = partial, 'red' = nothing on hand */
  color: 'green' | 'yellow' | 'red'
}

export async function getRecipeStockCoverage(
  recipeIngredients: Array<{
    ingredientId: string | null
    ingredientName: string
    quantity: number | null
    unit: string | null
  }>
): Promise<RecipeStockItem[]> {
  const validIngredients = recipeIngredients.filter((ri) => ri.ingredientId)
  if (validIngredients.length === 0) return []

  const ingredientIds = validIngredients
    .map((ri) => ri.ingredientId!)
    .filter((id, i, arr) => arr.indexOf(id) === i)

  const stockMap = await getStockForIngredients(ingredientIds)

  return validIngredients.map((ri) => {
    const stock = stockMap.get(ri.ingredientId!)
    const neededQty = Number(ri.quantity) || 0
    const onHandQty = stock?.onHand ?? 0
    const deficit = Math.max(0, neededQty - onHandQty)

    let color: 'green' | 'yellow' | 'red'
    if (onHandQty <= 0) {
      color = 'red'
    } else if (onHandQty >= neededQty && neededQty > 0) {
      color = 'green'
    } else {
      color = 'yellow'
    }

    // If no quantity specified in recipe, just show if we have any
    if (neededQty === 0 && onHandQty > 0) {
      color = 'green'
    }

    return {
      ingredientId: ri.ingredientId!,
      ingredientName: ri.ingredientName,
      neededQty,
      neededUnit: ri.unit ?? 'unit',
      onHandQty,
      deficit,
      color,
    }
  })
}

/**
 * Get upcoming event usage for a list of ingredient IDs.
 * Returns which upcoming events (next 30 days) use each ingredient, with links.
 */
export type IngredientEventUsage = {
  ingredientId: string
  events: Array<{
    eventId: string
    occasion: string | null
    eventDate: string
    recipeName: string
    recipeId: string
  }>
}

export async function getUpcomingEventUsageForIngredients(
  ingredientIds: string[]
): Promise<Map<string, IngredientEventUsage>> {
  const result = new Map<string, IngredientEventUsage>()
  if (ingredientIds.length === 0) return result

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Initialize
  for (const id of ingredientIds) {
    result.set(id, { ingredientId: id, events: [] })
  }

  const now = new Date()
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const startDate = formatDate(now)
  const endDate = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30))

  // Get upcoming events
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted'])
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  if (!events || events.length === 0) return result

  const eventIds = (events as any[]).map((e) => e.id)
  const eventMap = new Map<string, any>()
  for (const e of events as any[]) {
    eventMap.set(e.id, e)
  }

  // Walk: events -> menus -> dishes -> components -> recipes -> recipe_ingredients
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (!menus || menus.length === 0) return result

  const menuEventMap = new Map<string, string>()
  for (const m of menus as any[]) {
    menuEventMap.set(m.id, m.event_id)
  }

  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id')
    .in(
      'menu_id',
      (menus as any[]).map((m: any) => m.id)
    )

  if (!dishes || dishes.length === 0) return result

  const dishMenuMap = new Map<string, string>()
  for (const d of dishes as any[]) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id')
    .in(
      'dish_id',
      (dishes as any[]).map((d: any) => d.id)
    )
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return result

  // Map recipe_id -> event_ids
  const recipeEventMap = new Map<string, Set<string>>()
  for (const c of components as any[]) {
    const menuId = dishMenuMap.get(c.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue
    const existing = recipeEventMap.get(c.recipe_id) ?? new Set()
    existing.add(eventId)
    recipeEventMap.set(c.recipe_id, existing)
  }

  const recipeIds = [...recipeEventMap.keys()]
  if (recipeIds.length === 0) return result

  // Get recipe ingredients for our target ingredients
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id')
    .in('recipe_id', recipeIds)
    .in('ingredient_id', ingredientIds)

  if (!recipeIngredients || recipeIngredients.length === 0) return result

  // Get recipe names
  const { data: recipeRows } = await db.from('recipes').select('id, name').in('id', recipeIds)

  const recipeNameMap = new Map<string, string>()
  for (const r of (recipeRows ?? []) as any[]) {
    recipeNameMap.set(r.id, r.name)
  }

  // Build the result
  for (const ri of recipeIngredients as any[]) {
    if (!ri.ingredient_id || !ri.recipe_id) continue
    const entry = result.get(ri.ingredient_id)
    if (!entry) continue

    const eventIdsForRecipe = recipeEventMap.get(ri.recipe_id)
    if (!eventIdsForRecipe) continue

    for (const eventId of eventIdsForRecipe) {
      const event = eventMap.get(eventId)
      if (!event) continue

      // Avoid duplicate event+recipe combos
      const isDupe = entry.events.some((e) => e.eventId === eventId && e.recipeId === ri.recipe_id)
      if (isDupe) continue

      entry.events.push({
        eventId,
        occasion: event.occasion,
        eventDate: event.event_date,
        recipeName: recipeNameMap.get(ri.recipe_id) ?? 'Unknown recipe',
        recipeId: ri.recipe_id,
      })
    }
  }

  // Sort events by date
  for (const [, entry] of result) {
    entry.events.sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  }

  return result
}

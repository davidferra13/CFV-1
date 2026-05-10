'use server'

// Par Level Suggestions Server Actions
// Suggest par levels based on recipe frequency and upcoming event density.
// Formula: (avg weekly usage from past events) * 1.5 safety multiplier

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type ParSuggestion = {
  ingredientId: string
  ingredientName: string
  unit: string
  currentPar: number | null
  suggestedPar: number
  weeklyAvgUsage: number
  recipeCount: number
  eventCount: number
  reason: string
}

/**
 * Suggest par levels based on recipe frequency and event density from the last 90 days.
 * Walks: events -> menus -> dishes -> components -> recipes -> recipe_ingredients
 * Compares suggested par (avgWeeklyUsage * 1.5) to current par levels.
 * Returns items where no par is set, or suggested > current by 20%+.
 */
export async function getParLevelSuggestions(): Promise<ParSuggestion[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get events from the last 90 days (completed, confirmed, paid, accepted)
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted', 'completed'])
    .gte('event_date', formatDate(ninetyDaysAgo))
    .lte('event_date', formatDate(now))

  if (eventsError || !events || events.length === 0) return []

  const eventIds = (events as any[]).map((e) => e.id)

  // 2. Walk event -> menu -> dish -> component -> recipe -> recipe_ingredients
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (!menus || menus.length === 0) return []

  const menuIds = (menus as any[]).map((m) => m.id)
  const menuEventMap = new Map<string, string>()
  for (const m of menus as any[]) {
    menuEventMap.set(m.id, m.event_id)
  }

  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return []

  const dishIds = (dishes as any[]).map((d) => d.id)
  const dishMenuMap = new Map<string, string>()
  for (const d of dishes as any[]) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  // Map recipe -> list of event IDs it was used in
  const recipeEventUsages = new Map<string, Set<string>>()
  for (const comp of components as any[]) {
    const menuId = dishMenuMap.get(comp.dish_id)
    if (!menuId) continue
    const eventId = menuEventMap.get(menuId)
    if (!eventId) continue

    const existing = recipeEventUsages.get(comp.recipe_id) ?? new Set<string>()
    existing.add(eventId)
    recipeEventUsages.set(comp.recipe_id, existing)
  }

  const recipeIds = [...recipeEventUsages.keys()]
  if (recipeIds.length === 0) return []

  // 3. Get recipe ingredients with scale factors
  const { data: recipeIngredients } = await (db.from('recipe_ingredients') as any)
    .select(`recipe_id, ingredient_id, quantity, unit, ingredient:ingredients(id, name)`)
    .in('recipe_id', recipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) return []

  // 4. Aggregate usage per ingredient across events
  type IngredientUsage = {
    ingredientId: string
    ingredientName: string
    unit: string
    totalQty: number
    recipeIds: Set<string>
    eventIds: Set<string>
  }

  const usageMap = new Map<string, IngredientUsage>()

  for (const ri of recipeIngredients as any[]) {
    const ingredient = ri.ingredient as any
    if (!ingredient?.id) continue

    const baseQty = Number(ri.quantity) || 0
    if (baseQty === 0) continue

    const recipeUsages = recipeEventUsages.get(ri.recipe_id)
    if (!recipeUsages || recipeUsages.size === 0) continue

    // Find scale factors for this recipe
    const relevantComponents = (components as any[]).filter((c) => c.recipe_id === ri.recipe_id)

    for (const comp of relevantComponents) {
      const menuId = dishMenuMap.get(comp.dish_id)
      if (!menuId) continue
      const eventId = menuEventMap.get(menuId)
      if (!eventId) continue

      const scaleFactor = Number(comp.scale_factor) || 1
      const scaledQty = baseQty * scaleFactor

      const key = ingredient.id
      const existing = usageMap.get(key)
      if (existing) {
        existing.totalQty += scaledQty
        existing.recipeIds.add(ri.recipe_id)
        existing.eventIds.add(eventId)
      } else {
        usageMap.set(key, {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ri.unit || '',
          totalQty: scaledQty,
          recipeIds: new Set([ri.recipe_id]),
          eventIds: new Set([eventId]),
        })
      }
    }
  }

  if (usageMap.size === 0) return []

  // 5. Get current par levels from inventory_counts
  const ingredientIds = [...usageMap.keys()]
  const { data: inventoryCounts } = await db
    .from('inventory_counts')
    .select('ingredient_id, par_level')
    .eq('chef_id', tenantId)
    .in('ingredient_id', ingredientIds)

  const currentParMap = new Map<string, number | null>()
  for (const row of (inventoryCounts ?? []) as any[]) {
    if (row.ingredient_id) {
      currentParMap.set(row.ingredient_id, row.par_level != null ? Number(row.par_level) : null)
    }
  }

  // 6. Compute suggestions: avgWeeklyUsage * 1.5 safety multiplier
  const weeksInPeriod = 90 / 7 // ~12.86 weeks
  const suggestions: ParSuggestion[] = []

  for (const usage of usageMap.values()) {
    const weeklyAvgUsage = usage.totalQty / weeksInPeriod
    const suggestedPar = Math.ceil(weeklyAvgUsage * 1.5 * 10) / 10 // round to 1 decimal
    const currentPar = currentParMap.get(usage.ingredientId) ?? null

    // Only suggest if: no par set, or suggested exceeds current by 20%+
    const shouldSuggest = currentPar === null || suggestedPar > currentPar * 1.2

    if (!shouldSuggest) continue

    const recipeCount = usage.recipeIds.size
    const eventCount = usage.eventIds.size
    const eventsPerMonth = Math.round((eventCount / 90) * 30)

    let reason: string
    if (currentPar === null) {
      reason = `Used in ${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}, ${eventsPerMonth} events/month; no par set`
    } else {
      reason = `Used in ${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}, ${eventsPerMonth} events/month; current par too low`
    }

    suggestions.push({
      ingredientId: usage.ingredientId,
      ingredientName: usage.ingredientName,
      unit: usage.unit,
      currentPar,
      suggestedPar,
      weeklyAvgUsage: Math.round(weeklyAvgUsage * 100) / 100,
      recipeCount,
      eventCount,
      reason,
    })
  }

  // Sort by largest gap (suggested - current), no-par items first
  suggestions.sort((a, b) => {
    const gapA = a.suggestedPar - (a.currentPar ?? 0)
    const gapB = b.suggestedPar - (b.currentPar ?? 0)
    return gapB - gapA
  })

  return suggestions.slice(0, 10)
}

/**
 * Apply a suggested par level to an ingredient's inventory count.
 */
export async function applyParSuggestion(
  ingredientId: string,
  suggestedPar: number
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Check if inventory_counts row exists for this ingredient
  const { data: existing } = await db
    .from('inventory_counts')
    .select('id')
    .eq('chef_id', tenantId)
    .eq('ingredient_id', ingredientId)
    .maybeSingle()

  if (existing) {
    // Update existing row
    const { error } = await db
      .from('inventory_counts')
      .update({ par_level: suggestedPar })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    // Get ingredient name for the new row
    const { data: ingredient } = await db
      .from('ingredients')
      .select('name')
      .eq('id', ingredientId)
      .single()

    if (!ingredient) return { success: false, error: 'Ingredient not found' }

    const { error } = await (db.from('inventory_counts') as any).insert({
      chef_id: tenantId,
      ingredient_id: ingredientId,
      ingredient_name: (ingredient as any).name,
      current_qty: 0,
      par_level: suggestedPar,
      unit: '',
      last_counted_at: new Date().toISOString(),
    })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/inventory')
  return { success: true }
}

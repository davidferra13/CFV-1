'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface RepeatMenuResult {
  hasRepeats: boolean
  overlaps: {
    pastEventId: string
    pastEventDate: string
    pastMenuName: string
    sharedRecipes: { recipeId: string; recipeName: string }[]
    overlapPercentage: number
  }[]
  suggestions: string[]
}

export interface ClientMenuHistoryEntry {
  eventId: string
  eventDate: string
  eventOccasion: string | null
  menuId: string
  menuName: string
  dishes: {
    dishId: string
    courseName: string
    courseNumber: number
    dishName: string | null
    components: {
      componentId: string
      componentName: string
      recipeId: string | null
      recipeName: string | null
    }[]
  }[]
}

// ============================================
// BULK DATA HELPERS
// ============================================

/**
 * Bulk-fetch the recipe map for multiple menus at once.
 * Returns a Map<menuId, Map<recipeId, recipeName>>.
 * Issues 4 queries total regardless of how many menus.
 */
async function getRecipeMapsForMenus(
  supabase: any,
  menuIds: string[],
  tenantId: string
): Promise<{
  menuRecipeMaps: Map<string, Map<string, string>>
  menuNameMap: Map<string, string>
}> {
  if (menuIds.length === 0) {
    return { menuRecipeMaps: new Map(), menuNameMap: new Map() }
  }

  // Bulk query 1: all menu names
  const { data: menus } = await supabase
    .from('menus')
    .select('id, name')
    .in('id', menuIds)
    .eq('tenant_id', tenantId)

  const menuNameMap = new Map<string, string>()
  for (const m of menus ?? []) {
    menuNameMap.set(m.id, m.name)
  }

  // Bulk query 2: all dishes for all menus
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, menu_id')
    .in('menu_id', menuIds)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) {
    return { menuRecipeMaps: new Map(), menuNameMap }
  }

  const menuToDishIds = new Map<string, string[]>()
  const allDishIds: string[] = []
  for (const d of dishes) {
    const existing = menuToDishIds.get(d.menu_id) ?? []
    existing.push(d.id)
    menuToDishIds.set(d.menu_id, existing)
    allDishIds.push(d.id)
  }

  // Bulk query 3: all components with recipe links for all dishes
  const { data: components } = await supabase
    .from('components')
    .select('dish_id, recipe_id')
    .in('dish_id', allDishIds)
    .eq('tenant_id', tenantId)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) {
    return { menuRecipeMaps: new Map(), menuNameMap }
  }

  // Build dish -> recipeIds map
  const dishToRecipeIds = new Map<string, Set<string>>()
  const allRecipeIds = new Set<string>()
  for (const c of components) {
    if (!c.recipe_id) continue
    const existing = dishToRecipeIds.get(c.dish_id) ?? new Set()
    existing.add(c.recipe_id)
    dishToRecipeIds.set(c.dish_id, existing)
    allRecipeIds.add(c.recipe_id)
  }

  if (allRecipeIds.size === 0) {
    return { menuRecipeMaps: new Map(), menuNameMap }
  }

  // Bulk query 4: all recipe names
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .in('id', [...allRecipeIds])
    .eq('tenant_id', tenantId)

  const recipeNameMap = new Map<string, string>()
  for (const r of recipes ?? []) {
    recipeNameMap.set(r.id, r.name)
  }

  // Assemble per-menu recipe maps in memory
  const menuRecipeMaps = new Map<string, Map<string, string>>()
  for (const menuId of menuIds) {
    const dishIds = menuToDishIds.get(menuId) ?? []
    const recipeMap = new Map<string, string>()
    for (const dishId of dishIds) {
      const recipeIds = dishToRecipeIds.get(dishId)
      if (!recipeIds) continue
      for (const recipeId of recipeIds) {
        const name = recipeNameMap.get(recipeId)
        if (name) recipeMap.set(recipeId, name)
      }
    }
    menuRecipeMaps.set(menuId, recipeMap)
  }

  return { menuRecipeMaps, menuNameMap }
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Check if the menu for a given event repeats recipes from past menus
 * served to the same client.
 *
 * Pure deterministic logic. No AI involved.
 * Bulk-fetched: 6 queries total regardless of past event count.
 */
export async function checkRepeatMenu(eventId: string): Promise<RepeatMenuResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // 1. Get the current event and its menu
  const { data: currentEvent } = await supabase
    .from('events')
    .select('id, client_id, menu_id, event_date, occasion')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!currentEvent || !currentEvent.menu_id) {
    return { hasRepeats: false, overlaps: [], suggestions: [] }
  }

  // 2. Find all past events for this client that have a menu
  const { data: pastEvents } = await supabase
    .from('events')
    .select('id, event_date, occasion, menu_id')
    .eq('client_id', currentEvent.client_id)
    .eq('tenant_id', tenantId)
    .not('menu_id', 'is', null)
    .neq('id', eventId)
    .lt('event_date', currentEvent.event_date)
    .order('event_date', { ascending: false })

  if (!pastEvents || pastEvents.length === 0) {
    return { hasRepeats: false, overlaps: [], suggestions: [] }
  }

  // 3. Collect all menu IDs (current + past) and bulk-fetch everything
  const allMenuIds = [
    currentEvent.menu_id,
    ...pastEvents.map((e: any) => e.menu_id).filter(Boolean),
  ]
  const uniqueMenuIds = [...new Set(allMenuIds)]

  const { menuRecipeMaps, menuNameMap } = await getRecipeMapsForMenus(
    supabase,
    uniqueMenuIds,
    tenantId
  )

  const currentRecipes = menuRecipeMaps.get(currentEvent.menu_id) ?? new Map()

  if (currentRecipes.size === 0) {
    return { hasRepeats: false, overlaps: [], suggestions: [] }
  }

  // 4. Compare in memory (zero additional queries)
  const overlaps: RepeatMenuResult['overlaps'] = []
  const allSharedRecipeIds = new Set<string>()

  for (const pastEvent of pastEvents) {
    if (!pastEvent.menu_id) continue

    const pastMenuName = menuNameMap.get(pastEvent.menu_id)
    if (!pastMenuName) continue

    const pastRecipes = menuRecipeMaps.get(pastEvent.menu_id) ?? new Map()

    // Find intersection
    const shared: { recipeId: string; recipeName: string }[] = []
    for (const [recipeId, recipeName] of currentRecipes) {
      if (pastRecipes.has(recipeId)) {
        shared.push({ recipeId, recipeName })
        allSharedRecipeIds.add(recipeId)
      }
    }

    if (shared.length > 0) {
      const overlapPercentage = Math.round((shared.length / currentRecipes.size) * 100)
      overlaps.push({
        pastEventId: pastEvent.id,
        pastEventDate: pastEvent.event_date,
        pastMenuName,
        sharedRecipes: shared,
        overlapPercentage,
      })
    }
  }

  // 5. Build suggestions
  const suggestions: string[] = []
  for (const recipeId of allSharedRecipeIds) {
    const recipeName = currentRecipes.get(recipeId)
    const mostRecent = overlaps.find((o) => o.sharedRecipes.some((r) => r.recipeId === recipeId))
    if (recipeName && mostRecent) {
      const dateStr = new Date(mostRecent.pastEventDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      suggestions.push(`Consider swapping ${recipeName} - served to this client on ${dateStr}`)
    }
  }

  return {
    hasRepeats: overlaps.length > 0,
    overlaps,
    suggestions,
  }
}

/**
 * Get full menu history for a client, including dishes and linked recipes.
 * Used for the client detail page "Menu History" section.
 *
 * Bulk-fetched: 5 queries total regardless of event/dish count.
 */
export async function getClientMenuHistory(clientId: string): Promise<ClientMenuHistoryEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Query 1: Get all events for this client that have a menu
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, menu_id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .not('menu_id', 'is', null)
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) return []

  const menuIds = [...new Set(events.map((e: any) => e.menu_id).filter(Boolean))] as string[]
  if (menuIds.length === 0) return []

  // Query 2: All menus in one shot
  const { data: menus } = await supabase
    .from('menus')
    .select('id, name')
    .in('id', menuIds)
    .eq('tenant_id', tenantId)

  const menuMap = new Map<string, { id: string; name: string }>()
  for (const m of menus ?? []) {
    menuMap.set(m.id, m)
  }

  // Query 3: All dishes for all menus in one shot
  const { data: allDishes } = await supabase
    .from('dishes')
    .select('id, menu_id, course_name, course_number, name, sort_order')
    .in('menu_id', menuIds)
    .eq('tenant_id', tenantId)

  const allDishIds = (allDishes ?? []).map((d: any) => d.id)

  // Group dishes by menu_id, sorted by course_number then sort_order
  const menuToDishes = new Map<string, any[]>()
  for (const d of allDishes ?? []) {
    const existing = menuToDishes.get(d.menu_id) ?? []
    existing.push(d)
    menuToDishes.set(d.menu_id, existing)
  }
  for (const [, dishes] of menuToDishes) {
    dishes.sort(
      (a: any, b: any) =>
        (a.course_number ?? 0) - (b.course_number ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )
  }

  // Query 4: All components for all dishes in one shot
  let dishToComponents = new Map<string, any[]>()
  const allRecipeIds = new Set<string>()

  if (allDishIds.length > 0) {
    const { data: allComponents } = await supabase
      .from('components')
      .select('id, dish_id, name, recipe_id, sort_order')
      .in('dish_id', allDishIds)
      .eq('tenant_id', tenantId)

    for (const c of allComponents ?? []) {
      const existing = dishToComponents.get(c.dish_id) ?? []
      existing.push(c)
      dishToComponents.set(c.dish_id, existing)
      if (c.recipe_id) allRecipeIds.add(c.recipe_id)
    }
    // Sort components by sort_order within each dish
    for (const [, comps] of dishToComponents) {
      comps.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
  }

  // Query 5: All recipe names in one shot
  let recipeNameMap = new Map<string, string>()
  if (allRecipeIds.size > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name')
      .in('id', [...allRecipeIds])
      .eq('tenant_id', tenantId)

    for (const r of recipes ?? []) {
      recipeNameMap.set(r.id, r.name)
    }
  }

  // Assemble everything in memory (zero additional queries)
  const entries: ClientMenuHistoryEntry[] = []

  for (const event of events) {
    if (!event.menu_id) continue

    const menu = menuMap.get(event.menu_id)
    if (!menu) continue

    const dishes = menuToDishes.get(menu.id) ?? []

    const dishEntries: ClientMenuHistoryEntry['dishes'] = dishes.map((dish: any) => {
      const components = dishToComponents.get(dish.id) ?? []
      return {
        dishId: dish.id,
        courseName: dish.course_name,
        courseNumber: dish.course_number,
        dishName: dish.name,
        components: components.map((comp: any) => ({
          componentId: comp.id,
          componentName: comp.name,
          recipeId: comp.recipe_id,
          recipeName: comp.recipe_id ? (recipeNameMap.get(comp.recipe_id) ?? null) : null,
        })),
      }
    })

    entries.push({
      eventId: event.id,
      eventDate: event.event_date,
      eventOccasion: event.occasion,
      menuId: menu.id,
      menuName: menu.name,
      dishes: dishEntries,
    })
  }

  return entries
}

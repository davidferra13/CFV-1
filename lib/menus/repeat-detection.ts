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
// HELPERS
// ============================================

/**
 * Get all recipe IDs linked to a menu via dishes -> components -> recipe_id.
 * Returns a map of recipeId -> recipeName for non-null recipe links.
 */
async function getMenuRecipeMap(
  supabase: ReturnType<typeof createServerClient>,
  menuId: string,
  tenantId: string
): Promise<Map<string, string>> {
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) return new Map()

  const dishIds = dishes.map((d) => d.id)

  const { data: components } = await supabase
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return new Map()

  const recipeIds = [...new Set(components.map((c) => c.recipe_id!).filter(Boolean))]

  if (recipeIds.length === 0) return new Map()

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .in('id', recipeIds)
    .eq('tenant_id', tenantId)

  const recipeMap = new Map<string, string>()
  if (recipes) {
    for (const r of recipes) {
      recipeMap.set(r.id, r.name)
    }
  }

  return recipeMap
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Check if the menu for a given event repeats recipes from past menus
 * served to the same client.
 *
 * Pure deterministic logic: queries events, menus, dishes, components, recipes.
 * No AI involved.
 */
export async function checkRepeatMenu(eventId: string): Promise<RepeatMenuResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

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

  // 2. Get recipe map for the current menu
  const currentRecipes = await getMenuRecipeMap(supabase, currentEvent.menu_id, tenantId)

  if (currentRecipes.size === 0) {
    return { hasRepeats: false, overlaps: [], suggestions: [] }
  }

  // 3. Find all past events for this client that have a menu
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

  // 4. For each past event, get its menu's recipes and compare
  const overlaps: RepeatMenuResult['overlaps'] = []
  const allSharedRecipeIds = new Set<string>()

  for (const pastEvent of pastEvents) {
    if (!pastEvent.menu_id) continue

    // Get the past menu name
    const { data: pastMenu } = await supabase
      .from('menus')
      .select('name')
      .eq('id', pastEvent.menu_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!pastMenu) continue

    const pastRecipes = await getMenuRecipeMap(supabase, pastEvent.menu_id, tenantId)

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
        pastMenuName: pastMenu.name,
        sharedRecipes: shared,
        overlapPercentage,
      })
    }
  }

  // 5. Build suggestions
  const suggestions: string[] = []
  for (const recipeId of allSharedRecipeIds) {
    const recipeName = currentRecipes.get(recipeId)
    // Find the most recent event this recipe was served at
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
 */
export async function getClientMenuHistory(clientId: string): Promise<ClientMenuHistoryEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Get all events for this client that have a menu, ordered newest first
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, menu_id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .not('menu_id', 'is', null)
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) return []

  const entries: ClientMenuHistoryEntry[] = []

  for (const event of events) {
    if (!event.menu_id) continue

    // Get the menu
    const { data: menu } = await supabase
      .from('menus')
      .select('id, name')
      .eq('id', event.menu_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!menu) continue

    // Get dishes for this menu
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, course_name, course_number, name')
      .eq('menu_id', menu.id)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (!dishes) continue

    const dishEntries: ClientMenuHistoryEntry['dishes'] = []

    for (const dish of dishes) {
      // Get components for this dish
      const { data: components } = await supabase
        .from('components')
        .select('id, name, recipe_id')
        .eq('dish_id', dish.id)
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })

      // Resolve recipe names for components that have recipe_id
      const componentEntries: ClientMenuHistoryEntry['dishes'][0]['components'] = []
      if (components) {
        const recipeIds = components
          .map((c) => c.recipe_id)
          .filter((id): id is string => id !== null)

        let recipeNameMap = new Map<string, string>()
        if (recipeIds.length > 0) {
          const { data: recipes } = await supabase
            .from('recipes')
            .select('id, name')
            .in('id', recipeIds)
            .eq('tenant_id', tenantId)

          if (recipes) {
            recipeNameMap = new Map(recipes.map((r) => [r.id, r.name]))
          }
        }

        for (const comp of components) {
          componentEntries.push({
            componentId: comp.id,
            componentName: comp.name,
            recipeId: comp.recipe_id,
            recipeName: comp.recipe_id ? (recipeNameMap.get(comp.recipe_id) ?? null) : null,
          })
        }
      }

      dishEntries.push({
        dishId: dish.id,
        courseName: dish.course_name,
        courseNumber: dish.course_number,
        dishName: dish.name,
        components: componentEntries,
      })
    }

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

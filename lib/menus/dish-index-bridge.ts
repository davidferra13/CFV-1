// Dish Index Bridge — connects the Menu Builder to the Dish Index
// When a menu is locked, its dishes are auto-indexed for historical tracking.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { canonicalizeDishName } from './dish-index-constants'
import { revalidatePath } from 'next/cache'

/**
 * Auto-index all dishes from a locked menu into the dish_index table.
 * Called as a non-blocking side effect when a menu transitions to 'locked'.
 *
 * For each dish in the menu:
 * - If a matching dish exists in the index (by canonical name + course), increment times_served
 * - If no match, create a new dish_index entry
 * - Create a dish_appearance record linking to the menu's event
 */
export async function indexDishesFromMenu(menuId: string, tenantId: string, userId: string) {
  const supabase = createServerClient()

  // Get the menu with its event info and all dishes
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .select('id, name, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuError || !menu) {
    console.error('[dish-index-bridge] Menu not found:', menuError?.message)
    return { indexed: 0 }
  }

  // Get event date and client info if the menu is linked to an event
  let eventDate: string | null = null
  let eventType: string | null = null
  let clientName: string | null = null

  if (menu.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('date, event_type, client:clients(full_name)')
      .eq('id', menu.event_id)
      .eq('tenant_id', tenantId)
      .single()

    if (event) {
      eventDate = (event as Record<string, unknown>).date as string | null
      eventType = (event as Record<string, unknown>).event_type as string | null
      const client = (event as Record<string, unknown>).client as Record<string, unknown> | null
      clientName = client?.full_name as string | null
    }
  }

  // Get all dishes from this menu
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('id, name, course_name, description, dietary_tags')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  if (dishesError || !dishes || dishes.length === 0) {
    console.error('[dish-index-bridge] No dishes found:', dishesError?.message)
    return { indexed: 0 }
  }

  let indexedCount = 0

  for (const dish of dishes) {
    // Prefer the actual dish name; fall back to course label for legacy rows
    const dishName = (dish as any).name || dish.course_name || 'Unnamed Dish'
    const course = normalizeCourseForIndex(dish.course_name)
    const canonical = canonicalizeDishName(dishName)

    // Check if dish already exists in the index
    const { data: existing } = await supabase
      .from('dish_index')
      .select('id, times_served, first_served')
      .eq('tenant_id', tenantId)
      .eq('canonical_name', canonical)
      .eq('course', course)
      .maybeSingle()

    let dishIndexId: string

    if (existing) {
      // Update existing dish — increment count and update dates
      const updates: Record<string, unknown> = {
        times_served: existing.times_served + 1,
      }
      if (eventDate) {
        updates.last_served = eventDate
        if (!existing.first_served || eventDate < existing.first_served) {
          updates.first_served = eventDate
        }
      }
      await supabase
        .from('dish_index')
        .update(updates)
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)

      dishIndexId = existing.id
    } else {
      // Create new dish index entry
      const { data: newEntry, error: insertError } = await supabase
        .from('dish_index')
        .insert({
          tenant_id: tenantId,
          name: dishName,
          canonical_name: canonical,
          course,
          description: dish.description || null,
          dietary_tags: dish.dietary_tags || [],
          times_served: 1,
          first_served: eventDate,
          last_served: eventDate,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`[dish-index-bridge] Failed to index "${dishName}":`, insertError.message)
        continue
      }
      dishIndexId = newEntry.id
    }

    // Create appearance record
    try {
      await supabase.from('dish_appearances').insert({
        dish_id: dishIndexId,
        tenant_id: tenantId,
        menu_id: menuId,
        event_id: menu.event_id || null,
        event_date: eventDate,
        event_type: eventType,
        client_name: clientName,
      })
    } catch (err) {
      console.error('[dish-index-bridge] Appearance insert failed (non-blocking):', err)
    }

    indexedCount++
  }

  console.log(
    `[dish-index-bridge] Indexed ${indexedCount}/${dishes.length} dishes from menu ${menuId}`
  )

  revalidatePath('/culinary/dish-index')
  return { indexed: indexedCount }
}

/**
 * Search the dish index for use in the menu builder.
 * Returns matching dishes for the chef to add to a menu.
 */
export async function searchDishIndexForMenu(query: string, limit = 10) {
  const supabase = createServerClient()
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()

  const { data, error } = await supabase
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, times_served, is_signature')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', `%${query}%`)
    .order('times_served', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[dish-index-bridge] Search failed:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Normalize a course name from the menu builder into a dish index course.
 * The menu builder uses free-text course_name, but the dish index uses
 * a fixed set of courses from dish-index-constants.ts.
 */
function normalizeCourseForIndex(courseName: string | null): string {
  if (!courseName) return 'entrée'
  const lower = courseName.toLowerCase().trim()

  // Maps free-text course names to the fixed DISH_COURSES enum:
  // amuse, canapé, appetizer, soup, salad, fish, entrée, cheese, dessert, side, beverage, other
  const courseMap: Record<string, string> = {
    'amuse-bouche': 'amuse',
    'amuse bouche': 'amuse',
    amuse: 'amuse',
    canapé: 'canapé',
    canape: 'canapé',
    canapés: 'canapé',
    appetizer: 'appetizer',
    starter: 'appetizer',
    'first course': 'appetizer',
    "hors d'oeuvre": 'appetizer',
    "hors d'oeuvres": 'appetizer',
    soup: 'soup',
    salad: 'salad',
    intermezzo: 'other',
    sorbet: 'other',
    fish: 'fish',
    'fish course': 'fish',
    seafood: 'fish',
    entrée: 'entrée',
    entree: 'entrée',
    main: 'entrée',
    'main course': 'entrée',
    protein: 'entrée',
    pasta: 'entrée',
    'pasta course': 'entrée',
    cheese: 'cheese',
    'cheese course': 'cheese',
    'pre-dessert': 'dessert',
    'pre dessert': 'dessert',
    dessert: 'dessert',
    sweet: 'dessert',
    mignardise: 'dessert',
    petits: 'dessert',
    'petit fours': 'dessert',
    side: 'side',
    'side dish': 'side',
    accompaniment: 'side',
    vegetable: 'side',
    starch: 'side',
    bread: 'side',
    'bread course': 'side',
    beverage: 'beverage',
    beverages: 'beverage',
    cocktail: 'beverage',
    cocktails: 'beverage',
    wine: 'beverage',
    drink: 'beverage',
    drinks: 'beverage',
  }

  return courseMap[lower] || 'other'
}

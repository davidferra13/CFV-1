// Dish Index Bridge - connects the Menu Builder to the Dish Index
// When a menu is locked, its dishes are auto-indexed for historical tracking.

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
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
  await requireChef()
  const db: any = createServerClient()

  // Get the menu with its event info and all dishes
  const { data: menu, error: menuError } = await db
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
    const { data: event } = await db
      .from('events')
      .select('event_date, occasion, client:clients(full_name)')
      .eq('id', menu.event_id)
      .eq('tenant_id', tenantId)
      .single()

    if (event) {
      eventDate = (event as Record<string, unknown>).event_date as string | null
      eventType = (event as Record<string, unknown>).occasion as string | null
      const client = (event as Record<string, unknown>).client as Record<string, unknown> | null
      clientName = client?.full_name as string | null
    }
  }

  // Get all dishes from this menu
  const { data: dishes, error: dishesError } = await db
    .from('dishes')
    .select('id, name, course_name, description, dietary_tags')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  if (dishesError || !dishes || dishes.length === 0) {
    console.error('[dish-index-bridge] No dishes found:', dishesError?.message)
    return { indexed: 0 }
  }

  // Pre-compute canonical names and courses for all dishes
  const dishMeta = dishes.map((dish: any) => {
    const dishName = dish.name || dish.course_name || 'Unnamed Dish'
    const course = normalizeCourseForIndex(dish.course_name)
    const canonical = canonicalizeDishName(dishName)
    return { dish, dishName, course, canonical }
  })

  // Bulk-fetch all existing dish_index entries for this tenant matching any canonical name
  const canonicalNames = [...new Set(dishMeta.map((m: { canonical: string }) => m.canonical))]
  const { data: existingEntries } = await db
    .from('dish_index')
    .select('id, canonical_name, course, times_served, first_served')
    .eq('tenant_id', tenantId)
    .in('canonical_name', canonicalNames)

  // Build lookup: "canonical|course" -> existing entry
  const existingMap = new Map<string, any>()
  for (const entry of existingEntries ?? []) {
    existingMap.set(`${entry.canonical_name}|${entry.course}`, entry)
  }

  // Separate into updates vs new inserts
  const toUpdate: { entry: any; meta: (typeof dishMeta)[0] }[] = []
  const toInsert: (typeof dishMeta)[0][] = []

  for (const meta of dishMeta) {
    const key = `${meta.canonical}|${meta.course}`
    const existing = existingMap.get(key)
    if (existing) {
      toUpdate.push({ entry: existing, meta })
    } else {
      toInsert.push(meta)
    }
  }

  // Execute updates (each needs its own update call due to different values)
  for (const { entry } of toUpdate) {
    const updates: Record<string, unknown> = {
      times_served: entry.times_served + 1,
    }
    if (eventDate) {
      updates.last_served = eventDate
      if (!entry.first_served || eventDate < entry.first_served) {
        updates.first_served = eventDate
      }
    }
    await db.from('dish_index').update(updates).eq('id', entry.id).eq('tenant_id', tenantId)
  }

  // Batch-insert new dish index entries
  const newEntryIds = new Map<string, string>() // canonical|course -> id
  if (toInsert.length > 0) {
    const insertPayloads = toInsert.map((meta) => ({
      tenant_id: tenantId,
      name: meta.dishName,
      canonical_name: meta.canonical,
      course: meta.course,
      description: meta.dish.description || null,
      dietary_tags: meta.dish.dietary_tags || [],
      times_served: 1,
      first_served: eventDate,
      last_served: eventDate,
    }))

    const { data: inserted, error: insertError } = await db
      .from('dish_index')
      .insert(insertPayloads)
      .select('id, canonical_name, course')

    if (insertError) {
      console.error('[dish-index-bridge] Batch insert failed:', insertError.message)
    } else {
      for (const entry of inserted ?? []) {
        newEntryIds.set(`${entry.canonical_name}|${entry.course}`, entry.id)
      }
    }
  }

  // Build full ID map for appearance records
  const dishIndexIdMap = new Map<string, string>()
  for (const { entry, meta } of toUpdate) {
    dishIndexIdMap.set(`${meta.canonical}|${meta.course}`, entry.id)
  }
  for (const [key, id] of newEntryIds) {
    dishIndexIdMap.set(key, id)
  }

  // Batch-insert all appearance records
  const appearanceInserts: any[] = []
  for (const meta of dishMeta) {
    const key = `${meta.canonical}|${meta.course}`
    const dishIndexId = dishIndexIdMap.get(key)
    if (!dishIndexId) continue
    appearanceInserts.push({
      dish_id: dishIndexId,
      tenant_id: tenantId,
      menu_id: menuId,
      event_id: menu.event_id || null,
      event_date: eventDate,
      event_type: eventType,
      client_name: clientName,
    })
  }

  if (appearanceInserts.length > 0) {
    try {
      await db.from('dish_appearances').insert(appearanceInserts)
    } catch (err) {
      console.error('[dish-index-bridge] Appearance batch insert failed (non-blocking):', err)
    }
  }

  const indexedCount = dishIndexIdMap.size

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
  const db: any = createServerClient()
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()

  const { data, error } = await db
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

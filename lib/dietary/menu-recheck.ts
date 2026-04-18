// Allergy change -> menu re-evaluation pipeline (Q36)
// When a client's allergies change, scan their upcoming event menus
// for conflicts and notify the chef. Deterministic; no AI.
//
// This is a plain utility (not a server action) so it works from both
// auth and non-auth contexts (onboarding, instant-book, chef edits).

import { checkDishAgainstAllergens, type AllergenConflict } from '@/lib/menus/allergen-check'

type RecheckInput = {
  tenantId: string
  clientId: string
  db: any // compat client (admin or session-scoped)
}

type RecheckResult = {
  eventsChecked: number
  conflictsFound: number
  notified: boolean
}

/**
 * Scan upcoming event menus for a client against their current allergy records.
 * If conflicts are found, create a single notification to the chef summarizing them.
 * Non-blocking: callers should wrap in try/catch.
 */
export async function recheckUpcomingMenusForClient(input: RecheckInput): Promise<RecheckResult> {
  const { tenantId, clientId, db } = input
  const today = new Date().toISOString().split('T')[0]

  // 1. Get client allergy records
  const { data: allergyRecords } = await db
    .from('client_allergy_records')
    .select('allergen, severity, confirmed_by_chef')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)

  if (!allergyRecords?.length) {
    return { eventsChecked: 0, conflictsFound: 0, notified: false }
  }

  // 2. Find upcoming events for this client (not cancelled, future dates)
  const { data: events } = await db
    .from('events')
    .select('id, title, event_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .gte('event_date', today)
    .not('status', 'eq', 'cancelled')

  if (!events?.length) {
    return { eventsChecked: 0, conflictsFound: 0, notified: false }
  }

  const eventIds = events.map((e: any) => e.id)

  // 3. Get menus for these events
  const { data: menus } = await db.from('menus').select('id, event_id').in('event_id', eventIds)

  if (!menus?.length) {
    return { eventsChecked: events.length, conflictsFound: 0, notified: false }
  }

  const menuIds = menus.map((m: any) => m.id)

  // 4. Get dishes for those menus
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, menu_id')
    .in('menu_id', menuIds)

  if (!dishes?.length) {
    return { eventsChecked: events.length, conflictsFound: 0, notified: false }
  }

  // 5. Get recipe ingredients via dish_recipes link
  const dishIds = dishes.map((d: any) => d.id)
  const { data: recipeLinks } = await db
    .from('dish_recipes')
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)

  const ingredientsByDish = new Map<string, { name: string }[]>()

  if (recipeLinks?.length) {
    const recipeIds = [...new Set(recipeLinks.map((r: any) => r.recipe_id))]
    const { data: ingredients } = await db
      .from('recipe_ingredients')
      .select('name, recipe_id')
      .in('recipe_id', recipeIds)

    // Build dish -> ingredients map via recipe links
    const ingredientsByRecipe = new Map<string, { name: string }[]>()
    for (const ing of ingredients ?? []) {
      const list = ingredientsByRecipe.get(ing.recipe_id) ?? []
      list.push({ name: ing.name })
      ingredientsByRecipe.set(ing.recipe_id, list)
    }

    for (const link of recipeLinks) {
      const dishIngs = ingredientsByDish.get(link.dish_id) ?? []
      const recipeIngs = ingredientsByRecipe.get(link.recipe_id) ?? []
      dishIngs.push(...recipeIngs)
      ingredientsByDish.set(link.dish_id, dishIngs)
    }
  }

  // 6. Run allergen cross-check for each dish
  const allConflicts: (AllergenConflict & { eventId: string })[] = []

  // Build menu -> event lookup
  const menuToEvent = new Map<string, string>()
  for (const m of menus) {
    menuToEvent.set(m.id, m.event_id)
  }

  for (const dish of dishes) {
    const ingredients = ingredientsByDish.get(dish.id) ?? []
    if (ingredients.length === 0) continue

    const conflicts = checkDishAgainstAllergens(dish.name, dish.id, ingredients, allergyRecords)

    const eventId = menuToEvent.get(dish.menu_id)
    for (const c of conflicts) {
      allConflicts.push({ ...c, eventId: eventId! })
    }
  }

  if (allConflicts.length === 0) {
    return { eventsChecked: events.length, conflictsFound: 0, notified: false }
  }

  // 7. Get client name for notification
  const { data: client } = await db.from('clients').select('full_name').eq('id', clientId).single()

  const clientName = client?.full_name ?? 'A client'

  // 8. Create notification to chef
  const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')

  const recipientId = await getChefAuthUserId(tenantId)
  if (!recipientId) {
    return { eventsChecked: events.length, conflictsFound: allConflicts.length, notified: false }
  }

  // Build a concise summary of affected events
  const affectedEventIds = [...new Set(allConflicts.map((c) => c.eventId))]
  const affectedEvents = events.filter((e: any) => affectedEventIds.includes(e.id))
  const eventSummary = affectedEvents
    .map((e: any) => e.title || `Event on ${e.event_date}`)
    .slice(0, 3)
    .join(', ')

  const allergenList = [...new Set(allConflicts.map((c) => c.allergen))].join(', ')

  await createNotification({
    tenantId,
    recipientId,
    category: 'client',
    action: 'dietary_menu_conflict',
    title: `Menu conflict: ${clientName} has new allergy data`,
    body: `${allConflicts.length} potential conflict(s) with ${allergenList} found in: ${eventSummary}. Review menus to ensure safety.`,
    actionUrl:
      affectedEventIds.length === 1 ? `/events/${affectedEventIds[0]}` : `/clients/${clientId}`,
    clientId,
    metadata: {
      system_key: 'dietary_menu_recheck',
      client_id: clientId,
      conflict_count: allConflicts.length,
      affected_event_ids: affectedEventIds,
      allergens: allergenList,
    },
  })

  console.log(
    `[menu-recheck] ${allConflicts.length} conflict(s) for client ${clientId} across ${affectedEventIds.length} event(s)`
  )

  return {
    eventsChecked: events.length,
    conflictsFound: allConflicts.length,
    notified: true,
  }
}

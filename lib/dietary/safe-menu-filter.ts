'use server'

// Safe Menu Filter
// Given an event, evaluates all menu dishes against all guests' dietary
// constraints and returns per-dish, per-guest safety verdicts.
//
// This is the "last mile" of allergen safety: instead of just warning
// after a dish is added, this proactively shows which dishes are safe
// for which guests BEFORE assignment.
//
// Formula > AI: pure deterministic, uses constraint-enforcement.ts.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  enforceMenuConstraints,
  type MenuEnforcementResult,
} from '@/lib/dietary/constraint-enforcement'

export type SafeMenuFilterResult = {
  success: boolean
  eventId: string
  menuId: string | null
  result: MenuEnforcementResult | null
  error?: string
}

/**
 * Evaluate menu safety for all guests of an event.
 * Returns BLOCK/WARN/CLEAR verdicts per dish per guest.
 */
export async function getMenuSafetyReport(eventId: string): Promise<SafeMenuFilterResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get event + linked menu
  const { data: event } = await db
    .from('events')
    .select('id, title, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    return { success: false, eventId, menuId: null, result: null, error: 'Event not found' }
  }

  // 2. Get menu for this event
  const { data: menu } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!menu) {
    return {
      success: true,
      eventId,
      menuId: null,
      result: null,
      error: 'No menu assigned to this event',
    }
  }

  // 3. Get dishes with their ingredients
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, description')
    .eq('menu_id', menu.id)
    .eq('tenant_id', tenantId)

  if (!dishes?.length) {
    return { success: true, eventId, menuId: menu.id, result: null, error: 'Menu has no dishes' }
  }

  // 4. Get ingredients for each dish (from dish_ingredients or recipe_ingredients)
  const dishIds = dishes.map((d: any) => d.id)
  const { data: dishIngredients } = await db
    .from('dish_ingredients')
    .select('dish_id, ingredient_name')
    .in('dish_id', dishIds)

  // Build dish objects with ingredient lists
  const dishesWithIngredients = dishes.map((dish: any) => {
    const ingredients = (dishIngredients ?? [])
      .filter((di: any) => di.dish_id === dish.id)
      .map((di: any) => ({ name: di.ingredient_name }))

    // Also check dish description for hidden allergens (e.g., "served with peanut sauce")
    if (dish.description) {
      ingredients.push({ name: dish.description })
    }

    return {
      id: dish.id,
      name: dish.name,
      ingredients,
    }
  })

  // 5. Get guests for this event and their allergy records
  const { data: rsvps } = await db
    .from('event_rsvps')
    .select('id, guest_name, guest_id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  // Also include the primary client
  const guestList: { id: string; name: string; sourceId: string }[] = []

  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('id, full_name')
      .eq('id', event.client_id)
      .eq('tenant_id', tenantId)
      .single()
    if (client) {
      guestList.push({ id: client.id, name: client.full_name, sourceId: client.id })
    }
  }

  if (rsvps?.length) {
    for (const rsvp of rsvps) {
      // Avoid duplicate if primary client is also in RSVPs
      if (!guestList.some((g) => g.id === rsvp.guest_id)) {
        guestList.push({
          id: rsvp.guest_id || rsvp.id,
          name: rsvp.guest_name || 'Guest',
          sourceId: rsvp.guest_id || rsvp.id,
        })
      }
    }
  }

  if (guestList.length === 0) {
    return {
      success: true,
      eventId,
      menuId: menu.id,
      result: {
        canProceed: true,
        guests: [],
        totalBlocks: 0,
        totalWarns: 0,
        summary: 'No guests with dietary data to check against',
      },
    }
  }

  // 6. Get allergy records for all guests
  const guestIds = guestList.map((g) => g.sourceId).filter(Boolean)
  const { data: allergyRecords } = await db
    .from('client_allergy_records')
    .select('client_id, allergen, severity, confirmed_by_chef')
    .in('client_id', guestIds)
    .eq('tenant_id', tenantId)

  const guests = guestList.map((g) => ({
    id: g.id,
    name: g.name,
    allergyRecords: (allergyRecords ?? [])
      .filter((a: any) => a.client_id === g.sourceId)
      .map((a: any) => ({
        allergen: a.allergen,
        severity: a.severity,
        confirmed_by_chef: a.confirmed_by_chef,
      })),
  }))

  // 7. Run constraint enforcement
  const result = enforceMenuConstraints(dishesWithIngredients, guests)

  return {
    success: true,
    eventId,
    menuId: menu.id,
    result,
  }
}

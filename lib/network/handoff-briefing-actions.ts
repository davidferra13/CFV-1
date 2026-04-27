'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

export type HandoffBriefing = {
  eventDate: string | null
  occasion: string | null
  guestCount: number | null
  serviceStyle: string | null
  locationCity: string | null
  locationState: string | null
  locationAddress: string | null
  accessInstructions: string | null
  clientFirstName: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  dislikes: string[]
  kitchenSize: string | null
  kitchenConstraints: string | null
  parkingInstructions: string | null
  menuName: string | null
  menuItems: { name: string; category: string; description: string | null }[]
  groceryListReady: boolean
  prepListReady: boolean
  timelineReady: boolean
  quotedPriceCents: number | null
  recipeNames: string[]
  privateNote: string | null
  contingencyNotes: string | null
}

export async function getHandoffBriefing(handoffId: string): Promise<HandoffBriefing | null> {
  const user = await requireChef()
  const chefId = user.tenantId!

  // Verify this chef is sender or recipient
  const handoffRows = await pgClient`
    SELECT h.source_entity_id, h.source_entity_type, h.private_note, h.from_chef_id
    FROM chef_handoffs h
    WHERE h.id = ${handoffId}
      AND (
        h.from_chef_id = ${chefId}
        OR EXISTS (
          SELECT 1 FROM chef_handoff_recipients hr
          WHERE hr.handoff_id = h.id AND hr.recipient_chef_id = ${chefId}
        )
      )
  `

  if (!handoffRows.length || handoffRows[0].source_entity_type !== 'event') {
    return null
  }

  const eventId = handoffRows[0].source_entity_id
  const fromChefId = handoffRows[0].from_chef_id
  if (!eventId) return null

  const eventData = await pgClient`
    SELECT
      e.event_date, e.occasion, e.guest_count, e.service_style,
      e.location_city, e.location_state, e.location_address, e.access_instructions,
      e.quoted_price_cents, e.menu_id,
      e.grocery_list_ready, e.prep_list_ready, e.timeline_ready,
      c.full_name AS client_name,
      c.dietary_restrictions AS client_dietary,
      c.allergies AS client_allergies,
      c.dislikes AS client_dislikes,
      c.kitchen_size, c.kitchen_constraints, c.parking_instructions,
      m.name AS menu_name
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN menus m ON m.id = e.menu_id
    WHERE e.id = ${eventId}::uuid
      AND e.tenant_id = ${fromChefId}
  `

  if (!eventData.length) return null
  const ev = eventData[0] as Record<string, unknown>

  let menuItems: { name: string; category: string; description: string | null }[] = []
  const menuId = ev.menu_id as string | null
  if (menuId) {
    const items = await pgClient`
      SELECT name, category, description
      FROM menu_items
      WHERE menu_id = ${menuId}::uuid AND is_active = true
      ORDER BY sort_order ASC
    `
    menuItems = items.map((i: Record<string, unknown>) => ({
      name: (i.name as string) || '',
      category: (i.category as string) || 'main',
      description: i.description as string | null,
    }))
  }

  let recipeNames: string[] = []
  if (menuId) {
    const recipes = await pgClient`
      SELECT DISTINCT r.name
      FROM menu_items mi
      JOIN recipes r ON r.id = mi.recipe_id
      WHERE mi.menu_id = ${menuId}::uuid AND mi.recipe_id IS NOT NULL AND mi.is_active = true
    `
    recipeNames = recipes.map((r: Record<string, unknown>) => r.name as string)
  }

  const contingency = await pgClient`
    SELECT mitigation_notes
    FROM event_contingency_notes
    WHERE event_id = ${eventId}::uuid AND scenario_type = 'chef_illness'
    LIMIT 1
  `

  const clientName = ev.client_name as string | null
  const clientFirstName = clientName ? clientName.split(' ')[0] : null

  return {
    eventDate: ev.event_date as string | null,
    occasion: ev.occasion as string | null,
    guestCount: ev.guest_count as number | null,
    serviceStyle: ev.service_style as string | null,
    locationCity: ev.location_city as string | null,
    locationState: ev.location_state as string | null,
    locationAddress: ev.location_address as string | null,
    accessInstructions: ev.access_instructions as string | null,
    clientFirstName,
    dietaryRestrictions: (ev.client_dietary as string[]) || [],
    allergies: (ev.client_allergies as string[]) || [],
    dislikes: (ev.client_dislikes as string[]) || [],
    kitchenSize: ev.kitchen_size as string | null,
    kitchenConstraints: ev.kitchen_constraints as string | null,
    parkingInstructions: ev.parking_instructions as string | null,
    menuName: ev.menu_name as string | null,
    menuItems,
    groceryListReady: (ev.grocery_list_ready as boolean) || false,
    prepListReady: (ev.prep_list_ready as boolean) || false,
    timelineReady: (ev.timeline_ready as boolean) || false,
    quotedPriceCents: ev.quoted_price_cents as number | null,
    recipeNames,
    privateNote: handoffRows[0].private_note as string | null,
    contingencyNotes: contingency.length ? (contingency[0].mitigation_notes as string) : null,
  }
}

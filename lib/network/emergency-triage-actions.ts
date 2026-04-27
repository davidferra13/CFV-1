'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

export type TriageEvent = {
  id: string
  eventDate: string
  clientName: string
  guestCount: number
  occasion: string | null
  locationCity: string | null
  locationState: string | null
  quotedPriceCents: number | null
  status: string
  menuId: string | null
  menuName: string | null
  groceryListReady: boolean
  prepListReady: boolean
  timelineReady: boolean
  equipmentListReady: boolean
  hasActiveHandoff: boolean
}

export type TriageData = {
  events: TriageEvent[]
  totalRevenueCents: number
  totalGuests: number
}

export async function getEmergencyTriageData(): Promise<TriageData> {
  const user = await requireChef()
  const tid = user.tenantId!

  const rows = await pgClient`
    SELECT
      e.id,
      e.event_date,
      e.guest_count,
      e.occasion,
      e.location_city,
      e.location_state,
      e.quoted_price_cents,
      e.status,
      e.menu_id,
      e.grocery_list_ready,
      e.prep_list_ready,
      e.timeline_ready,
      e.equipment_list_ready,
      c.full_name AS client_name,
      m.name AS menu_name,
      EXISTS(
        SELECT 1 FROM chef_handoffs ch
        WHERE ch.source_entity_type = 'event'
          AND ch.source_entity_id = e.id::text
          AND ch.status NOT IN ('closed', 'cancelled', 'expired')
      ) AS has_active_handoff
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN menus m ON m.id = e.menu_id
    WHERE e.tenant_id = ${tid}
      AND e.status NOT IN ('completed', 'cancelled')
      AND e.event_date >= CURRENT_DATE
      AND e.deleted_at IS NULL
    ORDER BY e.event_date ASC
  `

  const events: TriageEvent[] = rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    eventDate: r.event_date as string,
    clientName: (r.client_name as string) || 'Unknown client',
    guestCount: (r.guest_count as number) || 0,
    occasion: r.occasion as string | null,
    locationCity: r.location_city as string | null,
    locationState: r.location_state as string | null,
    quotedPriceCents: r.quoted_price_cents as number | null,
    status: r.status as string,
    menuId: r.menu_id as string | null,
    menuName: r.menu_name as string | null,
    groceryListReady: (r.grocery_list_ready as boolean) || false,
    prepListReady: (r.prep_list_ready as boolean) || false,
    timelineReady: (r.timeline_ready as boolean) || false,
    equipmentListReady: (r.equipment_list_ready as boolean) || false,
    hasActiveHandoff: (r.has_active_handoff as boolean) || false,
  }))

  const totalRevenueCents = events.reduce((sum, e) => sum + (e.quotedPriceCents || 0), 0)
  const totalGuests = events.reduce((sum, e) => sum + e.guestCount, 0)

  return { events, totalRevenueCents, totalGuests }
}

'use server'

import { createServerClient } from '@/lib/db/server'

export interface RebookPrefillData {
  eventId: string
  chefId: string
  chefName: string | null
  chefBusinessName: string | null
  chefSlug: string | null
  chefBookingSlug: string | null
  occasion: string | null
  guestCount: number | null
  locationAddress: string | null
  locationCity: string | null
  locationState: string | null
  locationZip: string | null
  dietaryNotes: string | null
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  clientId: string
  previousMenuName: string | null
  previousMenuId: string | null
}

/**
 * Fetch complete rebook prefill data for a completed event.
 * Token-based access (client portal). No session required.
 */
export async function getRebookPrefillData(
  eventId: string,
  clientId: string,
  tenantId: string
): Promise<RebookPrefillData | null> {
  const db: any = createServerClient({ admin: true })

  const { data: event } = await db
    .from('events')
    .select(
      'id, occasion, guest_count, location_address, location_city, location_state, location_zip, special_requests, tenant_id, client_id'
    )
    .eq('id', eventId)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  // Get chef info
  const { data: chef } = await db
    .from('chefs')
    .select('id, display_name, business_name, slug, booking_slug')
    .eq('id', tenantId)
    .maybeSingle()

  // Get client info
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('id', clientId)
    .maybeSingle()

  // Get menu info (most recent menu linked to event)
  const { data: menu } = await db
    .from('menus')
    .select('id, name')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chef || !client) return null

  return {
    eventId: event.id,
    chefId: chef.id,
    chefName: chef.display_name ?? null,
    chefBusinessName: chef.business_name ?? null,
    chefSlug: chef.slug ?? null,
    chefBookingSlug: chef.booking_slug ?? null,
    occasion: event.occasion ?? null,
    guestCount: event.guest_count ?? null,
    locationAddress: event.location_address ?? null,
    locationCity: event.location_city ?? null,
    locationState: event.location_state ?? null,
    locationZip: event.location_zip ?? null,
    dietaryNotes: event.special_requests ?? null,
    clientName: client.full_name ?? '',
    clientEmail: client.email ?? null,
    clientPhone: client.phone ?? null,
    clientId: client.id,
    previousMenuName: menu?.name ?? null,
    previousMenuId: menu?.id ?? null,
  }
}

/**
 * Count completed events for a client with a given chef (tenant).
 * Used for the "Repeat Client" badge.
 */
export async function getRepeatClientEventCount(
  clientId: string,
  tenantId: string
): Promise<number> {
  const db: any = createServerClient({ admin: true })

  const { count } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  return count ?? 0
}

/**
 * Get past event context for a repeat client inquiry (chef side).
 * Returns completed events with menu names and spend.
 */
export async function getPastEventContext(
  clientId: string,
  tenantId: string
): Promise<
  Array<{
    id: string
    occasion: string | null
    eventDate: string
    guestCount: number | null
    menuName: string | null
    totalCents: number
  }>
> {
  const db: any = createServerClient({ admin: true })

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(10)

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  // Get menus
  const { data: menus } = await db.from('menus').select('event_id, name').in('event_id', eventIds)

  const menuByEvent = new Map<string, string>()
  for (const m of menus ?? []) {
    if (m.event_id && !menuByEvent.has(m.event_id)) {
      menuByEvent.set(m.event_id, m.name)
    }
  }

  // Get spend totals from financial summary
  const { data: summaries } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .in('event_id', eventIds)

  const spendByEvent = new Map<string, number>()
  for (const s of summaries ?? []) {
    if (s.event_id) {
      spendByEvent.set(s.event_id, Number(s.total_paid_cents ?? 0))
    }
  }

  return events.map((event: any) => ({
    id: event.id,
    occasion: event.occasion ?? null,
    eventDate: event.event_date,
    guestCount: event.guest_count ?? null,
    menuName: menuByEvent.get(event.id) ?? null,
    totalCents: spendByEvent.get(event.id) ?? 0,
  }))
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { BriefingContext } from './types'

/**
 * Aggregates all data sources needed for a chef event briefing.
 * Pure data collection, no AI. Runs 8+ queries in parallel.
 */
export async function aggregateBriefingContext(eventId: string): Promise<BriefingContext> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event first (needed for client_id and other FK lookups)
  const { data: event, error: eventError } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  // Parallel fetch everything else
  const [
    clientResult,
    clientMemoryResult,
    pastEventsResult,
    menusResult,
    financialResult,
    messagesResult,
    travelResult,
  ] = await Promise.all([
    // Client info
    event.client_id
      ? db
          .from('clients')
          .select('id, full_name, email, phone')
          .eq('id', event.client_id)
          .eq('tenant_id', user.tenantId!)
          .single()
          .then((r: any) => r.data)
          .catch(() => null)
      : Promise.resolve(null),

    // Client memories
    event.client_id
      ? db
          .from('client_memory')
          .select('key, value, confidence, pinned')
          .eq('tenant_id', user.tenantId!)
          .eq('client_id', event.client_id)
          .gt('confidence', 20)
          .order('confidence', { ascending: false })
          .then((r: any) => r.data || [])
          .catch(() => [])
      : Promise.resolve([]),

    // Past events with this client
    event.client_id
      ? db
          .from('events')
          .select(
            'id, occasion, event_date, guest_count, status, chef_outcome_notes, chef_outcome_rating'
          )
          .eq('tenant_id', user.tenantId!)
          .eq('client_id', event.client_id)
          .neq('id', eventId)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .limit(5)
          .then((r: any) => r.data || [])
          .catch(() => [])
      : Promise.resolve([]),

    // Menus + dishes for this event
    (async () => {
      try {
        const { data: eventMenuRows } = await db
          .from('event_menus')
          .select('menu_id')
          .eq('event_id', eventId)

        const menuIds = (eventMenuRows ?? []).map((r: any) => r.menu_id)
        if (menuIds.length === 0) return []

        const { data: menuData } = await db
          .from('menus')
          .select(
            'name, service_style, dishes(name, course_name, description, dietary_tags, allergen_flags)'
          )
          .in('id', menuIds)

        return (menuData ?? []).map((m: any) => ({
          name: m.name,
          serviceStyle: m.service_style,
          dishes: (m.dishes ?? []).map((d: any) => ({
            name: d.name,
            courseName: d.course_name,
            description: d.description,
            dietaryTags: d.dietary_tags ?? [],
            allergenFlags: d.allergen_flags ?? [],
          })),
        }))
      } catch {
        return []
      }
    })(),

    // Financial summary
    (async () => {
      try {
        const { data: summary } = await db
          .from('event_financial_summary')
          .select('total_paid_cents, outstanding_balance_cents')
          .eq('event_id', eventId)
          .maybeSingle()

        return {
          quotedPriceCents: event.quoted_price_cents ?? event.total_price_cents ?? null,
          totalPaidCents: summary?.total_paid_cents ?? 0,
          outstandingBalanceCents: summary?.outstanding_balance_cents ?? 0,
          paymentStatus: event.payment_status ?? null,
        }
      } catch {
        return {
          quotedPriceCents: event.quoted_price_cents ?? null,
          totalPaidCents: 0,
          outstandingBalanceCents: 0,
          paymentStatus: event.payment_status ?? null,
        }
      }
    })(),

    // Recent messages
    db
      .from('messages')
      .select('content, sender_name, created_at')
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then((r: any) => r.data || [])
      .catch(() => []),

    // Travel info (if geocoded)
    event.location_lat && event.location_lng
      ? import('@/lib/maps/mapbox')
          .then((m) =>
            m.getDirections(
              0,
              0, // chef home coords - placeholder; v2 reads from chef prefs
              event.location_lng,
              event.location_lat
            )
          )
          .catch(() => null)
      : Promise.resolve(null),
  ])

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      serveTime: event.serve_time,
      arrivalTime: event.arrival_time,
      guestCount: event.guest_count,
      guestCountConfirmed: event.guest_count_confirmed,
      serviceStyle: event.service_style,
      status: event.status,
      specialRequests: event.special_requests,
      notes: event.notes,
      dietaryNotes: event.dietary_notes,
      allergies: event.allergies ?? [],
      dietaryRestrictions: event.dietary_restrictions ?? [],
      locationAddress: event.location_address,
      locationCity: event.location_city,
      locationNotes: event.location_notes,
      accessInstructions: event.access_instructions,
      siteNotes: event.site_notes,
      alcoholBeingServed: event.alcohol_being_served,
    },
    client: clientResult
      ? {
          id: clientResult.id,
          name: clientResult.full_name,
          email: clientResult.email,
          phone: clientResult.phone,
        }
      : null,
    clientMemories: clientMemoryResult,
    pastEvents: (pastEventsResult as any[]).map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      eventDate: e.event_date,
      guestCount: e.guest_count,
      status: e.status,
      chefOutcomeNotes: e.chef_outcome_notes,
      chefOutcomeRating: e.chef_outcome_rating,
    })),
    menus: menusResult,
    financial: financialResult,
    prepStatus: {
      groceryListReady: !!event.grocery_list_ready,
      prepListReady: !!event.prep_list_ready,
      equipmentListReady: !!event.equipment_list_ready,
      packingListReady: !!event.packing_list_ready,
      timelineReady: !!event.timeline_ready,
      travelRouteReady: !!event.travel_route_ready,
    },
    travelInfo: travelResult
      ? {
          distanceMiles: travelResult.distanceMiles ?? 0,
          durationMinutes: travelResult.durationMinutes ?? 0,
        }
      : null,
    weather: null, // v2: integrate weather API closer to event date
    recentMessages: (messagesResult as any[]).map((m: any) => ({
      content: m.content,
      senderName: m.sender_name,
      createdAt: m.created_at,
    })),
  }
}

// Drive-Time Briefing Data
// Single-screen, no-scroll briefing for the chef in the car.
// Everything needed: address, map link, guests, dietary, menu, notes.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type DriveBriefing = {
  event: {
    id: string
    occasion: string | null
    event_date: string
    serve_time: string | null
    arrival_time: string | null
    status: string
  }
  location: {
    address: string
    city: string
    state: string
    zip: string
    mapUrl: string | null
  }
  client: {
    name: string
    phone: string | null
  }
  guests: {
    count: number
    dietaryRestrictions: string[]
    allergies: string[]
  }
  menu: {
    name: string
    dishes: { courseName: string; description: string | null }[]
  }[]
  specialNotes: string | null
  accessInstructions: string | null
  kitchenNotes: string | null
}

/**
 * Get everything the chef needs for the drive to the event.
 * Single query, single screen. No tabs, no scrolling.
 */
export async function getDriveBriefing(eventId: string): Promise<DriveBriefing | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event with client
  const { data: event } = await db
    .from('events')
    .select(
      `id, occasion, event_date, serve_time, arrival_time, status,
       location_address, location_city, location_state, location_zip,
       location_lat, location_lng,
       guest_count, dietary_restrictions, allergies,
       special_requests, access_instructions, kitchen_notes, site_notes,
       clients(full_name, phone, email)`
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  // Build Google Maps URL
  let mapUrl: string | null = null
  const addressParts = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ].filter(Boolean)

  if (event.location_lat && event.location_lng) {
    mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.location_lat},${event.location_lng}`
  } else if (addressParts.length > 0) {
    mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressParts.join(', '))}`
  }

  // Fetch menus + dishes for this event
  const { data: menus } = await db
    .from('menus')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: true })

  const menuData: DriveBriefing['menu'] = []

  if (menus && menus.length > 0) {
    for (const menu of menus) {
      const { data: dishes } = await db
        .from('dishes')
        .select('course_name, description')
        .eq('menu_id', menu.id)
        .eq('tenant_id', tenantId)
        .order('course_number', { ascending: true })
        .order('sort_order', { ascending: true })

      menuData.push({
        name: menu.name,
        dishes: (dishes ?? []).map((d: any) => ({
          courseName: d.course_name,
          description: d.description,
        })),
      })
    }
  }

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      status: event.status,
    },
    location: {
      address: event.location_address ?? '',
      city: event.location_city ?? '',
      state: event.location_state ?? '',
      zip: event.location_zip ?? '',
      mapUrl,
    },
    client: {
      name: event.clients?.full_name ?? 'Client',
      phone: event.clients?.phone ?? event.clients?.email ?? null,
    },
    guests: {
      count: event.guest_count ?? 0,
      dietaryRestrictions: (event.dietary_restrictions ?? []).filter(Boolean),
      allergies: (event.allergies ?? []).filter(Boolean),
    },
    menu: menuData,
    specialNotes: event.special_requests || event.site_notes || null,
    accessInstructions: event.access_instructions || null,
    kitchenNotes: event.kitchen_notes || null,
  }
}

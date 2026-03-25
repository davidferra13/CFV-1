'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type StoryDish = {
  courseName: string
  courseNumber: number
  description: string | null
  dietaryTags: string[]
}

export type StoryData = {
  // Chef
  businessName: string
  logoUrl: string | null

  // Event
  eventDate: string
  occasion: string | null
  guestCount: number
  serviceStyle: string | null
  locationCity: string | null
  locationState: string | null

  // Menu
  menuName: string | null
  cuisineType: string | null
  dishes: StoryDish[]

  // Stats
  dietaryAccommodations: number
  courseCount: number
  totalPriceCents: number | null
}

export async function getStoryData(eventId: string): Promise<StoryData> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event, chef, and menu data in parallel
  const [eventResult, chefResult, menuResult] = await Promise.all([
    db
      .from('events')
      .select(
        'event_date, occasion, guest_count, service_style, location_city, location_state, dietary_restrictions, allergies, total_price_cents, status, tenant_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),

    db.from('chefs').select('business_name, logo_url').eq('id', user.tenantId!).single(),

    db
      .from('menus')
      .select(
        `
        name, cuisine_type,
        dishes (course_name, course_number, description, dietary_tags)
      `
      )
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')
  if (event.status !== 'completed') throw new Error('Story is only available for completed events')

  const chef = chefResult.data
  const menu = menuResult.data

  const dishes: StoryDish[] = (menu?.dishes ?? [])
    .sort((a: any, b: any) => (a.course_number ?? 0) - (b.course_number ?? 0))
    .map((d: any) => ({
      courseName: d.course_name || 'Untitled Course',
      courseNumber: d.course_number ?? 0,
      description: d.description ?? null,
      dietaryTags: d.dietary_tags ?? [],
    }))

  // Count unique dietary accommodations from both event-level and dish-level tags
  const allDietaryTags = new Set([
    ...(event.dietary_restrictions ?? []),
    ...(event.allergies ?? []),
    ...dishes.flatMap((d) => d.dietaryTags),
  ])

  return {
    businessName: chef?.business_name ?? 'Private Chef',
    logoUrl: chef?.logo_url ?? null,
    eventDate: event.event_date,
    occasion: event.occasion,
    guestCount: event.guest_count ?? 0,
    serviceStyle: event.service_style,
    locationCity: event.location_city,
    locationState: event.location_state,
    menuName: menu?.name ?? null,
    cuisineType: menu?.cuisine_type ?? null,
    dishes,
    dietaryAccommodations: allDietaryTags.size,
    courseCount: dishes.length,
    totalPriceCents: event.total_price_cents,
  }
}

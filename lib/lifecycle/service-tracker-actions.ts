'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

import type { ServiceStage, GuestInfo, ServiceTrackerState } from './service-tracker-constants'

/**
 * Infers the current service stage from event state and course progress.
 */
function inferServiceStage(
  event: {
    service_started_at: string | null
    service_completed_at: string | null
    reset_complete: boolean
    prep_completed_at: string | null
    car_packed: boolean
  },
  coursesServed: number,
  totalCourses: number
): ServiceStage {
  // If service is completed and reset done, we are in cleanup
  if (event.service_completed_at && event.reset_complete) {
    return 'cleanup'
  }

  // If service completed but not reset, still cleanup
  if (event.service_completed_at) {
    return 'cleanup'
  }

  // If courses are actively being served
  if (totalCourses > 0 && coursesServed > 0 && coursesServed < totalCourses) {
    return 'serving'
  }

  // If all courses served
  if (totalCourses > 0 && coursesServed >= totalCourses) {
    return 'cleanup'
  }

  // If service started but no courses served yet, depends on prep
  if (event.service_started_at) {
    // If car was packed and prep done, likely plating or cooking
    if (event.prep_completed_at && event.car_packed) {
      return 'plating'
    }
    return 'cooking'
  }

  // Service not started yet, still in prep
  return 'prep'
}

/**
 * Fetches the full service tracker state for an active (in_progress) event.
 * Combines event timestamps, guest data, and course progress into a unified view.
 */
export async function getServiceTrackerState(eventId: string): Promise<ServiceTrackerState> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event data
  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id, status, guest_count,
      service_started_at, service_completed_at,
      prep_completed_at, car_packed,
      grocery_list_ready, prep_list_ready, execution_sheet_ready,
      reset_complete, reset_completed_at,
      dietary_restrictions, allergies
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found')
  }

  // Fetch guests
  const { data: guestRows } = await db
    .from('event_guests')
    .select('id, full_name, rsvp_status, dietary_restrictions, allergies')
    .eq('event_id', eventId)
    .catch(() => ({ data: [] }))

  const guests: GuestInfo[] = (guestRows ?? []).map((g: any) => ({
    id: g.id,
    name: g.full_name ?? null,
    rsvp_status: g.rsvp_status ?? 'attending',
    dietary_restrictions: g.dietary_restrictions ?? null,
    allergies: g.allergies ?? null,
  }))

  const attending = guests.filter(
    (g) => !g.rsvp_status || ['attending', 'confirmed'].includes(g.rsvp_status.toLowerCase())
  )
  const declined = guests.filter((g) => g.rsvp_status && g.rsvp_status.toLowerCase() === 'declined')

  // Collect all active dietary restrictions and allergies
  const dietarySet = new Set<string>()
  const allergySet = new Set<string>()

  // From event-level
  if (Array.isArray(event.dietary_restrictions)) {
    for (const r of event.dietary_restrictions) {
      if (r) dietarySet.add(r)
    }
  }
  if (Array.isArray(event.allergies)) {
    for (const a of event.allergies) {
      if (a) allergySet.add(a)
    }
  }

  // From guest records
  for (const guest of attending) {
    if (Array.isArray(guest.dietary_restrictions)) {
      for (const r of guest.dietary_restrictions) {
        if (r) dietarySet.add(r)
      }
    }
    if (Array.isArray(guest.allergies)) {
      for (const a of guest.allergies) {
        if (a) allergySet.add(a)
      }
    }
  }

  // Fetch course progress to determine stage
  const { data: courseRows } = await db
    .from('event_course_progress')
    .select('status')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .catch(() => ({ data: [] }))

  const courses = courseRows ?? []
  const coursesServed = courses.filter((c: any) => c.status === 'served').length

  const currentStage = inferServiceStage(
    {
      service_started_at: event.service_started_at ?? null,
      service_completed_at: event.service_completed_at ?? null,
      reset_complete: Boolean(event.reset_complete),
      prep_completed_at: event.prep_completed_at ?? null,
      car_packed: Boolean(event.car_packed),
    },
    coursesServed,
    courses.length
  )

  return {
    currentStage,
    serviceStartedAt: event.service_started_at ?? null,
    serviceCompletedAt: event.service_completed_at ?? null,
    guestCount: Number(event.guest_count ?? 0),
    guests,
    guestsAttending: attending.length,
    guestsDeclined: declined.length,
    activeDietaryRestrictions: Array.from(dietarySet),
    activeAllergies: Array.from(allergySet),
    carPacked: Boolean(event.car_packed),
    groceryListReady: Boolean(event.grocery_list_ready),
    prepListReady: Boolean(event.prep_list_ready),
    executionSheetReady: Boolean(event.execution_sheet_ready),
    resetComplete: Boolean(event.reset_complete),
    resetCompletedAt: event.reset_completed_at ?? null,
  }
}

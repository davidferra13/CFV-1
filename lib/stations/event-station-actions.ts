// Event Station Plan: assigns event dishes to kitchen stations.
// Provides CRUD for event_station_dishes and query helpers
// for both the event detail view and the stations overview page.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ── Schemas ──────────────────────────────────────────────────────────

const AssignDishSchema = z.object({
  event_id: z.string().uuid(),
  station_id: z.string().uuid(),
  dish_id: z.string().uuid(),
  estimated_minutes: z.number().int().min(0).nullable().optional(),
  notes: z.string().optional(),
})

const UpdateAssignmentSchema = z.object({
  station_id: z.string().uuid().optional(),
  estimated_minutes: z.number().int().min(0).nullable().optional(),
  notes: z.string().optional(),
})

export type AssignDishInput = z.infer<typeof AssignDishSchema>

// ── Types ────────────────────────────────────────────────────────────

export interface EventStationDish {
  id: string
  event_id: string
  station_id: string
  dish_id: string
  estimated_minutes: number | null
  notes: string | null
  sort_order: number
  dish_name: string
  course_number: number
  station_name: string
}

export interface StationPlanGroup {
  station_id: string
  station_name: string
  dishes: {
    id: string
    assignment_id: string
    name: string
    course_number: number
    estimated_minutes: number | null
    notes: string | null
  }[]
  total_estimated_minutes: number
}

export interface StationUpcomingEvent {
  event_id: string
  occasion: string | null
  event_date: string
  guest_count: number
  dish_count: number
  total_estimated_minutes: number
}

// ── Assign a dish to a station ───────────────────────────────────────

export async function assignDishToStation(input: AssignDishInput) {
  const user = await requireChef()
  const validated = AssignDishSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_station_dishes')
    .upsert(
      {
        event_id: validated.event_id,
        station_id: validated.station_id,
        dish_id: validated.dish_id,
        chef_id: user.tenantId!,
        estimated_minutes: validated.estimated_minutes ?? null,
        notes: validated.notes ?? null,
      },
      { onConflict: 'event_id,dish_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[assignDishToStation] Error:', error)
    throw new Error('Failed to assign dish to station')
  }

  revalidatePath(`/events/${validated.event_id}`)
  revalidatePath('/ops/stations')
  return data
}

// ── Update an assignment ─────────────────────────────────────────────

export async function updateDishAssignment(
  id: string,
  input: z.infer<typeof UpdateAssignmentSchema>
) {
  const user = await requireChef()
  const validated = UpdateAssignmentSchema.parse(input)
  const db: any = createServerClient()

  const updatePayload: Record<string, unknown> = {}
  if (validated.station_id !== undefined) updatePayload.station_id = validated.station_id
  if (validated.estimated_minutes !== undefined)
    updatePayload.estimated_minutes = validated.estimated_minutes
  if (validated.notes !== undefined) updatePayload.notes = validated.notes

  const { data, error } = await db
    .from('event_station_dishes')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select('*, event_id')
    .single()

  if (error) {
    console.error('[updateDishAssignment] Error:', error)
    throw new Error('Failed to update assignment')
  }

  revalidatePath(`/events/${data.event_id}`)
  revalidatePath('/ops/stations')
  return data
}

// ── Remove an assignment ─────────────────────────────────────────────

export async function removeDishAssignment(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get event_id for revalidation before deleting
  const { data: existing } = await db
    .from('event_station_dishes')
    .select('event_id')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  const { error } = await db
    .from('event_station_dishes')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[removeDishAssignment] Error:', error)
    throw new Error('Failed to remove assignment')
  }

  if (existing) revalidatePath(`/events/${existing.event_id}`)
  revalidatePath('/ops/stations')
}

// ── Bulk assign: assigns multiple dishes to stations at once ─────────

export async function bulkAssignDishes(
  eventId: string,
  assignments: { dish_id: string; station_id: string; estimated_minutes?: number | null }[]
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = assignments.map((a) => ({
    event_id: eventId,
    station_id: a.station_id,
    dish_id: a.dish_id,
    chef_id: user.tenantId!,
    estimated_minutes: a.estimated_minutes ?? null,
  }))

  const { error } = await db
    .from('event_station_dishes')
    .upsert(rows, { onConflict: 'event_id,dish_id' })

  if (error) {
    console.error('[bulkAssignDishes] Error:', error)
    throw new Error('Failed to bulk assign dishes')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/ops/stations')
}

// ── Get station plan for an event ────────────────────────────────────
// Returns dishes grouped by station, plus unassigned dishes.

export async function getEventStationPlan(eventId: string): Promise<{
  groups: StationPlanGroup[]
  unassigned: { id: string; name: string; course_number: number }[]
  stations: { id: string; name: string }[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all stations
  const { data: stations } = await db
    .from('stations')
    .select('id, name, display_order')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('display_order')

  // Get the event's menu and dishes
  const { data: menuRows } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .limit(1)

  const menuId = menuRows?.[0]?.id
  let allDishes: any[] = []

  if (menuId) {
    const { data: dishRows } = await db
      .from('dishes')
      .select('id, name, course_number, sort_order')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number')
      .order('sort_order')

    allDishes = dishRows ?? []
  }

  // Get existing assignments
  const { data: assignments } = await db
    .from('event_station_dishes')
    .select('id, station_id, dish_id, estimated_minutes, notes, sort_order')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  const assignmentsByDish = new Map<string, any>(
    (assignments ?? []).map((a: any) => [a.dish_id, a])
  )

  // Build groups
  const stationList = stations ?? []
  const groups: StationPlanGroup[] = []

  for (const station of stationList) {
    const stationDishes = allDishes
      .filter((d: any) => {
        const assignment = assignmentsByDish.get(d.id)
        return assignment && assignment.station_id === station.id
      })
      .map((d: any) => {
        const assignment = assignmentsByDish.get(d.id)
        return {
          id: d.id,
          assignment_id: assignment.id,
          name: d.name ?? 'Untitled dish',
          course_number: d.course_number,
          estimated_minutes: assignment.estimated_minutes,
          notes: assignment.notes,
        }
      })

    if (stationDishes.length > 0) {
      groups.push({
        station_id: station.id,
        station_name: station.name,
        dishes: stationDishes,
        total_estimated_minutes: stationDishes.reduce(
          (sum: number, d: any) => sum + (d.estimated_minutes ?? 0),
          0
        ),
      })
    }
  }

  // Build unassigned list
  const assignedDishIds = new Set((assignments ?? []).map((a: any) => a.dish_id))
  const unassigned = allDishes
    .filter((d: any) => !assignedDishIds.has(d.id))
    .map((d: any) => ({
      id: d.id,
      name: d.name ?? 'Untitled dish',
      course_number: d.course_number,
    }))

  return {
    groups,
    unassigned,
    stations: stationList.map((s: any) => ({ id: s.id, name: s.name })),
  }
}

// ── Get upcoming events for a specific station ───────────────────────
// Used on the stations coordination page to show "upcoming events at this station."

export async function getUpcomingEventsForStation(
  stationId: string
): Promise<StationUpcomingEvent[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all event_station_dishes for this station with upcoming events
  const { data: assignments } = await db
    .from('event_station_dishes')
    .select('event_id, dish_id, estimated_minutes')
    .eq('station_id', stationId)
    .eq('chef_id', user.tenantId!)

  if (!assignments || assignments.length === 0) return []

  // Get distinct event IDs
  const eventIds = [...new Set(assignments.map((a: any) => a.event_id))]

  // Get upcoming events from those IDs
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, status')
    .in('id', eventIds)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed","closed")')
    .order('event_date')

  if (!events || events.length === 0) return []

  // Build per-event summaries
  return events.map((event: any) => {
    const eventAssignments = assignments.filter((a: any) => a.event_id === event.id)
    return {
      event_id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
      dish_count: eventAssignments.length,
      total_estimated_minutes: eventAssignments.reduce(
        (sum: number, a: any) => sum + (a.estimated_minutes ?? 0),
        0
      ),
    }
  })
}

// ── Get upcoming events for ALL stations (batch) ─────────────────────
// Used by the stations coordination page to show upcoming events on each station card.

export async function getUpcomingEventsForAllStations(): Promise<
  Map<string, StationUpcomingEvent[]>
> {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: assignments } = await db
    .from('event_station_dishes')
    .select('event_id, station_id, dish_id, estimated_minutes')
    .eq('chef_id', user.tenantId!)

  if (!assignments || assignments.length === 0) return new Map()

  const eventIds = [...new Set(assignments.map((a: any) => a.event_id))]

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, status')
    .in('id', eventIds)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed","closed")')
    .order('event_date')

  if (!events || events.length === 0) return new Map()

  const upcomingEventIds = new Set(events.map((e: any) => e.id))
  const result = new Map<string, StationUpcomingEvent[]>()

  // Group assignments by station, then by event
  const byStation = new Map<string, any[]>()
  for (const a of assignments) {
    if (!upcomingEventIds.has(a.event_id)) continue
    const list = byStation.get(a.station_id) ?? []
    list.push(a)
    byStation.set(a.station_id, list)
  }

  const eventMap = new Map<string, any>(events.map((e: any) => [e.id, e]))

  for (const [stationId, stationAssignments] of byStation) {
    const eventGroups = new Map<string, any[]>()
    for (const a of stationAssignments) {
      const list = eventGroups.get(a.event_id) ?? []
      list.push(a)
      eventGroups.set(a.event_id, list)
    }

    const stationEvents: StationUpcomingEvent[] = []
    for (const [eventId, eventAssignments] of eventGroups) {
      const event = eventMap.get(eventId)
      if (!event) continue
      stationEvents.push({
        event_id: event.id,
        occasion: event.occasion,
        event_date: event.event_date,
        guest_count: event.guest_count,
        dish_count: eventAssignments.length,
        total_estimated_minutes: eventAssignments.reduce(
          (sum: number, a: any) => sum + (a.estimated_minutes ?? 0),
          0
        ),
      })
    }

    if (stationEvents.length > 0) {
      result.set(stationId, stationEvents)
    }
  }

  return result
}

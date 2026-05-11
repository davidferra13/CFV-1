'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// Types

export interface EventCluster {
  clusterName: string
  area: string
  events: {
    eventId: string
    eventName: string
    eventDate: string
    location: string
    clientName: string
    guestCount: number
  }[]
  eventCount: number
  dateSpan: string
}

export interface ShoppingTrip {
  suggestedDate: string
  coversEvents: {
    eventId: string
    eventName: string
    eventDate: string
  }[]
  area: string
  estimatedStops: number
  rationale: string
}

export interface MileageSavings {
  separateTrips: number
  clusteredTrips: number
  savedTrips: number
  estimatedMilesSaved: number
  estimatedTimeSavedMinutes: number
}

export interface TravelOptimization {
  clusters: EventCluster[]
  suggestedTrips: ShoppingTrip[]
  mileageSaved: MileageSavings
  weekStart: string
  weekEnd: string
  totalEvents: number
}

// Helpers

/** Normalize a location string for grouping. Groups by city or zip. */
function normalizeArea(
  city: string | null,
  state: string | null,
  zip: string | null,
  address: string | null
): string {
  if (city && state) return `${city.trim()}, ${state.trim()}`
  if (city) return city.trim()
  if (zip) return `ZIP ${zip.trim()}`
  if (address) {
    // Try to extract city from address
    const parts = address.split(',').map((p) => p.trim())
    if (parts.length >= 2) return parts[1]
    return parts[0]
  }
  return 'Unknown'
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

// Main Action

export async function optimizeWeeklyTravel(
  weekStart: string
): Promise<TravelOptimization | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const weekEnd = addDays(weekStart, 6)

  // Fetch events in the week, include a buffer of +3 days for prep shopping
  const extendedEnd = addDays(weekStart, 9)

  const { data: events, error: eventsError } = await db
    .from('events')
    .select(
      `id, occasion, event_date, serve_time, location_address, location_city,
       location_state, location_zip, guest_count, status,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted', 'in_progress'])
    .gte('event_date', weekStart)
    .lte('event_date', extendedEnd)
    .order('event_date', { ascending: true })

  if (eventsError || !events || events.length === 0) return null

  // Group events by area
  const areaGroups = new Map<string, any[]>()
  for (const event of events) {
    const area = normalizeArea(
      event.location_city,
      event.location_state,
      event.location_zip,
      event.location_address
    )
    const existing = areaGroups.get(area) ?? []
    existing.push({ ...event, _area: area })
    areaGroups.set(area, existing)
  }

  // Build clusters (areas with 2+ events, or single events)
  const clusters: EventCluster[] = []
  for (const [area, areaEvents] of areaGroups) {
    const sortedDates = areaEvents
      .map((e: any) => e.event_date)
      .sort()

    const dateSpan =
      sortedDates.length === 1
        ? sortedDates[0]
        : `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`

    clusters.push({
      clusterName:
        areaEvents.length > 1
          ? `${area} (${areaEvents.length} events)`
          : `${area}`,
      area,
      events: areaEvents.map((e: any) => ({
        eventId: e.id,
        eventName: e.occasion || 'Event',
        eventDate: e.event_date,
        location: [e.location_address, e.location_city, e.location_state]
          .filter(Boolean)
          .join(', '),
        clientName: e.client?.full_name ?? 'Unknown Client',
        guestCount: e.guest_count ?? 0,
      })),
      eventCount: areaEvents.length,
      dateSpan,
    })
  }

  // Sort clusters: multi-event clusters first, then alphabetically
  clusters.sort((a, b) => {
    if (a.eventCount !== b.eventCount) return b.eventCount - a.eventCount
    return a.area.localeCompare(b.area)
  })

  // Build suggested shopping trips
  const suggestedTrips: ShoppingTrip[] = []

  for (const cluster of clusters) {
    if (cluster.eventCount < 2) continue

    // Find earliest event in cluster
    const earliestDate = cluster.events
      .map((e) => e.eventDate)
      .sort()[0]

    // Suggest shopping 1-2 days before earliest event
    const suggestedShopDate = addDays(earliestDate, -1)

    suggestedTrips.push({
      suggestedDate: suggestedShopDate >= weekStart ? suggestedShopDate : weekStart,
      coversEvents: cluster.events.map((e) => ({
        eventId: e.eventId,
        eventName: e.eventName,
        eventDate: e.eventDate,
      })),
      area: cluster.area,
      estimatedStops: Math.min(cluster.eventCount + 1, 5), // grocery + specialty stops
      rationale: `${cluster.eventCount} events in ${cluster.area}. Buy for all in one trip instead of separate runs.`,
    })
  }

  // Also suggest consolidation for events on the same day in different areas
  const eventsByDate = new Map<string, any[]>()
  for (const event of events) {
    const existing = eventsByDate.get(event.event_date) ?? []
    existing.push(event)
    eventsByDate.set(event.event_date, existing)
  }

  for (const [date, dayEvents] of eventsByDate) {
    if (dayEvents.length < 2) continue
    // Only if they are in different areas
    const areas = new Set(
      dayEvents.map((e: any) =>
        normalizeArea(e.location_city, e.location_state, e.location_zip, e.location_address)
      )
    )
    if (areas.size < 2) continue

    const shopDate = addDays(date, -1)
    suggestedTrips.push({
      suggestedDate: shopDate >= weekStart ? shopDate : weekStart,
      coversEvents: dayEvents.map((e: any) => ({
        eventId: e.id,
        eventName: e.occasion || 'Event',
        eventDate: e.event_date,
      })),
      area: `Multiple areas (${Array.from(areas).join(', ')})`,
      estimatedStops: dayEvents.length + 1,
      rationale: `${dayEvents.length} events on ${date} in different areas. Consolidate shopping the day before to save day-of travel.`,
    })
  }

  // Estimate mileage savings
  const totalEvents = events.length
  const clusteredAreas = clusters.filter((c) => c.eventCount > 1)
  const separateTrips = totalEvents // worst case: one trip per event
  const clusteredTrips = clusters.length // best case: one trip per cluster
  const savedTrips = separateTrips - clusteredTrips

  // Rough estimate: 15 miles average per trip, 20 min per trip
  const estimatedMilesSaved = savedTrips * 15
  const estimatedTimeSavedMinutes = savedTrips * 20

  return {
    clusters,
    suggestedTrips,
    mileageSaved: {
      separateTrips,
      clusteredTrips,
      savedTrips: Math.max(0, savedTrips),
      estimatedMilesSaved: Math.max(0, estimatedMilesSaved),
      estimatedTimeSavedMinutes: Math.max(0, estimatedTimeSavedMinutes),
    },
    weekStart,
    weekEnd,
    totalEvents,
  }
}

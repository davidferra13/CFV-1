// Timeline Generation Engine
// Given an event, generates a complete day-of timeline working
// backwards from arrival time. Pure computation - no DB calls.

import type {
  ChefPreferences,
  DefaultStore,
  EventTimeline,
  TimelineItem,
  RouteStop,
  SchedulingEvent,
} from './types'
import { DEFAULT_PREFERENCES } from './types'
import type { TravelLeg } from '../travel/types'

// ============================================
// CONSTANTS
// ============================================

/**
 * Always-on travel buffer added on top of the estimated drive time.
 * The spec says: "15 minutes on top of estimated drive time. Always. Non-negotiable."
 */
const TRAVEL_BUFFER_MINUTES = 15

// ============================================
// HELPERS
// ============================================

/**
 * Parse "HH:MM" to minutes since midnight.
 */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Format minutes since midnight to "HH:MM".
 */
function formatTime(minutes: number): string {
  // Handle negative or overflow
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Estimate prep time based on component count.
 * Heuristic: 15 min per component, min 90, max 240.
 */
function estimatePrepMinutes(componentCount: number, defaultHours: number): number {
  if (componentCount > 0) {
    const estimated = componentCount * 15
    return Math.max(90, Math.min(240, estimated))
  }
  return defaultHours * 60
}

function getDefaultStores(prefs: ChefPreferences | null): DefaultStore[] {
  if (!prefs) return []

  const stores: DefaultStore[] = []

  for (const store of prefs.default_stores ?? []) {
    stores.push(store)
  }

  if (prefs.default_grocery_store) {
    stores.push({
      name: prefs.default_grocery_store,
      address: prefs.default_grocery_address || '',
      place_id: null,
    })
  }

  if (prefs.default_liquor_store) {
    stores.push({
      name: prefs.default_liquor_store,
      address: prefs.default_liquor_address || '',
      place_id: null,
    })
  }

  for (const store of prefs.default_specialty_stores ?? []) {
    stores.push(store)
  }

  const deduped: DefaultStore[] = []
  const seen = new Set<string>()
  for (const store of stores) {
    const name = store.name.trim()
    if (!name) continue
    const address = (store.address || '').trim()
    const key = `${name.toLowerCase()}|${address.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push({ name, address, place_id: store.place_id ?? null })
  }

  return deduped
}

// ============================================
// TIMELINE GENERATOR
// ============================================

/**
 * Generate a complete day-of timeline for an event.
 *
 * Works backwards from arrival time:
 * ARRIVAL -> DEPART -> PACK (= prep complete) -> START PREP -> HOME FROM SHOPPING -> LEAVE FOR STORE -> WAKE
 *
 * If `legs` are provided (from event_travel_legs), the timeline uses their
 * actual planned times instead of heuristic calculations:
 * - A `service_travel` leg overrides the departure time and drive estimate.
 * - A `grocery_shopping` / `consolidated_shopping` leg on a DIFFERENT date
 *   removes the day-of shopping block (shopping already planned elsewhere).
 */
export function generateTimeline(
  event: SchedulingEvent,
  prefs: ChefPreferences | null,
  legs?: TravelLeg[]
): EventTimeline {
  const p = prefs ?? { ...DEFAULT_PREFERENCES, id: '', chef_id: '' }
  const stores = getDefaultStores(p)

  const warnings: string[] = []
  const timeline: TimelineItem[] = []

  // ── Travel leg overrides ────────────────────────────────────────────────────
  // If planned legs exist, use their data instead of heuristic defaults.

  // service_travel leg → override departure time and drive estimate
  const serviceLeg = legs?.find((l) => l.leg_type === 'service_travel' && l.status !== 'cancelled')
  const legTravelMinutes = serviceLeg?.total_estimated_minutes ?? null

  // Shopping planned on a DIFFERENT date → suppress day-of shopping block
  const shoppingLeg = legs?.find(
    (l) =>
      (l.leg_type === 'grocery_shopping' || l.leg_type === 'consolidated_shopping') &&
      l.status !== 'cancelled' &&
      l.leg_date !== event.event_date
  )
  const shoppingHandledElsewhere = !!shoppingLeg

  // Resolve key times
  const travelMinutes = legTravelMinutes ?? event.travel_time_minutes ?? 30
  const bufferMinutes = p.default_buffer_minutes
  const packingMinutes = p.default_packing_minutes
  const shoppingMinutes = p.default_shopping_minutes
  const prepMinutes = estimatePrepMinutes(
    event.menuComponentCount ?? 0,
    p.default_prep_hours
  )

  // Parse serve time and arrival time
  const serveTimeStr = event.serve_time || '18:00'
  const serveTimeMinutes = parseTime(serveTimeStr)

  // Arrival time: use event override, or serve_time - buffer
  const arrivalMinutes = event.arrival_time
    ? parseTime(event.arrival_time)
    : serveTimeMinutes - bufferMinutes

  // 1. ARRIVAL at client
  timeline.push({
    id: 'arrival',
    time: formatTime(arrivalMinutes),
    label: 'Arrive at client',
    description: `Arrive at ${event.location_address || 'client location'}. ${bufferMinutes} min buffer before service.`,
    type: 'arrival',
    isDeadline: true,
    isFlexible: false,
  })

  // 2. SERVICE (serve time)
  if (serveTimeMinutes > arrivalMinutes) {
    timeline.push({
      id: 'service',
      time: formatTime(serveTimeMinutes),
      label: 'Service begins',
      description: `Start serving ${event.guest_count} guests.`,
      type: 'service',
      isDeadline: true,
      isFlexible: false,
    })
  }

  // 3. DEPART HOME
  // Drive time + always-on 15-min travel buffer (traffic, parking, unloading).
  const departMinutes = arrivalMinutes - travelMinutes - TRAVEL_BUFFER_MINUTES
  timeline.push({
    id: 'departure',
    time: formatTime(departMinutes),
    label: 'Depart for client',
    description: `${travelMinutes} min drive + ${TRAVEL_BUFFER_MINUTES} min buffer → ${event.location_city || 'client location'}.`,
    type: 'departure',
    isDeadline: true,
    isFlexible: false,
  })

  // 4. PACKING — prep completion and packing start are the same moment.
  // Showing both at the same timestamp creates duplicate entries; fold into one.
  const carPackedMinutes = departMinutes - packingMinutes
  timeline.push({
    id: 'packing',
    time: formatTime(carPackedMinutes),
    label: 'Prep complete — start packing',
    description: `All food prep done. Pack coolers, equipment, and supplies. ${packingMinutes} min.`,
    type: 'packing',
    isDeadline: false,
    isFlexible: false,
  })

  // 5. START PREP / HOME FROM SHOPPING
  // In shop-day-before flow: explicit start_prep block (chef is already home).
  // In day-of shopping flow: home_from_shopping carries the prep-start meaning —
  // adding start_prep at the same timestamp would create a duplicate like finish_prep did.
  const startPrepMinutes = carPackedMinutes - prepMinutes
  const prepHoursLabel = `${Math.round((prepMinutes / 60) * 10) / 10} hours of prep work.`

  let wakeMinutesTarget: number

  if (!p.shop_day_before && !shoppingHandledElsewhere) {
    // Day-of shopping — show shopping blocks in the timeline.
    const homeFromShoppingMinutes = startPrepMinutes
    const leaveForStoreMinutes = homeFromShoppingMinutes - shoppingMinutes - buildRouteDriveTime(p)

    timeline.push({
      id: 'home_from_shopping',
      time: formatTime(homeFromShoppingMinutes),
      label: 'Home from shopping — start prep',
      description: `All ingredients in the house. ${prepHoursLabel}`,
      type: 'shopping',
      isDeadline: false,
      isFlexible: false,
    })

    timeline.push({
      id: 'leave_for_store',
      time: formatTime(leaveForStoreMinutes),
      label: `Leave for ${stores[0]?.name || 'store'}`,
      description: buildShoppingDescription(stores),
      type: 'shopping',
      isDeadline: false,
      isFlexible: true,
    })

    wakeMinutesTarget = leaveForStoreMinutes - 30
  } else {
    // shop_day_before is true, OR shopping is planned on a different date via a travel leg.
    // Either way: no day-of shopping block; just show start_prep.
    timeline.push({
      id: 'start_prep',
      time: formatTime(startPrepMinutes),
      label: 'Start prep',
      description: `Estimated ${prepHoursLabel}`,
      type: 'prep',
      isDeadline: false,
      isFlexible: true,
    })

    wakeMinutesTarget = startPrepMinutes - 30
  }

  // 6. WAKE UP
  timeline.push({
    id: 'wake',
    time: formatTime(wakeMinutesTarget),
    label: 'Wake up',
    description: (p.shop_day_before || shoppingHandledElsewhere)
      ? 'Get ready and start prep.'
      : 'Get ready, then leave for shopping.',
    type: 'wake',
    isDeadline: false,
    isFlexible: true,
  })

  if (departMinutes < 0 || arrivalMinutes < 0) {
    warnings.push(
      'Some timeline milestones fall before midnight. Check serve time and travel time.'
    )
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => parseTime(a.time) - parseTime(b.time))

  // Build route
  const route = buildRoute(event, p, stores)

  return {
    eventId: event.id,
    eventDate: event.event_date,
    timeline,
    route,
    warnings,
  }
}

// ============================================
// ROUTE BUILDING
// ============================================

function buildRouteDriveTime(prefs: ChefPreferences | null): number {
  // Estimate: 15 min per stop (home -> stores -> home)
  const stops = Math.max(1, getDefaultStores(prefs).length)
  return stops * 15
}

function buildRoute(
  event: SchedulingEvent,
  prefs: ChefPreferences | null,
  stores: DefaultStore[]
): EventTimeline['route'] {
  const p = prefs ?? { ...DEFAULT_PREFERENCES, id: '', chef_id: '' }
  const stops: RouteStop[] = []
  let totalDrive = 0

  // Only include store stops when shopping day-of.
  // If shop_day_before is true, shopping happened yesterday — today's route is HOME → CLIENT only.
  if (!p.shop_day_before && stores.length > 0) {
    const perStoreMinutes = Math.max(10, Math.round(p.default_shopping_minutes / stores.length))

    for (const store of stores) {
      stops.push({
        name: store.name,
        address: store.address,
        purpose: 'Store',
        estimatedMinutes: perStoreMinutes,
      })
      totalDrive += 15
    }
  }

  // Client location (for day-of route).
  // Include the always-on travel buffer so the route total matches the timeline's departure slot.
  if (event.location_address) {
    stops.push({
      name: event.client?.full_name || 'Client',
      address: [event.location_address, event.location_city].filter(Boolean).join(', '),
      purpose: 'Event location',
      estimatedMinutes: 0,
    })
    totalDrive += (event.travel_time_minutes ?? 30) + TRAVEL_BUFFER_MINUTES
  }

  return { stops, totalDriveMinutes: totalDrive }
}

function buildShoppingDescription(stores: DefaultStore[]): string {
  const stops = stores.map((store) => store.name).filter(Boolean)

  if (stops.length > 1) {
    return `Route: ${stops.join(' -> ')} -> home`
  }
  if (stops.length === 1) {
    return `${stops[0]} -> home`
  }
  return 'Store run'
}

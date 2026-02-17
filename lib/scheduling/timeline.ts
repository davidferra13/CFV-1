// Timeline Generation Engine
// Given an event, generates a complete day-of timeline working
// backwards from arrival time. Pure computation — no DB calls.

import type {
  ChefPreferences,
  EventTimeline,
  TimelineItem,
  RouteStop,
  SchedulingEvent,
} from './types'
import { DEFAULT_PREFERENCES } from './types'

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

// ============================================
// TIMELINE GENERATOR
// ============================================

/**
 * Generate a complete day-of timeline for an event.
 *
 * Works backwards from arrival time:
 *   ARRIVAL → DEPART → PACK → FINISH PREP → START PREP → HOME FROM SHOPPING → LEAVE FOR STORE → WAKE
 */
export function generateTimeline(
  event: SchedulingEvent,
  prefs: ChefPreferences | null
): EventTimeline {
  const p = prefs ?? { ...DEFAULT_PREFERENCES, id: '', chef_id: '' }

  const warnings: string[] = []
  const timeline: TimelineItem[] = []

  // Resolve key times
  const travelMinutes = event.travel_time_minutes ?? 30
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

  // ---- WORK BACKWARDS ----

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
  const departMinutes = arrivalMinutes - travelMinutes
  timeline.push({
    id: 'departure',
    time: formatTime(departMinutes),
    label: 'Depart for client',
    description: `${travelMinutes} min drive to ${event.location_city || 'client'}.`,
    type: 'departure',
    isDeadline: true,
    isFlexible: false,
  })

  // 4. CAR PACKED
  const carPackedMinutes = departMinutes - packingMinutes
  timeline.push({
    id: 'packing',
    time: formatTime(carPackedMinutes),
    label: 'Start packing car',
    description: `Pack coolers, equipment, and supplies. ${packingMinutes} min.`,
    type: 'packing',
    isDeadline: false,
    isFlexible: false,
  })

  // 5. FINISH PREP (= car packed time)
  timeline.push({
    id: 'finish_prep',
    time: formatTime(carPackedMinutes),
    label: 'Finish all prep',
    description: 'All food prep complete. Ready to pack.',
    type: 'milestone',
    isDeadline: false,
    isFlexible: false,
  })

  // 6. START PREP
  const startPrepMinutes = carPackedMinutes - prepMinutes
  timeline.push({
    id: 'start_prep',
    time: formatTime(startPrepMinutes),
    label: 'Start prep',
    description: `Estimated ${Math.round(prepMinutes / 60 * 10) / 10} hours of prep work.`,
    type: 'prep',
    isDeadline: false,
    isFlexible: true,
  })

  // Shopping route (if shopping day-of)
  let wakeMinutesTarget: number

  if (!p.shop_day_before) {
    // Shopping happens day-of before prep
    const homeFromShoppingMinutes = startPrepMinutes
    const leaveForStoreMinutes = homeFromShoppingMinutes - shoppingMinutes - buildRouteDriveTime(event, p)

    timeline.push({
      id: 'home_from_shopping',
      time: formatTime(homeFromShoppingMinutes),
      label: 'Home from shopping',
      description: 'All ingredients in the house. Start prep immediately.',
      type: 'shopping',
      isDeadline: false,
      isFlexible: false,
    })

    timeline.push({
      id: 'leave_for_store',
      time: formatTime(leaveForStoreMinutes),
      label: `Leave for ${p.default_grocery_store || 'grocery store'}`,
      description: buildShoppingDescription(event, p),
      type: 'shopping',
      isDeadline: false,
      isFlexible: true,
    })

    // Wake up 30 min before leaving for store
    wakeMinutesTarget = leaveForStoreMinutes - 30
  } else {
    // Shopping was done day before — wake up before prep
    wakeMinutesTarget = startPrepMinutes - 30
  }

  // 7. WAKE UP
  const wakeEarliestMinutes = parseTime(p.wake_time_earliest)
  const wakeLatestMinutes = parseTime(p.wake_time_latest)

  timeline.push({
    id: 'wake',
    time: formatTime(wakeMinutesTarget),
    label: 'Wake up',
    description: p.shop_day_before
      ? 'Get ready and start prep.'
      : 'Get ready, then leave for shopping.',
    type: 'wake',
    isDeadline: false,
    isFlexible: true,
  })

  // ---- WARNINGS ----

  if (wakeMinutesTarget < wakeEarliestMinutes) {
    warnings.push(
      `Wake time (${formatTime(wakeMinutesTarget)}) is before your earliest preferred wake time (${formatTime(wakeEarliestMinutes)}). Consider shopping the day before or starting prep earlier.`
    )
  }

  if (wakeMinutesTarget > wakeLatestMinutes) {
    warnings.push(
      `Wake time (${formatTime(wakeMinutesTarget)}) is after your latest acceptable wake time (${formatTime(wakeLatestMinutes)}). You have extra buffer today.`
    )
  }

  if (startPrepMinutes < wakeMinutesTarget) {
    warnings.push(
      'Prep needs to start before wake time - this timeline is very tight.'
    )
  }

  if (departMinutes < 0 || arrivalMinutes < 0) {
    warnings.push(
      'Some timeline milestones fall before midnight. Check serve time and travel time.'
    )
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => parseTime(a.time) - parseTime(b.time))

  // Build route
  const route = buildRoute(event, p)

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

function buildRouteDriveTime(
  event: SchedulingEvent,
  prefs: ChefPreferences | null
): number {
  // Estimate: 15 min per stop (home → store → store → home)
  let stops = 1 // grocery store
  if (event.hasAlcohol && prefs?.default_liquor_store) stops++
  // Each specialty store adds a stop
  stops += (prefs?.default_specialty_stores?.length ?? 0)
  return stops * 15
}

function buildRoute(
  event: SchedulingEvent,
  prefs: ChefPreferences | null
): EventTimeline['route'] {
  const p = prefs ?? { ...DEFAULT_PREFERENCES, id: '', chef_id: '' }
  const stops: RouteStop[] = []
  let totalDrive = 0

  // Home → Grocery store
  if (p.default_grocery_store) {
    stops.push({
      name: p.default_grocery_store,
      address: p.default_grocery_address || '',
      purpose: 'Groceries',
      estimatedMinutes: p.default_shopping_minutes,
    })
    totalDrive += 15
  }

  // Liquor store (if event has alcohol)
  if (event.hasAlcohol && p.default_liquor_store) {
    stops.push({
      name: p.default_liquor_store,
      address: p.default_liquor_address || '',
      purpose: 'Liquor',
      estimatedMinutes: 15,
    })
    totalDrive += 10
  }

  // Specialty stores
  for (const store of p.default_specialty_stores ?? []) {
    stops.push({
      name: store.name,
      address: store.address,
      purpose: `Specialty: ${store.notes || store.name}`,
      estimatedMinutes: 20,
    })
    totalDrive += 10
  }

  // Client location (for day-of route)
  if (event.location_address) {
    stops.push({
      name: event.client?.full_name || 'Client',
      address: [event.location_address, event.location_city].filter(Boolean).join(', '),
      purpose: 'Event location',
      estimatedMinutes: 0,
    })
    totalDrive += event.travel_time_minutes ?? 30
  }

  return { stops, totalDriveMinutes: totalDrive }
}

function buildShoppingDescription(
  event: SchedulingEvent,
  prefs: ChefPreferences | null
): string {
  const p = prefs ?? { ...DEFAULT_PREFERENCES, id: '', chef_id: '' }
  const stops: string[] = []

  if (p.default_grocery_store) stops.push(p.default_grocery_store)
  if (event.hasAlcohol && p.default_liquor_store) stops.push(p.default_liquor_store)
  for (const store of p.default_specialty_stores ?? []) {
    stops.push(store.name)
  }

  if (stops.length > 1) {
    return `Route: ${stops.join(' → ')} → home`
  }
  if (stops.length === 1) {
    return `${stops[0]} → home`
  }
  return 'Grocery shopping'
}

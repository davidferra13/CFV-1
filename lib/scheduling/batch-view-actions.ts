'use server'

// Batch View - Server Actions
// Aggregated scheduling views: events grouped by day, shared ingredients,
// day load forecasting, and unified timelines across date ranges.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  BatchDay,
  BatchEventSummary,
  BatchPrepItem,
  SharedIngredient,
  DayLoad,
  BatchTimelineEntry,
  WeeklyBatchView,
  BatchPrepConsolidation,
  BatchTimeline,
} from './batch-view-types'

// ============================================
// HELPERS
// ============================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return formatDateStr(new Date(y, m - 1, d + days))
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

function getDayLabel(dateStr: string): string {
  return DAY_NAMES[getDayOfWeek(dateStr)]
}

function dateToDateKey(raw: string | Date): string {
  if (typeof raw === 'string') {
    // Already ISO date or ISO datetime
    return raw.slice(0, 10)
  }
  return formatDateStr(raw)
}

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null
  const parts = time.split(':').map(Number)
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null
  return parts[0] * 60 + parts[1]
}

function formatMinutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEventSummary(event: Record<string, any>): BatchEventSummary {
  return {
    eventId: event.id,
    occasion: event.occasion ?? null,
    eventDate: dateToDateKey(event.event_date),
    serveTime: event.serve_time ?? null,
    arrivalTime: event.arrival_time ?? null,
    travelTimeMinutes: event.travel_time_minutes ?? null,
    guestCount: event.guest_count ?? null,
    status: event.status ?? null,
    clientName: event.client?.full_name ?? null,
    locationCity: event.location_city ?? null,
    menuCount: 0,
    componentCount: 0,
    prepCompleted: Boolean(event.prep_completed_at),
    shoppingCompleted: Boolean(event.shopping_completed_at),
  }
}

// ============================================
// 1. getWeeklyBatchView
// ============================================

/**
 * All events in a given week grouped by day, with prep/service windows.
 * weekStart should be an ISO date string (YYYY-MM-DD) for the Monday of the week.
 * If omitted, defaults to the current week.
 */
export async function getWeeklyBatchView(weekStart?: string): Promise<WeeklyBatchView> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Determine week boundaries
  const now = new Date()
  let startDate: string
  if (weekStart) {
    startDate = weekStart
  } else {
    // Find the most recent Monday
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    startDate = formatDateStr(monday)
  }
  const endDate = addDays(startDate, 6)

  // Fetch events in this week
  const { data: events } = await db
    .from('events')
    .select(
      `id, occasion, event_date, serve_time, arrival_time, travel_time_minutes,
       guest_count, status, location_city,
       prep_completed_at, shopping_completed_at,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })

  const eventList: any[] = events ?? []

  // Fetch prep blocks for the week
  const { data: prepBlocks } = await db
    .from('event_prep_blocks')
    .select('id, event_id, title, block_date, start_time, end_time')
    .eq('chef_id', tenantId)
    .gte('block_date', startDate)
    .lte('block_date', endDate)
    .order('block_date', { ascending: true })

  const blockList: any[] = prepBlocks ?? []

  // Get menu counts per event
  const eventIds = eventList.map((e: any) => e.id)
  let menuCountMap = new Map<string, number>()
  let componentCountMap = new Map<string, number>()

  if (eventIds.length > 0) {
    const { data: menus } = await db.from('menus').select('id, event_id').in('event_id', eventIds)

    const menuList: any[] = menus ?? []
    for (const m of menuList) {
      menuCountMap.set(m.event_id, (menuCountMap.get(m.event_id) ?? 0) + 1)
    }

    // Get dish/component counts
    const menuIds = menuList.map((m: any) => m.id)
    if (menuIds.length > 0) {
      const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

      const dishList: any[] = dishes ?? []
      const menuToEvent = new Map<string, string>()
      for (const m of menuList) {
        menuToEvent.set(m.id, m.event_id)
      }
      for (const d of dishList) {
        const eid = menuToEvent.get(d.menu_id)
        if (eid) {
          componentCountMap.set(eid, (componentCountMap.get(eid) ?? 0) + 1)
        }
      }
    }
  }

  // Build event occasion map for prep blocks
  const eventOccasionMap = new Map<string, string | null>()
  for (const e of eventList) {
    eventOccasionMap.set(e.id, e.occasion ?? null)
  }

  // Group by date
  const dayMap = new Map<string, { events: BatchEventSummary[]; prepBlocks: BatchPrepItem[] }>()

  for (const event of eventList) {
    const dateKey = dateToDateKey(event.event_date)
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { events: [], prepBlocks: [] })
    }
    const summary = mapEventSummary(event)
    summary.menuCount = menuCountMap.get(event.id) ?? 0
    summary.componentCount = componentCountMap.get(event.id) ?? 0
    dayMap.get(dateKey)!.events.push(summary)
  }

  for (const block of blockList) {
    const dateKey = dateToDateKey(block.block_date)
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { events: [], prepBlocks: [] })
    }
    dayMap.get(dateKey)!.prepBlocks.push({
      blockId: block.id,
      eventId: block.event_id ?? null,
      eventOccasion: block.event_id ? (eventOccasionMap.get(block.event_id) ?? null) : null,
      title: block.title,
      blockDate: dateToDateKey(block.block_date),
      startTime: block.start_time ?? null,
      endTime: block.end_time ?? null,
    })
  }

  // Build sorted days array (include all 7 days of the week)
  const days: BatchDay[] = []
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(startDate, i)
    const bucket = dayMap.get(dateStr)
    const dayEvents = bucket?.events ?? []
    days.push({
      date: dateStr,
      dayLabel: getDayLabel(dateStr),
      dayOfWeek: getDayOfWeek(dateStr),
      events: dayEvents,
      totalGuests: dayEvents.reduce((sum, e) => sum + (e.guestCount ?? 0), 0),
      prepBlocks: bucket?.prepBlocks ?? [],
    })
  }

  const totalEvents = eventList.length
  const totalGuests = days.reduce((sum, d) => sum + d.totalGuests, 0)

  return {
    weekStart: startDate,
    weekEnd: endDate,
    days,
    totalEvents,
    totalGuests,
  }
}

// ============================================
// 2. getBatchPrepConsolidation
// ============================================

/**
 * Overlapping events and shared ingredient opportunities in a date range.
 * Identifies days with multiple events and ingredients common across them.
 */
export async function getBatchPrepConsolidation(dateRange: {
  start: string
  end: string
}): Promise<BatchPrepConsolidation> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch events in range
  const { data: events } = await db
    .from('events')
    .select(
      `id, occasion, event_date, serve_time, arrival_time, travel_time_minutes,
       guest_count, status, location_city,
       prep_completed_at, shopping_completed_at,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', dateRange.start)
    .lte('event_date', dateRange.end)
    .order('event_date', { ascending: true })

  const eventList: any[] = events ?? []

  if (eventList.length === 0) {
    return {
      dateRange,
      overlappingDays: [],
      sharedIngredients: [],
      totalEvents: 0,
    }
  }

  // Find days with 2+ events
  const byDate = new Map<string, BatchEventSummary[]>()
  for (const event of eventList) {
    const dateKey = dateToDateKey(event.event_date)
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(mapEventSummary(event))
  }

  const overlappingDays = Array.from(byDate.entries())
    .filter(([, evts]) => evts.length >= 2)
    .map(([date, evts]) => ({ date, events: evts }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Get shared ingredients across all events in range
  const eventIds = eventList.map((e: any) => e.id)
  const sharedIngredients = await fetchSharedIngredients(db, eventIds, eventList)

  return {
    dateRange,
    overlappingDays,
    sharedIngredients,
    totalEvents: eventList.length,
  }
}

// ============================================
// 3. getSharedIngredientsList
// ============================================

/**
 * Common ingredients across multiple specified events for bulk purchasing.
 * Only returns ingredients used by 2+ of the given events.
 */
export async function getSharedIngredientsList(eventIds: string[]): Promise<SharedIngredient[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  if (eventIds.length < 2) return []

  // Verify events belong to this tenant
  const { data: verifiedEvents } = await db
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', tenantId)
    .in('id', eventIds)

  const verified: any[] = verifiedEvents ?? []
  if (verified.length < 2) return []

  return fetchSharedIngredients(
    db,
    verified.map((e: any) => e.id),
    verified
  )
}

// ============================================
// 4. getBatchTimeline
// ============================================

/**
 * Unified timeline across all events in a date range.
 * Merges prep blocks, arrival times, and service times into a single sorted timeline.
 */
export async function getBatchTimeline(dateRange: {
  start: string
  end: string
}): Promise<BatchTimeline> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch events
  const { data: events } = await db
    .from('events')
    .select(
      `id, occasion, event_date, serve_time, arrival_time, travel_time_minutes,
       guest_count, status,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', dateRange.start)
    .lte('event_date', dateRange.end)
    .order('event_date', { ascending: true })

  const eventList: any[] = events ?? []

  // Fetch prep blocks
  const { data: prepBlocks } = await db
    .from('event_prep_blocks')
    .select('id, event_id, title, block_date, start_time, end_time')
    .eq('chef_id', tenantId)
    .gte('block_date', dateRange.start)
    .lte('block_date', dateRange.end)
    .order('block_date', { ascending: true })

  const blockList: any[] = prepBlocks ?? []

  const entries: BatchTimelineEntry[] = []

  // Add event timeline entries
  for (const event of eventList) {
    const dateKey = dateToDateKey(event.event_date)
    const occasion = event.occasion ?? 'Event'

    if (event.arrival_time) {
      entries.push({
        time: event.arrival_time,
        type: 'arrival',
        label: `Arrive: ${occasion}`,
        eventId: event.id,
        eventOccasion: occasion,
        date: dateKey,
      })
    }

    if (event.serve_time) {
      entries.push({
        time: event.serve_time,
        type: 'service',
        label: `Serve: ${occasion}`,
        eventId: event.id,
        eventOccasion: occasion,
        date: dateKey,
      })
    }

    // If travel time is known and arrival time exists, add travel start
    if (event.arrival_time && event.travel_time_minutes) {
      const arrivalMinutes = parseTimeToMinutes(event.arrival_time)
      if (arrivalMinutes !== null) {
        const travelStart = arrivalMinutes - event.travel_time_minutes
        entries.push({
          time: formatMinutesToTime(travelStart),
          type: 'travel',
          label: `Depart for: ${occasion} (${event.travel_time_minutes} min drive)`,
          eventId: event.id,
          eventOccasion: occasion,
          date: dateKey,
        })
      }
    }
  }

  // Add prep block entries
  const eventOccasionMap = new Map<string, string>()
  for (const e of eventList) {
    eventOccasionMap.set(e.id, e.occasion ?? 'Event')
  }

  for (const block of blockList) {
    const dateKey = dateToDateKey(block.block_date)
    entries.push({
      time: block.start_time ?? '00:00',
      type: 'prep',
      label: block.title || 'Prep block',
      eventId: block.event_id ?? null,
      eventOccasion: block.event_id ? (eventOccasionMap.get(block.event_id) ?? null) : null,
      date: dateKey,
    })
  }

  // Sort by date, then by time
  entries.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return (a.time ?? '').localeCompare(b.time ?? '')
  })

  return {
    dateRange,
    entries,
    totalEvents: eventList.length,
  }
}

// ============================================
// 5. getDayLoadForecast
// ============================================

/**
 * How heavy a specific day is: events, prep blocks, travel, guest count.
 * Returns a 0-100 load score and a status label.
 */
export async function getDayLoadForecast(date: string): Promise<DayLoad> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get events on this day
  const { data: events } = await db
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, arrival_time, travel_time_minutes, guest_count, status'
    )
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', date)
    .lte('event_date', date)

  const eventList: any[] = events ?? []

  // Get prep blocks on this day
  const { data: prepBlocks } = await db
    .from('event_prep_blocks')
    .select('id, start_time, end_time')
    .eq('chef_id', tenantId)
    .eq('block_date', date)

  const blockList: any[] = prepBlocks ?? []

  // Calculate metrics
  const eventCount = eventList.length
  const totalGuests = eventList.reduce((sum: number, e: any) => sum + (e.guest_count ?? 0), 0)
  const prepBlockCount = blockList.length

  // Estimate prep minutes from block time ranges
  let estimatedPrepMinutes = 0
  for (const block of blockList) {
    const start = parseTimeToMinutes(block.start_time)
    const end = parseTimeToMinutes(block.end_time)
    if (start !== null && end !== null && end > start) {
      estimatedPrepMinutes += end - start
    } else {
      // Default: 90 minutes per unspecified prep block
      estimatedPrepMinutes += 90
    }
  }

  // Estimate total travel minutes
  let estimatedTravelMinutes = 0
  for (const event of eventList) {
    estimatedTravelMinutes += event.travel_time_minutes ?? 0
  }

  // Calculate load score (0-100)
  // Weights: events (30), guests (20), prep time (30), travel (20)
  const eventScore = Math.min(eventCount * 25, 100) // 4+ events = maxed
  const guestScore = Math.min(totalGuests * 2, 100) // 50+ guests = maxed
  const prepScore = Math.min(estimatedPrepMinutes / 4.8, 100) // 8h prep = maxed
  const travelScore = Math.min(estimatedTravelMinutes / 1.8, 100) // 3h travel = maxed

  const loadScore = Math.round(
    eventScore * 0.3 + guestScore * 0.2 + prepScore * 0.3 + travelScore * 0.2
  )
  const clampedScore = Math.max(0, Math.min(100, loadScore))

  let status: DayLoad['status']
  if (clampedScore >= 80) status = 'overloaded'
  else if (clampedScore >= 55) status = 'heavy'
  else if (clampedScore >= 25) status = 'moderate'
  else status = 'light'

  return {
    date,
    dayLabel: getDayLabel(date),
    eventCount,
    totalGuests,
    prepBlockCount,
    estimatedPrepMinutes,
    estimatedTravelMinutes,
    loadScore: clampedScore,
    status,
  }
}

// ============================================
// SHARED HELPER: Ingredient aggregation
// ============================================

/**
 * Fetch and aggregate ingredients across events via:
 * events -> event_menus -> menus -> dishes -> dish_ingredients
 */
async function fetchSharedIngredients(
  db: any,
  eventIds: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventList: any[]
): Promise<SharedIngredient[]> {
  if (eventIds.length === 0) return []

  const eventOccasionMap = new Map<string, string | null>()
  for (const e of eventList) {
    eventOccasionMap.set(e.id, e.occasion ?? null)
  }

  // Get event -> menu links
  const { data: menuLinks } = await db
    .from('event_menus')
    .select('event_id, menu_id')
    .in('event_id', eventIds)

  if (!menuLinks || menuLinks.length === 0) return []

  const menuIds = [...new Set(menuLinks.map((ml: any) => ml.menu_id))]
  const menuToEvents = new Map<string, string[]>()
  for (const ml of menuLinks) {
    const existing = menuToEvents.get(ml.menu_id) ?? []
    existing.push(ml.event_id)
    menuToEvents.set(ml.menu_id, existing)
  }

  // Get dishes for these menus
  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d: any) => d.id)
  const dishToMenu = new Map<string, string>(dishes.map((d: any) => [d.id, d.menu_id]))

  // Get ingredients for these dishes
  const { data: ingredients } = await db
    .from('dish_ingredients')
    .select('dish_id, ingredient_name, quantity, unit')
    .in('dish_id', dishIds)

  if (!ingredients || ingredients.length === 0) return []

  // Aggregate: key = ingredientName|unit
  const aggMap = new Map<
    string,
    {
      ingredientName: string
      totalQuantity: number
      unit: string | null
      events: Map<string, { eventId: string; eventOccasion: string | null; quantity: number }>
    }
  >()

  for (const ing of ingredients) {
    const menuId = dishToMenu.get(ing.dish_id)
    const associatedEventIds = menuId ? (menuToEvents.get(menuId) ?? []) : []
    const key = `${(ing.ingredient_name || '').toLowerCase().trim()}|${ing.unit || ''}`
    const qty = Number(ing.quantity) || 0

    if (!aggMap.has(key)) {
      aggMap.set(key, {
        ingredientName: ing.ingredient_name || 'Unknown',
        totalQuantity: 0,
        unit: ing.unit ?? null,
        events: new Map(),
      })
    }

    const agg = aggMap.get(key)!
    agg.totalQuantity += qty

    for (const eid of associatedEventIds) {
      if (agg.events.has(eid)) {
        agg.events.get(eid)!.quantity += qty
      } else {
        agg.events.set(eid, {
          eventId: eid,
          eventOccasion: eventOccasionMap.get(eid) ?? null,
          quantity: qty,
        })
      }
    }
  }

  // Only return ingredients shared by 2+ events
  const result: SharedIngredient[] = []
  for (const agg of aggMap.values()) {
    if (agg.events.size >= 2) {
      result.push({
        ingredientName: agg.ingredientName,
        totalQuantity: Math.round(agg.totalQuantity * 1000) / 1000,
        unit: agg.unit,
        events: Array.from(agg.events.values()),
        sharedCount: agg.events.size,
      })
    }
  }

  return result.sort(
    (a, b) => b.sharedCount - a.sharedCount || a.ingredientName.localeCompare(b.ingredientName)
  )
}

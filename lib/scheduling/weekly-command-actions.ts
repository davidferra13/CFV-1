'use server'

// Weekly Command Center - Server Actions
// Forward-looking multi-event weekly planning: consolidated overview,
// conflict detection, ingredient consolidation, daily load, revenue projection.
// Auth-gated via requireChef(), tenant-scoped. No new tables.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CommandEventSummary,
  TimeSlot,
  WeeklyCommandView,
  WeeklyConflict,
  WeeklyConflictsResult,
  ConsolidatedIngredient,
  WeeklyIngredientConsolidation,
  DailyLoadBreakdown,
  SlotLoad,
  EventRevenueProjection,
  WeeklyRevenueProjection,
} from './weekly-command-types'

// ── Helpers ─────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + days)
  return [
    result.getFullYear(),
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
  ].join('-')
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[d.getDay()]
}

/** Derive time slot from serve_time or arrival_time (HH:MM:SS or HH:MM). */
function deriveTimeSlot(serveTime: string | null, arrivalTime: string | null): TimeSlot {
  const raw = serveTime ?? arrivalTime
  if (!raw) return 'evening' // default assumption for dinner events
  const hour = parseInt(raw.split(':')[0], 10)
  if (isNaN(hour)) return 'evening'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

/** Active event statuses (exclude cancelled and draft for planning). */
const ACTIVE_STATUSES = ['confirmed', 'accepted', 'paid', 'proposed', 'in_progress']

// ── Fetch week events (shared across actions) ───────────────────────────────────

async function fetchWeekEvents(
  db: any,
  tenantId: string,
  weekStart: string,
  weekEnd: string
): Promise<CommandEventSummary[]> {
  const { data: events, error } = await db
    .from('events')
    .select(
      `id, event_date, serve_time, arrival_time, guest_count, occasion,
       status, service_style, location_address, location_city,
       quoted_price_cents, payment_status,
       client:clients(full_name)`
    )
    .eq('tenant_id', tenantId)
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .in('status', ACTIVE_STATUSES)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[weekly-command] Failed to fetch events:', error)
    return []
  }

  const eventList: any[] = events ?? []

  // Fetch menus for these events
  const eventIds = eventList.map((e: any) => e.id)
  let menuMap = new Map<string, { id: string; name: string }>()
  if (eventIds.length > 0) {
    const { data: menus } = await db
      .from('menus')
      .select('id, event_id, name')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds)

    for (const m of (menus ?? []) as any[]) {
      if (m.event_id) {
        menuMap.set(m.event_id, { id: m.id, name: m.name ?? 'Untitled' })
      }
    }
  }

  return eventList.map((e: any) => {
    const dateStr = typeof e.event_date === 'string' ? e.event_date.slice(0, 10) : e.event_date
    const menu = menuMap.get(e.id)
    return {
      eventId: e.id,
      eventDate: dateStr,
      serveTime: e.serve_time ?? null,
      arrivalTime: e.arrival_time ?? null,
      guestCount: e.guest_count ?? 0,
      occasion: e.occasion ?? null,
      status: e.status,
      serviceStyle: e.service_style ?? 'plated',
      locationAddress: e.location_address ?? null,
      locationCity: e.location_city ?? null,
      clientName: e.client?.full_name ?? null,
      menuId: menu?.id ?? null,
      menuName: menu?.name ?? null,
      quotedPriceCents: e.quoted_price_cents ?? null,
      paymentStatus: e.payment_status ?? 'unpaid',
      timeSlot: deriveTimeSlot(e.serve_time, e.arrival_time),
    }
  })
}

// ============================================
// 1. getWeeklyCommandView
// ============================================

/**
 * Consolidated week overview: all events grouped by day, totals, busiest day.
 */
export async function getWeeklyCommandView(weekStart: string): Promise<WeeklyCommandView> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const weekEnd = addDays(weekStart, 6)
  const generatedAt = new Date().toISOString()

  const events = await fetchWeekEvents(db, tenantId, weekStart, weekEnd)

  // Group by date
  const eventsByDay: Record<string, CommandEventSummary[]> = {}
  for (let i = 0; i < 7; i++) {
    eventsByDay[addDays(weekStart, i)] = []
  }
  for (const evt of events) {
    if (!eventsByDay[evt.eventDate]) {
      eventsByDay[evt.eventDate] = []
    }
    eventsByDay[evt.eventDate].push(evt)
  }

  // Totals
  const totalGuests = events.reduce((sum, e) => sum + e.guestCount, 0)
  const totalQuotedCents = events.reduce((sum, e) => sum + (e.quotedPriceCents ?? 0), 0)

  // Status breakdown
  const statusBreakdown: Record<string, number> = {}
  for (const evt of events) {
    statusBreakdown[evt.status] = (statusBreakdown[evt.status] ?? 0) + 1
  }

  // Busiest day
  let busiestDay: { date: string; eventCount: number } | null = null
  for (const [date, dayEvents] of Object.entries(eventsByDay)) {
    if (dayEvents.length > 0 && (!busiestDay || dayEvents.length > busiestDay.eventCount)) {
      busiestDay = { date, eventCount: dayEvents.length }
    }
  }

  return {
    weekStart,
    weekEnd,
    generatedAt,
    totalEvents: events.length,
    totalGuests,
    totalQuotedCents,
    eventsByDay,
    busiestDay,
    statusBreakdown,
  }
}

// ============================================
// 2. getWeeklyConflicts
// ============================================

/**
 * Detects time overlaps, same-day overload (3+ events), and back-to-back events.
 */
export async function getWeeklyConflicts(weekStart: string): Promise<WeeklyConflictsResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const weekEnd = addDays(weekStart, 6)

  const events = await fetchWeekEvents(db, tenantId, weekStart, weekEnd)
  const conflicts: WeeklyConflict[] = []

  // Group by date
  const byDate = new Map<string, CommandEventSummary[]>()
  for (const evt of events) {
    const list = byDate.get(evt.eventDate) ?? []
    list.push(evt)
    byDate.set(evt.eventDate, list)
  }

  for (const [date, dayEvents] of Array.from(byDate)) {
    // Same-day overload: 3+ events on one day
    if (dayEvents.length >= 3) {
      conflicts.push({
        type: 'same_day_overload',
        date,
        severity: 'critical',
        message: `${dayEvents.length} events scheduled on ${getDayName(date)} ${date}`,
        eventIds: dayEvents.map((e) => e.eventId),
      })
    }

    // Time overlap: events in the same slot on the same day
    const slotGroups = new Map<TimeSlot, CommandEventSummary[]>()
    for (const evt of dayEvents) {
      const list = slotGroups.get(evt.timeSlot) ?? []
      list.push(evt)
      slotGroups.set(evt.timeSlot, list)
    }

    for (const [slot, slotEvents] of Array.from(slotGroups)) {
      if (slotEvents.length >= 2) {
        conflicts.push({
          type: 'time_overlap',
          date,
          severity: 'critical',
          message: `${slotEvents.length} events in the ${slot} slot on ${getDayName(date)} ${date}`,
          eventIds: slotEvents.map((e) => e.eventId),
        })
      }
    }

    // Back-to-back: afternoon + evening on same day with 2+ events total
    if (dayEvents.length >= 2 && slotGroups.has('afternoon') && slotGroups.has('evening')) {
      const affectedIds = [
        ...(slotGroups.get('afternoon') ?? []),
        ...(slotGroups.get('evening') ?? []),
      ].map((e) => e.eventId)

      conflicts.push({
        type: 'back_to_back',
        date,
        severity: 'warning',
        message: `Back-to-back afternoon and evening events on ${getDayName(date)} ${date}`,
        eventIds: affectedIds,
      })
    }

    // Back-to-back: morning + afternoon
    if (dayEvents.length >= 2 && slotGroups.has('morning') && slotGroups.has('afternoon')) {
      const affectedIds = [
        ...(slotGroups.get('morning') ?? []),
        ...(slotGroups.get('afternoon') ?? []),
      ].map((e) => e.eventId)

      conflicts.push({
        type: 'back_to_back',
        date,
        severity: 'warning',
        message: `Back-to-back morning and afternoon events on ${getDayName(date)} ${date}`,
        eventIds: affectedIds,
      })
    }
  }

  return {
    weekStart,
    weekEnd,
    conflicts,
    totalConflicts: conflicts.length,
    hasCritical: conflicts.some((c) => c.severity === 'critical'),
  }
}

// ============================================
// 3. getWeeklyIngredientConsolidation
// ============================================

/**
 * Finds shared ingredients across menus for the week, identifying bulk
 * purchase opportunities. Follows the event -> menu -> dish -> component ->
 * recipe -> recipe_ingredients -> ingredient chain.
 */
export async function getWeeklyIngredientConsolidation(
  weekStart: string
): Promise<WeeklyIngredientConsolidation> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const weekEnd = addDays(weekStart, 6)

  const events = await fetchWeekEvents(db, tenantId, weekStart, weekEnd)

  const emptyResult: WeeklyIngredientConsolidation = {
    weekStart,
    weekEnd,
    ingredients: [],
    sharedIngredients: [],
    totalUniqueIngredients: 0,
    totalSharedIngredients: 0,
  }

  if (events.length === 0) return emptyResult

  // Get menus for these events
  const eventIds = events.map((e) => e.eventId)
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const menuList: any[] = menus ?? []
  if (menuList.length === 0) return emptyResult

  const menuEventMap = new Map<string, string>()
  for (const m of menuList) {
    if (m.event_id) menuEventMap.set(m.id, m.event_id)
  }

  // Get dishes for these menus
  const menuIds = menuList.map((m: any) => m.id)
  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

  const dishList: any[] = dishes ?? []
  if (dishList.length === 0) return emptyResult

  const dishMenuMap = new Map<string, string>()
  for (const d of dishList) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  // Get components linking dishes to recipes
  const dishIds = dishList.map((d: any) => d.id)
  const { data: components } = await db
    .from('components')
    .select('recipe_id, dish_id')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  const componentList: any[] = components ?? []
  if (componentList.length === 0) return emptyResult

  // Map recipe -> set of event IDs
  const recipeToEvents = new Map<string, Set<string>>()
  for (const comp of componentList) {
    const menuId = dishMenuMap.get(comp.dish_id)
    const eventId = menuId ? menuEventMap.get(menuId) : undefined
    if (!eventId || !comp.recipe_id) continue

    const eventSet = recipeToEvents.get(comp.recipe_id) ?? new Set<string>()
    eventSet.add(eventId)
    recipeToEvents.set(comp.recipe_id, eventSet)
  }

  const recipeIds = Array.from(recipeToEvents.keys())
  if (recipeIds.length === 0) return emptyResult

  // Get recipe_ingredients
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  const riList: any[] = recipeIngredients ?? []
  if (riList.length === 0) return emptyResult

  // Aggregate: ingredient -> { totalQuantity, unit, eventIds }
  const ingredientAgg = new Map<
    string,
    { totalQuantity: number; unit: string | null; eventIds: Set<string> }
  >()

  for (const ri of riList) {
    const ingredientId = ri.ingredient_id as string
    if (!ingredientId) continue

    const recipeEventIds = recipeToEvents.get(ri.recipe_id) ?? new Set<string>()
    const existing = ingredientAgg.get(ingredientId) ?? {
      totalQuantity: 0,
      unit: null,
      eventIds: new Set<string>(),
    }

    existing.totalQuantity += Number(ri.quantity) || 0
    if (ri.unit) existing.unit = ri.unit
    for (const eid of Array.from(recipeEventIds)) existing.eventIds.add(eid)

    ingredientAgg.set(ingredientId, existing)
  }

  // Fetch ingredient details
  const ingredientIds = Array.from(ingredientAgg.keys())
  const { data: ingredientRows } = await db
    .from('ingredients')
    .select('id, name, category, last_price_cents')
    .eq('tenant_id', tenantId)
    .in('id', ingredientIds)

  const ingredientNameMap = new Map<
    string,
    { name: string; category: string | null; lastPriceCents: number | null }
  >()
  for (const row of (ingredientRows ?? []) as any[]) {
    ingredientNameMap.set(row.id, {
      name: row.name ?? 'Unknown',
      category: row.category ?? null,
      lastPriceCents: row.last_price_cents ?? null,
    })
  }

  // Build consolidated list
  const allIngredients: ConsolidatedIngredient[] = []
  for (const [ingredientId, agg] of Array.from(ingredientAgg)) {
    const info = ingredientNameMap.get(ingredientId)
    allIngredients.push({
      ingredientId,
      ingredientName: info?.name ?? 'Unknown',
      category: info?.category ?? null,
      totalQuantity: Math.round(agg.totalQuantity * 100) / 100,
      unit: agg.unit,
      eventCount: agg.eventIds.size,
      usedInEventIds: Array.from(agg.eventIds),
      lastPriceCents: info?.lastPriceCents ?? null,
    })
  }

  // Sort by event count descending (shared first), then name
  allIngredients.sort((a, b) => {
    if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount
    return a.ingredientName.localeCompare(b.ingredientName)
  })

  const shared = allIngredients.filter((i) => i.eventCount >= 2)

  return {
    weekStart,
    weekEnd,
    ingredients: allIngredients,
    sharedIngredients: shared,
    totalUniqueIngredients: allIngredients.length,
    totalSharedIngredients: shared.length,
  }
}

// ============================================
// 4. getDailyLoadBreakdown
// ============================================

/**
 * Morning/afternoon/evening slot breakdown for a single day.
 */
export async function getDailyLoadBreakdown(date: string): Promise<DailyLoadBreakdown> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch events for just this one day
  const events = await fetchWeekEvents(db, tenantId, date, date)

  const slotMap = new Map<TimeSlot, CommandEventSummary[]>([
    ['morning', []],
    ['afternoon', []],
    ['evening', []],
  ])

  for (const evt of events) {
    slotMap.get(evt.timeSlot)!.push(evt)
  }

  const slots: SlotLoad[] = (['morning', 'afternoon', 'evening'] as TimeSlot[]).map((slot) => {
    const slotEvents = slotMap.get(slot)!
    return {
      slot,
      events: slotEvents,
      totalGuests: slotEvents.reduce((sum, e) => sum + e.guestCount, 0),
    }
  })

  // Peak slot = most guests
  let peakSlot: TimeSlot | null = null
  let peakGuests = 0
  for (const s of slots) {
    if (s.totalGuests > peakGuests) {
      peakGuests = s.totalGuests
      peakSlot = s.slot
    }
  }

  return {
    date,
    dayName: getDayName(date),
    totalEvents: events.length,
    totalGuests: events.reduce((sum, e) => sum + e.guestCount, 0),
    slots,
    peakSlot,
  }
}

// ============================================
// 5. getWeeklyRevenueProjection
// ============================================

/**
 * Expected revenue from quotes and confirmed ledger entries for the week.
 */
export async function getWeeklyRevenueProjection(
  weekStart: string
): Promise<WeeklyRevenueProjection> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const weekEnd = addDays(weekStart, 6)

  const events = await fetchWeekEvents(db, tenantId, weekStart, weekEnd)

  if (events.length === 0) {
    return {
      weekStart,
      weekEnd,
      events: [],
      totalQuotedCents: 0,
      totalConfirmedCents: 0,
      unpaidCount: 0,
      paidCount: 0,
      partialCount: 0,
    }
  }

  // Fetch confirmed revenue from ledger
  const eventIds = events.map((e) => e.eventId)
  const { data: ledgerEntries } = await db
    .from('ledger_entries')
    .select('event_id, amount_cents, is_refund')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const ledgerList: any[] = ledgerEntries ?? []

  // Sum confirmed revenue per event
  const confirmedByEvent = new Map<string, number>()
  for (const entry of ledgerList) {
    if (!entry.event_id) continue
    const amount = entry.amount_cents ?? 0
    const net = entry.is_refund ? -Math.abs(amount) : amount
    confirmedByEvent.set(entry.event_id, (confirmedByEvent.get(entry.event_id) ?? 0) + net)
  }

  const projections: EventRevenueProjection[] = events.map((evt) => ({
    eventId: evt.eventId,
    eventDate: evt.eventDate,
    occasion: evt.occasion,
    clientName: evt.clientName,
    guestCount: evt.guestCount,
    quotedPriceCents: evt.quotedPriceCents,
    paymentStatus: evt.paymentStatus,
    confirmedRevenueCents: confirmedByEvent.get(evt.eventId) ?? 0,
  }))

  const totalQuotedCents = projections.reduce((sum, p) => sum + (p.quotedPriceCents ?? 0), 0)
  const totalConfirmedCents = projections.reduce((sum, p) => sum + p.confirmedRevenueCents, 0)
  const unpaidCount = projections.filter((p) => p.paymentStatus === 'unpaid').length
  const paidCount = projections.filter((p) => p.paymentStatus === 'paid').length
  const partialCount = projections.filter((p) => p.paymentStatus === 'partial').length

  return {
    weekStart,
    weekEnd,
    events: projections,
    totalQuotedCents,
    totalConfirmedCents,
    unpaidCount,
    paidCount,
    partialCount,
  }
}

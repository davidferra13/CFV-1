// Batch Prep Engine - Cross-Event Component Overlap Detection
// Finds shared recipe components across events in a date range,
// identifies batch opportunities, and generates a unified prep schedule.
// Pure formula: no AI, no LLM. Deterministic overlap detection.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────

export interface BatchOpportunity {
  recipeId: string
  recipeName: string
  componentName: string
  events: Array<{
    eventId: string
    eventDate: string
    occasion: string
    menuId: string
    dishName: string
    guestCount: number
    quantity: number
  }>
  totalQuantity: number
  totalEvents: number
  isMakeAhead: boolean
  makeAheadWindowHours: number | null
  prepMinutes: number
  cookMinutes: number
  // How much time saved by batching (estimated: prep once vs N times)
  estimatedTimeSavedMinutes: number
}

export interface BatchPrepPlan {
  dateRange: { start: string; end: string }
  opportunities: BatchOpportunity[]
  totalTimeSavedMinutes: number
  totalBatchableComponents: number
  eventsAnalyzed: number
}

export interface UnifiedPrepTask {
  recipeId: string | null
  componentName: string
  dishNames: string[]
  eventLabels: string[]
  totalQuantity: number
  prepMinutes: number
  cookMinutes: number
  isMakeAhead: boolean
  makeAheadWindowHours: number | null
  suggestedPrepDay: string // ISO date
  isBatched: boolean // true if shared across events
}

export interface UnifiedPrepSchedule {
  dateRange: { start: string; end: string }
  days: Array<{
    date: string
    dayLabel: string
    tasks: UnifiedPrepTask[]
    totalMinutes: number
  }>
  totalTasks: number
  batchedTasks: number
}

// ─── Find Batch Opportunities ────────────────────────────────────

export async function findBatchOpportunities(
  startDate: string,
  endDate: string
): Promise<BatchPrepPlan> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get events in date range with menus
  const { data: events, error: evtErr } = await supabase
    .from('events')
    .select('id, event_date, occasion, guest_count, status')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'in_progress'])
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })

  if (evtErr) throw new Error(`Failed to load events: ${evtErr.message}`)
  if (!events || events.length === 0) {
    return {
      dateRange: { start: startDate, end: endDate },
      opportunities: [],
      totalTimeSavedMinutes: 0,
      totalBatchableComponents: 0,
      eventsAnalyzed: 0,
    }
  }

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map(events.map((e: any) => [e.id, e]))

  // 2. Get menus for these events
  const { data: menus } = await supabase
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (!menus || menus.length === 0) {
    return {
      dateRange: { start: startDate, end: endDate },
      opportunities: [],
      totalTimeSavedMinutes: 0,
      totalBatchableComponents: 0,
      eventsAnalyzed: events.length,
    }
  }

  const menuIds = menus.map((m: any) => m.id)
  const menuToEvent = new Map(menus.map((m: any) => [m.id, m.event_id]))

  // 3. Get dishes for these menus
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, menu_id, course_name')
    .eq('tenant_id', tenantId)
    .in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) {
    return {
      dateRange: { start: startDate, end: endDate },
      opportunities: [],
      totalTimeSavedMinutes: 0,
      totalBatchableComponents: 0,
      eventsAnalyzed: events.length,
    }
  }

  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map(
    dishes.map((d: any) => [d.id, { menuId: d.menu_id, dishName: d.course_name }])
  )

  // 4. Get components with recipe references
  const { data: components } = await supabase
    .from('components')
    .select(
      `
      id, name, dish_id, recipe_id, quantity, unit,
      is_make_ahead, make_ahead_window_hours,
      recipes(id, title, prep_time_minutes, cook_time_minutes)
    `
    )
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)

  if (!components || components.length === 0) {
    return {
      dateRange: { start: startDate, end: endDate },
      opportunities: [],
      totalTimeSavedMinutes: 0,
      totalBatchableComponents: 0,
      eventsAnalyzed: events.length,
    }
  }

  // 5. Group by recipe_id (or normalized component name if no recipe)
  const groupKey = (c: any): string => {
    if (c.recipe_id) return `recipe:${c.recipe_id}`
    // Normalize name for matching: lowercase, trim
    return `name:${String(c.name).toLowerCase().trim()}`
  }

  const groups = new Map<string, any[]>()
  for (const comp of components) {
    const key = groupKey(comp)
    const list = groups.get(key) ?? []
    list.push(comp)
    groups.set(key, list)
  }

  // 6. Build batch opportunities (only components appearing in 2+ events)
  const opportunities: BatchOpportunity[] = []

  for (const [, comps] of groups) {
    // Map components to their events
    const eventSet = new Map<string, any>()
    const eventComponents: BatchOpportunity['events'] = []

    for (const comp of comps) {
      const dish = dishMap.get(comp.dish_id)
      if (!dish) continue
      const eventId = menuToEvent.get(dish.menuId)
      if (!eventId) continue
      const event = eventMap.get(eventId)
      if (!event) continue

      // Deduplicate by event (same recipe might appear multiple times in same event)
      if (!eventSet.has(eventId)) {
        eventSet.set(eventId, true)
        eventComponents.push({
          eventId,
          eventDate: event.event_date,
          occasion: event.occasion ?? 'Event',
          menuId: dish.menuId,
          dishName: dish.dishName ?? comp.name,
          guestCount: event.guest_count ?? 0,
          quantity: Number(comp.quantity ?? 1),
        })
      }
    }

    // Only include if shared across 2+ events
    if (eventComponents.length < 2) continue

    const recipe = comps[0].recipes
    const prepMinutes = Number(recipe?.prep_time_minutes ?? 0)
    const cookMinutes = Number(recipe?.cook_time_minutes ?? 0)
    const totalPerBatch = prepMinutes + cookMinutes
    // Time saved = (N-1) * prep time (cook once for batch, prep once instead of N times)
    const timeSaved = Math.max(0, (eventComponents.length - 1) * prepMinutes)

    opportunities.push({
      recipeId: comps[0].recipe_id ?? '',
      recipeName: recipe?.title ?? comps[0].name,
      componentName: comps[0].name,
      events: eventComponents,
      totalQuantity: eventComponents.reduce((s, e) => s + e.quantity, 0),
      totalEvents: eventComponents.length,
      isMakeAhead: comps[0].is_make_ahead ?? false,
      makeAheadWindowHours: comps[0].make_ahead_window_hours ?? null,
      prepMinutes,
      cookMinutes,
      estimatedTimeSavedMinutes: timeSaved,
    })
  }

  // Sort by time saved (highest first)
  opportunities.sort((a, b) => b.estimatedTimeSavedMinutes - a.estimatedTimeSavedMinutes)

  return {
    dateRange: { start: startDate, end: endDate },
    opportunities,
    totalTimeSavedMinutes: opportunities.reduce((s, o) => s + o.estimatedTimeSavedMinutes, 0),
    totalBatchableComponents: opportunities.length,
    eventsAnalyzed: events.length,
  }
}

// ─── Generate Unified Prep Schedule ──────────────────────────────

export async function generateUnifiedPrepSchedule(
  startDate: string,
  endDate: string
): Promise<UnifiedPrepSchedule> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Reuse batch detection
  const plan = await findBatchOpportunities(startDate, endDate)

  // Get all events in range for individual components too
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, guest_count')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'in_progress'])
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })

  const tasks: UnifiedPrepTask[] = []

  // Add batched opportunities
  for (const opp of plan.opportunities) {
    // Suggest prep day: earliest event date minus make-ahead window, or 1 day before earliest event
    const earliestEvent = opp.events.sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    )[0]

    let suggestedPrepDay: string
    if (opp.isMakeAhead && opp.makeAheadWindowHours) {
      const eventDate = new Date(earliestEvent.eventDate)
      const hoursBack = Math.min(opp.makeAheadWindowHours, 72) // cap at 3 days
      eventDate.setHours(eventDate.getHours() - hoursBack)
      suggestedPrepDay = eventDate.toISOString().slice(0, 10)
    } else {
      // Day before earliest event
      const d = new Date(earliestEvent.eventDate)
      d.setDate(d.getDate() - 1)
      suggestedPrepDay = d.toISOString().slice(0, 10)
    }

    tasks.push({
      recipeId: opp.recipeId || null,
      componentName: opp.componentName,
      dishNames: [...new Set(opp.events.map((e) => e.dishName))],
      eventLabels: opp.events.map((e) => `${e.occasion} (${e.eventDate})`),
      totalQuantity: opp.totalQuantity,
      prepMinutes: opp.prepMinutes,
      cookMinutes: opp.cookMinutes,
      isMakeAhead: opp.isMakeAhead,
      makeAheadWindowHours: opp.makeAheadWindowHours,
      suggestedPrepDay,
      isBatched: true,
    })
  }

  // Group tasks by suggested prep day
  const dayMap = new Map<string, UnifiedPrepTask[]>()
  for (const task of tasks) {
    const list = dayMap.get(task.suggestedPrepDay) ?? []
    list.push(task)
    dayMap.set(task.suggestedPrepDay, list)
  }

  // Build day groups sorted chronologically
  const dayLabels: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  }

  const days = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayTasks]) => {
      const d = new Date(date + 'T12:00:00')
      return {
        date,
        dayLabel: `${dayLabels[d.getDay()]} ${date}`,
        tasks: dayTasks.sort((a, b) => b.prepMinutes - a.prepMinutes),
        totalMinutes: dayTasks.reduce((s, t) => s + t.prepMinutes + t.cookMinutes, 0),
      }
    })

  return {
    dateRange: { start: startDate, end: endDate },
    days,
    totalTasks: tasks.length,
    batchedTasks: tasks.filter((t) => t.isBatched).length,
  }
}

// Production Planning Actions
// Server actions for calendar production planning: event prep schedules,
// ingredient procurement timelines, and daily workload analysis.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ProductionDay,
  ProductionEvent,
  PrepTask,
  ProcurementItem,
  WeeklyProductionPlan,
  MonthlyDaySummary,
  ProductionConflict,
} from './production-planning-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyCapacity(eventCount: number, prepHours: number): ProductionDay['capacity'] {
  const total = eventCount + prepHours
  if (total === 0) return 'light'
  if (total <= 4) return 'normal'
  if (total <= 8) return 'heavy'
  return 'overloaded'
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Internal: build a ProductionDay from raw DB rows
// ---------------------------------------------------------------------------

async function buildProductionDay(db: any, tenantId: string, date: string): Promise<ProductionDay> {
  // Fetch events for the date
  const { data: rawEvents } = await db
    .from('events')
    .select('id, title, guest_count, event_date, status')
    .eq('tenant_id', tenantId)
    .gte('event_date', `${date}T00:00:00`)
    .lt('event_date', `${date}T23:59:59`)

  const events: ProductionEvent[] = (rawEvents ?? []).map((e: any) => ({
    eventId: e.id,
    title: e.title ?? 'Untitled Event',
    guestCount: e.guest_count ?? 0,
    startTime: e.event_date ?? date,
    menuCount: 0, // enriched below
    status: e.status ?? 'unknown',
  }))

  // Enrich menu counts per event
  for (const ev of events) {
    const { count } = await db
      .from('menus')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', ev.eventId)
    ev.menuCount = count ?? 0
  }

  // Fetch prep tasks (prep_schedules table)
  const { data: rawPrep } = await db
    .from('prep_schedules')
    .select('id, event_id, task_name, estimated_minutes, scheduled_date, completed')
    .eq('tenant_id', tenantId)
    .gte('scheduled_date', `${date}T00:00:00`)
    .lt('scheduled_date', `${date}T23:59:59`)

  const prepTasks: PrepTask[] = (rawPrep ?? []).map((p: any) => ({
    id: p.id,
    eventId: p.event_id,
    title: p.task_name ?? 'Prep task',
    estimatedMinutes: p.estimated_minutes ?? 30,
    scheduledDate: date,
    completed: p.completed ?? false,
  }))

  // Fetch procurement items via menu_ingredients joined through event menus
  const eventIds = events.map((e) => e.eventId)
  let procurementItems: ProcurementItem[] = []

  if (eventIds.length > 0) {
    const { data: rawMenus } = await db
      .from('menus')
      .select('id, event_id')
      .in('event_id', eventIds)

    const menuIds = (rawMenus ?? []).map((m: any) => m.id)
    const menuEventMap: Record<string, string> = {}
    for (const m of rawMenus ?? []) {
      menuEventMap[m.id] = m.event_id
    }

    if (menuIds.length > 0) {
      const { data: rawIngredients } = await db
        .from('menu_ingredients')
        .select('menu_id, ingredient_name, quantity, unit, ordered')
        .in('menu_id', menuIds)

      procurementItems = (rawIngredients ?? []).map((i: any) => ({
        ingredientName: i.ingredient_name ?? 'Unknown',
        quantity: i.quantity ?? 0,
        unit: i.unit ?? 'unit',
        neededBy: date,
        eventId: menuEventMap[i.menu_id] ?? '',
        ordered: i.ordered ?? false,
      }))
    }
  }

  const totalPrepMinutes = prepTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
  const workloadHours = Math.round((totalPrepMinutes / 60) * 10) / 10

  return {
    date,
    events,
    prepTasks,
    procurementItems,
    workloadHours,
    capacity: classifyCapacity(events.length, workloadHours),
  }
}

// ---------------------------------------------------------------------------
// 1. getProductionDay
// ---------------------------------------------------------------------------

export async function getProductionDay(date: string): Promise<ProductionDay> {
  const user = await requireChef()
  const db: any = createServerClient()
  return buildProductionDay(db, user.tenantId!, date)
}

// ---------------------------------------------------------------------------
// 2. getWeeklyPlan
// ---------------------------------------------------------------------------

export async function getWeeklyPlan(weekStart: string): Promise<WeeklyProductionPlan> {
  const user = await requireChef()
  const db: any = createServerClient()

  const days: ProductionDay[] = []
  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i)
    days.push(await buildProductionDay(db, user.tenantId!, dayDate))
  }

  const totalEvents = days.reduce((sum, d) => sum + d.events.length, 0)
  const totalPrepHours = Math.round(days.reduce((sum, d) => sum + d.workloadHours, 0) * 10) / 10
  const peakDay = days.reduce(
    (peak, d) =>
      d.workloadHours + d.events.length > peak.workloadHours + peak.events.length ? d : peak,
    days[0]
  )

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    days,
    totalEvents,
    totalPrepHours,
    peakDay: peakDay.date,
  }
}

// ---------------------------------------------------------------------------
// 3. getMonthlyOverview
// ---------------------------------------------------------------------------

export async function getMonthlyOverview(
  year: number,
  month: number
): Promise<MonthlyDaySummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  // Fetch all events in the month
  const { data: rawEvents } = await db
    .from('events')
    .select('id, event_date, status')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', `${startDate}T00:00:00`)
    .lt('event_date', `${endDate}T00:00:00`)

  // Group by date
  const dayCounts: Record<string, number> = {}
  for (const e of rawEvents ?? []) {
    const day = (e.event_date as string).slice(0, 10)
    dayCounts[day] = (dayCounts[day] ?? 0) + 1
  }

  // Build summary for each day in the month
  const daysInMonth = new Date(year, month, 0).getDate()
  const summaries: MonthlyDaySummary[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const count = dayCounts[dateStr] ?? 0
    summaries.push({
      date: dateStr,
      eventCount: count,
      capacity: classifyCapacity(count, 0),
    })
  }

  return summaries
}

// ---------------------------------------------------------------------------
// 4. getProcurementTimeline
// ---------------------------------------------------------------------------

export async function getProcurementTimeline(daysAhead: number = 7): Promise<ProcurementItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)
  const endDate = addDays(today, daysAhead)

  // Fetch upcoming events in the range
  const { data: rawEvents } = await db
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', `${today}T00:00:00`)
    .lte('event_date', `${endDate}T23:59:59`)

  if (!rawEvents || rawEvents.length === 0) return []

  const eventIds = rawEvents.map((e: any) => e.id)
  const eventDateMap: Record<string, string> = {}
  for (const e of rawEvents) {
    eventDateMap[e.id] = (e.event_date as string).slice(0, 10)
  }

  // Get menus for those events
  const { data: rawMenus } = await db.from('menus').select('id, event_id').in('event_id', eventIds)

  if (!rawMenus || rawMenus.length === 0) return []

  const menuIds = rawMenus.map((m: any) => m.id)
  const menuEventMap: Record<string, string> = {}
  for (const m of rawMenus) {
    menuEventMap[m.id] = m.event_id
  }

  // Get ingredients
  const { data: rawIngredients } = await db
    .from('menu_ingredients')
    .select('menu_id, ingredient_name, quantity, unit, ordered')
    .in('menu_id', menuIds)

  return (rawIngredients ?? []).map((i: any) => {
    const eventId = menuEventMap[i.menu_id] ?? ''
    return {
      ingredientName: i.ingredient_name ?? 'Unknown',
      quantity: i.quantity ?? 0,
      unit: i.unit ?? 'unit',
      neededBy: eventDateMap[eventId] ?? today,
      eventId,
      ordered: i.ordered ?? false,
    }
  })
}

// ---------------------------------------------------------------------------
// 5. getProductionConflicts
// ---------------------------------------------------------------------------

export async function getProductionConflicts(dateRange: {
  start: string
  end: string
}): Promise<ProductionConflict[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: rawEvents } = await db
    .from('events')
    .select('id, title, event_date, guest_count, status')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', `${dateRange.start}T00:00:00`)
    .lte('event_date', `${dateRange.end}T23:59:59`)
    .order('event_date', { ascending: true })

  if (!rawEvents || rawEvents.length === 0) return []

  const conflicts: ProductionConflict[] = []

  // Group events by date
  const byDate: Record<string, any[]> = {}
  for (const e of rawEvents) {
    const day = (e.event_date as string).slice(0, 10)
    if (!byDate[day]) byDate[day] = []
    byDate[day].push(e)
  }

  for (const [date, dayEvents] of Object.entries(byDate)) {
    // Check for overloaded days (3+ events)
    if (dayEvents.length >= 3) {
      conflicts.push({
        date,
        type: 'overloaded',
        description: `${dayEvents.length} events scheduled on ${date}`,
        eventIds: dayEvents.map((e: any) => e.id),
      })
    }

    // Check for time overlaps (events within 2 hours of each other)
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const timeA = new Date(dayEvents[i].event_date).getTime()
        const timeB = new Date(dayEvents[j].event_date).getTime()
        const diffHours = Math.abs(timeA - timeB) / (1000 * 60 * 60)

        if (diffHours < 2) {
          conflicts.push({
            date,
            type: 'overlap',
            description: `"${dayEvents[i].title ?? 'Event'}" and "${dayEvents[j].title ?? 'Event'}" overlap (${Math.round(diffHours * 60)}min apart)`,
            eventIds: [dayEvents[i].id, dayEvents[j].id],
          })
        }
      }
    }
  }

  return conflicts
}

// ---------------------------------------------------------------------------
// 6. markProcurementOrdered
// ---------------------------------------------------------------------------

export async function markProcurementOrdered(
  ingredientName: string,
  eventId: string
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find menus for this event
  const { data: rawMenus } = await db.from('menus').select('id').eq('event_id', eventId)

  if (!rawMenus || rawMenus.length === 0) {
    throw new Error('No menus found for event')
  }

  const menuIds = rawMenus.map((m: any) => m.id)

  // Update the ordered flag on matching menu_ingredients
  const { error } = await db
    .from('menu_ingredients')
    .update({ ordered: true })
    .in('menu_id', menuIds)
    .eq('ingredient_name', ingredientName)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to mark procurement ordered: ${error.message}`)
  }

  return { success: true }
}

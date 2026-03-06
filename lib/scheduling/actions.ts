// Scheduling Server Actions
// Fetches data and feeds it to the pure scheduling engines.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getChefPreferences } from '@/lib/chef/actions'
import { generateTimeline } from './timeline'
import { getDOPSchedule, getDOPProgress } from './dop'
import { getActivePrompts } from './prep-prompts'
import type {
  EventTimeline,
  DOPSchedule,
  PrepPrompt,
  SchedulingEvent,
  WeekSchedule,
  WeekDay,
  ChefPreferences,
  EnrichedTodaySchedule,
  ClientEventContext,
  PrepGate,
  WeatherAlert,
  EventPhase,
} from './types'

// ============================================
// DATA FETCHING HELPERS
// ============================================

function mapEventToScheduling(event: any, componentCount = 0, hasAlcohol = false): SchedulingEvent {
  return {
    id: event.id,
    occasion: event.occasion,
    event_date: event.event_date,
    serve_time: event.serve_time,
    arrival_time: event.arrival_time,
    travel_time_minutes: event.travel_time_minutes ?? null,
    guest_count: event.guest_count,
    status: event.status,
    location_address: event.location_address,
    location_city: event.location_city,
    grocery_list_ready: event.grocery_list_ready,
    prep_list_ready: event.prep_list_ready,
    packing_list_ready: event.packing_list_ready,
    equipment_list_ready: event.equipment_list_ready,
    timeline_ready: event.timeline_ready,
    execution_sheet_ready: event.execution_sheet_ready,
    non_negotiables_checked: event.non_negotiables_checked,
    car_packed: event.car_packed,
    shopping_completed_at: event.shopping_completed_at,
    prep_completed_at: event.prep_completed_at,
    aar_filed: event.aar_filed,
    reset_complete: event.reset_complete,
    follow_up_sent: event.follow_up_sent,
    financially_closed: event.financially_closed,
    client: event.client as { full_name: string } | null,
    menuComponentCount: componentCount,
    hasAlcohol,
  }
}

/**
 * Fetch a single event with all fields needed for scheduling.
 */
async function fetchSchedulingEvent(eventId: string): Promise<SchedulingEvent | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready, execution_sheet_ready,
      non_negotiables_checked, car_packed,
      shopping_completed_at, prep_completed_at,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Get menu component count
  const { data: menus } = await supabase.from('menus').select('id').eq('event_id', eventId)

  let componentCount = 0
  let hasAlcohol = false

  if (menus && menus.length > 0) {
    const menuIds = menus.map((m: any) => m.id)

    const { count } = await supabase
      .from('dishes')
      .select('id', { count: 'exact', head: true })
      .in('menu_id', menuIds)

    componentCount = count ?? 0

    // Check for alcohol category in dishes
    const { data: alcoholDishes } = await supabase
      .from('dishes')
      .select('id')
      .in('menu_id', menuIds)
      .eq('category', 'beverage')
      .limit(1)

    hasAlcohol = (alcoholDishes?.length ?? 0) > 0
  }

  return mapEventToScheduling(event, componentCount, hasAlcohol)
}

/**
 * Fetch all upcoming events for scheduling context.
 */
async function fetchUpcomingSchedulingEvents(): Promise<SchedulingEvent[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready, execution_sheet_ready,
      non_negotiables_checked, car_packed,
      shopping_completed_at, prep_completed_at,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .not('status', 'in', '("cancelled")')
    .order('event_date', { ascending: true })

  if (!events) return []

  return events.map((event: any) => mapEventToScheduling(event))
}

// ============================================
// PUBLIC ACTIONS
// ============================================

/**
 * Get the full timeline for a single event.
 */
export async function getEventTimeline(eventId: string): Promise<EventTimeline | null> {
  const event = await fetchSchedulingEvent(eventId)
  if (!event) return null

  const prefs = await getChefPreferences()
  return generateTimeline(event, prefs)
}

/**
 * Get the DOP schedule for a single event.
 */
export async function getEventDOPSchedule(eventId: string): Promise<DOPSchedule | null> {
  const event = await fetchSchedulingEvent(eventId)
  if (!event) return null

  const prefs = await getChefPreferences()
  return getDOPSchedule(event, prefs)
}

/**
 * Get DOP progress (completed/total) for a single event.
 */
export async function getEventDOPProgress(
  eventId: string
): Promise<{ completed: number; total: number } | null> {
  const schedule = await getEventDOPSchedule(eventId)
  if (!schedule) return null
  return getDOPProgress(schedule)
}

/**
 * Get all active prep prompts across upcoming events.
 */
export async function getAllPrepPrompts(): Promise<PrepPrompt[]> {
  const events = await fetchUpcomingSchedulingEvents()
  const prefs = await getChefPreferences()
  return getActivePrompts(events, prefs)
}

/**
 * Get today's event (if any) with full timeline.
 */
export async function getTodaysSchedule(): Promise<{
  event: SchedulingEvent
  timeline: EventTimeline
  dop: DOPSchedule
} | null> {
  const events = await fetchUpcomingSchedulingEvents()
  const today = new Date().toISOString().split('T')[0]

  const todayEvent = events.find((e) => e.event_date === today)
  if (!todayEvent) return null

  const fullEvent = await fetchSchedulingEvent(todayEvent.id)
  if (!fullEvent) return null

  const prefs = await getChefPreferences()
  const timeline = generateTimeline(fullEvent, prefs)
  const dop = getDOPSchedule(fullEvent, prefs)

  return { event: fullEvent, timeline, dop }
}

/**
 * Get today's schedule with enriched intelligence data:
 * - Current phase detection
 * - Next milestone countdown
 * - Client context (dietary, allergies, history)
 * - Prep gate (completion progress + blockers)
 * - Weather alerts
 */
export async function getTodaysScheduleEnriched(
  weatherData?: Record<string, any>
): Promise<EnrichedTodaySchedule | null> {
  const base = await getTodaysSchedule()
  if (!base) return null

  const user = await requireChef()
  const supabase: any = createServerClient()

  // Parallel fetch: client context + DOP completions
  const [clientContext, prepGate] = await Promise.all([
    getClientEventContext(supabase, user.tenantId!, base.event),
    computePrepGate(supabase, user.tenantId!, base.event.id, base.dop),
  ])

  // Compute current phase from timeline
  const now = new Date()
  const { currentPhase, nextMilestone } = computePhaseAndMilestone(base.timeline, base.event, now)

  // Departure time from timeline
  const departureItem = base.timeline.timeline.find((t) => t.type === 'departure')
  let departureTime: string | null = null
  let minutesUntilDeparture: number | null = null
  if (departureItem) {
    const [dh, dm] = departureItem.time.split(':').map(Number)
    const depDate = new Date(base.event.event_date + 'T00:00:00')
    depDate.setHours(dh, dm, 0, 0)
    departureTime = depDate.toISOString()
    minutesUntilDeparture = Math.round((depDate.getTime() - now.getTime()) / 60000)
  }

  // Weather alerts (if weather data provided)
  const weatherAlerts = weatherData ? computeWeatherAlerts(weatherData, base.event) : []

  return {
    event: base.event,
    timeline: base.timeline,
    dop: base.dop,
    currentPhase,
    nextMilestone,
    departureTime,
    minutesUntilDeparture,
    clientContext,
    prepGate,
    weatherAlerts,
  }
}

// ── Enrichment helpers ──────────────────────────────────────────────

async function getClientEventContext(
  supabase: any,
  tenantId: string,
  event: SchedulingEvent
): Promise<ClientEventContext | null> {
  if (!event.client) return null

  // Get client ID from event
  const { data: eventRow } = await supabase
    .from('events')
    .select('client_id')
    .eq('id', event.id)
    .single()

  if (!eventRow?.client_id) return null

  const [clientData, eventCount, lastEvent] = await Promise.all([
    supabase
      .from('clients')
      .select('full_name, dietary_restrictions, allergies')
      .eq('id', eventRow.client_id)
      .single()
      .then((r: any) => r.data),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', eventRow.client_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .then((r: any) => r.count ?? 0),
    supabase
      .from('events')
      .select('event_date, occasion')
      .eq('client_id', eventRow.client_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('event_date', { ascending: false })
      .limit(1)
      .single()
      .then((r: any) => r.data),
  ])

  if (!clientData) return null

  return {
    name: clientData.full_name ?? event.client.full_name,
    dietaryRestrictions: clientData.dietary_restrictions,
    allergies: clientData.allergies,
    pastEventCount: eventCount,
    lastEventDate: lastEvent?.event_date ?? null,
    lastOccasion: lastEvent?.occasion ?? null,
  }
}

async function computePrepGate(
  supabase: any,
  tenantId: string,
  eventId: string,
  dop: DOPSchedule
): Promise<PrepGate> {
  // Get manual completions for this event
  const { data: completions } = await supabase
    .from('dop_task_completions')
    .select('task_key')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const manualKeys = new Set((completions ?? []).map((c: any) => c.task_key))

  const allTasks: { label: string; category: any; deadline: string | null; isComplete: boolean }[] =
    []

  for (const phase of Object.values(dop.schedule)) {
    for (const task of phase.tasks) {
      allTasks.push({
        label: task.label,
        category: task.category,
        deadline: task.deadline,
        isComplete: task.isComplete || manualKeys.has(task.id),
      })
    }
  }

  const total = allTasks.length
  const completed = allTasks.filter((t) => t.isComplete).length
  const blockers = allTasks
    .filter((t) => !t.isComplete && t.deadline != null && new Date(t.deadline) <= new Date())
    .map((t) => ({ label: t.label, category: t.category, deadline: t.deadline }))

  return {
    progress: total > 0 ? completed / total : 1,
    total,
    completed,
    blockers,
  }
}

function computePhaseAndMilestone(
  timeline: EventTimeline,
  event: SchedulingEvent,
  now: Date
): {
  currentPhase: EventPhase
  nextMilestone: { label: string; time: string; minutesUntil: number } | null
} {
  const eventDate = event.event_date
  const items = timeline.timeline

  // Parse timeline items into absolute timestamps
  const milestones = items
    .filter((item) => item.isDeadline || item.type === 'service' || item.type === 'departure')
    .map((item) => {
      const [h, m] = item.time.split(':').map(Number)
      const dt = new Date(eventDate + 'T00:00:00')
      dt.setHours(h, m, 0, 0)
      return { label: item.label, time: dt.toISOString(), timestamp: dt.getTime(), type: item.type }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  // Find next upcoming milestone
  const upcoming = milestones.filter((m) => m.timestamp > now.getTime())
  const nextMilestone =
    upcoming.length > 0
      ? {
          label: upcoming[0].label,
          time: upcoming[0].time,
          minutesUntil: Math.round((upcoming[0].timestamp - now.getTime()) / 60000),
        }
      : null

  // Determine current phase based on which milestones have passed
  const departureMs = milestones.find((m) => m.type === 'departure')
  const serviceMs = milestones.find((m) => m.type === 'service')

  let currentPhase: EventPhase = 'pre_event'
  if (serviceMs && now.getTime() > serviceMs.timestamp + 3 * 60 * 60 * 1000) {
    currentPhase = 'post_event'
  } else if (serviceMs && now.getTime() > serviceMs.timestamp) {
    currentPhase = 'service'
  } else if (departureMs && now.getTime() > departureMs.timestamp) {
    currentPhase = 'travel'
  } else if (departureMs) {
    // Before departure - check timeline for more specific phase
    const shoppingItem = items.find((i) => i.type === 'shopping')
    const prepItem = items.find((i) => i.type === 'prep')
    const packingItem = items.find((i) => i.type === 'packing')

    if (packingItem) {
      const [ph, pm] = packingItem.time.split(':').map(Number)
      const packTime = new Date(eventDate + 'T00:00:00')
      packTime.setHours(ph, pm, 0, 0)
      if (now.getTime() >= packTime.getTime()) currentPhase = 'packing'
    }
    if (prepItem && currentPhase === 'pre_event') {
      const [ph, pm] = prepItem.time.split(':').map(Number)
      const prepTime = new Date(eventDate + 'T00:00:00')
      prepTime.setHours(ph, pm, 0, 0)
      if (now.getTime() >= prepTime.getTime()) currentPhase = 'prep'
    }
    if (shoppingItem && currentPhase === 'pre_event') {
      const [sh, sm] = shoppingItem.time.split(':').map(Number)
      const shopTime = new Date(eventDate + 'T00:00:00')
      shopTime.setHours(sh, sm, 0, 0)
      if (now.getTime() >= shopTime.getTime()) currentPhase = 'shopping'
    }
  }

  return { currentPhase, nextMilestone }
}

function computeWeatherAlerts(
  weatherData: Record<string, any>,
  event: SchedulingEvent
): WeatherAlert[] {
  const weather = weatherData[event.id]
  if (!weather) return []

  const alerts: WeatherAlert[] = []

  // High precipitation
  if (weather.precipitationMm > 5) {
    alerts.push({
      severity: 'critical',
      message: `Heavy rain expected (${Math.round(weather.precipitationMm)}mm) - plan for weather delays`,
    })
  } else if (weather.precipitationMm > 1) {
    alerts.push({
      severity: 'warning',
      message: `Rain possible (${Math.round(weather.precipitationMm)}mm) - have backup plan ready`,
    })
  }

  // Extreme heat
  if (weather.tempMaxF > 95) {
    alerts.push({
      severity: 'critical',
      message: `Extreme heat (${weather.tempMaxF}F) - pack extra ice, cold storage critical`,
    })
  } else if (weather.tempMaxF > 90) {
    alerts.push({
      severity: 'warning',
      message: `High heat (${weather.tempMaxF}F) - pack extra ice, keep perishables cold`,
    })
  }

  // Freezing
  if (weather.tempMinF < 32) {
    alerts.push({
      severity: 'warning',
      message: `Below freezing (${weather.tempMinF}F) - protect perishables during transport`,
    })
  }

  // High wind
  if (weather.windSpeedMph && weather.windSpeedMph > 25) {
    alerts.push({
      severity: 'warning',
      message: `High winds (${weather.windSpeedMph}mph) - secure outdoor equipment`,
    })
  }

  return alerts
}

/**
 * Get the weekly schedule.
 */
export async function getWeekSchedule(weekOffset: number = 0): Promise<WeekSchedule> {
  const events = await fetchUpcomingSchedulingEvents()
  const prefs = await getChefPreferences()

  // Calculate the week's start (Monday) and end (Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = sunday.toISOString().split('T')[0]

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const days: WeekDay[] = []
  const warnings: string[] = []

  // Build each day
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)
    const dateStr = dayDate.toISOString().split('T')[0]

    const dayEvents = events.filter((e) => e.event_date === dateStr)

    // Check if this is a prep day (day before an event)
    const nextDay = new Date(dayDate)
    nextDay.setDate(dayDate.getDate() + 1)
    const nextDateStr = nextDay.toISOString().split('T')[0]
    const tomorrowEvents = events.filter((e) => e.event_date === nextDateStr)
    const isPrepDay = tomorrowEvents.length > 0 && prefs.shop_day_before

    let dayType: WeekDay['dayType'] = 'free'
    if (dayEvents.length > 0) dayType = 'event'
    else if (isPrepDay) dayType = 'prep'
    else dayType = 'free'

    days.push({
      date: dateStr,
      dayOfWeek: dayNames[i],
      dayType,
      events: dayEvents.map((e) => ({
        id: e.id,
        occasion: e.occasion,
        clientName: e.client?.full_name ?? 'Unknown',
        serveTime: e.serve_time,
        guestCount: e.guest_count,
        status: e.status,
        prepStatus: derivePrepStatus(e),
      })),
      isPrepDayFor: isPrepDay ? tomorrowEvents.map((e) => e.id) : undefined,
    })
  }

  // Check for burnout warnings
  const eventDays = days.filter((d) => d.dayType === 'event')
  for (let i = 1; i < eventDays.length; i++) {
    const prevDate = new Date(eventDays[i - 1].date)
    const currDate = new Date(eventDays[i].date)
    const daysBetween = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysBetween === 1) {
      warnings.push(
        `${eventDays[i - 1].dayOfWeek} and ${eventDays[i].dayOfWeek} are back-to-back events with no prep day between them.`
      )
    }
  }

  if (eventDays.length >= 4) {
    warnings.push(
      `${eventDays.length} events this week - heavy schedule. Plan admin time carefully.`
    )
  }

  return { weekStart, weekEnd, days, warnings }
}

function derivePrepStatus(event: SchedulingEvent): 'ready' | 'partial' | 'not_started' {
  const readyFlags = [
    event.grocery_list_ready,
    event.prep_list_ready,
    event.packing_list_ready,
    event.equipment_list_ready,
    event.timeline_ready,
  ]

  const readyCount = readyFlags.filter(Boolean).length
  if (readyCount === readyFlags.length) return 'ready'
  if (readyCount > 0) return 'partial'
  return 'not_started'
}

// ============================================
// CALENDAR MUTATIONS
// ============================================

/**
 * Reschedule an event via drag-and-drop.
 * Allowed for draft, proposed, accepted, paid, confirmed.
 * Not allowed for in_progress, completed, cancelled.
 */
export async function rescheduleEvent(
  eventId: string,
  newDate: string,
  newServeTime?: string
): Promise<{ success: boolean; error?: string; clearedPrepBlocks?: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  const blocked = ['in_progress', 'completed', 'cancelled']
  if (blocked.includes(event.status)) {
    return { success: false, error: `Cannot reschedule a ${event.status} event` }
  }

  const updateData: Record<string, any> = {
    event_date: newDate,
    updated_by: user.id,
  }
  if (newServeTime) {
    updateData.serve_time = newServeTime
  }

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[rescheduleEvent] Error:', error)
    return { success: false, error: 'Failed to reschedule event' }
  }

  // Clear orphaned system-generated prep blocks from the old date
  let clearedPrepBlocks = 0
  try {
    const { data: oldBlocks } = await supabase
      .from('event_prep_blocks' as any)
      .select('id')
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)
      .eq('is_system_generated', true)

    if (oldBlocks && oldBlocks.length > 0) {
      await supabase
        .from('event_prep_blocks' as any)
        .delete()
        .in(
          'id',
          oldBlocks.map((b: any) => b.id)
        )
      clearedPrepBlocks = oldBlocks.length
    }
  } catch (prepErr) {
    console.error('[rescheduleEvent] Prep block cleanup failed (non-blocking):', prepErr)
  }

  revalidatePath('/schedule')
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true, clearedPrepBlocks }
}

// ============================================
// CALENDAR VIEW
// ============================================

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO datetime
  end: string // ISO datetime
  allDay: boolean
  extendedProps: {
    eventId: string
    occasion: string | null
    clientName: string
    guestCount: number
    status: string
    prepStatus: 'ready' | 'partial' | 'not_started'
    serveTime: string
    arrivalTime: string | null
    locationAddress: string | null
    locationCity: string | null
    dayType: 'event' | 'prep' | 'inquiry'
  }
}

/**
 * Get all events for a calendar date range.
 * Returns FullCalendar-compatible event objects.
 */
export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string
): Promise<CalendarEvent[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const prefs = await getChefPreferences()

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .not('status', 'in', '("cancelled")')
    .gte('event_date', rangeStart)
    .lte('event_date', rangeEnd)
    .order('event_date', { ascending: true })

  if (!events) return []

  const calendarEvents: CalendarEvent[] = []

  for (const event of events) {
    const readyFlags = [
      event.grocery_list_ready,
      event.prep_list_ready,
      event.packing_list_ready,
      event.equipment_list_ready,
      event.timeline_ready,
    ]
    const readyCount = readyFlags.filter(Boolean).length
    const prepStatus: 'ready' | 'partial' | 'not_started' =
      readyCount === readyFlags.length ? 'ready' : readyCount > 0 ? 'partial' : 'not_started'

    // Build start/end datetimes from serve_time
    const serveTime = event.serve_time || '18:00'
    const startDt = `${event.event_date}T${serveTime}:00`
    // Default 3-hour service window
    const [h, m] = serveTime.split(':').map(Number)
    const endH = Math.min(h + 3, 23)
    const endDt = `${event.event_date}T${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`

    calendarEvents.push({
      id: event.id,
      title: event.occasion || 'Event',
      start: startDt,
      end: endDt,
      allDay: false,
      extendedProps: {
        eventId: event.id,
        occasion: event.occasion,
        clientName: (event.client as any)?.full_name ?? 'Unknown',
        guestCount: event.guest_count,
        status: event.status,
        prepStatus,
        serveTime: event.serve_time,
        arrivalTime: event.arrival_time,
        locationAddress: event.location_address,
        locationCity: event.location_city,
        dayType: 'event',
      },
    })

    // Add prep day (day before) if shop_day_before is enabled
    if (prefs.shop_day_before) {
      const eventDate = new Date(event.event_date + 'T12:00:00')
      eventDate.setDate(eventDate.getDate() - 1)
      const prepDate = eventDate.toISOString().split('T')[0]

      if (prepDate >= rangeStart && prepDate <= rangeEnd) {
        calendarEvents.push({
          id: `prep-${event.id}`,
          title: `Prep: ${event.occasion || 'Event'}`,
          start: prepDate,
          end: prepDate,
          allDay: true,
          extendedProps: {
            eventId: event.id,
            occasion: event.occasion,
            clientName: (event.client as any)?.full_name ?? 'Unknown',
            guestCount: event.guest_count,
            status: event.status,
            prepStatus,
            serveTime: event.serve_time,
            arrivalTime: event.arrival_time,
            locationAddress: event.location_address,
            locationCity: event.location_city,
            dayType: 'prep',
          },
        })
      }
    }
  }

  // ── Inquiry tentative holds ──────────────────────────────────────────────
  // Show inquiries with confirmed dates as tentative holds on the calendar

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      `
      id, confirmed_date, confirmed_occasion, confirmed_guest_count, status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .not('confirmed_date', 'is', null)
    .not('status', 'in', '("declined","expired","confirmed")')
    .gte('confirmed_date', rangeStart)
    .lte('confirmed_date', rangeEnd)

  if (inquiries) {
    for (const inquiry of inquiries) {
      // Skip inquiries that already converted to events (avoid duplication)
      const dateStr =
        typeof inquiry.confirmed_date === 'string' ? inquiry.confirmed_date.split('T')[0] : ''
      if (!dateStr) continue

      calendarEvents.push({
        id: `inquiry-${inquiry.id}`,
        title: `Hold: ${inquiry.confirmed_occasion || 'Inquiry'}`,
        start: dateStr,
        end: dateStr,
        allDay: true,
        extendedProps: {
          eventId: inquiry.id,
          occasion: inquiry.confirmed_occasion,
          clientName: (inquiry.client as any)?.full_name ?? 'Unknown Lead',
          guestCount: inquiry.confirmed_guest_count ?? 0,
          status: inquiry.status,
          prepStatus: 'not_started',
          serveTime: '',
          arrivalTime: null,
          locationAddress: null,
          locationCity: null,
          dayType: 'inquiry',
        },
      })
    }
  }

  return calendarEvents
}

/**
 * Update travel time for a specific event.
 */
export async function updateEventTravelTime(eventId: string, travelTimeMinutes: number) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // travel_time_minutes added in Layer 5 migration — type assertion until types regenerated
  const { error } = await supabase
    .from('events')
    .update({ travel_time_minutes: travelTimeMinutes, updated_by: user.id })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateEventTravelTime] Error:', error)
    throw new Error('Failed to update travel time')
  }

  return { success: true }
}

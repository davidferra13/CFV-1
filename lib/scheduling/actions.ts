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
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready, execution_sheet_ready,
      non_negotiables_checked, car_packed,
      shopping_completed_at, prep_completed_at,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(full_name)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Get menu component count
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)

  let componentCount = 0
  let hasAlcohol = false

  if (menus && menus.length > 0) {
    const menuIds = menus.map(m => m.id)

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
  const supabase = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready, execution_sheet_ready,
      non_negotiables_checked, car_packed,
      shopping_completed_at, prep_completed_at,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(full_name)
    `)
    .eq('tenant_id', user.tenantId!)
    .not('status', 'in', '("cancelled")')
    .order('event_date', { ascending: true })

  if (!events) return []

  return events.map(event => mapEventToScheduling(event))
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
export async function getEventDOPProgress(eventId: string): Promise<{ completed: number; total: number } | null> {
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

  const todayEvent = events.find(e => e.event_date === today)
  if (!todayEvent) return null

  const fullEvent = await fetchSchedulingEvent(todayEvent.id)
  if (!fullEvent) return null

  const prefs = await getChefPreferences()
  const timeline = generateTimeline(fullEvent, prefs)
  const dop = getDOPSchedule(fullEvent, prefs)

  return { event: fullEvent, timeline, dop }
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
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (weekOffset * 7))
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

    const dayEvents = events.filter(e => e.event_date === dateStr)

    // Check if this is a prep day (day before an event)
    const nextDay = new Date(dayDate)
    nextDay.setDate(dayDate.getDate() + 1)
    const nextDateStr = nextDay.toISOString().split('T')[0]
    const tomorrowEvents = events.filter(e => e.event_date === nextDateStr)
    const isPrepDay = tomorrowEvents.length > 0 && prefs.shop_day_before

    let dayType: WeekDay['dayType'] = 'free'
    if (dayEvents.length > 0) dayType = 'event'
    else if (isPrepDay) dayType = 'prep'
    else dayType = 'free'

    days.push({
      date: dateStr,
      dayOfWeek: dayNames[i],
      dayType,
      events: dayEvents.map(e => ({
        id: e.id,
        occasion: e.occasion,
        clientName: e.client?.full_name ?? 'Unknown',
        serveTime: e.serve_time,
        guestCount: e.guest_count,
        status: e.status,
        prepStatus: derivePrepStatus(e),
      })),
      isPrepDayFor: isPrepDay ? tomorrowEvents.map(e => e.id) : undefined,
    })
  }

  // Check for burnout warnings
  const eventDays = days.filter(d => d.dayType === 'event')
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
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

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

  revalidatePath('/schedule')
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ============================================
// CALENDAR VIEW
// ============================================

export interface CalendarEvent {
  id: string
  title: string
  start: string       // ISO datetime
  end: string         // ISO datetime
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
    dayType: 'event' | 'prep'
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
  const supabase = createServerClient()
  const prefs = await getChefPreferences()

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, serve_time, arrival_time,
      guest_count, status,
      location_address, location_city,
      grocery_list_ready, prep_list_ready, packing_list_ready,
      equipment_list_ready, timeline_ready,
      client:clients(full_name)
    `)
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
      readyCount === readyFlags.length ? 'ready' :
      readyCount > 0 ? 'partial' : 'not_started'

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

  return calendarEvents
}

/**
 * Update travel time for a specific event.
 */
export async function updateEventTravelTime(eventId: string, travelTimeMinutes: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  // travel_time_minutes added in Layer 5 migration — type assertion until types regenerated
  const { error } = await (supabase as any)
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

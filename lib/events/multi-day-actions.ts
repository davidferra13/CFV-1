// Multi-Day Event Server Actions
// Supports events spanning multiple days (festivals, wedding weekends)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type DaySchedule = {
  date: string // ISO date YYYY-MM-DD
  label: string // "Day 1 - Welcome Reception"
  serve_time: string | null
  guest_count: number | null
  menu_id: string | null
  notes: string | null
  service_style: string | null
}

/**
 * Enable multi-day mode on an event. Sets is_multi_day=true
 * and populates initial day_schedules from start to end date.
 */
export async function enableMultiDay(eventId: string, endDate: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the event to read its start date
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('event_date, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) throw new Error('Event not found')
  if (event.tenant_id !== user.entityId) throw new Error('Not authorized')

  // Parse dates and generate day schedules
  const startDate = event.event_date.substring(0, 10)
  const schedules: DaySchedule[] = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  if (end < start) throw new Error('End date must be on or after start date')

  let dayNum = 1
  const current = new Date(start)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    schedules.push({
      date: dateStr,
      label: `Day ${dayNum}`,
      serve_time: null,
      guest_count: null,
      menu_id: null,
      notes: null,
      service_style: null,
    })
    current.setDate(current.getDate() + 1)
    dayNum++
  }

  const { error } = await supabase
    .from('events')
    .update({
      is_multi_day: true,
      event_end_date: endDate,
      day_schedules: schedules,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to enable multi-day: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Disable multi-day mode, reverting to a single-day event.
 */
export async function disableMultiDay(eventId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('events')
    .update({
      is_multi_day: false,
      event_end_date: null,
      day_schedules: null,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to disable multi-day: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Add a day schedule entry.
 */
export async function addDaySchedule(
  eventId: string,
  schedule: DaySchedule
): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('day_schedules, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) throw new Error('Event not found')
  if (event.tenant_id !== user.entityId) throw new Error('Not authorized')

  const existing: DaySchedule[] = event.day_schedules || []

  // Don't allow duplicate dates
  if (existing.some((d: DaySchedule) => d.date === schedule.date)) {
    throw new Error(`Schedule for ${schedule.date} already exists`)
  }

  const updated = [...existing, schedule].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const { error } = await supabase
    .from('events')
    .update({ day_schedules: updated })
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to add day schedule: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Update a specific day's schedule by date.
 */
export async function updateDaySchedule(
  eventId: string,
  date: string,
  updates: Partial<Omit<DaySchedule, 'date'>>
): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('day_schedules, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) throw new Error('Event not found')
  if (event.tenant_id !== user.entityId) throw new Error('Not authorized')

  const existing: DaySchedule[] = event.day_schedules || []
  const idx = existing.findIndex((d: DaySchedule) => d.date === date)
  if (idx === -1) throw new Error(`No schedule found for ${date}`)

  existing[idx] = { ...existing[idx], ...updates, date }

  const { error } = await supabase
    .from('events')
    .update({ day_schedules: existing })
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to update day schedule: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Remove a specific day from the schedule.
 */
export async function removeDaySchedule(eventId: string, date: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('day_schedules, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) throw new Error('Event not found')
  if (event.tenant_id !== user.entityId) throw new Error('Not authorized')

  const existing: DaySchedule[] = event.day_schedules || []
  const updated = existing.filter((d: DaySchedule) => d.date !== date)

  const { error } = await supabase
    .from('events')
    .update({ day_schedules: updated })
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to remove day schedule: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Get all day schedules for an event.
 */
export async function getDaySchedules(eventId: string): Promise<DaySchedule[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('day_schedules, tenant_id')
    .eq('id', eventId)
    .single()

  if (error || !data) throw new Error('Event not found')
  if (data.tenant_id !== user.entityId) throw new Error('Not authorized')

  return data.day_schedules || []
}

/**
 * Get a multi-day overview with summary info.
 */
export async function getMultiDayOverview(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, event_end_date, is_multi_day, day_schedules, guest_count, tenant_id'
    )
    .eq('id', eventId)
    .single()

  if (error || !event) throw new Error('Event not found')
  if (event.tenant_id !== user.entityId) throw new Error('Not authorized')

  const schedules: DaySchedule[] = event.day_schedules || []
  const totalDays = schedules.length
  const totalGuests = schedules.reduce(
    (sum: number, d: DaySchedule) => sum + (d.guest_count ?? event.guest_count ?? 0),
    0
  )
  const daysWithMenus = schedules.filter((d: DaySchedule) => d.menu_id).length

  return {
    eventId: event.id,
    occasion: event.occasion,
    startDate: event.event_date,
    endDate: event.event_end_date,
    isMultiDay: event.is_multi_day,
    totalDays,
    totalGuests,
    daysWithMenus,
    schedules,
  }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  addDays,
  addWeeks,
  addMonths,
  nextDay,
  format,
  startOfDay,
  isAfter,
  isBefore,
} from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────

export type Frequency = 'weekly' | 'biweekly' | 'monthly'

export interface RecurringSchedule {
  id: string
  tenantId: string
  clientId: string
  clientName?: string
  title: string
  frequency: Frequency
  dayOfWeek: number | null
  preferredTime: string | null
  menuId: string | null
  menuName?: string
  guestCount: number
  notes: string | null
  isActive: boolean
  nextOccurrence: string | null
  lastGeneratedDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRecurringScheduleData {
  clientId: string
  title: string
  frequency: Frequency
  dayOfWeek?: number
  preferredTime?: string
  menuId?: string
  guestCount?: number
  notes?: string
}

export interface UpdateRecurringScheduleData {
  title?: string
  frequency?: Frequency
  dayOfWeek?: number
  preferredTime?: string
  menuId?: string | null
  guestCount?: number
  notes?: string
  isActive?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function mapRow(r: any): RecurringSchedule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clientId: r.client_id,
    clientName: r.clients?.full_name ?? r.client_name ?? undefined,
    title: r.title,
    frequency: r.frequency as Frequency,
    dayOfWeek: r.day_of_week,
    preferredTime: r.preferred_time ?? null,
    menuId: r.menu_id ?? null,
    menuName: r.menus?.name ?? r.menu_name ?? undefined,
    guestCount: r.guest_count ?? 2,
    notes: r.notes ?? null,
    isActive: r.is_active ?? true,
    nextOccurrence: r.next_occurrence ?? null,
    lastGeneratedDate: r.last_generated_date ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  }
}

/**
 * Pure date math: calculate the next N occurrences from a start date.
 * No AI, no LLM - just deterministic date calculations.
 */
function calculateNextOccurrences(
  frequency: Frequency,
  dayOfWeek: number | null,
  startDate: Date,
  count: number = 4
): Date[] {
  const occurrences: Date[] = []

  // Find the first occurrence on or after startDate
  let current = startOfDay(startDate)

  // If dayOfWeek is set, advance to the next matching day
  if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
    const currentDay = current.getDay()
    if (currentDay !== dayOfWeek) {
      current = nextDay(current, dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)
    }
  }

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      occurrences.push(new Date(current))
    } else {
      switch (frequency) {
        case 'weekly':
          current = addWeeks(current, 1)
          break
        case 'biweekly':
          current = addWeeks(current, 2)
          break
        case 'monthly':
          current = addMonths(current, 1)
          break
      }
      occurrences.push(new Date(current))
    }
  }

  return occurrences
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function createRecurringSchedule(
  data: CreateRecurringScheduleData
): Promise<RecurringSchedule> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Calculate first next occurrence
  const nextOcc = calculateNextOccurrences(data.frequency, data.dayOfWeek ?? null, new Date(), 1)

  const { data: row, error } = await supabase
    .from('recurring_schedules' as any)
    .insert({
      tenant_id: tenantId,
      client_id: data.clientId,
      title: data.title,
      frequency: data.frequency,
      day_of_week: data.dayOfWeek ?? null,
      preferred_time: data.preferredTime ?? null,
      menu_id: data.menuId ?? null,
      guest_count: data.guestCount ?? 2,
      notes: data.notes ?? null,
      is_active: true,
      next_occurrence: nextOcc.length > 0 ? format(nextOcc[0], 'yyyy-MM-dd') : null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[recurring-schedules] Create failed:', error)
    throw new Error('Failed to create recurring schedule')
  }

  revalidatePath('/scheduling')
  revalidatePath('/dashboard')
  return mapRow(row)
}

export async function updateRecurringSchedule(
  id: string,
  data: UpdateRecurringScheduleData
): Promise<RecurringSchedule> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.title !== undefined) updatePayload.title = data.title
  if (data.frequency !== undefined) updatePayload.frequency = data.frequency
  if (data.dayOfWeek !== undefined) updatePayload.day_of_week = data.dayOfWeek
  if (data.preferredTime !== undefined) updatePayload.preferred_time = data.preferredTime
  if (data.menuId !== undefined) updatePayload.menu_id = data.menuId
  if (data.guestCount !== undefined) updatePayload.guest_count = data.guestCount
  if (data.notes !== undefined) updatePayload.notes = data.notes
  if (data.isActive !== undefined) updatePayload.is_active = data.isActive

  // Recalculate next occurrence if frequency or day changed
  if (data.frequency !== undefined || data.dayOfWeek !== undefined) {
    const freq = data.frequency ?? 'weekly'
    const dow = data.dayOfWeek ?? null
    const nextOcc = calculateNextOccurrences(freq, dow, new Date(), 1)
    if (nextOcc.length > 0) {
      updatePayload.next_occurrence = format(nextOcc[0], 'yyyy-MM-dd')
    }
  }

  const { data: row, error } = await supabase
    .from('recurring_schedules' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('[recurring-schedules] Update failed:', error)
    throw new Error('Failed to update recurring schedule')
  }

  revalidatePath('/scheduling')
  revalidatePath('/dashboard')
  return mapRow(row)
}

export async function deleteRecurringSchedule(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Soft delete: set is_active = false
  const { error } = await supabase
    .from('recurring_schedules' as any)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[recurring-schedules] Delete (soft) failed:', error)
    throw new Error('Failed to deactivate recurring schedule')
  }

  revalidatePath('/scheduling')
  revalidatePath('/dashboard')
}

export async function getRecurringSchedules(clientId?: string): Promise<RecurringSchedule[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  let query = supabase
    .from('recurring_schedules' as any)
    .select('*, clients(full_name), menus(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[recurring-schedules] Fetch failed:', error)
    throw new Error('Failed to load recurring schedules')
  }

  return (rows ?? []).map(mapRow)
}

/**
 * Generate draft events for the next N occurrences of a recurring schedule.
 * Creates events in 'draft' status so the chef can review and confirm.
 */
export async function generateUpcomingEvents(
  scheduleId: string,
  count: number = 4
): Promise<{ created: number; dates: string[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch the schedule
  const { data: schedule, error: fetchErr } = await supabase
    .from('recurring_schedules' as any)
    .select('*, clients(full_name, address, city, state, zip)')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !schedule) {
    throw new Error('Recurring schedule not found')
  }

  if (!schedule.is_active) {
    throw new Error('Cannot generate events for an inactive schedule')
  }

  // Calculate next occurrences starting from today or last generated date
  const startFrom = schedule.last_generated_date
    ? addDays(new Date(schedule.last_generated_date), 1)
    : new Date()

  const dates = calculateNextOccurrences(
    schedule.frequency as Frequency,
    schedule.day_of_week,
    startFrom,
    count
  )

  if (dates.length === 0) {
    return { created: 0, dates: [] }
  }

  // Use client address if available, otherwise TBD
  const client = schedule.clients ?? {}
  const locationAddress = client.address || 'TBD'
  const locationCity = client.city || 'TBD'
  const locationState = client.state || 'MA'
  const locationZip = client.zip || '00000'

  // Build event payloads
  const eventPayloads = dates.map((date) => ({
    tenant_id: tenantId,
    client_id: schedule.client_id,
    event_date: format(date, 'yyyy-MM-dd'),
    serve_time: schedule.preferred_time || '18:00',
    guest_count: schedule.guest_count ?? 2,
    occasion: schedule.title,
    status: 'draft',
    location_address: locationAddress,
    location_city: locationCity,
    location_state: locationState,
    location_zip: locationZip,
    menu_id: schedule.menu_id ?? null,
    notes: `Auto-generated from recurring schedule: ${schedule.title}`,
    created_by: user.id,
  }))

  const { data: events, error: insertErr } = await supabase
    .from('events')
    .insert(eventPayloads)
    .select('id, event_date')

  if (insertErr) {
    console.error('[recurring-schedules] Event generation failed:', insertErr)
    throw new Error('Failed to generate events from recurring schedule')
  }

  // Update the schedule's last_generated_date and next_occurrence
  const lastDate = dates[dates.length - 1]
  const futureOccurrences = calculateNextOccurrences(
    schedule.frequency as Frequency,
    schedule.day_of_week,
    addDays(lastDate, 1),
    1
  )

  await supabase
    .from('recurring_schedules' as any)
    .update({
      last_generated_date: format(lastDate, 'yyyy-MM-dd'),
      next_occurrence:
        futureOccurrences.length > 0 ? format(futureOccurrences[0], 'yyyy-MM-dd') : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)

  revalidatePath('/scheduling')
  revalidatePath('/events')
  revalidatePath('/dashboard')

  const createdDates = (events ?? []).map((e: any) => e.event_date)
  return { created: createdDates.length, dates: createdDates }
}

/**
 * Get all upcoming recurring events for the next 14 days.
 * Pure date math - calculates upcoming dates from active schedules.
 */
export async function getUpcomingRecurringEvents(): Promise<
  { scheduleId: string; title: string; clientName: string; date: string; frequency: Frequency }[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: schedules, error } = await supabase
    .from('recurring_schedules' as any)
    .select('*, clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error) {
    console.error('[recurring-schedules] Upcoming fetch failed:', error)
    return []
  }

  const today = startOfDay(new Date())
  const twoWeeksOut = addDays(today, 14)
  const upcoming: {
    scheduleId: string
    title: string
    clientName: string
    date: string
    frequency: Frequency
  }[] = []

  for (const schedule of schedules ?? []) {
    const occurrences = calculateNextOccurrences(
      schedule.frequency as Frequency,
      schedule.day_of_week,
      today,
      8 // enough to cover 2 weeks for weekly
    )

    for (const date of occurrences) {
      if (isAfter(date, twoWeeksOut)) break
      if (!isBefore(date, today)) {
        upcoming.push({
          scheduleId: schedule.id,
          title: schedule.title,
          clientName: schedule.clients?.full_name ?? 'Unknown Client',
          date: format(date, 'yyyy-MM-dd'),
          frequency: schedule.frequency as Frequency,
        })
      }
    }
  }

  // Sort by date
  upcoming.sort((a, b) => a.date.localeCompare(b.date))
  return upcoming
}

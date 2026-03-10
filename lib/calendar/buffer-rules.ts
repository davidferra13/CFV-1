// Calendar Buffer Rules & Booking Conflict Detection
// Wraps chef_scheduling_rules + booking_daily_caps + booking_event_types
// with conflict-checking logic for event creation and calendar display.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ---- Types ----

export type SchedulingRules = {
  blocked_days_of_week: number[]
  max_events_per_week: number | null
  max_events_per_month: number | null
  min_buffer_days: number
  min_lead_days: number
  preferred_days_of_week: number[]
  // From booking_event_types defaults
  default_buffer_before_minutes: number
  default_buffer_after_minutes: number
  // From booking_daily_caps
  max_per_day: number
  max_per_week: number
}

export type BookingConflict = {
  type: 'buffer_overlap' | 'daily_cap' | 'weekly_cap' | 'blocked_day' | 'lead_time'
  message: string
}

export type EffectiveSlot = {
  start: string // HH:MM
  end: string // HH:MM
  available: boolean
  reason?: string
}

// ---- Schemas ----

const SchedulingRulesSchema = z.object({
  blocked_days_of_week: z.array(z.number().int().min(0).max(6)).default([]),
  max_events_per_week: z.number().int().min(1).max(50).nullable().default(null),
  max_events_per_month: z.number().int().min(1).max(200).nullable().default(null),
  min_buffer_days: z.number().int().min(0).max(30).default(0),
  min_lead_days: z.number().int().min(0).max(90).default(0),
  preferred_days_of_week: z.array(z.number().int().min(0).max(6)).default([]),
  default_buffer_before_minutes: z.number().int().min(0).max(480).default(0),
  default_buffer_after_minutes: z.number().int().min(0).max(480).default(0),
  max_per_day: z.number().int().min(1).max(20).default(2),
  max_per_week: z.number().int().min(1).max(50).default(10),
})

// ---- Actions ----

/**
 * Load all scheduling rules for the current chef.
 * Merges chef_scheduling_rules + booking_daily_caps into a single object.
 */
export async function getSchedulingRules(): Promise<SchedulingRules> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [rulesResult, capsResult] = await Promise.all([
    supabase.from('chef_scheduling_rules').select('*').eq('tenant_id', user.entityId).single(),
    supabase
      .from('booking_daily_caps')
      .select('max_per_day, max_per_week')
      .eq('chef_id', user.entityId)
      .single(),
  ])

  const rules = rulesResult.data
  const caps = capsResult.data

  return {
    blocked_days_of_week: (rules?.blocked_days_of_week as number[]) ?? [],
    max_events_per_week: (rules?.max_events_per_week as number | null) ?? null,
    max_events_per_month: (rules?.max_events_per_month as number | null) ?? null,
    min_buffer_days: (rules?.min_buffer_days as number) ?? 0,
    min_lead_days: (rules?.min_lead_days as number) ?? 0,
    preferred_days_of_week: (rules?.preferred_days_of_week as number[]) ?? [],
    default_buffer_before_minutes: 0,
    default_buffer_after_minutes: 0,
    max_per_day: (caps?.max_per_day as number) ?? 2,
    max_per_week: (caps?.max_per_week as number) ?? 10,
  }
}

/**
 * Save scheduling rules. Upserts both chef_scheduling_rules and booking_daily_caps.
 */
export async function updateSchedulingRules(
  input: z.infer<typeof SchedulingRulesSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = SchedulingRulesSchema.parse(input)
  const supabase: any = createServerClient()

  // Upsert scheduling rules
  const { error: rulesError } = await supabase.from('chef_scheduling_rules').upsert(
    {
      tenant_id: user.entityId,
      blocked_days_of_week: validated.blocked_days_of_week,
      max_events_per_week: validated.max_events_per_week,
      max_events_per_month: validated.max_events_per_month,
      min_buffer_days: validated.min_buffer_days,
      min_lead_days: validated.min_lead_days,
      preferred_days_of_week: validated.preferred_days_of_week,
    },
    { onConflict: 'tenant_id' }
  )

  if (rulesError) {
    console.error('[updateSchedulingRules] Rules error:', rulesError)
    return { success: false, error: rulesError.message }
  }

  // Upsert daily caps
  const { error: capsError } = await supabase.from('booking_daily_caps').upsert(
    {
      chef_id: user.entityId,
      max_per_day: validated.max_per_day,
      max_per_week: validated.max_per_week,
    },
    { onConflict: 'chef_id' }
  )

  if (capsError) {
    console.error('[updateSchedulingRules] Caps error:', capsError)
    return { success: false, error: capsError.message }
  }

  revalidatePath('/calendar')
  revalidatePath('/settings/calendar-sync')
  return { success: true }
}

/**
 * Check if a proposed event conflicts with buffer times and caps.
 * Returns an array of conflicts (empty = no conflicts).
 */
export async function checkBookingConflict(
  chefId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<BookingConflict[]> {
  const supabase: any = createServerClient()
  const conflicts: BookingConflict[] = []

  // Load rules
  const [rulesResult, capsResult] = await Promise.all([
    supabase.from('chef_scheduling_rules').select('*').eq('tenant_id', chefId).single(),
    supabase
      .from('booking_daily_caps')
      .select('max_per_day, max_per_week')
      .eq('chef_id', chefId)
      .single(),
  ])

  const rules = rulesResult.data
  const caps = capsResult.data

  // 1. Check blocked days
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay()
  const blockedDays: number[] = (rules?.blocked_days_of_week as number[]) ?? []
  if (blockedDays.includes(dayOfWeek)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    conflicts.push({
      type: 'blocked_day',
      message: `${dayNames[dayOfWeek]} is blocked on your schedule`,
    })
  }

  // 2. Check lead time
  const minLeadDays = (rules?.min_lead_days as number) ?? 0
  if (minLeadDays > 0) {
    const now = new Date()
    const eventDate = new Date(`${date}T00:00:00`)
    const daysAway = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAway < minLeadDays) {
      conflicts.push({
        type: 'lead_time',
        message: `Requires at least ${minLeadDays} days advance notice (this is ${daysAway} days away)`,
      })
    }
  }

  // 3. Check daily cap
  const maxPerDay = (caps?.max_per_day as number) ?? 2
  let eventsQuery = supabase
    .from('events')
    .select('id, serve_time, start_time, end_time', { count: 'exact', head: false })
    .eq('tenant_id', chefId)
    .eq('event_date', date)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])

  if (excludeEventId) {
    eventsQuery = eventsQuery.neq('id', excludeEventId)
  }

  const { data: existingEvents, count: dayCount } = await eventsQuery

  if ((dayCount ?? 0) >= maxPerDay) {
    conflicts.push({
      type: 'daily_cap',
      message: `Daily cap reached (${maxPerDay} event${maxPerDay !== 1 ? 's' : ''} max per day)`,
    })
  }

  // 4. Check weekly cap
  const maxPerWeek = (caps?.max_per_week as number) ?? 10
  const eventDate = new Date(`${date}T12:00:00Z`)
  const weekStart = new Date(eventDate)
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  let weekQuery = supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chefId)
    .gte('event_date', weekStart.toISOString().split('T')[0])
    .lte('event_date', weekEnd.toISOString().split('T')[0])
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])

  if (excludeEventId) {
    weekQuery = weekQuery.neq('id', excludeEventId)
  }

  const { count: weekCount } = await weekQuery

  if ((weekCount ?? 0) >= maxPerWeek) {
    conflicts.push({
      type: 'weekly_cap',
      message: `Weekly cap reached (${maxPerWeek} event${maxPerWeek !== 1 ? 's' : ''} max per week)`,
    })
  }

  // 5. Check buffer time overlaps
  const bufferDays = (rules?.min_buffer_days as number) ?? 0
  if (bufferDays > 0 && existingEvents && existingEvents.length > 0) {
    // Check if there's an event within buffer_days of the proposed date
    const proposedDate = new Date(`${date}T00:00:00`)

    for (const event of existingEvents) {
      // Same-day events are handled by daily cap
      // Buffer days applies to consecutive days
    }

    // Check adjacent days
    const bufferStart = new Date(proposedDate)
    bufferStart.setDate(bufferStart.getDate() - bufferDays)
    const bufferEnd = new Date(proposedDate)
    bufferEnd.setDate(bufferEnd.getDate() + bufferDays)

    let adjacentQuery = supabase
      .from('events')
      .select('id, event_date', { count: 'exact', head: false })
      .eq('tenant_id', chefId)
      .gte('event_date', bufferStart.toISOString().split('T')[0])
      .lte('event_date', bufferEnd.toISOString().split('T')[0])
      .neq('event_date', date)
      .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])

    if (excludeEventId) {
      adjacentQuery = adjacentQuery.neq('id', excludeEventId)
    }

    const { data: adjacentEvents } = await adjacentQuery

    if (adjacentEvents && adjacentEvents.length > 0) {
      conflicts.push({
        type: 'buffer_overlap',
        message: `Requires ${bufferDays} buffer day${bufferDays !== 1 ? 's' : ''} between events, but there ${adjacentEvents.length === 1 ? 'is an event' : 'are events'} nearby`,
      })
    }
  }

  return conflicts
}

/**
 * Compute effective availability for a given date after applying
 * all scheduling rules, existing events, and buffer times.
 */
export async function getEffectiveAvailability(
  chefId: string,
  date: string
): Promise<{ available: boolean; conflicts: BookingConflict[]; eventCount: number }> {
  const conflicts = await checkBookingConflict(chefId, date, '00:00', '23:59')

  const supabase: any = createServerClient()
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chefId)
    .eq('event_date', date)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])

  return {
    available: conflicts.length === 0,
    conflicts,
    eventCount: count ?? 0,
  }
}

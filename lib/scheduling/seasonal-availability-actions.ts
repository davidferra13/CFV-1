'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type SeasonalPeriod = {
  id: string
  chef_id: string
  period_name: string
  location: string
  start_date: string
  end_date: string
  is_accepting_bookings: boolean
  max_events_per_week: number
  travel_radius_miles: number | null
  notes: string | null
  recurring_yearly: boolean
  created_at: string
  updated_at: string
}

export type SeasonalPeriodInput = {
  period_name: string
  location: string
  start_date: string
  end_date: string
  is_accepting_bookings?: boolean
  max_events_per_week?: number
  travel_radius_miles?: number | null
  notes?: string | null
  recurring_yearly?: boolean
}

type YearOverviewPeriod = SeasonalPeriod & {
  color: string
}

// Deterministic color palette for locations
const LOCATION_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

function getLocationColor(location: string, allLocations: string[]): string {
  const idx = allLocations.indexOf(location)
  return LOCATION_COLORS[idx % LOCATION_COLORS.length]
}

// ============================================
// QUERIES
// ============================================

/** Get all seasonal periods for the current chef */
export async function getSeasonalPeriods(): Promise<SeasonalPeriod[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('seasonal_availability_periods')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('start_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch seasonal periods: ${error.message}`)
  return (data ?? []) as SeasonalPeriod[]
}

/** Get the active seasonal period based on today's date */
export async function getActiveSeasonalPeriod(): Promise<SeasonalPeriod | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await db
    .from('seasonal_availability_periods')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active period: ${error.message}`)
  return (data as SeasonalPeriod) ?? null
}

/** Get availability info for a specific date */
export async function getAvailabilityForDate(date: string): Promise<{
  period: SeasonalPeriod | null
  isAcceptingBookings: boolean
  location: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('seasonal_availability_periods')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch availability: ${error.message}`)

  if (!data) {
    return { period: null, isAcceptingBookings: true, location: null }
  }

  const period = data as SeasonalPeriod
  return {
    period,
    isAcceptingBookings: period.is_accepting_bookings,
    location: period.location,
  }
}

/** Get all periods for the current year, color-coded by location */
export async function getYearOverview(): Promise<YearOverviewPeriod[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const { data, error } = await db
    .from('seasonal_availability_periods')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .or(`start_date.lte.${yearEnd},end_date.gte.${yearStart}`)
    .order('start_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch year overview: ${error.message}`)

  const periods = (data ?? []) as SeasonalPeriod[]
  const uniqueLocations = [...new Set(periods.map((p) => p.location))]

  return periods.map((p) => ({
    ...p,
    color: getLocationColor(p.location, uniqueLocations),
  }))
}

/** Check if the chef can accept a booking on this date based on seasonal rules + max events/week */
export async function checkBookingConflict(date: string): Promise<{
  canBook: boolean
  reason: string | null
  location: string | null
  eventsThisWeek: number
  maxEventsPerWeek: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find the seasonal period covering this date
  const { data: periodData, error: periodError } = await db
    .from('seasonal_availability_periods')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
    .maybeSingle()

  if (periodError) throw new Error(`Failed to check booking: ${periodError.message}`)

  const period = periodData as SeasonalPeriod | null

  // If no seasonal period covers this date, default to accepting
  if (!period) {
    return { canBook: true, reason: null, location: null, eventsThisWeek: 0, maxEventsPerWeek: 5 }
  }

  // If not accepting bookings in this period
  if (!period.is_accepting_bookings) {
    return {
      canBook: false,
      reason: `Not accepting bookings during "${period.period_name}" (${period.location})`,
      location: period.location,
      eventsThisWeek: 0,
      maxEventsPerWeek: period.max_events_per_week,
    }
  }

  // Check events this week against max_events_per_week
  const targetDate = new Date(date)
  const dayOfWeek = targetDate.getDay()
  const weekStart = new Date(targetDate)
  weekStart.setDate(targetDate.getDate() - dayOfWeek)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { count, error: countError } = await db
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', weekStartStr)
    .lte('event_date', weekEndStr)
    .not('status', 'eq', 'cancelled')

  if (countError) throw new Error(`Failed to count events: ${countError.message}`)

  const eventsThisWeek = count ?? 0
  const maxEvents = period.max_events_per_week

  if (eventsThisWeek >= maxEvents) {
    return {
      canBook: false,
      reason: `Already at max capacity (${eventsThisWeek}/${maxEvents} events) for the week of ${weekStartStr}`,
      location: period.location,
      eventsThisWeek,
      maxEventsPerWeek: maxEvents,
    }
  }

  return {
    canBook: true,
    reason: null,
    location: period.location,
    eventsThisWeek,
    maxEventsPerWeek: maxEvents,
  }
}

// ============================================
// MUTATIONS
// ============================================

/** Create a new seasonal period. Checks for date overlaps with existing periods. */
export async function createSeasonalPeriod(
  input: SeasonalPeriodInput
): Promise<{ success: boolean; error?: string; period?: SeasonalPeriod }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate dates
  if (input.end_date <= input.start_date) {
    return { success: false, error: 'End date must be after start date' }
  }

  // Check for overlapping periods
  const { data: overlaps, error: overlapError } = await db
    .from('seasonal_availability_periods')
    .select('id, period_name, start_date, end_date')
    .eq('chef_id', user.tenantId!)
    .lt('start_date', input.end_date)
    .gt('end_date', input.start_date)

  if (overlapError) throw new Error(`Failed to check overlaps: ${overlapError.message}`)

  if (overlaps && overlaps.length > 0) {
    const names = overlaps.map((o: any) => o.period_name).join(', ')
    return { success: false, error: `Dates overlap with existing period(s): ${names}` }
  }

  const { data, error } = await db
    .from('seasonal_availability_periods')
    .insert({
      chef_id: user.tenantId!,
      period_name: input.period_name,
      location: input.location,
      start_date: input.start_date,
      end_date: input.end_date,
      is_accepting_bookings: input.is_accepting_bookings ?? true,
      max_events_per_week: input.max_events_per_week ?? 5,
      travel_radius_miles: input.travel_radius_miles ?? null,
      notes: input.notes ?? null,
      recurring_yearly: input.recurring_yearly ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create seasonal period: ${error.message}`)

  revalidatePath('/scheduling')
  return { success: true, period: data as SeasonalPeriod }
}

/** Update an existing seasonal period */
export async function updateSeasonalPeriod(
  id: string,
  input: Partial<SeasonalPeriodInput>
): Promise<{ success: boolean; error?: string; period?: SeasonalPeriod }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate dates if both provided
  if (input.start_date && input.end_date && input.end_date <= input.start_date) {
    return { success: false, error: 'End date must be after start date' }
  }

  // If dates are changing, check for overlaps (excluding this period)
  if (input.start_date || input.end_date) {
    // Fetch current period to get full date range
    const { data: current, error: fetchErr } = await db
      .from('seasonal_availability_periods')
      .select('*')
      .eq('id', id)
      .eq('chef_id', user.tenantId!)
      .single()

    if (fetchErr || !current) {
      return { success: false, error: 'Period not found' }
    }

    const startDate = input.start_date ?? current.start_date
    const endDate = input.end_date ?? current.end_date

    const { data: overlaps, error: overlapError } = await db
      .from('seasonal_availability_periods')
      .select('id, period_name, start_date, end_date')
      .eq('chef_id', user.tenantId!)
      .neq('id', id)
      .lt('start_date', endDate)
      .gt('end_date', startDate)

    if (overlapError) throw new Error(`Failed to check overlaps: ${overlapError.message}`)

    if (overlaps && overlaps.length > 0) {
      const names = overlaps.map((o: any) => o.period_name).join(', ')
      return { success: false, error: `Dates overlap with existing period(s): ${names}` }
    }
  }

  const { data, error } = await db
    .from('seasonal_availability_periods')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update seasonal period: ${error.message}`)

  revalidatePath('/scheduling')
  return { success: true, period: data as SeasonalPeriod }
}

/** Delete a seasonal period */
export async function deleteSeasonalPeriod(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('seasonal_availability_periods')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete seasonal period: ${error.message}`)

  revalidatePath('/scheduling')
  return { success: true }
}

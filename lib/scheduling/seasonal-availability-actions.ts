'use server'

// Seasonal Availability Management - Server Actions
// Tracks location-based availability for chefs who travel between
// locations throughout the year (e.g. Hamptons summer, Aspen winter).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addYears,
} from 'date-fns'

// ── Types ───────────────────────────────────────────────────────────────────────

export type SeasonalPeriod = {
  id: string
  chef_id: string
  season_name: string
  location: string
  start_date: string
  end_date: string
  is_available: boolean
  travel_radius_miles: number | null
  notes: string | null
  is_recurring: boolean
  created_at: string
  updated_at: string
}

export type SeasonalPeriodInput = {
  season_name: string
  location: string
  start_date: string
  end_date: string
  is_available?: boolean
  travel_radius_miles?: number | null
  notes?: string | null
  is_recurring?: boolean
}

export type CurrentLocationResult = {
  location: string | null
  season_name: string | null
  is_available: boolean
  travel_radius_miles: number | null
}

export type DateAvailabilityResult = {
  date: string
  location: string | null
  season_name: string | null
  is_available: boolean
  travel_radius_miles: number | null
}

export type MonthCalendarData = {
  month: number
  monthName: string
  days: DayCalendarData[]
}

export type DayCalendarData = {
  date: string
  dayOfMonth: number
  location: string | null
  season_name: string | null
  is_available: boolean
  isToday: boolean
}

// ── Actions ─────────────────────────────────────────────────────────────────────

export async function createSeasonalPeriod(
  data: SeasonalPeriodInput
): Promise<{ success: boolean; error?: string; period?: SeasonalPeriod }> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  if (new Date(data.end_date) <= new Date(data.start_date)) {
    return { success: false, error: 'End date must be after start date' }
  }

  const { data: period, error } = await supabase
    .from('chef_seasonal_availability')
    .insert({
      chef_id: chefId,
      season_name: data.season_name,
      location: data.location,
      start_date: data.start_date,
      end_date: data.end_date,
      is_available: data.is_available ?? true,
      travel_radius_miles: data.travel_radius_miles ?? null,
      notes: data.notes ?? null,
      is_recurring: data.is_recurring ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('[seasonal-availability] Create failed:', error)
    return { success: false, error: 'Failed to create seasonal period' }
  }

  revalidatePath('/schedule')
  return { success: true, period: period as SeasonalPeriod }
}

export async function updateSeasonalPeriod(
  id: string,
  data: Partial<SeasonalPeriodInput>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  if (data.start_date && data.end_date) {
    if (new Date(data.end_date) <= new Date(data.start_date)) {
      return { success: false, error: 'End date must be after start date' }
    }
  }

  const { error } = await supabase
    .from('chef_seasonal_availability')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[seasonal-availability] Update failed:', error)
    return { success: false, error: 'Failed to update seasonal period' }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function deleteSeasonalPeriod(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('chef_seasonal_availability')
    .delete()
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[seasonal-availability] Delete failed:', error)
    return { success: false, error: 'Failed to delete seasonal period' }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function getSeasonalAvailability(year?: number): Promise<SeasonalPeriod[]> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  const targetYear = year ?? new Date().getFullYear()
  const yearStart = format(startOfYear(new Date(targetYear, 0, 1)), 'yyyy-MM-dd')
  const yearEnd = format(endOfYear(new Date(targetYear, 0, 1)), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('chef_seasonal_availability')
    .select('*')
    .eq('chef_id', chefId)
    .or(`start_date.lte.${yearEnd},end_date.gte.${yearStart}`)
    .order('start_date', { ascending: true })

  if (error) {
    console.error('[seasonal-availability] Fetch failed:', error)
    return []
  }

  return (data ?? []) as SeasonalPeriod[]
}

export async function getCurrentLocation(): Promise<CurrentLocationResult> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  const today = format(new Date(), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('chef_seasonal_availability')
    .select('*')
    .eq('chef_id', chefId)
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(1)
    .single()

  if (error || !data) {
    return {
      location: null,
      season_name: null,
      is_available: true,
      travel_radius_miles: null,
    }
  }

  const period = data as SeasonalPeriod
  return {
    location: period.location,
    season_name: period.season_name,
    is_available: period.is_available,
    travel_radius_miles: period.travel_radius_miles,
  }
}

export async function getAvailabilityForDate(date: string): Promise<DateAvailabilityResult> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chef_seasonal_availability')
    .select('*')
    .eq('chef_id', chefId)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
    .single()

  if (error || !data) {
    return {
      date,
      location: null,
      season_name: null,
      is_available: true,
      travel_radius_miles: null,
    }
  }

  const period = data as SeasonalPeriod
  return {
    date,
    location: period.location,
    season_name: period.season_name,
    is_available: period.is_available,
    travel_radius_miles: period.travel_radius_miles,
  }
}

export async function getSeasonalCalendar(year: number): Promise<MonthCalendarData[]> {
  const periods = await getSeasonalAvailability(year)
  const today = format(new Date(), 'yyyy-MM-dd')
  const yearDate = new Date(year, 0, 1)

  const months = eachMonthOfInterval({
    start: startOfYear(yearDate),
    end: endOfYear(yearDate),
  })

  return months.map((monthDate) => {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    })

    const days: DayCalendarData[] = monthDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const matchingPeriod = periods.find((p) =>
        isWithinInterval(day, {
          start: parseISO(p.start_date),
          end: parseISO(p.end_date),
        })
      )

      return {
        date: dateStr,
        dayOfMonth: day.getDate(),
        location: matchingPeriod?.location ?? null,
        season_name: matchingPeriod?.season_name ?? null,
        is_available: matchingPeriod?.is_available ?? true,
        isToday: dateStr === today,
      }
    })

    return {
      month: monthDate.getMonth() + 1,
      monthName: format(monthDate, 'MMMM'),
      days,
    }
  })
}

export async function copySeasonToNextYear(
  seasonId: string
): Promise<{ success: boolean; error?: string; period?: SeasonalPeriod }> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const supabase = await createServerClient()

  // Fetch the source season
  const { data: source, error: fetchError } = await supabase
    .from('chef_seasonal_availability')
    .select('*')
    .eq('id', seasonId)
    .eq('chef_id', chefId)
    .single()

  if (fetchError || !source) {
    return { success: false, error: 'Season not found' }
  }

  const srcPeriod = source as SeasonalPeriod
  const nextStart = format(addYears(parseISO(srcPeriod.start_date), 1), 'yyyy-MM-dd')
  const nextEnd = format(addYears(parseISO(srcPeriod.end_date), 1), 'yyyy-MM-dd')

  const { data: newPeriod, error: insertError } = await supabase
    .from('chef_seasonal_availability')
    .insert({
      chef_id: chefId,
      season_name: srcPeriod.season_name,
      location: srcPeriod.location,
      start_date: nextStart,
      end_date: nextEnd,
      is_available: srcPeriod.is_available,
      travel_radius_miles: srcPeriod.travel_radius_miles,
      notes: srcPeriod.notes,
      is_recurring: srcPeriod.is_recurring,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[seasonal-availability] Copy failed:', insertError)
    return { success: false, error: 'Failed to copy season to next year' }
  }

  revalidatePath('/schedule')
  return { success: true, period: newPeriod as SeasonalPeriod }
}

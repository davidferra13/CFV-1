// Capacity Planning - Server Actions
// Fetches data from Supabase and runs through capacity-planning.ts analysis engine.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  computeCapacityAnalysis,
  computeTimeBreakdown,
  computeWeeklyTrend,
  computeDayHeatmap,
  type CapacityAnalysis,
  type CapacityTrendWeek,
  type TimeBreakdown,
  type DayHeatmapEntry,
  type EventDataPoint,
} from './capacity-planning'

// ============================================
// Main Capacity Analysis
// ============================================

export async function getCapacityAnalysis(
  lookbackDays: number = 90
): Promise<{
  analysis: CapacityAnalysis
  timeBreakdown: TimeBreakdown[]
  heatmap: DayHeatmapEntry[]
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]

  // Fetch all data in parallel
  const [eventsResult, recurringResult, calendarResult, prefsResult] = await Promise.all([
    // Events from lookback period
    supabase
      .from('events')
      .select(
        'id, event_date, status, time_prep_minutes, time_service_minutes, time_shopping_minutes, time_travel_minutes, time_reset_minutes, guest_count'
      )
      .eq('tenant_id', tenantId)
      .gte('event_date', cutoffStr)
      .order('event_date', { ascending: true }),

    // Active recurring services
    supabase
      .from('recurring_services')
      .select('id, frequency, status, service_type, day_of_week')
      .eq('chef_id', tenantId)
      .eq('status', 'active'),

    // Calendar blocks (vacation, time off, etc.)
    supabase
      .from('chef_calendar_entries')
      .select('id, start_date, end_date, blocks_bookings, entry_type')
      .eq('chef_id', tenantId)
      .gte('end_date', cutoffStr),

    // Chef preferences for weekly hours
    supabase
      .from('chef_preferences')
      .select('default_prep_hours')
      .eq('chef_id', tenantId)
      .maybeSingle(),
  ])

  // Map to typed data points
  const events: EventDataPoint[] = (eventsResult.data ?? []).map((e) => ({
    id: e.id,
    eventDate: e.event_date,
    status: e.status,
    timePrepMinutes: e.time_prep_minutes,
    timeServiceMinutes: e.time_service_minutes,
    timeShoppingMinutes: e.time_shopping_minutes,
    timeTravelMinutes: e.time_travel_minutes,
    timeResetMinutes: e.time_reset_minutes,
    guestCount: e.guest_count,
  }))

  const recurringServices = (recurringResult.data ?? []).map((s) => ({
    id: s.id,
    frequency: s.frequency,
    status: s.status,
    serviceType: s.service_type,
    dayOfWeek: s.day_of_week,
  }))

  const calendarBlocks = (calendarResult.data ?? []).map((b) => ({
    id: b.id,
    startDate: b.start_date,
    endDate: b.end_date,
    blocksBookings: b.blocks_bookings,
    entryType: b.entry_type,
  }))

  // Weekly hours available: use 40 as default (no column on chefs table for this)
  const weeklyHoursAvailable = 40

  const analysis = computeCapacityAnalysis(
    events,
    recurringServices,
    calendarBlocks,
    weeklyHoursAvailable,
    lookbackDays
  )

  const timeBreakdown = computeTimeBreakdown(events, lookbackDays)
  const heatmap = computeDayHeatmap(events, lookbackDays)

  return { analysis, timeBreakdown, heatmap }
}

// ============================================
// Capacity Trend (weekly utilization over time)
// ============================================

export async function getCapacityTrend(
  weeks: number = 12
): Promise<CapacityTrendWeek[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - weeks * 7)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select(
      'id, event_date, status, time_prep_minutes, time_service_minutes, time_shopping_minutes, time_travel_minutes, time_reset_minutes, guest_count'
    )
    .eq('tenant_id', tenantId)
    .gte('event_date', cutoffStr)
    .order('event_date', { ascending: true })

  const eventDataPoints: EventDataPoint[] = (events ?? []).map((e) => ({
    id: e.id,
    eventDate: e.event_date,
    status: e.status,
    timePrepMinutes: e.time_prep_minutes,
    timeServiceMinutes: e.time_service_minutes,
    timeShoppingMinutes: e.time_shopping_minutes,
    timeTravelMinutes: e.time_travel_minutes,
    timeResetMinutes: e.time_reset_minutes,
    guestCount: e.guest_count,
  }))

  return computeWeeklyTrend(eventDataPoints, 40, weeks)
}

// ============================================
// Quick Capacity Snapshot (for dashboard widget)
// ============================================

export async function getCapacitySnapshot(): Promise<{
  utilizationPercent: number
  weeklyHoursUsed: number
  weeklyHoursAvailable: number
  burnoutRisk: 'low' | 'moderate' | 'high'
  canTakeMore: boolean
  additionalEventsPerWeek: number
}> {
  const { analysis } = await getCapacityAnalysis(30) // shorter lookback for dashboard
  return {
    utilizationPercent: analysis.utilizationPercent,
    weeklyHoursUsed: analysis.weeklyHoursUsed,
    weeklyHoursAvailable: analysis.weeklyHoursAvailable,
    burnoutRisk: analysis.burnoutRisk,
    canTakeMore: analysis.canTakeMore,
    additionalEventsPerWeek: analysis.additionalEventsPerWeek,
  }
}

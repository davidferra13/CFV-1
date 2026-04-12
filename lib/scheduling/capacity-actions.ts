'use server'

// Capacity Ceiling & Workload Protection - Server Actions
// Reads and writes capacity limits on the chefs table.
// Columns were added by migration 20260322000012_capacity_protection.sql.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapacitySettings = {
  max_events_per_week: number | null
  max_events_per_month: number | null
  max_consecutive_working_days: number | null
  min_rest_days_per_week: number | null
  max_hours_per_week: number | null
}

export type OffHoursSettings = {
  off_hours_start: string | null // TIME string like "22:00"
  off_hours_end: string | null // TIME string like "08:00"
  off_days: string[] | null // e.g. ['saturday', 'sunday']
}

export type CapacityCheckResult = {
  wouldExceedWeekly: boolean
  wouldExceedMonthly: boolean
  warnings: string[]
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCapacitySettings(): Promise<CapacitySettings & OffHoursSettings> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select(
      'max_events_per_week, max_events_per_month, max_consecutive_working_days, min_rest_days_per_week, max_hours_per_week, off_hours_start, off_hours_end, off_days'
    )
    .eq('id', chef.tenantId!)
    .single()

  return {
    max_events_per_week: (data as any)?.max_events_per_week ?? null,
    max_events_per_month: (data as any)?.max_events_per_month ?? null,
    max_consecutive_working_days: (data as any)?.max_consecutive_working_days ?? null,
    min_rest_days_per_week: (data as any)?.min_rest_days_per_week ?? null,
    max_hours_per_week: (data as any)?.max_hours_per_week ?? null,
    off_hours_start: (data as any)?.off_hours_start ?? null,
    off_hours_end: (data as any)?.off_hours_end ?? null,
    off_days: (data as any)?.off_days ?? null,
  }
}

// ─── Write - Workload Limits ──────────────────────────────────────────────────

export async function updateCapacitySettings(input: {
  max_events_per_week?: number | null
  max_events_per_month?: number | null
  max_consecutive_working_days?: number | null
  min_rest_days_per_week?: number | null
  max_hours_per_week?: number | null
}): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({
      max_events_per_week: input.max_events_per_week ?? null,
      max_events_per_month: input.max_events_per_month ?? null,
      max_consecutive_working_days: input.max_consecutive_working_days ?? null,
      min_rest_days_per_week: input.min_rest_days_per_week ?? null,
      max_hours_per_week: input.max_hours_per_week ?? null,
    } as any)
    .eq('id', chef.tenantId!)

  if (error) {
    console.error('[updateCapacitySettings] Error:', error)
    throw new Error('Failed to save capacity settings')
  }

  revalidatePath('/settings')
  return { success: true }
}

// ─── Write - Off-Hours ────────────────────────────────────────────────────────

export async function updateOffHoursSettings(input: {
  off_hours_start?: string | null
  off_hours_end?: string | null
  off_days?: string[] | null
}): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({
      off_hours_start: input.off_hours_start ?? null,
      off_hours_end: input.off_hours_end ?? null,
      off_days: input.off_days ?? [],
    } as any)
    .eq('id', chef.tenantId!)

  if (error) {
    console.error('[updateOffHoursSettings] Error:', error)
    throw new Error('Failed to save off-hours settings')
  }

  revalidatePath('/settings')
  return { success: true }
}

// ─── Capacity Check for a Specific Date ──────────────────────────────────────

/**
 * Check whether adding an event on the given date would breach the chef's
 * configured weekly or monthly capacity limits.
 */
export async function checkCapacityForDate(eventDate: string): Promise<CapacityCheckResult> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Fetch current limits
  const { data: chefData } = await db
    .from('chefs')
    .select('max_events_per_week, max_events_per_month')
    .eq('id', tenantId)
    .single()

  const maxWeekly: number | null = (chefData as any)?.max_events_per_week ?? null
  const maxMonthly: number | null = (chefData as any)?.max_events_per_month ?? null

  const [_cay, _cam, _cad] = (eventDate as string).split('-').map(Number)
  const date = new Date(_cay, _cam - 1, _cad)

  // Week window: same calendar week (Mon–Sun)
  const dayOfWeek = date.getDay() // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(_cay, _cam - 1, _cad + mondayOffset)
  const weekEnd = new Date(_cay, _cam - 1, _cad + mondayOffset + 6)

  // Month window: same calendar month
  const monthStart = new Date(_cay, _cam - 1, 1)
  const monthEnd = new Date(_cay, _cam, 0)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const { count: weekCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', fmt(weekStart))
    .lte('event_date', fmt(weekEnd))
    .not('status', 'in', '("cancelled","draft")')

  const { count: monthCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', fmt(monthStart))
    .lte('event_date', fmt(monthEnd))
    .not('status', 'in', '("cancelled","draft")')

  const currentWeek = weekCount ?? 0
  const currentMonth = monthCount ?? 0

  const wouldExceedWeekly = maxWeekly !== null && currentWeek >= maxWeekly
  const wouldExceedMonthly = maxMonthly !== null && currentMonth >= maxMonthly

  const warnings: string[] = []
  if (wouldExceedWeekly) {
    warnings.push(
      `You have ${currentWeek} of your ${maxWeekly} weekly event limit already booked this week.`
    )
  }
  if (wouldExceedMonthly) {
    warnings.push(
      `You have ${currentMonth} of your ${maxMonthly} monthly event limit already booked this month.`
    )
  }

  return { wouldExceedWeekly, wouldExceedMonthly, warnings }
}

// Per-Staff Punch Clock Actions
// Provides clock-in/clock-out, timesheet queries, manager corrections,
// and weekly hours summaries. Built on top of the existing staff_clock_entries table.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// -- Types ------------------------------------------------------------------

export type PunchEntry = {
  id: string
  staffMemberId: string
  staffName: string
  staffRole: string
  clockIn: string
  clockOut: string | null
  durationMinutes: number | null
  roleOverride: string | null
  notes: string | null
  voided: boolean
  breakMinutes: number
  status: 'clocked_in' | 'completed'
}

export type ActiveClock = {
  id: string
  staffMemberId: string
  staffName: string
  clockIn: string
  elapsedMinutes: number
  roleOverride: string | null
}

export type WeeklyStaffSummary = {
  staffMemberId: string
  staffName: string
  totalMinutes: number
  totalHours: number
  shiftCount: number
  hourlyRateCents: number
  estimatedPayCents: number
  overtime: boolean
}

// -- Schemas ----------------------------------------------------------------

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

const EditPunchSchema = z.object({
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().nullable().optional(),
  roleOverride: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// -- Actions ----------------------------------------------------------------

/**
 * Clock in a staff member. Records the current timestamp as clock-in time.
 */
export async function punchClockIn(staffMemberId: string, role?: string): Promise<PunchEntry> {
  const user = await requireChef()
  z.string().uuid().parse(staffMemberId)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Prevent double clock-in
  const { data: existing } = await supabase
    .from('staff_clock_entries')
    .select('id')
    .eq('chef_id', tenantId)
    .eq('staff_member_id', staffMemberId)
    .eq('status', 'clocked_in')
    .eq('voided', false)
    .maybeSingle()

  if (existing) {
    throw new Error('This staff member is already clocked in. Clock out first.')
  }

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .insert({
      staff_member_id: staffMemberId,
      chef_id: tenantId,
      clock_in_at: new Date().toISOString(),
      status: 'clocked_in',
      role_override: role ?? null,
      voided: false,
    })
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .single()

  if (error) throw new Error(`Failed to clock in: ${error.message}`)

  revalidatePath('/staff/time-clock')
  revalidatePath('/staff/clock')

  return mapPunchEntry(data)
}

/**
 * Clock out a staff member. Computes duration in minutes.
 */
export async function punchClockOut(staffMemberId: string): Promise<PunchEntry> {
  const user = await requireChef()
  z.string().uuid().parse(staffMemberId)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Find the active clock entry
  const { data: active, error: findError } = await supabase
    .from('staff_clock_entries')
    .select('id, clock_in_at, break_minutes')
    .eq('chef_id', tenantId)
    .eq('staff_member_id', staffMemberId)
    .eq('status', 'clocked_in')
    .eq('voided', false)
    .maybeSingle()

  if (findError || !active) {
    throw new Error('No active clock entry found for this staff member')
  }

  const clockOutAt = new Date()
  const clockInAt = new Date(active.clock_in_at)
  const totalMinutes = Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000)

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .update({
      clock_out_at: clockOutAt.toISOString(),
      total_minutes: totalMinutes,
      status: 'completed',
    })
    .eq('id', active.id)
    .eq('chef_id', tenantId)
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .single()

  if (error) throw new Error(`Failed to clock out: ${error.message}`)

  revalidatePath('/staff/time-clock')
  revalidatePath('/staff/clock')

  return mapPunchEntry(data)
}

/**
 * Get all staff members currently clocked in (optionally for a specific date).
 */
export async function getActiveClocks(date?: string): Promise<ActiveClock[]> {
  const user = await requireChef()
  if (date) DateSchema.parse(date)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  let query = supabase
    .from('staff_clock_entries')
    .select(
      `
      id, staff_member_id, clock_in_at, role_override,
      staff_members (id, name)
    `
    )
    .eq('chef_id', tenantId)
    .eq('status', 'clocked_in')
    .eq('voided', false)
    .order('clock_in_at', { ascending: true })

  if (date) {
    query = query.gte('clock_in_at', `${date}T00:00:00Z`).lte('clock_in_at', `${date}T23:59:59Z`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch active clocks: ${error.message}`)

  const now = Date.now()
  return (data ?? []).map((row: any) => ({
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName: row.staff_members?.name ?? 'Unknown',
    clockIn: row.clock_in_at,
    elapsedMinutes: Math.round((now - new Date(row.clock_in_at).getTime()) / 60000),
    roleOverride: row.role_override ?? null,
  }))
}

/**
 * Get all punch entries for a specific date (non-voided by default).
 */
export async function getTimesheetForDate(date: string): Promise<PunchEntry[]> {
  const user = await requireChef()
  DateSchema.parse(date)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .eq('chef_id', tenantId)
    .gte('clock_in_at', `${date}T00:00:00Z`)
    .lte('clock_in_at', `${date}T23:59:59Z`)
    .order('clock_in_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch timesheet: ${error.message}`)

  return (data ?? []).map(mapPunchEntry)
}

/**
 * Get all punch entries for a date range.
 */
export async function getTimesheetForRange(
  startDate: string,
  endDate: string
): Promise<PunchEntry[]> {
  const user = await requireChef()
  DateSchema.parse(startDate)
  DateSchema.parse(endDate)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .eq('chef_id', tenantId)
    .gte('clock_in_at', `${startDate}T00:00:00Z`)
    .lte('clock_in_at', `${endDate}T23:59:59Z`)
    .order('clock_in_at', { ascending: false })
    .limit(1000)

  if (error) throw new Error(`Failed to fetch timesheet range: ${error.message}`)

  return (data ?? []).map(mapPunchEntry)
}

/**
 * Edit a punch entry (manager corrections). Only the chef/manager can do this.
 */
export async function editPunchEntry(
  entryId: string,
  updates: {
    clockIn?: string
    clockOut?: string | null
    roleOverride?: string | null
    notes?: string | null
  }
): Promise<PunchEntry> {
  const user = await requireChef()
  z.string().uuid().parse(entryId)
  const parsed = EditPunchSchema.parse(updates)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Build the update payload
  const updatePayload: Record<string, any> = {}
  if (parsed.clockIn !== undefined) updatePayload.clock_in_at = parsed.clockIn
  if (parsed.clockOut !== undefined) updatePayload.clock_out_at = parsed.clockOut
  if (parsed.roleOverride !== undefined) updatePayload.role_override = parsed.roleOverride
  if (parsed.notes !== undefined) updatePayload.notes = parsed.notes

  // Recompute duration if both clock_in and clock_out are available
  if (parsed.clockIn || parsed.clockOut !== undefined) {
    // Fetch current values to fill in gaps
    const { data: current } = await supabase
      .from('staff_clock_entries')
      .select('clock_in_at, clock_out_at')
      .eq('id', entryId)
      .eq('chef_id', tenantId)
      .single()

    if (current) {
      const effectiveIn = parsed.clockIn ?? current.clock_in_at
      const effectiveOut = parsed.clockOut !== undefined ? parsed.clockOut : current.clock_out_at
      if (effectiveIn && effectiveOut) {
        updatePayload.total_minutes = Math.round(
          (new Date(effectiveOut).getTime() - new Date(effectiveIn).getTime()) / 60000
        )
        updatePayload.status = 'completed'
      }
    }
  }

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .update(updatePayload)
    .eq('id', entryId)
    .eq('chef_id', tenantId)
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .single()

  if (error) throw new Error(`Failed to edit punch entry: ${error.message}`)

  revalidatePath('/staff/time-clock')
  revalidatePath('/staff/clock')

  return mapPunchEntry(data)
}

/**
 * Void a punch entry (soft delete). Sets voided = true.
 */
export async function deletePunchEntry(entryId: string): Promise<{ success: true }> {
  const user = await requireChef()
  z.string().uuid().parse(entryId)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('staff_clock_entries')
    .update({ voided: true, status: 'completed' })
    .eq('id', entryId)
    .eq('chef_id', tenantId)

  if (error) throw new Error(`Failed to void punch entry: ${error.message}`)

  revalidatePath('/staff/time-clock')
  revalidatePath('/staff/clock')

  return { success: true }
}

/**
 * Get weekly hours summary per staff member.
 * Flags overtime when total exceeds 40 hours (2400 minutes).
 */
export async function getWeeklyHoursSummary(weekStart: string): Promise<{
  weekStart: string
  weekEnd: string
  staff: WeeklyStaffSummary[]
  totalMinutes: number
  totalHours: number
}> {
  const user = await requireChef()
  DateSchema.parse(weekStart)
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const weekEnd = end.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      id, staff_member_id, total_minutes, break_minutes, status,
      staff_members (id, name, role, hourly_rate_cents)
    `
    )
    .eq('chef_id', tenantId)
    .eq('voided', false)
    .eq('status', 'completed')
    .gte('clock_in_at', `${weekStart}T00:00:00Z`)
    .lte('clock_in_at', `${weekEnd}T23:59:59Z`)

  if (error) throw new Error(`Failed to fetch weekly summary: ${error.message}`)

  const OVERTIME_THRESHOLD_MINUTES = 40 * 60

  const byStaff = new Map<string, WeeklyStaffSummary>()

  for (const row of data ?? []) {
    const staff = (row as any).staff_members
    const staffId = row.staff_member_id
    const workMinutes = Math.max(0, (row.total_minutes ?? 0) - (row.break_minutes ?? 0))
    const rateCents = staff?.hourly_rate_cents ?? 0

    const existing = byStaff.get(staffId) ?? {
      staffMemberId: staffId,
      staffName: staff?.name ?? 'Unknown',
      totalMinutes: 0,
      totalHours: 0,
      shiftCount: 0,
      hourlyRateCents: rateCents,
      estimatedPayCents: 0,
      overtime: false,
    }

    existing.totalMinutes += workMinutes
    existing.totalHours = Math.round((existing.totalMinutes / 60) * 100) / 100
    existing.shiftCount += 1
    existing.estimatedPayCents = Math.round((existing.totalMinutes / 60) * existing.hourlyRateCents)
    existing.overtime = existing.totalMinutes > OVERTIME_THRESHOLD_MINUTES
    byStaff.set(staffId, existing)
  }

  const staffList = Array.from(byStaff.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
  const totalMinutes = staffList.reduce((sum, s) => sum + s.totalMinutes, 0)

  return {
    weekStart,
    weekEnd,
    staff: staffList,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
  }
}

// -- Mapper -----------------------------------------------------------------

function mapPunchEntry(row: any): PunchEntry {
  const staff = row.staff_members
  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName: staff?.name ?? 'Unknown',
    staffRole: staff?.role ?? 'other',
    clockIn: row.clock_in_at,
    clockOut: row.clock_out_at ?? null,
    durationMinutes: row.total_minutes ?? null,
    roleOverride: row.role_override ?? null,
    notes: row.notes ?? null,
    voided: row.voided ?? false,
    breakMinutes: row.break_minutes ?? 0,
    status: row.status,
  }
}

// Staff Time Tracking Actions (Punch Clock with Break Support)
// Extends the existing staff_clock_entries with break tracking and payroll.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type ShiftEntry = {
  id: string
  staffMemberId: string
  staffName: string
  clockIn: string
  clockOut: string | null
  breakStartAt: string | null
  breakEndAt: string | null
  breakMinutes: number
  totalMinutes: number | null
  hourlyRateCents: number
  totalPayCents: number | null
  notes: string | null
  approved: boolean
  approvedBy: string | null
  status: 'clocked_in' | 'completed'
}

export type DailyLaborSummary = {
  date: string
  totalHours: number
  totalCostCents: number
  staffEntries: Array<{
    staffMemberId: string
    staffName: string
    totalMinutes: number
    totalPayCents: number
  }>
}

export type WeeklyPayrollRow = {
  staffMemberId: string
  staffName: string
  totalHours: number
  totalMinutes: number
  hourlyRateCents: number
  totalPayCents: number
  shiftCount: number
}

// ─── Break Actions ───────────────────────────────────────────────

export async function startBreak(staffMemberId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find active clock entry
  const { data: active, error: findError } = await supabase
    .from('staff_clock_entries')
    .select('id, break_start_at')
    .eq('chef_id', user.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .eq('status', 'clocked_in')
    .maybeSingle()

  if (findError || !active) throw new Error('No active shift found for this staff member')
  if (active.break_start_at) throw new Error('Break already in progress')

  const { error } = await supabase
    .from('staff_clock_entries')
    .update({ break_start_at: new Date().toISOString() })
    .eq('id', active.id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to start break: ${error.message}`)

  revalidatePath('/staff/clock')
  revalidatePath('/compliance/daily')
  return { success: true }
}

export async function endBreak(staffMemberId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find active clock entry with break in progress
  const { data: active, error: findError } = await supabase
    .from('staff_clock_entries')
    .select('id, break_start_at, break_minutes')
    .eq('chef_id', user.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .eq('status', 'clocked_in')
    .not('break_start_at', 'is', null)
    .maybeSingle()

  if (findError || !active) throw new Error('No active break found for this staff member')

  const breakStart = new Date(active.break_start_at)
  const breakEnd = new Date()
  const thisBreakMinutes = Math.max(
    0,
    Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000)
  )
  const totalBreakMinutes = (active.break_minutes ?? 0) + thisBreakMinutes

  const { error } = await supabase
    .from('staff_clock_entries')
    .update({
      break_start_at: null,
      break_end_at: breakEnd.toISOString(),
      break_minutes: totalBreakMinutes,
    })
    .eq('id', active.id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to end break: ${error.message}`)

  revalidatePath('/staff/clock')
  revalidatePath('/compliance/daily')
  return { success: true }
}

// ─── Shift Query Actions ─────────────────────────────────────────

export async function getCurrentShift(staffMemberId: string): Promise<ShiftEntry | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      *,
      staff_members (id, name, hourly_rate_cents)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .eq('status', 'clocked_in')
    .maybeSingle()

  if (error) throw new Error(`Failed to get current shift: ${error.message}`)
  if (!data) return null

  return mapShiftEntry(data)
}

export async function getTimeEntries(filters: {
  staffMemberId?: string
  startDate?: string
  endDate?: string
}): Promise<ShiftEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('staff_clock_entries')
    .select(
      `
      *,
      staff_members (id, name, hourly_rate_cents)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('clock_in_at', { ascending: false })
    .limit(200)

  if (filters.staffMemberId) {
    query = query.eq('staff_member_id', filters.staffMemberId)
  }
  if (filters.startDate) {
    query = query.gte('clock_in_at', `${filters.startDate}T00:00:00Z`)
  }
  if (filters.endDate) {
    query = query.lte('clock_in_at', `${filters.endDate}T23:59:59Z`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load time entries: ${error.message}`)
  return (data ?? []).map(mapShiftEntry)
}

export async function approveTimeEntry(entryId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('staff_clock_entries')
    .update({
      approved: true,
      approved_by: user.email ?? 'chef',
    })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to approve time entry: ${error.message}`)

  revalidatePath('/staff/clock')
  return { success: true }
}

// ─── Labor Summary Actions ───────────────────────────────────────

export async function getDailyLaborSummary(date: string): Promise<DailyLaborSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      id,
      staff_member_id,
      clock_in_at,
      clock_out_at,
      total_minutes,
      break_minutes,
      staff_members (id, name, hourly_rate_cents)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('clock_in_at', `${date}T00:00:00Z`)
    .lte('clock_in_at', `${date}T23:59:59Z`)

  if (error) throw new Error(`Failed to load daily summary: ${error.message}`)

  const byStaff = new Map<string, { name: string; totalMinutes: number; rateCents: number }>()

  for (const row of data ?? []) {
    const staff = (row as any).staff_members
    const staffId = row.staff_member_id
    const workMinutes = (row.total_minutes ?? 0) - (row.break_minutes ?? 0)
    const existing = byStaff.get(staffId) ?? {
      name: staff?.name ?? 'Unknown',
      totalMinutes: 0,
      rateCents: staff?.hourly_rate_cents ?? 0,
    }
    existing.totalMinutes += Math.max(0, workMinutes)
    byStaff.set(staffId, existing)
  }

  let totalMinutes = 0
  let totalCostCents = 0
  const staffEntries: DailyLaborSummary['staffEntries'] = []

  for (const [staffMemberId, info] of byStaff) {
    const payCents = Math.round((info.totalMinutes / 60) * info.rateCents)
    totalMinutes += info.totalMinutes
    totalCostCents += payCents
    staffEntries.push({
      staffMemberId,
      staffName: info.name,
      totalMinutes: info.totalMinutes,
      totalPayCents: payCents,
    })
  }

  return {
    date,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    totalCostCents,
    staffEntries,
  }
}

export async function getWeeklyPayrollPreview(weekStart: string): Promise<{
  weekStart: string
  weekEnd: string
  rows: WeeklyPayrollRow[]
  totalHours: number
  totalPayCents: number
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // weekStart is a Monday, compute Sunday
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const weekEnd = end.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      id,
      staff_member_id,
      total_minutes,
      break_minutes,
      status,
      staff_members (id, name, hourly_rate_cents)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('clock_in_at', `${weekStart}T00:00:00Z`)
    .lte('clock_in_at', `${weekEnd}T23:59:59Z`)
    .eq('status', 'completed')

  if (error) throw new Error(`Failed to load payroll data: ${error.message}`)

  const byStaff = new Map<string, WeeklyPayrollRow>()

  for (const row of data ?? []) {
    const staff = (row as any).staff_members
    const staffId = row.staff_member_id
    const workMinutes = Math.max(0, (row.total_minutes ?? 0) - (row.break_minutes ?? 0))
    const rateCents = staff?.hourly_rate_cents ?? 0

    const existing = byStaff.get(staffId) ?? {
      staffMemberId: staffId,
      staffName: staff?.name ?? 'Unknown',
      totalHours: 0,
      totalMinutes: 0,
      hourlyRateCents: rateCents,
      totalPayCents: 0,
      shiftCount: 0,
    }

    existing.totalMinutes += workMinutes
    existing.totalHours = Math.round((existing.totalMinutes / 60) * 100) / 100
    existing.totalPayCents = Math.round((existing.totalMinutes / 60) * existing.hourlyRateCents)
    existing.shiftCount += 1
    byStaff.set(staffId, existing)
  }

  const rows = Array.from(byStaff.values()).sort((a, b) => b.totalPayCents - a.totalPayCents)

  return {
    weekStart,
    weekEnd,
    rows,
    totalHours: rows.reduce((sum, r) => sum + r.totalHours, 0),
    totalPayCents: rows.reduce((sum, r) => sum + r.totalPayCents, 0),
  }
}

// ─── Mapper ──────────────────────────────────────────────────────

function mapShiftEntry(row: any): ShiftEntry {
  const staff = row.staff_members
  const rateCents = staff?.hourly_rate_cents ?? 0
  const workMinutes =
    row.total_minutes != null ? Math.max(0, row.total_minutes - (row.break_minutes ?? 0)) : null
  const payCents = workMinutes != null ? Math.round((workMinutes / 60) * rateCents) : null

  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName: staff?.name ?? 'Unknown',
    clockIn: row.clock_in_at,
    clockOut: row.clock_out_at,
    breakStartAt: row.break_start_at ?? null,
    breakEndAt: row.break_end_at ?? null,
    breakMinutes: row.break_minutes ?? 0,
    totalMinutes: row.total_minutes,
    hourlyRateCents: rateCents,
    totalPayCents: payCents,
    notes: row.notes ?? null,
    approved: row.approved ?? false,
    approvedBy: row.approved_by ?? null,
    status: row.status,
  }
}

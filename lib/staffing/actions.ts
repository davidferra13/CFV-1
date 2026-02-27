'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef, requireStaff } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { assignStaffToEvent, checkAssignmentConflict } from '@/lib/staff/actions'
import { clockIn, clockOut } from '@/lib/staff/clock-actions'

const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const ScheduleSchema = z.object({
  eventId: z.string().uuid(),
  staffMemberId: z.string().uuid(),
  scheduledHours: z.number().min(0).optional(),
})

const ClockInSchema = z.object({
  staffMemberId: z.string().uuid(),
  eventId: z.string().uuid().nullable().optional(),
})

export type StaffSchedulerStaff = {
  id: string
  name: string
  role: string
  hourlyRateCents: number
  availableDates: string[]
}

export type StaffSchedulerEvent = {
  id: string
  name: string
  date: string
  status: string
  assignments: Array<{
    assignmentId: string
    staffMemberId: string
    staffName: string
    role: string
    status: string
    scheduledHours: number | null
    actualHours: number | null
    effectiveRateCents: number
  }>
}

export type StaffSchedulerData = {
  startDate: string
  endDate: string
  staff: StaffSchedulerStaff[]
  events: StaffSchedulerEvent[]
}

export type TimeTrackerEntry = {
  id: string
  staffMemberId: string
  staffName: string
  eventId: string | null
  eventName: string | null
  clockInAt: string
  clockOutAt: string | null
  totalMinutes: number | null
  status: 'clocked_in' | 'completed'
}

export type TimeTrackerData = {
  startDate: string
  endDate: string
  staff: Array<{ id: string; name: string; hourlyRateCents: number }>
  events: Array<{ id: string; name: string; date: string }>
  entries: TimeTrackerEntry[]
}

export type PayrollReportRow = {
  staffMemberId: string
  staffName: string
  totalHours: number
  totalMinutes: number
  hourlyRateCents: number
  estimatedLaborCostCents: number
  entryCount: number
}

export type PayrollReportData = {
  startDate: string
  endDate: string
  rows: PayrollReportRow[]
  totalHours: number
  totalMinutes: number
  totalLaborCostCents: number
}

export async function getStaffSchedulerData(
  startDate: string,
  endDate: string
): Promise<StaffSchedulerData> {
  const user = await requireChef()
  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const supabase = createServerClient()

  const [staffResult, eventsResult, assignmentResult, availabilityResult] = await Promise.all([
    supabase
      .from('staff_members')
      .select('id, name, role, hourly_rate_cents')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('events')
      .select('id, occasion, event_date, status')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', parsed.startDate)
      .lte('event_date', parsed.endDate)
      .order('event_date'),
    supabase
      .from('event_staff_assignments')
      .select(
        `
        id,
        event_id,
        staff_member_id,
        role_override,
        scheduled_hours,
        actual_hours,
        rate_override_cents,
        status,
        staff_members (id, name, role, hourly_rate_cents)
      `
      )
      .eq('chef_id', user.tenantId!),
    supabase
      .from('staff_availability')
      .select('staff_member_id, date, is_available')
      .eq('chef_id', user.tenantId!)
      .gte('date', parsed.startDate)
      .lte('date', parsed.endDate),
  ])

  if (staffResult.error) throw new Error(`Failed to load staff: ${staffResult.error.message}`)
  if (eventsResult.error) throw new Error(`Failed to load events: ${eventsResult.error.message}`)
  if (assignmentResult.error) {
    throw new Error(`Failed to load assignments: ${assignmentResult.error.message}`)
  }
  if (availabilityResult.error) {
    throw new Error(`Failed to load availability: ${availabilityResult.error.message}`)
  }

  const availabilityMap = new Map<string, Set<string>>()
  for (const row of availabilityResult.data ?? []) {
    if (!row.is_available) continue
    const existing = availabilityMap.get(row.staff_member_id) ?? new Set<string>()
    existing.add(row.date)
    availabilityMap.set(row.staff_member_id, existing)
  }

  const staff = (staffResult.data ?? []).map((member: any) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    hourlyRateCents: member.hourly_rate_cents ?? 0,
    availableDates: Array.from(availabilityMap.get(member.id) ?? []),
  }))

  const assignmentsByEvent = new Map<string, StaffSchedulerEvent['assignments']>()
  for (const row of assignmentResult.data ?? []) {
    const staffMember = row.staff_members as any
    const rate = row.rate_override_cents ?? staffMember?.hourly_rate_cents ?? 0
    const current = assignmentsByEvent.get(row.event_id) ?? []
    current.push({
      assignmentId: row.id,
      staffMemberId: row.staff_member_id,
      staffName: staffMember?.name ?? 'Unknown',
      role: row.role_override ?? staffMember?.role ?? 'other',
      status: row.status,
      scheduledHours: row.scheduled_hours,
      actualHours: row.actual_hours,
      effectiveRateCents: rate,
    })
    assignmentsByEvent.set(row.event_id, current)
  }

  const events = (eventsResult.data ?? []).map((event) => ({
    id: event.id,
    name: event.occasion || 'Event',
    date: event.event_date,
    status: event.status,
    assignments: assignmentsByEvent.get(event.id) ?? [],
  }))

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    staff,
    events,
  }
}

export async function scheduleStaffMemberWithConflictCheck(input: {
  eventId: string
  staffMemberId: string
  scheduledHours?: number
}) {
  const parsed = ScheduleSchema.parse(input)
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('id', parsed.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  const conflicts = await checkAssignmentConflict(
    parsed.staffMemberId,
    event.event_date,
    parsed.eventId
  )
  if (conflicts.length > 0) {
    throw new Error('Scheduling conflict: this staff member is already assigned on this date')
  }

  await assignStaffToEvent({
    event_id: parsed.eventId,
    staff_member_id: parsed.staffMemberId,
    scheduled_hours: parsed.scheduledHours,
  })

  revalidatePath('/staffing')
  revalidatePath('/staff/schedule')
  return { ok: true }
}

export async function getTimeTrackerData(
  startDate: string,
  endDate: string
): Promise<TimeTrackerData> {
  const user = await requireChef()
  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const supabase = createServerClient()

  const [staffResult, eventsResult, entriesResult] = await Promise.all([
    supabase
      .from('staff_members')
      .select('id, name, hourly_rate_cents')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('events')
      .select('id, occasion, event_date')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', parsed.startDate)
      .lte('event_date', parsed.endDate)
      .order('event_date'),
    supabase
      .from('staff_clock_entries')
      .select(
        `
        id,
        staff_member_id,
        event_id,
        clock_in_at,
        clock_out_at,
        total_minutes,
        status,
        staff_members (id, name),
        events (id, occasion)
      `
      )
      .eq('chef_id', user.tenantId!)
      .gte('clock_in_at', `${parsed.startDate}T00:00:00Z`)
      .lte('clock_in_at', `${parsed.endDate}T23:59:59Z`)
      .order('clock_in_at', { ascending: false }),
  ])

  if (staffResult.error) throw new Error(`Failed to load staff: ${staffResult.error.message}`)
  if (eventsResult.error) throw new Error(`Failed to load events: ${eventsResult.error.message}`)
  if (entriesResult.error) throw new Error(`Failed to load entries: ${entriesResult.error.message}`)

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    staff: (staffResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      hourlyRateCents: row.hourly_rate_cents ?? 0,
    })),
    events: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      name: event.occasion || 'Event',
      date: event.event_date,
    })),
    entries: (entriesResult.data ?? []).map((entry: any) => ({
      id: entry.id,
      staffMemberId: entry.staff_member_id,
      staffName: entry.staff_members?.name ?? 'Unknown',
      eventId: entry.event_id,
      eventName: entry.events?.occasion ?? null,
      clockInAt: entry.clock_in_at,
      clockOutAt: entry.clock_out_at,
      totalMinutes: entry.total_minutes,
      status: entry.status,
    })),
  }
}

export async function clockInFromTimeTracker(input: {
  staffMemberId: string
  eventId?: string | null
}) {
  const parsed = ClockInSchema.parse(input)
  let entry: {
    id: string
    staffMemberId: string
    eventId: string | null
    clockInAt: string
    clockOutAt: string | null
    totalMinutes: number | null
    status: 'clocked_in' | 'completed'
  } | null = null

  let chefUser: Awaited<ReturnType<typeof requireChef>> | null = null
  try {
    chefUser = await requireChef()
  } catch {}

  if (chefUser) {
    if (!chefUser.tenantId) throw new Error('Missing tenant context')
    entry = await clockIn(parsed.staffMemberId, parsed.eventId ?? undefined)
  } else {
    const staffUser = await requireStaff()
    if (parsed.staffMemberId !== staffUser.staffMemberId) {
      throw new Error('Staff can only clock in themselves')
    }

    const supabase = createServerClient({ admin: true })
    if (parsed.eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('id', parsed.eventId)
        .eq('tenant_id', staffUser.tenantId)
        .maybeSingle()
      if (!event) throw new Error('Event not found')
    }

    const { data, error } = await supabase
      .from('staff_clock_entries')
      .insert({
        staff_member_id: staffUser.staffMemberId,
        chef_id: staffUser.tenantId,
        event_id: parsed.eventId ?? null,
        clock_in_at: new Date().toISOString(),
        status: 'clocked_in',
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to clock in')
    }

    entry = {
      id: data.id,
      staffMemberId: data.staff_member_id,
      eventId: data.event_id,
      clockInAt: data.clock_in_at,
      clockOutAt: data.clock_out_at,
      totalMinutes: data.total_minutes,
      status: data.status,
    }
  }

  if (!entry) throw new Error('Clock in failed')
  revalidatePath('/staffing')
  revalidatePath('/staff/clock')
  revalidatePath('/staff-time')
  return entry
}

export async function clockOutFromTimeTracker(entryId: string) {
  let entry: {
    id: string
    staffMemberId: string
    eventId: string | null
    clockInAt: string
    clockOutAt: string | null
    totalMinutes: number | null
    status: 'clocked_in' | 'completed'
  } | null = null

  let chefUser: Awaited<ReturnType<typeof requireChef>> | null = null
  try {
    chefUser = await requireChef()
  } catch {}

  if (chefUser) {
    if (!chefUser.tenantId) throw new Error('Missing tenant context')
    entry = await clockOut(entryId)
  } else {
    const staffUser = await requireStaff()
    const supabase = createServerClient({ admin: true })

    const { data: existing, error: fetchError } = await supabase
      .from('staff_clock_entries')
      .select('*')
      .eq('id', entryId)
      .eq('chef_id', staffUser.tenantId)
      .eq('staff_member_id', staffUser.staffMemberId)
      .eq('status', 'clocked_in')
      .maybeSingle()

    if (fetchError || !existing) {
      throw new Error('Clock entry not found or already completed')
    }

    const clockOutAt = new Date().toISOString()
    const totalMinutes = Math.max(
      0,
      Math.round(
        (new Date(clockOutAt).getTime() - new Date(existing.clock_in_at).getTime()) / 60000
      )
    )

    const { data, error } = await supabase
      .from('staff_clock_entries')
      .update({
        clock_out_at: clockOutAt,
        total_minutes: totalMinutes,
        status: 'completed',
      })
      .eq('id', existing.id)
      .eq('chef_id', staffUser.tenantId)
      .eq('staff_member_id', staffUser.staffMemberId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Clock out failed')
    }

    entry = {
      id: data.id,
      staffMemberId: data.staff_member_id,
      eventId: data.event_id,
      clockInAt: data.clock_in_at,
      clockOutAt: data.clock_out_at,
      totalMinutes: data.total_minutes,
      status: data.status,
    }
  }

  if (!entry) throw new Error('Clock out failed')
  revalidatePath('/staffing')
  revalidatePath('/staff/clock')
  revalidatePath('/staff-time')
  return entry
}

export async function getStaffPortalTimeTrackerData(
  startDate: string,
  endDate: string
): Promise<TimeTrackerData> {
  const user = await requireStaff()
  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const supabase = createServerClient({ admin: true })

  const [staffResult, eventsResult, entriesResult] = await Promise.all([
    supabase
      .from('staff_members')
      .select('id, name, hourly_rate_cents')
      .eq('id', user.staffMemberId)
      .eq('chef_id', user.tenantId)
      .limit(1),
    supabase
      .from('events')
      .select('id, occasion, event_date')
      .eq('tenant_id', user.tenantId)
      .gte('event_date', parsed.startDate)
      .lte('event_date', parsed.endDate)
      .order('event_date'),
    supabase
      .from('staff_clock_entries')
      .select(
        `
        id,
        staff_member_id,
        event_id,
        clock_in_at,
        clock_out_at,
        total_minutes,
        status,
        staff_members (id, name),
        events (id, occasion)
      `
      )
      .eq('chef_id', user.tenantId)
      .eq('staff_member_id', user.staffMemberId)
      .gte('clock_in_at', `${parsed.startDate}T00:00:00Z`)
      .lte('clock_in_at', `${parsed.endDate}T23:59:59Z`)
      .order('clock_in_at', { ascending: false }),
  ])

  if (staffResult.error)
    throw new Error(`Failed to load staff profile: ${staffResult.error.message}`)
  if (eventsResult.error) throw new Error(`Failed to load events: ${eventsResult.error.message}`)
  if (entriesResult.error) throw new Error(`Failed to load entries: ${entriesResult.error.message}`)

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    staff: (staffResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      hourlyRateCents: row.hourly_rate_cents ?? 0,
    })),
    events: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      name: event.occasion || 'Event',
      date: event.event_date,
    })),
    entries: (entriesResult.data ?? []).map((entry: any) => ({
      id: entry.id,
      staffMemberId: entry.staff_member_id,
      staffName: entry.staff_members?.name ?? 'Unknown',
      eventId: entry.event_id,
      eventName: entry.events?.occasion ?? null,
      clockInAt: entry.clock_in_at,
      clockOutAt: entry.clock_out_at,
      totalMinutes: entry.total_minutes,
      status: entry.status,
    })),
  }
}

export async function getPayrollReportForPeriod(
  startDate: string,
  endDate: string
): Promise<PayrollReportData> {
  const user = await requireChef()
  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      id,
      staff_member_id,
      clock_in_at,
      clock_out_at,
      total_minutes,
      staff_members (id, name, hourly_rate_cents)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('clock_in_at', `${parsed.startDate}T00:00:00Z`)
    .lte('clock_in_at', `${parsed.endDate}T23:59:59Z`)

  if (error) throw new Error(`Failed to load payroll data: ${error.message}`)

  const map = new Map<string, PayrollReportRow>()
  for (const row of data ?? []) {
    const staffMember = (row as any).staff_members
    const staffId = row.staff_member_id
    const minutes =
      row.total_minutes ??
      (row.clock_out_at
        ? Math.max(
            0,
            Math.round(
              (new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime()) / 60000
            )
          )
        : 0)

    const hourlyRateCents = staffMember?.hourly_rate_cents ?? 0
    const existing = map.get(staffId) ?? {
      staffMemberId: staffId,
      staffName: staffMember?.name ?? 'Unknown',
      totalHours: 0,
      totalMinutes: 0,
      hourlyRateCents,
      estimatedLaborCostCents: 0,
      entryCount: 0,
    }

    existing.totalMinutes += minutes
    existing.totalHours = Math.round((existing.totalMinutes / 60) * 100) / 100
    existing.hourlyRateCents = hourlyRateCents
    existing.estimatedLaborCostCents = Math.round((existing.totalMinutes / 60) * hourlyRateCents)
    existing.entryCount += 1
    map.set(staffId, existing)
  }

  const rows = Array.from(map.values()).sort(
    (a, b) => b.estimatedLaborCostCents - a.estimatedLaborCostCents
  )
  const totalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0)
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100
  const totalLaborCostCents = rows.reduce((sum, row) => sum + row.estimatedLaborCostCents, 0)

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    rows,
    totalHours,
    totalMinutes,
    totalLaborCostCents,
  }
}

export async function getDefaultStaffingWindow() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  const end = new Date(now)
  end.setDate(end.getDate() + 14)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

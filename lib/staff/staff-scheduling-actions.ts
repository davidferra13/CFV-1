// Staff Scheduling & Payroll - Server Actions
// Shift scheduling, availability tracking, and payroll summaries.
// All tenant-scoped via requireChef().

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const ShiftRoles = z.enum([
  'assistant',
  'sous_chef',
  'server',
  'bartender',
  'prep_cook',
  'cleanup',
  'other',
])

const ShiftStatuses = z.enum([
  'scheduled',
  'confirmed',
  'checked_in',
  'checked_out',
  'no_show',
  'cancelled',
])

const CreateShiftSchema = z.object({
  staff_member_id: z.string().uuid(),
  event_id: z.string().uuid().nullable().optional(),
  shift_date: z.string(), // ISO date string
  start_time: z.string(), // HH:MM
  end_time: z.string(), // HH:MM
  role: ShiftRoles.default('assistant'),
  hourly_rate_cents: z.number().int().min(0).nullable().optional(),
  notes: z.string().optional(),
})

const UpdateShiftSchema = CreateShiftSchema.partial()

const AvailabilityEntrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  specific_date: z.string().nullable().optional(), // ISO date
  is_available: z.boolean(),
  start_time: z.string().nullable().optional(), // HH:MM
  end_time: z.string().nullable().optional(), // HH:MM
  notes: z.string().optional(),
})

export type CreateShiftInput = z.infer<typeof CreateShiftSchema>
export type UpdateShiftInput = z.infer<typeof UpdateShiftSchema>
export type AvailabilityEntry = z.infer<typeof AvailabilityEntrySchema>

// ============================================
// SCHEDULE ACTIONS
// ============================================

/**
 * List staff schedules with optional filters.
 */
export async function getStaffSchedules(filters?: {
  dateFrom?: string
  dateTo?: string
  staffId?: string
  eventId?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  let query = (db as any)
    .from('staff_schedules')
    .select(
      `
      *,
      staff_members (id, name, role, hourly_rate_cents, phone),
      events (id, title)
    `
    )
    .eq('chef_id', tenantId)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (filters?.dateFrom) {
    query = query.gte('shift_date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('shift_date', filters.dateTo)
  }
  if (filters?.staffId) {
    query = query.eq('staff_member_id', filters.staffId)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getStaffSchedules] Error:', error)
    throw new Error('Failed to load staff schedules')
  }
  return data ?? []
}

/**
 * Create a new shift assignment.
 */
export async function createShift(input: CreateShiftInput) {
  const user = await requireChef()
  const validated = CreateShiftSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('staff_schedules')
    .insert({
      chef_id: user.tenantId!,
      staff_member_id: validated.staff_member_id,
      event_id: validated.event_id ?? null,
      shift_date: validated.shift_date,
      start_time: validated.start_time,
      end_time: validated.end_time,
      role: validated.role,
      hourly_rate_cents: validated.hourly_rate_cents ?? null,
      notes: validated.notes ?? null,
    })
    .select(
      `
      *,
      staff_members (id, name, role),
      events (id, title)
    `
    )
    .single()

  if (error) {
    console.error('[createShift] Error:', error)
    throw new Error('Failed to create shift')
  }

  revalidatePath('/staff/schedule')
  return data
}

/**
 * Update an existing shift.
 */
export async function updateShift(id: string, input: UpdateShiftInput) {
  const user = await requireChef()
  const validated = UpdateShiftSchema.parse(input)
  const db: any = createServerClient()

  // Build update payload, only include provided fields
  const updateData: Record<string, any> = {}
  if (validated.staff_member_id !== undefined)
    updateData.staff_member_id = validated.staff_member_id
  if (validated.event_id !== undefined) updateData.event_id = validated.event_id ?? null
  if (validated.shift_date !== undefined) updateData.shift_date = validated.shift_date
  if (validated.start_time !== undefined) updateData.start_time = validated.start_time
  if (validated.end_time !== undefined) updateData.end_time = validated.end_time
  if (validated.role !== undefined) updateData.role = validated.role
  if (validated.hourly_rate_cents !== undefined)
    updateData.hourly_rate_cents = validated.hourly_rate_cents ?? null
  if (validated.notes !== undefined) updateData.notes = validated.notes ?? null

  const { data, error } = await (db as any)
    .from('staff_schedules')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateShift] Error:', error)
    throw new Error('Failed to update shift')
  }

  revalidatePath('/staff/schedule')
  return data
}

/**
 * Delete a shift.
 */
export async function deleteShift(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await (db as any)
    .from('staff_schedules')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteShift] Error:', error)
    throw new Error('Failed to delete shift')
  }

  revalidatePath('/staff/schedule')
}

/**
 * Update shift status (check in, check out, mark no-show, cancel).
 * Automatically sets actual_start/actual_end timestamps.
 */
export async function updateShiftStatus(id: string, status: string) {
  const user = await requireChef()
  const parsedStatus = ShiftStatuses.parse(status)
  const db: any = createServerClient()

  const updateData: Record<string, any> = { status: parsedStatus }

  // Auto-set actual timestamps based on status
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (parsedStatus === 'checked_in') {
    updateData.actual_start = timeStr
  } else if (parsedStatus === 'checked_out') {
    updateData.actual_end = timeStr
  }

  const { data, error } = await (db as any)
    .from('staff_schedules')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateShiftStatus] Error:', error)
    throw new Error('Failed to update shift status')
  }

  revalidatePath('/staff/schedule')
  return data
}

// ============================================
// AVAILABILITY ACTIONS
// ============================================

/**
 * Get availability for a staff member.
 * Returns both recurring (day_of_week) and date-specific entries.
 */
export async function getStaffAvailability(
  staffId: string,
  dateRange?: {
    from?: string
    to?: string
  }
) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = (db as any)
    .from('staff_availability')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('staff_member_id', staffId)

  if (dateRange?.from) {
    // Get recurring entries (no specific_date) + date-specific in range
    query = query.or(
      `specific_date.is.null,and(specific_date.gte.${dateRange.from},specific_date.lte.${dateRange.to ?? dateRange.from})`
    )
  }

  const { data, error } = await query
  if (error) {
    console.error('[getStaffAvailability] Error:', error)
    throw new Error('Failed to load staff availability')
  }
  return data ?? []
}

/**
 * Set weekly availability for a staff member.
 * Replaces all recurring (day_of_week) entries for this staff member.
 */
export async function setStaffAvailability(staffId: string, entries: AvailabilityEntry[]) {
  const user = await requireChef()
  const validated = entries.map((e) => AvailabilityEntrySchema.parse(e))
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Delete existing recurring entries (day_of_week based)
  const recurringEntries = validated.filter((e) => e.day_of_week != null && !e.specific_date)
  if (recurringEntries.length > 0) {
    await (db as any)
      .from('staff_availability')
      .delete()
      .eq('chef_id', tenantId)
      .eq('staff_member_id', staffId)
      .is('specific_date', null)
  }

  // Delete existing date-specific entries that we're replacing
  const dateEntries = validated.filter((e) => e.specific_date)
  for (const entry of dateEntries) {
    await (db as any)
      .from('staff_availability')
      .delete()
      .eq('chef_id', tenantId)
      .eq('staff_member_id', staffId)
      .eq('specific_date', entry.specific_date)
  }

  // Insert all new entries
  if (validated.length > 0) {
    const rows = validated.map((e) => ({
      chef_id: tenantId,
      staff_member_id: staffId,
      day_of_week: e.day_of_week ?? null,
      specific_date: e.specific_date ?? null,
      is_available: e.is_available,
      start_time: e.start_time ?? null,
      end_time: e.end_time ?? null,
      notes: e.notes ?? null,
    }))

    const { error } = await (db as any).from('staff_availability').insert(rows)

    if (error) {
      console.error('[setStaffAvailability] Error:', error)
      throw new Error('Failed to save staff availability')
    }
  }

  revalidatePath('/staff/schedule')
}

// ============================================
// PAYROLL & STAFFING QUERIES
// ============================================

/**
 * Get payroll summary for a date range.
 * Computes total hours and earnings per staff member based on actual times.
 */
export async function getPayrollSummary(dateRange: { from: string; to: string }) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: schedules, error } = await (db as any)
    .from('staff_schedules')
    .select(
      `
      id, staff_member_id, shift_date, start_time, end_time,
      actual_start, actual_end, hourly_rate_cents, status, role,
      staff_members (id, name, role, hourly_rate_cents)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('shift_date', dateRange.from)
    .lte('shift_date', dateRange.to)
    .in('status', ['checked_out', 'confirmed', 'scheduled'])
    .order('shift_date')

  if (error) {
    console.error('[getPayrollSummary] Error:', error)
    throw new Error('Failed to load payroll data')
  }

  // Aggregate by staff member
  const staffMap = new Map<
    string,
    {
      staffId: string
      name: string
      role: string
      scheduledHours: number
      actualHours: number
      hourlyRateCents: number
      totalEarningsCents: number
      shiftCount: number
    }
  >()

  for (const shift of schedules ?? []) {
    const member = (shift as any).staff_members
    if (!member) continue

    const staffId = shift.staff_member_id
    const existing = staffMap.get(staffId) ?? {
      staffId,
      name: member.name,
      role: member.role,
      scheduledHours: 0,
      actualHours: 0,
      hourlyRateCents: shift.hourly_rate_cents ?? member.hourly_rate_cents ?? 0,
      totalEarningsCents: 0,
      shiftCount: 0,
    }

    // Calculate scheduled hours from start_time/end_time
    const scheduledH = timeToHours(shift.end_time) - timeToHours(shift.start_time)
    existing.scheduledHours += Math.max(0, scheduledH)

    // Calculate actual hours if checked out
    if (shift.actual_start && shift.actual_end) {
      const actualH = timeToHours(shift.actual_end) - timeToHours(shift.actual_start)
      existing.actualHours += Math.max(0, actualH)
    }

    const effectiveRate = shift.hourly_rate_cents ?? member.hourly_rate_cents ?? 0
    const hoursForPay =
      shift.actual_start && shift.actual_end
        ? Math.max(0, timeToHours(shift.actual_end) - timeToHours(shift.actual_start))
        : Math.max(0, scheduledH)

    existing.totalEarningsCents += Math.round(hoursForPay * effectiveRate)
    existing.shiftCount += 1
    staffMap.set(staffId, existing)
  }

  return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get all staff assigned to a specific event via schedules.
 */
export async function getEventStaffing(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('staff_schedules')
    .select(
      `
      *,
      staff_members (id, name, role, hourly_rate_cents, phone, email)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('start_time')

  if (error) {
    console.error('[getEventStaffing] Error:', error)
    throw new Error('Failed to load event staffing')
  }
  return data ?? []
}

// ============================================
// HELPERS
// ============================================

/** Convert "HH:MM" or "HH:MM:SS" time string to decimal hours. */
function timeToHours(timeStr: string): number {
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours + minutes / 60
}

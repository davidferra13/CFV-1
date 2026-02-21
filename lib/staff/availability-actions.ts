'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type StaffAvailability = {
  id: string
  staffMemberId: string
  chefId: string
  date: string
  isAvailable: boolean
  recurringRule: string | null
  notes: string | null
}

export type StaffAvailabilityGridRow = {
  staffMemberId: string
  staffName: string
  staffRole: string
  dates: Record<string, { isAvailable: boolean; notes: string | null }>
}

export type AvailableStaffMember = {
  id: string
  name: string
  role: string
  phone: string | null
  hourlyRateCents: number
  notes: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const SetAvailabilitySchema = z.object({
  staffMemberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  isAvailable: z.boolean(),
  notes: z.string().optional(),
})

const BulkSetAvailabilitySchema = z.object({
  staffMemberId: z.string().uuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')).min(1),
  isAvailable: z.boolean(),
})

const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Upsert a single availability record for a staff member on a date.
 * Uses UNIQUE(staff_member_id, date) for conflict resolution.
 */
export async function setAvailability(
  staffMemberId: string,
  date: string,
  isAvailable: boolean,
  notes?: string
): Promise<StaffAvailability> {
  const user = await requireChef()
  const parsed = SetAvailabilitySchema.parse({ staffMemberId, date, isAvailable, notes })
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('staff_availability')
    .upsert(
      {
        staff_member_id: parsed.staffMemberId,
        chef_id: user.tenantId!,
        date: parsed.date,
        is_available: parsed.isAvailable,
        notes: parsed.notes || null,
      },
      { onConflict: 'staff_member_id,date' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to set availability: ${error.message}`)

  revalidatePath('/staff')

  return {
    id: data.id,
    staffMemberId: data.staff_member_id,
    chefId: data.chef_id,
    date: data.date,
    isAvailable: data.is_available,
    recurringRule: data.recurring_rule,
    notes: data.notes,
  }
}

/**
 * Returns a grid of all active staff members with their availability
 * for each date in the given range. Dates without an explicit record
 * default to available (true).
 */
export async function getStaffAvailabilityGrid(
  startDate: string,
  endDate: string
): Promise<StaffAvailabilityGridRow[]> {
  const user = await requireChef()
  DateRangeSchema.parse({ startDate, endDate })
  const supabase = createServerClient()

  // Fetch all active staff members
  const { data: staffMembers, error: staffError } = await (supabase as any)
    .from('staff_members')
    .select('id, name, role')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('name')

  if (staffError) throw new Error(`Failed to load staff: ${staffError.message}`)

  // Fetch all availability records in the date range
  const { data: availRecords, error: availError } = await (supabase as any)
    .from('staff_availability')
    .select('staff_member_id, date, is_available, notes')
    .eq('chef_id', user.tenantId!)
    .gte('date', startDate)
    .lte('date', endDate)

  if (availError) throw new Error(`Failed to load availability: ${availError.message}`)

  // Build a lookup: staffMemberId -> date -> record
  const lookup: Record<string, Record<string, { isAvailable: boolean; notes: string | null }>> = {}
  for (const row of (availRecords || [])) {
    if (!lookup[row.staff_member_id]) lookup[row.staff_member_id] = {}
    lookup[row.staff_member_id][row.date] = {
      isAvailable: row.is_available,
      notes: row.notes,
    }
  }

  return (staffMembers || []).map((staff: any) => ({
    staffMemberId: staff.id,
    staffName: staff.name,
    staffRole: staff.role,
    dates: lookup[staff.id] || {},
  }))
}

/**
 * Returns only staff members who are available on a specific date.
 * Staff with no availability record for the date are assumed available.
 */
export async function getAvailableStaffForDate(
  date: string
): Promise<AvailableStaffMember[]> {
  const user = await requireChef()
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date)
  const supabase = createServerClient()

  // Get all active staff
  const { data: allStaff, error: staffError } = await (supabase as any)
    .from('staff_members')
    .select('id, name, role, phone, hourly_rate_cents, notes')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('name')

  if (staffError) throw new Error(`Failed to load staff: ${staffError.message}`)

  // Get unavailability records for this date
  const { data: unavailRecords, error: availError } = await (supabase as any)
    .from('staff_availability')
    .select('staff_member_id')
    .eq('chef_id', user.tenantId!)
    .eq('date', date)
    .eq('is_available', false)

  if (availError) throw new Error(`Failed to load availability: ${availError.message}`)

  const unavailableIds = new Set(
    (unavailRecords || []).map((r: any) => r.staff_member_id)
  )

  return (allStaff || [])
    .filter((s: any) => !unavailableIds.has(s.id))
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      phone: s.phone,
      hourlyRateCents: s.hourly_rate_cents,
      notes: s.notes,
    }))
}

/**
 * Bulk set availability for a staff member across multiple dates.
 * Each date is upserted individually using the UNIQUE(staff_member_id, date) constraint.
 */
export async function bulkSetAvailability(
  staffMemberId: string,
  dates: string[],
  isAvailable: boolean
): Promise<{ updated: number }> {
  const user = await requireChef()
  const parsed = BulkSetAvailabilitySchema.parse({ staffMemberId, dates, isAvailable })
  const supabase = createServerClient()

  const rows = parsed.dates.map((date) => ({
    staff_member_id: parsed.staffMemberId,
    chef_id: user.tenantId!,
    date,
    is_available: parsed.isAvailable,
  }))

  const { data, error } = await (supabase as any)
    .from('staff_availability')
    .upsert(rows, { onConflict: 'staff_member_id,date' })
    .select()

  if (error) throw new Error(`Failed to bulk set availability: ${error.message}`)

  revalidatePath('/staff')

  return { updated: (data || []).length }
}

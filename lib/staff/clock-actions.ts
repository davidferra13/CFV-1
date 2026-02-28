'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type ClockEntry = {
  id: string
  staffMemberId: string
  eventId: string | null
  clockInAt: string
  clockOutAt: string | null
  gpsLat: number | null
  gpsLng: number | null
  totalMinutes: number | null
  status: 'clocked_in' | 'completed'
}

export type ClockEntryWithStaff = ClockEntry & {
  staffName: string
  staffRole: string
}

export type EventClockSummary = {
  eventId: string
  totalMinutes: number
  totalHours: number
  totalLaborCostCents: number
  entries: {
    staffMemberId: string
    staffName: string
    staffRole: string
    clockInAt: string
    clockOutAt: string | null
    totalMinutes: number | null
    hourlyRateCents: number
    costCents: number
  }[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const ClockInSchema = z.object({
  staffMemberId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
})

const ClockOutSchema = z.object({
  entryId: z.string().uuid(),
})

const ClockFiltersSchema = z
  .object({
    staffMemberId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .optional()

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Clock in a staff member. Creates a new clock entry with clock_in_at = now().
 * Optionally associates with an event and records GPS coordinates.
 */
export async function clockIn(
  staffMemberId: string,
  eventId?: string,
  gpsLat?: number,
  gpsLng?: number
): Promise<ClockEntry> {
  const user = await requireChef()
  const parsed = ClockInSchema.parse({ staffMemberId, eventId, gpsLat, gpsLng })
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .insert({
      staff_member_id: parsed.staffMemberId,
      chef_id: user.tenantId!,
      event_id: parsed.eventId || null,
      clock_in_at: new Date().toISOString(),
      gps_lat: parsed.gpsLat ?? null,
      gps_lng: parsed.gpsLng ?? null,
      status: 'clocked_in',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to clock in: ${error.message}`)

  revalidatePath('/staff')
  if (parsed.eventId) revalidatePath(`/events/${parsed.eventId}`)

  return {
    id: data.id,
    staffMemberId: data.staff_member_id,
    eventId: data.event_id,
    clockInAt: data.clock_in_at,
    clockOutAt: data.clock_out_at,
    gpsLat: data.gps_lat,
    gpsLng: data.gps_lng,
    totalMinutes: data.total_minutes,
    status: data.status,
  }
}

/**
 * Clock out a staff member. Updates clock_out_at = now(), computes total_minutes,
 * and sets status to 'completed'.
 */
export async function clockOut(entryId: string): Promise<ClockEntry> {
  const user = await requireChef()
  ClockOutSchema.parse({ entryId })
  const supabase: any = createServerClient()

  // Fetch the existing entry to compute duration
  const { data: existing, error: fetchError } = await supabase
    .from('staff_clock_entries')
    .select('*')
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .eq('status', 'clocked_in')
    .single()

  if (fetchError || !existing) throw new Error('Clock entry not found or already completed')

  const clockOutAt = new Date()
  const clockInAt = new Date(existing.clock_in_at)
  const totalMinutes = Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000)

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .update({
      clock_out_at: clockOutAt.toISOString(),
      total_minutes: totalMinutes,
      status: 'completed',
    })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to clock out: ${error.message}`)

  revalidatePath('/staff')
  if (data.event_id) revalidatePath(`/events/${data.event_id}`)

  return {
    id: data.id,
    staffMemberId: data.staff_member_id,
    eventId: data.event_id,
    clockInAt: data.clock_in_at,
    clockOutAt: data.clock_out_at,
    gpsLat: data.gps_lat,
    gpsLng: data.gps_lng,
    totalMinutes: data.total_minutes,
    status: data.status,
  }
}

/**
 * List clock entries with optional filters for staff member, event, and date range.
 */
export async function getClockEntries(filters?: {
  staffMemberId?: string
  eventId?: string
  startDate?: string
  endDate?: string
}): Promise<ClockEntryWithStaff[]> {
  const user = await requireChef()
  ClockFiltersSchema.parse(filters)
  const supabase: any = createServerClient()

  let query = supabase
    .from('staff_clock_entries')
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('clock_in_at', { ascending: false })
    .limit(500)

  if (filters?.staffMemberId) query = query.eq('staff_member_id', filters.staffMemberId)
  if (filters?.eventId) query = query.eq('event_id', filters.eventId)
  if (filters?.startDate) query = query.gte('clock_in_at', `${filters.startDate}T00:00:00Z`)
  if (filters?.endDate) query = query.lte('clock_in_at', `${filters.endDate}T23:59:59Z`)

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch clock entries: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    staffMemberId: row.staff_member_id,
    eventId: row.event_id,
    clockInAt: row.clock_in_at,
    clockOutAt: row.clock_out_at,
    gpsLat: row.gps_lat,
    gpsLng: row.gps_lng,
    totalMinutes: row.total_minutes,
    status: row.status,
    staffName: row.staff_members?.name ?? 'Unknown',
    staffRole: row.staff_members?.role ?? 'other',
  }))
}

/**
 * Get a summary of all clock entries for a specific event, including
 * total hours worked and estimated labor cost based on staff hourly rates.
 */
export async function getEventClockSummary(eventId: string): Promise<EventClockSummary> {
  const user = await requireChef()
  z.string().uuid().parse(eventId)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_clock_entries')
    .select(
      `
      *,
      staff_members (id, name, role, hourly_rate_cents)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('clock_in_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch event clock summary: ${error.message}`)

  const rows = data || []
  let totalMinutes = 0
  let totalLaborCostCents = 0

  const entries = rows.map((row: any) => {
    const mins = row.total_minutes ?? 0
    const hourlyRate = row.staff_members?.hourly_rate_cents ?? 0
    const costCents = Math.round((mins / 60) * hourlyRate)
    totalMinutes += mins
    totalLaborCostCents += costCents

    return {
      staffMemberId: row.staff_member_id,
      staffName: row.staff_members?.name ?? 'Unknown',
      staffRole: row.staff_members?.role ?? 'other',
      clockInAt: row.clock_in_at,
      clockOutAt: row.clock_out_at,
      totalMinutes: row.total_minutes,
      hourlyRateCents: hourlyRate,
      costCents,
    }
  })

  return {
    eventId,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    totalLaborCostCents,
    entries,
  }
}

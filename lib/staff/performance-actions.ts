'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type StaffPerformanceScore = {
  id: string
  staffMemberId: string
  staffName: string
  staffRole: string
  onTimeRate: number
  cancellationCount: number
  avgRating: number
  totalEvents: number
  lastComputedAt: string
}

export type StaffReliabilityInfo = {
  staffMemberId: string
  staffName: string
  staffRole: string
  onTimeRate: number
  cancellationCount: number
  avgRating: number
  totalEvents: number
  assignmentStatus: string
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Compute performance score for a single staff member from their
 * event_staff_assignments history. Upserts into staff_performance_scores
 * using the UNIQUE(staff_member_id, chef_id) constraint.
 *
 * Metrics computed:
 * - on_time_rate: percentage of completed assignments (vs total)
 * - cancellation_count: number of 'cancelled' assignments
 * - avg_rating: average of rating field on completed assignments (or 0)
 * - total_events: count of all assignments
 */
export async function computePerformanceScore(
  staffMemberId: string
): Promise<StaffPerformanceScore> {
  const user = await requireChef()
  z.string().uuid().parse(staffMemberId)
  const supabase: any = createServerClient()

  // Fetch all assignments for this staff member
  const { data: assignments, error: assignError } = await supabase
    .from('event_staff_assignments')
    .select('id, status, rating')
    .eq('staff_member_id', staffMemberId)
    .eq('chef_id', user.tenantId!)

  if (assignError) throw new Error(`Failed to load assignments: ${assignError.message}`)

  const rows = assignments || []
  const totalEvents = rows.length
  const completedRows = rows.filter((r: any) => r.status === 'completed')
  const cancelledRows = rows.filter((r: any) => r.status === 'cancelled')

  // On-time rate: completed / total (as percentage 0-100)
  const onTimeRate =
    totalEvents > 0 ? Math.round((completedRows.length / totalEvents) * 10000) / 100 : 0

  // Cancellation count
  const cancellationCount = cancelledRows.length

  // Average rating from completed assignments that have a rating
  const ratedRows = completedRows.filter((r: any) => r.rating != null && r.rating > 0)
  const avgRating =
    ratedRows.length > 0
      ? Math.round(
          (ratedRows.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
            ratedRows.length) *
            100
        ) / 100
      : 0

  // Fetch staff member name/role for the return value
  const { data: staffMember, error: staffError } = await supabase
    .from('staff_members')
    .select('name, role')
    .eq('id', staffMemberId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (staffError) throw new Error(`Staff member not found: ${staffError.message}`)

  const now = new Date().toISOString()

  // Upsert into performance_scores
  const { data, error } = await supabase
    .from('staff_performance_scores')
    .upsert(
      {
        staff_member_id: staffMemberId,
        chef_id: user.tenantId!,
        on_time_rate: onTimeRate,
        cancellation_count: cancellationCount,
        avg_rating: avgRating,
        total_events: totalEvents,
        last_computed_at: now,
      },
      { onConflict: 'staff_member_id,chef_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save performance score: ${error.message}`)

  revalidatePath('/staff')

  return {
    id: data.id,
    staffMemberId: data.staff_member_id,
    staffName: staffMember.name,
    staffRole: staffMember.role,
    onTimeRate: data.on_time_rate,
    cancellationCount: data.cancellation_count,
    avgRating: data.avg_rating,
    totalEvents: data.total_events,
    lastComputedAt: data.last_computed_at,
  }
}

/**
 * Get the performance board for all staff members, sorted by total_events desc.
 * Joins with staff_members for name/role display.
 */
export async function getStaffPerformanceBoard(): Promise<StaffPerformanceScore[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_performance_scores')
    .select(
      `
      *,
      staff_members (id, name, role)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('total_events', { ascending: false })

  if (error) throw new Error(`Failed to fetch performance board: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName: row.staff_members?.name ?? 'Unknown',
    staffRole: row.staff_members?.role ?? 'other',
    onTimeRate: row.on_time_rate,
    cancellationCount: row.cancellation_count,
    avgRating: row.avg_rating,
    totalEvents: row.total_events,
    lastComputedAt: row.last_computed_at,
  }))
}

/**
 * Get reliability info for each staff member assigned to a specific event.
 * Combines the assignment data with their performance scores.
 */
export async function getStaffReliabilityForEvent(
  eventId: string
): Promise<StaffReliabilityInfo[]> {
  const user = await requireChef()
  z.string().uuid().parse(eventId)
  const supabase: any = createServerClient()

  // Get staff assigned to this event
  const { data: assignments, error: assignError } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      staff_member_id,
      status,
      staff_members (id, name, role)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (assignError) throw new Error(`Failed to load event assignments: ${assignError.message}`)

  if (!assignments || assignments.length === 0) return []

  // Get performance scores for these staff members
  const staffIds = assignments.map((a: any) => a.staff_member_id)

  const { data: scores, error: scoresError } = await supabase
    .from('staff_performance_scores')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .in('staff_member_id', staffIds)

  if (scoresError) throw new Error(`Failed to load performance scores: ${scoresError.message}`)

  // Build a lookup by staff_member_id
  const scoreLookup: Record<string, any> = {}
  for (const score of scores || []) {
    scoreLookup[score.staff_member_id] = score
  }

  return assignments.map((a: any) => {
    const score = scoreLookup[a.staff_member_id]
    return {
      staffMemberId: a.staff_member_id,
      staffName: a.staff_members?.name ?? 'Unknown',
      staffRole: a.staff_members?.role ?? 'other',
      onTimeRate: score?.on_time_rate ?? 0,
      cancellationCount: score?.cancellation_count ?? 0,
      avgRating: score?.avg_rating ?? 0,
      totalEvents: score?.total_events ?? 0,
      assignmentStatus: a.status,
    }
  })
}

'use server'

// Station-to-Staff Assignment
// Assigns staff members to specific kitchen stations for an event.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type StationAssignment = {
  id: string
  event_id: string
  chef_id: string
  station_id: string
  staff_member_id: string
  role_notes: string | null
  created_at: string
  station?: { id: string; name: string; description: string | null }
  staff_member?: { id: string; name: string; role: string }
}

export type StationWithStaff = {
  id: string
  name: string
  description: string | null
  staff: Array<{
    assignment_id: string
    staff_member_id: string
    name: string
    role: string
    role_notes: string | null
  }>
}

// ─── Actions ─────────────────────────────────────────────────────

export async function assignStaffToStation(
  eventId: string,
  stationId: string,
  staffMemberId: string,
  roleNotes?: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_station_assignments')
    .upsert(
      {
        event_id: eventId,
        chef_id: user.tenantId!,
        station_id: stationId,
        staff_member_id: staffMemberId,
        role_notes: roleNotes || null,
      },
      { onConflict: 'event_id,station_id,staff_member_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to assign staff to station: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  return data
}

export async function removeStaffFromStation(
  eventId: string,
  stationId: string,
  staffMemberId: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_station_assignments')
    .delete()
    .eq('event_id', eventId)
    .eq('station_id', stationId)
    .eq('staff_member_id', staffMemberId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to remove staff from station: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
}

export async function getEventStationAssignments(eventId: string): Promise<StationWithStaff[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all stations for this chef
  const { data: stations, error: stationError } = await supabase
    .from('stations')
    .select('id, name, description')
    .eq('chef_id', user.tenantId!)
    .order('display_order')

  if (stationError) throw new Error(`Failed to load stations: ${stationError.message}`)

  if (!stations || stations.length === 0) return []

  // Get all assignments for this event
  const { data: assignments, error: assignError } = await supabase
    .from('event_station_assignments')
    .select(
      `
      id,
      station_id,
      staff_member_id,
      role_notes,
      staff_members (id, name, role)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (assignError) throw new Error(`Failed to load assignments: ${assignError.message}`)

  // Build station-to-staff map
  const assignmentsByStation = new Map<string, StationWithStaff['staff']>()
  for (const a of assignments ?? []) {
    const staff = (a as any).staff_members
    if (!staff) continue
    const existing = assignmentsByStation.get(a.station_id) ?? []
    existing.push({
      assignment_id: a.id,
      staff_member_id: a.staff_member_id,
      name: staff.name,
      role: staff.role,
      role_notes: a.role_notes,
    })
    assignmentsByStation.set(a.station_id, existing)
  }

  return (stations as any[]).map((station) => ({
    id: station.id,
    name: station.name,
    description: station.description,
    staff: assignmentsByStation.get(station.id) ?? [],
  }))
}

export async function getStationAssignmentSummary(
  eventId: string
): Promise<Array<{ stationName: string; staffCount: number; staffNames: string[] }>> {
  const stationsWithStaff = await getEventStationAssignments(eventId)

  return stationsWithStaff
    .filter((s) => s.staff.length > 0)
    .map((s) => ({
      stationName: s.name,
      staffCount: s.staff.length,
      staffNames: s.staff.map((st) => st.name),
    }))
}

export async function getUnassignedStaff(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get staff assigned to this event
  const { data: eventRoster } = await supabase
    .from('event_staff_assignments')
    .select('staff_member_id, staff_members (id, name, role)')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (!eventRoster || eventRoster.length === 0) return []

  // Get staff already assigned to stations for this event
  const { data: stationAssigned } = await supabase
    .from('event_station_assignments')
    .select('staff_member_id')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  const assignedToStationIds = new Set((stationAssigned ?? []).map((a: any) => a.staff_member_id))

  // Return event staff not yet assigned to any station
  return (eventRoster as any[])
    .filter((r) => !assignedToStationIds.has(r.staff_member_id))
    .map((r) => ({
      id: r.staff_members?.id ?? r.staff_member_id,
      name: r.staff_members?.name ?? 'Unknown',
      role: r.staff_members?.role ?? 'other',
    }))
}

export async function autoAssignStaffToStations(eventId: string) {
  const user = await requireChef()

  // Get unassigned staff and stations
  const unassigned = await getUnassignedStaff(eventId)
  const stationsWithStaff = await getEventStationAssignments(eventId)

  if (unassigned.length === 0 || stationsWithStaff.length === 0) {
    return { assigned: 0 }
  }

  // Round-robin assignment
  let stationIndex = 0
  let assigned = 0

  for (const staff of unassigned) {
    const station = stationsWithStaff[stationIndex % stationsWithStaff.length]
    await assignStaffToStation(eventId, station.id, staff.id)
    assigned++
    stationIndex++
  }

  return { assigned }
}

export async function clearAllStationAssignments(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_station_assignments')
    .delete()
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to clear assignments: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
}

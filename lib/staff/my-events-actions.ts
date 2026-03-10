'use server'

// Staff Portal - My Events Actions
// Lets staff members see their upcoming and past event assignments
// with BEO data, timeline, team info, and tasks.

import { requireStaff } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export type StaffEventSummary = {
  id: string
  event_id: string
  event_title: string
  event_date: string
  event_status: string
  occasion: string | null
  location_address: string | null
  guest_count: number | null
  start_time: string | null
  end_time: string | null
  serve_time: string | null
  role: string
  scheduled_hours: number | null
  station_name: string | null
  assignment_status: string
}

export type StaffEventDetail = {
  // Assignment info
  assignment_id: string
  role: string
  scheduled_hours: number | null
  actual_hours: number | null
  station_name: string | null
  assignment_status: string
  assignment_notes: string | null

  // Event info
  event_id: string
  event_title: string
  event_date: string
  event_status: string
  occasion: string | null
  location_address: string | null
  location_city: string | null
  guest_count: number | null
  start_time: string | null
  end_time: string | null
  serve_time: string | null
  special_requests: string | null
  kitchen_notes: string | null

  // Client dietary info (no PII for staff)
  dietary_restrictions: string[] | null
  allergies: string[] | null

  // Team members on this event
  team: { name: string; role: string }[]

  // BEO data (kitchen-only, no financials)
  beo: {
    menuName: string | null
    courses: { name: string; dishes: { name: string; dietaryTags: string[] }[] }[]
    simpleMenuContent: string | null
    isSimpleMenu: boolean
  } | null

  // Timeline milestones
  timeline: {
    prep_started_at: string | null
    service_started_at: string | null
    service_completed_at: string | null
  }

  // Tasks assigned to this staff member for this event
  tasks: {
    id: string
    title: string
    status: string
    priority: string
    due_time: string | null
  }[]
}

export type StaffEventHistory = {
  event_id: string
  event_title: string
  event_date: string
  occasion: string | null
  role: string
  scheduled_hours: number | null
  actual_hours: number | null
  assignment_status: string
}

// ============================================
// GET MY UPCOMING EVENTS
// ============================================

export async function getMyUpcomingEvents(): Promise<StaffEventSummary[]> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      id,
      event_id,
      role_override,
      scheduled_hours,
      status,
      notes,
      staff_member:staff_members!event_staff_assignments_staff_member_id_fkey (
        role
      ),
      event:events!event_staff_assignments_event_id_fkey (
        id, title, date, status, occasion, location_address,
        guest_count, start_time, end_time, serve_time
      )
    `
    )
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .in('status', ['scheduled', 'confirmed'])

  if (error) {
    console.error('[getMyUpcomingEvents] Error:', error)
    return []
  }

  const assignments = (data ?? []) as any[]

  // Filter to future events and map to summary shape
  return assignments
    .filter((a) => {
      const eventDate = a.event?.date
      return eventDate && eventDate >= today
    })
    .map((a) => ({
      id: a.id,
      event_id: a.event_id,
      event_title: a.event?.title ?? 'Unnamed Event',
      event_date: a.event?.date ?? '',
      event_status: a.event?.status ?? '',
      occasion: a.event?.occasion ?? null,
      location_address: a.event?.location_address ?? null,
      guest_count: a.event?.guest_count ?? null,
      start_time: a.event?.start_time ?? null,
      end_time: a.event?.end_time ?? null,
      serve_time: a.event?.serve_time ?? null,
      role: a.role_override ?? a.staff_member?.role ?? 'Staff',
      scheduled_hours: a.scheduled_hours,
      station_name: null, // Will be populated separately if needed
      assignment_status: a.status,
    }))
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
}

// ============================================
// GET MY EVENT DETAIL
// ============================================

export async function getMyEventDetail(eventId: string): Promise<StaffEventDetail | null> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  // Get assignment + event in one query
  const { data: assignment, error: assignError } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      id,
      event_id,
      role_override,
      scheduled_hours,
      actual_hours,
      status,
      notes,
      staff_member:staff_members!event_staff_assignments_staff_member_id_fkey (
        role
      ),
      event:events!event_staff_assignments_event_id_fkey (
        id, title, date, status, occasion,
        location_address, location_city,
        guest_count, start_time, end_time, serve_time,
        special_requests, kitchen_notes,
        dietary_restrictions, allergies,
        prep_started_at, service_started_at, service_completed_at,
        menu_id
      )
    `
    )
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .eq('event_id', eventId)
    .single()

  if (assignError || !assignment) {
    console.error('[getMyEventDetail] Assignment not found:', assignError)
    return null
  }

  const event = assignment.event as any

  // Fetch team members on this event (other staff)
  const { data: teamAssignments } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      role_override,
      staff_member:staff_members!event_staff_assignments_staff_member_id_fkey (
        name, role
      )
    `
    )
    .eq('chef_id', user.tenantId)
    .eq('event_id', eventId)
    .in('status', ['scheduled', 'confirmed', 'completed'])

  const team = ((teamAssignments ?? []) as any[]).map((ta) => ({
    name: ta.staff_member?.name ?? 'Unknown',
    role: ta.role_override ?? ta.staff_member?.role ?? 'Staff',
  }))

  // Fetch BEO-like menu data (kitchen only, no financials)
  let beo: StaffEventDetail['beo'] = null
  if (event.menu_id) {
    const { data: menu } = await supabase
      .from('menus')
      .select('id, name, simple_mode, simple_mode_content')
      .eq('id', event.menu_id)
      .single()

    if (menu) {
      if (menu.simple_mode) {
        beo = {
          menuName: menu.name,
          courses: [],
          simpleMenuContent: menu.simple_mode_content,
          isSimpleMenu: true,
        }
      } else {
        const { data: dishes } = await supabase
          .from('dishes')
          .select('name, course_name, course_number, dietary_tags')
          .eq('menu_id', menu.id)
          .order('course_number', { ascending: true })
          .order('sort_order', { ascending: true })

        // Group dishes by course
        const courseMap = new Map<
          string,
          { name: string; dishes: { name: string; dietaryTags: string[] }[] }
        >()
        for (const dish of dishes ?? []) {
          const courseName = dish.course_name || `Course ${dish.course_number}`
          if (!courseMap.has(courseName)) {
            courseMap.set(courseName, { name: courseName, dishes: [] })
          }
          courseMap.get(courseName)!.dishes.push({
            name: dish.name || 'Unnamed dish',
            dietaryTags: dish.dietary_tags ?? [],
          })
        }

        beo = {
          menuName: menu.name,
          courses: Array.from(courseMap.values()),
          simpleMenuContent: null,
          isSimpleMenu: false,
        }
      }
    }
  }

  // Fetch tasks assigned to this staff member for this event's date
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_time')
    .eq('chef_id', user.tenantId)
    .eq('assigned_to', user.staffMemberId)
    .eq('due_date', event.date)
    .order('due_time', { ascending: true, nullsFirst: false })

  // Check for station assignment
  let stationName: string | null = null
  try {
    const { data: stationAssign } = await supabase
      .from('event_station_assignments')
      .select('station:stations(name)')
      .eq('event_id', eventId)
      .eq('staff_member_id', user.staffMemberId)
      .eq('chef_id', user.tenantId)
      .limit(1)
      .single()
    stationName = (stationAssign?.station as any)?.name ?? null
  } catch {
    // Station assignment table may not exist or no assignment
  }

  return {
    assignment_id: assignment.id,
    role: assignment.role_override ?? (assignment.staff_member as any)?.role ?? 'Staff',
    scheduled_hours: assignment.scheduled_hours,
    actual_hours: assignment.actual_hours,
    station_name: stationName,
    assignment_status: assignment.status,
    assignment_notes: assignment.notes,

    event_id: event.id,
    event_title: event.title ?? 'Unnamed Event',
    event_date: event.date,
    event_status: event.status,
    occasion: event.occasion,
    location_address: event.location_address,
    location_city: event.location_city,
    guest_count: event.guest_count,
    start_time: event.start_time,
    end_time: event.end_time,
    serve_time: event.serve_time,
    special_requests: event.special_requests,
    kitchen_notes: event.kitchen_notes,
    dietary_restrictions: event.dietary_restrictions,
    allergies: event.allergies,

    team,
    beo,

    timeline: {
      prep_started_at: event.prep_started_at ?? null,
      service_started_at: event.service_started_at ?? null,
      service_completed_at: event.service_completed_at ?? null,
    },

    tasks: ((tasks ?? []) as any[]).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_time: t.due_time,
    })),
  }
}

// ============================================
// GET MY EVENT HISTORY
// ============================================

export async function getMyEventHistory(): Promise<StaffEventHistory[]> {
  const user = await requireStaff()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      event_id,
      role_override,
      scheduled_hours,
      actual_hours,
      status,
      staff_member:staff_members!event_staff_assignments_staff_member_id_fkey (
        role
      ),
      event:events!event_staff_assignments_event_id_fkey (
        id, title, date, occasion, status
      )
    `
    )
    .eq('chef_id', user.tenantId)
    .eq('staff_member_id', user.staffMemberId)
    .in('status', ['completed', 'no_show'])

  if (error) {
    console.error('[getMyEventHistory] Error:', error)
    return []
  }

  return ((data ?? []) as any[])
    .map((a) => ({
      event_id: a.event_id,
      event_title: a.event?.title ?? 'Unnamed Event',
      event_date: a.event?.date ?? '',
      occasion: a.event?.occasion ?? null,
      role: a.role_override ?? a.staff_member?.role ?? 'Staff',
      scheduled_hours: a.scheduled_hours,
      actual_hours: a.actual_hours,
      assignment_status: a.status,
    }))
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
}

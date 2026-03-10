'use server'

// Caterer Dashboard Actions - aggregation queries for caterer/restaurant archetype.
// All deterministic (Formula > AI). Designed for the "This Week" overview.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { calculateStaffing } from '@/lib/events/service-style-templates'
import { SERVICE_STYLE_TEMPLATES } from '@/lib/events/service-style-templates'

// ============================================
// TYPES
// ============================================

export type CatererWeekEvent = {
  id: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  guest_count: number
  status: string
  service_style: string | null
  location_city: string | null
  location_state: string | null
  client_name: string | null
  staff_count: number
  quoted_price_cents: number | null
}

export type CatererWeekAtAGlance = {
  events: CatererWeekEvent[]
  totalRevenueCents: number
  totalLaborEstimateCents: number
  totalGuests: number
  eventCount: number
}

export type StaffAvailabilityMember = {
  id: string
  name: string
  role: string | null
  assignmentCount: number
  isDoubleBooked: boolean
  assignedEventIds: string[]
}

export type WeeklyLaborSummary = {
  totalScheduledHours: number
  estimatedLaborCostCents: number
  byRole: { role: string; hours: number; count: number }[]
}

// ============================================
// 1. Week at a Glance
// ============================================

export async function getCatererWeekAtAGlance(): Promise<CatererWeekAtAGlance> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd = sunday.toISOString().slice(0, 10)

  // Get events this week
  const { data: events, error } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, guest_count, status, service_style, location_city, location_state, quoted_price_cents, client:clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[getCatererWeekAtAGlance] Error:', error)
    return {
      events: [],
      totalRevenueCents: 0,
      totalLaborEstimateCents: 0,
      totalGuests: 0,
      eventCount: 0,
    }
  }

  const safeEvents = events ?? []

  // Get staff assignment counts per event
  let staffCounts: Record<string, number> = {}
  if (safeEvents.length > 0) {
    const eventIds = safeEvents.map((e: any) => e.id)
    const { data: staffAssignments } = await supabase
      .from('event_staff')
      .select('event_id')
      .in('event_id', eventIds)

    if (staffAssignments) {
      for (const assignment of staffAssignments) {
        staffCounts[assignment.event_id] = (staffCounts[assignment.event_id] || 0) + 1
      }
    }
  }

  const mappedEvents: CatererWeekEvent[] = safeEvents.map((e: any) => ({
    id: e.id,
    occasion: e.occasion,
    event_date: e.event_date,
    serve_time: e.serve_time,
    guest_count: e.guest_count,
    status: e.status,
    service_style: e.service_style,
    location_city: e.location_city,
    location_state: e.location_state,
    client_name: e.client?.full_name ?? null,
    staff_count: staffCounts[e.id] || 0,
    quoted_price_cents: e.quoted_price_cents,
  }))

  const totalRevenueCents = mappedEvents.reduce((sum, e) => sum + (e.quoted_price_cents ?? 0), 0)
  const totalGuests = mappedEvents.reduce((sum, e) => sum + e.guest_count, 0)

  // Estimate labor cost: $25/hr average, 6 hours per event per staff member
  const HOURLY_RATE_CENTS = 2500
  const AVG_HOURS_PER_EVENT = 6
  const totalStaffAssignments = Object.values(staffCounts).reduce((sum, c) => sum + c, 0)
  const totalLaborEstimateCents = totalStaffAssignments * HOURLY_RATE_CENTS * AVG_HOURS_PER_EVENT

  return {
    events: mappedEvents,
    totalRevenueCents,
    totalLaborEstimateCents,
    totalGuests,
    eventCount: mappedEvents.length,
  }
}

// ============================================
// 2. Staff Availability Overview
// ============================================

export async function getStaffAvailabilityOverview(): Promise<StaffAvailabilityMember[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd = sunday.toISOString().slice(0, 10)

  // Get all staff members for this chef
  const { data: staffMembers, error: staffError } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('chef_id', user.tenantId!)

  if (staffError || !staffMembers || staffMembers.length === 0) {
    return []
  }

  // Get this week's events
  const { data: weekEvents } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .not('status', 'eq', 'cancelled')

  if (!weekEvents || weekEvents.length === 0) {
    return staffMembers.map((s: any) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      assignmentCount: 0,
      isDoubleBooked: false,
      assignedEventIds: [],
    }))
  }

  const eventIds = weekEvents.map((e: any) => e.id)
  const eventDateMap: Record<string, string> = {}
  for (const e of weekEvents) {
    eventDateMap[e.id] = e.event_date
  }

  // Get staff assignments for this week's events
  const { data: assignments } = await supabase
    .from('event_staff')
    .select('staff_member_id, event_id')
    .in('event_id', eventIds)

  const staffAssignments: Record<string, string[]> = {}
  if (assignments) {
    for (const a of assignments) {
      if (!staffAssignments[a.staff_member_id]) {
        staffAssignments[a.staff_member_id] = []
      }
      staffAssignments[a.staff_member_id].push(a.event_id)
    }
  }

  // Check for double-booking (same staff on same date)
  return staffMembers.map((s: any) => {
    const assignedEvents = staffAssignments[s.id] || []
    const dateSet = new Set<string>()
    let isDoubleBooked = false
    for (const eventId of assignedEvents) {
      const date = eventDateMap[eventId]
      if (date && dateSet.has(date)) {
        isDoubleBooked = true
      }
      if (date) dateSet.add(date)
    }

    return {
      id: s.id,
      name: s.name,
      role: s.role,
      assignmentCount: assignedEvents.length,
      isDoubleBooked,
      assignedEventIds: assignedEvents,
    }
  })
}

// ============================================
// 3. Weekly Labor Summary
// ============================================

export async function getWeeklyLaborSummary(): Promise<WeeklyLaborSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd = sunday.toISOString().slice(0, 10)

  // Get this week's events
  const { data: weekEvents } = await supabase
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .not('status', 'eq', 'cancelled')

  if (!weekEvents || weekEvents.length === 0) {
    return { totalScheduledHours: 0, estimatedLaborCostCents: 0, byRole: [] }
  }

  const eventIds = weekEvents.map((e: any) => e.id)

  // Get all staff assignments for these events with staff details
  const { data: assignments } = await supabase
    .from('event_staff')
    .select(
      'staff_member_id, scheduled_hours, role_override, staff_member:staff_members(name, role)'
    )
    .in('event_id', eventIds)

  if (!assignments || assignments.length === 0) {
    return { totalScheduledHours: 0, estimatedLaborCostCents: 0, byRole: [] }
  }

  const AVG_HOURS_PER_EVENT = 6
  const HOURLY_RATE_CENTS = 2500

  let totalHours = 0
  const roleMap: Record<string, { hours: number; count: number }> = {}

  for (const a of assignments) {
    const hours = a.scheduled_hours ?? AVG_HOURS_PER_EVENT
    const role = a.role_override || (a.staff_member as any)?.role || 'Staff'
    totalHours += hours

    if (!roleMap[role]) {
      roleMap[role] = { hours: 0, count: 0 }
    }
    roleMap[role].hours += hours
    roleMap[role].count += 1
  }

  const byRole = Object.entries(roleMap).map(([role, data]) => ({
    role,
    hours: data.hours,
    count: data.count,
  }))

  return {
    totalScheduledHours: totalHours,
    estimatedLaborCostCents: Math.round(totalHours * HOURLY_RATE_CENTS),
    byRole,
  }
}

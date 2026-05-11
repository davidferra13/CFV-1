'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// Types

export interface StaffConflict {
  staffMemberId: string
  staffName: string
  staffRole: string
  eventA: { id: string; name: string; date: string; serveTime: string | null }
  eventB: { id: string; name: string; date: string; serveTime: string | null }
  conflictType: 'double_booked' | 'back_to_back'
  message: string
}

export interface SharingOpportunity {
  date: string
  events: { id: string; name: string; serveTime: string | null; location: string | null }[]
  suggestedSharedStaff: {
    staffMemberId: string
    staffName: string
    role: string
    splitSchedule: string // e.g. "Event A 10:00-14:00, Event B 16:00-20:00"
  }[]
  estimatedSavings: string
}

export interface StaffScheduleEntry {
  staffMemberId: string
  staffName: string
  role: string
  date: string
  events: {
    eventId: string
    eventName: string
    serveTime: string | null
    estimatedHours: number
  }[]
  totalHours: number
  hourlyRateCents: number
  estimatedCostCents: number
}

export interface StaffOptimizationReport {
  conflicts: StaffConflict[]
  opportunities: SharingOpportunity[]
  suggestedSchedule: StaffScheduleEntry[]
  dateRange: { start: string; end: string }
  totalStaffNeeded: number
  totalEstimatedCostCents: number
}

// Helpers

function toMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function eventsOverlap(
  aServe: string | null,
  aDep: string | null,
  bServe: string | null,
  bDep: string | null
): boolean {
  if (!aServe || !bServe) return true // no time = assume all-day conflict
  const aStart = toMinutes(aServe)
  const aEnd = aDep ? toMinutes(aDep) : aStart + 180
  const bStart = toMinutes(bServe)
  const bEnd = bDep ? toMinutes(bDep) : bStart + 180
  return aStart < bEnd && bStart < aEnd
}

function formatTimeRange(serve: string | null, dep: string | null): string {
  if (!serve) return 'TBD'
  const end = dep || `${serve.slice(0, 2)}:${String((parseInt(serve.slice(3, 5)) + 180) % 60).padStart(2, '0')}`
  return `${serve.slice(0, 5)}-${end.slice(0, 5)}`
}

// Main Action

export async function optimizeStaffSchedule(
  startDate: string,
  endDate: string
): Promise<StaffOptimizationReport | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch events in date range
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, departure_time, location_address, location_city, status')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted', 'in_progress'])
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })

  if (eventsError || !events || events.length === 0) return null

  // Fetch staff members
  const { data: staffMembers, error: staffError } = await db
    .from('staff_members')
    .select('id, name, role, hourly_rate_cents')
    .eq('chef_id', tenantId)
    .eq('status', 'active')
    .order('name')

  if (staffError) return null

  // Fetch assignments for these events
  const eventIds = events.map((e: any) => e.id)
  const { data: assignments, error: assignError } = await db
    .from('event_staff_assignments')
    .select('id, event_id, staff_member_id, role_override, scheduled_hours, status')
    .eq('chef_id', tenantId)
    .in('event_id', eventIds)

  if (assignError) return null

  const staffMap = new Map<string, any>()
  for (const s of staffMembers ?? []) {
    staffMap.set(s.id, s)
  }

  const eventMap = new Map<string, any>()
  for (const e of events) {
    eventMap.set(e.id, e)
  }

  // Group events by date
  const eventsByDate = new Map<string, any[]>()
  for (const e of events) {
    const existing = eventsByDate.get(e.event_date) ?? []
    existing.push(e)
    eventsByDate.set(e.event_date, existing)
  }

  // Group assignments by staff member
  const assignmentsByStaff = new Map<string, any[]>()
  for (const a of assignments ?? []) {
    const existing = assignmentsByStaff.get(a.staff_member_id) ?? []
    existing.push(a)
    assignmentsByStaff.set(a.staff_member_id, existing)
  }

  // Detect conflicts: same staff assigned to overlapping events
  const conflicts: StaffConflict[] = []
  for (const [staffId, staffAssignments] of assignmentsByStaff) {
    const staff = staffMap.get(staffId)
    if (!staff) continue

    // Group assignments by event date
    const byDate = new Map<string, any[]>()
    for (const a of staffAssignments) {
      const event = eventMap.get(a.event_id)
      if (!event) continue
      const existing = byDate.get(event.event_date) ?? []
      existing.push({ assignment: a, event })
      byDate.set(event.event_date, existing)
    }

    for (const [, dayAssignments] of byDate) {
      if (dayAssignments.length < 2) continue
      for (let i = 0; i < dayAssignments.length; i++) {
        for (let j = i + 1; j < dayAssignments.length; j++) {
          const eA = dayAssignments[i].event
          const eB = dayAssignments[j].event
          const overlaps = eventsOverlap(
            eA.serve_time,
            eA.departure_time,
            eB.serve_time,
            eB.departure_time
          )
          conflicts.push({
            staffMemberId: staffId,
            staffName: staff.name,
            staffRole: staff.role,
            eventA: {
              id: eA.id,
              name: eA.occasion || 'Event',
              date: eA.event_date,
              serveTime: eA.serve_time,
            },
            eventB: {
              id: eB.id,
              name: eB.occasion || 'Event',
              date: eB.event_date,
              serveTime: eB.serve_time,
            },
            conflictType: overlaps ? 'double_booked' : 'back_to_back',
            message: overlaps
              ? `${staff.name} is double-booked on ${eA.event_date}: "${eA.occasion || 'Event'}" and "${eB.occasion || 'Event'}" overlap`
              : `${staff.name} has back-to-back events on ${eA.event_date}`,
          })
        }
      }
    }
  }

  // Detect sharing opportunities: same-day events that could share staff
  const opportunities: SharingOpportunity[] = []
  for (const [date, dayEvents] of eventsByDate) {
    if (dayEvents.length < 2) continue

    // Check if events are sequential (non-overlapping), not simultaneous
    const sequential: any[] = []
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const overlap = eventsOverlap(
          dayEvents[i].serve_time,
          dayEvents[i].departure_time,
          dayEvents[j].serve_time,
          dayEvents[j].departure_time
        )
        if (!overlap) {
          sequential.push([dayEvents[i], dayEvents[j]])
        }
      }
    }

    if (sequential.length === 0) continue

    // Suggest available staff for sharing
    const availableStaff = (staffMembers ?? []).filter((s: any) => {
      // Staff not already double-booked on this date
      const staffDayAssignments = (assignmentsByStaff.get(s.id) ?? []).filter((a: any) => {
        const ev = eventMap.get(a.event_id)
        return ev && ev.event_date === date
      })
      return staffDayAssignments.length <= 1
    })

    for (const [eA, eB] of sequential) {
      const suggestedShared = availableStaff.slice(0, 3).map((s: any) => ({
        staffMemberId: s.id,
        staffName: s.name,
        role: s.role,
        splitSchedule: `${eA.occasion || 'Event A'} ${formatTimeRange(eA.serve_time, eA.departure_time)}, ${eB.occasion || 'Event B'} ${formatTimeRange(eB.serve_time, eB.departure_time)}`,
      }))

      opportunities.push({
        date,
        events: [eA, eB].map((e: any) => ({
          id: e.id,
          name: e.occasion || 'Event',
          serveTime: e.serve_time,
          location: [e.location_address, e.location_city].filter(Boolean).join(', ') || null,
        })),
        suggestedSharedStaff: suggestedShared,
        estimatedSavings: suggestedShared.length > 0
          ? `Share ${suggestedShared.length} staff member(s) across both events`
          : 'No available staff to share',
      })
    }
  }

  // Build suggested schedule
  const scheduleMap = new Map<string, StaffScheduleEntry>()
  for (const a of assignments ?? []) {
    const staff = staffMap.get(a.staff_member_id)
    const event = eventMap.get(a.event_id)
    if (!staff || !event) continue

    const key = `${a.staff_member_id}_${event.event_date}`
    const existing = scheduleMap.get(key) ?? {
      staffMemberId: staff.id,
      staffName: staff.name,
      role: a.role_override ?? staff.role,
      date: event.event_date,
      events: [],
      totalHours: 0,
      hourlyRateCents: staff.hourly_rate_cents ?? 0,
      estimatedCostCents: 0,
    }

    const hours = a.scheduled_hours ?? 4
    existing.events.push({
      eventId: event.id,
      eventName: event.occasion || 'Event',
      serveTime: event.serve_time,
      estimatedHours: hours,
    })
    existing.totalHours += hours
    existing.estimatedCostCents = existing.totalHours * (existing.hourlyRateCents / 100) * 100

    scheduleMap.set(key, existing)
  }

  const suggestedSchedule = Array.from(scheduleMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date) || a.staffName.localeCompare(b.staffName)
  )

  const totalEstimatedCostCents = suggestedSchedule.reduce(
    (sum, entry) => sum + entry.estimatedCostCents,
    0
  )

  return {
    conflicts,
    opportunities,
    suggestedSchedule,
    dateRange: { start: startDate, end: endDate },
    totalStaffNeeded: new Set(suggestedSchedule.map((s) => s.staffMemberId)).size,
    totalEstimatedCostCents,
  }
}

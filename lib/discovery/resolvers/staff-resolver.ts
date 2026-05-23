import { pgClient } from '@/lib/db'
import type { RailResolverResult } from './types'

// ---------------------------------------------------------------------------
// Staff Universal Rail Data Resolver
// Tenant-scoped. Staff sees only their own assignments and tenant data.
// NEVER surfaces: client financials, business metrics, pricing, other staff pay rates.
// ---------------------------------------------------------------------------

export async function resolveStaffRailData(
  userId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  if (!tenantId) return {}

  const result: RailResolverResult = {}

  const [shifts, tasks, stations, eventCtx, comms] = await Promise.all([
    resolveShiftAndSchedule(userId, tenantId),
    resolveTasksAndDelegation(userId, tenantId),
    resolveStationAssignments(userId, tenantId),
    resolveEventContext(userId, tenantId),
    resolveCommunications(userId, tenantId),
  ])

  Object.assign(result, shifts, tasks, stations, eventCtx, comms)
  return result
}

// ---------------------------------------------------------------------------
// Group 1: Shift and Schedule
// ---------------------------------------------------------------------------

async function resolveShiftAndSchedule(
  userId: string,
  tenantId: string
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const now = new Date()
    const todayStr = formatDate(now)

    // Get today's shift for this staff member
    const rows = await pgClient`
      SELECT ss.id AS shift_id, ss.start_time, ss.end_time, sa.event_id
      FROM staff_shifts ss
      JOIN staff_assignments sa ON sa.id = ss.assignment_id
      WHERE sa.tenant_id = ${tenantId}
        AND sa.staff_user_id = ${userId}
        AND ss.shift_date = ${todayStr}
      ORDER BY ss.start_time ASC
      LIMIT 1
    `
    const shift = rows[0] as
      | { shift_id: string; start_time: string; end_time: string; event_id: string | null }
      | undefined

    if (shift) {
      result['staff.todays_shift'] = {
        shiftId: shift.shift_id,
        startTime: shift.start_time,
        endTime: shift.end_time,
      }

      // Clock-in reminder: shift starts within 30 minutes and not clocked in
      const startMs = new Date(shift.start_time).getTime()
      const minsUntilStart = (startMs - now.getTime()) / 60_000
      if (minsUntilStart > 0 && minsUntilStart <= 30) {
        const clockedIn = await pgClient`
          SELECT 1 FROM staff_clock_entries
          WHERE staff_user_id = ${userId}
            AND shift_id = ${shift.shift_id}
            AND clock_in_at IS NOT NULL
          LIMIT 1
        `
        if ((clockedIn as unknown[]).length === 0) {
          result['staff.clock_in_reminder'] = {
            shiftId: shift.shift_id,
            minutes: Math.ceil(minsUntilStart),
          }
        }
      }
    }

    // Availability conflicts
    const conflicts = await pgClient`
      SELECT COUNT(*)::int AS count
      FROM staff_assignments sa
      JOIN staff_availability sav
        ON sav.staff_user_id = sa.staff_user_id
        AND sav.date = sa.event_date
        AND sav.available = false
      WHERE sa.tenant_id = ${tenantId}
        AND sa.staff_user_id = ${userId}
        AND sa.event_date >= ${todayStr}
      LIMIT 1
    `
    const conflictCount = (conflicts[0] as { count: number } | undefined)?.count ?? 0
    if (conflictCount > 0) {
      result['staff.availability_conflict'] = { count: conflictCount }
    }
  } catch (err) {
    console.error('[resolveStaffRailData] shifts group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 2: Tasks and Delegation
// ---------------------------------------------------------------------------

async function resolveTasksAndDelegation(
  userId: string,
  tenantId: string
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const now = new Date().toISOString()
    const rows = await pgClient`
      SELECT id, title, due_at, status
      FROM tasks
      WHERE tenant_id = ${tenantId}
        AND assigned_to_user_id = ${userId}
        AND status NOT IN ('completed', 'cancelled')
      ORDER BY due_at ASC NULLS LAST
      LIMIT 10
    `
    const tasks = rows as unknown as {
      id: string
      title: string
      due_at: string | null
      status: string
    }[]

    const overdue = tasks.filter((t) => t.due_at && t.due_at < now)
    const dueSoon = tasks.filter(
      (t) =>
        t.due_at && t.due_at >= now && t.due_at <= new Date(Date.now() + 3_600_000).toISOString()
    )
    const newTasks = tasks.filter((t) => t.status === 'pending')

    if (overdue.length > 0) {
      result['staff.task_overdue'] = {
        taskId: overdue[0].id,
        taskTitle: overdue[0].title,
        count: overdue.length,
      }
    } else if (dueSoon.length > 0) {
      result['staff.task_due_soon'] = {
        taskId: dueSoon[0].id,
        taskTitle: dueSoon[0].title,
      }
    }
    if (newTasks.length > 0) {
      result['staff.new_task_assigned'] = {
        taskId: newTasks[0].id,
        taskTitle: newTasks[0].title,
        count: newTasks.length,
      }
    }
    if (tasks.length > 3) {
      result['staff.bulk_task_list'] = { count: tasks.length }
    }
  } catch (err) {
    console.error('[resolveStaffRailData] tasks group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 3: Station Assignments
// ---------------------------------------------------------------------------

async function resolveStationAssignments(
  userId: string,
  tenantId: string
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const todayStr = formatDate(new Date())
    const rows = await pgClient`
      SELECT st.id AS station_id, st.name AS station_name, sa.event_id
      FROM staff_assignments sa
      JOIN stations st ON st.id = sa.station_id
      WHERE sa.tenant_id = ${tenantId}
        AND sa.staff_user_id = ${userId}
        AND sa.event_date = ${todayStr}
        AND st.id IS NOT NULL
      LIMIT 1
    `
    const station = rows[0] as
      | { station_id: string; station_name: string; event_id: string }
      | undefined
    if (station) {
      result['staff.current_station'] = {
        stationId: station.station_id,
        stationName: station.station_name,
        eventId: station.event_id,
      }
      result['staff.station_prep_checklist'] = {
        stationId: station.station_id,
        stationName: station.station_name,
      }
    }
  } catch (err) {
    console.error('[resolveStaffRailData] stations group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 4: Event Context
// ---------------------------------------------------------------------------

async function resolveEventContext(userId: string, tenantId: string): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const todayStr = formatDate(new Date())
    const rows = await pgClient`
      SELECT e.id, e.occasion, e.guest_count,
             COUNT(dr.id)::int AS dietary_alert_count
      FROM staff_assignments sa
      JOIN events e ON e.id = sa.event_id
      LEFT JOIN dietary_restrictions dr ON dr.event_id = e.id
        AND dr.is_allergy = true
      WHERE sa.tenant_id = ${tenantId}
        AND sa.staff_user_id = ${userId}
        AND sa.event_date = ${todayStr}
      GROUP BY e.id, e.occasion, e.guest_count
      LIMIT 1
    `
    const evt = rows[0] as
      | {
          id: string
          occasion: string | null
          guest_count: number | null
          dietary_alert_count: number
        }
      | undefined
    if (evt) {
      result['staff.today_event_summary'] = {
        eventId: evt.id,
        eventTitle: evt.occasion,
        guestCount: evt.guest_count,
      }
      if (evt.dietary_alert_count > 0) {
        result['staff.event_dietary_alerts'] = {
          eventId: evt.id,
          count: evt.dietary_alert_count,
        }
      }
    }
  } catch (err) {
    console.error('[resolveStaffRailData] event context group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 5: Communications
// ---------------------------------------------------------------------------

async function resolveCommunications(
  userId: string,
  tenantId: string
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const rows = await pgClient`
      SELECT COUNT(*)::int AS count
      FROM chat_messages cm
      JOIN conversation_participants cp
        ON cp.conversation_id = cm.conversation_id
        AND cp.auth_user_id = ${userId}
      WHERE cm.sender_id != ${userId}
        AND cm.deleted_at IS NULL
        AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    `
    const count = (rows[0] as { count: number } | undefined)?.count ?? 0
    if (count > 0) {
      result['staff.message_from_chef'] = { count }
    }
  } catch (err) {
    console.error('[resolveStaffRailData] communications group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

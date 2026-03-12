'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────

export interface StaffUtilizationRow {
  staffMemberId: string
  staffName: string
  role: string
  hourlyRateCents: number
  status: string
  // Hours
  scheduledHours: number
  actualHours: number
  // Events
  totalEventsAssigned: number
  completedEvents: number
  noShowCount: number
  // Financial
  totalLaborCostCents: number
  avgCostPerEventCents: number
  // Utilization
  utilizationPercent: number // actual / scheduled * 100
  // Performance
  onTimeRate: number | null
  avgRating: number | null
}

export interface UtilizationReport {
  dateRange: { start: string; end: string }
  staff: StaffUtilizationRow[]
  totals: {
    totalStaff: number
    totalScheduledHours: number
    totalActualHours: number
    totalLaborCostCents: number
    avgUtilizationPercent: number
    totalEvents: number
  }
}

// ─── Main Report ────────────────────────────────────────────────

export async function getStaffUtilizationReport(
  startDate: string,
  endDate: string
): Promise<UtilizationReport> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // 1. Get all active staff
  const { data: staffMembers } = await supabase
    .from('staff_members')
    .select('id, name, role, hourly_rate_cents, status')
    .eq('chef_id', chefId)
    .order('name', { ascending: true })

  if (!staffMembers || staffMembers.length === 0) {
    return {
      dateRange: { start: startDate, end: endDate },
      staff: [],
      totals: {
        totalStaff: 0,
        totalScheduledHours: 0,
        totalActualHours: 0,
        totalLaborCostCents: 0,
        avgUtilizationPercent: 0,
        totalEvents: 0,
      },
    }
  }

  const staffIds = staffMembers.map((s: any) => s.id)

  // 2. Get event assignments in date range
  const { data: assignments } = await supabase
    .from('event_staff_assignments')
    .select(
      'staff_member_id, scheduled_hours, actual_hours, pay_amount_cents, status, event:events(id, event_date)'
    )
    .eq('chef_id', chefId)
    .in('staff_member_id', staffIds)

  // Filter assignments by event date range
  const filteredAssignments = (assignments ?? []).filter((a: any) => {
    const eventDate = a.event?.event_date
    if (!eventDate) return false
    return eventDate >= startDate && eventDate <= endDate
  })

  // 3. Get clock entries in date range
  const { data: clockEntries } = await supabase
    .from('staff_clock_entries')
    .select('staff_member_id, total_minutes, clock_in_at')
    .eq('chef_id', chefId)
    .in('staff_member_id', staffIds)
    .eq('status', 'completed')
    .gte('clock_in_at', startDate)
    .lte('clock_in_at', endDate + 'T23:59:59')

  // 4. Get performance scores
  const { data: perfScores } = await supabase
    .from('staff_performance_scores')
    .select('staff_member_id, on_time_rate, avg_rating, total_events')
    .eq('chef_id', chefId)
    .in('staff_member_id', staffIds)

  // Build lookup maps
  const assignmentsByStaff = new Map<string, any[]>()
  for (const a of filteredAssignments) {
    const list = assignmentsByStaff.get(a.staff_member_id) ?? []
    list.push(a)
    assignmentsByStaff.set(a.staff_member_id, list)
  }

  const clockByStaff = new Map<string, number>()
  for (const c of clockEntries ?? []) {
    const prev = clockByStaff.get(c.staff_member_id) ?? 0
    clockByStaff.set(c.staff_member_id, prev + (c.total_minutes ?? 0))
  }

  const perfByStaff = new Map<string, any>()
  for (const p of perfScores ?? []) {
    perfByStaff.set(p.staff_member_id, p)
  }

  // 5. Compute per-staff utilization
  const rows: StaffUtilizationRow[] = staffMembers.map((staff: any) => {
    const assigns = assignmentsByStaff.get(staff.id) ?? []
    const clockMinutes = clockByStaff.get(staff.id) ?? 0
    const perf = perfByStaff.get(staff.id)

    const scheduledHours = assigns.reduce(
      (s: number, a: any) => s + Number(a.scheduled_hours ?? 0),
      0
    )

    // Prefer actual_hours from assignments, fall back to clock entries
    const assignmentActualHours = assigns.reduce(
      (s: number, a: any) => s + Number(a.actual_hours ?? 0),
      0
    )
    const clockHours = clockMinutes / 60
    const actualHours = assignmentActualHours > 0 ? assignmentActualHours : clockHours

    const completedEvents = assigns.filter((a: any) => a.status === 'completed').length
    const noShowCount = assigns.filter((a: any) => a.status === 'no_show').length

    const totalPay = assigns.reduce((s: number, a: any) => s + Number(a.pay_amount_cents ?? 0), 0)
    // If no pay recorded, estimate from hours * rate
    const laborCost =
      totalPay > 0 ? totalPay : Math.round(actualHours * (staff.hourly_rate_cents ?? 0))

    const utilization = scheduledHours > 0 ? Math.round((actualHours / scheduledHours) * 100) : 0

    return {
      staffMemberId: staff.id,
      staffName: staff.name,
      role: staff.role ?? 'other',
      hourlyRateCents: staff.hourly_rate_cents ?? 0,
      status: staff.status,
      scheduledHours: Math.round(scheduledHours * 10) / 10,
      actualHours: Math.round(actualHours * 10) / 10,
      totalEventsAssigned: assigns.length,
      completedEvents,
      noShowCount,
      totalLaborCostCents: laborCost,
      avgCostPerEventCents: completedEvents > 0 ? Math.round(laborCost / completedEvents) : 0,
      utilizationPercent: utilization,
      onTimeRate: perf?.on_time_rate ?? null,
      avgRating: perf?.avg_rating ?? null,
    }
  })

  // Sort by actual hours descending (most utilized first)
  rows.sort((a, b) => b.actualHours - a.actualHours)

  // 6. Compute totals
  const totalScheduled = rows.reduce((s, r) => s + r.scheduledHours, 0)
  const totalActual = rows.reduce((s, r) => s + r.actualHours, 0)
  const totalLabor = rows.reduce((s, r) => s + r.totalLaborCostCents, 0)
  const avgUtil = totalScheduled > 0 ? Math.round((totalActual / totalScheduled) * 100) : 0

  // Count unique events
  const uniqueEvents = new Set<string>()
  for (const assigns of assignmentsByStaff.values()) {
    for (const a of assigns) {
      if (a.event?.id) uniqueEvents.add(a.event.id)
    }
  }

  return {
    dateRange: { start: startDate, end: endDate },
    staff: rows,
    totals: {
      totalStaff: staffMembers.length,
      totalScheduledHours: Math.round(totalScheduled * 10) / 10,
      totalActualHours: Math.round(totalActual * 10) / 10,
      totalLaborCostCents: totalLabor,
      avgUtilizationPercent: avgUtil,
      totalEvents: uniqueEvents.size,
    },
  }
}

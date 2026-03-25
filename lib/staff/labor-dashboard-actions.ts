'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type LaborByEventEntry = {
  assignmentId: string
  staffMemberId: string
  staffName: string
  staffRole: string
  roleOverride: string | null
  scheduledHours: number | null
  actualHours: number | null
  hourlyRateCents: number
  effectiveRateCents: number
  payAmountCents: number
  status: string
}

export type LaborByEventResult = {
  eventId: string
  entries: LaborByEventEntry[]
  totalPayCents: number
  totalHours: number
}

export type LaborByMonthEvent = {
  eventId: string
  eventTitle: string
  eventDate: string
  staffCount: number
  totalHours: number
  totalLaborCostCents: number
}

export type LaborByMonthResult = {
  year: number
  month: number
  events: LaborByMonthEvent[]
  grandTotalCents: number
  grandTotalHours: number
}

export type LaborRevenueRatioResult = {
  startDate: string
  endDate: string
  totalLaborCostCents: number
  totalRevenueCents: number
  ratioPercent: number
  eventCount: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const LaborByMonthSchema = z.object({
  year: z.number().int().min(2020).max(2099),
  month: z.number().int().min(1).max(12),
})

const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Get the full staff roster for one event with hours and pay breakdown.
 * Uses the existing event_staff_assignments table joined with staff_members.
 */
export async function getLaborByEvent(eventId: string): Promise<LaborByEventResult> {
  const user = await requireChef()
  z.string().uuid().parse(eventId)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_staff_assignments')
    .select(
      `
      id,
      staff_member_id,
      role_override,
      scheduled_hours,
      actual_hours,
      rate_override_cents,
      pay_amount_cents,
      status,
      staff_members (id, name, role, hourly_rate_cents)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at')

  if (error) throw new Error(`Failed to load event labor: ${error.message}`)

  const rows = data || []
  let totalPayCents = 0
  let totalHours = 0

  const entries: LaborByEventEntry[] = rows.map((row: any) => {
    const staffRate = row.staff_members?.hourly_rate_cents ?? 0
    const effectiveRate = row.rate_override_cents ?? staffRate
    const pay = row.pay_amount_cents ?? 0
    const hours = row.actual_hours ?? 0

    totalPayCents += pay
    totalHours += hours

    return {
      assignmentId: row.id,
      staffMemberId: row.staff_member_id,
      staffName: row.staff_members?.name ?? 'Unknown',
      staffRole: row.staff_members?.role ?? 'other',
      roleOverride: row.role_override,
      scheduledHours: row.scheduled_hours,
      actualHours: row.actual_hours,
      hourlyRateCents: staffRate,
      effectiveRateCents: effectiveRate,
      payAmountCents: pay,
      status: row.status,
    }
  })

  return {
    eventId,
    entries,
    totalPayCents,
    totalHours,
  }
}

/**
 * Get labor cost for all events in a given month, grouped by event.
 * Joins event_staff_assignments with events to get event titles and dates.
 */
export async function getLaborByMonth(year: number, month: number): Promise<LaborByMonthResult> {
  const user = await requireChef()
  LaborByMonthSchema.parse({ year, month })
  const db: any = createServerClient()

  // Build date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  // Get all events in this month for the chef
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, title, date')
    .eq('chef_id', user.tenantId!)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date')

  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`)

  if (!events || events.length === 0) {
    return {
      year,
      month,
      events: [],
      grandTotalCents: 0,
      grandTotalHours: 0,
    }
  }

  const eventIds = events.map((e: any) => e.id)

  // Get all staff assignments for these events
  const { data: assignments, error: assignError } = await db
    .from('event_staff_assignments')
    .select('event_id, actual_hours, pay_amount_cents')
    .eq('chef_id', user.tenantId!)
    .in('event_id', eventIds)

  if (assignError) throw new Error(`Failed to load assignments: ${assignError.message}`)

  // Aggregate by event
  const eventAgg: Record<string, { staffCount: number; totalHours: number; totalCents: number }> =
    {}
  for (const a of assignments || []) {
    if (!eventAgg[a.event_id]) {
      eventAgg[a.event_id] = { staffCount: 0, totalHours: 0, totalCents: 0 }
    }
    eventAgg[a.event_id].staffCount += 1
    eventAgg[a.event_id].totalHours += a.actual_hours ?? 0
    eventAgg[a.event_id].totalCents += a.pay_amount_cents ?? 0
  }

  let grandTotalCents = 0
  let grandTotalHours = 0

  const result: LaborByMonthEvent[] = events.map((evt: any) => {
    const agg = eventAgg[evt.id] || { staffCount: 0, totalHours: 0, totalCents: 0 }
    grandTotalCents += agg.totalCents
    grandTotalHours += agg.totalHours

    return {
      eventId: evt.id,
      eventTitle: evt.title,
      eventDate: evt.date,
      staffCount: agg.staffCount,
      totalHours: agg.totalHours,
      totalLaborCostCents: agg.totalCents,
    }
  })

  return {
    year,
    month,
    events: result,
    grandTotalCents,
    grandTotalHours,
  }
}

/**
 * Compute labor cost vs event revenue as a percentage for a date range.
 * Revenue is pulled from the events table (total_amount_cents).
 * Labor cost is the sum of pay_amount_cents from event_staff_assignments.
 */
export async function getLaborRevenueRatio(
  startDate: string,
  endDate: string
): Promise<LaborRevenueRatioResult> {
  const user = await requireChef()
  DateRangeSchema.parse({ startDate, endDate })
  const db: any = createServerClient()

  // Get events in the date range with their revenue
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, total_amount_cents')
    .eq('chef_id', user.tenantId!)
    .gte('date', startDate)
    .lte('date', endDate)

  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`)

  if (!events || events.length === 0) {
    return {
      startDate,
      endDate,
      totalLaborCostCents: 0,
      totalRevenueCents: 0,
      ratioPercent: 0,
      eventCount: 0,
    }
  }

  const totalRevenueCents = events.reduce(
    (sum: number, e: any) => sum + (e.total_amount_cents ?? 0),
    0
  )

  const eventIds = events.map((e: any) => e.id)

  // Get labor cost for these events
  const { data: assignments, error: assignError } = await db
    .from('event_staff_assignments')
    .select('pay_amount_cents')
    .eq('chef_id', user.tenantId!)
    .in('event_id', eventIds)

  if (assignError) throw new Error(`Failed to load labor data: ${assignError.message}`)

  const totalLaborCostCents = (assignments || []).reduce(
    (sum: number, a: any) => sum + (a.pay_amount_cents ?? 0),
    0
  )

  const ratioPercent =
    totalRevenueCents > 0 ? Math.round((totalLaborCostCents / totalRevenueCents) * 10000) / 100 : 0

  return {
    startDate,
    endDate,
    totalLaborCostCents,
    totalRevenueCents,
    ratioPercent,
    eventCount: events.length,
  }
}

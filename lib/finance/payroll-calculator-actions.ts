'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { csvRowSafe } from '@/lib/security/csv-sanitize'

// ── Types ─────────────────────────────────────────────────────────

export interface StaffPayrollLine {
  staffMemberId: string
  staffName: string
  role: string
  hourlyRateCents: number
  regularHours: number
  overtimeHours: number
  regularPayCents: number
  overtimePayCents: number
  tipIncomeCents: number
  grossPayCents: number
  clockEntryCount: number
}

export interface PayrollSummary {
  payPeriodStart: string
  payPeriodEnd: string
  lines: StaffPayrollLine[]
  totalRegularHours: number
  totalOvertimeHours: number
  totalRegularPayCents: number
  totalOvertimePayCents: number
  totalTipIncomeCents: number
  totalGrossPayCents: number
  staffCount: number
}

export interface StaffPayHistoryEntry {
  periodStart: string
  periodEnd: string
  regularHours: number
  overtimeHours: number
  regularPayCents: number
  overtimePayCents: number
  tipIncomeCents: number
  grossPayCents: number
}

// ── Constants ─────────────────────────────────────────────────────

const OVERTIME_THRESHOLD_HOURS_PER_WEEK = 40
const OVERTIME_MULTIPLIER = 1.5

// ── Core Payroll Calculation ──────────────────────────────────────

export async function calculatePayroll(
  payPeriodStart: string,
  payPeriodEnd: string
): Promise<PayrollSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all active staff members
  const { data: staffData } = await supabase
    .from('staff_members')
    .select('id, name, role, hourly_rate_cents')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')

  const staff: any[] = staffData || []
  if (staff.length === 0) {
    return {
      payPeriodStart,
      payPeriodEnd,
      lines: [],
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalRegularPayCents: 0,
      totalOvertimePayCents: 0,
      totalTipIncomeCents: 0,
      totalGrossPayCents: 0,
      staffCount: 0,
    }
  }

  // Get clock entries for the period
  const { data: clockData } = await supabase
    .from('staff_clock_entries')
    .select('staff_member_id, clock_in_at, clock_out_at, total_minutes')
    .eq('chef_id', user.tenantId!)
    .gte('clock_in_at', `${payPeriodStart}T00:00:00Z`)
    .lte('clock_in_at', `${payPeriodEnd}T23:59:59Z`)
    .eq('status', 'completed')

  const clockEntries: any[] = clockData || []

  // Get tip distributions for the period
  const { data: tipData } = await supabase
    .from('tip_distributions')
    .select('staff_member_id, share_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('distribution_date', payPeriodStart)
    .lte('distribution_date', payPeriodEnd)

  const tipEntries: any[] = tipData || []

  // Group tips by staff
  const tipsByStaff = new Map<string, number>()
  for (const t of tipEntries) {
    tipsByStaff.set(t.staff_member_id, (tipsByStaff.get(t.staff_member_id) || 0) + t.share_cents)
  }

  // Group clock entries by staff member, then by ISO week for overtime calc
  const clockByStaff = new Map<string, any[]>()
  for (const c of clockEntries) {
    const arr = clockByStaff.get(c.staff_member_id) || []
    arr.push(c)
    clockByStaff.set(c.staff_member_id, arr)
  }

  const lines: StaffPayrollLine[] = []

  for (const s of staff) {
    const entries = clockByStaff.get(s.id) || []
    if (entries.length === 0 && !tipsByStaff.has(s.id)) continue

    // Calculate hours by week for overtime
    const hoursByWeek = new Map<string, number>()
    let totalMinutes = 0

    for (const e of entries) {
      const mins = e.total_minutes || 0
      totalMinutes += mins

      // Get the ISO week key for this entry
      const clockIn = new Date(e.clock_in_at)
      const weekKey = getISOWeekKey(clockIn)
      hoursByWeek.set(weekKey, (hoursByWeek.get(weekKey) || 0) + mins / 60)
    }

    // Calculate regular vs overtime hours across weeks
    let regularHours = 0
    let overtimeHours = 0

    for (const weekHours of hoursByWeek.values()) {
      if (weekHours <= OVERTIME_THRESHOLD_HOURS_PER_WEEK) {
        regularHours += weekHours
      } else {
        regularHours += OVERTIME_THRESHOLD_HOURS_PER_WEEK
        overtimeHours += weekHours - OVERTIME_THRESHOLD_HOURS_PER_WEEK
      }
    }

    // Round to 2 decimal places
    regularHours = Math.round(regularHours * 100) / 100
    overtimeHours = Math.round(overtimeHours * 100) / 100

    const rateCents = s.hourly_rate_cents || 0
    const regularPayCents = Math.round(regularHours * rateCents)
    const overtimePayCents = Math.round(overtimeHours * rateCents * OVERTIME_MULTIPLIER)
    const tipIncomeCents = tipsByStaff.get(s.id) || 0
    const grossPayCents = regularPayCents + overtimePayCents + tipIncomeCents

    lines.push({
      staffMemberId: s.id,
      staffName: s.name,
      role: s.role,
      hourlyRateCents: rateCents,
      regularHours,
      overtimeHours,
      regularPayCents,
      overtimePayCents,
      tipIncomeCents,
      grossPayCents,
      clockEntryCount: entries.length,
    })
  }

  // Sort by name
  lines.sort((a, b) => a.staffName.localeCompare(b.staffName))

  return {
    payPeriodStart,
    payPeriodEnd,
    lines,
    totalRegularHours: lines.reduce((s, l) => s + l.regularHours, 0),
    totalOvertimeHours: lines.reduce((s, l) => s + l.overtimeHours, 0),
    totalRegularPayCents: lines.reduce((s, l) => s + l.regularPayCents, 0),
    totalOvertimePayCents: lines.reduce((s, l) => s + l.overtimePayCents, 0),
    totalTipIncomeCents: lines.reduce((s, l) => s + l.tipIncomeCents, 0),
    totalGrossPayCents: lines.reduce((s, l) => s + l.grossPayCents, 0),
    staffCount: lines.length,
  }
}

// ── Summary & History ─────────────────────────────────────────────

export async function getPayrollCalculationSummary(
  payPeriodStart: string,
  payPeriodEnd: string
): Promise<{
  totalStaff: number
  totalGrossPayCents: number
  totalOvertimePayCents: number
  totalTipsCents: number
  hasOvertimeWorkers: boolean
}> {
  const summary = await calculatePayroll(payPeriodStart, payPeriodEnd)
  return {
    totalStaff: summary.staffCount,
    totalGrossPayCents: summary.totalGrossPayCents,
    totalOvertimePayCents: summary.totalOvertimePayCents,
    totalTipsCents: summary.totalTipIncomeCents,
    hasOvertimeWorkers: summary.lines.some((l) => l.overtimeHours > 0),
  }
}

export async function getStaffPayHistory(
  staffMemberId: string,
  periodsBack = 6
): Promise<StaffPayHistoryEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Generate biweekly periods going backwards
  const periods: { start: string; end: string }[] = []
  const now = new Date()

  for (let i = 0; i < periodsBack; i++) {
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() - i * 14)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 13)

    periods.push({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    })
  }

  const results: StaffPayHistoryEntry[] = []

  for (const period of periods) {
    // Get clock entries
    const { data: clockData } = await supabase
      .from('staff_clock_entries')
      .select('clock_in_at, total_minutes')
      .eq('chef_id', user.tenantId!)
      .eq('staff_member_id', staffMemberId)
      .gte('clock_in_at', `${period.start}T00:00:00Z`)
      .lte('clock_in_at', `${period.end}T23:59:59Z`)
      .eq('status', 'completed')

    const entries: any[] = clockData || []

    // Get rate
    const { data: staffRow } = await supabase
      .from('staff_members')
      .select('hourly_rate_cents')
      .eq('id', staffMemberId)
      .eq('chef_id', user.tenantId!)
      .single()

    const rateCents = staffRow?.hourly_rate_cents || 0

    // Calculate hours by week
    const hoursByWeek = new Map<string, number>()
    for (const e of entries) {
      const clockIn = new Date(e.clock_in_at)
      const weekKey = getISOWeekKey(clockIn)
      hoursByWeek.set(weekKey, (hoursByWeek.get(weekKey) || 0) + (e.total_minutes || 0) / 60)
    }

    let regularHours = 0
    let overtimeHours = 0
    for (const weekHours of hoursByWeek.values()) {
      if (weekHours <= OVERTIME_THRESHOLD_HOURS_PER_WEEK) {
        regularHours += weekHours
      } else {
        regularHours += OVERTIME_THRESHOLD_HOURS_PER_WEEK
        overtimeHours += weekHours - OVERTIME_THRESHOLD_HOURS_PER_WEEK
      }
    }

    regularHours = Math.round(regularHours * 100) / 100
    overtimeHours = Math.round(overtimeHours * 100) / 100

    // Get tips
    const { data: tipData } = await supabase
      .from('tip_distributions')
      .select('share_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('staff_member_id', staffMemberId)
      .gte('distribution_date', period.start)
      .lte('distribution_date', period.end)

    const tipCents = (tipData || []).reduce((s: number, t: any) => s + (t.share_cents || 0), 0)

    const regularPayCents = Math.round(regularHours * rateCents)
    const overtimePayCents = Math.round(overtimeHours * rateCents * OVERTIME_MULTIPLIER)

    if (regularHours > 0 || overtimeHours > 0 || tipCents > 0) {
      results.push({
        periodStart: period.start,
        periodEnd: period.end,
        regularHours,
        overtimeHours,
        regularPayCents,
        overtimePayCents,
        tipIncomeCents: tipCents,
        grossPayCents: regularPayCents + overtimePayCents + tipCents,
      })
    }
  }

  return results
}

// ── CSV Export ─────────────────────────────────────────────────────

export async function exportPayrollCSV(
  payPeriodStart: string,
  payPeriodEnd: string
): Promise<string> {
  const summary = await calculatePayroll(payPeriodStart, payPeriodEnd)

  const lines = [
    `# Payroll Summary - ${payPeriodStart} to ${payPeriodEnd}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Reference only. Consult your payroll provider for official filings.`,
    '',
    'Staff Member,Role,Hourly Rate,Regular Hrs,OT Hrs,Regular Pay,OT Pay,Tips,Gross Pay',
    ...summary.lines.map((l) =>
      csvRowSafe([
        l.staffName,
        l.role,
        (l.hourlyRateCents / 100).toFixed(2),
        l.regularHours.toFixed(2),
        l.overtimeHours.toFixed(2),
        (l.regularPayCents / 100).toFixed(2),
        (l.overtimePayCents / 100).toFixed(2),
        (l.tipIncomeCents / 100).toFixed(2),
        (l.grossPayCents / 100).toFixed(2),
      ])
    ),
    '',
    csvRowSafe([
      'TOTALS',
      '',
      '',
      summary.totalRegularHours.toFixed(2),
      summary.totalOvertimeHours.toFixed(2),
      (summary.totalRegularPayCents / 100).toFixed(2),
      (summary.totalOvertimePayCents / 100).toFixed(2),
      (summary.totalTipIncomeCents / 100).toFixed(2),
      (summary.totalGrossPayCents / 100).toFixed(2),
    ]),
  ]

  return lines.join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────

function getISOWeekKey(date: Date): string {
  // Get the Monday of the ISO week containing this date
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

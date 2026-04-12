// Staff Tax Report Generation - 1099 Contractor Reports
// Aggregates annual payments per contractor from event_staff_assignments.
// Pure math from existing data, no AI.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'

// ============================================
// TYPES
// ============================================

export interface ContractorPaymentSummary {
  staffMemberId: string
  name: string
  email: string | null
  role: string
  totalPayCents: number
  totalHours: number
  eventCount: number
  assignments: {
    eventId: string
    eventDate: string
    occasion: string | null
    hours: number
    payCents: number
  }[]
}

export interface TaxReportResult {
  year: number
  chefId: string
  generatedAt: string
  contractors: ContractorPaymentSummary[]
  totalPayoutCents: number
  contractorsAboveThreshold: number // contractors paid >= $600 (1099 filing threshold)
}

// The IRS 1099-NEC filing threshold in cents ($600)
const FILING_THRESHOLD_CENTS = 60000

// ============================================
// ACTIONS
// ============================================

/**
 * Generate a 1099 contractor payment report for a given tax year.
 * Aggregates all staff payments from completed event assignments.
 * Returns formatted data ready for 1099-NEC reporting.
 *
 * The $600 threshold is the IRS minimum for 1099-NEC filing.
 * Contractors paid less than $600 are still included in the report
 * but flagged separately.
 */
export async function generate1099Report(year: number): Promise<TaxReportResult> {
  const user = await requirePro('payroll')
  const db: any = createServerClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // Get all completed assignments with pay for the year, joined with event dates and staff info
  const { data: assignments, error } = await (db as any)
    .from('event_staff_assignments')
    .select(
      `
      id, staff_member_id, actual_hours, pay_amount_cents, event_id,
      staff_members (id, name, email, role),
      events!inner (event_date, occasion)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('status', 'completed')
    .not('pay_amount_cents', 'is', null)
    .gte('events.event_date', yearStart)
    .lte('events.event_date', yearEnd)

  if (error) {
    console.error('[generate1099Report] Error:', error)
    throw new Error('Failed to generate tax report')
  }

  if (!assignments?.length) {
    return {
      year,
      chefId: user.tenantId!,
      generatedAt: new Date().toISOString(),
      contractors: [],
      totalPayoutCents: 0,
      contractorsAboveThreshold: 0,
    }
  }

  // Group by staff member
  const byStaff = new Map<string, ContractorPaymentSummary>()

  for (const a of assignments) {
    const staff = (a as any).staff_members
    const event = (a as any).events
    if (!staff || !event) continue

    const staffId = a.staff_member_id as string
    let entry = byStaff.get(staffId)
    if (!entry) {
      entry = {
        staffMemberId: staffId,
        name: staff.name ?? 'Unknown',
        email: staff.email ?? null,
        role: staff.role ?? 'other',
        totalPayCents: 0,
        totalHours: 0,
        eventCount: 0,
        assignments: [],
      }
      byStaff.set(staffId, entry)
    }

    const payCents = a.pay_amount_cents ?? 0
    const hours = a.actual_hours ?? 0

    entry.totalPayCents += payCents
    entry.totalHours += hours
    entry.eventCount += 1
    entry.assignments.push({
      eventId: a.event_id,
      eventDate: dateToDateString(event.event_date as Date | string),
      occasion: event.occasion ?? null,
      hours,
      payCents,
    })
  }

  const contractors = Array.from(byStaff.values()).sort((a, b) => b.totalPayCents - a.totalPayCents)

  // Sort each contractor's assignments by date
  for (const c of contractors) {
    c.assignments.sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  }

  const totalPayoutCents = contractors.reduce((sum, c) => sum + c.totalPayCents, 0)
  const contractorsAboveThreshold = contractors.filter(
    (c) => c.totalPayCents >= FILING_THRESHOLD_CENTS
  ).length

  return {
    year,
    chefId: user.tenantId!,
    generatedAt: new Date().toISOString(),
    contractors,
    totalPayoutCents,
    contractorsAboveThreshold,
  }
}

/**
 * Quick summary: how many contractors would need a 1099 this year?
 * Lightweight version for dashboard widgets.
 */
export async function get1099Summary(year: number) {
  const report = await generate1099Report(year)
  return {
    year,
    totalContractors: report.contractors.length,
    contractorsAboveThreshold: report.contractorsAboveThreshold,
    totalPayoutCents: report.totalPayoutCents,
    thresholdCents: FILING_THRESHOLD_CENTS,
  }
}

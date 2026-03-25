'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { csvRowSafe } from '@/lib/security/csv-sanitize'

// ─── Types ───────────────────────────────────────────────────────

export type Form1099NEC = {
  taxYear: number
  // Recipient (contractor)
  staffMemberId: string
  recipientName: string
  recipientBusinessName: string | null
  recipientTinDisplay: string // last 4 only, e.g. "***-**-6789"
  recipientTinFull: string | null // full TIN for export (accountant use)
  recipientTinType: 'ssn' | 'ein' | null
  recipientAddress: string
  // Box 1: Nonemployee compensation
  box1NecCents: number
  // Compliance
  requiresFiling: boolean // box1NecCents >= 60000 ($600)
  w9OnFile: boolean
  paymentCount: number
}

export type FilingSummary = {
  totalContractors: number
  requiresFilingCount: number
  missingW9Count: number
  totalNecCents: number
}

// ─── Helpers ─────────────────────────────────────────────────────

function tinDisplay(tin: string | null): string {
  if (!tin) return '-'
  const clean = tin.replace(/\D/g, '')
  if (clean.length >= 4) return `***-**-${clean.slice(-4)}`
  return '***'
}

function buildAddress(s: {
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
}): string {
  const parts = [s.address_street, s.address_city, s.address_state, s.address_zip].filter(Boolean)
  return parts.join(', ') || 'Address not on file'
}

// ─── Actions ─────────────────────────────────────────────────────

export async function generate1099NECReports(taxYear: number): Promise<Form1099NEC[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all active staff with W-9 fields
  const { data: staff, error: staffError } = await db
    .from('staff_members')
    .select(
      'id, name, business_name, tin, tin_type, address_street, address_city, address_state, address_zip, w9_collected'
    )
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')

  if (staffError) throw new Error(`Failed to fetch staff: ${staffError.message}`)
  if (!staff?.length) return []

  // Get all payments for the year
  const { data: payments, error: payError } = await db
    .from('contractor_payments')
    .select('staff_member_id, amount_cents')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)

  if (payError) throw new Error(`Failed to fetch payments: ${payError.message}`)

  const paysByStaff: Record<string, { total: number; count: number }> = {}
  for (const p of payments || []) {
    if (!paysByStaff[p.staff_member_id]) {
      paysByStaff[p.staff_member_id] = { total: 0, count: 0 }
    }
    paysByStaff[p.staff_member_id].total += p.amount_cents
    paysByStaff[p.staff_member_id].count += 1
  }

  const reports: Form1099NEC[] = []

  for (const s of staff) {
    const pays = paysByStaff[s.id]
    if (!pays) continue // no payments this year

    reports.push({
      taxYear,
      staffMemberId: s.id,
      recipientName: s.name,
      recipientBusinessName: s.business_name || null,
      recipientTinDisplay: tinDisplay(s.tin),
      recipientTinFull: s.tin || null,
      recipientTinType: s.tin_type || null,
      recipientAddress: buildAddress(s),
      box1NecCents: pays.total,
      requiresFiling: pays.total >= 60000,
      w9OnFile: s.w9_collected ?? false,
      paymentCount: pays.count,
    })
  }

  return reports.sort((a, b) => b.box1NecCents - a.box1NecCents)
}

export async function get1099NECFilingSummary(taxYear: number): Promise<FilingSummary> {
  const reports = await generate1099NECReports(taxYear)

  return {
    totalContractors: reports.length,
    requiresFilingCount: reports.filter((r) => r.requiresFiling).length,
    missingW9Count: reports.filter((r) => r.requiresFiling && !r.w9OnFile).length,
    totalNecCents: reports.reduce((s, r) => s + r.box1NecCents, 0),
  }
}

export async function export1099NECToCSV(taxYear: number): Promise<string> {
  const reports = await generate1099NECReports(taxYear)

  const header = [
    'Tax Year',
    'Recipient Name',
    'Business Name',
    'TIN Type',
    'TIN (Last 4)',
    'Full TIN (Accountant Use)',
    'Address',
    'Box 1 - Nonemployee Compensation',
    'Requires 1099 Filing (>=600)',
    'W-9 On File',
    'Payment Count',
  ].join(',')

  const rows = reports.map((r) =>
    csvRowSafe([
      r.taxYear,
      r.recipientName,
      r.recipientBusinessName ?? '',
      r.recipientTinType ?? '',
      r.recipientTinDisplay,
      r.recipientTinFull ?? '',
      r.recipientAddress,
      (r.box1NecCents / 100).toFixed(2),
      r.requiresFiling ? 'YES' : 'NO',
      r.w9OnFile ? 'YES' : 'NO',
      r.paymentCount,
    ])
  )

  const disclaimer = [
    `"DISCLAIMER: This report is for reference only. File 1099-NEC with the IRS using approved software or your accountant."`,
    `"Generated: ${new Date().toISOString()}"`,
    '',
  ]

  return [...disclaimer, header, ...rows].join('\n')
}

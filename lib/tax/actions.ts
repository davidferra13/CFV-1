// Tax Workflow - Server Actions
// IRS-compliant mileage logging, quarterly tax estimate computation,
// and accountant-ready annual export.
// NOTE: Tax estimates are approximations only. Always consult a CPA.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns'

// 2025 IRS standard mileage rate: $0.70/mile = 70 cents
const IRS_RATE_CENTS_PER_MILE = 70

const MileageSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  from_address: z.string().min(1, 'From address required'),
  to_address: z.string().min(1, 'To address required'),
  miles: z.number().positive('Miles must be positive'),
  purpose: z.enum(['shopping', 'event', 'meeting', 'admin', 'equipment', 'other']),
  event_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

const TaxSettingsSchema = z.object({
  tax_year: z.number().int().min(2020).max(2030),
  filing_status: z.enum(['single', 'married_jointly', 'married_separately', 'head_of_household']),
  home_office_sqft: z.number().int().positive().nullable().optional(),
  home_total_sqft: z.number().int().positive().nullable().optional(),
})

export type MileageInput = z.infer<typeof MileageSchema>
export type TaxSettingsInput = z.infer<typeof TaxSettingsSchema>

// ============================================
// MILEAGE LOG
// ============================================

export async function logMileage(input: MileageInput) {
  const user = await requireChef()
  const validated = MileageSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('mileage_logs')
    .insert({
      chef_id: user.tenantId!,
      ...validated,
      irs_rate_cents_per_mile: IRS_RATE_CENTS_PER_MILE,
    })
    .select()
    .single()

  if (error) {
    console.error('[logMileage] Error:', error)
    throw new Error('Failed to log mileage')
  }

  revalidatePath('/finance/tax')
  return data
}

export async function deleteMileageLog(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.from('mileage_logs').delete().eq('id', id).eq('chef_id', user.tenantId!)
  revalidatePath('/finance/tax')
}

export async function getMileageForPeriod(startDate: string, endDate: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('mileage_logs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: false })

  if (error) throw new Error('Failed to load mileage logs')

  const logs = data ?? []
  const totalMiles = logs.reduce((sum: number, l: any) => sum + Number(l.miles), 0)
  const totalDeductionCents = logs.reduce(
    (sum: number, l: any) => sum + (l.deduction_cents ?? 0),
    0
  )

  return { logs, totalMiles, totalDeductionCents }
}

export async function getYearlyMileageSummary(year: number) {
  const start = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd')
  const end = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd')
  return getMileageForPeriod(start, end)
}

// ============================================
// TAX SETTINGS
// ============================================

export async function saveTaxSettings(input: TaxSettingsInput) {
  const user = await requireChef()
  const validated = TaxSettingsSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tax_settings')
    .upsert({ chef_id: user.tenantId!, ...validated }, { onConflict: 'chef_id,tax_year' })
    .select()
    .single()

  if (error) throw new Error('Failed to save tax settings')
  revalidatePath('/finance/tax')
  return data
}

export async function getTaxSettings(year: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('tax_settings')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', year)
    .maybeSingle()

  return data
}

// ============================================
// QUARTERLY ESTIMATE (approximation)
// ============================================

/**
 * Rough self-employment tax estimate for a quarter.
 * Uses ledger income minus expenses as net profit, then applies SE tax rate.
 * This is a directional estimate - not tax advice.
 */
export async function computeQuarterlyEstimate(year: number, quarter: 1 | 2 | 3 | 4) {
  const user = await requireChef()
  const db: any = createServerClient()

  const quarterDate = new Date(year, (quarter - 1) * 3, 1)
  const start = format(startOfQuarter(quarterDate), 'yyyy-MM-dd')
  const end = format(endOfQuarter(quarterDate), 'yyyy-MM-dd')

  // Gross income from ledger (payments received)
  const { data: ledgerData } = await db
    .from('ledger_entries')
    .select('amount_cents, entry_type')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', start + 'T00:00:00Z')
    .lte('created_at', end + 'T23:59:59Z')
    .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment', 'tip', 'add_on'])

  const grossIncomeCents = (ledgerData ?? []).reduce((sum: any, e: any) => sum + e.amount_cents, 0)

  // Deductible expenses
  const { data: expenseData } = await db
    .from('expenses')
    .select('amount_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', start)
    .lte('expense_date', end)

  const totalExpensesCents = (expenseData ?? []).reduce(
    (sum: any, e: any) => sum + e.amount_cents,
    0
  )

  // Mileage deduction
  const { totalDeductionCents: mileageDeductionCents } = await getMileageForPeriod(start, end)

  // Net profit
  const netProfitCents = Math.max(0, grossIncomeCents - totalExpensesCents - mileageDeductionCents)

  // SE tax = 15.3% on 92.35% of net profit
  const seTaxCents = Math.round(netProfitCents * 0.9235 * 0.153)

  // SE deduction = 50% of SE tax (reduces income tax basis)
  const seDeductionCents = Math.round(seTaxCents * 0.5)
  const taxableIncomeCents = Math.max(0, netProfitCents - seDeductionCents)

  // Rough income tax at 22% bracket (single filer approximation)
  const incomeTaxCents = Math.round(taxableIncomeCents * 0.22)

  const totalEstimatedCents = seTaxCents + incomeTaxCents

  return {
    quarter,
    year,
    period: { start, end },
    grossIncomeCents,
    totalExpensesCents,
    mileageDeductionCents,
    netProfitCents,
    seTaxCents,
    incomeTaxCents,
    totalEstimatedCents,
    disclaimer:
      'This is a rough estimate for planning purposes only. Consult a CPA for accurate tax advice.',
  }
}

// ============================================
// ACCOUNTANT EXPORT
// ============================================

/**
 * Generates a structured summary ready for a CPA.
 * Returns a plain JS object that can be serialized to JSON or CSV.
 */
export async function generateAccountantExport(year: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  const start = `${year}-01-01`
  const end = `${year}-12-31`

  // Monthly income
  const { data: ledgerData } = await db
    .from('ledger_entries')
    .select('amount_cents, entry_type, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', start + 'T00:00:00Z')
    .lte('created_at', end + 'T23:59:59Z')

  const incomeEntries = (ledgerData ?? []).filter((e: any) =>
    ['payment', 'deposit', 'installment', 'final_payment', 'tip', 'add_on'].includes(e.entry_type)
  )
  const refundEntries = (ledgerData ?? []).filter((e: any) => e.entry_type === 'refund')

  const grossIncomeCents = incomeEntries.reduce((sum: any, e: any) => sum + e.amount_cents, 0)
  const totalRefundsCents = refundEntries.reduce((sum: any, e: any) => sum + e.amount_cents, 0)
  const netIncomeCents = grossIncomeCents - totalRefundsCents

  // Monthly breakdown
  const monthlyIncome: Record<string, number> = {}
  for (const entry of incomeEntries) {
    const month = entry.created_at.slice(0, 7) // YYYY-MM
    monthlyIncome[month] = (monthlyIncome[month] ?? 0) + entry.amount_cents
  }

  // Expenses by category
  const { data: expenseData } = await db
    .from('expenses')
    .select('amount_cents, category, expense_date')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', start)
    .lte('expense_date', end)

  const expensesByCategory: Record<string, number> = {}
  let totalExpensesCents = 0
  for (const exp of expenseData ?? []) {
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] ?? 0) + exp.amount_cents
    totalExpensesCents += exp.amount_cents
  }

  // Mileage
  const {
    totalMiles,
    totalDeductionCents: mileageDeductionCents,
    logs: mileageLogs,
  } = await getYearlyMileageSummary(year)

  const netProfitCents = netIncomeCents - totalExpensesCents - mileageDeductionCents

  return {
    tax_year: year,
    generated_at: new Date().toISOString(),
    income: {
      gross_income_cents: grossIncomeCents,
      total_refunds_cents: totalRefundsCents,
      net_income_cents: netIncomeCents,
      by_month: monthlyIncome,
    },
    expenses: {
      total_cents: totalExpensesCents,
      by_category: expensesByCategory,
    },
    mileage: {
      total_miles: totalMiles,
      irs_rate_cents_per_mile: IRS_RATE_CENTS_PER_MILE,
      total_deduction_cents: mileageDeductionCents,
      log_count: mileageLogs.length,
    },
    summary: {
      net_profit_cents: netProfitCents,
      disclaimer: 'For CPA reference only. Verify all figures before filing.',
    },
  }
}

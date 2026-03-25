'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type QuarterlyEstimate = {
  id: string
  taxYear: number
  quarter: number
  estimatedIncomeCents: number
  estimatedSeTaxCents: number
  estimatedFederalCents: number
  estimatedStateCents: number
  amountPaidCents: number
  dueDate: string
  paidAt: string | null
}

export type TaxYearSummary = {
  year: number
  totalIncomeCents: number
  totalSeTaxCents: number
  totalFederalCents: number
  totalStateCents: number
  totalPaidCents: number
  totalOwedCents: number
  quarters: QuarterlyEstimate[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const SaveEstimateSchema = z.object({
  taxYear: z.number().min(2024).max(2030),
  quarter: z.number().min(1).max(4),
  estimatedIncomeCents: z.number().int().min(0),
  estimatedSeTaxCents: z.number().int().min(0),
  estimatedFederalCents: z.number().int().min(0),
  estimatedStateCents: z.number().int().min(0),
})

const RecordPaymentSchema = z.object({
  taxYear: z.number().min(2024).max(2030),
  quarter: z.number().min(1).max(4),
  amountPaidCents: z.number().int().min(0),
})

// ─── Helpers ─────────────────────────────────────────────────────

function quarterDueDate(year: number, quarter: number): string {
  const dates: Record<number, string> = {
    1: `${year}-04-15`,
    2: `${year}-06-15`,
    3: `${year}-09-15`,
    4: `${year + 1}-01-15`,
  }
  return dates[quarter] || `${year}-12-31`
}

function mapRow(row: any): QuarterlyEstimate {
  return {
    id: row.id,
    taxYear: row.tax_year,
    quarter: row.quarter,
    estimatedIncomeCents: row.estimated_income_cents,
    estimatedSeTaxCents: row.estimated_se_tax_cents,
    estimatedFederalCents: row.estimated_federal_cents,
    estimatedStateCents: row.estimated_state_cents,
    amountPaidCents: row.amount_paid_cents,
    dueDate: row.due_date,
    paidAt: row.paid_at,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

export async function getQuarterlyEstimate(
  taxYear: number,
  quarter: number
): Promise<QuarterlyEstimate | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tax_quarterly_estimates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .eq('quarter', quarter)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch estimate: ${error.message}`)
  if (!data) return null

  return mapRow(data)
}

export async function saveQuarterlyEstimate(
  input: z.infer<typeof SaveEstimateSchema>
): Promise<QuarterlyEstimate> {
  const user = await requireChef()
  const parsed = SaveEstimateSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tax_quarterly_estimates')
    .upsert(
      {
        chef_id: user.tenantId!,
        tax_year: parsed.taxYear,
        quarter: parsed.quarter,
        estimated_income_cents: parsed.estimatedIncomeCents,
        estimated_se_tax_cents: parsed.estimatedSeTaxCents,
        estimated_federal_cents: parsed.estimatedFederalCents,
        estimated_state_cents: parsed.estimatedStateCents,
        due_date: quarterDueDate(parsed.taxYear, parsed.quarter),
      },
      { onConflict: 'chef_id,tax_year,quarter' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save estimate: ${error.message}`)

  revalidatePath('/finance/tax/quarterly')
  return mapRow(data)
}

export async function recordQuarterlyPayment(
  input: z.infer<typeof RecordPaymentSchema>
): Promise<QuarterlyEstimate> {
  const user = await requireChef()
  const parsed = RecordPaymentSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tax_quarterly_estimates')
    .update({
      amount_paid_cents: parsed.amountPaidCents,
      paid_at: new Date().toISOString(),
    })
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', parsed.taxYear)
    .eq('quarter', parsed.quarter)
    .select()
    .single()

  if (error) throw new Error(`Failed to record payment: ${error.message}`)

  revalidatePath('/finance/tax/quarterly')
  return mapRow(data)
}

export async function getTaxSummaryForYear(taxYear: number): Promise<TaxYearSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tax_quarterly_estimates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .order('quarter', { ascending: true })

  if (error) throw new Error(`Failed to fetch tax summary: ${error.message}`)

  const quarters = (data || []).map(mapRow)

  const totalIncomeCents = quarters.reduce(
    (s: number, q: QuarterlyEstimate) => s + q.estimatedIncomeCents,
    0
  )
  const totalSeTaxCents = quarters.reduce(
    (s: number, q: QuarterlyEstimate) => s + q.estimatedSeTaxCents,
    0
  )
  const totalFederalCents = quarters.reduce(
    (s: number, q: QuarterlyEstimate) => s + q.estimatedFederalCents,
    0
  )
  const totalStateCents = quarters.reduce(
    (s: number, q: QuarterlyEstimate) => s + q.estimatedStateCents,
    0
  )
  const totalPaidCents = quarters.reduce(
    (s: number, q: QuarterlyEstimate) => s + q.amountPaidCents,
    0
  )
  const totalOwedCents = totalSeTaxCents + totalFederalCents + totalStateCents - totalPaidCents

  return {
    year: taxYear,
    totalIncomeCents,
    totalSeTaxCents,
    totalFederalCents,
    totalStateCents,
    totalPaidCents,
    totalOwedCents,
    quarters,
  }
}

export async function exportTaxPackage(taxYear: number): Promise<{
  summary: TaxYearSummary
  contractorPayments: any[]
  mileageLogs: any[]
  expensesByCategory: Record<string, number>
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const summary = await getTaxSummaryForYear(taxYear)

  // Contractor payments for 1099s
  const { data: contractors } = await db
    .from('contractor_payments')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .order('payment_date', { ascending: true })

  // Mileage logs
  const { data: mileage } = await db
    .from('mileage_logs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('driven_at', `${taxYear}-01-01`)
    .lte('driven_at', `${taxYear}-12-31`)

  // Expenses grouped by category
  const { data: expenses } = await db
    .from('expenses')
    .select('category, amount_cents')
    .eq('chef_id', user.tenantId!)
    .gte('expense_date', `${taxYear}-01-01`)
    .lte('expense_date', `${taxYear}-12-31`)

  const expensesByCategory: Record<string, number> = {}
  for (const e of expenses || []) {
    const cat = (e as any).category || 'uncategorized'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + ((e as any).amount_cents || 0)
  }

  return {
    summary,
    contractorPayments: contractors || [],
    mileageLogs: mileage || [],
    expensesByCategory,
  }
}

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Schedule C Line Definitions ──────────────────────────────────

export const SCHEDULE_C_LINES: Record<
  string,
  { label: string; description: string; deductiblePct: number }
> = {
  line_8: {
    label: 'Line 8: Advertising',
    description: 'Marketing, website, business cards, social media ads',
    deductiblePct: 100,
  },
  line_9: {
    label: 'Line 9: Car/Truck Expenses',
    description: 'Mileage deduction (standard rate) or actual vehicle costs',
    deductiblePct: 100,
  },
  line_13: {
    label: 'Line 13: Depreciation',
    description: 'Equipment depreciation (ovens, mixers, tools)',
    deductiblePct: 100,
  },
  line_15: {
    label: 'Line 15: Insurance',
    description: 'Business liability, commercial auto, health (if self-employed)',
    deductiblePct: 100,
  },
  line_17: {
    label: 'Line 17: Legal/Professional',
    description: 'Accountant fees, legal counsel, bookkeeping',
    deductiblePct: 100,
  },
  line_18: {
    label: 'Line 18: Office Expense',
    description: 'Office supplies, printer ink, postage',
    deductiblePct: 100,
  },
  line_22: {
    label: 'Line 22: Supplies',
    description: 'Food, ingredients, kitchen supplies, disposables',
    deductiblePct: 100,
  },
  line_24a: {
    label: 'Line 24a: Travel',
    description: 'Flights, hotels, transportation for business trips',
    deductiblePct: 100,
  },
  line_24b: {
    label: 'Line 24b: Meals',
    description: 'Business meals (50% deductible)',
    deductiblePct: 50,
  },
  line_25: {
    label: 'Line 25: Utilities',
    description: 'Home office utilities (proportional)',
    deductiblePct: 100,
  },
  line_27a: {
    label: 'Line 27a: Other Expenses',
    description: 'Certifications, software subscriptions, uniforms, continuing education',
    deductiblePct: 100,
  },
  cogs: {
    label: 'Cost of Goods Sold',
    description: 'Direct food/ingredient costs for events (Part III)',
    deductiblePct: 100,
  },
}

// ── Expense category to Schedule C line mapping ──────────────────

const EXPENSE_CATEGORY_TO_LINE: Record<string, string> = {
  groceries: 'cogs',
  alcohol: 'cogs',
  specialty_items: 'cogs',
  gas_mileage: 'line_9',
  equipment: 'line_13',
  supplies: 'line_22',
  other: 'line_27a',
  vehicle: 'line_9',
  venue_rental: 'line_27a',
  subscriptions: 'line_27a',
  marketing: 'line_8',
  labor: 'line_27a',
  insurance_licenses: 'line_15',
  professional_services: 'line_17',
  education: 'line_27a',
  uniforms: 'line_27a',
  utilities: 'line_25',
}

// ── Types ────────────────────────────────────────────────────────

export type ScheduleCLineItem = {
  line: string
  label: string
  description: string
  totalCents: number
  deductibleCents: number
  deductiblePct: number
  itemCount: number
}

export type ScheduleCBreakdown = {
  year: number
  lines: ScheduleCLineItem[]
  totalExpenseCents: number
  totalDeductibleCents: number
  mileageDeductionCents: number
}

export type QuarterlyEstimateRow = {
  id: string
  taxYear: number
  quarter: number
  estimatedIncomeCents: number
  estimatedTaxCents: number
  paidCents: number
  dueDate: string
  paidAt: string | null
  status: 'upcoming' | 'due' | 'paid' | 'overdue'
}

export type TaxPrepSummary = {
  year: number
  totalRevenueCents: number
  totalTipsCents: number
  grossIncomeCents: number
  scheduleCBreakdown: ScheduleCBreakdown
  estimatedTaxableIncomeCents: number
  quarterlyEstimates: QuarterlyEstimateRow[]
  contractorCount: number
  contractorTotalCents: number
  needs1099Count: number
}

// ── Schemas ──────────────────────────────────────────────────────

const CategorizeExpenseSchema = z.object({
  expenseDescription: z.string().min(1).max(500),
  scheduleCLine: z.string(),
  amountCents: z.number().int().positive(),
  taxYear: z.number().int().min(2020).max(2035),
  quarter: z.number().int().min(1).max(4).nullable().optional(),
  source: z.enum(['ledger', 'manual', 'mileage', 'expense']).default('manual'),
  sourceId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const UpdatePaymentSchema = z.object({
  estimateId: z.string().uuid(),
  paidCents: z.number().int().min(0),
  paidAt: z.string().nullable().optional(),
})

// ── Helpers ──────────────────────────────────────────────────────

function quarterDueDate(year: number, quarter: number): string {
  const dates: Record<number, string> = {
    1: `${year}-04-15`,
    2: `${year}-06-15`,
    3: `${year}-09-15`,
    4: `${year + 1}-01-15`,
  }
  return dates[quarter] || `${year}-12-31`
}

function computeEstimateStatus(
  dueDate: string,
  paidCents: number,
  estimatedTaxCents: number
): 'upcoming' | 'due' | 'paid' | 'overdue' {
  if (paidCents >= estimatedTaxCents && estimatedTaxCents > 0) return 'paid'
  const now = new Date()
  const due = new Date(dueDate)
  if (now > due) return 'overdue'
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  if (due <= thirtyDaysOut) return 'due'
  return 'upcoming'
}

// ── Actions ──────────────────────────────────────────────────────

/**
 * Get Schedule C breakdown by aggregating:
 * 1. Manual categorizations from expense_tax_categories
 * 2. Expenses from the expenses table (auto-mapped by category)
 * 3. Mileage deductions from mileage_logs
 */
export async function getScheduleCBreakdown(year: number): Promise<ScheduleCBreakdown> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // 1. Manual tax categorizations
  const { data: manualCats } = await supabase
    .from('expense_tax_categories')
    .select('schedule_c_line, amount_cents')
    .eq('tenant_id', tenantId)
    .eq('tax_year', year)

  // 2. Expenses table (auto-map by category)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('category, amount_cents')
    .eq('tenant_id', tenantId)
    .eq('is_business', true)
    .gte('expense_date', yearStart)
    .lte('expense_date', yearEnd)

  // 3. Mileage logs
  const { data: mileageLogs } = await supabase
    .from('mileage_logs')
    .select('deduction_cents')
    .eq('chef_id', tenantId)
    .gte('log_date', yearStart)
    .lte('log_date', yearEnd)

  // Aggregate by Schedule C line
  const lineMap = new Map<string, { totalCents: number; count: number }>()

  // Manual categorizations
  for (const cat of manualCats || []) {
    const line = cat.schedule_c_line as string
    const existing = lineMap.get(line) || { totalCents: 0, count: 0 }
    existing.totalCents += cat.amount_cents || 0
    existing.count++
    lineMap.set(line, existing)
  }

  // Auto-mapped expenses
  for (const exp of expenses || []) {
    const line = EXPENSE_CATEGORY_TO_LINE[exp.category as string] || 'line_27a'
    const existing = lineMap.get(line) || { totalCents: 0, count: 0 }
    existing.totalCents += exp.amount_cents || 0
    existing.count++
    lineMap.set(line, existing)
  }

  // Mileage deductions go to line_9
  let mileageDeductionCents = 0
  for (const ml of mileageLogs || []) {
    mileageDeductionCents += ml.deduction_cents || 0
  }
  if (mileageDeductionCents > 0) {
    const existing = lineMap.get('line_9') || { totalCents: 0, count: 0 }
    existing.totalCents += mileageDeductionCents
    existing.count++
    lineMap.set('line_9', existing)
  }

  // Build line items
  const lines: ScheduleCLineItem[] = []
  let totalExpenseCents = 0
  let totalDeductibleCents = 0

  for (const [lineKey, data] of lineMap.entries()) {
    const lineInfo = SCHEDULE_C_LINES[lineKey]
    if (!lineInfo) continue
    const deductibleCents = Math.round(data.totalCents * (lineInfo.deductiblePct / 100))
    lines.push({
      line: lineKey,
      label: lineInfo.label,
      description: lineInfo.description,
      totalCents: data.totalCents,
      deductibleCents,
      deductiblePct: lineInfo.deductiblePct,
      itemCount: data.count,
    })
    totalExpenseCents += data.totalCents
    totalDeductibleCents += deductibleCents
  }

  // Sort by line number
  lines.sort((a, b) => a.line.localeCompare(b.line))

  return {
    year,
    lines,
    totalExpenseCents,
    totalDeductibleCents,
    mileageDeductionCents,
  }
}

/**
 * Manually categorize an expense into a Schedule C line.
 */
export async function categorizeExpense(input: z.infer<typeof CategorizeExpenseSchema>) {
  const user = await requireChef()
  const parsed = CategorizeExpenseSchema.parse(input)
  const supabase: any = createServerClient()

  if (!SCHEDULE_C_LINES[parsed.scheduleCLine]) {
    throw new Error(`Invalid Schedule C line: ${parsed.scheduleCLine}`)
  }

  const { data, error } = await supabase
    .from('expense_tax_categories')
    .insert({
      tenant_id: user.tenantId!,
      expense_description: parsed.expenseDescription,
      schedule_c_line: parsed.scheduleCLine,
      amount_cents: parsed.amountCents,
      tax_year: parsed.taxYear,
      quarter: parsed.quarter || null,
      source: parsed.source,
      source_id: parsed.sourceId || null,
      notes: parsed.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to categorize expense: ${error.message}`)

  revalidatePath('/finance/tax')
  return data
}

/**
 * Get quarterly estimate records for a tax year.
 * Creates them if they do not exist yet.
 */
export async function getQuarterlyEstimates(year: number): Promise<QuarterlyEstimateRow[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: existing, error } = await supabase
    .from('tax_quarterly_estimates')
    .select('*')
    .eq('chef_id', tenantId)
    .eq('tax_year', year)
    .order('quarter', { ascending: true })

  if (error) throw new Error(`Failed to fetch estimates: ${error.message}`)

  // If we have all 4 quarters, return them
  if (existing && existing.length === 4) {
    return existing.map(mapEstimateRow)
  }

  // Create missing quarters
  const existingQuarters = new Set((existing || []).map((r: any) => r.quarter))
  const toInsert = []
  for (let q = 1; q <= 4; q++) {
    if (!existingQuarters.has(q)) {
      toInsert.push({
        chef_id: tenantId,
        tax_year: year,
        quarter: q,
        estimated_income_cents: 0,
        estimated_se_tax_cents: 0,
        estimated_federal_cents: 0,
        estimated_state_cents: 0,
        amount_paid_cents: 0,
        due_date: quarterDueDate(year, q),
      })
    }
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('tax_quarterly_estimates').insert(toInsert)
    if (insertError) throw new Error(`Failed to create estimates: ${insertError.message}`)
  }

  // Re-fetch all
  const { data: all, error: refetchError } = await supabase
    .from('tax_quarterly_estimates')
    .select('*')
    .eq('chef_id', tenantId)
    .eq('tax_year', year)
    .order('quarter', { ascending: true })

  if (refetchError) throw new Error(`Failed to refetch estimates: ${refetchError.message}`)

  return (all || []).map(mapEstimateRow)
}

/**
 * Record a quarterly estimated tax payment.
 */
export async function updateQuarterlyPayment(input: z.infer<typeof UpdatePaymentSchema>) {
  const user = await requireChef()
  const parsed = UpdatePaymentSchema.parse(input)
  const supabase: any = createServerClient()

  const updateData: any = {
    amount_paid_cents: parsed.paidCents,
  }
  if (parsed.paidAt) {
    updateData.paid_at = parsed.paidAt
  } else if (parsed.paidCents > 0) {
    updateData.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('tax_quarterly_estimates')
    .update(updateData)
    .eq('id', parsed.estimateId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update payment: ${error.message}`)

  revalidatePath('/finance/tax')
  return mapEstimateRow(data)
}

/**
 * Full tax preparation summary for a year.
 * Revenue from ledger_entries, deductions from Schedule C breakdown,
 * quarterly estimate status, and 1099-NEC contractor info.
 */
export async function getTaxPrepSummary(year: number): Promise<TaxPrepSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // Parallel fetch: revenue, tips, contractors, Schedule C, quarterly estimates
  const [revenueResult, tipsResult, contractorResult, scheduleCBreakdown, quarterlyEstimates] =
    await Promise.all([
      // Revenue from completed events
      supabase
        .from('ledger_entries')
        .select('amount_cents')
        .eq('tenant_id', tenantId)
        .in('entry_type', ['payment', 'deposit'])
        .eq('is_refund', false)
        .gte('created_at', yearStart)
        .lte('created_at', `${yearEnd}T23:59:59`),
      // Tips
      supabase
        .from('ledger_entries')
        .select('amount_cents')
        .eq('tenant_id', tenantId)
        .eq('entry_type', 'tip')
        .eq('is_refund', false)
        .gte('created_at', yearStart)
        .lte('created_at', `${yearEnd}T23:59:59`),
      // Contractor payments (for 1099-NEC)
      supabase
        .from('contractor_payments')
        .select('staff_member_id, amount_cents')
        .eq('chef_id', tenantId)
        .eq('tax_year', year),
      // Schedule C
      getScheduleCBreakdown(year),
      // Quarterly estimates
      getQuarterlyEstimates(year),
    ])

  const totalRevenueCents = (revenueResult.data || []).reduce(
    (sum: number, r: any) => sum + (r.amount_cents || 0),
    0
  )
  const totalTipsCents = (tipsResult.data || []).reduce(
    (sum: number, t: any) => sum + (t.amount_cents || 0),
    0
  )
  const grossIncomeCents = totalRevenueCents + totalTipsCents

  // Contractor 1099 summary
  const contractorPayments = contractorResult.data || []
  const contractorTotals = new Map<string, number>()
  for (const cp of contractorPayments) {
    const current = contractorTotals.get(cp.staff_member_id) || 0
    contractorTotals.set(cp.staff_member_id, current + (cp.amount_cents || 0))
  }
  const contractorCount = contractorTotals.size
  const contractorTotalCents = Array.from(contractorTotals.values()).reduce((s, v) => s + v, 0)
  // 1099-NEC threshold: $600
  const needs1099Count = Array.from(contractorTotals.values()).filter(
    (total) => total >= 60000
  ).length

  const estimatedTaxableIncomeCents = Math.max(
    0,
    grossIncomeCents - scheduleCBreakdown.totalDeductibleCents
  )

  return {
    year,
    totalRevenueCents,
    totalTipsCents,
    grossIncomeCents,
    scheduleCBreakdown,
    estimatedTaxableIncomeCents,
    quarterlyEstimates,
    contractorCount,
    contractorTotalCents,
    needs1099Count,
  }
}

// ── Internal helpers ─────────────────────────────────────────────

function mapEstimateRow(row: any): QuarterlyEstimateRow {
  const estimatedTaxCents =
    (row.estimated_se_tax_cents || 0) +
    (row.estimated_federal_cents || 0) +
    (row.estimated_state_cents || 0)
  const paidCents = row.amount_paid_cents || 0
  const dueDate = row.due_date || ''

  return {
    id: row.id,
    taxYear: row.tax_year,
    quarter: row.quarter,
    estimatedIncomeCents: row.estimated_income_cents || 0,
    estimatedTaxCents,
    paidCents,
    dueDate,
    paidAt: row.paid_at || null,
    status: computeEstimateStatus(dueDate, paidCents, estimatedTaxCents),
  }
}

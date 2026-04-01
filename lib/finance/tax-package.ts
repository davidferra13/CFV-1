'use server'
// tax-package.ts
// Previously computed a CPA export using quoted_price_cents and a stale column
// name (date instead of expense_date). Both produced incorrect accounting figures.
// Now backed by the canonical CPA export dataset from lib/finance/cpa-export-actions.ts.
// The TaxPackage interface is preserved for existing consumers.

import { getCpaExportReadiness } from '@/lib/finance/cpa-export-actions'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export interface ExpenseCategory {
  category: string
  label: string
  irsCategoryCode: string
  amountCents: number
  count: number
}

export interface QuarterlyEstimate {
  quarter: string
  estimatedTaxCents: number
  dueDate: string
}

export interface MileageSummary {
  totalMiles: number
  totalDeductionCents: number
  irsRateCentsPerMile: number
}

export interface TaxPackage {
  taxYear: number
  grossRevenueCents: number
  tipsCents: number
  completedEventCount: number
  totalDeductibleExpensesCents: number
  expensesByCategory: ExpenseCategory[]
  quarterlyEstimates: QuarterlyEstimate[]
  mileage: MileageSummary
}

const IRS_RATE_CENTS_PER_MILE = 70 // 2025 IRS standard rate: $0.70/mile

/**
 * Returns a TaxPackage backed by the canonical cash-basis export dataset.
 * Does not use quoted_price_cents, event status, or the stale `date` column.
 */
export async function getYearEndTaxPackage(taxYear: number): Promise<TaxPackage> {
  const user = await requireChef()
  const db: any = createServerClient()

  const yearStart = `${taxYear}-01-01`
  const yearEnd = `${taxYear}-12-31`

  // Fetch readiness (gives canonical revenue/expense totals) alongside
  // the details needed for the full TaxPackage shape.
  const [readiness, expensesResult, mileageResult] = await Promise.all([
    getCpaExportReadiness(taxYear),
    db
      .from('expenses')
      .select('id, category, amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('is_business', true)
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd),
    db
      .from('mileage_logs')
      .select('miles, deduction_cents')
      .eq('chef_id', user.tenantId!)
      .gte('log_date', yearStart)
      .lte('log_date', yearEnd),
  ])

  const s = readiness.scheduleCSummary
  const expenses: any[] = expensesResult.data ?? []
  const mileageLogs: any[] = mileageResult.data ?? []

  // Build expensesByCategory from actual expense rows
  const catMap = new Map<string, { amount: number; count: number }>()
  for (const exp of expenses) {
    const cat = (exp.category as string) || 'other'
    const existing = catMap.get(cat) || { amount: 0, count: 0 }
    existing.amount += exp.amount_cents || 0
    existing.count++
    catMap.set(cat, existing)
  }

  const expensesByCategory: ExpenseCategory[] = Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      label: category.replace(/_/g, ' '),
      irsCategoryCode: 'Schedule C',
      amountCents: data.amount,
      count: data.count,
    }))
    .sort((a, b) => b.amountCents - a.amountCents)

  // Mileage from actual logs
  let totalMiles = 0
  let totalDeductionCents = 0
  for (const ml of mileageLogs) {
    totalMiles += parseFloat(String(ml.miles ?? 0)) || 0
    totalDeductionCents += ml.deduction_cents ?? 0
  }

  // Quarterly estimates at a rough 25% effective rate
  const netIncomeCents = Math.max(
    0,
    s.netRevenueCents + s.tipsCents - s.totalDeductibleExpensesCents
  )
  const annualTax = Math.round(netIncomeCents * 0.25)
  const qTax = Math.round(annualTax / 4)
  const quarterlyEstimates: QuarterlyEstimate[] = [
    { quarter: 'Q1', estimatedTaxCents: qTax, dueDate: 'April 15' },
    { quarter: 'Q2', estimatedTaxCents: qTax, dueDate: 'June 15' },
    { quarter: 'Q3', estimatedTaxCents: qTax, dueDate: 'September 15' },
    { quarter: 'Q4', estimatedTaxCents: annualTax - qTax * 3, dueDate: 'January 15' },
  ]

  return {
    taxYear,
    grossRevenueCents: s.netRevenueCents,
    tipsCents: s.tipsCents,
    completedEventCount: 0,
    totalDeductibleExpensesCents: s.totalDeductibleExpensesCents,
    expensesByCategory,
    quarterlyEstimates,
    mileage: {
      totalMiles,
      totalDeductionCents,
      irsRateCentsPerMile: IRS_RATE_CENTS_PER_MILE,
    },
  }
}

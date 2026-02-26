'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { startOfYear, endOfYear, format } from 'date-fns'
import { getYearlyMileageSummary } from '@/lib/tax/actions'

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

const IRS_CATEGORY_MAP: Record<string, { label: string; code: string }> = {
  ingredients: { label: 'Cost of Goods Sold (Groceries)', code: 'Part III, Line 36' },
  equipment: { label: 'Tools & Equipment', code: 'Line 22' },
  transportation: { label: 'Transportation & Travel', code: 'Line 24a' },
  marketing: { label: 'Advertising & Marketing', code: 'Line 8' },
  education: { label: 'Professional Development', code: 'Line 27a' },
  software: { label: 'Software & Subscriptions', code: 'Line 27a' },
  uniforms: { label: 'Work Clothing', code: 'Line 27a' },
  insurance: { label: 'Business Insurance', code: 'Line 15' },
  professional_services: { label: 'Legal & Professional Fees', code: 'Line 17' },
  office: { label: 'Office Supplies', code: 'Line 18' },
  other: { label: 'Other Business Expenses', code: 'Line 27a' },
}

export async function getYearEndTaxPackage(taxYear: number): Promise<TaxPackage> {
  const user = await requireChef()
  const supabase = createServerClient()

  const yearStart = startOfYear(new Date(taxYear, 0, 1))
    .toISOString()
    .split('T')[0]
  const yearEnd = endOfYear(new Date(taxYear, 11, 31))
    .toISOString()
    .split('T')[0]

  const [eventsResult, expensesResult, tipsResult, mileageData] = await Promise.all([
    supabase
      .from('events')
      .select('quoted_price_cents, status')
      .eq('tenant_id', user.entityId)
      .eq('status', 'completed')
      .gte('event_date', yearStart)
      .lte('event_date', yearEnd),
    supabase
      .from('expenses')
      .select('amount_cents, category')
      .eq('tenant_id', user.entityId)
      .gte('date', yearStart)
      .lte('date', yearEnd),
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', user.entityId)
      .eq('entry_type', 'tip')
      .eq('is_refund', false)
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd),
    getYearlyMileageSummary(taxYear),
  ])

  const completedEvents = eventsResult.data || []
  const expenses = expensesResult.data || []
  const tips = tipsResult.data || []
  const { totalMiles, totalDeductionCents: mileageDeductionCents } = mileageData

  const grossRevenueCents = completedEvents.reduce((s, e) => s + (e.quoted_price_cents || 0), 0)
  const tipsCents = tips.reduce((s, t) => s + (t.amount_cents || 0), 0)
  const completedEventCount = completedEvents.length

  // Group expenses by category
  const categoryMap = new Map<string, { amount: number; count: number }>()
  for (const expense of expenses) {
    const cat = (expense.category as string) || 'other'
    const existing = categoryMap.get(cat) || { amount: 0, count: 0 }
    existing.amount += expense.amount_cents || 0
    existing.count++
    categoryMap.set(cat, existing)
  }

  const expensesByCategory: ExpenseCategory[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      label: IRS_CATEGORY_MAP[category]?.label || category,
      irsCategoryCode: IRS_CATEGORY_MAP[category]?.code || 'Line 27a',
      amountCents: data.amount,
      count: data.count,
    }))
    .sort((a, b) => b.amountCents - a.amountCents)

  const totalDeductibleExpensesCents =
    expensesByCategory.reduce((s, c) => s + c.amountCents, 0) + mileageDeductionCents
  const netIncomeCents = Math.max(0, grossRevenueCents + tipsCents - totalDeductibleExpensesCents)
  const estimatedAnnualTax = Math.round(netIncomeCents * 0.25)
  const quarterlyTax = Math.round(estimatedAnnualTax / 4)

  const quarterlyEstimates: QuarterlyEstimate[] = [
    { quarter: 'Q1', estimatedTaxCents: quarterlyTax, dueDate: 'April 15' },
    { quarter: 'Q2', estimatedTaxCents: quarterlyTax, dueDate: 'June 15' },
    { quarter: 'Q3', estimatedTaxCents: quarterlyTax, dueDate: 'September 15' },
    {
      quarter: 'Q4',
      estimatedTaxCents: estimatedAnnualTax - quarterlyTax * 3,
      dueDate: 'January 15',
    },
  ]

  return {
    taxYear,
    grossRevenueCents,
    tipsCents,
    completedEventCount,
    totalDeductibleExpensesCents,
    expensesByCategory,
    quarterlyEstimates,
    mileage: {
      totalMiles,
      totalDeductionCents: mileageDeductionCents,
      irsRateCentsPerMile: 70, // 2025 IRS standard rate: $0.70/mile
    },
  }
}

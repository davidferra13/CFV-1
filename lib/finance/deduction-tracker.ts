'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { startOfYear, endOfYear } from 'date-fns'

export interface DeductionCategory {
  category: string
  label: string
  amountCents: number
  count: number
  irsCategoryCode: string
}

export interface DeductionSummary {
  taxYear: number
  categories: DeductionCategory[]
  mileageDeductionCents: number
  mileageTrips: number
  totalMiles: number
  homeOfficeDeductionCents: number
  homeOfficeMethod: string | null
  depreciationDeductionCents: number
  depreciationAssets: number
  totalDeductionsCents: number
}

const IRS_CATEGORY_MAP: Record<string, { label: string; code: string }> = {
  ingredients: { label: 'Cost of Goods Sold', code: 'Part III, Line 36' },
  equipment: { label: 'Tools & Equipment', code: 'Line 22' },
  transportation: { label: 'Transportation', code: 'Line 24a' },
  marketing: { label: 'Advertising', code: 'Line 8' },
  education: { label: 'Education', code: 'Line 27a' },
  software: { label: 'Software & Subscriptions', code: 'Line 27a' },
  uniforms: { label: 'Work Clothing', code: 'Line 27a' },
  insurance: { label: 'Business Insurance', code: 'Line 15' },
  professional_services: { label: 'Professional Fees', code: 'Line 17' },
  office: { label: 'Office Supplies', code: 'Line 18' },
  rent: { label: 'Rent or Lease', code: 'Line 20b' },
  utilities: { label: 'Utilities', code: 'Line 25' },
  repairs: { label: 'Repairs & Maintenance', code: 'Line 21' },
  other: { label: 'Other Expenses', code: 'Line 27a' },
}

/**
 * Get a unified deduction summary across all sources for a tax year.
 * Aggregates: expenses, mileage, home office, and equipment depreciation.
 */
export async function getDeductionSummary(taxYear: number): Promise<DeductionSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const yearStart = startOfYear(new Date(taxYear, 0, 1))
    .toISOString()
    .split('T')[0]
  const yearEnd = endOfYear(new Date(taxYear, 11, 31))
    .toISOString()
    .split('T')[0]

  // Parallel data fetches
  const [expensesResult, mileageResult, homeOfficeResult, depreciationResult] = await Promise.all([
    // Business expenses by category
    supabase
      .from('expenses')
      .select('amount_cents, category')
      .eq('tenant_id', tenantId)
      .gte('date', yearStart)
      .lte('date', yearEnd),

    // Mileage logs
    supabase
      .from('mileage_logs')
      .select('miles, deduction_cents')
      .eq('chef_id', tenantId)
      .gte('trip_date', yearStart)
      .lte('trip_date', yearEnd),

    // Home office settings
    supabase
      .from('tax_settings')
      .select('home_office_sqft, home_office_method, home_office_actual_expenses_cents')
      .eq('chef_id', tenantId)
      .eq('tax_year', taxYear)
      .maybeSingle(),

    // Equipment depreciation
    supabase
      .from('equipment_items')
      .select('purchase_price_cents, useful_life_years')
      .eq('chef_id', tenantId)
      .not('purchase_price_cents', 'is', null)
      .not('useful_life_years', 'is', null),
  ])

  // Expense categories
  const expenses = expensesResult.data ?? []
  const categoryMap = new Map<string, { amount: number; count: number }>()
  for (const exp of expenses) {
    const cat = (exp.category as string) || 'other'
    const entry = categoryMap.get(cat) ?? { amount: 0, count: 0 }
    entry.amount += exp.amount_cents ?? 0
    entry.count++
    categoryMap.set(cat, entry)
  }
  const categories: DeductionCategory[] = Array.from(categoryMap.entries())
    .map(([cat, data]) => ({
      category: cat,
      label: IRS_CATEGORY_MAP[cat]?.label ?? cat,
      amountCents: data.amount,
      count: data.count,
      irsCategoryCode: IRS_CATEGORY_MAP[cat]?.code ?? 'Line 27a',
    }))
    .sort((a, b) => b.amountCents - a.amountCents)

  // Mileage
  const mileageLogs = mileageResult.data ?? []
  const mileageTrips = mileageLogs.length
  const totalMiles = mileageLogs.reduce((s: number, m: any) => s + (m.miles ?? 0), 0)
  const mileageDeductionCents = mileageLogs.reduce(
    (s: number, m: any) => s + (m.deduction_cents ?? 0),
    0
  )

  // Home office
  let homeOfficeDeductionCents = 0
  let homeOfficeMethod: string | null = null
  if (homeOfficeResult.data) {
    const ho = homeOfficeResult.data
    homeOfficeMethod = ho.home_office_method ?? null
    if (ho.home_office_method === 'simplified') {
      // $5/sqft, max 300 sqft
      const sqft = Math.min(ho.home_office_sqft ?? 0, 300)
      homeOfficeDeductionCents = sqft * 500 // $5.00 per sqft
    } else if (ho.home_office_method === 'actual') {
      homeOfficeDeductionCents = ho.home_office_actual_expenses_cents ?? 0
    }
  }

  // Equipment depreciation (straight-line annual)
  const equipmentItems = depreciationResult.data ?? []
  let depreciationDeductionCents = 0
  let depreciationAssets = 0
  for (const item of equipmentItems) {
    if (item.purchase_price_cents && item.useful_life_years > 0) {
      depreciationDeductionCents += Math.round(item.purchase_price_cents / item.useful_life_years)
      depreciationAssets++
    }
  }

  const totalExpenseCents = categories.reduce((s, c) => s + c.amountCents, 0)
  const totalDeductionsCents =
    totalExpenseCents +
    mileageDeductionCents +
    homeOfficeDeductionCents +
    depreciationDeductionCents

  return {
    taxYear,
    categories,
    mileageDeductionCents,
    mileageTrips,
    totalMiles,
    homeOfficeDeductionCents,
    homeOfficeMethod,
    depreciationDeductionCents,
    depreciationAssets,
    totalDeductionsCents,
  }
}

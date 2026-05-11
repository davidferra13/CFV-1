// Tax Prep Package Report Generator
// Aggregates all tax-relevant data for a given year into a single
// report that can be printed or handed to an accountant.

import { createServerClient } from '@/lib/db/server'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/constants/expense-categories'

// IRS expense category groupings for Schedule C
const IRS_CATEGORY_MAP: Record<string, string> = {
  groceries: 'Supplies/Ingredients',
  alcohol: 'Supplies/Ingredients',
  specialty_items: 'Supplies/Ingredients',
  gas_mileage: 'Travel/Mileage',
  vehicle: 'Travel/Mileage',
  equipment: 'Equipment/Depreciation',
  supplies: 'Supplies/Ingredients',
  venue_rental: 'Other Expenses',
  labor: 'Contract Labor',
  uniforms: 'Other Expenses',
  subscriptions: 'Other Expenses',
  marketing: 'Advertising/Marketing',
  insurance_licenses: 'Insurance',
  professional_services: 'Professional Services',
  education: 'Other Expenses',
  utilities: 'Utilities',
  platform_commission: 'Other Expenses',
  other: 'Other Expenses',
}

// Types

export type TaxPrepExpenseCategory = {
  irsCategory: string
  expenseCategories: string[]
  totalCents: number
  count: number
}

export type TaxPrepIncomeSource = {
  source: string
  totalCents: number
  count: number
}

export type TaxPrepMileageEntry = {
  tripDate: string
  fromLocation: string | null
  toLocation: string | null
  miles: number
  purpose: string
  deductionCents: number
}

export type TaxPrepContractor = {
  name: string
  totalPaidCents: number
  paymentCount: number
  requires1099: boolean
  w9OnFile: boolean
}

export type TaxPrepReceiptEntry = {
  date: string
  description: string
  vendor: string | null
  category: string
  amountCents: number
  hasReceipt: boolean
  receiptUrl: string | null
}

export type TaxPrepDeductionSummary = {
  totalExpensesCents: number
  totalDeductibleCents: number
  mileageDeductionCents: number
  homeOfficeDeductionCents: number
  totalDeductionsCents: number
}

export type TaxPrepReport = {
  year: number
  generatedAt: string

  // Income
  totalIncomeCents: number
  incomeSources: TaxPrepIncomeSource[]

  // Expenses by IRS category
  expensesByCategory: TaxPrepExpenseCategory[]
  totalExpensesCents: number

  // Mileage
  mileageLog: TaxPrepMileageEntry[]
  totalMiles: number
  mileageDeductionCents: number
  irsRateCentsPerMile: number

  // 1099 contractors
  contractors: TaxPrepContractor[]
  contractorsRequiring1099: number

  // Receipt index
  receipts: TaxPrepReceiptEntry[]
  receiptsWithProof: number
  receiptsWithoutProof: number

  // Deductions summary
  deductions: TaxPrepDeductionSummary

  // Estimated taxable income
  estimatedTaxableIncomeCents: number
}

const IRS_MILEAGE_RATE_CENTS = 72.5 // 2026 rate

export async function generateTaxPrep(tenantId: string, year: number): Promise<TaxPrepReport> {
  const db: any = createServerClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // Parallel fetch all data sources
  const [
    revenueResult,
    tipsResult,
    expensesResult,
    mileageResult,
    contractorPaymentsResult,
    staffResult,
  ] = await Promise.all([
    // Revenue from ledger entries (payments + deposits)
    db
      .from('ledger_entries')
      .select('entry_type, amount_cents, created_at')
      .eq('tenant_id', tenantId)
      .in('entry_type', ['payment', 'deposit'])
      .eq('is_refund', false)
      .gte('created_at', yearStart)
      .lte('created_at', `${yearEnd}T23:59:59`),
    // Tips
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('entry_type', 'tip')
      .eq('is_refund', false)
      .gte('created_at', yearStart)
      .lte('created_at', `${yearEnd}T23:59:59`),
    // Business expenses
    db
      .from('expenses')
      .select('id, category, description, amount_cents, expense_date, vendor, receipt_url, tax_deductible')
      .eq('tenant_id', tenantId)
      .eq('is_business', true)
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd)
      .order('expense_date', { ascending: true }),
    // Mileage logs
    db
      .from('mileage_logs')
      .select('trip_date, from_location, to_location, miles, purpose, description')
      .eq('tenant_id', tenantId)
      .gte('trip_date', yearStart)
      .lte('trip_date', yearEnd)
      .order('trip_date', { ascending: true }),
    // Contractor payments
    db
      .from('contractor_payments')
      .select('staff_member_id, amount_cents')
      .eq('chef_id', tenantId)
      .eq('tax_year', year),
    // Staff for contractor names and W-9 status
    db
      .from('staff_members')
      .select('id, name, w9_collected')
      .eq('chef_id', tenantId),
  ])

  // -- Income --
  const payments = revenueResult.data || []
  const tips = tipsResult.data || []

  const serviceRevenueCents = payments.reduce(
    (sum: number, r: any) => sum + (r.amount_cents || 0),
    0
  )
  const tipsCents = tips.reduce(
    (sum: number, t: any) => sum + (t.amount_cents || 0),
    0
  )
  const totalIncomeCents = serviceRevenueCents + tipsCents

  const incomeSources: TaxPrepIncomeSource[] = []
  if (serviceRevenueCents > 0) {
    incomeSources.push({
      source: 'Service Revenue (Payments & Deposits)',
      totalCents: serviceRevenueCents,
      count: payments.length,
    })
  }
  if (tipsCents > 0) {
    incomeSources.push({
      source: 'Tips/Gratuities',
      totalCents: tipsCents,
      count: tips.length,
    })
  }

  // -- Expenses by IRS category --
  const expenses: any[] = expensesResult.data || []
  const irsCatMap = new Map<string, { categories: Set<string>; totalCents: number; count: number }>()

  for (const exp of expenses) {
    const cat = (exp.category as string) || 'other'
    const irsCat = IRS_CATEGORY_MAP[cat] || 'Other Expenses'
    const existing = irsCatMap.get(irsCat) || { categories: new Set<string>(), totalCents: 0, count: 0 }
    existing.categories.add(cat)
    existing.totalCents += exp.amount_cents || 0
    existing.count++
    irsCatMap.set(irsCat, existing)
  }

  const expensesByCategory: TaxPrepExpenseCategory[] = Array.from(irsCatMap.entries())
    .map(([irsCat, data]) => ({
      irsCategory: irsCat,
      expenseCategories: Array.from(data.categories),
      totalCents: data.totalCents,
      count: data.count,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)

  const totalExpensesCents = expenses.reduce(
    (sum: number, e: any) => sum + (e.amount_cents || 0),
    0
  )

  // -- Mileage --
  const mileageLogs: any[] = mileageResult.data || []
  let totalMiles = 0

  const mileageLog: TaxPrepMileageEntry[] = mileageLogs.map((ml: any) => {
    const miles = Number(ml.miles) || 0
    totalMiles += miles
    return {
      tripDate: ml.trip_date,
      fromLocation: ml.from_location,
      toLocation: ml.to_location,
      miles,
      purpose: ml.purpose || 'business',
      deductionCents: Math.round(miles * IRS_MILEAGE_RATE_CENTS),
    }
  })

  const mileageDeductionCents = Math.round(totalMiles * IRS_MILEAGE_RATE_CENTS)

  // -- Contractors / 1099 --
  const contractorPayments: any[] = contractorPaymentsResult.data || []
  const staffMembers: any[] = staffResult.data || []
  const staffMap = new Map<string, { name: string; w9: boolean }>()
  for (const s of staffMembers) {
    staffMap.set(s.id, { name: s.name, w9: s.w9_collected ?? false })
  }

  const contractorTotals = new Map<string, { total: number; count: number }>()
  for (const cp of contractorPayments) {
    const existing = contractorTotals.get(cp.staff_member_id) || { total: 0, count: 0 }
    existing.total += cp.amount_cents || 0
    existing.count++
    contractorTotals.set(cp.staff_member_id, existing)
  }

  const contractors: TaxPrepContractor[] = Array.from(contractorTotals.entries())
    .map(([staffId, data]) => {
      const staff = staffMap.get(staffId)
      return {
        name: staff?.name || 'Unknown',
        totalPaidCents: data.total,
        paymentCount: data.count,
        requires1099: data.total >= 60000, // $600 threshold
        w9OnFile: staff?.w9 ?? false,
      }
    })
    .sort((a, b) => b.totalPaidCents - a.totalPaidCents)

  const contractorsRequiring1099 = contractors.filter((c) => c.requires1099).length

  // -- Receipt index --
  const receipts: TaxPrepReceiptEntry[] = expenses.map((exp: any) => {
    const catMeta = EXPENSE_CATEGORIES[exp.category as ExpenseCategory]
    return {
      date: exp.expense_date,
      description: exp.description || '',
      vendor: exp.vendor,
      category: catMeta?.label || exp.category?.replace(/_/g, ' ') || 'Other',
      amountCents: exp.amount_cents || 0,
      hasReceipt: !!exp.receipt_url,
      receiptUrl: exp.receipt_url,
    }
  })

  const receiptsWithProof = receipts.filter((r) => r.hasReceipt).length
  const receiptsWithoutProof = receipts.length - receiptsWithProof

  // -- Deductions summary --
  const deductibleExpenses = expenses
    .filter((e: any) => e.tax_deductible !== false)
    .reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0)

  const deductions: TaxPrepDeductionSummary = {
    totalExpensesCents,
    totalDeductibleCents: deductibleExpenses,
    mileageDeductionCents,
    homeOfficeDeductionCents: 0, // placeholder for future home office calc
    totalDeductionsCents: deductibleExpenses + mileageDeductionCents,
  }

  const estimatedTaxableIncomeCents = Math.max(0, totalIncomeCents - deductions.totalDeductionsCents)

  return {
    year,
    generatedAt: new Date().toISOString(),
    totalIncomeCents,
    incomeSources,
    expensesByCategory,
    totalExpensesCents,
    mileageLog,
    totalMiles: Math.round(totalMiles * 10) / 10,
    mileageDeductionCents,
    irsRateCentsPerMile: IRS_MILEAGE_RATE_CENTS,
    contractors,
    contractorsRequiring1099,
    receipts,
    receiptsWithProof,
    receiptsWithoutProof,
    deductions,
    estimatedTaxableIncomeCents,
  }
}

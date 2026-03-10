'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export const BUDGET_CATEGORIES = [
  'food_cost',
  'labor',
  'marketing',
  'equipment',
  'travel',
  'supplies',
  'other',
] as const

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  food_cost: 'Food & Ingredients',
  labor: 'Labor',
  marketing: 'Marketing',
  equipment: 'Equipment',
  travel: 'Travel',
  supplies: 'Supplies',
  other: 'Other',
}

// Maps budget categories to expense categories for actuals lookup
const BUDGET_TO_EXPENSE_MAP: Record<BudgetCategory, string[]> = {
  food_cost: ['groceries', 'alcohol', 'specialty_items'],
  labor: ['labor'],
  marketing: ['marketing'],
  equipment: ['equipment', 'venue_rental'],
  travel: ['gas_mileage', 'vehicle'],
  supplies: ['supplies', 'uniforms'],
  other: [
    'subscriptions',
    'insurance_licenses',
    'professional_services',
    'education',
    'utilities',
    'other',
  ],
}

export type BudgetVarianceRow = {
  category: BudgetCategory
  categoryLabel: string
  budgetCents: number
  actualCents: number
  varianceCents: number
  variancePercent: number | null
}

export type BudgetSummary = {
  month: string
  rows: BudgetVarianceRow[]
  totalBudgetCents: number
  totalActualCents: number
  totalVarianceCents: number
}

export type YearlyBudgetRow = {
  month: string
  totalBudgetCents: number
  totalActualCents: number
  varianceCents: number
}

// ─── Actions ─────────────────────────────────────────────────────

export async function setBudget(month: string, category: BudgetCategory, budgetCents: number) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('chef_budgets').upsert(
    {
      chef_id: user.tenantId!,
      month,
      category,
      budget_cents: budgetCents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,month,category' }
  )

  if (error) throw new Error(`Failed to set budget: ${error.message}`)

  revalidatePath('/finance/budget')
}

export async function getBudgets(month: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_budgets')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('month', month)

  if (error) throw new Error(`Failed to fetch budgets: ${error.message}`)

  return data ?? []
}

export async function getBudgetVariance(month: string): Promise<BudgetSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get budgets for month
  const { data: budgets, error: budgetError } = await supabase
    .from('chef_budgets')
    .select('category, budget_cents')
    .eq('chef_id', user.tenantId!)
    .eq('month', month)

  if (budgetError) throw new Error(`Failed to fetch budgets: ${budgetError.message}`)

  // Get actual expenses for the month
  const startDate = `${month}-01`
  const endOfMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
  const endDate = `${month}-${String(endOfMonth.getDate()).padStart(2, '0')}`

  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('category, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)

  if (expError) throw new Error(`Failed to fetch expenses: ${expError.message}`)

  // Sum actuals per expense category
  const actualsByExpCat: Record<string, number> = {}
  for (const exp of expenses ?? []) {
    actualsByExpCat[exp.category] = (actualsByExpCat[exp.category] || 0) + (exp.amount_cents || 0)
  }

  // Build budget map
  const budgetMap: Record<string, number> = {}
  for (const b of budgets ?? []) {
    budgetMap[b.category] = b.budget_cents
  }

  // Build rows
  const rows: BudgetVarianceRow[] = BUDGET_CATEGORIES.map((cat) => {
    const budgetCents = budgetMap[cat] || 0
    const expCats = BUDGET_TO_EXPENSE_MAP[cat]
    const actualCents = expCats.reduce((sum, ec) => sum + (actualsByExpCat[ec] || 0), 0)
    const varianceCents = budgetCents - actualCents
    const variancePercent =
      budgetCents > 0 ? ((actualCents - budgetCents) / budgetCents) * 100 : null

    return {
      category: cat,
      categoryLabel: BUDGET_CATEGORY_LABELS[cat],
      budgetCents,
      actualCents,
      varianceCents,
      variancePercent,
    }
  })

  const totalBudgetCents = rows.reduce((s, r) => s + r.budgetCents, 0)
  const totalActualCents = rows.reduce((s, r) => s + r.actualCents, 0)

  return {
    month,
    rows,
    totalBudgetCents,
    totalActualCents,
    totalVarianceCents: totalBudgetCents - totalActualCents,
  }
}

export async function getYearlyBudgetSummary(year: number): Promise<YearlyBudgetRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const results: YearlyBudgetRow[] = []

  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, '0')}`

    // Get budgets
    const { data: budgets } = await supabase
      .from('chef_budgets')
      .select('budget_cents')
      .eq('chef_id', user.tenantId!)
      .eq('month', month)

    // Get expenses
    const startDate = `${month}-01`
    const endOfMonth = new Date(year, m, 0)
    const endDate = `${month}-${String(endOfMonth.getDate()).padStart(2, '0')}`

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    const totalBudgetCents = (budgets ?? []).reduce(
      (s: number, b: any) => s + (b.budget_cents || 0),
      0
    )
    const totalActualCents = (expenses ?? []).reduce(
      (s: number, e: any) => s + (e.amount_cents || 0),
      0
    )

    results.push({
      month,
      totalBudgetCents,
      totalActualCents,
      varianceCents: totalBudgetCents - totalActualCents,
    })
  }

  return results
}

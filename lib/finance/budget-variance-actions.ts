'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from '@/lib/finance/budget-variance-shared'
import { createServerClient } from '@/lib/supabase/server'

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

  if (error) {
    throw new Error(`Failed to set budget: ${error.message}`)
  }

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

  if (error) {
    throw new Error(`Failed to fetch budgets: ${error.message}`)
  }

  return data ?? []
}

export async function getBudgetVariance(month: string): Promise<BudgetSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: budgets, error: budgetError } = await supabase
    .from('chef_budgets')
    .select('category, budget_cents')
    .eq('chef_id', user.tenantId!)
    .eq('month', month)

  if (budgetError) {
    throw new Error(`Failed to fetch budgets: ${budgetError.message}`)
  }

  const startDate = `${month}-01`
  const endOfMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
  const endDate = `${month}-${String(endOfMonth.getDate()).padStart(2, '0')}`

  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('category, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)

  if (expError) {
    throw new Error(`Failed to fetch expenses: ${expError.message}`)
  }

  const actualsByExpCat: Record<string, number> = {}
  for (const expense of expenses ?? []) {
    actualsByExpCat[expense.category] =
      (actualsByExpCat[expense.category] || 0) + (expense.amount_cents || 0)
  }

  const budgetMap: Record<string, number> = {}
  for (const budget of budgets ?? []) {
    budgetMap[budget.category] = budget.budget_cents
  }

  const rows: BudgetVarianceRow[] = BUDGET_CATEGORIES.map((category) => {
    const budgetCents = budgetMap[category] || 0
    const actualCents = BUDGET_TO_EXPENSE_MAP[category].reduce(
      (sum, expenseCategory) => sum + (actualsByExpCat[expenseCategory] || 0),
      0
    )
    const varianceCents = budgetCents - actualCents
    const variancePercent =
      budgetCents > 0 ? ((actualCents - budgetCents) / budgetCents) * 100 : null

    return {
      category,
      categoryLabel: BUDGET_CATEGORY_LABELS[category],
      budgetCents,
      actualCents,
      varianceCents,
      variancePercent,
    }
  })

  const totalBudgetCents = rows.reduce((sum, row) => sum + row.budgetCents, 0)
  const totalActualCents = rows.reduce((sum, row) => sum + row.actualCents, 0)

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

  for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
    const month = `${year}-${String(monthNumber).padStart(2, '0')}`

    const { data: budgets } = await supabase
      .from('chef_budgets')
      .select('budget_cents')
      .eq('chef_id', user.tenantId!)
      .eq('month', month)

    const startDate = `${month}-01`
    const endOfMonth = new Date(year, monthNumber, 0)
    const endDate = `${month}-${String(endOfMonth.getDate()).padStart(2, '0')}`

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    const totalBudgetCents = (budgets ?? []).reduce(
      (sum: number, budget: any) => sum + (budget.budget_cents || 0),
      0
    )
    const totalActualCents = (expenses ?? []).reduce(
      (sum: number, expense: any) => sum + (expense.amount_cents || 0),
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

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type ExpenseCategory =
  | 'food'
  | 'equipment'
  | 'supplies'
  | 'mileage'
  | 'insurance'
  | 'subscriptions'
  | 'marketing'
  | 'rent'
  | 'utilities'
  | 'professional_services'
  | 'training'
  | 'other'

export interface Expense {
  id: string
  tenant_id: string
  category: ExpenseCategory
  description: string
  amount_cents: number
  date: string
  event_id: string | null
  vendor: string | null
  is_recurring: boolean
  recurrence_interval: string | null
  receipt_url: string | null
  tax_deductible: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseFilters {
  category?: ExpenseCategory
  dateFrom?: string
  dateTo?: string
  eventId?: string
}

export interface CreateExpenseInput {
  category: ExpenseCategory
  description: string
  amount_cents: number
  date: string
  event_id?: string | null
  vendor?: string | null
  is_recurring?: boolean
  recurrence_interval?: string | null
  receipt_url?: string | null
  tax_deductible?: boolean
  notes?: string | null
}

export interface ExpenseSummary {
  category: ExpenseCategory
  total_cents: number
  count: number
}

export interface MonthlyTrend {
  month: string
  total_cents: number
  count: number
}

// ============================================
// ACTIONS
// ============================================

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  let query = db
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.dateFrom) {
    query = query.gte('date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('date', filters.dateTo)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[expense-actions] getExpenses failed:', error)
    throw new Error('Failed to load expenses')
  }

  return (data ?? []) as Expense[]
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  const { data, error } = await db
    .from('expenses')
    .insert({
      tenant_id: tenantId,
      category: input.category,
      description: input.description,
      amount_cents: input.amount_cents,
      date: input.date,
      event_id: input.event_id || null,
      vendor: input.vendor || null,
      is_recurring: input.is_recurring ?? false,
      recurrence_interval: input.recurrence_interval || null,
      receipt_url: input.receipt_url || null,
      tax_deductible: input.tax_deductible ?? true,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[expense-actions] createExpense failed:', error)
    throw new Error('Failed to create expense')
  }

  revalidatePath('/finance')
  revalidatePath('/dashboard')

  // Outbound webhook (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(tenantId, 'expense.created' as any, { expense: data })
  } catch (err) {
    console.error('[non-blocking] expense.created webhook failed', err)
  }

  return data as Expense
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>
): Promise<Expense> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.category !== undefined) updateData.category = input.category
  if (input.description !== undefined) updateData.description = input.description
  if (input.amount_cents !== undefined) updateData.amount_cents = input.amount_cents
  if (input.date !== undefined) updateData.date = input.date
  if (input.event_id !== undefined) updateData.event_id = input.event_id || null
  if (input.vendor !== undefined) updateData.vendor = input.vendor || null
  if (input.is_recurring !== undefined) updateData.is_recurring = input.is_recurring
  if (input.recurrence_interval !== undefined)
    updateData.recurrence_interval = input.recurrence_interval || null
  if (input.receipt_url !== undefined) updateData.receipt_url = input.receipt_url || null
  if (input.tax_deductible !== undefined) updateData.tax_deductible = input.tax_deductible
  if (input.notes !== undefined) updateData.notes = input.notes || null

  const { data, error } = await db
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('[expense-actions] updateExpense failed:', error)
    throw new Error('Failed to update expense')
  }

  revalidatePath('/finance')
  revalidatePath('/dashboard')

  // Outbound webhook (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(tenantId, 'expense.updated' as any, { expense: data })
  } catch (err) {
    console.error('[non-blocking] expense.updated webhook failed', err)
  }

  return data as Expense
}

export async function deleteExpense(id: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  const { error } = await db.from('expenses').delete().eq('id', id).eq('tenant_id', tenantId)

  if (error) {
    console.error('[expense-actions] deleteExpense failed:', error)
    throw new Error('Failed to delete expense')
  }

  revalidatePath('/finance')
  revalidatePath('/dashboard')

  // Outbound webhook (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(tenantId, 'expense.deleted' as any, { expense_id: id })
  } catch (err) {
    console.error('[non-blocking] expense.deleted webhook failed', err)
  }
}

export async function getExpenseSummary(
  dateFrom?: string,
  dateTo?: string
): Promise<ExpenseSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  let query = db.from('expenses').select('category, amount_cents').eq('tenant_id', tenantId)

  if (dateFrom) {
    query = query.gte('date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('date', dateTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('[expense-actions] getExpenseSummary failed:', error)
    throw new Error('Failed to load expense summary')
  }

  // Aggregate by category in JS since query builder doesn't support GROUP BY
  const categoryMap = new Map<string, { total_cents: number; count: number }>()
  for (const row of data ?? []) {
    const existing = categoryMap.get(row.category) ?? { total_cents: 0, count: 0 }
    existing.total_cents += row.amount_cents
    existing.count += 1
    categoryMap.set(row.category, existing)
  }

  const summaries: ExpenseSummary[] = []
  for (const [category, agg] of categoryMap) {
    summaries.push({
      category: category as ExpenseCategory,
      total_cents: agg.total_cents,
      count: agg.count,
    })
  }

  // Sort by total descending
  summaries.sort((a, b) => b.total_cents - a.total_cents)
  return summaries
}

export async function getMonthlyExpenseTrend(months: number = 12): Promise<MonthlyTrend[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  // Calculate date range
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  const dateFrom = startDate.toISOString().slice(0, 10)

  const { data, error } = await db
    .from('expenses')
    .select('date, amount_cents')
    .eq('tenant_id', tenantId)
    .gte('date', dateFrom)
    .order('date', { ascending: true })

  if (error) {
    console.error('[expense-actions] getMonthlyExpenseTrend failed:', error)
    throw new Error('Failed to load expense trend')
  }

  // Aggregate by month
  const monthMap = new Map<string, { total_cents: number; count: number }>()

  // Initialize all months so we get zeros for empty months
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { total_cents: 0, count: 0 })
  }

  for (const row of data ?? []) {
    const monthKey = row.date.slice(0, 7) // "YYYY-MM"
    const existing = monthMap.get(monthKey) ?? { total_cents: 0, count: 0 }
    existing.total_cents += row.amount_cents
    existing.count += 1
    monthMap.set(monthKey, existing)
  }

  const trends: MonthlyTrend[] = []
  for (const [month, agg] of monthMap) {
    trends.push({ month, total_cents: agg.total_cents, count: agg.count })
  }

  trends.sort((a, b) => a.month.localeCompare(b.month))
  return trends
}

export async function getEventExpenses(eventId: string): Promise<Expense[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('date', { ascending: false })

  if (error) {
    console.error('[expense-actions] getEventExpenses failed:', error)
    throw new Error('Failed to load event expenses')
  }

  return (data ?? []) as Expense[]
}

export async function getDeductibleTotal(year: number): Promise<number> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = await createServerClient()

  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  const { data, error } = await db
    .from('expenses')
    .select('amount_cents')
    .eq('tenant_id', tenantId)
    .eq('tax_deductible', true)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error) {
    console.error('[expense-actions] getDeductibleTotal failed:', error)
    throw new Error('Failed to load deductible total')
  }

  let total = 0
  for (const row of data ?? []) {
    total += row.amount_cents
  }

  return total
}

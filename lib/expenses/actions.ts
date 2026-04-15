// Expense Server Actions
// Chef-only: Create, read, update, delete expenses and compute profit

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EXPENSE_CATEGORY_VALUES } from '@/lib/constants/expense-categories'
import { getChefPreferences } from '@/lib/chef/actions'

// --- Zod Schemas ---

const ExpenseCategoryEnum = z.enum(EXPENSE_CATEGORY_VALUES)

const PaymentMethodEnum = z.enum(['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other'])

const CreateExpenseSchema = z.object({
  event_id: z.string().uuid().nullable().optional(),
  amount_cents: z.number().int().positive('Amount must be positive'),
  category: ExpenseCategoryEnum,
  payment_method: PaymentMethodEnum,
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  expense_date: z.string().min(1, 'Expense date is required'),
  vendor_name: z.string().max(255).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  is_business: z.boolean().optional(),
  is_reimbursable: z.boolean().optional(),
  receipt_photo_url: z.string().nullable().optional(),
  receipt_uploaded: z.boolean().optional(),
  payment_card_used: z.string().nullable().optional(),
  card_cashback_percent: z.number().nullable().optional(),
  mileage_miles: z.number().nullable().optional(),
  mileage_rate_per_mile_cents: z.number().int().nullable().optional(),
})

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>

const UpdateExpenseSchema = z.object({
  amount_cents: z.number().int().positive('Amount must be positive').optional(),
  category: ExpenseCategoryEnum.optional(),
  payment_method: PaymentMethodEnum.optional(),
  description: z.string().min(1).max(500, 'Description too long').optional(),
  expense_date: z.string().min(1).optional(),
  vendor_name: z.string().max(255).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  is_business: z.boolean().optional(),
  is_reimbursable: z.boolean().optional(),
  receipt_photo_url: z.string().nullable().optional(),
  receipt_uploaded: z.boolean().optional(),
  payment_card_used: z.string().nullable().optional(),
  card_cashback_percent: z.number().nullable().optional(),
  mileage_miles: z.number().nullable().optional(),
  mileage_rate_per_mile_cents: z.number().int().nullable().optional(),
})

export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>

// --- Expense Filters ---

export type ExpenseFilters = {
  event_id?: string
  category?: string
  is_business?: boolean
  start_date?: string
  end_date?: string
}

// --- Tax mapping helpers ---

// Categories that map deterministically to one Schedule C line.
// These get an auto-upserted expense_tax_categories row on write.
const DETERMINISTIC_TAX_MAP: Record<string, string> = {
  groceries: 'cogs',
  alcohol: 'cogs',
  specialty_items: 'cogs',
  gas_mileage: 'line_9',
  vehicle: 'line_9',
  supplies: 'line_22',
  venue_rental: 'line_27a',
  labor: 'line_26',
  uniforms: 'line_27a',
  subscriptions: 'line_27a',
  marketing: 'line_8',
  insurance_licenses: 'line_15',
  professional_services: 'line_17',
  education: 'line_27a',
  utilities: 'line_25',
}

// Ambiguous categories: remove any stale auto-map, require explicit mapping.
const AMBIGUOUS_CATEGORIES = new Set(['equipment', 'other'])

/**
 * Upsert the authoritative expense_tax_categories row for a deterministic category.
 * For ambiguous categories, delete any stale auto-upserted row.
 * This ensures export_tax_categories never double-counts a raw expense row.
 */
async function syncExpenseTaxMapping(
  db: any,
  tenantId: string,
  expenseId: string,
  category: string,
  amountCents: number,
  expenseDate: string,
  createdBy: string
): Promise<void> {
  const taxYear = parseInt(expenseDate.slice(0, 4), 10)
  if (isNaN(taxYear)) return

  if (AMBIGUOUS_CATEGORIES.has(category)) {
    // Remove any stale auto-generated mapping so export blocks correctly.
    try {
      await db
        .from('expense_tax_categories')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('source', 'expense')
        .eq('source_id', expenseId)
        .eq('tax_year', taxYear)
    } catch {}
    return
  }

  const line = DETERMINISTIC_TAX_MAP[category]
  if (!line) return

  try {
    await db.from('expense_tax_categories').upsert(
      {
        tenant_id: tenantId,
        expense_description: category,
        schedule_c_line: line,
        amount_cents: amountCents,
        tax_year: taxYear,
        source: 'expense',
        source_id: expenseId,
      },
      { onConflict: 'tenant_id,source,source_id,tax_year' }
    )
  } catch (err) {
    // Non-blocking: log but do not fail the expense write
    console.error('[syncExpenseTaxMapping] Failed to upsert tax mapping (non-blocking):', err)
  }
}

// --- Actions ---

/**
 * Create a new expense record
 */
export async function createExpense(input: CreateExpenseInput) {
  const user = await requireChef()
  const validated = CreateExpenseSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('expenses')
    .insert({
      ...validated,
      tenant_id: user.tenantId!,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createExpense] Error:', error)
    throw new Error('Failed to create expense')
  }

  // Sync authoritative tax mapping (non-blocking)
  try {
    await syncExpenseTaxMapping(
      db,
      user.tenantId!,
      data.id,
      validated.category,
      validated.amount_cents,
      validated.expense_date,
      user.id
    )
  } catch (err) {
    console.error('[createExpense] Tax mapping sync failed (non-blocking):', err)
  }

  revalidatePath('/expenses')
  if (validated.event_id) {
    revalidatePath(`/events/${validated.event_id}`)
  }
  revalidatePath('/financials')
  revalidatePath('/finance')

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'expense_created',
      domain: 'financial',
      entityType: 'expense',
      entityId: data.id,
      summary: `Added expense: $${(validated.amount_cents / 100).toFixed(2)} - ${validated.description || validated.category}`,
      context: {
        amount_cents: validated.amount_cents,
        category: validated.category,
        event_id: validated.event_id,
        amount_display: `$${(validated.amount_cents / 100).toFixed(2)}`,
      },
    })
  } catch (err) {
    console.error('[createExpense] Activity log failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'expense.logged', {
      expense_id: data.id,
      amount_cents: validated.amount_cents,
      category: validated.category,
      event_id: validated.event_id || null,
    })
  } catch {}

  return { success: true, expense: data }
}

/**
 * Get expenses with optional filters
 */
export async function getExpenses(filters: ExpenseFilters = {}) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('expenses')
    .select(
      `
      *,
      event:events(id, occasion, event_date, client:clients(full_name))
    `
    )
    .eq('tenant_id', user.tenantId!)

  if (filters.event_id) {
    query = query.eq('event_id', filters.event_id)
  }
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category as any)
  }
  if (filters.is_business !== undefined) {
    query = query.eq('is_business', filters.is_business)
  }
  if (filters.start_date) {
    query = query.gte('expense_date', filters.start_date)
  }
  if (filters.end_date) {
    query = query.lte('expense_date', filters.end_date)
  }

  const { data, error } = await query.order('expense_date', { ascending: false })

  if (error) {
    console.error('[getExpenses] Error:', error)
    throw new Error('Failed to load expenses')
  }

  return data
}

/**
 * Get a single expense by ID
 */
export async function getExpenseById(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('expenses')
    .select(
      `
      *,
      event:events(id, occasion, event_date, client:clients(full_name))
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getExpenseById] Error:', error)
    return null
  }

  return data
}

/**
 * Update an expense record
 */
export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const user = await requireChef()
  const validated = UpdateExpenseSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('expenses')
    .update({
      ...validated,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateExpense] Error:', error)
    throw new Error('Failed to update expense')
  }

  // Sync authoritative tax mapping when category or amount changed (non-blocking)
  if (validated.category || validated.amount_cents || validated.expense_date) {
    try {
      const category = data.category
      const amountCents = data.amount_cents
      const expenseDate = data.expense_date
      if (category && amountCents && expenseDate) {
        await syncExpenseTaxMapping(
          db,
          user.tenantId!,
          id,
          category,
          amountCents,
          expenseDate,
          user.id
        )
      }
    } catch (err) {
      console.error('[updateExpense] Tax mapping sync failed (non-blocking):', err)
    }
  }

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${id}`)
  if (data.event_id) {
    revalidatePath(`/events/${data.event_id}`)
  }
  revalidatePath('/financials')
  revalidatePath('/finance')

  return { success: true, expense: data }
}

/**
 * Delete an expense record
 */
export async function deleteExpense(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the expense first to know which event to revalidate
  const { data: existing } = await db
    .from('expenses')
    .select('event_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { error } = await db.from('expenses').delete().eq('id', id).eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteExpense] Error:', error)
    throw new Error('Failed to delete expense')
  }

  // Remove linked authoritative tax mapping rows (non-blocking)
  try {
    await db
      .from('expense_tax_categories')
      .delete()
      .eq('tenant_id', user.tenantId!)
      .eq('source', 'expense')
      .eq('source_id', id)
  } catch (err) {
    console.error('[deleteExpense] Tax mapping cleanup failed (non-blocking):', err)
  }

  revalidatePath('/expenses')
  if (existing?.event_id) {
    revalidatePath(`/events/${existing.event_id}`)
  }
  revalidatePath('/financials')
  revalidatePath('/finance')

  return { success: true }
}

/**
 * Get all expenses for a specific event with category subtotals
 */
export async function getEventExpenses(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('expense_date', { ascending: false })

  if (error) {
    console.error('[getEventExpenses] Error:', error)
    throw new Error('Failed to load event expenses')
  }

  const expenses = data || []

  // Compute subtotals by category (business only)
  const subtotals: Record<string, number> = {}
  let totalBusinessCents = 0
  let totalPersonalCents = 0

  for (const exp of expenses) {
    if (exp.is_business) {
      subtotals[exp.category] = (subtotals[exp.category] || 0) + exp.amount_cents
      totalBusinessCents += exp.amount_cents
    } else {
      totalPersonalCents += exp.amount_cents
    }
  }

  return { expenses, subtotals, totalBusinessCents, totalPersonalCents }
}

/**
 * Get full profit summary for an event
 */
export async function getEventProfitSummary(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get event financial summary from the view (has revenue + expense data)
  const { data: summary } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Get expense breakdown by category (include card_cashback_percent)
  const { data: expenses } = await db
    .from('expenses')
    .select('category, amount_cents, is_business, payment_card_used, card_cashback_percent')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  // Get event time tracking, guest count, and estimated food cost data
  const { data: eventData } = await db
    .from('events')
    .select(
      'time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes, guest_count, estimated_food_cost_cents'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Compute expense categories
  let groceriesCents = 0
  let alcoholCents = 0
  let specialtyCents = 0
  let gasMileageCents = 0
  let otherCents = 0
  let totalBusinessCents = 0
  let totalPersonalCents = 0
  let estimatedCashbackCents = 0

  for (const exp of expenses || []) {
    if (exp.is_business) {
      totalBusinessCents += exp.amount_cents
      switch (exp.category) {
        case 'groceries':
          groceriesCents += exp.amount_cents
          break
        case 'alcohol':
          alcoholCents += exp.amount_cents
          break
        case 'specialty_items':
          specialtyCents += exp.amount_cents
          break
        case 'gas_mileage':
          gasMileageCents += exp.amount_cents
          break
        default:
          otherCents += exp.amount_cents
          break
      }
    } else {
      totalPersonalCents += exp.amount_cents
    }

    // Accumulate cashback estimates
    if (exp.card_cashback_percent && exp.card_cashback_percent > 0) {
      estimatedCashbackCents += Math.round((exp.amount_cents * exp.card_cashback_percent) / 100)
    }
  }

  const quotedPriceCents = summary?.quoted_price_cents ?? 0
  const totalPaidCents = summary?.total_paid_cents ?? 0
  const tipCents = summary?.tip_amount_cents ?? 0
  const totalRevenue = totalPaidCents + tipCents
  const grossProfitCents = totalRevenue - totalBusinessCents
  const foodIngredientsCents = groceriesCents + alcoholCents + specialtyCents

  // Compute total time invested and effective hourly rate
  const totalMinutes =
    (eventData?.time_shopping_minutes ?? 0) +
    (eventData?.time_prep_minutes ?? 0) +
    (eventData?.time_travel_minutes ?? 0) +
    (eventData?.time_service_minutes ?? 0) +
    (eventData?.time_reset_minutes ?? 0)

  const hasTimeData = totalMinutes > 0
  const effectiveHourlyRateCents = hasTimeData
    ? Math.round((grossProfitCents / totalMinutes) * 60)
    : null

  // Fetch chef's average food cost % across other completed events (for comparison)
  let chefAvgFoodCostPercent: number | null = null
  const { data: historicalRows } = await db
    .from('event_financial_summary')
    .select('food_cost_percentage')
    .eq('tenant_id', user.tenantId!)
    .neq('event_id', eventId)
    .not('food_cost_percentage', 'is', null)
    .limit(20)

  if (historicalRows && historicalRows.length >= 3) {
    const values = historicalRows
      .map((r: any) => parseFloat(String(r.food_cost_percentage)))
      .filter((v: any) => !isNaN(v) && v > 0)
    if (values.length >= 3) {
      chefAvgFoodCostPercent = parseFloat(
        ((values.reduce((s: any, v: any) => s + v, 0) / values.length) * 100).toFixed(1)
      )
    }
  }

  return {
    revenue: {
      quotedPriceCents,
      totalPaidCents,
      tipCents,
    },
    expenses: {
      groceriesCents,
      alcoholCents,
      specialtyCents,
      gasMileageCents,
      otherCents,
      totalBusinessCents,
      totalPersonalCents,
    },
    profit: {
      grossProfitCents,
      profitMarginPercent:
        totalRevenue > 0 ? parseFloat(((grossProfitCents / totalRevenue) * 100).toFixed(1)) : 0,
      foodCostPercent:
        totalRevenue > 0 ? parseFloat(((foodIngredientsCents / totalRevenue) * 100).toFixed(1)) : 0,
      effectiveHourlyRateCents,
      chefAvgFoodCostPercent,
    },
    perGuest: (() => {
      const guestCount = eventData?.guest_count ?? 0
      if (guestCount <= 0) return null
      return {
        guestCount,
        revenuePerGuestCents: Math.round(totalRevenue / guestCount),
        costPerGuestCents: Math.round(totalBusinessCents / guestCount),
        profitPerGuestCents: Math.round(grossProfitCents / guestCount),
      }
    })(),
    timeInvested: hasTimeData
      ? {
          shoppingMinutes: eventData?.time_shopping_minutes ?? 0,
          prepMinutes: eventData?.time_prep_minutes ?? 0,
          travelMinutes: eventData?.time_travel_minutes ?? 0,
          serviceMinutes: eventData?.time_service_minutes ?? 0,
          resetMinutes: eventData?.time_reset_minutes ?? 0,
          totalMinutes,
        }
      : null,
    cashback:
      estimatedCashbackCents > 0
        ? {
            estimatedCents: estimatedCashbackCents,
          }
        : null,
    estimatedFoodCost: (() => {
      const estimatedCents = (eventData as any)?.estimated_food_cost_cents ?? null
      const actualCents = foodIngredientsCents > 0 ? foodIngredientsCents : null
      const bothExist = estimatedCents !== null && actualCents !== null
      return {
        estimatedCents,
        actualCents,
        deltaCents: bothExist ? actualCents - estimatedCents : null,
        deltaPct: bothExist
          ? (((actualCents - estimatedCents) / estimatedCents) * 100).toFixed(1)
          : null,
      }
    })(),
  }
}

/**
 * Get monthly financial summary across all events
 */
export async function getMonthlyFinancialSummary(year: number, month: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Build date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  // Get events in this month with financial summaries
  const { data: eventSummaries } = await db
    .from('event_financial_summary')
    .select(
      `
      event_id,
      quoted_price_cents,
      total_paid_cents,
      total_expenses_cents,
      tip_amount_cents,
      profit_cents,
      profit_margin,
      food_cost_percentage
    `
    )
    .eq('tenant_id', user.tenantId!)

  // Get events in this month to filter summaries
  const { data: monthEvents } = await db
    .from('events')
    .select('id, occasion, event_date, status, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startDate)
    .lt('event_date', endDate)
    .order('event_date', { ascending: true })

  const monthEventIds = new Set((monthEvents || []).map((e: any) => e.id))

  // Filter financial summaries to this month's events
  const monthFinancials = (eventSummaries || []).filter(
    (s: any) => s.event_id && monthEventIds.has(s.event_id)
  )

  let totalRevenueCents = 0
  let totalExpensesCents = 0
  let totalProfitCents = 0
  let totalTipsCents = 0
  let totalFoodCostCents = 0
  let totalFoodCostRevenueCents = 0

  for (const s of monthFinancials) {
    const revCents = s.total_paid_cents ?? 0
    totalRevenueCents += revCents
    totalExpensesCents += s.total_expenses_cents ?? 0
    totalProfitCents += s.profit_cents ?? 0
    totalTipsCents += s.tip_amount_cents ?? 0
    if (s.food_cost_percentage !== null && s.food_cost_percentage > 0 && revCents > 0) {
      totalFoodCostCents += Math.round((revCents * s.food_cost_percentage) / 100)
      totalFoodCostRevenueCents += revCents
    }
  }

  // Read chef preferences for configurable revenue target (falls back to $10,000)
  const prefs = await getChefPreferences()
  const TARGET_MONTHLY_REVENUE_CENTS = prefs.target_monthly_revenue_cents ?? 1000000

  // Build per-event breakdown
  const eventBreakdown = (monthEvents || []).map((event: any) => {
    const fin = monthFinancials.find((f: any) => f.event_id === event.id)
    return {
      eventId: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      status: event.status,
      clientName: event.client?.full_name ?? 'Unknown',
      revenueCents: fin?.total_paid_cents ?? 0,
      expensesCents: fin?.total_expenses_cents ?? 0,
      profitCents: fin?.profit_cents ?? 0,
      profitMargin: fin?.profit_margin ?? 0,
    }
  })

  return {
    year,
    month,
    totalRevenueCents,
    totalExpensesCents,
    totalProfitCents,
    totalTipsCents,
    averageFoodCostPercent:
      totalFoodCostRevenueCents > 0
        ? Math.round((totalFoodCostCents / totalFoodCostRevenueCents) * 100)
        : 0,
    eventCount: monthEvents?.length ?? 0,
    targetRevenueCents: TARGET_MONTHLY_REVENUE_CENTS,
    revenueProgressPercent: Math.round((totalRevenueCents / TARGET_MONTHLY_REVENUE_CENTS) * 100),
    eventBreakdown,
  }
}

/**
 * Get budget guardrail - shows chef how much they can spend before shopping
 */
export async function getBudgetGuardrail(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get quoted price and any manually-set budget for this event
  const { data: event } = await db
    .from('events')
    .select('quoted_price_cents, food_cost_budget_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const quotedPriceCents = event?.quoted_price_cents ?? 0

  // Read target margin from chef preferences (defaults to 60%)
  const prefs = await getChefPreferences()
  const targetMarginPercent = prefs.target_margin_percent ?? 60

  // Use chef's manually-set budget if present; otherwise derive from formula
  const budgetSource: 'manual' | 'formula' =
    event?.food_cost_budget_cents != null ? 'manual' : 'formula'
  const maxGrocerySpendCents =
    budgetSource === 'manual'
      ? (event!.food_cost_budget_cents as number)
      : Math.round(quotedPriceCents * (1 - targetMarginPercent / 100))

  // Get current expenses already logged for this event (business only)
  const { data: existingExpenses } = await db
    .from('expenses')
    .select('amount_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_business', true)

  const currentSpendCents = (existingExpenses || []).reduce(
    (sum: any, e: any) => sum + e.amount_cents,
    0
  )

  // Get historical average grocery spend for similar events
  const { data: historicalExpenses } = await db
    .from('expenses')
    .select('amount_cents, event_id')
    .eq('tenant_id', user.tenantId!)
    .eq('is_business', true)
    .in('category', ['groceries', 'alcohol', 'specialty_items'])
    .neq('event_id', eventId)

  // Group by event and average
  const eventTotals: Record<string, number> = {}
  for (const exp of historicalExpenses || []) {
    if (exp.event_id) {
      eventTotals[exp.event_id] = (eventTotals[exp.event_id] || 0) + exp.amount_cents
    }
  }
  const eventTotalValues = Object.values(eventTotals)
  const historicalAvgSpendCents =
    eventTotalValues.length > 0
      ? Math.round(eventTotalValues.reduce((a, b) => a + b, 0) / eventTotalValues.length)
      : null

  // Determine status
  const remainingBudgetCents = maxGrocerySpendCents - currentSpendCents
  let status: 'under' | 'near' | 'over' = 'under'
  if (currentSpendCents > maxGrocerySpendCents) {
    status = 'over'
  } else if (currentSpendCents > maxGrocerySpendCents * 0.8) {
    status = 'near'
  }

  const dollars = (maxGrocerySpendCents / 100).toFixed(0)
  let message = `This dinner supports up to $${dollars} in groceries at your ${targetMarginPercent}% target margin`
  if (currentSpendCents > 0) {
    const spent = (currentSpendCents / 100).toFixed(0)
    const remaining = Math.max(0, remainingBudgetCents / 100)
    message = `$${spent} spent of $${dollars} budget - $${remaining.toFixed(0)} remaining`
  }

  return {
    quotedPriceCents,
    targetMarginPercent,
    maxGrocerySpendCents,
    currentSpendCents,
    remainingBudgetCents,
    historicalAvgSpendCents,
    status,
    message,
    budgetSource,
  }
}

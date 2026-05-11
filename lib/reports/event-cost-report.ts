// Event Cost Report Generator
// Aggregates all costs for an event into a printable cost breakdown.
// Reuses existing financial summary and expense data; no duplicate logic.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/constants/expense-categories'

// ── Types ──────────────────────────────────────────────────────────────

export type CostCategory =
  | 'ingredients'
  | 'labor'
  | 'travel'
  | 'supplies'
  | 'equipment'
  | 'other'

export interface DetailedLineItem {
  id: string
  date: string
  description: string
  vendorName: string | null
  amountCents: number
  category: CostCategory
  rawCategory: string
  paymentMethod: string | null
}

export interface CategoryCostSummary {
  category: CostCategory
  label: string
  budgetedCents: number | null
  actualCents: number
  varianceCents: number | null
  itemCount: number
}

export interface PerGuestBreakdown {
  totalCostPerGuest: number
  revenuePerGuest: number
  profitPerGuest: number
  ingredientCostPerGuest: number
}

export interface EventCostReport {
  eventName: string
  eventDate: string
  clientName: string
  guestCount: number | null
  quotedTotalCents: number
  actualCosts: {
    ingredients: number
    labor: number
    travel: number
    supplies: number
    equipment: number
    other: number
    total: number
  }
  profitCents: number
  profitMarginPercent: number | null
  perGuest: PerGuestBreakdown | null
  categoryBreakdown: CategoryCostSummary[]
  lineItems: DetailedLineItem[]
  generatedAt: string
}

// ── Category mapping ───────────────────────────────────────────────────

const EXPENSE_TO_COST_CATEGORY: Record<string, CostCategory> = {
  groceries: 'ingredients',
  alcohol: 'ingredients',
  specialty_items: 'ingredients',
  gas_mileage: 'travel',
  vehicle: 'travel',
  equipment: 'equipment',
  supplies: 'supplies',
  venue_rental: 'other',
  labor: 'labor',
  uniforms: 'other',
  subscriptions: 'other',
  marketing: 'other',
  insurance_licenses: 'other',
  professional_services: 'other',
  education: 'other',
  utilities: 'other',
  platform_commission: 'other',
  other: 'other',
}

const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  ingredients: 'Ingredients & Food',
  labor: 'Labor',
  travel: 'Travel & Mileage',
  supplies: 'Supplies',
  equipment: 'Equipment',
  other: 'Other Expenses',
}

function mapExpenseCategory(raw: string): CostCategory {
  return EXPENSE_TO_COST_CATEGORY[raw] ?? 'other'
}

// ── Main generator ─────────────────────────────────────────────────────

export async function generateEventCostReport(
  eventId: string,
  tenantId: string
): Promise<EventCostReport | null> {
  const db: any = createServerClient()

  // Parallel fetch: event data, financial summary, expenses, mileage entries
  const [eventRes, financialRes, expenseRes, mileageRes] = await Promise.all([
    db
      .from('events')
      .select(
        `
        id, occasion, event_date, guest_count,
        mileage_miles, estimated_food_cost_cents,
        client:clients(full_name)
      `
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('event_financial_summary')
      .select('quoted_price_cents, total_paid_cents, tip_amount_cents, total_expenses_cents')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('expenses')
      .select(
        'id, description, amount_cents, category, expense_date, vendor_name, payment_method, is_business'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('expense_date', { ascending: true }),
    db
      .from('mileage_entries')
      .select('id, trip_date, miles, deduction_cents, description, from_location, to_location')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('trip_date', { ascending: true }),
  ])

  const event = eventRes.data
  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null
  const guestCount: number | null = event.guest_count ?? null
  const expenses: any[] = expenseRes.data ?? []
  const mileageEntries: any[] = mileageRes.data ?? []
  const financial = financialRes.data

  // Build line items from expenses
  const lineItems: DetailedLineItem[] = expenses.map((exp: any) => ({
    id: exp.id,
    date: exp.expense_date,
    description: exp.description,
    vendorName: exp.vendor_name,
    amountCents: exp.amount_cents,
    category: mapExpenseCategory(exp.category),
    rawCategory: EXPENSE_CATEGORIES[exp.category as ExpenseCategory]?.label ?? exp.category,
    paymentMethod: exp.payment_method,
  }))

  // Add mileage entries as travel line items
  for (const m of mileageEntries) {
    const desc = m.description
      ? m.description
      : m.from_location && m.to_location
        ? `${m.from_location} to ${m.to_location}`
        : `${m.miles} miles`
    lineItems.push({
      id: m.id,
      date: m.trip_date,
      description: desc,
      vendorName: null,
      amountCents: m.deduction_cents ?? 0,
      category: 'travel',
      rawCategory: 'Mileage',
      paymentMethod: null,
    })
  }

  // Sort all line items by date
  lineItems.sort((a, b) => a.date.localeCompare(b.date))

  // Aggregate by cost category
  const categoryTotals: Record<CostCategory, number> = {
    ingredients: 0,
    labor: 0,
    travel: 0,
    supplies: 0,
    equipment: 0,
    other: 0,
  }
  const categoryCounts: Record<CostCategory, number> = {
    ingredients: 0,
    labor: 0,
    travel: 0,
    supplies: 0,
    equipment: 0,
    other: 0,
  }

  for (const item of lineItems) {
    categoryTotals[item.category] += item.amountCents
    categoryCounts[item.category]++
  }

  const totalActualCents = Object.values(categoryTotals).reduce((s, v) => s + v, 0)

  // Build category breakdown with estimated food cost as the ingredients budget
  const estimatedFoodCostCents: number | null = event.estimated_food_cost_cents ?? null
  const categoryBreakdown: CategoryCostSummary[] = (
    Object.keys(COST_CATEGORY_LABELS) as CostCategory[]
  )
    .filter((cat) => categoryTotals[cat] > 0 || (cat === 'ingredients' && estimatedFoodCostCents))
    .map((cat) => {
      const budgeted = cat === 'ingredients' ? estimatedFoodCostCents : null
      const actual = categoryTotals[cat]
      return {
        category: cat,
        label: COST_CATEGORY_LABELS[cat],
        budgetedCents: budgeted,
        actualCents: actual,
        varianceCents: budgeted != null ? actual - budgeted : null,
        itemCount: categoryCounts[cat],
      }
    })

  // Revenue and profit
  const quotedTotalCents = financial?.quoted_price_cents ?? 0
  const totalReceivedCents =
    (financial?.total_paid_cents ?? 0) + (financial?.tip_amount_cents ?? 0)
  const profitCents = totalReceivedCents - totalActualCents
  const profitMarginPercent =
    totalReceivedCents > 0
      ? parseFloat(((profitCents / totalReceivedCents) * 100).toFixed(1))
      : null

  // Per-guest breakdown
  const perGuest: PerGuestBreakdown | null =
    guestCount && guestCount > 0
      ? {
          totalCostPerGuest: Math.round(totalActualCents / guestCount),
          revenuePerGuest: Math.round(totalReceivedCents / guestCount),
          profitPerGuest: Math.round(profitCents / guestCount),
          ingredientCostPerGuest: Math.round(categoryTotals.ingredients / guestCount),
        }
      : null

  return {
    eventName: event.occasion ?? 'Untitled Event',
    eventDate: event.event_date,
    clientName: clientData?.full_name ?? 'Unknown Client',
    guestCount,
    quotedTotalCents,
    actualCosts: {
      ingredients: categoryTotals.ingredients,
      labor: categoryTotals.labor,
      travel: categoryTotals.travel,
      supplies: categoryTotals.supplies,
      equipment: categoryTotals.equipment,
      other: categoryTotals.other,
      total: totalActualCents,
    },
    profitCents,
    profitMarginPercent,
    perGuest,
    categoryBreakdown,
    lineItems,
    generatedAt: new Date().toISOString(),
  }
}

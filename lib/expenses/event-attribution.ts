'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// --- Types ---

export type EventExpenseAttribution = {
  eventId: string
  eventName: string | null
  eventDate: string | null
  guestCount: number
  quotedPriceCents: number
  totalExpenseCents: number
  marginCents: number
  marginPercent: number
  expenses: Array<{
    id: string
    description: string
    amountCents: number
    category: string
    vendorName: string | null
    expenseDate: string
    hasReceipt: boolean
  }>
  categoryBreakdown: Array<{
    category: string
    totalCents: number
    count: number
    percentOfTotal: number
  }>
}

export type EventExpenseComparison = {
  thisEventTotalCents: number
  avgSimilarEventCents: number
  percentDifference: number
  similarEventCount: number
}

// --- Actions ---

/**
 * Full expense attribution for a single event: every expense row,
 * grouped category breakdown, and margin vs. quoted price.
 */
export async function getEventExpenseAttribution(
  eventId: string
): Promise<EventExpenseAttribution> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event header (occasion, date, guest count, quoted price)
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Fetch all expenses tied to this event
  const { data: expenses, error: expError } = await db
    .from('expenses')
    .select('id, description, amount_cents, category, vendor_name, expense_date, receipt_photo_url')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('expense_date', { ascending: true })

  if (expError) {
    throw new Error('Failed to load expenses')
  }

  const rows = expenses ?? []

  // Compute totals
  let totalExpenseCents = 0
  const categoryMap = new Map<string, { totalCents: number; count: number }>()

  for (const exp of rows) {
    totalExpenseCents += exp.amount_cents
    const entry = categoryMap.get(exp.category)
    if (entry) {
      entry.totalCents += exp.amount_cents
      entry.count += 1
    } else {
      categoryMap.set(exp.category, { totalCents: exp.amount_cents, count: 1 })
    }
  }

  const quotedPriceCents = event.quoted_price_cents ?? 0
  const marginCents = quotedPriceCents - totalExpenseCents
  const marginPercent =
    quotedPriceCents > 0 ? parseFloat(((marginCents / quotedPriceCents) * 100).toFixed(1)) : 0

  // Build category breakdown sorted by total descending
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      totalCents: data.totalCents,
      count: data.count,
      percentOfTotal:
        totalExpenseCents > 0
          ? parseFloat(((data.totalCents / totalExpenseCents) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)

  return {
    eventId,
    eventName: event.occasion ?? null,
    eventDate: event.event_date ?? null,
    guestCount: event.guest_count ?? 0,
    quotedPriceCents,
    totalExpenseCents,
    marginCents,
    marginPercent,
    expenses: rows.map((exp: any) => ({
      id: exp.id,
      description: exp.description ?? '',
      amountCents: exp.amount_cents,
      category: exp.category,
      vendorName: exp.vendor_name ?? null,
      expenseDate: exp.expense_date,
      hasReceipt: !!exp.receipt_photo_url,
    })),
    categoryBreakdown,
  }
}

/**
 * Compare this event's total expenses against the average for
 * similarly-sized events (same guest count +/- 2).
 */
export async function getEventExpenseComparison(eventId: string): Promise<EventExpenseComparison> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get this event's guest count and total expenses
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  const guestCount: number = event.guest_count ?? 0

  // Sum expenses for this event
  const { data: thisExpenses } = await db
    .from('expenses')
    .select('amount_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  const thisEventTotalCents = (thisExpenses ?? []).reduce(
    (sum: number, e: any) => sum + (e.amount_cents ?? 0),
    0
  )

  // Find similar-sized completed events (guest_count within +/- 2), excluding this one
  const lowerBound = Math.max(1, guestCount - 2)
  const upperBound = guestCount + 2

  const { data: similarEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .neq('id', eventId)
    .gte('guest_count', lowerBound)
    .lte('guest_count', upperBound)

  const similarIds: string[] = (similarEvents ?? []).map((e: any) => e.id)

  if (similarIds.length === 0) {
    return {
      thisEventTotalCents,
      avgSimilarEventCents: 0,
      percentDifference: 0,
      similarEventCount: 0,
    }
  }

  // Fetch all expenses for similar events
  const { data: similarExpenses } = await db
    .from('expenses')
    .select('event_id, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', similarIds)

  // Sum per event, then average
  const perEventTotals = new Map<string, number>()
  for (const exp of similarExpenses ?? []) {
    perEventTotals.set(
      exp.event_id,
      (perEventTotals.get(exp.event_id) ?? 0) + (exp.amount_cents ?? 0)
    )
  }

  const totals = Array.from(perEventTotals.values())
  const similarEventCount = totals.length
  const avgSimilarEventCents =
    similarEventCount > 0 ? Math.round(totals.reduce((s, v) => s + v, 0) / similarEventCount) : 0

  const percentDifference =
    avgSimilarEventCents > 0
      ? parseFloat(
          (((thisEventTotalCents - avgSimilarEventCents) / avgSimilarEventCents) * 100).toFixed(1)
        )
      : 0

  return {
    thisEventTotalCents,
    avgSimilarEventCents,
    percentDifference,
    similarEventCount,
  }
}

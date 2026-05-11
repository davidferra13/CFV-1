// Weekly Ops Summary Generator
// Aggregates events, revenue, expenses, tasks, and reviews for a given week.
// NOT a server action file; called by weekly-ops-actions.ts.

import { createServerClient } from '@/lib/db/server'

// ── Types ────────────────────────────────────────────────────────────────────

export type WeeklyOpsEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string
  guestCount: number | null
  status: string
  revenueCents: number
}

export type WeeklyOpsExpenseCategory = {
  category: string
  totalCents: number
  count: number
}

export type WeeklyOpsReview = {
  clientName: string
  rating: number
  eventOccasion: string | null
}

export type WeeklyOpsMetricDelta = {
  current: number
  previous: number
  deltaPercent: number | null
  direction: 'up' | 'down' | 'flat'
}

export type WeeklyOpsReport = {
  // Period
  weekStart: string
  weekEnd: string

  // Events
  eventsCompleted: WeeklyOpsEvent[]
  eventsCompletedCount: number

  // Revenue
  totalRevenueCents: number
  revenueDelta: WeeklyOpsMetricDelta

  // Expenses
  totalExpensesCents: number
  expensesByCategory: WeeklyOpsExpenseCategory[]
  expensesDelta: WeeklyOpsMetricDelta

  // Profit
  netProfitCents: number
  profitDelta: WeeklyOpsMetricDelta

  // Reviews
  reviewsReceived: WeeklyOpsReview[]
  averageRating: number | null
  reviewCount: number

  // Upcoming preview
  upcomingNextWeek: Array<{
    eventId: string
    occasion: string | null
    eventDate: string
    clientName: string
    guestCount: number | null
  }>

  // Metadata
  generatedAt: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function computeDelta(current: number, previous: number): WeeklyOpsMetricDelta {
  if (previous === 0 && current === 0) {
    return { current, previous, deltaPercent: null, direction: 'flat' }
  }
  if (previous === 0) {
    return { current, previous, deltaPercent: null, direction: 'up' }
  }
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
  return {
    current,
    previous,
    deltaPercent: pct,
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
  }
}

// ── Generator ────────────────────────────────────────────────────────────────

export async function generateWeeklyOps(
  tenantId: string,
  weekStartInput: string
): Promise<WeeklyOpsReport> {
  const db: any = createServerClient()

  // Parse week boundaries
  const weekStartDate = new Date(weekStartInput + 'T00:00:00')
  const weekEndDate = addDays(weekStartDate, 6)
  const weekStart = toIsoDate(weekStartDate)
  const weekEnd = toIsoDate(weekEndDate)

  // Previous week for delta comparison
  const prevWeekStart = toIsoDate(addDays(weekStartDate, -7))
  const prevWeekEnd = toIsoDate(addDays(weekStartDate, -1))

  // Next week for preview
  const nextWeekStart = toIsoDate(addDays(weekEndDate, 1))
  const nextWeekEnd = toIsoDate(addDays(weekEndDate, 7))

  // Parallel-fetch all data
  const [
    eventsResult,
    prevEventsResult,
    nextEventsResult,
    expensesResult,
    prevExpensesResult,
    ledgerResult,
    prevLedgerResult,
    reviewsResult,
  ] = await Promise.all([
    // This week's events
    db
      .from('events')
      .select('id, occasion, event_date, guest_count, status, quoted_price_cents, clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', weekStart)
      .lte('event_date', weekEnd)
      .order('event_date', { ascending: true }),

    // Previous week's events (for delta)
    db
      .from('events')
      .select('id, status, quoted_price_cents')
      .eq('tenant_id', tenantId)
      .gte('event_date', prevWeekStart)
      .lte('event_date', prevWeekEnd),

    // Next week preview
    db
      .from('events')
      .select('id, occasion, event_date, guest_count, status, clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', nextWeekStart)
      .lte('event_date', nextWeekEnd)
      .not('status', 'eq', 'cancelled')
      .order('event_date', { ascending: true }),

    // This week's expenses
    db
      .from('expenses')
      .select('id, amount_cents, category, expense_date')
      .eq('tenant_id', tenantId)
      .gte('expense_date', weekStart)
      .lte('expense_date', weekEnd),

    // Previous week's expenses (for delta)
    db
      .from('expenses')
      .select('id, amount_cents')
      .eq('tenant_id', tenantId)
      .gte('expense_date', prevWeekStart)
      .lte('expense_date', prevWeekEnd),

    // This week's ledger entries (payments received)
    db
      .from('ledger_entries')
      .select('id, amount_cents, entry_type, is_refund')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${weekStart}T00:00:00`)
      .lte('created_at', `${weekEnd}T23:59:59`),

    // Previous week's ledger entries (for delta)
    db
      .from('ledger_entries')
      .select('id, amount_cents, entry_type, is_refund')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${prevWeekStart}T00:00:00`)
      .lte('created_at', `${prevWeekEnd}T23:59:59`),

    // This week's reviews
    db
      .from('client_reviews')
      .select('id, rating, client_id, event_id, clients(full_name), events!inner(occasion, event_date)')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${weekStart}T00:00:00`)
      .lte('created_at', `${weekEnd}T23:59:59`),
  ])

  // Process events for this week
  const allEvents = (eventsResult.data ?? []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    status: string
    quoted_price_cents: number | null
    clients: { full_name: string } | null
  }>

  // Fetch financial summaries for this week's events
  const eventIds = allEvents.map((e) => e.id)
  let finMap = new Map<string, number>()
  if (eventIds.length > 0) {
    const { data: fins } = await db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents')
      .in('event_id', eventIds)

    for (const f of fins ?? []) {
      if (f.event_id) finMap.set(f.event_id, f.net_revenue_cents ?? 0)
    }
  }

  const completedEvents: WeeklyOpsEvent[] = allEvents
    .filter((e) => e.status === 'completed')
    .map((e) => ({
      eventId: e.id,
      occasion: e.occasion,
      eventDate: e.event_date,
      clientName: e.clients?.full_name ?? 'Client',
      guestCount: e.guest_count,
      status: e.status,
      revenueCents: finMap.get(e.id) ?? e.quoted_price_cents ?? 0,
    }))

  // Revenue from ledger (payments collected)
  const calcRevenue = (entries: Array<{ amount_cents: number; entry_type: string; is_refund?: boolean }>) => {
    let total = 0
    for (const e of entries) {
      const isRefund = e.is_refund || e.entry_type === 'refund'
      if (isRefund) {
        total -= Math.abs(e.amount_cents)
      } else {
        total += e.amount_cents
      }
    }
    return total
  }

  const totalRevenueCents = calcRevenue(ledgerResult.data ?? [])
  const prevRevenueCents = calcRevenue(prevLedgerResult.data ?? [])

  // Expenses
  const expenseRows = (expensesResult.data ?? []) as Array<{
    id: string
    amount_cents: number
    category: string
    expense_date: string
  }>

  const totalExpensesCents = expenseRows.reduce((s, e) => s + (e.amount_cents ?? 0), 0)
  const prevExpensesCents = ((prevExpensesResult.data ?? []) as Array<{ amount_cents: number }>).reduce(
    (s, e) => s + (e.amount_cents ?? 0),
    0
  )

  // Expenses by category
  const catMap = new Map<string, { totalCents: number; count: number }>()
  for (const exp of expenseRows) {
    const cat = exp.category || 'Uncategorized'
    const existing = catMap.get(cat) || { totalCents: 0, count: 0 }
    existing.totalCents += exp.amount_cents ?? 0
    existing.count += 1
    catMap.set(cat, existing)
  }

  const expensesByCategory: WeeklyOpsExpenseCategory[] = [...catMap.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.totalCents - a.totalCents)

  // Profit
  const netProfitCents = totalRevenueCents - totalExpensesCents
  const prevProfitCents = prevRevenueCents - prevExpensesCents

  // Reviews
  const reviewRows = (reviewsResult.data ?? []) as Array<{
    id: string
    rating: number
    clients: { full_name: string } | null
    events: { occasion: string | null; event_date: string }
  }>

  const reviews: WeeklyOpsReview[] = reviewRows.map((r) => ({
    clientName: r.clients?.full_name ?? 'Client',
    rating: r.rating,
    eventOccasion: r.events?.occasion ?? null,
  }))

  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null

  // Upcoming next week preview
  const nextEvents = (nextEventsResult.data ?? []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    status: string
    clients: { full_name: string } | null
  }>

  const upcomingNextWeek = nextEvents.map((e) => ({
    eventId: e.id,
    occasion: e.occasion,
    eventDate: e.event_date,
    clientName: e.clients?.full_name ?? 'Client',
    guestCount: e.guest_count,
  }))

  return {
    weekStart,
    weekEnd,

    eventsCompleted: completedEvents,
    eventsCompletedCount: completedEvents.length,

    totalRevenueCents,
    revenueDelta: computeDelta(totalRevenueCents, prevRevenueCents),

    totalExpensesCents,
    expensesByCategory,
    expensesDelta: computeDelta(totalExpensesCents, prevExpensesCents),

    netProfitCents,
    profitDelta: computeDelta(netProfitCents, prevProfitCents),

    reviewsReceived: reviews,
    averageRating,
    reviewCount: reviews.length,

    upcomingNextWeek,

    generatedAt: new Date().toISOString(),
  }
}

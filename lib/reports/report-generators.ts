// Custom Report Generators
// Pure data-fetching functions that query existing tables and views.
// All amounts in cents. All dates as ISO strings.
// NOT a server action file - called by report-actions.ts.

import { createServerClient } from '@/lib/supabase/server'
import type { DateRangeFilter, ReportPeriod } from './report-definitions'

// ── Revenue Summary ────────────────────────────────────────────────────────

export type RevenueSummaryRow = {
  period: string
  grossRevenueCents: number
  refundsCents: number
  netRevenueCents: number
  tipsCents: number
  expensesCents: number
  profitCents: number
}

export type RevenueSummaryReport = {
  rows: RevenueSummaryRow[]
  totalGrossRevenueCents: number
  totalNetRevenueCents: number
  totalExpensesCents: number
  totalProfitCents: number
}

function periodBucket(isoDate: string, period: ReportPeriod): string {
  const d = new Date(isoDate)
  const year = d.getFullYear()
  const month = d.getMonth()

  switch (period) {
    case 'weekly': {
      // ISO week: use the Monday of the week as the bucket label
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d)
      monday.setDate(diff)
      return monday.toISOString().slice(0, 10)
    }
    case 'monthly':
      return `${year}-${String(month + 1).padStart(2, '0')}`
    case 'quarterly': {
      const q = Math.floor(month / 3) + 1
      return `${year}-Q${q}`
    }
    case 'yearly':
      return `${year}`
  }
}

export async function generateRevenueReport(
  tenantId: string,
  dateRange: DateRangeFilter,
  period: ReportPeriod = 'monthly'
): Promise<RevenueSummaryReport> {
  const supabase: any = createServerClient()

  const [ledgerResult, expensesResult] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('amount_cents, entry_type, is_refund, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${dateRange.start}T00:00:00`)
      .lte('created_at', `${dateRange.end}T23:59:59`),
    supabase
      .from('expenses')
      .select('amount_cents, expense_date, category')
      .eq('tenant_id', tenantId)
      .gte('expense_date', dateRange.start)
      .lte('expense_date', dateRange.end),
  ])

  if (ledgerResult.error) throw new Error(`Ledger query failed: ${ledgerResult.error.message}`)
  if (expensesResult.error)
    throw new Error(`Expenses query failed: ${expensesResult.error.message}`)

  const buckets = new Map<
    string,
    { gross: number; refunds: number; tips: number; expenses: number }
  >()

  const ensureBucket = (key: string) => {
    if (!buckets.has(key)) {
      buckets.set(key, { gross: 0, refunds: 0, tips: 0, expenses: 0 })
    }
    return buckets.get(key)!
  }

  for (const entry of ledgerResult.data || []) {
    const bucket = ensureBucket(periodBucket(entry.created_at, period))
    const isRefund = entry.is_refund || entry.entry_type === 'refund'

    if (isRefund) {
      bucket.refunds += Math.abs(entry.amount_cents)
    } else if (entry.entry_type === 'tip') {
      bucket.tips += entry.amount_cents
    } else {
      bucket.gross += entry.amount_cents
    }
  }

  for (const expense of expensesResult.data || []) {
    const bucket = ensureBucket(periodBucket(expense.expense_date, period))
    bucket.expenses += expense.amount_cents || 0
  }

  const rows: RevenueSummaryRow[] = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, data]) => ({
      period: p,
      grossRevenueCents: data.gross,
      refundsCents: data.refunds,
      netRevenueCents: data.gross - data.refunds,
      tipsCents: data.tips,
      expensesCents: data.expenses,
      profitCents: data.gross - data.refunds - data.expenses,
    }))

  return {
    rows,
    totalGrossRevenueCents: rows.reduce((s, r) => s + r.grossRevenueCents, 0),
    totalNetRevenueCents: rows.reduce((s, r) => s + r.netRevenueCents, 0),
    totalExpensesCents: rows.reduce((s, r) => s + r.expensesCents, 0),
    totalProfitCents: rows.reduce((s, r) => s + r.profitCents, 0),
  }
}

// ── Client Activity ────────────────────────────────────────────────────────

export type ClientActivityRow = {
  clientId: string
  clientName: string
  totalBookings: number
  totalSpendCents: number
  lastEventDate: string | null
}

export type ClientActivityReport = {
  rows: ClientActivityRow[]
  totalClients: number
  totalBookings: number
  totalSpendCents: number
}

export async function generateClientReport(
  tenantId: string,
  dateRange: DateRangeFilter
): Promise<ClientActivityReport> {
  const supabase: any = createServerClient()

  const [eventsResult, ledgerResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, client_id, event_date, status, clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', dateRange.start)
      .lte('event_date', dateRange.end)
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('ledger_entries')
      .select('client_id, amount_cents, entry_type, is_refund')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${dateRange.start}T00:00:00`)
      .lte('created_at', `${dateRange.end}T23:59:59`),
  ])

  if (eventsResult.error) throw new Error(`Events query failed: ${eventsResult.error.message}`)
  if (ledgerResult.error) throw new Error(`Ledger query failed: ${ledgerResult.error.message}`)

  const clientMap = new Map<
    string,
    { name: string; bookings: number; spendCents: number; lastDate: string | null }
  >()

  for (const event of eventsResult.data || []) {
    if (!event.client_id) continue
    const existing = clientMap.get(event.client_id) || {
      name: event.clients?.full_name || 'Client',
      bookings: 0,
      spendCents: 0,
      lastDate: null,
    }
    existing.bookings += 1
    if (!existing.lastDate || event.event_date > existing.lastDate) {
      existing.lastDate = event.event_date
    }
    clientMap.set(event.client_id, existing)
  }

  // Layer in spend from ledger
  for (const entry of ledgerResult.data || []) {
    if (!entry.client_id) continue
    const isRefund = entry.is_refund || entry.entry_type === 'refund'
    const existing = clientMap.get(entry.client_id)
    if (existing) {
      existing.spendCents += isRefund ? -Math.abs(entry.amount_cents) : entry.amount_cents
    }
  }

  const rows: ClientActivityRow[] = [...clientMap.entries()]
    .map(([clientId, data]) => ({
      clientId,
      clientName: data.name,
      totalBookings: data.bookings,
      totalSpendCents: data.spendCents,
      lastEventDate: data.lastDate,
    }))
    .sort((a, b) => b.totalSpendCents - a.totalSpendCents)

  return {
    rows,
    totalClients: rows.length,
    totalBookings: rows.reduce((s, r) => s + r.totalBookings, 0),
    totalSpendCents: rows.reduce((s, r) => s + r.totalSpendCents, 0),
  }
}

// ── Event Performance ──────────────────────────────────────────────────────

export type EventPerformanceRow = {
  period: string
  eventCount: number
  totalRevenueCents: number
  totalExpensesCents: number
  avgMarginPercent: number | null
}

export type EventPerformanceReport = {
  rows: EventPerformanceRow[]
  totalEvents: number
  totalRevenueCents: number
  avgMarginPercent: number | null
}

export async function generateEventReport(
  tenantId: string,
  dateRange: DateRangeFilter,
  period: ReportPeriod = 'monthly'
): Promise<EventPerformanceReport> {
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_financial_summary')
    .select(
      'event_id, net_revenue_cents, total_expenses_cents, profit_margin, events!inner(event_date, status)'
    )
    .eq('tenant_id', tenantId)

  if (error && error.code !== '42P01') {
    throw new Error(`Event performance query failed: ${error.message}`)
  }

  const rows = (data || []) as Array<{
    event_id: string
    net_revenue_cents: number | null
    total_expenses_cents: number | null
    profit_margin: number | null
    events: { event_date: string; status: string }
  }>

  const filtered = rows.filter((r) => {
    const d = r.events?.event_date
    return d && d >= dateRange.start && d <= dateRange.end && r.events.status !== 'cancelled'
  })

  const buckets = new Map<
    string,
    { count: number; revenue: number; expenses: number; margins: number[] }
  >()

  for (const row of filtered) {
    const key = periodBucket(row.events.event_date, period)
    const b = buckets.get(key) || { count: 0, revenue: 0, expenses: 0, margins: [] }
    b.count += 1
    b.revenue += row.net_revenue_cents || 0
    b.expenses += row.total_expenses_cents || 0
    if (row.profit_margin != null) b.margins.push(row.profit_margin)
    buckets.set(key, b)
  }

  const resultRows: EventPerformanceRow[] = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, b]) => ({
      period: p,
      eventCount: b.count,
      totalRevenueCents: b.revenue,
      totalExpensesCents: b.expenses,
      avgMarginPercent:
        b.margins.length > 0
          ? Math.round((b.margins.reduce((s, m) => s + m, 0) / b.margins.length) * 100) / 100
          : null,
    }))

  const allMargins = filtered.map((r) => r.profit_margin).filter((m): m is number => m != null)

  return {
    rows: resultRows,
    totalEvents: filtered.length,
    totalRevenueCents: resultRows.reduce((s, r) => s + r.totalRevenueCents, 0),
    avgMarginPercent:
      allMargins.length > 0
        ? Math.round((allMargins.reduce((s, m) => s + m, 0) / allMargins.length) * 100) / 100
        : null,
  }
}

// ── Expense Breakdown ──────────────────────────────────────────────────────

export type ExpenseBreakdownRow = {
  category: string
  period: string
  totalCents: number
  count: number
}

export type ExpenseBreakdownReport = {
  rows: ExpenseBreakdownRow[]
  totalExpensesCents: number
  categories: string[]
}

export async function generateExpenseReport(
  tenantId: string,
  dateRange: DateRangeFilter,
  period: ReportPeriod = 'monthly'
): Promise<ExpenseBreakdownReport> {
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('amount_cents, expense_date, category')
    .eq('tenant_id', tenantId)
    .gte('expense_date', dateRange.start)
    .lte('expense_date', dateRange.end)

  if (error) throw new Error(`Expenses query failed: ${error.message}`)

  const buckets = new Map<string, { totalCents: number; count: number }>()
  const categories = new Set<string>()

  for (const expense of data || []) {
    const cat = expense.category || 'Uncategorized'
    const p = periodBucket(expense.expense_date, period)
    const key = `${cat}::${p}`
    categories.add(cat)

    const b = buckets.get(key) || { totalCents: 0, count: 0 }
    b.totalCents += expense.amount_cents || 0
    b.count += 1
    buckets.set(key, b)
  }

  const rows: ExpenseBreakdownRow[] = [...buckets.entries()]
    .map(([key, b]) => {
      const [category, p] = key.split('::')
      return { category, period: p, totalCents: b.totalCents, count: b.count }
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.period.localeCompare(b.period))

  return {
    rows,
    totalExpensesCents: rows.reduce((s, r) => s + r.totalCents, 0),
    categories: [...categories].sort(),
  }
}

// ── Pipeline Conversion ────────────────────────────────────────────────────

export type PipelineConversionReport = {
  totalInquiries: number
  totalEventsCreated: number
  totalCompleted: number
  totalCancelled: number
  inquiryToEventRate: number | null
  eventToCompletedRate: number | null
  avgDaysToFirstEvent: number | null
  bySource: Array<{
    source: string
    inquiries: number
    events: number
    conversionRate: number | null
  }>
}

export async function generatePipelineReport(
  tenantId: string,
  dateRange: DateRangeFilter
): Promise<PipelineConversionReport> {
  const supabase: any = createServerClient()

  const [inquiriesResult, eventsResult] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, source, created_at, event_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${dateRange.start}T00:00:00`)
      .lte('created_at', `${dateRange.end}T23:59:59`),
    supabase
      .from('events')
      .select('id, status, created_at, inquiry_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${dateRange.start}T00:00:00`)
      .lte('created_at', `${dateRange.end}T23:59:59`),
  ])

  if (inquiriesResult.error)
    throw new Error(`Inquiries query failed: ${inquiriesResult.error.message}`)
  if (eventsResult.error) throw new Error(`Events query failed: ${eventsResult.error.message}`)

  const inquiries = (inquiriesResult.data || []) as Array<{
    id: string
    source: string | null
    created_at: string
    event_id: string | null
  }>
  const events = (eventsResult.data || []) as Array<{
    id: string
    status: string
    created_at: string
    inquiry_id: string | null
  }>

  const totalInquiries = inquiries.length
  const totalEventsCreated = events.length
  const totalCompleted = events.filter((e) => e.status === 'completed').length
  const totalCancelled = events.filter((e) => e.status === 'cancelled').length

  // Calculate average days from inquiry to event creation
  const daysToEvent: number[] = []
  for (const event of events) {
    if (!event.inquiry_id) continue
    const inquiry = inquiries.find((i) => i.id === event.inquiry_id)
    if (!inquiry) continue
    const days =
      (new Date(event.created_at).getTime() - new Date(inquiry.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
    daysToEvent.push(days)
  }

  // By source
  const sourceMap = new Map<string, { inquiries: number; events: number }>()
  for (const inq of inquiries) {
    const source = inq.source || 'Unknown'
    const s = sourceMap.get(source) || { inquiries: 0, events: 0 }
    s.inquiries += 1
    if (inq.event_id) s.events += 1
    sourceMap.set(source, s)
  }

  return {
    totalInquiries,
    totalEventsCreated,
    totalCompleted,
    totalCancelled,
    inquiryToEventRate:
      totalInquiries > 0 ? Math.round((totalEventsCreated / totalInquiries) * 10000) / 100 : null,
    eventToCompletedRate:
      totalEventsCreated > 0
        ? Math.round((totalCompleted / totalEventsCreated) * 10000) / 100
        : null,
    avgDaysToFirstEvent:
      daysToEvent.length > 0
        ? Math.round((daysToEvent.reduce((s, d) => s + d, 0) / daysToEvent.length) * 10) / 10
        : null,
    bySource: [...sourceMap.entries()]
      .map(([source, data]) => ({
        source,
        inquiries: data.inquiries,
        events: data.events,
        conversionRate:
          data.inquiries > 0 ? Math.round((data.events / data.inquiries) * 10000) / 100 : null,
      }))
      .sort((a, b) => b.inquiries - a.inquiries),
  }
}

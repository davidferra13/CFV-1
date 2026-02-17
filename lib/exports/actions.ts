// Financial Export Server Actions
// CSV exports for per-event statements, all expenses, and all-events master

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getExpenses, type ExpenseFilters } from '@/lib/expenses/actions'
import { getCategoryLabel, EXPENSE_CATEGORY_VALUES } from '@/lib/constants/expense-categories'
import { format } from 'date-fns'

// --- Helpers ---

function formatDollars(cents: number): string {
  const dollars = cents / 100
  return dollars < 0
    ? `-$${Math.abs(dollars).toFixed(2)}`
    : `$${dollars.toFixed(2)}`
}

function csvEscape(value: string | null | undefined): string {
  if (!value) return ''
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = value.replace(/"/g, '""')
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`
  }
  return escaped
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(cell => {
    if (cell === null || cell === undefined) return ''
    if (typeof cell === 'number') return cell.toString()
    return csvEscape(cell)
  }).join(',')
}

// --- Export 1: Per-Event Financial Statement ---

export async function exportEventCSV(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get event details
  const { data: event } = await supabase
    .from('events')
    .select('*, client:clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Get revenue (ledger entries) and expenses in parallel
  const [ledgerEntries, expenses] = await Promise.all([
    getLedgerEntries({ eventId }),
    supabase
      .from('expenses')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .order('expense_date', { ascending: true })
      .then(({ data }) => data || []),
  ])

  // Compute totals
  let totalRevenueCents = 0
  let totalBusinessExpensesCents = 0
  let foodCostCents = 0

  for (const entry of ledgerEntries) {
    totalRevenueCents += entry.amount_cents
  }

  for (const exp of expenses) {
    if (exp.is_business) {
      totalBusinessExpensesCents += exp.amount_cents
      if (['groceries', 'alcohol', 'specialty_items'].includes(exp.category)) {
        foodCostCents += exp.amount_cents
      }
    }
  }

  const profitCents = totalRevenueCents - totalBusinessExpensesCents
  const marginPercent = totalRevenueCents > 0
    ? ((profitCents / totalRevenueCents) * 100).toFixed(1)
    : '0.0'
  const foodCostPercent = totalRevenueCents > 0
    ? ((foodCostCents / totalRevenueCents) * 100).toFixed(1)
    : '0.0'

  // Build CSV
  const lines: string[] = []

  // Header section
  lines.push('=== EVENT FINANCIAL STATEMENT ===')
  lines.push(csvRow(['Event', event.occasion || 'Untitled']))
  lines.push(csvRow(['Date', format(new Date(event.event_date), 'MMMM d, yyyy')]))
  lines.push(csvRow(['Client', event.client?.full_name || 'Unknown']))
  lines.push(csvRow(['Guests', event.guest_count]))
  lines.push(csvRow(['Status', event.status]))
  lines.push(csvRow(['Quoted Price', formatDollars(event.quoted_price_cents ?? 0)]))
  lines.push('')

  // Revenue section
  lines.push('=== REVENUE ===')
  lines.push(csvRow(['Date', 'Type', 'Amount', 'Payment Method', 'Description']))
  for (const entry of ledgerEntries) {
    lines.push(csvRow([
      format(new Date(entry.created_at), 'yyyy-MM-dd'),
      entry.entry_type,
      formatDollars(entry.amount_cents),
      entry.payment_method,
      entry.description,
    ]))
  }
  lines.push(csvRow(['', '', formatDollars(totalRevenueCents), '', 'TOTAL REVENUE']))
  lines.push('')

  // Expenses section
  lines.push('=== EXPENSES ===')
  lines.push(csvRow(['Date', 'Category', 'Vendor', 'Amount', 'Payment Method', 'Business/Personal', 'Description']))
  for (const exp of expenses) {
    lines.push(csvRow([
      exp.expense_date,
      getCategoryLabel(exp.category),
      exp.vendor_name,
      formatDollars(exp.amount_cents),
      exp.payment_method,
      exp.is_business ? 'Business' : 'Personal',
      exp.description,
    ]))
  }
  lines.push(csvRow(['', '', '', formatDollars(totalBusinessExpensesCents), '', '', 'TOTAL BUSINESS EXPENSES']))
  lines.push('')

  // Summary section
  lines.push('=== SUMMARY ===')
  lines.push(csvRow(['Total Revenue', formatDollars(totalRevenueCents)]))
  lines.push(csvRow(['Total Business Expenses', formatDollars(totalBusinessExpensesCents)]))
  lines.push(csvRow(['Profit', formatDollars(profitCents)]))
  lines.push(csvRow(['Profit Margin', `${marginPercent}%`]))
  lines.push(csvRow(['Food Cost %', `${foodCostPercent}%`]))

  const slug = (event.occasion || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const dateStr = format(new Date(event.event_date), 'yyyy-MM-dd')

  return {
    csv: lines.join('\n'),
    filename: `event-${slug}-${dateStr}.csv`,
  }
}

// --- Export 2: All Expenses (Sortable) ---

export async function exportExpensesCSV(filters: ExpenseFilters = {}) {
  const expenses = await getExpenses(filters)

  const lines: string[] = []

  lines.push(csvRow([
    'Date', 'Event', 'Event Date', 'Client', 'Category', 'Vendor',
    'Amount', 'Description', 'Payment Method', 'Card Used',
    'Business/Personal', 'Reimbursable', 'Notes',
  ]))

  for (const exp of expenses) {
    const event = (exp as any).event
    lines.push(csvRow([
      exp.expense_date,
      event?.occasion || '(general)',
      event?.event_date || '',
      event?.client?.full_name || '',
      getCategoryLabel(exp.category),
      exp.vendor_name,
      formatDollars(exp.amount_cents),
      exp.description,
      exp.payment_method,
      exp.payment_card_used,
      exp.is_business ? 'Business' : 'Personal',
      exp.is_reimbursable ? 'Yes' : 'No',
      exp.notes,
    ]))
  }

  // Total row
  const totalCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const businessCents = expenses.filter(e => e.is_business).reduce((sum, e) => sum + e.amount_cents, 0)
  lines.push('')
  lines.push(csvRow(['', '', '', '', '', 'TOTAL', formatDollars(totalCents)]))
  lines.push(csvRow(['', '', '', '', '', 'TOTAL BUSINESS', formatDollars(businessCents)]))

  return {
    csv: lines.join('\n'),
    filename: `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`,
  }
}

// --- Export 3: All Events Master (Tax Export) ---

export async function exportAllEventsCSV(year: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  const startDate = `${year}-01-01`
  const endDate = `${year + 1}-01-01`

  // Get all events for the year with client info
  const { data: events } = await supabase
    .from('events')
    .select('*, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startDate)
    .lt('event_date', endDate)
    .order('event_date', { ascending: true })

  // Get financial summaries for all events
  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  // Get all expenses for the year
  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', startDate)
    .lt('expense_date', endDate)

  const summaryMap = new Map((summaries || []).map(s => [s.event_id, s]))

  // Build per-event expense breakdown by category
  const expensesByEvent = new Map<string | null, Map<string, number>>()
  const expenseTotalsByEvent = new Map<string | null, number>()

  for (const exp of (allExpenses || [])) {
    if (!exp.is_business) continue
    const key = exp.event_id || null
    if (!expensesByEvent.has(key)) {
      expensesByEvent.set(key, new Map())
      expenseTotalsByEvent.set(key, 0)
    }
    const catMap = expensesByEvent.get(key)!
    catMap.set(exp.category, (catMap.get(exp.category) || 0) + exp.amount_cents)
    expenseTotalsByEvent.set(key, (expenseTotalsByEvent.get(key) || 0) + exp.amount_cents)
  }

  // Category columns (all 17 minus "other" which goes last)
  const categoryColumns = EXPENSE_CATEGORY_VALUES.filter(c => c !== 'other')

  const lines: string[] = []

  // Header
  const headers = [
    'Event Date', 'Event Name', 'Client', 'Guests', 'Status',
    'Quoted Price', 'Total Paid', 'Tips', 'Refunds', 'Net Revenue',
    'Total Expenses',
    ...categoryColumns.map(c => getCategoryLabel(c)),
    'Other',
    'Profit', 'Margin %',
  ]
  lines.push(csvRow(headers))

  // Totals accumulators
  let grandQuoted = 0
  let grandPaid = 0
  let grandTips = 0
  let grandRefunds = 0
  let grandNet = 0
  let grandExpenses = 0
  let grandProfit = 0
  const grandCategoryTotals = new Map<string, number>()

  // Event rows
  for (const event of (events || [])) {
    const summary = summaryMap.get(event.id)
    const catMap = expensesByEvent.get(event.id) || new Map()
    const totalExp = expenseTotalsByEvent.get(event.id) || 0

    const quotedCents = event.quoted_price_cents ?? 0
    const paidCents = summary?.total_paid_cents ?? 0
    const tipCents = summary?.tip_amount_cents ?? 0
    const refundCents = summary?.total_refunded_cents ?? 0
    const netCents = paidCents + tipCents - refundCents
    const profitCents = netCents - totalExp
    const marginPct = netCents > 0 ? ((profitCents / netCents) * 100).toFixed(1) : '0.0'

    grandQuoted += quotedCents
    grandPaid += paidCents
    grandTips += tipCents
    grandRefunds += refundCents
    grandNet += netCents
    grandExpenses += totalExp
    grandProfit += profitCents

    const catCells = categoryColumns.map(c => {
      const val = catMap.get(c) || 0
      grandCategoryTotals.set(c, (grandCategoryTotals.get(c) || 0) + val)
      return val > 0 ? formatDollars(val) : ''
    })
    const otherVal = catMap.get('other') || 0
    grandCategoryTotals.set('other', (grandCategoryTotals.get('other') || 0) + otherVal)

    lines.push(csvRow([
      event.event_date,
      event.occasion || 'Untitled',
      event.client?.full_name || 'Unknown',
      event.guest_count,
      event.status,
      formatDollars(quotedCents),
      formatDollars(paidCents),
      tipCents > 0 ? formatDollars(tipCents) : '',
      refundCents > 0 ? formatDollars(-refundCents) : '',
      formatDollars(netCents),
      totalExp > 0 ? formatDollars(totalExp) : '',
      ...catCells,
      otherVal > 0 ? formatDollars(otherVal) : '',
      formatDollars(profitCents),
      `${marginPct}%`,
    ]))
  }

  // Unlinked expenses row (general business overhead not tied to events)
  const unlinkedCatMap = expensesByEvent.get(null)
  const unlinkedTotal = expenseTotalsByEvent.get(null) || 0
  if (unlinkedTotal > 0) {
    const unlinkedCatCells = categoryColumns.map(c => {
      const val = unlinkedCatMap?.get(c) || 0
      grandCategoryTotals.set(c, (grandCategoryTotals.get(c) || 0) + val)
      return val > 0 ? formatDollars(val) : ''
    })
    const unlinkedOther = unlinkedCatMap?.get('other') || 0
    grandCategoryTotals.set('other', (grandCategoryTotals.get('other') || 0) + unlinkedOther)
    grandExpenses += unlinkedTotal
    grandProfit -= unlinkedTotal

    lines.push(csvRow([
      '', 'General Business Expenses', '', '', '',
      '', '', '', '', '',
      formatDollars(unlinkedTotal),
      ...unlinkedCatCells,
      unlinkedOther > 0 ? formatDollars(unlinkedOther) : '',
      formatDollars(-unlinkedTotal),
      '',
    ]))
  }

  // Totals row
  lines.push('')
  const totalCatCells = categoryColumns.map(c => {
    const val = grandCategoryTotals.get(c) || 0
    return val > 0 ? formatDollars(val) : ''
  })
  const totalOther = grandCategoryTotals.get('other') || 0
  const grandMargin = grandNet > 0 ? ((grandProfit / grandNet) * 100).toFixed(1) : '0.0'

  lines.push(csvRow([
    '', 'TOTALS', '', '', '',
    formatDollars(grandQuoted),
    formatDollars(grandPaid),
    grandTips > 0 ? formatDollars(grandTips) : '',
    grandRefunds > 0 ? formatDollars(-grandRefunds) : '',
    formatDollars(grandNet),
    formatDollars(grandExpenses),
    ...totalCatCells,
    totalOther > 0 ? formatDollars(totalOther) : '',
    formatDollars(grandProfit),
    `${grandMargin}%`,
  ]))

  return {
    csv: lines.join('\n'),
    filename: `chefflow-financials-${year}.csv`,
  }
}

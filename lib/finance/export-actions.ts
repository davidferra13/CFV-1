'use server'

// Finance Export Actions
// Server actions that compute CSV exports for key financial reports.
// All return { csv: string; filename: string } to match CSVDownloadButton's expected shape.

import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getEvents } from '@/lib/events/actions'
import { getExpenses } from '@/lib/expenses/actions'
import { format, subMonths, startOfMonth } from 'date-fns'

// ============================================
// HELPERS
// ============================================

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')
}

// ============================================
// LEDGER TRANSACTION LOG
// ============================================

/**
 * Export all ledger entries as CSV.
 * Includes: date, type, event, client, amount (dollars), method, description, reference.
 */
export async function exportLedgerEntriesCSV(): Promise<{ csv: string; filename: string }> {
  await requireChef()
  const entries = await getLedgerEntries()

  const headers = [
    'Date',
    'Type',
    'Event',
    'Amount ($)',
    'Refund',
    'Method',
    'Description',
    'Reference',
  ]
  const rows = entries.map((entry) => [
    format(new Date(entry.created_at), 'yyyy-MM-dd'),
    entry.entry_type.replace(/_/g, ' '),
    entry.event?.occasion?.replace(/_/g, ' ') ?? '',
    ((entry.amount_cents ?? 0) / 100).toFixed(2),
    entry.is_refund ? 'YES' : 'NO',
    entry.payment_method?.replace(/_/g, ' ') ?? '',
    entry.description ?? '',
    entry.transaction_reference ?? '',
  ])

  const csv = buildCSV(headers, rows)
  const filename = `ledger-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
  return { csv, filename }
}

// ============================================
// REVENUE BY MONTH
// ============================================

/**
 * Export 12-month rolling revenue as CSV.
 */
export async function exportRevenueByMonthCSV(): Promise<{ csv: string; filename: string }> {
  await requireChef()

  const now = new Date()
  const startDate = subMonths(startOfMonth(now), 11).toISOString()
  const entries = await getLedgerEntries({ startDate })

  // Build 12 monthly buckets
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i)
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy'), revenue: 0, refunds: 0 }
  })

  for (const entry of entries) {
    const key = format(new Date(entry.created_at), 'yyyy-MM')
    const bucket = months.find((m) => m.key === key)
    if (!bucket) continue
    if (entry.is_refund) {
      bucket.refunds += entry.amount_cents
    } else {
      bucket.revenue += entry.amount_cents
    }
  }

  const headers = ['Month', 'Gross Revenue ($)', 'Refunds ($)', 'Net Revenue ($)']
  const rows = [...months]
    .reverse()
    .map((m) => [
      m.label,
      (m.revenue / 100).toFixed(2),
      (m.refunds / 100).toFixed(2),
      ((m.revenue - m.refunds) / 100).toFixed(2),
    ])

  const csv = buildCSV(headers, rows)
  const filename = `revenue-by-month-${format(now, 'yyyy-MM-dd')}.csv`
  return { csv, filename }
}

// ============================================
// REVENUE BY CLIENT
// ============================================

/**
 * Export client lifetime value as CSV.
 */
export async function exportRevenueByClientCSV(): Promise<{ csv: string; filename: string }> {
  await requireChef()
  const events = await getEvents()

  const clientMap = new Map<
    string,
    {
      name: string
      eventCount: number
      totalRevenue: number
      completedRevenue: number
    }
  >()

  for (const event of events) {
    if (!event.client) continue
    const revenue = event.quoted_price_cents ?? 0
    const isCompleted = event.status === 'completed'
    const existing = clientMap.get(event.client.id)

    if (existing) {
      existing.eventCount++
      existing.totalRevenue += revenue
      if (isCompleted) existing.completedRevenue += revenue
    } else {
      clientMap.set(event.client.id, {
        name: event.client.full_name,
        eventCount: 1,
        totalRevenue: revenue,
        completedRevenue: isCompleted ? revenue : 0,
      })
    }
  }

  const clients = Array.from(clientMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

  const headers = [
    'Client',
    'Events',
    'Total Revenue ($)',
    'Completed Revenue ($)',
    'Avg per Event ($)',
  ]
  const rows = clients.map((c) => [
    c.name,
    c.eventCount,
    (c.totalRevenue / 100).toFixed(2),
    (c.completedRevenue / 100).toFixed(2),
    (c.eventCount > 0 ? c.totalRevenue / c.eventCount / 100 : 0).toFixed(2),
  ])

  const csv = buildCSV(headers, rows)
  const filename = `revenue-by-client-${format(new Date(), 'yyyy-MM-dd')}.csv`
  return { csv, filename }
}

// ============================================
// EXPENSES
// ============================================

/**
 * Export all expenses as CSV.
 */
export async function exportExpensesCSV(): Promise<{ csv: string; filename: string }> {
  await requireChef()
  const expenses = await getExpenses()

  const headers = ['Date', 'Category', 'Amount ($)', 'Vendor', 'Description', 'Event', 'Receipt']
  const rows = expenses.map((e: any) => [
    e.expense_date ?? format(new Date(e.created_at), 'yyyy-MM-dd'),
    e.category?.replace(/_/g, ' ') ?? '',
    ((e.amount_cents ?? 0) / 100).toFixed(2),
    e.vendor_name ?? '',
    e.description ?? '',
    e.event?.occasion?.replace(/_/g, ' ') ?? '',
    e.receipt_url ? 'YES' : 'NO',
  ])

  const csv = buildCSV(headers, rows)
  const filename = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`
  return { csv, filename }
}

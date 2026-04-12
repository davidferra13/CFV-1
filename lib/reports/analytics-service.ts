import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToMonthString } from '@/lib/utils/format'

export type FinancialAnalyticsSnapshot = {
  range: {
    start: string
    end: string
  }
  totals: {
    grossRevenueCents: number
    refundsCents: number
    netRevenueCents: number
    tipsCents: number
    expensesCents: number
    profitCents: number
    outstandingCents: number
  }
  pipeline: {
    upcomingEventCount: number
    upcomingQuotedCents: number
    overdueInvoiceCount: number
  }
  monthlyNetRevenue: Array<{
    month: string
    amountCents: number
  }>
  topClients: Array<{
    clientId: string
    clientName: string
    netRevenueCents: number
  }>
}

type DateRangeInput = {
  start?: string | null
  end?: string | null
}

function resolveDateRange(input?: DateRangeInput): { start: string; end: string } {
  const now = new Date()
  const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const _start = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
  const defaultStart = `${_start.getFullYear()}-${String(_start.getMonth() + 1).padStart(2, '0')}-${String(_start.getDate()).padStart(2, '0')}`

  const startDate =
    input?.start && !Number.isNaN(Date.parse(input.start)) ? input.start : defaultStart
  const endDate = input?.end && !Number.isNaN(Date.parse(input.end)) ? input.end : defaultEnd

  return { start: startDate, end: endDate }
}

function monthBucket(val: Date | string): string {
  return dateToMonthString(val)
}

export async function getFinancialAnalytics(
  range?: DateRangeInput
): Promise<FinancialAnalyticsSnapshot> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { start, end } = resolveDateRange(range)
  const _ra = new Date()
  const nowDate = `${_ra.getFullYear()}-${String(_ra.getMonth() + 1).padStart(2, '0')}-${String(_ra.getDate()).padStart(2, '0')}`

  const [ledgerResult, expensesResult, eventsResult, summaryResult] = await Promise.all([
    db
      .from('ledger_entries')
      .select('id, client_id, amount_cents, entry_type, is_refund, created_at')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`),
    db
      .from('expenses')
      .select('id, amount_cents, expense_date')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', start)
      .lte('expense_date', end),
    db
      .from('events')
      .select('id, client_id, event_date, status, quoted_price_cents, clients(full_name)')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', start)
      .lte('event_date', end),
    db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents, outstanding_balance_cents')
      .eq('tenant_id', user.tenantId!),
  ])

  if (ledgerResult.error) {
    throw new Error(`Failed loading ledger analytics: ${ledgerResult.error.message}`)
  }
  if (expensesResult.error) {
    throw new Error(`Failed loading expense analytics: ${expensesResult.error.message}`)
  }
  if (eventsResult.error) {
    throw new Error(`Failed loading event analytics: ${eventsResult.error.message}`)
  }
  if (summaryResult.error && summaryResult.error.code !== '42P01') {
    throw new Error(`Failed loading financial summaries: ${summaryResult.error.message}`)
  }

  const ledgerRows = (ledgerResult.data || []) as Array<{
    client_id: string | null
    amount_cents: number
    entry_type: string
    is_refund: boolean
    created_at: string
  }>
  const expensesRows = (expensesResult.data || []) as Array<{ amount_cents: number }>
  const eventsRows = (eventsResult.data || []) as Array<{
    id: string
    client_id: string | null
    event_date: string
    status: string
    quoted_price_cents: number | null
    clients: { full_name: string | null } | null
  }>
  const summaryRows = (summaryResult.data || []) as Array<{
    event_id: string
    total_paid_cents: number | null
    outstanding_balance_cents: number | null
  }>

  let grossRevenueCents = 0
  let refundsCents = 0
  let tipsCents = 0
  const monthlyNet = new Map<string, number>()
  const clientRevenue = new Map<string, number>()

  for (const entry of ledgerRows) {
    const isRefund = entry.is_refund || entry.entry_type === 'refund'
    const month = monthBucket(entry.created_at)

    if (isRefund) {
      const amount = Math.abs(entry.amount_cents)
      refundsCents += amount
      monthlyNet.set(month, (monthlyNet.get(month) || 0) - amount)
      continue
    }

    if (entry.entry_type === 'tip') {
      tipsCents += entry.amount_cents
      continue
    }

    grossRevenueCents += entry.amount_cents
    monthlyNet.set(month, (monthlyNet.get(month) || 0) + entry.amount_cents)

    if (entry.client_id) {
      clientRevenue.set(
        entry.client_id,
        (clientRevenue.get(entry.client_id) || 0) + entry.amount_cents
      )
    }
  }

  const expensesCents = expensesRows.reduce((sum, row) => sum + (row.amount_cents || 0), 0)
  const netRevenueCents = grossRevenueCents - refundsCents
  const profitCents = netRevenueCents - expensesCents

  const eventSummaryById = new Map(
    summaryRows.map((row) => [
      row.event_id,
      {
        totalPaidCents: row.total_paid_cents || 0,
        outstandingCents: row.outstanding_balance_cents || 0,
      },
    ])
  )

  let outstandingCents = 0
  let upcomingEventCount = 0
  let upcomingQuotedCents = 0
  let overdueInvoiceCount = 0

  for (const event of eventsRows) {
    const summary = eventSummaryById.get(event.id)
    const quoted = event.quoted_price_cents || 0
    const paid = summary?.totalPaidCents || 0
    const outstanding = summary?.outstandingCents ?? Math.max(quoted - paid, 0)
    outstandingCents += outstanding

    if (event.event_date >= nowDate && !['cancelled', 'completed'].includes(event.status)) {
      upcomingEventCount += 1
      upcomingQuotedCents += quoted
    }

    if (event.event_date < nowDate && outstanding > 0 && !['cancelled'].includes(event.status)) {
      overdueInvoiceCount += 1
    }
  }

  const topClients = eventsRows
    .reduce<Array<{ clientId: string; clientName: string; netRevenueCents: number }>>(
      (acc, event) => {
        if (!event.client_id) return acc
        const existing = acc.find((row) => row.clientId === event.client_id)
        const value = clientRevenue.get(event.client_id) || 0
        const name = event.clients?.full_name || 'Client'
        if (!existing) {
          acc.push({ clientId: event.client_id, clientName: name, netRevenueCents: value })
        } else {
          existing.netRevenueCents = value
        }
        return acc
      },
      []
    )
    .sort((a, b) => b.netRevenueCents - a.netRevenueCents)
    .slice(0, 5)

  const monthlyNetRevenue = [...monthlyNet.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amountCents]) => ({ month, amountCents }))

  return {
    range: { start, end },
    totals: {
      grossRevenueCents,
      refundsCents,
      netRevenueCents,
      tipsCents,
      expensesCents,
      profitCents,
      outstandingCents,
    },
    pipeline: {
      upcomingEventCount,
      upcomingQuotedCents,
      overdueInvoiceCount,
    },
    monthlyNetRevenue,
    topClients,
  }
}

// CIL Proactive Analyzer: Finance
// Detects revenue trends, overdue invoices, and expense spikes

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeFinance(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Revenue trends: compare last 30 days vs prior 30 days
    await analyzeRevenueTrends(client, tenantId, signals, now)

    // 2. Overdue invoices: completed events with unpaid balance
    await analyzeOverdueInvoices(client, tenantId, signals, now)

    // 3. Expense spikes: recent expenses vs historical average
    await analyzeExpenseSpikes(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/finance] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

async function analyzeRevenueTrends(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)

  // Recent 30 days payments
  const { data: recentPayments } = await client
    .from('ledger_entries')
    .select('amount_cents')
    .eq('tenant_id', tenantId)
    .eq('is_refund', false)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Prior 30 days payments
  const { data: priorPayments } = await client
    .from('ledger_entries')
    .select('amount_cents')
    .eq('tenant_id', tenantId)
    .eq('is_refund', false)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lte('created_at', thirtyDaysAgo.toISOString())

  const recentTotal = (recentPayments || []).reduce(
    (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
    0
  )
  const priorTotal = (priorPayments || []).reduce(
    (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
    0
  )

  if (priorTotal > 0) {
    const changePercent = ((recentTotal - priorTotal) / priorTotal) * 100

    if (changePercent <= -30) {
      signals.push({
        id: generateId(),
        domain: 'finance',
        urgency: 4,
        confidence: 0.8,
        title: 'Revenue declining significantly',
        detail: `Revenue dropped ${Math.abs(Math.round(changePercent))}% in the last 30 days compared to the prior period ($${(recentTotal / 100).toFixed(0)} vs $${(priorTotal / 100).toFixed(0)}).`,
        suggestedAction: 'Review pipeline and follow up with pending inquiries',
        actionType: 'navigate',
        actionPayload: { path: '/analytics' },
        entityIds: [],
        source: 'finance.revenueTrends',
        createdAt: now,
      })
    } else if (changePercent >= 30) {
      signals.push({
        id: generateId(),
        domain: 'finance',
        urgency: 1,
        confidence: 0.85,
        title: 'Revenue growing strongly',
        detail: `Revenue up ${Math.round(changePercent)}% in the last 30 days ($${(recentTotal / 100).toFixed(0)} vs $${(priorTotal / 100).toFixed(0)}).`,
        suggestedAction: 'Consider raising rates or expanding capacity',
        actionType: 'dismiss',
        entityIds: [],
        source: 'finance.revenueTrends',
        createdAt: now,
      })
    }
  }
}

async function analyzeOverdueInvoices(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  // Find completed events
  const { data: completedEvents } = await client
    .from('events')
    .select('id, client_id, occasion, quoted_price_cents, event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('financially_closed', false)

  if (!completedEvents || completedEvents.length === 0) return

  for (const event of completedEvents) {
    if (!event.quoted_price_cents) continue

    // Sum all payments for this event
    const { data: payments } = await client
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('event_id', event.id)

    const totalPaid = (payments || []).reduce(
      (sum: number, p: { amount_cents: number }) => sum + p.amount_cents,
      0
    )

    const balance = event.quoted_price_cents - totalPaid
    if (balance > 0) {
      signals.push({
        id: generateId(),
        domain: 'finance',
        urgency: 4,
        confidence: 0.95,
        title: `Unpaid balance: $${(balance / 100).toFixed(0)}`,
        detail: `Event "${event.occasion || 'Untitled'}" on ${event.event_date} is completed but has an outstanding balance of $${(balance / 100).toFixed(2)}.`,
        suggestedAction: 'Send payment reminder to client',
        actionType: 'navigate',
        actionPayload: { path: `/events/${event.id}`, tab: 'money' },
        entityIds: [event.id, event.client_id].filter(Boolean),
        source: 'finance.overdueInvoices',
        createdAt: now,
      })
    }
  }
}

async function analyzeExpenseSpikes(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Recent 7-day expenses
  const { data: recentExpenses } = await client
    .from('expenses')
    .select('amount_cents, category')
    .eq('tenant_id', tenantId)
    .gte('expense_date', sevenDaysAgo.toISOString().slice(0, 10))

  // 30-day average (per week)
  const { data: monthExpenses } = await client
    .from('expenses')
    .select('amount_cents')
    .eq('tenant_id', tenantId)
    .gte('expense_date', thirtyDaysAgo.toISOString().slice(0, 10))
    .lte('expense_date', sevenDaysAgo.toISOString().slice(0, 10))

  const recentTotal = (recentExpenses || []).reduce(
    (s: number, e: { amount_cents: number }) => s + e.amount_cents,
    0
  )
  const monthTotal = (monthExpenses || []).reduce(
    (s: number, e: { amount_cents: number }) => s + e.amount_cents,
    0
  )

  // Average weekly spend in prior 23 days (30-7)
  const weeklyAvg = monthTotal / (23 / 7)

  if (weeklyAvg > 0 && recentTotal > weeklyAvg * 1.5) {
    const spikePercent = Math.round(((recentTotal - weeklyAvg) / weeklyAvg) * 100)
    signals.push({
      id: generateId(),
      domain: 'finance',
      urgency: 3,
      confidence: 0.7,
      title: 'Expense spike this week',
      detail: `Spending is ${spikePercent}% above your weekly average ($${(recentTotal / 100).toFixed(0)} vs typical $${(weeklyAvg / 100).toFixed(0)}).`,
      suggestedAction: 'Review recent expenses for unusual charges',
      actionType: 'navigate',
      actionPayload: { path: '/finance/expenses' },
      entityIds: [],
      source: 'finance.expenseSpikes',
      createdAt: now,
    })
  }
}

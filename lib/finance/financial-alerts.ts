// Financial Alerts Engine
// Deterministic checks for overdue payments, expense anomalies,
// budget variance, and daily settlement summaries.
// No AI, pure database queries and math.

'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type FinancialAlertCandidate = {
  tenantId: string
  alertType:
    | 'payment_overdue'
    | 'payment_due_approaching'
    | 'expense_anomaly'
    | 'budget_variance_warning'
    | 'daily_settlement_summary'
  title: string
  body: string
  link: string
  metadata: Record<string, unknown>
}

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ── Overdue Payment Reminders (7/14/21 day escalation) ──────────────────

export async function checkOverduePayments(): Promise<FinancialAlertCandidate[]> {
  const alerts: FinancialAlertCandidate[] = []
  const now = Date.now()

  // Find events that are past their date, not cancelled/completed, with outstanding balance
  const { data: events, error } = await supabaseAdmin
    .from('event_financial_summary')
    .select(
      'event_id, tenant_id, quoted_price_cents, total_paid_cents, outstanding_balance_cents, payment_status'
    )
    .gt('outstanding_balance_cents', 0)
    .in('payment_status', ['unpaid', 'deposit_paid', 'partial'])

  if (error || !events) return alerts

  for (const event of events) {
    // Get event details (date, client, occasion)
    const { data: eventDetail } = await supabaseAdmin
      .from('events')
      .select('event_date, occasion, status, client:clients(full_name)')
      .eq('id', event.event_id)
      .single()

    if (!eventDetail) continue
    // Only alert for events that have happened (past date)
    if (!eventDetail.event_date) continue
    const eventDate = new Date(eventDetail.event_date).getTime()
    if (eventDate > now) continue
    // Skip cancelled
    if (eventDetail.status === 'cancelled') continue

    const daysOverdue = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24))
    const clientName = (eventDetail.client as any)?.full_name ?? 'Client'

    // Escalation: alert at 7, 14, 21+ days
    let escalation: string
    if (daysOverdue >= 21) {
      escalation = 'urgent'
    } else if (daysOverdue >= 14) {
      escalation = '14-day'
    } else if (daysOverdue >= 7) {
      escalation = '7-day'
    } else {
      continue // Don't alert before 7 days
    }

    alerts.push({
      tenantId: event.tenant_id,
      alertType: 'payment_overdue',
      title:
        daysOverdue >= 21
          ? `Urgent: ${clientName} payment ${daysOverdue}d overdue`
          : `${clientName} payment ${daysOverdue}d overdue`,
      body: `${formatCents(event.outstanding_balance_cents)} outstanding for ${eventDetail.occasion ?? 'event'} (${daysOverdue} days past event date).`,
      link: `/events/${event.event_id}`,
      metadata: {
        event_id: event.event_id,
        outstanding_cents: event.outstanding_balance_cents,
        days_overdue: daysOverdue,
        escalation,
        client_name: clientName,
      },
    })
  }

  return alerts
}

// ── Expense Anomaly Detection (>3x category average) ────────────────────

export async function checkExpenseAnomalies(): Promise<FinancialAlertCandidate[]> {
  const alerts: FinancialAlertCandidate[] = []

  // Get active chefs
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activeChefs } = await supabaseAdmin
    .from('chefs')
    .select('id')
    .gte('updated_at', thirtyDaysAgo)

  if (!activeChefs) return alerts

  for (const chef of activeChefs) {
    // Get category averages over last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const { data: historicalExpenses } = await supabaseAdmin
      .from('expenses')
      .select('category, amount_cents')
      .eq('chef_id', chef.id)
      .gte('expense_date', ninetyDaysAgo)
      .lt('expense_date', sevenDaysAgo)

    if (!historicalExpenses || historicalExpenses.length < 5) continue

    // Compute category averages
    const categoryTotals = new Map<string, { sum: number; count: number }>()
    for (const exp of historicalExpenses) {
      const cat = exp.category ?? 'other'
      const existing = categoryTotals.get(cat) ?? { sum: 0, count: 0 }
      existing.sum += exp.amount_cents
      existing.count += 1
      categoryTotals.set(cat, existing)
    }

    const categoryAvg = new Map<string, number>()
    for (const [cat, data] of categoryTotals) {
      categoryAvg.set(cat, Math.round(data.sum / data.count))
    }

    // Get last 7 days expenses
    const { data: recentExpenses } = await supabaseAdmin
      .from('expenses')
      .select('id, category, amount_cents, description, expense_date')
      .eq('chef_id', chef.id)
      .gte('expense_date', sevenDaysAgo)
      .lte('expense_date', today)

    for (const exp of recentExpenses ?? []) {
      const cat = exp.category ?? 'other'
      const avg = categoryAvg.get(cat)
      if (!avg || avg === 0) continue

      const ratio = exp.amount_cents / avg
      if (ratio >= 3) {
        alerts.push({
          tenantId: chef.id,
          alertType: 'expense_anomaly',
          title: `Unusual expense: ${formatCents(exp.amount_cents)} (${cat})`,
          body: `${exp.description ?? cat} on ${exp.expense_date} is ${ratio.toFixed(1)}x your average ${cat} expense of ${formatCents(avg)}.`,
          link: '/finance',
          metadata: {
            expense_id: exp.id,
            category: cat,
            amount_cents: exp.amount_cents,
            avg_cents: avg,
            ratio: Math.round(ratio * 10) / 10,
          },
        })
      }
    }
  }

  return alerts
}

// ── Budget Variance Warnings ────────────────────────────────────────────

export async function checkBudgetVariance(): Promise<FinancialAlertCandidate[]> {
  const alerts: FinancialAlertCandidate[] = []

  // Find events with food cost budgets that are being exceeded
  const { data: events } = await supabaseAdmin
    .from('events')
    .select(
      'id, tenant_id, occasion, food_cost_budget_cents, estimated_food_cost_cents, event_date, client:clients(full_name)'
    )
    .not('food_cost_budget_cents', 'is', null)
    .not('estimated_food_cost_cents', 'is', null)
    .not('status', 'in', '("cancelled","completed")')

  if (!events) return alerts

  for (const event of events as any[]) {
    if (!event.food_cost_budget_cents || !event.estimated_food_cost_cents) continue

    const variance = event.estimated_food_cost_cents - event.food_cost_budget_cents
    const variancePct = Math.round((variance / event.food_cost_budget_cents) * 100)

    // Alert if estimated exceeds budget by 20%+
    if (variancePct >= 20) {
      const clientName = event.client?.full_name ?? 'Client'
      alerts.push({
        tenantId: event.tenant_id,
        alertType: 'budget_variance_warning',
        title: `Food cost ${variancePct}% over budget: ${event.occasion ?? 'Event'}`,
        body: `${clientName}'s ${event.occasion ?? 'event'} estimated food cost (${formatCents(event.estimated_food_cost_cents)}) exceeds budget (${formatCents(event.food_cost_budget_cents)}) by ${formatCents(variance)}.`,
        link: `/events/${event.id}`,
        metadata: {
          event_id: event.id,
          budget_cents: event.food_cost_budget_cents,
          estimated_cents: event.estimated_food_cost_cents,
          variance_cents: variance,
          variance_pct: variancePct,
        },
      })
    }
  }

  return alerts
}

// ── Daily Payment Settlement Summary ────────────────────────────────────

export async function checkDailySettlements(): Promise<FinancialAlertCandidate[]> {
  const alerts: FinancialAlertCandidate[] = []

  // Get payments received in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: payments } = await supabaseAdmin
    .from('ledger_entries')
    .select('tenant_id, amount_cents, entry_type, event_id')
    .gte('created_at', oneDayAgo)
    .eq('is_refund', false)

  if (!payments || payments.length === 0) return alerts

  // Group by tenant
  const byTenant = new Map<string, { totalCents: number; count: number; refundCents: number }>()
  for (const p of payments) {
    const existing = byTenant.get(p.tenant_id) ?? { totalCents: 0, count: 0, refundCents: 0 }
    existing.totalCents += p.amount_cents
    existing.count += 1
    byTenant.set(p.tenant_id, existing)
  }

  // Also get refunds
  const { data: refunds } = await supabaseAdmin
    .from('ledger_entries')
    .select('tenant_id, amount_cents')
    .gte('created_at', oneDayAgo)
    .eq('is_refund', true)

  for (const r of refunds ?? []) {
    const existing = byTenant.get(r.tenant_id)
    if (existing) {
      existing.refundCents += Math.abs(r.amount_cents)
    }
  }

  for (const [tenantId, summary] of byTenant) {
    const netCents = summary.totalCents - summary.refundCents
    if (netCents === 0 && summary.count === 0) continue

    const parts: string[] = []
    parts.push(
      `${summary.count} payment${summary.count !== 1 ? 's' : ''} totaling ${formatCents(summary.totalCents)}`
    )
    if (summary.refundCents > 0) {
      parts.push(`${formatCents(summary.refundCents)} in refunds`)
    }

    alerts.push({
      tenantId,
      alertType: 'daily_settlement_summary',
      title: `Daily settlement: ${formatCents(netCents)} net`,
      body: parts.join('. ') + '.',
      link: '/finance',
      metadata: {
        total_received_cents: summary.totalCents,
        refund_cents: summary.refundCents,
        net_cents: netCents,
        payment_count: summary.count,
      },
    })
  }

  return alerts
}

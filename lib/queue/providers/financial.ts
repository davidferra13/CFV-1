// Priority Queue — Financial Provider
// Surfaces: outstanding balances, expenses missing receipts, events not financially closed

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

export async function getFinancialQueueItems(
  supabase: SupabaseClient,
  tenantId: string
): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  // 1. Outstanding balances on non-draft, non-cancelled events
  const { data: outstandingSummaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, total_paid_cents')
    .eq('tenant_id', tenantId)
    .gt('outstanding_balance_cents', 0)

  if (outstandingSummaries && outstandingSummaries.length > 0) {
    const eventIds = outstandingSummaries.map(s => s.event_id).filter(Boolean) as string[]
    const { data: events } = await supabase
      .from('events')
      .select('id, occasion, event_date, status, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .in('id', eventIds)
      .not('status', 'in', '("draft","cancelled")')

    for (const event of (events || [])) {
      const fin = outstandingSummaries.find(s => s.event_id === event.id)
      const outstanding = fin?.outstanding_balance_cents ?? 0
      const hoursSinceEvent = (now.getTime() - new Date(event.event_date).getTime()) / 3600000
      const clientName = (event.client as any)?.full_name ?? 'Unknown'

      const inputs: ScoreInputs = {
        hoursUntilDue: event.status === 'completed' ? Math.min(0, -hoursSinceEvent) : null,
        impactWeight: 0.9,
        isBlocking: false,
        hoursSinceCreated: Math.max(0, hoursSinceEvent),
        revenueCents: outstanding,
        isExpiring: false,
      }
      const score = computeScore(inputs)
      items.push({
        id: `financial:event:${event.id}:collect_balance`,
        domain: 'financial',
        urgency: urgencyFromScore(score),
        score,
        title: 'Collect outstanding balance',
        description: `${clientName} owes a balance for ${event.occasion || 'event'}.`,
        href: `/events/${event.id}`,
        icon: 'DollarSign',
        context: { primaryLabel: clientName, amountCents: outstanding },
        createdAt: event.event_date,
        dueAt: null,
        entityId: event.id,
        entityType: 'event',
      })
    }
  }

  // 2. Business expenses missing receipt photos (capped at 10)
  const { data: expensesNoReceipt } = await supabase
    .from('expenses')
    .select('id, description, amount_cents, expense_date, vendor_name, event_id')
    .eq('tenant_id', tenantId)
    .eq('is_business', true)
    .eq('receipt_uploaded', false)
    .order('expense_date', { ascending: false })
    .limit(10)

  for (const exp of (expensesNoReceipt || [])) {
    const hoursSinceCreated = (now.getTime() - new Date(exp.expense_date).getTime()) / 3600000
    const inputs: ScoreInputs = {
      hoursUntilDue: null,
      impactWeight: 0.2,
      isBlocking: false,
      hoursSinceCreated,
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)
    items.push({
      id: `financial:expense:${exp.id}:add_receipt`,
      domain: 'financial',
      urgency: urgencyFromScore(score),
      score,
      title: 'Add receipt photo',
      description: `${exp.description || 'Expense'} at ${exp.vendor_name || 'vendor'} is missing a receipt.`,
      href: exp.event_id ? `/events/${exp.event_id}` : '/expenses',
      icon: 'Receipt',
      context: { primaryLabel: exp.description || 'Expense', amountCents: exp.amount_cents },
      createdAt: exp.expense_date,
      dueAt: null,
      entityId: exp.id,
      entityType: 'expense',
    })
  }

  // 3. Completed events not financially closed (capped at 10)
  const { data: unclosedEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('financially_closed', false)
    .order('event_date', { ascending: false })
    .limit(10)

  for (const event of (unclosedEvents || [])) {
    const clientName = (event.client as any)?.full_name ?? 'Unknown'
    const hoursSinceEvent = (now.getTime() - new Date(event.event_date).getTime()) / 3600000
    const inputs: ScoreInputs = {
      hoursUntilDue: null,
      impactWeight: 0.35,
      isBlocking: false,
      hoursSinceCreated: Math.max(0, hoursSinceEvent),
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)
    items.push({
      id: `financial:event:${event.id}:close_financials`,
      domain: 'financial',
      urgency: urgencyFromScore(score),
      score,
      title: 'Close event financials',
      description: `Financials for ${event.occasion || 'event'} (${clientName}) are not yet closed.`,
      href: `/events/${event.id}`,
      icon: 'Calculator',
      context: { primaryLabel: clientName },
      createdAt: event.event_date,
      dueAt: null,
      entityId: event.id,
      entityType: 'event',
    })
  }

  return items
}

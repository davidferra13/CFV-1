'use server'

// Client Spending Insights
// Provides historical spending data for a specific client across all completed events.
// Used in the quote builder to show average spending context when building a new quote.
// Formula > AI: pure database aggregation, zero LLM dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ClientSpendingInsights = {
  avgEventCents: number
  totalEventsCents: number
  eventCount: number
  highestEventCents: number
  lowestEventCents: number
  lastEventDate: string | null
}

// ── Server Action ──────────────────────────────────────────────────────────────

/**
 * Fetch spending insights for a client across all completed events.
 * Pulls from event_financial_summary view which aggregates ledger entries.
 * Returns null if the client has no completed events with financial data.
 */
export async function getClientSpendingInsights(
  clientId: string,
  tenantId: string
): Promise<ClientSpendingInsights | null> {
  const user = await requireChef()
  // Always use tenant from session, not from parameter (security)
  const safeTenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch all completed events for this client with financial summary data
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, event_date, status,
      event_financial_summary!inner(
        quoted_price_cents,
        total_paid_cents,
        tip_amount_cents
      )
    `
    )
    .eq('client_id', clientId)
    .eq('tenant_id', safeTenantId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getClientSpendingInsights] Query error:', error)
    return null
  }

  if (!events || events.length === 0) return null

  // Calculate totals from the financial summary view
  // Use total_paid_cents as the primary spending metric (what the client actually paid)
  const amounts: number[] = []
  let totalCents = 0

  for (const event of events) {
    const summary = event.event_financial_summary
    if (!summary) continue

    const eventTotal = (summary.total_paid_cents ?? 0) + (summary.tip_amount_cents ?? 0)

    if (eventTotal > 0) {
      amounts.push(eventTotal)
      totalCents += eventTotal
    }
  }

  if (amounts.length === 0) return null

  return {
    avgEventCents: Math.round(totalCents / amounts.length),
    totalEventsCents: totalCents,
    eventCount: amounts.length,
    highestEventCents: Math.max(...amounts),
    lowestEventCents: Math.min(...amounts),
    lastEventDate: events[0]?.event_date ?? null,
  }
}

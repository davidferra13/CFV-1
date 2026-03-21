'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface ClientSpendSummary {
  totalSpentCents: number
  eventCount: number
  avgSpendCents: number
  lastEventDate: string | null
}

/**
 * Gets spending summary for a specific client based on their completed events.
 * Uses the event_financial_summary view for accurate paid totals.
 */
export async function getClientSpendSummary(clientId: string): Promise<ClientSpendSummary | null> {
  if (!clientId) return null

  const user = await requireChef()
  const supabase = await createServerClient()

  // Get completed events for this client with financial data
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, event_date, quoted_price_cents, status')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .eq('is_demo', false)
    .order('event_date', { ascending: false })

  if (eventsError) {
    console.error('[client-spend] Failed to fetch events:', eventsError.message)
    throw new Error('Could not load client spending data')
  }

  if (!events || events.length === 0) return null

  const eventIds = events.map((e) => e.id)

  // Get actual paid amounts from financial summary view
  const { data: financials, error: finError } = await supabase
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  if (finError) {
    console.error('[client-spend] Failed to fetch financials:', finError.message)
    throw new Error('Could not load client financial data')
  }

  // Build a map of event_id to paid cents
  const paidMap: Record<string, number> = {}
  for (const f of financials ?? []) {
    if (f.event_id && f.total_paid_cents != null) {
      paidMap[f.event_id] = f.total_paid_cents
    }
  }

  // Sum up totals, falling back to quoted_price_cents if no financial record
  let totalSpentCents = 0
  for (const evt of events) {
    totalSpentCents += paidMap[evt.id] ?? evt.quoted_price_cents ?? 0
  }

  const eventCount = events.length
  const avgSpendCents = eventCount > 0 ? Math.round(totalSpentCents / eventCount) : 0
  const lastEventDate = events[0]?.event_date ?? null

  return {
    totalSpentCents,
    eventCount,
    avgSpendCents,
    lastEventDate,
  }
}

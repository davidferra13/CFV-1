'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { startOfYear, endOfYear } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'

export interface SpendingEvent {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  status: string
  total_paid_cents: number
  outstanding_balance_cents: number
  quoted_price_cents: number
}

export interface SpendingSummary {
  lifetimeSpendCents: number
  thisYearSpendCents: number
  eventsAttended: number
  averageEventCents: number
  upcomingCommittedCents: number
  events: SpendingEvent[]
}

/**
 * Get the client's full spending history and summary stats.
 * Aggregates from ledger_entries via event_financial_summary view.
 */
export async function getClientSpendingSummary(): Promise<SpendingSummary> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Fetch all non-draft, non-cancelled events for this client with financials
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status
    `
    )
    .eq('client_id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .not('status', 'eq', 'draft')
    .order('event_date', { ascending: false })

  if (error || !events)
    return {
      lifetimeSpendCents: 0,
      thisYearSpendCents: 0,
      eventsAttended: 0,
      averageEventCents: 0,
      upcomingCommittedCents: 0,
      events: [],
    }

  // Fetch financial summary for all events in one query
  const eventIds = events.map((e: any) => e.id)
  if (eventIds.length === 0)
    return {
      lifetimeSpendCents: 0,
      thisYearSpendCents: 0,
      eventsAttended: 0,
      averageEventCents: 0,
      upcomingCommittedCents: 0,
      events: [],
    }

  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents, outstanding_balance_cents, quoted_price_cents')
    .in('event_id', eventIds)

  const financialMap = new Map<
    string,
    { total_paid_cents: number; outstanding_balance_cents: number; quoted_price_cents: number }
  >()
  for (const f of financials ?? []) {
    if (!f.event_id) continue
    financialMap.set(f.event_id, {
      total_paid_cents: f.total_paid_cents ?? 0,
      outstanding_balance_cents: f.outstanding_balance_cents ?? 0,
      quoted_price_cents: f.quoted_price_cents ?? 0,
    })
  }

  const enriched: SpendingEvent[] = events.map((e: any) => {
    const fin = financialMap.get(e.id) ?? {
      total_paid_cents: 0,
      outstanding_balance_cents: 0,
      quoted_price_cents: 0,
    }
    return {
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      guest_count: e.guest_count,
      status: e.status,
      total_paid_cents: fin.total_paid_cents,
      outstanding_balance_cents: fin.outstanding_balance_cents,
      quoted_price_cents: fin.quoted_price_cents,
    }
  })

  const completed = enriched.filter((e) => e.status === 'completed')
  const upcoming = enriched.filter((e) =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(e.status)
  )

  const yearStart = startOfYear(new Date()).toISOString()
  const yearEnd = endOfYear(new Date()).toISOString()

  const lifetimeSpendCents = completed.reduce((sum, e) => sum + e.total_paid_cents, 0)
  const thisYearSpendCents = completed
    .filter(
      (e) =>
        dateToDateString(e.event_date as Date | string) >= yearStart.slice(0, 10) &&
        dateToDateString(e.event_date as Date | string) <= yearEnd.slice(0, 10)
    )
    .reduce((sum, e) => sum + e.total_paid_cents, 0)
  const eventsAttended = completed.length
  const averageEventCents = eventsAttended > 0 ? Math.round(lifetimeSpendCents / eventsAttended) : 0
  // Upcoming committed = what has already been paid on future events
  const upcomingCommittedCents = upcoming.reduce((sum, e) => sum + e.total_paid_cents, 0)

  return {
    lifetimeSpendCents,
    thisYearSpendCents,
    eventsAttended,
    averageEventCents,
    upcomingCommittedCents,
    events: enriched,
  }
}

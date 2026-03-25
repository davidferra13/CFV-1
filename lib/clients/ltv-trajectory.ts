'use server'

// Client LTV Trajectory
// Computes event-by-event cumulative lifetime value for a specific client.
// Used on the client detail page to show the revenue growth story over time.
// No new DB schema needed - derives from existing ledger/events data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type LTVDataPoint = {
  eventId: string
  occasion: string | null
  eventDate: string // ISO date string
  revenueCents: number // revenue for this single event
  cumulativeCents: number // running total up to and including this event
}

export type ClientLTVTrajectory = {
  points: LTVDataPoint[]
  totalLifetimeValueCents: number
  eventCount: number
}

/**
 * Get the event-by-event LTV trajectory for a client.
 * Returns data points ordered chronologically with running cumulative total.
 */
export async function getClientLTVTrajectory(clientId: string): Promise<ClientLTVTrajectory> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch all completed events for this client in chronological order
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return { points: [], totalLifetimeValueCents: 0, eventCount: 0 }
  }

  const eventIds = events.map((e: any) => e.id)

  // Fetch payment totals from the financial summary view
  const { data: summaries } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const revenueMap = new Map<string, number>()
  for (const s of summaries ?? []) {
    revenueMap.set(s.event_id, s.total_paid_cents ?? 0)
  }

  let running = 0
  const points: LTVDataPoint[] = []

  for (const event of events) {
    const revenue = revenueMap.get(event.id) ?? 0
    running += revenue
    points.push({
      eventId: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      revenueCents: revenue,
      cumulativeCents: running,
    })
  }

  return {
    points,
    totalLifetimeValueCents: running,
    eventCount: events.length,
  }
}

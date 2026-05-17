'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type RankedClient = {
  id: string
  fullName: string
  email: string | null
  metric: number
  metricLabel: string
}

export type RankingResult = {
  title: string
  description: string
  clients: RankedClient[]
}

export async function getClientRankings(): Promise<{
  byLifetimeSpend: RankingResult
  byCovers: RankingResult
  byRepeatBookings: RankingResult
  byCurrentYear: RankingResult
  dormantHighValue: RankingResult
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [clientsResult, eventsResult] = await Promise.all([
    db
      .from('clients')
      .select(
        'id, full_name, email, lifetime_value_cents, total_events_count, total_guests_served, last_event_date'
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .order('lifetime_value_cents', { ascending: false }),
    db
      .from('events')
      .select('client_id, status, event_date, guest_count, quoted_price_cents')
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null),
  ])

  const clients = clientsResult.data ?? []
  const events = eventsResult.data ?? []

  // By lifetime spend (already sorted)
  const byLifetimeSpend: RankingResult = {
    title: 'Top Clients by Lifetime Spend',
    description: 'Ranked by total revenue generated across all events',
    clients: clients.slice(0, 20).map((c: any) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      metric: c.lifetime_value_cents ?? 0,
      metricLabel: 'lifetime spend',
    })),
  }

  // By total covers
  const clientCovers = new Map<string, number>()
  for (const e of events) {
    if (e.status === 'cancelled' || !e.client_id) continue
    clientCovers.set(e.client_id, (clientCovers.get(e.client_id) ?? 0) + (e.guest_count ?? 0))
  }
  const coversSorted = clients
    .map((c: any) => ({ ...c, covers: clientCovers.get(c.id) ?? c.total_guests_served ?? 0 }))
    .sort((a: any, b: any) => b.covers - a.covers)
    .slice(0, 20)

  const byCovers: RankingResult = {
    title: 'Top Clients by Covers Generated',
    description: 'Ranked by total diners served across all their events',
    clients: coversSorted.map((c: any) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      metric: c.covers,
      metricLabel: 'covers',
    })),
  }

  // By repeat bookings (total_events_count)
  const repeatSorted = [...clients]
    .sort((a: any, b: any) => (b.total_events_count ?? 0) - (a.total_events_count ?? 0))
    .slice(0, 20)

  const byRepeatBookings: RankingResult = {
    title: 'Top Clients by Repeat Bookings',
    description: 'Ranked by number of events booked',
    clients: repeatSorted.map((c: any) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      metric: c.total_events_count ?? 0,
      metricLabel: 'bookings',
    })),
  }

  // By current year spend
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const thisYearRevenue = new Map<string, number>()
  for (const e of events) {
    if (e.status === 'cancelled' || !e.client_id || !e.event_date) continue
    if (e.event_date >= yearStart) {
      thisYearRevenue.set(
        e.client_id,
        (thisYearRevenue.get(e.client_id) ?? 0) + (e.quoted_price_cents ?? 0)
      )
    }
  }
  const yearSorted = clients
    .map((c: any) => ({ ...c, yearSpend: thisYearRevenue.get(c.id) ?? 0 }))
    .filter((c: any) => c.yearSpend > 0)
    .sort((a: any, b: any) => b.yearSpend - a.yearSpend)
    .slice(0, 20)

  const byCurrentYear: RankingResult = {
    title: 'Top Clients This Year',
    description: `Ranked by revenue generated in ${new Date().getFullYear()}`,
    clients: yearSorted.map((c: any) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      metric: c.yearSpend,
      metricLabel: 'this year',
    })),
  }

  // Dormant high-value: clients with high lifetime value but no recent activity
  const dormantHighValue: RankingResult = {
    title: 'Dormant High-Value Clients',
    description: 'High lifetime spend but no events in 90+ days',
    clients: clients
      .filter((c: any) => {
        if (!c.last_event_date) return false
        const daysSince = Math.floor(
          (Date.now() - new Date(c.last_event_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSince >= 90 && (c.lifetime_value_cents ?? 0) > 0
      })
      .sort((a: any, b: any) => (b.lifetime_value_cents ?? 0) - (a.lifetime_value_cents ?? 0))
      .slice(0, 20)
      .map((c: any) => ({
        id: c.id,
        fullName: c.full_name,
        email: c.email,
        metric: c.lifetime_value_cents ?? 0,
        metricLabel: 'lifetime (dormant)',
      })),
  }

  return { byLifetimeSpend, byCovers, byRepeatBookings, byCurrentYear, dormantHighValue }
}

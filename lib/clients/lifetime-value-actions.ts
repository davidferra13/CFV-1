'use server'

// Client Lifetime Value (CLV) Tracking
// Pure deterministic computation from event_financial_summary view + events table.
// Formula > AI: all metrics are SQL queries + math. Zero LLM dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { differenceInMonths } from 'date-fns'
import { getClientTier } from './lifetime-value-constants'

// ── Types ──────────────────────────────────────────────────────────────

export type ClientLifetimeValue = {
  totalRevenueCents: number
  totalEventCount: number
  avgRevenuePerEventCents: number
  firstEventDate: string | null
  lastEventDate: string | null
  monthsAsClient: number
  avgEventsPerMonth: number
  projectedAnnualRevenueCents: number
  totalTipsCents: number
  topCuisines: string[]
  eventsByStatus: Record<string, number>
}

export type TopClientByRevenue = {
  clientId: string
  clientName: string
  totalRevenueCents: number
  totalEventCount: number
  avgRevenuePerEventCents: number
  lastEventDate: string | null
  tier: 'new' | 'regular' | 'vip' | 'champion'
}

export type ClientRetentionMetrics = {
  totalClients: number
  activeClients: number
  churningClients: number
  lostClients: number
  avgLifetimeMonths: number
  avgLifetimeRevenueCents: number
}

// ── Server Actions ─────────────────────────────────────────────────────

/**
 * Get comprehensive CLV metrics for a single client.
 * All computed from event_financial_summary view + events table.
 */
export async function getClientLifetimeValue(clientId: string): Promise<ClientLifetimeValue> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch all events for this client (all statuses for the status breakdown)
  const { data: events } = await db
    .from('events')
    .select('id, event_date, status, occasion')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return {
      totalRevenueCents: 0,
      totalEventCount: 0,
      avgRevenuePerEventCents: 0,
      firstEventDate: null,
      lastEventDate: null,
      monthsAsClient: 0,
      avgEventsPerMonth: 0,
      projectedAnnualRevenueCents: 0,
      totalTipsCents: 0,
      topCuisines: [],
      eventsByStatus: {},
    }
  }

  // Status breakdown (all events)
  const eventsByStatus: Record<string, number> = {}
  for (const e of events) {
    eventsByStatus[e.status] = (eventsByStatus[e.status] || 0) + 1
  }

  // Filter to non-cancelled, non-draft events for financial metrics
  const financialEvents = events.filter(
    (e: any) => e.status !== 'cancelled' && e.status !== 'draft'
  )
  const eventIds = financialEvents.map((e: any) => e.id)

  // Fetch financial summary for all relevant events
  let totalRevenueCents = 0
  let totalTipsCents = 0

  if (eventIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents, tip_amount_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds)

    for (const f of financials ?? []) {
      totalRevenueCents += f.total_paid_cents ?? 0
      totalTipsCents += f.tip_amount_cents ?? 0
    }
  }

  // Date range and projections
  const completedEvents = events.filter((e: any) => e.status === 'completed')
  const totalEventCount = completedEvents.length
  const avgRevenuePerEventCents =
    totalEventCount > 0 ? Math.round(totalRevenueCents / totalEventCount) : 0

  const firstEventDate = events[0]?.event_date ?? null
  const lastEventDate = events[events.length - 1]?.event_date ?? null

  let monthsAsClient = 0
  let avgEventsPerMonth = 0
  let projectedAnnualRevenueCents = 0

  if (firstEventDate) {
    const firstDate = new Date(firstEventDate + 'T12:00:00')
    const now = new Date()
    monthsAsClient = Math.max(1, differenceInMonths(now, firstDate))
    avgEventsPerMonth = totalEventCount / monthsAsClient
    projectedAnnualRevenueCents = Math.round(avgEventsPerMonth * 12 * avgRevenuePerEventCents)
  }

  // Top cuisines (from occasion field, as there's no separate cuisine column)
  const occasionCounts = new Map<string, number>()
  for (const e of completedEvents) {
    if (e.occasion) {
      const key = e.occasion.trim()
      occasionCounts.set(key, (occasionCounts.get(key) || 0) + 1)
    }
  }
  const topCuisines = [...occasionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  return {
    totalRevenueCents,
    totalEventCount,
    avgRevenuePerEventCents,
    firstEventDate,
    lastEventDate,
    monthsAsClient,
    avgEventsPerMonth,
    projectedAnnualRevenueCents,
    totalTipsCents,
    topCuisines,
    eventsByStatus,
  }
}

/**
 * Get top N clients ranked by total revenue.
 */
export async function getTopClientsByRevenue(limit = 10): Promise<TopClientByRevenue[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch all completed events with client info
  const { data: events } = await db
    .from('events')
    .select('id, client_id, event_date, clients!inner(id, full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  if (!events || events.length === 0) return []

  // Fetch financials for all completed events
  const eventIds = events.map((e: any) => e.id)
  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const revenueMap = new Map<string, number>()
  for (const f of financials ?? []) {
    revenueMap.set(f.event_id, f.total_paid_cents ?? 0)
  }

  // Aggregate per client
  const clientMap = new Map<
    string,
    {
      clientName: string
      totalRevenueCents: number
      totalEventCount: number
      lastEventDate: string | null
    }
  >()

  for (const e of events) {
    const clientId = e.client_id
    const clientName = (e.clients as any)?.full_name ?? 'Unknown'
    const revenue = revenueMap.get(e.id) ?? 0

    const existing = clientMap.get(clientId)
    if (existing) {
      existing.totalRevenueCents += revenue
      existing.totalEventCount += 1
      if (!existing.lastEventDate || e.event_date > existing.lastEventDate) {
        existing.lastEventDate = e.event_date
      }
    } else {
      clientMap.set(clientId, {
        clientName,
        totalRevenueCents: revenue,
        totalEventCount: 1,
        lastEventDate: e.event_date,
      })
    }
  }

  // Sort by revenue descending, take top N
  const sorted = [...clientMap.entries()]
    .sort((a, b) => b[1].totalRevenueCents - a[1].totalRevenueCents)
    .slice(0, limit)

  return sorted.map(([clientId, data]) => ({
    clientId,
    clientName: data.clientName,
    totalRevenueCents: data.totalRevenueCents,
    totalEventCount: data.totalEventCount,
    avgRevenuePerEventCents:
      data.totalEventCount > 0 ? Math.round(data.totalRevenueCents / data.totalEventCount) : 0,
    lastEventDate: data.lastEventDate,
    tier: getClientTier(data.totalEventCount),
  }))
}

/**
 * Get retention metrics across all clients.
 * Active = event in last 90 days, Churning = 90-180 days, Lost = 180+ days.
 */
export async function getClientRetentionMetrics(): Promise<ClientRetentionMetrics> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch all clients
  const { data: clients } = await db.from('clients').select('id').eq('tenant_id', tenantId)

  if (!clients || clients.length === 0) {
    return {
      totalClients: 0,
      activeClients: 0,
      churningClients: 0,
      lostClients: 0,
      avgLifetimeMonths: 0,
      avgLifetimeRevenueCents: 0,
    }
  }

  const totalClients = clients.length
  const clientIds = clients.map((c: any) => c.id)

  // Fetch all non-cancelled events for these clients
  const { data: events } = await db
    .from('events')
    .select('id, client_id, event_date, status')
    .eq('tenant_id', tenantId)
    .in('client_id', clientIds)
    .neq('status', 'cancelled')
    .neq('status', 'draft')
    .order('event_date', { ascending: true })

  // Fetch financials
  const eventIds = (events ?? []).map((e: any) => e.id)
  let revenueMap = new Map<string, number>()

  if (eventIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds)

    for (const f of financials ?? []) {
      revenueMap.set(f.event_id, f.total_paid_cents ?? 0)
    }
  }

  // Per-client aggregation
  const now = new Date()
  const day90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const day180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  let activeClients = 0
  let churningClients = 0
  let lostClients = 0
  let totalLifetimeMonthsSum = 0
  let totalRevenueSum = 0
  let clientsWithEvents = 0

  // Build per-client stats
  const clientEvents = new Map<string, { firstDate: string; lastDate: string; revenue: number }>()

  for (const e of events ?? []) {
    const clientId = e.client_id
    const revenue = revenueMap.get(e.id) ?? 0
    const existing = clientEvents.get(clientId)

    if (existing) {
      if (e.event_date < existing.firstDate) existing.firstDate = e.event_date
      if (e.event_date > existing.lastDate) existing.lastDate = e.event_date
      existing.revenue += revenue
    } else {
      clientEvents.set(clientId, {
        firstDate: e.event_date,
        lastDate: e.event_date,
        revenue,
      })
    }
  }

  for (const [, data] of clientEvents) {
    clientsWithEvents++
    const lastDate = new Date(data.lastDate + 'T12:00:00')
    const firstDate = new Date(data.firstDate + 'T12:00:00')

    // Classify by recency
    if (lastDate >= day90) {
      activeClients++
    } else if (lastDate >= day180) {
      churningClients++
    } else {
      lostClients++
    }

    // Lifetime
    const months = Math.max(1, differenceInMonths(now, firstDate))
    totalLifetimeMonthsSum += months
    totalRevenueSum += data.revenue
  }

  // Clients with zero events count as "lost" (no activity at all)
  const noEventClients = totalClients - clientsWithEvents
  lostClients += noEventClients

  const avgLifetimeMonths =
    clientsWithEvents > 0 ? Math.round(totalLifetimeMonthsSum / clientsWithEvents) : 0

  const avgLifetimeRevenueCents =
    clientsWithEvents > 0 ? Math.round(totalRevenueSum / clientsWithEvents) : 0

  return {
    totalClients,
    activeClients,
    churningClients,
    lostClients,
    avgLifetimeMonths,
    avgLifetimeRevenueCents,
  }
}

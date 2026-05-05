// Collaborator Revenue Dashboard
// Lifetime earnings, settlement history, upcoming projections for co-hosts.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface CoHostEventSummary {
  eventId: string
  eventName: string
  eventDate: string
  partnerName: string
  revenueCents: number
  splitPercentage: number
  shareCents: number
  settled: boolean
  settledAt: string | null
  status: string
}

export interface CoHostRevenueDashboard {
  lifetimeEarningsCents: number
  settledCents: number
  pendingCents: number
  upcomingProjectedCents: number
  totalEvents: number
  events: CoHostEventSummary[]
}

/**
 * Get the revenue dashboard for the current chef as a co-host.
 * Shows all events they've collaborated on with revenue data.
 */
export async function getCoHostRevenueDashboard(): Promise<CoHostRevenueDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all collaborations for this chef
  const { data: collabs } = await db
    .from('event_collaborators')
    .select(
      `
      event_id,
      role,
      revenue_split_pct,
      revenue_settled,
      revenue_settled_at,
      events!inner(id, occasion, event_date, status, tenant_id)
    `
    )
    .eq('chef_id', user.entityId)
    .eq('status', 'accepted')
    .order('events(event_date)', { ascending: false })

  if (!collabs || collabs.length === 0) {
    return {
      lifetimeEarningsCents: 0,
      settledCents: 0,
      pendingCents: 0,
      upcomingProjectedCents: 0,
      totalEvents: 0,
      events: [],
    }
  }

  const events: CoHostEventSummary[] = []
  let lifetimeEarningsCents = 0
  let settledCents = 0
  let pendingCents = 0
  let upcomingProjectedCents = 0

  for (const collab of collabs) {
    const ev = (collab as any).events
    if (!ev) continue

    const splitPct = collab.revenue_split_pct ?? (collab.role === 'co_host' ? 30 : 0)
    if (splitPct <= 0) continue

    // Get revenue for this event
    const { data: tickets } = await db
      .from('event_tickets')
      .select('total_cents')
      .eq('event_id', collab.event_id)
      .eq('payment_status', 'paid')

    const totalRevenue = (tickets || []).reduce((s: number, t: any) => s + (t.total_cents || 0), 0)
    const ticketCount = tickets?.length || 0
    const stripeFees = Math.round(totalRevenue * 0.029) + ticketCount * 30
    const netRevenue = totalRevenue - stripeFees
    const shareCents = Math.round((netRevenue * splitPct) / 100)

    // Get partner name (event owner)
    const { data: partner } = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', ev.tenant_id)
      .single()

    const partnerName = partner?.business_name || partner?.display_name || 'Partner'
    const isUpcoming = new Date(ev.event_date) > new Date()
    const isCompleted = ev.status === 'completed'

    if (isCompleted && shareCents > 0) {
      lifetimeEarningsCents += shareCents
      if (collab.revenue_settled) {
        settledCents += shareCents
      } else {
        pendingCents += shareCents
      }
    } else if (isUpcoming && shareCents > 0) {
      upcomingProjectedCents += shareCents
    }

    events.push({
      eventId: collab.event_id,
      eventName: ev.occasion || 'Untitled Event',
      eventDate: ev.event_date,
      partnerName,
      revenueCents: totalRevenue,
      splitPercentage: splitPct,
      shareCents,
      settled: collab.revenue_settled === true,
      settledAt: collab.revenue_settled_at || null,
      status: ev.status,
    })
  }

  return {
    lifetimeEarningsCents,
    settledCents,
    pendingCents,
    upcomingProjectedCents,
    totalEvents: events.length,
    events,
  }
}

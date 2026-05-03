// Co-Host Dashboard - Server Actions
// Provides event summary data for co-host collaborators.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface CoHostDashboardData {
  eventName: string
  eventDate: string | null
  location: string | null
  ticketsSold: number
  totalCapacity: number
  revenue: number
  guestCount: number
  dietarySummary: { restriction: string; count: number }[]
  allergySummary: { allergy: string; count: number }[]
  checkedIn: number
  isCoHost: boolean
}

/**
 * Get dashboard data for a co-host viewing an event they collaborate on.
 */
export async function getCoHostDashboard(eventId: string): Promise<CoHostDashboardData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if user is a collaborator on this event
  const { data: collab } = await db
    .from('event_collaborators')
    .select('id, role')
    .eq('event_id', eventId)
    .eq('chef_id', user.entityId)
    .eq('status', 'accepted')
    .maybeSingle()

  // Also check if they're the owner
  const { data: event } = await db
    .from('events')
    .select('id, title, occasion, event_date, location, tenant_id')
    .eq('id', eventId)
    .single()

  if (!event) return null

  const isOwner = event.tenant_id === user.entityId
  const isCoHost = collab?.role === 'co_host'

  if (!isOwner && !collab) return null

  // Get ticket data
  const { data: tickets } = await db
    .from('event_tickets')
    .select('id, quantity, total_cents, payment_status, dietary_restrictions, allergies, attended')
    .eq('event_id', eventId)
    .in('payment_status', ['paid', 'pending'])

  const paidTickets = (tickets || []).filter((t: any) => t.payment_status === 'paid')

  // Get ticket type capacities
  const { data: ticketTypes } = await db
    .from('event_ticket_types')
    .select('capacity, sold_count')
    .eq('event_id', eventId)

  const totalCapacity = (ticketTypes || []).reduce(
    (sum: number, tt: any) => sum + (tt.capacity || 0),
    0
  )

  // Aggregate dietary restrictions
  const dietaryMap = new Map<string, number>()
  const allergyMap = new Map<string, number>()

  for (const t of paidTickets) {
    for (const d of t.dietary_restrictions || []) {
      dietaryMap.set(d, (dietaryMap.get(d) || 0) + t.quantity)
    }
    for (const a of t.allergies || []) {
      allergyMap.set(a, (allergyMap.get(a) || 0) + t.quantity)
    }
  }

  const dietarySummary = [...dietaryMap.entries()]
    .map(([restriction, count]) => ({ restriction, count }))
    .sort((a, b) => b.count - a.count)

  const allergySummary = [...allergyMap.entries()]
    .map(([allergy, count]) => ({ allergy, count }))
    .sort((a, b) => b.count - a.count)

  return {
    eventName: event.title || event.occasion || 'Event',
    eventDate: event.event_date,
    location: event.location,
    ticketsSold: paidTickets.reduce((s: number, t: any) => s + t.quantity, 0),
    totalCapacity,
    revenue: paidTickets.reduce((s: number, t: any) => s + t.total_cents, 0),
    guestCount: paidTickets.reduce((s: number, t: any) => s + t.quantity, 0),
    dietarySummary,
    allergySummary,
    checkedIn: paidTickets
      .filter((t: any) => t.attended === true)
      .reduce((s: number, t: any) => s + t.quantity, 0),
    isCoHost,
  }
}

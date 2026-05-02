'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/send'

// Ticket Waitlist & Access Control
// Module: commerce
// Manages waitlist entries for sold-out ticket types and VIP early access.
// Uses event_ticket_waitlist table (creates if needed via compat layer).
// Deterministic: formula > AI.

export type TicketWaitlistEntry = {
  id: string
  eventId: string
  ticketTypeId: string
  ticketTypeName: string
  buyerName: string
  buyerEmail: string
  quantity: number
  status: 'waiting' | 'notified' | 'converted' | 'expired'
  priority: number
  createdAt: string
  notifiedAt: string | null
}

export type TicketWaitlistSummary = {
  eventId: string
  totalWaiting: number
  totalNotified: number
  totalConverted: number
  byTicketType: Array<{
    ticketTypeId: string
    ticketTypeName: string
    waiting: number
    capacity: number | null
    soldCount: number
    remaining: number | null
  }>
}

/**
 * Get waitlist entries for an event's ticket types.
 */
export async function getTicketWaitlist(eventId: string): Promise<TicketWaitlistEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_ticket_waitlist')
    .select(
      'id, event_id, ticket_type_id, buyer_name, buyer_email, quantity, status, priority, created_at, notified_at, event_ticket_types (name)'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('priority')
    .order('created_at')

  if (error) return [] // Table may not exist yet

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    ticketTypeId: row.ticket_type_id,
    ticketTypeName: row.event_ticket_types?.name ?? 'Unknown',
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    quantity: row.quantity,
    status: row.status,
    priority: row.priority ?? 999,
    createdAt: row.created_at,
    notifiedAt: row.notified_at,
  }))
}

/**
 * Get waitlist summary with capacity context per ticket type.
 */
export async function getTicketWaitlistSummary(eventId: string): Promise<TicketWaitlistSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Parallel: waitlist entries + ticket types
  const [waitlistResult, typesResult] = await Promise.all([
    db
      .from('event_ticket_waitlist')
      .select('ticket_type_id, status')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!),
    db
      .from('event_ticket_types')
      .select('id, name, capacity, sold_count')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!),
  ])

  const waitlistRows = waitlistResult.data ?? []
  const types = typesResult.data ?? []

  let totalWaiting = 0
  let totalNotified = 0
  let totalConverted = 0

  for (const row of waitlistRows) {
    if (row.status === 'waiting') totalWaiting++
    else if (row.status === 'notified') totalNotified++
    else if (row.status === 'converted') totalConverted++
  }

  const byTicketType = types.map((t: any) => {
    const typeWaiters = waitlistRows.filter(
      (w: any) => w.ticket_type_id === t.id && w.status === 'waiting'
    )
    const remaining = t.capacity != null ? Math.max(0, t.capacity - (t.sold_count ?? 0)) : null

    return {
      ticketTypeId: t.id,
      ticketTypeName: t.name,
      waiting: typeWaiters.length,
      capacity: t.capacity,
      soldCount: t.sold_count ?? 0,
      remaining,
    }
  })

  return {
    eventId,
    totalWaiting,
    totalNotified,
    totalConverted,
    byTicketType,
  }
}

/**
 * Notify next waitlist entries when capacity opens up.
 * Call after ticket cancellations or capacity increases.
 */
export async function notifyWaitlistForOpenings(
  eventId: string,
  ticketTypeId: string
): Promise<{ notified: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Check current capacity
  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('id, name, capacity, sold_count')
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!ticketType) return { notified: 0 }

  const remaining =
    ticketType.capacity != null
      ? Math.max(0, ticketType.capacity - (ticketType.sold_count ?? 0))
      : null

  if (remaining != null && remaining <= 0) return { notified: 0 }

  // Get waiting entries ordered by priority then creation
  const { data: waiters } = await db
    .from('event_ticket_waitlist')
    .select('id, buyer_name, buyer_email, quantity')
    .eq('event_id', eventId)
    .eq('ticket_type_id', ticketTypeId)
    .eq('tenant_id', tenantId)
    .eq('status', 'waiting')
    .order('priority')
    .order('created_at')
    .limit(remaining ?? 10)

  let notified = 0
  for (const waiter of waiters ?? []) {
    try {
      await db
        .from('event_ticket_waitlist')
        .update({ status: 'notified', notified_at: new Date().toISOString() })
        .eq('id', waiter.id)

      try {
        await sendNotification({
          tenantId,
          recipientId: tenantId,
          type: 'event_update' as any,
          title: `Waitlist: ${waiter.buyer_name} notified`,
          message: `Spot opened for ${ticketType.name}. ${waiter.buyer_name} (${waiter.buyer_email}) has been notified.`,
          link: `/events/${eventId}`,
        })
      } catch {
        // Non-blocking
      }

      notified++
    } catch {
      // Non-blocking per entry
    }
  }

  revalidatePath(`/events/${eventId}`)
  return { notified }
}

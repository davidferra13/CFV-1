// Client Calendar Actions - Event dates and deadlines for calendar view

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type CalendarEvent = {
  id: string
  date: string
  title: string
  type: 'event' | 'deadline'
  status: string
  eventId: string
  color: string
}

/**
 * Get calendar events for a given month.
 * Includes booked events and action deadlines (payment due, menu approval, etc.).
 */
export async function getClientCalendarEvents(
  month: number,
  year: number
): Promise<CalendarEvent[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Date range for the month (with buffer for display)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  const bufferStart = new Date(startDate)
  bufferStart.setDate(bufferStart.getDate() - 7)
  const bufferEnd = new Date(endDate)
  bufferEnd.setDate(bufferEnd.getDate() + 7)

  const { data: events, error } = await db
    .from('events')
    .select(
      'id, occasion, event_date, status, payment_due_date, menu_approval_deadline, contract_deadline'
    )
    .eq('client_id', user.entityId)
    .not('status', 'eq', 'draft')
    .gte('event_date', bufferStart.toISOString().split('T')[0])
    .lte('event_date', bufferEnd.toISOString().split('T')[0])
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[getClientCalendarEvents] Error:', error)
    return []
  }

  const items: CalendarEvent[] = []

  for (const e of events ?? []) {
    // Event itself
    const statusColor = getStatusColor(e.status)
    items.push({
      id: e.id,
      date: e.event_date,
      title: e.occasion || 'Event',
      type: 'event',
      status: e.status,
      eventId: e.id,
      color: statusColor,
    })

    // Payment deadline
    if (e.payment_due_date && ['proposed', 'accepted', 'confirmed'].includes(e.status)) {
      items.push({
        id: `pay-${e.id}`,
        date: e.payment_due_date,
        title: `Payment due: ${e.occasion || 'Event'}`,
        type: 'deadline',
        status: 'pending',
        eventId: e.id,
        color: 'amber',
      })
    }

    // Menu approval deadline
    if (e.menu_approval_deadline && ['accepted', 'confirmed'].includes(e.status)) {
      items.push({
        id: `menu-${e.id}`,
        date: e.menu_approval_deadline,
        title: `Menu approval: ${e.occasion || 'Event'}`,
        type: 'deadline',
        status: 'pending',
        eventId: e.id,
        color: 'blue',
      })
    }
  }

  return items
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'paid':
      return 'emerald'
    case 'proposed':
    case 'accepted':
      return 'amber'
    case 'completed':
      return 'stone'
    case 'in_progress':
      return 'brand'
    case 'cancelled':
      return 'red'
    default:
      return 'stone'
  }
}

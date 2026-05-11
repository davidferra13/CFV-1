'use server'

// Event Replay - Server Actions
// Exposes event replay intelligence to the UI.

import { requireChef } from '@/lib/auth/get-user'
import { generateEventReplay, type EventReplay } from './event-replay'

export async function fetchEventReplay(eventId: string): Promise<EventReplay | null> {
  const user = await requireChef()
  return generateEventReplay(eventId, user.tenantId!)
}

export async function getCompletedEventsForReplay(): Promise<
  Array<{
    id: string
    occasion: string
    eventDate: string
    clientName: string
    guestCount: number
    hasAAR: boolean
  }>
> {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select(`
      id, occasion, event_date, guest_count, aar_filed,
      client:clients(full_name)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .is('deleted_at' as any, null)
    .order('event_date', { ascending: false })
    .limit(50)

  if (!events) return []

  return (events as any[]).map((e) => ({
    id: e.id,
    occasion: e.occasion || 'Event',
    eventDate: e.event_date,
    clientName: (e.client as any)?.full_name || 'Unknown',
    guestCount: e.guest_count ?? 0,
    hasAAR: Boolean(e.aar_filed),
  }))
}

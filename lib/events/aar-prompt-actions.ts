'use server'

// AAR Prompt Actions
// Finds recently completed events that are missing After Action Reviews.
// Powers the AAR prompt banner that nudges the chef to create reviews
// while the event is still fresh in memory.
// Formula > AI: pure date math and existence checks, zero LLM dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type EventNeedingAAR = {
  eventId: string
  eventDate: string
  occasion: string | null
  clientName: string
  daysSinceEvent: number
}

// ── Server Action ──────────────────────────────────────────────────────────────

/**
 * Find completed events in the last 7 days that don't have an AAR yet.
 * Returns an empty array if all recent events have AARs or there are no
 * recently completed events.
 */
export async function getEventsNeedingAAR(tenantId: string): Promise<EventNeedingAAR[]> {
  const user = await requireChef()
  const safeTenantId = user.tenantId!
  const db: any = createServerClient()

  // Look back 7 days for completed events
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, event_date, occasion, client_id,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', safeTenantId)
    .eq('status', 'completed')
    .gte('event_date', sevenDaysAgo)
    .order('event_date', { ascending: false })

  if (error || !events || events.length === 0) return []

  // Check which events already have AARs
  const eventIds = events.map((e: any) => e.id)

  const { data: existingAARs } = await db
    .from('after_action_reviews')
    .select('event_id')
    .in('event_id', eventIds)

  const completedAARs = new Set((existingAARs ?? []).map((a: any) => a.event_id))

  // Also check the aar_filed flag on the event itself as a fallback
  const { data: filedEvents } = await db
    .from('events')
    .select('id')
    .in('id', eventIds)
    .eq('aar_filed', true)

  for (const fe of filedEvents ?? []) {
    completedAARs.add(fe.id)
  }

  const now = Date.now()
  const results: EventNeedingAAR[] = []

  for (const event of events) {
    if (completedAARs.has(event.id)) continue

    const clientData = event.client as any
    const clientName = clientData?.full_name ?? 'Client'
    const eventDate = new Date(event.event_date + 'T00:00:00')
    const daysSinceEvent = Math.floor((now - eventDate.getTime()) / 86400000)

    results.push({
      eventId: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
      clientName,
      daysSinceEvent,
    })
  }

  return results
}

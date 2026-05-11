// Autopilot Detection
// Finds events where the chef has gone silent for 7+ days with work still pending.
// Never auto-contacts clients - detection only.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { PendingClientUpdate } from './types'

const SILENCE_THRESHOLD_DAYS = 7

/**
 * Find client events where:
 * - Status is still active (not completed, cancelled, archived)
 * - Event is upcoming or recently occurred (within 30 days)
 * - No outbound chef communication in the last 7 days
 *
 * Returns sorted by urgency: events with no contact first, then by event date.
 */
export async function detectPendingClientUpdates(): Promise<PendingClientUpdate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString()

  // Active events with their client and latest quote
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id,
      event_date,
      status,
      occasion,
      guest_count,
      location_city,
      quoted_price_cents,
      client_id,
      client:clients!events_client_id_fkey(id, full_name, email),
      quotes(status, total_quoted_cents, updated_at)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed'])
    .eq('archived', false)
    .eq('financially_closed', false)
    .gte('event_date', thirtyDaysAgo)
    .order('event_date', { ascending: true })

  if (error || !events?.length) return []

  const eventIds = events.map((e: any) => e.id)

  // Get last outbound message per event (any channel counts as contact)
  const { data: messages } = await db
    .from('messages')
    .select('event_id, sent_at, created_at')
    .in('event_id', eventIds)
    .eq('direction', 'outbound')
    .neq('status', 'draft')
    .order('sent_at', { ascending: false })

  // Build map: eventId -> last outbound contact timestamp
  const lastContact = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.event_id && !lastContact.has(m.event_id)) {
      lastContact.set(m.event_id, m.sent_at ?? m.created_at)
    }
  }

  const now = Date.now()
  const silenceThresholdMs = SILENCE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

  const pending: PendingClientUpdate[] = []

  for (const event of events) {
    const lastContactAt = lastContact.get(event.id) ?? null
    const daysSinceLastContact = lastContactAt
      ? Math.floor((now - new Date(lastContactAt).getTime()) / (24 * 60 * 60 * 1000))
      : null

    // Skip if contacted recently
    if (
      lastContactAt &&
      daysSinceLastContact !== null &&
      daysSinceLastContact < SILENCE_THRESHOLD_DAYS
    ) {
      continue
    }

    const client = Array.isArray(event.client) ? event.client[0] : event.client
    if (!client) continue

    // Best quote: most recently updated
    const quotes = Array.isArray(event.quotes) ? event.quotes : []
    const latestQuote = quotes.sort(
      (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0]

    const eventDate = new Date(event.event_date)
    const daysUntilEvent = Math.ceil((eventDate.getTime() - now) / (24 * 60 * 60 * 1000))

    const contextSummary = [
      `Event: ${event.occasion ?? 'private dinner'} on ${eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      `Guests: ${event.guest_count ?? 'TBD'}`,
      event.location_city ? `Location: ${event.location_city}` : null,
      `Event status: ${event.status}`,
      latestQuote
        ? `Quote: ${latestQuote.status} (${latestQuote.total_quoted_cents ? `$${Math.round(latestQuote.total_quoted_cents / 100)}` : 'no amount'})`
        : 'No quote on file',
      lastContactAt
        ? `Last chef contact: ${daysSinceLastContact} days ago`
        : 'No prior contact logged',
      daysUntilEvent > 0
        ? `Days until event: ${daysUntilEvent}`
        : `Event occurred ${Math.abs(daysUntilEvent)} days ago`,
    ]
      .filter(Boolean)
      .join('. ')

    pending.push({
      eventId: event.id,
      clientId: client.id,
      clientName: client.full_name ?? 'Client',
      clientEmail: client.email ?? null,
      occasion: event.occasion ?? null,
      eventDate: event.event_date,
      guestCount: event.guest_count ?? null,
      eventStatus: event.status,
      locationCity: event.location_city ?? null,
      quoteStatus: latestQuote?.status ?? null,
      quotedPriceCents: latestQuote?.total_quoted_cents ?? event.quoted_price_cents ?? null,
      daysSinceLastContact,
      lastContactAt,
      contextSummary,
    })
  }

  // Sort: no contact first, then by days since contact descending, then by event date
  pending.sort((a, b) => {
    const aScore = a.daysSinceLastContact ?? 9999
    const bScore = b.daysSinceLastContact ?? 9999
    if (bScore !== aScore) return bScore - aScore
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  })

  return pending
}

/** Badge count only - fast, no Ollama calls. */
export async function getAutopilotQueueCount(): Promise<number> {
  try {
    const items = await detectPendingClientUpdates()
    return items.length
  } catch {
    return 0
  }
}

// Co-Host Event Archive
// History of all events co-hosted at a venue, with photos and stats.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface ArchivedEventSummary {
  eventId: string
  eventName: string
  eventDate: string
  status: string
  guestCount: number
  ticketsSold: number
  revenueCents: number
  photoCount: number
  photos: string[] // first 6 photo URLs
  partnerName: string
}

export interface CoHostArchive {
  totalEvents: number
  totalGuestsHosted: number
  totalRevenueCents: number
  repeatGuestCount: number
  events: ArchivedEventSummary[]
}

/**
 * Get the event archive for the current chef as a co-host.
 * Shows all past co-hosted events with photos and stats.
 */
export async function getCoHostEventArchive(): Promise<CoHostArchive> {
  const user = await requireChef()
  const db: any = createServerClient()

  // All accepted collaborations
  const { data: collabs } = await db
    .from('event_collaborators')
    .select(
      `
      event_id,
      events!inner(id, occasion, event_date, status, guest_count, tenant_id)
    `
    )
    .eq('chef_id', user.entityId)
    .eq('status', 'accepted')
    .order('events(event_date)', { ascending: false })

  if (!collabs || collabs.length === 0) {
    return {
      totalEvents: 0,
      totalGuestsHosted: 0,
      totalRevenueCents: 0,
      repeatGuestCount: 0,
      events: [],
    }
  }

  const events: ArchivedEventSummary[] = []
  let totalGuestsHosted = 0
  let totalRevenueCents = 0
  const allGuestEmails = new Set<string>()
  const seenEmails = new Set<string>()
  let repeatGuestCount = 0

  for (const collab of collabs) {
    const ev = (collab as any).events
    if (!ev) continue

    // Get tickets
    const { data: tickets } = await db
      .from('event_tickets')
      .select('total_cents, quantity, buyer_email')
      .eq('event_id', collab.event_id)
      .eq('payment_status', 'paid')

    const ticketsSold = (tickets || []).reduce((s: number, t: any) => s + (t.quantity || 0), 0)
    const revenueCents = (tickets || []).reduce((s: number, t: any) => s + (t.total_cents || 0), 0)

    // Track repeat guests
    for (const t of tickets || []) {
      if (t.buyer_email) {
        if (seenEmails.has(t.buyer_email)) {
          if (!allGuestEmails.has(t.buyer_email)) {
            repeatGuestCount++
            allGuestEmails.add(t.buyer_email)
          }
        } else {
          seenEmails.add(t.buyer_email)
        }
      }
    }

    // Get photos
    const { data: photos } = await db
      .from('event_photos')
      .select('url')
      .eq('event_id', collab.event_id)
      .order('created_at', { ascending: false })
      .limit(6)

    // Get partner name
    const { data: partner } = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', ev.tenant_id)
      .single()

    totalGuestsHosted += ticketsSold || ev.guest_count || 0
    totalRevenueCents += revenueCents

    events.push({
      eventId: collab.event_id,
      eventName: ev.occasion || 'Untitled Event',
      eventDate: ev.event_date,
      status: ev.status,
      guestCount: ticketsSold || ev.guest_count || 0,
      ticketsSold,
      revenueCents,
      photoCount: photos?.length || 0,
      photos: (photos || []).map((p: any) => p.url),
      partnerName: partner?.business_name || partner?.display_name || 'Partner',
    })
  }

  return {
    totalEvents: events.length,
    totalGuestsHosted,
    totalRevenueCents,
    repeatGuestCount,
    events,
  }
}

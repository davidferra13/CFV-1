// Client Timeline Actions - Event history timeline

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type TimelineEntry = {
  id: string
  title: string
  eventDate: string
  status: string
  guestCount: number | null
  location: string | null
  totalCents: number | null
  hasReview: boolean
  hasPhotos: boolean
}

export type TimelineStats = {
  totalEvents: number
  totalSpentCents: number
  uniqueCuisines: number
  totalGuests: number
}

export async function getMyTimeline(): Promise<{ entries: TimelineEntry[]; stats: TimelineStats }> {
  const user = await requireClient()
  const db: any = createServerClient()

  const [eventsResult, reviewsResult, photosResult] = await Promise.allSettled([
    db
      .from('events')
      .select('id, title, event_date, status, guest_count, location')
      .eq('client_id', user.entityId)
      .order('event_date', { ascending: false }),
    db.from('client_reviews').select('event_id').eq('client_id', user.entityId),
    db.from('event_photos').select('event_id').eq('uploaded_by', user.id),
  ])

  const events = eventsResult.status === 'fulfilled' ? (eventsResult.value.data ?? []) : []
  const reviewedEventIds = new Set(
    (reviewsResult.status === 'fulfilled' ? (reviewsResult.value.data ?? []) : []).map(
      (r: any) => r.event_id
    )
  )
  const photoEventIds = new Set(
    (photosResult.status === 'fulfilled' ? (photosResult.value.data ?? []) : []).map(
      (p: any) => p.event_id
    )
  )

  // Get financial summaries for completed events
  const eventIds = events.map((e: any) => e.id)
  let financialMap = new Map<string, number>()
  if (eventIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, total_price_cents')
      .in('event_id', eventIds)

    for (const f of financials ?? []) {
      financialMap.set(f.event_id, f.total_price_cents || 0)
    }
  }

  const entries: TimelineEntry[] = events.map((e: any) => ({
    id: e.id,
    title: e.title || 'Event',
    eventDate: e.event_date,
    status: e.status,
    guestCount: e.guest_count,
    location: e.location,
    totalCents: financialMap.get(e.id) ?? null,
    hasReview: reviewedEventIds.has(e.id),
    hasPhotos: photoEventIds.has(e.id),
  }))

  const stats: TimelineStats = {
    totalEvents: events.length,
    totalSpentCents: Array.from(financialMap.values()).reduce((s, v) => s + v, 0),
    uniqueCuisines: 0, // would need menu data to compute
    totalGuests: events.reduce((s: number, e: any) => s + (e.guest_count || 0), 0),
  }

  return { entries, stats }
}

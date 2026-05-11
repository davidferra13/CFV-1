// Client Review Actions - View and submit post-event reviews

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type ClientReview = {
  id: string
  eventId: string
  eventName: string | null
  eventDate: string | null
  rating: number
  feedbackText: string | null
  whatTheyLoved: string | null
  whatCouldImprove: string | null
  createdAt: string
}

export type ReviewableEvent = {
  id: string
  title: string
  eventDate: string
}

export async function getMyReviews(): Promise<ClientReview[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_reviews')
    .select(
      `
      id, event_id, rating, feedback_text, what_they_loved, what_could_improve, created_at,
      event:events!client_reviews_event_id_fkey(title, event_date)
    `
    )
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyReviews] Query failed:', error)
    return []
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    eventId: r.event_id,
    eventName: r.event?.title || null,
    eventDate: r.event?.event_date || null,
    rating: r.rating,
    feedbackText: r.feedback_text,
    whatTheyLoved: r.what_they_loved,
    whatCouldImprove: r.what_could_improve,
    createdAt: r.created_at,
  }))
}

export async function getReviewableEvents(): Promise<ReviewableEvent[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Events that are completed and don't already have a review
  const { data: reviewed } = await db
    .from('client_reviews')
    .select('event_id')
    .eq('client_id', user.entityId)

  const reviewedIds = (reviewed ?? []).map((r: any) => r.event_id)

  const query = db
    .from('events')
    .select('id, title, event_date')
    .eq('client_id', user.entityId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })

  if (reviewedIds.length > 0) {
    query.not('id', 'in', `(${reviewedIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getReviewableEvents] Query failed:', error)
    return []
  }

  return (data ?? []).map((e: any) => ({
    id: e.id,
    title: e.title || 'Event',
    eventDate: e.event_date,
  }))
}

export async function submitReview(
  eventId: string,
  rating: number,
  feedbackText?: string,
  whatTheyLoved?: string,
  whatCouldImprove?: string
) {
  const user = await requireClient()
  const db: any = createServerClient()

  // Verify ownership
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) throw new Error('Event not found')

  const { error } = await db.from('client_reviews').insert({
    event_id: eventId,
    client_id: user.entityId,
    tenant_id: event.tenant_id,
    rating,
    feedback_text: feedbackText || null,
    what_they_loved: whatTheyLoved || null,
    what_could_improve: whatCouldImprove || null,
  })

  if (error) {
    console.error('[submitReview] Insert failed:', error)
    throw new Error('Failed to submit review')
  }

  revalidatePath('/my-reviews')
  return { success: true }
}

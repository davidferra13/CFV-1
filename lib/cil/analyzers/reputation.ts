// CIL Proactive Analyzer: Reputation
// Detects pending review responses, rating trends, and testimonial opportunities

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeReputation(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Testimonial opportunities: completed events with high ratings but no testimonial
    await analyzeTestimonialOpportunities(client, tenantId, signals, now)

    // 2. Rating trends: average review score direction
    await analyzeRatingTrends(client, tenantId, signals, now)

    // 3. Unreviewed completed events: no review requested or collected
    await analyzeUnreviewedEvents(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/reputation] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

async function analyzeTestimonialOpportunities(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  // Get high-rated reviews (4-5 stars) from client_reviews
  const { data: highReviews } = await client
    .from('client_reviews')
    .select('id, event_id, client_id, rating')
    .eq('tenant_id', tenantId)
    .gte('rating', 4)

  if (!highReviews || highReviews.length === 0) return

  // Check which events have testimonials
  const { data: existingTestimonials } = await client
    .from('testimonials')
    .select('event_id')
    .eq('tenant_id', tenantId)

  const testimonialEventIds = new Set(
    (existingTestimonials || []).map((t: { event_id: string | null }) => t.event_id).filter(Boolean)
  )

  for (const review of highReviews) {
    if (testimonialEventIds.has(review.event_id)) continue

    // Get client name for the signal
    const { data: clientData } = await client
      .from('clients')
      .select('full_name')
      .eq('id', review.client_id)
      .limit(1)

    const clientName = clientData?.[0]?.full_name || 'client'

    signals.push({
      id: generateId(),
      domain: 'reputation',
      urgency: 2,
      confidence: 0.85,
      title: `Testimonial opportunity: ${clientName}`,
      detail: `${clientName} gave ${review.rating} stars but has no published testimonial. A great candidate for a public quote.`,
      suggestedAction: 'Request permission to use their feedback as a testimonial',
      actionType: 'navigate',
      actionPayload: { path: `/events/${review.event_id}` },
      entityIds: [review.event_id, review.client_id].filter(Boolean),
      source: 'reputation.testimonialOpportunity',
      createdAt: now,
    })
  }
}

async function analyzeRatingTrends(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const { data: allReviews } = await client
    .from('client_reviews')
    .select('rating, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (!allReviews || allReviews.length < 4) return

  // Split into halves and compare averages
  const midpoint = Math.floor(allReviews.length / 2)
  const olderHalf = allReviews.slice(0, midpoint)
  const newerHalf = allReviews.slice(midpoint)

  const olderAvg =
    olderHalf.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / olderHalf.length
  const newerAvg =
    newerHalf.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / newerHalf.length

  if (newerAvg < olderAvg - 0.5) {
    signals.push({
      id: generateId(),
      domain: 'reputation',
      urgency: 4,
      confidence: 0.7,
      title: 'Ratings trending down',
      detail: `Recent average rating (${newerAvg.toFixed(1)}) is lower than earlier average (${olderAvg.toFixed(1)}). Investigate what changed.`,
      suggestedAction: 'Review recent event feedback for patterns',
      actionType: 'navigate',
      actionPayload: { path: '/clients/insights' },
      entityIds: [],
      source: 'reputation.ratingTrend',
      createdAt: now,
    })
  }
}

async function analyzeUnreviewedEvents(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Completed events in last 30 days without a review
  const { data: completedEvents } = await client
    .from('events')
    .select('id, occasion, event_date, client_id, review_link_sent')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', thirtyDaysAgo.toISOString().slice(0, 10))

  if (!completedEvents || completedEvents.length === 0) return

  // Get events that already have reviews
  const { data: reviewedEvents } = await client
    .from('client_reviews')
    .select('event_id')
    .eq('tenant_id', tenantId)

  const reviewedEventIds = new Set(
    (reviewedEvents || []).map((r: { event_id: string }) => r.event_id)
  )

  let unreviewedCount = 0
  for (const evt of completedEvents) {
    if (reviewedEventIds.has(evt.id)) continue
    unreviewedCount++
  }

  if (unreviewedCount >= 2) {
    signals.push({
      id: generateId(),
      domain: 'reputation',
      urgency: 2,
      confidence: 0.8,
      title: `${unreviewedCount} events without reviews`,
      detail: `${unreviewedCount} completed events in the last 30 days have no client review. Reviews build trust and help you improve.`,
      suggestedAction: 'Send review requests to recent clients',
      actionType: 'navigate',
      actionPayload: { path: '/clients' },
      entityIds: completedEvents
        .filter((e: { id: string }) => !reviewedEventIds.has(e.id))
        .map((e: { id: string }) => e.id),
      source: 'reputation.unreviewedEvents',
      createdAt: now,
    })
  }
}

// Client Reviews Server Actions
// Handles client feedback submission and chef-side review retrieval.
// Reviews are scoped per-event (one review per event) with optional public display consent.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// VALIDATION
// ============================================

const SubmitReviewSchema = z.object({
  event_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback_text: z.string().max(2000).optional().nullable(),
  what_they_loved: z.string().max(1000).optional().nullable(),
  what_could_improve: z.string().max(1000).optional().nullable(),
  display_consent: z.boolean().default(false),
})

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>

// ============================================
// CLIENT ACTIONS
// ============================================

/**
 * Submit a review for a completed event.
 * Client must own the event. Event must be in 'completed' status.
 */
export async function submitClientReview(input: SubmitReviewInput) {
  const user = await requireClient()
  const validated = SubmitReviewSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify the event belongs to this client and is completed
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tenant_id, status, occasion')
    .eq('id', validated.event_id)
    .eq('client_id', user.entityId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  if (event.status !== 'completed') {
    throw new Error('Reviews can only be submitted for completed events')
  }

  // Check if a review already exists
  const { data: existing } = await supabase
    .from('client_reviews')
    .select('id')
    .eq('event_id', validated.event_id)
    .single()

  if (existing) {
    throw new Error('A review has already been submitted for this event')
  }

  // Insert the review and get back the ID
  const { data: newReview, error: insertError } = await supabase
    .from('client_reviews')
    .insert({
      event_id: validated.event_id,
      client_id: user.entityId,
      tenant_id: event.tenant_id,
      rating: validated.rating,
      feedback_text: validated.feedback_text || null,
      what_they_loved: validated.what_they_loved || null,
      what_could_improve: validated.what_could_improve || null,
      display_consent: validated.display_consent,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[submitClientReview] Insert error:', insertError)
    throw new Error('Failed to submit review')
  }

  revalidatePath(`/my-events/${validated.event_id}`)

  // Notify chef of new review (non-blocking)
  notifyChefOfReview(
    event.tenant_id,
    user.entityId,
    event.occasion || 'your event',
    validated.rating,
    validated.feedback_text || null,
    newReview?.id ?? null
  ).catch((err) => console.error('[submitClientReview] Chef notification failed:', err))

  return { success: true }
}

// ─── Internal: notify chef when a review is submitted ────────────────────────

async function notifyChefOfReview(
  tenantId: string,
  clientId: string,
  occasion: string,
  rating: number,
  reviewExcerpt: string | null,
  reviewId: string | null
): Promise<void> {
  const { createNotification, getChefAuthUserId, getChefProfile } =
    await import('@/lib/notifications/actions')

  const [chefUserId, chefProfile] = await Promise.all([
    getChefAuthUserId(tenantId),
    getChefProfile(tenantId),
  ])

  if (!chefUserId) return

  // Load client name
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient({ admin: true })
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .single()
  const clientName = client?.full_name ?? 'A client'

  // In-app notification
  await createNotification({
    tenantId,
    recipientId: chefUserId,
    category: 'client',
    action: 'review_submitted',
    title: 'New review received',
    body: `${clientName} left a ${rating}-star review for ${occasion}`,
    actionUrl: '/reviews',
    clientId,
    metadata: { rating, review_id: reviewId },
  })

  // Email the chef
  if (chefProfile) {
    const { sendReviewSubmittedChefEmail } = await import('@/lib/email/notifications')
    await sendReviewSubmittedChefEmail({
      chefEmail: chefProfile.email,
      chefName: chefProfile.name,
      clientName,
      occasion,
      rating,
      reviewExcerpt,
      reviewId: reviewId ?? 'unknown',
    })
  }
}

/**
 * Get the client's review for a specific event (if one exists).
 */
export async function getClientReviewForEvent(eventId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_reviews')
    .select('*')
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (error) return null
  return data
}

/**
 * Record that the client clicked the Google Review link.
 */
export async function recordGoogleReviewClick(eventId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Update the review record
  const { error } = await supabase
    .from('client_reviews')
    .update({ google_review_clicked: true })
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)

  if (error) {
    console.error('[recordGoogleReviewClick] Error:', error)
  }

  // Mark review_link_sent on the event
  await supabase.from('events').update({ review_link_sent: true }).eq('id', eventId)

  revalidatePath(`/my-events/${eventId}`)
  return { success: true }
}

// ============================================
// CHEF ACTIONS
// ============================================

/**
 * Get all reviews for the chef's tenant.
 */
export async function getChefReviews() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_reviews')
    .select(
      `
      *,
      client:clients!inner(id, full_name, email),
      event:events!inner(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefReviews] Error:', error)
    throw new Error('Failed to fetch reviews')
  }

  return data
}

/**
 * Get review stats for the chef's tenant.
 */
export async function getChefReviewStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_reviews')
    .select('rating, display_consent, google_review_clicked')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getChefReviewStats] Error:', error)
    return { total: 0, averageRating: 0, consentCount: 0, googleClickCount: 0 }
  }

  const total = data.length
  const averageRating = total > 0 ? data.reduce((sum: any, r: any) => sum + r.rating, 0) / total : 0
  const consentCount = data.filter((r: any) => r.display_consent).length
  const googleClickCount = data.filter((r: any) => r.google_review_clicked).length

  return { total, averageRating, consentCount, googleClickCount }
}

/**
 * Get the chef's Google Review URL.
 */
export async function getGoogleReviewUrl() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('google_review_url')
    .eq('id', user.entityId)
    .single()

  return data?.google_review_url ?? null
}

/**
 * Update the chef's Google Review URL.
 */
export async function updateGoogleReviewUrl(url: string | null) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Basic validation - must be a Google URL or empty
  if (url && url.trim()) {
    const trimmed = url.trim()
    if (!trimmed.startsWith('https://')) {
      throw new Error('URL must start with https://')
    }
  }

  const { error } = await supabase
    .from('chefs')
    .update({ google_review_url: url?.trim() || null })
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateGoogleReviewUrl] Error:', error)
    throw new Error('Failed to update Google Review URL')
  }

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Get the Google Review URL for a specific tenant (used client-side).
 * Returns the URL without requiring chef role.
 */
export async function getGoogleReviewUrlForTenant(tenantId: string) {
  await requireClient()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('google_review_url')
    .eq('id', tenantId)
    .single()

  return data?.google_review_url ?? null
}

// ============================================
// UNIFIED REVIEW FEED
// ============================================

export type UnifiedChefReviewItem = {
  id: string
  kind: 'client_review' | 'logged_feedback' | 'external_review'
  sourceKey: string
  sourceLabel: string
  sourceUrl: string | null
  reviewerName: string
  rating: number | null
  reviewText: string
  contextLine: string | null
  reviewDate: string
  createdAt: string
  tags: string[]
}

function isMissingRelationError(error: any): boolean {
  return error?.code === '42P01'
}

function safeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const FEEDBACK_SOURCE_LABELS: Record<string, string> = {
  verbal: 'Verbal',
  google: 'Google',
  yelp: 'Yelp',
  yelp_guest: 'Yelp',
  email: 'Email',
  social_media: 'Social Media',
  text_message: 'Text',
  other: 'Other',
  airbnb: 'Airbnb',
  facebook: 'Facebook',
  tripadvisor: 'TripAdvisor',
  thumbtack: 'Thumbtack',
  bark: 'Bark',
  gigsalad: 'GigSalad',
  taskrabbit: 'TaskRabbit',
  houzz: 'Houzz',
  angi: 'Angi',
  nextdoor: 'Nextdoor',
  instagram: 'Instagram',
}

function providerLabel(provider: string): string {
  if (provider === 'google_places') return 'Google Places'
  if (provider === 'website_jsonld') return 'Website'
  return provider
}

function formatEventContext(event: { occasion: string | null; event_date: string } | null) {
  if (!event) return null
  const occasion = event.occasion?.trim() || 'Event'
  return `${occasion} - ${event.event_date}`
}

export async function getUnifiedChefReviewFeed(): Promise<UnifiedChefReviewItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [clientReviewsResult, chefFeedbackResult, externalReviewsResult] = await Promise.all([
    supabase
      .from('client_reviews')
      .select(
        `
        id,
        rating,
        feedback_text,
        what_they_loved,
        what_could_improve,
        display_consent,
        google_review_clicked,
        created_at,
        client:clients(id, full_name),
        event:events(id, occasion, event_date)
      `
      )
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('chef_feedback')
      .select(
        `
        id,
        source,
        rating,
        feedback_text,
        source_url,
        feedback_date,
        public_display,
        created_at,
        client:clients(id, full_name),
        event:events(id, occasion, event_date)
      `
      )
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('external_reviews')
      .select(
        `
        id,
        source_id,
        provider,
        source_url,
        author_name,
        rating,
        review_text,
        review_date,
        created_at
      `
      )
      .eq('tenant_id', user.tenantId)
      .order('review_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (clientReviewsResult.error) {
    console.error('[getUnifiedChefReviewFeed] client_reviews error:', clientReviewsResult.error)
    throw new Error('Failed to load client reviews')
  }

  if (chefFeedbackResult.error) {
    if (!isMissingRelationError(chefFeedbackResult.error)) {
      console.error('[getUnifiedChefReviewFeed] chef_feedback error:', chefFeedbackResult.error)
      throw new Error('Failed to load logged feedback')
    }
  }

  if (externalReviewsResult.error) {
    if (!isMissingRelationError(externalReviewsResult.error)) {
      console.error(
        '[getUnifiedChefReviewFeed] external_reviews error:',
        externalReviewsResult.error
      )
      throw new Error('Failed to load external reviews')
    }
  }

  const externalSourceIds = Array.from(
    new Set(
      ((externalReviewsResult.data || []) as any[])
        .map((review) => review.source_id)
        .filter(
          (sourceId): sourceId is string => typeof sourceId === 'string' && sourceId.length > 0
        )
    )
  )

  let externalSourceLabelMap: Record<string, string> = {}
  if (externalSourceIds.length > 0) {
    const { data: sourceRows, error: sourceError } = await supabase
      .from('external_review_sources')
      .select('id, label')
      .eq('tenant_id', user.tenantId)
      .in('id', externalSourceIds)

    if (sourceError) {
      if (!isMissingRelationError(sourceError)) {
        console.error('[getUnifiedChefReviewFeed] external_review_sources error:', sourceError)
        throw new Error('Failed to load external source metadata')
      }
    } else {
      externalSourceLabelMap = ((sourceRows || []) as any[]).reduce(
        (acc, row) => {
          if (typeof row.id === 'string' && typeof row.label === 'string') {
            acc[row.id] = row.label
          }
          return acc
        },
        {} as Record<string, string>
      )
    }
  }

  const clientItems: UnifiedChefReviewItem[] = ((clientReviewsResult.data || []) as any[]).map(
    (review) => {
      const fragments = [
        typeof review.feedback_text === 'string' ? review.feedback_text.trim() : '',
        typeof review.what_they_loved === 'string' && review.what_they_loved.trim()
          ? `Loved: ${review.what_they_loved.trim()}`
          : '',
        typeof review.what_could_improve === 'string' && review.what_could_improve.trim()
          ? `Could improve: ${review.what_could_improve.trim()}`
          : '',
      ].filter(Boolean)

      const reviewText = fragments.join(' ')

      return {
        id: `client_${review.id}`,
        kind: 'client_review',
        sourceKey: 'chef_flow',
        sourceLabel: 'ChefFlow',
        sourceUrl: null,
        reviewerName: review.client?.full_name || 'Client',
        rating: safeRating(review.rating),
        reviewText: reviewText || 'No written notes provided.',
        contextLine: formatEventContext(review.event || null),
        reviewDate: review.created_at,
        createdAt: review.created_at,
        tags: [
          review.display_consent ? 'Public OK' : '',
          review.google_review_clicked ? 'Clicked Google Link' : '',
        ].filter(Boolean),
      }
    }
  )

  const feedbackItems: UnifiedChefReviewItem[] = ((chefFeedbackResult.data || []) as any[]).map(
    (feedback) => ({
      id: `feedback_${feedback.id}`,
      kind: 'logged_feedback',
      sourceKey: feedback.source,
      sourceLabel: FEEDBACK_SOURCE_LABELS[feedback.source] || feedback.source,
      sourceUrl: feedback.source_url || null,
      reviewerName:
        (feedback as any).reviewer_name || feedback.client?.full_name || 'External Reviewer',
      rating: safeRating(feedback.rating),
      reviewText:
        typeof feedback.feedback_text === 'string' && feedback.feedback_text.trim()
          ? feedback.feedback_text.trim()
          : 'No feedback text provided.',
      contextLine: formatEventContext(feedback.event || null),
      reviewDate: feedback.feedback_date || feedback.created_at,
      createdAt: feedback.created_at,
      tags: ['Manual Entry', ...(feedback.public_display ? ['Public'] : [])],
    })
  )

  const externalItems: UnifiedChefReviewItem[] = ((externalReviewsResult.data || []) as any[]).map(
    (review) => ({
      id: `external_${review.id}`,
      kind: 'external_review',
      sourceKey: review.provider,
      sourceLabel: externalSourceLabelMap[review.source_id] || providerLabel(review.provider),
      sourceUrl: review.source_url || null,
      reviewerName: review.author_name || 'External Reviewer',
      rating: safeRating(review.rating),
      reviewText:
        typeof review.review_text === 'string' && review.review_text.trim()
          ? review.review_text.trim()
          : 'No review text available.',
      contextLine: providerLabel(review.provider),
      reviewDate: review.review_date || review.created_at,
      createdAt: review.created_at,
      tags: ['External Sync'],
    })
  )

  return [...clientItems, ...feedbackItems, ...externalItems].sort((a, b) => {
    const first = Date.parse(a.reviewDate)
    const second = Date.parse(b.reviewDate)
    const firstSafe = Number.isNaN(first) ? 0 : first
    const secondSafe = Number.isNaN(second) ? 0 : second
    return secondSafe - firstSafe
  })
}

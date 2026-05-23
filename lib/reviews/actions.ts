// Client Reviews Server Actions
// Handles client feedback submission and chef-side review retrieval.
// Reviews are scoped per-event (one review per event) with optional public display consent.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  assessReviewSourceUrl,
  attachDuplicateSignals,
  buildReviewAnalytics,
  buildReviewExportPack,
  deriveReviewResponseState,
  deriveReviewTrustTier,
  getReviewSourceLabel,
  normalizeReviewSourceKey,
  type PublicDisplayState,
  type ReviewCommandCenterEntry,
  type ReviewLinkHealth,
  type ReviewResponseState,
  type ReviewTrustTier,
} from '@/lib/reviews/command-center'

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
  food_quality_rating: z.number().int().min(1).max(5).optional().nullable(),
  communication_rating: z.number().int().min(1).max(5).optional().nullable(),
  presentation_rating: z.number().int().min(1).max(5).optional().nullable(),
  punctuality_rating: z.number().int().min(1).max(5).optional().nullable(),
  cleanup_rating: z.number().int().min(1).max(5).optional().nullable(),
  would_book_again: z.boolean().optional().nullable(),
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
  const db: any = createServerClient()

  // Verify the event belongs to this client and is completed
  const { data: event, error: eventError } = await db
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

  // Check if this client already submitted a review for this event
  const { data: existing } = await db
    .from('client_reviews')
    .select('id')
    .eq('event_id', validated.event_id)
    .eq('client_id', user.entityId)
    .single()

  if (existing) {
    throw new Error('A review has already been submitted for this event')
  }

  // Insert the review and get back the ID
  const { data: newReview, error: insertError } = await db
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
      food_quality_rating: validated.food_quality_rating ?? null,
      communication_rating: validated.communication_rating ?? null,
      presentation_rating: validated.presentation_rating ?? null,
      punctuality_rating: validated.punctuality_rating ?? null,
      cleanup_rating: validated.cleanup_rating ?? null,
      would_book_again: validated.would_book_again ?? null,
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

  // Loyalty triggers (non-blocking)
  try {
    const { fireTrigger } = await import('@/lib/loyalty/triggers')
    await fireTrigger('review_submitted', event.tenant_id, user.entityId, {
      eventId: validated.event_id,
      description: 'Review submitted',
    })
    if (validated.display_consent) {
      await fireTrigger('public_review_consent', event.tenant_id, user.entityId, {
        eventId: validated.event_id,
        description: 'Public review consent given',
      })
    }
  } catch (err) {
    console.error('[submitClientReview] Loyalty trigger failed (non-blocking):', err)
  }

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
  const { createServerClient } = await import('@/lib/db/server')
  const db = createServerClient({ admin: true })
  const { data: client } = await db.from('clients').select('full_name').eq('id', clientId).single()
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
  const db: any = createServerClient()

  const { data, error } = await db
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
  const db: any = createServerClient()

  // Update the review record
  const { error } = await db
    .from('client_reviews')
    .update({ google_review_clicked: true })
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)

  if (error) {
    console.error('[recordGoogleReviewClick] Error:', error)
  }

  // Mark review_link_sent on the event (only if this client owns the event)
  await db
    .from('events')
    .update({ review_link_sent: true })
    .eq('id', eventId)
    .eq('client_id', user.entityId)

  // Loyalty trigger (non-blocking)
  try {
    const { data: event } = await db.from('events').select('tenant_id').eq('id', eventId).single()
    if (event?.tenant_id) {
      const { fireTrigger } = await import('@/lib/loyalty/triggers')
      await fireTrigger('google_review_clicked', event.tenant_id, user.entityId, {
        eventId,
        description: 'Google review clicked',
      })
    }
  } catch (err) {
    console.error('[recordGoogleReviewClick] Loyalty trigger failed (non-blocking):', err)
  }

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
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_reviews')
    .select(
      `
      *,
      client:clients!inner(id, full_name, email),
      event:events!inner(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.entityId!)
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
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_reviews')
    .select('rating, display_consent, google_review_clicked')
    .eq('tenant_id', user.entityId!)

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
  const db: any = createServerClient()

  const { data } = await db
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
  const db: any = createServerClient()

  // Basic validation - must be a Google URL or empty
  if (url && url.trim()) {
    const trimmed = url.trim()
    if (!trimmed.startsWith('https://')) {
      throw new Error('URL must start with https://')
    }
  }

  const { error } = await db
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
  const db: any = createServerClient()

  const { data } = await db.from('chefs').select('google_review_url').eq('id', tenantId).single()

  return data?.google_review_url ?? null
}

// ============================================
// UNIFIED REVIEW FEED
// ============================================

export type UnifiedChefReviewItem = {
  id: string
  kind: 'client_review' | 'logged_feedback' | 'external_review' | 'guest_testimonial'
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
  publicDisplay: PublicDisplayState
  responseState: ReviewResponseState
  trustTier: ReviewTrustTier
  linkHealth: ReviewLinkHealth
  importState: 'confirmed' | 'needs_review' | 'rejected'
  directSourceLinkLabel: string | null
  isFeatured: boolean
  duplicateGroupId: string | null
  duplicateCount: number
  evidence: ReviewCommandCenterEntry['evidence']
  exportPack: ReturnType<typeof buildReviewExportPack>
}

export type UnifiedChefReviewAnalytics = ReturnType<typeof buildReviewAnalytics>

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
  take_a_chef: 'TakeAChef',
}

function providerLabel(provider: string): string {
  if (provider === 'google_places') return 'Google Places'
  if (provider === 'website_jsonld') return 'Website'
  return provider
}

function formatEventContext(event: { occasion: string | null; event_date: Date | string } | null) {
  if (!event) return null
  const occasion = event.occasion?.trim() || 'Event'
  return `${occasion} - ${dateToDateString(event.event_date as Date | string)}`
}

function withCommandCenterMetadata(
  item: Omit<
    UnifiedChefReviewItem,
    | 'duplicateGroupId'
    | 'duplicateCount'
    | 'exportPack'
    | 'linkHealth'
    | 'trustTier'
    | 'directSourceLinkLabel'
    | 'evidence'
  > & {
    hasVerifiedEvent?: boolean
    rawPayload?: Record<string, unknown> | null
  }
): UnifiedChefReviewItem {
  const sourceKey = normalizeReviewSourceKey(item.sourceKey)
  const linkHealth = assessReviewSourceUrl(sourceKey, item.sourceUrl)
  const sourceLabel = getReviewSourceLabel(sourceKey, item.sourceLabel)
  const trustTier = deriveReviewTrustTier({
    kind: item.kind,
    sourceKey,
    hasVerifiedEvent: item.hasVerifiedEvent,
    importState: item.importState,
    linkHealth,
  })
  const directSourceLinkLabel =
    item.sourceUrl && linkHealth === 'valid' ? `Open on ${sourceLabel}` : null
  const commandEntry: ReviewCommandCenterEntry = {
    id: item.id,
    kind: item.kind,
    sourceKey,
    sourceLabel,
    sourceUrl: item.sourceUrl,
    reviewerName: item.reviewerName,
    rating: item.rating,
    reviewText: item.reviewText,
    reviewDate: item.reviewDate,
    createdAt: item.createdAt,
    publicDisplay: item.publicDisplay,
    responseState: item.responseState,
    linkHealth,
    trustTier,
    importState: item.importState,
    directSourceLinkLabel,
    isFeatured: item.isFeatured,
    duplicateGroupId: null,
    duplicateCount: 0,
    evidence: {
      provider: sourceKey,
      sourceUrl: item.sourceUrl,
      importedAt: item.kind === 'external_review' ? item.createdAt : null,
      reviewerDisplayName: item.reviewerName,
      hasRawPayload: !!item.rawPayload && Object.keys(item.rawPayload).length > 0,
      publicDecision: item.publicDisplay,
    },
  }

  return {
    id: item.id,
    kind: item.kind,
    sourceKey,
    sourceLabel,
    sourceUrl: item.sourceUrl,
    reviewerName: item.reviewerName,
    rating: item.rating,
    reviewText: item.reviewText,
    contextLine: item.contextLine,
    reviewDate: item.reviewDate,
    createdAt: item.createdAt,
    tags: item.tags,
    publicDisplay: item.publicDisplay,
    responseState: item.responseState,
    trustTier,
    linkHealth,
    importState: item.importState,
    directSourceLinkLabel,
    isFeatured: item.isFeatured,
    duplicateGroupId: null,
    duplicateCount: 0,
    evidence: commandEntry.evidence,
    exportPack: buildReviewExportPack(commandEntry),
  }
}

export async function getUnifiedChefReviewFeed(): Promise<UnifiedChefReviewItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [
    clientReviewsResult,
    chefFeedbackResult,
    externalReviewsResult,
    guestTestimonialsResult,
    requestTestimonialsResult,
  ] = await Promise.all([
    db
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
        chef_response,
        responded_at,
        created_at,
        client:clients(id, full_name),
        event:events(id, occasion, event_date)
      `
      )
      .eq('tenant_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
    db
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
      .eq('tenant_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
    db
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
        raw_payload,
        created_at
      `
      )
      .eq('tenant_id', user.entityId)
      .order('review_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('guest_testimonials')
      .select(
        'id, event_id, guest_name, testimonial, rating, food_rating, chef_rating, is_approved, is_featured, created_at, event:events(id, occasion, event_date)'
      )
      .eq('tenant_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('testimonials' as any)
      .select(
        'id, client_name, display_name, rating, content, is_approved, is_featured, is_public, submitted_at, request_sent_at, event_type, created_at'
      )
      .eq('tenant_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
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

  if (guestTestimonialsResult.error) {
    if (!isMissingRelationError(guestTestimonialsResult.error)) {
      console.error(
        '[getUnifiedChefReviewFeed] guest_testimonials error:',
        guestTestimonialsResult.error
      )
      throw new Error('Failed to load guest testimonials')
    }
  }

  if (requestTestimonialsResult.error) {
    if (!isMissingRelationError(requestTestimonialsResult.error)) {
      console.error(
        '[getUnifiedChefReviewFeed] testimonials error:',
        requestTestimonialsResult.error
      )
      throw new Error('Failed to load requested testimonials')
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
    const { data: sourceRows, error: sourceError } = await db
      .from('external_review_sources')
      .select('id, label')
      .eq('tenant_id', user.entityId)
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

      return withCommandCenterMetadata({
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
        publicDisplay: review.display_consent ? 'public' : 'private',
        responseState: deriveReviewResponseState({
          rating: safeRating(review.rating),
          chefResponse: review.chef_response,
        }),
        importState: 'confirmed',
        isFeatured: false,
        hasVerifiedEvent: true,
        tags: [
          review.display_consent ? 'Public OK' : '',
          review.google_review_clicked ? 'Clicked Google Link' : '',
          review.chef_response ? 'Responded' : 'Needs Response',
        ].filter(Boolean),
      })
    }
  )

  const feedbackItems: UnifiedChefReviewItem[] = ((chefFeedbackResult.data || []) as any[]).map(
    (feedback) =>
      withCommandCenterMetadata({
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
        publicDisplay: feedback.public_display ? 'public' : 'private',
        responseState: deriveReviewResponseState({ rating: safeRating(feedback.rating) }),
        importState:
          assessReviewSourceUrl(feedback.source, feedback.source_url || null) === 'valid'
            ? 'confirmed'
            : 'needs_review',
        isFeatured: false,
        tags: [
          'Manual Entry',
          feedback.public_display ? 'Public' : 'Private',
          feedback.source_url ? 'Linked' : 'Missing Link',
        ],
      })
  )

  const externalItems: UnifiedChefReviewItem[] = ((externalReviewsResult.data || []) as any[]).map(
    (review) =>
      withCommandCenterMetadata({
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
        publicDisplay: 'public',
        responseState: deriveReviewResponseState({ rating: safeRating(review.rating) }),
        importState:
          assessReviewSourceUrl(review.provider, review.source_url || null) === 'valid'
            ? 'confirmed'
            : 'needs_review',
        isFeatured: false,
        rawPayload: review.raw_payload,
        tags: ['External Sync', review.source_url ? 'Linked' : 'Missing Link'],
      })
  )

  const guestItems: UnifiedChefReviewItem[] = ((guestTestimonialsResult.data || []) as any[]).map(
    (testimonial) =>
      withCommandCenterMetadata({
        id: `guest_${testimonial.id}`,
        kind: 'guest_testimonial',
        sourceKey: 'guest_testimonial',
        sourceLabel: 'Guest Testimonial',
        sourceUrl: null,
        reviewerName: testimonial.guest_name || 'Guest',
        rating:
          safeRating(testimonial.rating) ??
          (safeRating(testimonial.food_rating) && safeRating(testimonial.chef_rating)
            ? ((safeRating(testimonial.food_rating) ?? 0) +
                (safeRating(testimonial.chef_rating) ?? 0)) /
              2
            : (safeRating(testimonial.food_rating) ?? safeRating(testimonial.chef_rating))),
        reviewText:
          typeof testimonial.testimonial === 'string' && testimonial.testimonial.trim()
            ? testimonial.testimonial.trim()
            : 'No testimonial text provided.',
        contextLine: formatEventContext(testimonial.event || null),
        reviewDate: testimonial.created_at,
        createdAt: testimonial.created_at,
        publicDisplay: testimonial.is_approved ? 'public' : 'pending',
        responseState: deriveReviewResponseState({ rating: safeRating(testimonial.rating) }),
        importState: testimonial.is_approved ? 'confirmed' : 'needs_review',
        isFeatured: Boolean(testimonial.is_featured),
        hasVerifiedEvent: true,
        tags: [
          'Guest Testimonial',
          testimonial.is_approved ? 'Public OK' : 'Needs Approval',
          testimonial.is_featured ? 'Featured' : '',
        ].filter(Boolean),
      })
  )

  const requestTestimonialItems: UnifiedChefReviewItem[] = (
    (requestTestimonialsResult.data || []) as any[]
  )
    .filter((testimonial) => typeof testimonial.content === 'string' && testimonial.content.trim())
    .map((testimonial) =>
      withCommandCenterMetadata({
        id: `testimonial_${testimonial.id}`,
        kind: 'guest_testimonial',
        sourceKey: 'guest_testimonial',
        sourceLabel: 'Requested Testimonial',
        sourceUrl: null,
        reviewerName:
          testimonial.display_name || testimonial.client_name || 'Requested testimonial',
        rating: safeRating(testimonial.rating),
        reviewText: testimonial.content.trim(),
        contextLine: testimonial.event_type || null,
        reviewDate: testimonial.submitted_at || testimonial.created_at,
        createdAt: testimonial.created_at,
        publicDisplay:
          testimonial.is_approved && testimonial.is_public
            ? 'public'
            : testimonial.submitted_at
              ? 'pending'
              : 'private',
        responseState: deriveReviewResponseState({ rating: safeRating(testimonial.rating) }),
        importState: testimonial.is_approved ? 'confirmed' : 'needs_review',
        isFeatured: Boolean(testimonial.is_featured),
        hasVerifiedEvent: true,
        tags: [
          'Review Request',
          testimonial.is_approved ? 'Approved' : 'Needs Approval',
          testimonial.is_featured ? 'Featured' : '',
        ].filter(Boolean),
      })
    )

  const sorted = [
    ...clientItems,
    ...feedbackItems,
    ...externalItems,
    ...guestItems,
    ...requestTestimonialItems,
  ].sort((a, b) => {
    const first = Date.parse(a.reviewDate)
    const second = Date.parse(b.reviewDate)
    const firstSafe = Number.isNaN(first) ? 0 : first
    const secondSafe = Number.isNaN(second) ? 0 : second
    return secondSafe - firstSafe
  })

  return attachDuplicateSignals(sorted).map((entry) => ({
    ...entry,
    exportPack: buildReviewExportPack(entry),
  }))
}

function parseUnifiedReviewId(reviewId: string) {
  const [prefix, ...rest] = reviewId.split('_')
  const id = rest.join('_')
  if (!prefix || !id) throw new Error('Invalid review id')
  return { prefix, id }
}

export async function setReviewPublicDisplay(reviewId: string, makePublic: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()
  const { prefix, id } = parseUnifiedReviewId(reviewId)

  if (prefix === 'client') {
    const { error } = await db
      .from('client_reviews')
      .update({ display_consent: makePublic })
      .eq('id', id)
      .eq('tenant_id', user.entityId)
    if (error) throw new Error('Failed to update client review visibility')
  } else if (prefix === 'feedback') {
    const { error } = await db
      .from('chef_feedback')
      .update({ public_display: makePublic })
      .eq('id', id)
      .eq('tenant_id', user.entityId)
    if (error) throw new Error('Failed to update feedback visibility')
  } else if (prefix === 'guest') {
    const { error } = await db
      .from('guest_testimonials')
      .update({ is_approved: makePublic })
      .eq('id', id)
      .eq('tenant_id', user.entityId)
    if (error) throw new Error('Failed to update guest testimonial visibility')
  } else if (prefix === 'testimonial') {
    const { error } = await db
      .from('testimonials' as any)
      .update({ is_approved: makePublic, is_public: makePublic })
      .eq('id', id)
      .eq('tenant_id', user.entityId)
    if (error) throw new Error('Failed to update testimonial visibility')
  } else {
    throw new Error('This review source does not support public display updates')
  }

  revalidatePath('/reviews')
  revalidatePath('/settings/client-preview')
  return { success: true }
}

export async function setReviewFeatured(reviewId: string, featured: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()
  const { prefix, id } = parseUnifiedReviewId(reviewId)

  if (prefix === 'guest') {
    const { error } = await db
      .from('guest_testimonials')
      .update({ is_featured: featured })
      .eq('id', id)
      .eq('tenant_id', user.entityId)
    if (error) throw new Error('Failed to update guest testimonial feature state')
  } else if (prefix === 'testimonial') {
    const { error } = await db
      .from('testimonials' as any)
      .update({ is_featured: featured })
      .eq('id', id)
      .eq('tenant_id', user.entityId)
    if (error) throw new Error('Failed to update testimonial feature state')
  } else {
    throw new Error('Only testimonials can be featured persistently right now')
  }

  revalidatePath('/reviews')
  revalidatePath('/settings/client-preview')
  return { success: true }
}

export async function saveChefReviewResponse(reviewId: string, responseText: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const { prefix, id } = parseUnifiedReviewId(reviewId)
  const response = z.string().trim().min(1).max(2000).parse(responseText)

  if (prefix !== 'client') {
    throw new Error('ChefFlow responses are currently saved on client reviews only')
  }

  const { error } = await db
    .from('client_reviews')
    .update({ chef_response: response, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[saveChefReviewResponse] Error:', error)
    throw new Error('Failed to save review response')
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function draftRemyReviewResponse(reviewId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const { prefix, id } = parseUnifiedReviewId(reviewId)

  if (prefix !== 'client') {
    throw new Error('Remy response drafting is available for ChefFlow client reviews')
  }

  const { data: review, error } = await db
    .from('client_reviews')
    .select('rating, feedback_text, what_they_loved, what_could_improve, client:clients(full_name)')
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .single()

  if (error || !review) {
    throw new Error('Review not found')
  }

  const clientName = review.client?.full_name || 'there'
  const loved =
    typeof review.what_they_loved === 'string' && review.what_they_loved.trim()
      ? ` We loved hearing that ${review.what_they_loved.trim().toLowerCase()}.`
      : ''
  const improve =
    typeof review.what_could_improve === 'string' && review.what_could_improve.trim()
      ? ` I also appreciate the note about ${review.what_could_improve.trim().toLowerCase()} and will use it to improve the next experience.`
      : ''
  const draft = `Thank you, ${clientName}, for taking the time to share this review.${loved}${improve} It was a pleasure cooking for you, and I appreciate the trust.`

  return {
    success: true,
    draft,
    approvalRequired: true,
  }
}

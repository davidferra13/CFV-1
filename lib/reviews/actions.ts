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
  const supabase = createServerClient()

  // Verify the event belongs to this client and is completed
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tenant_id, status')
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

  // Insert the review
  const { error: insertError } = await supabase
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

  if (insertError) {
    console.error('[submitClientReview] Insert error:', insertError)
    throw new Error('Failed to submit review')
  }

  revalidatePath(`/my-events/${validated.event_id}`)
  return { success: true }
}

/**
 * Get the client's review for a specific event (if one exists).
 */
export async function getClientReviewForEvent(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  await supabase
    .from('events')
    .update({ review_link_sent: true })
    .eq('id', eventId)

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
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_reviews')
    .select(`
      *,
      client:clients!inner(id, full_name, email),
      event:events!inner(id, occasion, event_date)
    `)
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
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_reviews')
    .select('rating, display_consent, google_review_clicked')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getChefReviewStats] Error:', error)
    return { total: 0, averageRating: 0, consentCount: 0, googleClickCount: 0 }
  }

  const total = data.length
  const averageRating = total > 0
    ? data.reduce((sum, r) => sum + r.rating, 0) / total
    : 0
  const consentCount = data.filter(r => r.display_consent).length
  const googleClickCount = data.filter(r => r.google_review_clicked).length

  return { total, averageRating, consentCount, googleClickCount }
}

/**
 * Get the chef's Google Review URL.
 */
export async function getGoogleReviewUrl() {
  const user = await requireChef()
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('google_review_url')
    .eq('id', tenantId)
    .single()

  return data?.google_review_url ?? null
}

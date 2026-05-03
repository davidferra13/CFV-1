'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Public actions (no auth - guests submitting from recap page)
// ---------------------------------------------------------------------------

const TestimonialSchema = z.object({
  shareToken: z.string().min(1),
  guestToken: z.string().optional(),
  guestName: z.string().min(1, 'Name is required').max(100),
  testimonial: z.string().min(1, 'Please share your thoughts').max(1000),
  foodRating: z.number().int().min(1).max(5).optional(),
  chefRating: z.number().int().min(1).max(5).optional(),
  foodHighlight: z.string().max(200).optional(),
  wouldRecommend: z.boolean().optional(),
})

/**
 * Submit a testimonial from the recap page.
 * Public - no auth required.
 */
export async function submitTestimonial(input: {
  shareToken: string
  guestToken?: string
  guestName: string
  testimonial: string
  foodRating?: number
  chefRating?: number
  foodHighlight?: string
  wouldRecommend?: boolean
}) {
  const validated = TestimonialSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Resolve share token → event + tenant
  const { data: share } = await db
    .from('event_shares')
    .select('event_id, tenant_id')
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()

  if (!share) {
    throw new Error('Invalid share link')
  }

  // Link to guest record if token provided
  let guestId: string | null = null
  if (validated.guestToken) {
    const { data: guest } = await db
      .from('event_guests')
      .select('id')
      .eq('guest_token', validated.guestToken)
      .eq('event_id', share.event_id)
      .single()
    if (guest) guestId = guest.id
  }

  // Compute overall rating as average of food + chef if both provided
  const overallRating =
    validated.foodRating && validated.chefRating
      ? Math.round((validated.foodRating + validated.chefRating) / 2)
      : validated.foodRating || validated.chefRating || null

  // Deduplicate: one testimonial per guest name per event
  const { data: existing } = await db
    .from('guest_testimonials')
    .select('id')
    .eq('event_id', share.event_id)
    .eq('guest_name', validated.guestName.trim())
    .single()

  if (existing) {
    await db
      .from('guest_testimonials')
      .update({
        testimonial: validated.testimonial.trim(),
        rating: overallRating,
        food_rating: validated.foodRating || null,
        chef_rating: validated.chefRating || null,
        food_highlight: validated.foodHighlight?.trim() || null,
        would_recommend: validated.wouldRecommend ?? null,
      })
      .eq('id', existing.id)

    return { success: true, updated: true }
  }

  const { error } = await db.from('guest_testimonials').insert({
    tenant_id: share.tenant_id,
    event_id: share.event_id,
    guest_id: guestId,
    guest_name: validated.guestName.trim(),
    testimonial: validated.testimonial.trim(),
    rating: overallRating,
    food_rating: validated.foodRating || null,
    chef_rating: validated.chefRating || null,
    food_highlight: validated.foodHighlight?.trim() || null,
    would_recommend: validated.wouldRecommend ?? null,
    is_approved: false,
    is_featured: false,
  })

  if (error) {
    console.error('[submitTestimonial] Insert error:', error)
    throw new Error('Failed to submit testimonial')
  }

  // Non-blocking notification
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: share.tenant_id,
      recipientId: share.tenant_id,
      category: 'review',
      action: 'review_submitted',
      title: 'New guest testimonial',
      body: `${validated.guestName.trim()} left a testimonial for your event.`,
      actionUrl: '/testimonials',
    })
  } catch (err) {
    console.error('[submitTestimonial] Notification failed (non-blocking):', err)
  }

  // Non-blocking loyalty trigger: award points for review_submitted (GAP #196)
  try {
    const { data: event } = await db
      .from('events')
      .select('client_id')
      .eq('id', share.event_id)
      .single()
    if (event?.client_id) {
      const { fireTrigger } = await import('@/lib/loyalty/triggers')
      await fireTrigger('review_submitted', share.tenant_id, event.client_id, {
        eventId: share.event_id,
        description: `Guest testimonial submitted by ${validated.guestName.trim()}`,
      })
    }
  } catch (err) {
    console.error('[submitTestimonial] Loyalty trigger failed (non-blocking):', err)
  }

  return { success: true, updated: false }
}

// ---------------------------------------------------------------------------
// Chef actions (auth required)
// ---------------------------------------------------------------------------

/**
 * Get all testimonials for the current chef. Newest first.
 */
export async function getTestimonials(filters?: { approved?: boolean; eventId?: string }) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('guest_testimonials')
    .select(
      'id, event_id, guest_name, testimonial, rating, food_rating, chef_rating, food_highlight, would_recommend, is_approved, is_featured, created_at'
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.approved !== undefined) {
    query = query.eq('is_approved', filters.approved)
  }

  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTestimonials] Error:', error)
    return []
  }

  return data ?? []
}

/**
 * Approve or reject a testimonial. Chef only.
 */
export async function setTestimonialApproval(testimonialId: string, approved: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('guest_testimonials')
    .update({ is_approved: approved })
    .eq('id', testimonialId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setTestimonialApproval] Error:', error)
    throw new Error('Failed to update testimonial')
  }
}

/**
 * Feature/unfeature a testimonial. Chef only.
 */
export async function setTestimonialFeatured(testimonialId: string, featured: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('guest_testimonials')
    .update({ is_featured: featured })
    .eq('id', testimonialId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setTestimonialFeatured] Error:', error)
    throw new Error('Failed to update testimonial')
  }
}

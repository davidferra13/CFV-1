'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SubmitSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1, 'Please share your experience').max(2000),
  displayName: z.string().min(1).max(100).optional(),
  allowPublicDisplay: z.boolean().default(false),
})

/**
 * Public action: submit a testimonial via a unique request token.
 * No auth required. Rate limited to 1 submission per token.
 */
export async function submitTestimonialByToken(input: {
  token: string
  rating: number
  content: string
  displayName?: string
  allowPublicDisplay?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const parsed = SubmitSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { token, rating, content, displayName, allowPublicDisplay } = parsed.data
  const supabase: any = createServerClient({ admin: true })

  // Look up the request by token
  const { data: existing, error: lookupError } = await supabase
    .from('testimonials' as any)
    .select('id, submitted_at, client_name')
    .eq('request_token', token)
    .single()

  if (lookupError || !existing) {
    return { success: false, error: 'Invalid or expired review link' }
  }

  // Rate limit: only 1 submission per token
  if ((existing as any).submitted_at) {
    return { success: false, error: 'This review has already been submitted' }
  }

  const { error: updateError } = await supabase
    .from('testimonials' as any)
    .update({
      rating,
      content: content.trim(),
      display_name: displayName?.trim() || (existing as any).client_name,
      is_public: allowPublicDisplay ?? false,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', (existing as any).id)

  if (updateError) {
    console.error('[submitTestimonialByToken] Update error:', updateError)
    return { success: false, error: 'Failed to submit review' }
  }

  // Non-blocking notification to chef
  try {
    // Look up tenant_id for notification
    const { data: testimonial } = await supabase
      .from('testimonials' as any)
      .select('tenant_id, client_name')
      .eq('id', (existing as any).id)
      .single()

    if (testimonial) {
      const { createNotification } = await import('@/lib/notifications/actions')
      await createNotification({
        tenantId: (testimonial as any).tenant_id,
        recipientId: (testimonial as any).tenant_id,
        category: 'review',
        action: 'review_submitted',
        title: 'New client review',
        body: `${(testimonial as any).client_name} submitted a ${rating}-star review.`,
        actionUrl: '/testimonials',
      })
    }
  } catch (err) {
    console.error('[submitTestimonialByToken] Notification failed (non-blocking):', err)
  }

  return { success: true }
}

/**
 * Look up a review request by token. Public, no auth.
 * Returns event info for the review form display.
 */
export async function getReviewRequestByToken(token: string): Promise<{
  found: boolean
  alreadySubmitted: boolean
  clientName: string
  eventType: string | null
  eventDate: string | null
} | null> {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('testimonials' as any)
    .select('id, client_name, event_type, submitted_at, event_id')
    .eq('request_token', token)
    .single()

  if (error || !data) return null

  const row = data as any

  // Try to get event date if event_id exists
  let eventDate: string | null = null
  if (row.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('event_date')
      .eq('id', row.event_id)
      .single()
    if (event) eventDate = (event as any).event_date
  }

  return {
    found: true,
    alreadySubmitted: row.submitted_at !== null,
    clientName: row.client_name,
    eventType: row.event_type,
    eventDate,
  }
}

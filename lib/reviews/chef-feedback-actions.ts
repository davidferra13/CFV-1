// Chef Feedback Server Actions
// Allows chefs to manually log verbal feedback, Google reviews, and external testimonials.
// Separate from client_reviews - this is chef-initiated data capture.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// VALIDATION
// ============================================

const LogFeedbackSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  source: z.enum([
    'verbal',
    'google',
    'yelp',
    'email',
    'social_media',
    'text_message',
    'other',
    'airbnb',
    'facebook',
    'tripadvisor',
    'thumbtack',
    'bark',
    'gigsalad',
    'taskrabbit',
    'houzz',
    'angi',
    'nextdoor',
    'instagram',
    'yelp_guest',
  ]),
  reviewer_name: z.string().max(200).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  feedback_text: z.string().min(1, 'Feedback text is required').max(5000),
  source_url: z.string().url().optional().or(z.literal('')),
  feedback_date: z.string().optional(), // ISO date string
  public_display: z.boolean().optional(), // show on public profile
})

export type LogFeedbackInput = z.infer<typeof LogFeedbackSchema>

// ============================================
// ACTIONS
// ============================================

/**
 * Log external feedback manually.
 * Chef captures verbal, Google, Yelp, social media, or other feedback.
 */
export async function logChefFeedback(input: LogFeedbackInput) {
  const user = await requireChef()
  const validated = LogFeedbackSchema.parse(input)
  const db: any = createServerClient()

  const { data: feedback, error } = await db
    .from('chef_feedback')
    .insert({
      tenant_id: user.tenantId!,
      client_id: validated.client_id ?? null,
      event_id: validated.event_id ?? null,
      source: validated.source,
      reviewer_name: validated.reviewer_name ?? null,
      rating: validated.rating ?? null,
      feedback_text: validated.feedback_text,
      source_url: validated.source_url || null,
      feedback_date: validated.feedback_date || new Date().toISOString().split('T')[0],
      logged_by: user.id,
      public_display: validated.public_display ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('[logChefFeedback] Error:', error)
    throw new Error('Failed to log feedback')
  }

  revalidatePath('/reviews')
  return { success: true, feedback }
}

/**
 * Get all chef-logged feedback for the tenant.
 * Includes optional client and event joins.
 */
export async function getChefFeedback() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_feedback')
    .select(
      `
      *,
      client:clients(id, full_name, email),
      event:events(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefFeedback] Error:', error)
    return []
  }

  return data
}

'use server'

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FeedbackSchema = z.object({
  sentiment: z.enum(['love', 'frustrated', 'suggestion', 'bug', 'other']),
  message: z.string().min(1).max(2000),
  anonymous: z.boolean(),
  page_context: z.string().max(500).optional(),
})

export type FeedbackInput = z.infer<typeof FeedbackSchema>

export async function submitFeedback(
  input: FeedbackInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = FeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input.' }
  }

  const { sentiment, message, anonymous, page_context } = parsed.data

  // Best-effort: attach identity if the user is authenticated and not sending anonymously
  const user = await getCurrentUser()

  const supabase: any = createServerClient()

  const { error } = await supabase.from('user_feedback').insert({
    sentiment,
    message,
    anonymous,
    page_context: page_context ?? null,
    user_id: !anonymous && user ? user.id : null,
    user_role: !anonymous && user ? user.role : null,
  })

  if (error) {
    console.error('[feedback] insert error:', error.message)
    return { success: false, error: 'Failed to save feedback. Please try again.' }
  }

  return { success: true }
}

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export type FeedbackSentiment = 'love' | 'frustrated' | 'suggestion' | 'bug' | 'other'

export async function submitUserFeedback(input: {
  sentiment: FeedbackSentiment
  message: string
  pageContext: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('user_feedback').insert({
    user_id: user.id,
    user_role: 'chef',
    sentiment: input.sentiment,
    message: input.message.trim() || `(${input.sentiment})`,
    page_context: input.pageContext,
    anonymous: false,
  })

  if (error) throw new Error('Failed to submit feedback')
}

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

interface SaveFeedbackInput {
  userMessage: string
  remyResponse: string
  rating: 'up' | 'down'
  feedbackType?: string
  notes?: string
  archetypeId?: string
  responseTimeMs?: number
}

export async function saveRemyFeedback(input: SaveFeedbackInput) {
  const user = await requireChef()
  const db = await createServerClient()

  const { error } = await db.from('remy_feedback').insert({
    tenant_id: user.tenantId!,
    chef_id: user.entityId!,
    user_message: input.userMessage,
    remy_response: input.remyResponse.slice(0, 2000),
    rating: input.rating,
    feedback_type: input.feedbackType ?? null,
    notes: input.notes ?? null,
    archetype_id: input.archetypeId ?? null,
    response_time_ms: input.responseTimeMs ?? null,
  })

  if (error) {
    console.error('[remy-feedback] Failed to save:', error.message)
    throw new Error('Failed to save feedback')
  }

  return { success: true }
}

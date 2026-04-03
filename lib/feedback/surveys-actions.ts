'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/db/server'
import {
  ensurePostEventSurveyForEvent,
  sendPostEventSurveyForEvent,
  submitPostEventSurveyResponse as submitCanonicalPostEventSurveyResponse,
} from '@/lib/post-event/trust-loop-actions'

export async function createPostEventSurvey(
  eventId: string
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  const token = await ensurePostEventSurveyForEvent(eventId)
  if (!token) {
    return { success: false, error: 'Failed to create survey.' }
  }

  const db: any = createServerClient({ admin: true })
  const { data } = await db
    .from('post_event_surveys')
    .select('id')
    .eq('survey_token', token)
    .maybeSingle()

  return { success: true, surveyId: data?.id }
}

export async function sendSurveyEmail(
  surveyId: string
): Promise<{ success: boolean; error?: string }> {
  const db: any = createServerClient({ admin: true })
  const { data: survey } = await db
    .from('post_event_surveys')
    .select('event_id')
    .eq('id', surveyId)
    .maybeSingle()

  if (!survey?.event_id) {
    return { success: false, error: 'Survey not found.' }
  }

  const result = await sendPostEventSurveyForEvent(survey.event_id)
  return result.ok ? { success: true } : { success: false, error: result.error }
}

const SurveyResponseSchema = z.object({
  token: z.string().min(1),
  food_quality: z.number().int().min(1).max(5),
  portion_size: z.number().int().min(1).max(5),
  punctuality: z.number().int().min(1).max(5),
  communication_rating: z.number().int().min(1).max(5),
  presentation: z.number().int().min(1).max(5),
  cleanup: z.number().int().min(1).max(5),
  overall: z.number().int().min(1).max(5),
  what_they_loved: z.string().max(2000).optional(),
  what_could_improve: z.string().max(2000).optional(),
  would_book_again: z.boolean(),
  additional_comments: z.string().max(2000).optional(),
  public_review_text: z.string().max(2000).optional(),
  public_review_consent: z.boolean().optional(),
  dish_feedback: z
    .array(
      z.object({
        dish_id: z.string().optional(),
        dish_name: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
      })
    )
    .optional(),
})

export async function submitSurveyResponse(
  input: z.infer<typeof SurveyResponseSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = SurveyResponseSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid survey data.' }
  return submitCanonicalPostEventSurveyResponse(parsed.data)
}

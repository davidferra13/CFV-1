'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type PostEventSurvey = {
  id: string
  event_id: string
  tenant_id: string
  client_id: string
  food_quality: number | null
  portion_size: number | null
  punctuality: number | null
  communication_rating: number | null
  presentation: number | null
  cleanup: number | null
  overall: number | null
  what_they_loved: string | null
  what_could_improve: string | null
  would_book_again: boolean | null
  additional_comments: string | null
  dish_feedback: unknown[]
  survey_token: string
  sent_at: string | null
  opened_at: string | null
  completed_at: string | null
  review_request_eligible: boolean
  review_request_sent_at: string | null
  referral_ask_sent_at: string | null
  created_at: string
}

export type SurveyResults = {
  total_surveys: number
  completed_surveys: number
  average_overall: number | null
  average_food_quality: number | null
  average_punctuality: number | null
  average_communication: number | null
  would_book_again_pct: number | null
}

// ==========================================
// QUERIES
// ==========================================

export async function getSurveys(options?: {
  eventId?: string
  completedOnly?: boolean
}): Promise<{
  data: PostEventSurvey[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('post_event_surveys')
    .select('*')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (options?.eventId) {
    query = query.eq('event_id', options.eventId)
  }

  if (options?.completedOnly) {
    query = query.not('completed_at', 'is', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSurveys] Error:', error)
    return { data: null, error: 'Failed to fetch surveys' }
  }

  return { data: data as PostEventSurvey[], error: null }
}

export async function getSurveyResults(): Promise<{
  data: SurveyResults | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: surveys, error } = await supabase
    .from('post_event_surveys')
    .select('overall, food_quality, punctuality, communication_rating, would_book_again, completed_at')
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[getSurveyResults] Error:', error)
    return { data: null, error: 'Failed to fetch survey results' }
  }

  if (!surveys || surveys.length === 0) {
    return {
      data: {
        total_surveys: 0,
        completed_surveys: 0,
        average_overall: null,
        average_food_quality: null,
        average_punctuality: null,
        average_communication: null,
        would_book_again_pct: null,
      },
      error: null,
    }
  }

  const completed = surveys.filter(s => s.completed_at !== null)

  function avg(vals: (number | null)[]): number | null {
    const valid = vals.filter((v): v is number => v !== null)
    if (valid.length === 0) return null
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
  }

  const wouldBookAgain = completed.filter(s => s.would_book_again !== null)
  const wouldBookPct = wouldBookAgain.length > 0
    ? Math.round((wouldBookAgain.filter(s => s.would_book_again).length / wouldBookAgain.length) * 100)
    : null

  return {
    data: {
      total_surveys: surveys.length,
      completed_surveys: completed.length,
      average_overall: avg(completed.map(s => s.overall)),
      average_food_quality: avg(completed.map(s => s.food_quality)),
      average_punctuality: avg(completed.map(s => s.punctuality)),
      average_communication: avg(completed.map(s => s.communication_rating)),
      would_book_again_pct: wouldBookPct,
    },
    error: null,
  }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function createSurvey(input: {
  event_id: string
  client_id: string
}): Promise<{ data: PostEventSurvey | null; error: string | null }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('post_event_surveys')
    .insert({
      event_id: input.event_id,
      tenant_id: user.entityId,
      client_id: input.client_id,
    })
    .select()
    .single()

  if (error) {
    // Unique constraint on event_id means survey already exists
    if (error.code === '23505') {
      return { data: null, error: 'A survey already exists for this event' }
    }
    console.error('[createSurvey] Error:', error)
    return { data: null, error: 'Failed to create survey' }
  }

  revalidatePath(`/events/${input.event_id}`)
  return { data: data as PostEventSurvey, error: null }
}

export async function submitSurveyResponse(
  surveyToken: string,
  input: {
    food_quality?: number
    portion_size?: number
    punctuality?: number
    communication_rating?: number
    presentation?: number
    cleanup?: number
    overall?: number
    what_they_loved?: string
    what_could_improve?: string
    would_book_again?: boolean
    additional_comments?: string
    dish_feedback?: unknown[]
  }
): Promise<{ error: string | null }> {
  // NOTE: This action does NOT require auth since surveys are submitted
  // via token by clients who may not have accounts
  const supabase = createServerClient()

  const updateData: Record<string, unknown> = {
    completed_at: new Date().toISOString(),
  }

  if (input.food_quality !== undefined) updateData.food_quality = input.food_quality
  if (input.portion_size !== undefined) updateData.portion_size = input.portion_size
  if (input.punctuality !== undefined) updateData.punctuality = input.punctuality
  if (input.communication_rating !== undefined) updateData.communication_rating = input.communication_rating
  if (input.presentation !== undefined) updateData.presentation = input.presentation
  if (input.cleanup !== undefined) updateData.cleanup = input.cleanup
  if (input.overall !== undefined) updateData.overall = input.overall
  if (input.what_they_loved !== undefined) updateData.what_they_loved = input.what_they_loved
  if (input.what_could_improve !== undefined) updateData.what_could_improve = input.what_could_improve
  if (input.would_book_again !== undefined) updateData.would_book_again = input.would_book_again
  if (input.additional_comments !== undefined) updateData.additional_comments = input.additional_comments
  if (input.dish_feedback !== undefined) updateData.dish_feedback = input.dish_feedback

  // Check if overall rating qualifies for review request
  if (input.overall && input.overall >= 4) {
    updateData.review_request_eligible = true
  }

  const { error } = await supabase
    .from('post_event_surveys')
    .update(updateData)
    .eq('survey_token', surveyToken)
    .is('completed_at', null)

  if (error) {
    console.error('[submitSurveyResponse] Error:', error)
    return { error: 'Failed to submit survey' }
  }

  return { error: null }
}

export async function requestReview(surveyId: string): Promise<{
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify the survey belongs to this chef and is eligible
  const { data: survey, error: fetchError } = await supabase
    .from('post_event_surveys')
    .select('review_request_eligible, review_request_sent_at, completed_at')
    .eq('id', surveyId)
    .eq('tenant_id', user.entityId)
    .single()

  if (fetchError || !survey) {
    return { error: 'Survey not found' }
  }

  if (!survey.completed_at) {
    return { error: 'Cannot request review for incomplete survey' }
  }

  if (!survey.review_request_eligible) {
    return { error: 'Survey does not qualify for review request' }
  }

  if (survey.review_request_sent_at) {
    return { error: 'Review request already sent' }
  }

  const { error } = await supabase
    .from('post_event_surveys')
    .update({
      review_request_sent_at: new Date().toISOString(),
    })
    .eq('id', surveyId)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[requestReview] Error:', error)
    return { error: 'Failed to send review request' }
  }

  // NOTE: Actual review request email would be sent via the
  // communication pipeline. This records the intent and timestamp.

  revalidatePath('/communication')
  return { error: null }
}

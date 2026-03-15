'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

// ── Get feedback for a specific event ──────────────────────────────
export async function getEventFeedback(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('event_feedback')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[feedback] Failed to get event feedback:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ── Get all feedback with optional filters ─────────────────────────
export async function getAllFeedback(filters?: {
  minRating?: number
  dateRange?: { from: string; to: string }
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('event_feedback')
    .select('*, events(title, event_date), clients(first_name, last_name)')
    .eq('chef_id', user.tenantId!)
    .order('submitted_at', { ascending: false })

  if (filters?.minRating) {
    query = query.gte('overall_rating', filters.minRating)
  }

  if (filters?.dateRange?.from) {
    query = query.gte('submitted_at', filters.dateRange.from)
  }

  if (filters?.dateRange?.to) {
    query = query.lte('submitted_at', filters.dateRange.to)
  }

  const { data, error } = await query

  if (error) {
    console.error('[feedback] Failed to get all feedback:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ── Create a feedback request (generates a token/link) ─────────────
export async function createFeedbackRequest(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify the event belongs to this chef
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, client_id, title')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    return { token: null, error: 'Event not found' }
  }

  // Generate a unique token for the feedback link
  const token = randomUUID()

  // Store the token in event_feedback as a placeholder row
  // The client_id and ratings will be filled when submitted
  const { error: insertError } = await supabase
    .from('event_feedback')
    .upsert(
      {
        chef_id: user.tenantId!,
        event_id: eventId,
        client_id: event.client_id,
        // Token stored in additional_comments temporarily until submitted
        additional_comments: `__token__:${token}`,
      },
      { onConflict: 'event_id,client_id' }
    )

  if (insertError) {
    console.error('[feedback] Failed to create feedback request:', insertError)
    return { token: null, error: insertError.message }
  }

  return {
    token,
    eventTitle: event.title,
    error: null,
  }
}

// ── Submit feedback (public, no auth required) ─────────────────────
export async function submitFeedback(
  token: string,
  data: {
    overallRating: number
    foodRating: number
    serviceRating: number
    communicationRating: number
    favoriteDish?: string
    improvementSuggestions?: string
    wouldRecommend?: boolean
    additionalComments?: string
  }
) {
  const supabase = createServerClient({ admin: true })

  // Find the feedback row by token
  const { data: existing, error: findError } = await supabase
    .from('event_feedback')
    .select('id')
    .like('additional_comments', `__token__:${token}`)
    .single()

  if (findError || !existing) {
    return { success: false, error: 'Invalid or expired feedback link' }
  }

  // Update with actual feedback data
  const { error: updateError } = await supabase
    .from('event_feedback')
    .update({
      overall_rating: data.overallRating,
      food_rating: data.foodRating,
      service_rating: data.serviceRating,
      communication_rating: data.communicationRating,
      favorite_dish: data.favoriteDish || null,
      improvement_suggestions: data.improvementSuggestions || null,
      would_recommend: data.wouldRecommend ?? null,
      additional_comments: data.additionalComments || null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error('[feedback] Failed to submit feedback:', updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true, error: null }
}

// ── Get feedback stats (averages, NPS, response rate) ──────────────
export async function getFeedbackStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all submitted feedback (has a rating)
  const { data: feedback, error } = await supabase
    .from('event_feedback')
    .select('overall_rating, food_rating, service_rating, communication_rating, would_recommend')
    .eq('chef_id', user.tenantId!)
    .not('overall_rating', 'is', null)

  if (error) {
    console.error('[feedback] Failed to get feedback stats:', error)
    return { data: null, error: error.message }
  }

  if (!feedback || feedback.length === 0) {
    return {
      data: {
        totalResponses: 0,
        avgOverall: 0,
        avgFood: 0,
        avgService: 0,
        avgCommunication: 0,
        npsScore: 0,
        responseRate: 0,
      },
      error: null,
    }
  }

  const total = feedback.length

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
  }

  // NPS: % who would recommend minus % who would not
  const recommenders = feedback.filter((f) => f.would_recommend === true).length
  const detractors = feedback.filter((f) => f.would_recommend === false).length
  const npsResponders = feedback.filter((f) => f.would_recommend !== null).length
  const npsScore =
    npsResponders > 0
      ? Math.round(((recommenders - detractors) / npsResponders) * 100)
      : 0

  // Response rate: total feedback with ratings vs total feedback rows (including pending)
  const { count: totalRows } = await supabase
    .from('event_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)

  const responseRate = totalRows && totalRows > 0 ? Math.round((total / totalRows) * 100) : 0

  return {
    data: {
      totalResponses: total,
      avgOverall: Math.round(avg(feedback.map((f) => f.overall_rating)) * 10) / 10,
      avgFood: Math.round(avg(feedback.map((f) => f.food_rating)) * 10) / 10,
      avgService: Math.round(avg(feedback.map((f) => f.service_rating)) * 10) / 10,
      avgCommunication: Math.round(avg(feedback.map((f) => f.communication_rating)) * 10) / 10,
      npsScore,
      responseRate,
    },
    error: null,
  }
}

// ── Toggle public visibility of feedback ───────────────────────────
export async function toggleFeedbackPublic(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get current state
  const { data: current, error: getError } = await supabase
    .from('event_feedback')
    .select('is_public')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (getError || !current) {
    return { success: false, error: 'Feedback not found' }
  }

  const { error: updateError } = await supabase
    .from('event_feedback')
    .update({ is_public: !current.is_public })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (updateError) {
    console.error('[feedback] Failed to toggle public:', updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true, isPublic: !current.is_public, error: null }
}

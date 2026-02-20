'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Send Survey ─────────────────────────────────────────────────────────────

export async function sendClientSurvey(eventId: string): Promise<{ ok: boolean; error?: string }> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to this chef
  const { data: event } = await supabase
    .from('events')
    .select('id, client_id, status, event_date, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', chef.id)
    .single()

  if (!event) return { ok: false, error: 'Event not found' }
  if (event.status !== 'completed') return { ok: false, error: 'Survey can only be sent for completed events' }

  // Upsert survey (one per event — resending updates sent_at)
  const { data: survey, error } = await supabase
    .from('client_satisfaction_surveys')
    .upsert({
      chef_id: chef.id,
      event_id: eventId,
      client_id: event.client_id,
      sent_at: new Date().toISOString(),
    }, {
      onConflict: 'event_id',
      ignoreDuplicates: false,
    })
    .select('token')
    .single()

  if (error || !survey) {
    return { ok: false, error: error?.message ?? 'Failed to create survey' }
  }

  // TODO: Send email to client via Resend with survey link
  // const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/survey/${survey.token}`
  // await sendSurveyEmail({ clientId: event.client_id, chefId: chef.id, surveyUrl, eventDate: event.event_date })

  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

// ─── Public: Get Survey by Token ──────────────────────────────────────────────

export async function getSurveyByToken(token: string) {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('client_satisfaction_surveys')
    .select(`
      id, token, chef_id, event_id, client_id,
      sent_at, responded_at,
      nps_score, overall_rating, food_quality_rating,
      service_rating, value_rating, presentation_rating,
      would_rebook, highlight_text, improvement_text,
      testimonial_text, consent_to_display,
      events(event_date, occasion, guest_count),
      chefs(business_name)
    `)
    .eq('token', token)
    .single()

  return data
}

// ─── Public: Submit Survey Response ──────────────────────────────────────────

interface SurveyResponse {
  token: string
  npsScore: number
  overallRating: number
  foodQualityRating: number
  serviceRating: number
  valueRating: number
  presentationRating: number
  wouldRebook: boolean
  highlightText: string
  improvementText: string
  testimonialText: string
  consentToDisplay: boolean
}

export async function submitSurveyResponse(response: SurveyResponse): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Verify token exists and hasn't been responded to
  const { data: survey } = await supabase
    .from('client_satisfaction_surveys')
    .select('id, responded_at')
    .eq('token', response.token)
    .single()

  if (!survey) return { ok: false, error: 'Survey not found' }
  if (survey.responded_at) return { ok: false, error: 'Survey already completed' }

  const { error } = await supabase
    .from('client_satisfaction_surveys')
    .update({
      responded_at: new Date().toISOString(),
      nps_score: response.npsScore,
      overall_rating: response.overallRating,
      food_quality_rating: response.foodQualityRating,
      service_rating: response.serviceRating,
      value_rating: response.valueRating,
      presentation_rating: response.presentationRating,
      would_rebook: response.wouldRebook,
      highlight_text: response.highlightText || null,
      improvement_text: response.improvementText || null,
      testimonial_text: response.testimonialText || null,
      consent_to_display: response.consentToDisplay,
    })
    .eq('token', response.token)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

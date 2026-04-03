'use server'

import { z } from 'zod'
import type { ChefSurveyRow } from './survey-utils'
import {
  ensurePostEventSurveyForEvent,
  getChefTrustLoopSurveys,
  getPostEventSurveyPageData,
  sendChefManagedPostEventSurvey,
  submitPostEventSurveyResponse,
} from '@/lib/post-event/trust-loop-actions'

// Compatibility wrapper for the legacy event_surveys API surface.
// Canonical post-event trust flow now lives in post_event_surveys and /feedback/[token].

export type SurveyPublic = {
  id: string
  token: string
  submitted_at: string | null
  event: {
    occasion: string | null
    event_date: string | null
  }
  chef: {
    display_name: string | null
    business_name: string
  }
}

export async function createSurveyForEvent(
  eventId: string,
  tenantId: string
): Promise<string | null> {
  return ensurePostEventSurveyForEvent(eventId, tenantId)
}

export async function sendClientSurvey(eventId: string): Promise<{ ok: boolean; error?: string }> {
  return sendChefManagedPostEventSurvey(eventId)
}

export async function getSurveyByToken(token: string): Promise<SurveyPublic | null> {
  const survey = await getPostEventSurveyPageData(token)
  if (!survey) return null

  return {
    id: survey.surveyId,
    token: survey.token,
    submitted_at: survey.completedAt,
    event: {
      occasion: survey.occasion,
      event_date: survey.eventDate,
    },
    chef: {
      display_name: null,
      business_name: survey.chefName,
    },
  }
}

const SurveySubmitSchema = z.object({
  token: z.string().min(1),
  overall_rating: z.number().int().min(1).max(5),
  food_quality_rating: z.number().int().min(1).max(5),
  communication_rating: z.number().int().min(1).max(5),
  value_rating: z.number().int().min(1).max(5),
  would_book_again: z.enum(['yes', 'no', 'maybe']),
  highlight_text: z.string().max(1000).optional(),
  suggestions_text: z.string().max(1000).optional(),
  testimonial_consent: z.boolean(),
})

export type SurveySubmitInput = z.infer<typeof SurveySubmitSchema>

export async function submitSurvey(input: SurveySubmitInput): Promise<{ success: true }> {
  const validated = SurveySubmitSchema.parse(input)
  const result = await submitPostEventSurveyResponse({
    token: validated.token,
    overall: validated.overall_rating,
    food_quality: validated.food_quality_rating,
    communication_rating: validated.communication_rating,
    presentation: validated.value_rating,
    what_they_loved: validated.highlight_text,
    what_could_improve: validated.suggestions_text,
    would_book_again:
      validated.would_book_again === 'yes'
        ? true
        : validated.would_book_again === 'no'
          ? false
          : null,
    public_review_consent: validated.testimonial_consent,
    public_review_text: validated.highlight_text,
  })

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to submit survey')
  }

  return { success: true }
}

// Legacy form wrapper kept for the older client survey component.
export async function submitSurveyResponse(input: {
  token: string
  npsScore: number | null
  overallRating: number
  foodQualityRating: number
  serviceRating: number
  valueRating: number
  presentationRating: number
  wouldRebook: boolean | null
  highlightText: string
  improvementText: string
  testimonialText: string
  consentToDisplay: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fallback = Math.min(5, Math.max(1, input.overallRating))
    const result = await submitPostEventSurveyResponse({
      token: input.token,
      overall: fallback,
      food_quality: Math.min(5, Math.max(1, input.foodQualityRating || fallback)),
      communication_rating: Math.min(5, Math.max(1, input.serviceRating || fallback)),
      presentation: Math.min(5, Math.max(1, input.presentationRating || fallback)),
      what_they_loved: input.highlightText || undefined,
      what_could_improve: input.improvementText || undefined,
      would_book_again: input.wouldRebook,
      public_review_consent: input.consentToDisplay,
      public_review_text: input.testimonialText || input.highlightText || undefined,
    })

    if (!result.success) {
      return { ok: false, error: result.error ?? 'Failed to submit survey' }
    }

    return { ok: true }
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to submit survey' }
  }
}

export async function getChefSurveys(): Promise<ChefSurveyRow[]> {
  return getChefTrustLoopSurveys()
}

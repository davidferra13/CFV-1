'use server'

// Post-Event Survey Actions
// Creates surveys when events complete, handles public submission (no auth),
// and provides chef-facing read access to survey responses.
// Table: event_surveys (migration 20260303000022)

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ChefSurveyRow } from './survey-utils'
import { sendPostEventSurveyEmail } from '@/lib/email/notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

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


// ─── Survey creation (admin client, called from transition hook) ──────────────

/**
 * Creates a survey for a completed event. Idempotent — if a survey already
 * exists for this event, the existing token is returned.
 */
export async function createSurveyForEvent(
  eventId: string,
  tenantId: string
): Promise<string | null> {
  const supabase = createServerClient({ admin: true })

  const { data: existing } = await (supabase as any)
    .from('event_surveys')
    .select('token')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return existing.token

  const { data, error } = await (supabase as any)
    .from('event_surveys')
    .insert({ event_id: eventId, chef_id: tenantId, tenant_id: tenantId })
    .select('token')
    .single()

  if (error) {
    console.error('[createSurveyForEvent]', error)
    return null
  }

  return data.token
}

// ─── sendClientSurvey — chef-triggered survey send ───────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/**
 * Creates (or retrieves) the survey for an event and emails the survey link to the client.
 * Called from the event detail page when the chef clicks "Send Survey".
 */
export async function sendClientSurvey(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event } = await (supabase as any)
    .from('events')
    .select(`
      id, occasion,
      client:clients(full_name, email),
      chef:chefs(business_name, display_name)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { ok: false, error: 'Event not found' }
  if (!event.client?.email) return { ok: false, error: 'Client has no email on file' }

  const token = await createSurveyForEvent(eventId, user.entityId)
  if (!token) return { ok: false, error: 'Could not create survey record' }

  try {
    await sendPostEventSurveyEmail({
      clientEmail: event.client.email,
      clientName: event.client.full_name ?? 'Guest',
      chefName: event.chef?.business_name ?? event.chef?.display_name ?? 'Your chef',
      occasion: event.occasion ?? 'your dinner',
      surveyUrl: `${APP_URL}/survey/${token}`,
    })
    return { ok: true }
  } catch (e: any) {
    console.error('[sendClientSurvey]', e)
    return { ok: false, error: 'Failed to send survey email' }
  }
}

// ─── Public survey retrieval (token-based, no auth) ──────────────────────────

export async function getSurveyByToken(token: string): Promise<SurveyPublic | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await (supabase as any)
    .from('event_surveys')
    .select(`
      id, token, submitted_at,
      event:events(occasion, event_date),
      chef:chefs(display_name, business_name)
    `)
    .eq('token', token)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    token: data.token,
    submitted_at: data.submitted_at ?? null,
    event: {
      occasion: data.event?.occasion ?? null,
      event_date: data.event?.event_date ?? null,
    },
    chef: {
      display_name: data.chef?.display_name ?? null,
      business_name: data.chef?.business_name ?? '',
    },
  }
}

// ─── Survey submission (token-based, no auth) ────────────────────────────────

const SurveySubmitSchema = z.object({
  token: z.string().uuid(),
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
  const supabase = createServerClient({ admin: true })

  const { data: existing, error: fetchError } = await (supabase as any)
    .from('event_surveys')
    .select('id, submitted_at')
    .eq('token', validated.token)
    .single()

  if (fetchError || !existing) throw new Error('Survey not found')
  if (existing.submitted_at) throw new Error('Survey has already been submitted')

  const { error } = await (supabase as any)
    .from('event_surveys')
    .update({
      overall_rating: validated.overall_rating,
      food_quality_rating: validated.food_quality_rating,
      communication_rating: validated.communication_rating,
      value_rating: validated.value_rating,
      would_book_again: validated.would_book_again,
      highlight_text: validated.highlight_text ?? null,
      suggestions_text: validated.suggestions_text ?? null,
      testimonial_consent: validated.testimonial_consent,
      submitted_at: new Date().toISOString(),
    })
    .eq('token', validated.token)

  if (error) {
    console.error('[submitSurvey]', error)
    throw new Error('Failed to submit survey')
  }

  return { success: true }
}

// ─── submitSurveyResponse (form-friendly wrapper) ────────────────────────────
// Maps the client survey form's field names/types to the canonical submitSurvey API.

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
    const fallback = Math.max(1, input.overallRating)
    await submitSurvey({
      token: input.token,
      overall_rating: Math.min(5, Math.max(1, input.overallRating)),
      food_quality_rating: Math.min(5, Math.max(1, input.foodQualityRating || fallback)),
      communication_rating: Math.min(5, Math.max(1, input.serviceRating || fallback)),
      value_rating: Math.min(5, Math.max(1, input.valueRating || fallback)),
      would_book_again: input.wouldRebook === true ? 'yes' : input.wouldRebook === false ? 'no' : 'maybe',
      highlight_text: input.highlightText || undefined,
      suggestions_text: input.improvementText || undefined,
      testimonial_consent: input.consentToDisplay,
    })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'Failed to submit survey' }
  }
}

// ─── Chef-facing survey list ──────────────────────────────────────────────────

export async function getChefSurveys(): Promise<ChefSurveyRow[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('event_surveys')
    .select(`
      id, token, submitted_at, created_at,
      overall_rating, food_quality_rating, communication_rating, value_rating,
      would_book_again, highlight_text, testimonial_consent,
      event:events(id, occasion, event_date, client:clients(full_name))
    `)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefSurveys]', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    token: row.token,
    submitted_at: row.submitted_at ?? null,
    created_at: row.created_at,
    overall_rating: row.overall_rating ?? null,
    food_quality_rating: row.food_quality_rating ?? null,
    communication_rating: row.communication_rating ?? null,
    value_rating: row.value_rating ?? null,
    would_book_again: row.would_book_again ?? null,
    highlight_text: row.highlight_text ?? null,
    testimonial_consent: row.testimonial_consent ?? false,
    event: row.event
      ? {
          id: row.event.id,
          occasion: row.event.occasion ?? null,
          event_date: row.event.event_date ?? null,
          client: row.event.client ? { full_name: row.event.client.full_name } : null,
        }
      : null,
  }))
}


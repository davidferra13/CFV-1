'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendPostEventSurveyEmail } from '@/lib/email/notifications'
import { generateSurveyToken, verifySurveyToken } from '@/lib/feedback/survey-tokens'
import {
  booleanToLegacyWouldBookAgain,
  getReviewRequestGate,
  isPositiveSurveyRating,
  normalizePublicReviewText,
  shouldPromoteSurveyToPublicReview,
} from './trust-loop-helpers'

type SurveyPageDish = {
  id: string
  name: string
  course_name: string | null
}

export type PostEventSurveyPageData = {
  surveyId: string
  token: string
  alreadyCompleted: boolean
  completedAt: string | null
  occasion: string
  eventDate: string | null
  chefName: string
  chefSlug: string | null
  dishes: SurveyPageDish[]
}

export type CanonicalChefSurveyRow = {
  id: string
  event_id: string
  token: string
  sent_at: string | null
  submitted_at: string | null
  created_at: string
  overall_rating: number | null
  food_quality_rating: number | null
  communication_rating: number | null
  value_rating: number | null
  would_book_again: 'yes' | 'no' | null
  highlight_text: string | null
  testimonial_consent: boolean
  review_request_eligible: boolean
  review_request_sent_at: string | null
  public_review_shared: boolean
  event: {
    id: string
    occasion: string | null
    event_date: string | null
    client: { full_name: string } | null
  } | null
}

export type EventTrustLoopState = {
  survey: {
    id: string
    token: string
    sent_at: string | null
    completed_at: string | null
    overall: number | null
    what_they_loved: string | null
    would_book_again: boolean | null
    review_request_eligible: boolean
    review_request_sent_at: string | null
    public_review_shared: boolean
  } | null
}

export type SubmitPostEventSurveyInput = {
  token: string
  food_quality?: number
  portion_size?: number
  punctuality?: number
  communication_rating?: number
  presentation?: number
  cleanup?: number
  overall: number
  what_they_loved?: string
  what_could_improve?: string
  would_book_again?: boolean | null
  additional_comments?: string
  dish_feedback?: unknown[]
  public_review_text?: string
  public_review_consent?: boolean
}

type SurveyIdentity = {
  id: string
  event_id: string
  tenant_id: string
  client_id: string
  survey_token: string
  sent_at: string | null
  opened_at: string | null
  completed_at: string | null
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

async function fetchSurveyIdentityByToken(token: string): Promise<SurveyIdentity | null> {
  const tokenData = verifySurveyToken(token)
  if (!tokenData) return null

  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('post_event_surveys')
    .select('id, event_id, tenant_id, client_id, survey_token, sent_at, opened_at, completed_at')
    .eq('id', tokenData.surveyId)
    .eq('tenant_id', tokenData.tenantId)
    .eq('client_id', tokenData.clientId)
    .maybeSingle()

  if (error || !data) return null
  return data as SurveyIdentity
}

async function markSurveyOpenedIfNeeded(surveyId: string, openedAt: string | null) {
  if (openedAt) return

  const db: any = createServerClient({ admin: true })
  await db
    .from('post_event_surveys')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', surveyId)
    .is('opened_at', null)
}

async function upsertClientReviewFromSurvey(args: {
  survey: SurveyIdentity
  overall: number
  food_quality?: number
  communication_rating?: number
  presentation?: number
  punctuality?: number
  cleanup?: number
  what_they_loved?: string
  what_could_improve?: string
  would_book_again?: boolean | null
  public_review_text?: string
}) {
  const reviewText = normalizePublicReviewText(args.public_review_text, args.what_they_loved)
  if (!reviewText) return

  const db: any = createServerClient({ admin: true })
  const payload = {
    tenant_id: args.survey.tenant_id,
    client_id: args.survey.client_id,
    event_id: args.survey.event_id,
    rating: args.overall,
    feedback_text: reviewText,
    what_they_loved: args.what_they_loved ?? null,
    what_could_improve: args.what_could_improve ?? null,
    display_consent: true,
    food_quality_rating: args.food_quality ?? null,
    presentation_rating: args.presentation ?? null,
    communication_rating: args.communication_rating ?? null,
    punctuality_rating: args.punctuality ?? null,
    cleanup_rating: args.cleanup ?? null,
    would_book_again: args.would_book_again ?? null,
  }

  const { error } = await db.from('client_reviews').upsert(payload, { onConflict: 'event_id' })

  if (error) {
    console.error('[trust-loop] Failed to upsert client review:', error)
  }
}

export async function ensurePostEventSurveyForEvent(
  eventId: string,
  tenantId?: string
): Promise<string | null> {
  const db: any = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('post_event_surveys')
    .select('survey_token')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing?.survey_token) return existing.survey_token

  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, client_id, tenant_id')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError || !event?.client_id) {
    console.error('[trust-loop] Failed to load event for survey creation:', eventError)
    return null
  }

  if (tenantId && event.tenant_id !== tenantId) return null

  const surveyId = crypto.randomUUID()
  const surveyToken = generateSurveyToken(surveyId, event.client_id, event.tenant_id)

  const { error } = await db.from('post_event_surveys').insert({
    id: surveyId,
    event_id: eventId,
    tenant_id: event.tenant_id,
    client_id: event.client_id,
    survey_token: surveyToken,
  })

  if (!error) return surveyToken

  if (error.code === '23505') {
    const { data: conflict } = await db
      .from('post_event_surveys')
      .select('survey_token')
      .eq('event_id', eventId)
      .maybeSingle()

    return conflict?.survey_token ?? null
  }

  console.error('[trust-loop] Failed to create survey:', error)
  return null
}

export async function sendPostEventSurveyForEvent(
  eventId: string,
  tenantId?: string
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const db: any = createServerClient({ admin: true })

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id,
      occasion,
      tenant_id,
      client:clients(id, full_name, email),
      chef:chefs(business_name, display_name)
    `
    )
    .eq('id', eventId)
    .maybeSingle()

  if (eventError || !event) return { ok: false, error: 'Event not found' }
  if (tenantId && event.tenant_id !== tenantId) {
    return { ok: false, error: 'Event does not belong to this chef' }
  }
  if (!event.client?.email || !event.client?.id) {
    return { ok: false, error: 'Client has no email on file' }
  }

  const surveyToken = await ensurePostEventSurveyForEvent(eventId, event.tenant_id)
  if (!surveyToken) return { ok: false, error: 'Could not create survey record' }

  const survey = await fetchSurveyIdentityByToken(surveyToken)
  if (!survey) return { ok: false, error: 'Survey not found' }
  if (survey.sent_at) return { ok: false, error: 'Survey already sent' }

  await sendPostEventSurveyEmail({
    clientEmail: event.client.email,
    clientName: event.client.full_name ?? 'Guest',
    chefName: event.chef?.business_name ?? event.chef?.display_name ?? 'Your chef',
    occasion: event.occasion ?? 'your event',
    surveyUrl: `${APP_URL}/feedback/${surveyToken}`,
  })

  const { error: updateError } = await db
    .from('post_event_surveys')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', survey.id)

  if (updateError) {
    console.error('[trust-loop] Failed to mark survey sent:', updateError)
    return { ok: false, error: 'Failed to mark survey as sent' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/surveys')

  return { ok: true, token: surveyToken }
}

export async function sendChefManagedPostEventSurvey(eventId: string): Promise<{
  ok: boolean
  error?: string
  token?: string
}> {
  const user = await requireChef()
  return sendPostEventSurveyForEvent(eventId, user.entityId)
}

export async function getPostEventSurveyPageData(
  token: string
): Promise<PostEventSurveyPageData | null> {
  const survey = await fetchSurveyIdentityByToken(token)
  if (!survey) return null

  await markSurveyOpenedIfNeeded(survey.id, survey.opened_at)

  const db: any = createServerClient({ admin: true })
  const [{ data: event }, { data: chef }] = await Promise.all([
    db.from('events').select('occasion, event_date, menu_id').eq('id', survey.event_id).single(),
    db.from('chefs').select('business_name, booking_slug').eq('id', survey.tenant_id).single(),
  ])

  let dishes: SurveyPageDish[] = []
  if (event?.menu_id) {
    const { data: menuDishes } = await db
      .from('dishes')
      .select('id, name, course_name')
      .eq('menu_id', event.menu_id)
      .order('course_number', { ascending: true })

    dishes = (menuDishes ?? []).map((dish: any) => ({
      id: dish.id,
      name: dish.name ?? '',
      course_name: dish.course_name ?? null,
    }))
  }

  return {
    surveyId: survey.id,
    token: survey.survey_token,
    alreadyCompleted: Boolean(survey.completed_at),
    completedAt: survey.completed_at,
    occasion: event?.occasion ?? 'your event',
    eventDate: event?.event_date ?? null,
    chefName: chef?.business_name ?? 'Your Chef',
    chefSlug: chef?.booking_slug ?? null,
    dishes,
  }
}

export async function submitPostEventSurveyResponse(
  input: SubmitPostEventSurveyInput
): Promise<{ success: boolean; error?: string }> {
  const survey = await fetchSurveyIdentityByToken(input.token)
  if (!survey) {
    return { success: false, error: 'This survey link is no longer valid.' }
  }

  if (survey.completed_at) {
    return { success: false, error: 'You have already submitted this survey. Thank you!' }
  }

  const db: any = createServerClient({ admin: true })
  const updateData = {
    food_quality: input.food_quality ?? null,
    portion_size: input.portion_size ?? null,
    punctuality: input.punctuality ?? null,
    communication_rating: input.communication_rating ?? null,
    presentation: input.presentation ?? null,
    cleanup: input.cleanup ?? null,
    overall: input.overall,
    what_they_loved: input.what_they_loved?.trim() || null,
    what_could_improve: input.what_could_improve?.trim() || null,
    would_book_again: input.would_book_again ?? null,
    additional_comments: input.additional_comments?.trim() || null,
    dish_feedback: input.dish_feedback ?? [],
    completed_at: new Date().toISOString(),
    review_request_eligible: isPositiveSurveyRating(input.overall),
  }

  const { error } = await db
    .from('post_event_surveys')
    .update(updateData)
    .eq('id', survey.id)
    .is('completed_at', null)

  if (error) {
    console.error('[trust-loop] Failed to submit survey:', error)
    return { success: false, error: 'Failed to save your feedback.' }
  }

  if (
    shouldPromoteSurveyToPublicReview({
      overall: input.overall,
      consent: input.public_review_consent,
      publicReviewText: input.public_review_text,
      fallbackText: input.what_they_loved,
    })
  ) {
    await upsertClientReviewFromSurvey({
      survey,
      overall: input.overall,
      food_quality: input.food_quality,
      communication_rating: input.communication_rating,
      presentation: input.presentation,
      punctuality: input.punctuality,
      cleanup: input.cleanup,
      what_they_loved: input.what_they_loved?.trim(),
      what_could_improve: input.what_could_improve?.trim(),
      would_book_again: input.would_book_again,
      public_review_text:
        normalizePublicReviewText(input.public_review_text, input.what_they_loved) ?? undefined,
    })
  }

  revalidatePath('/surveys')
  revalidatePath(`/events/${survey.event_id}`)

  return { success: true }
}

export async function getChefTrustLoopSurveys(): Promise<CanonicalChefSurveyRow[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: surveys, error } = await db
    .from('post_event_surveys')
    .select(
      'id, event_id, survey_token, sent_at, completed_at, created_at, overall, food_quality, communication_rating, review_request_eligible, review_request_sent_at, what_they_loved, would_book_again'
    )
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[trust-loop] Failed to load chef surveys:', error)
    return []
  }

  const eventIds = (surveys ?? [])
    .map((survey: any) => survey.event_id)
    .filter((eventId: unknown): eventId is string => typeof eventId === 'string')

  const publicReviewEvents = new Set<string>()
  if (eventIds.length > 0) {
    const { data: eventRows, error: eventError } = await db
      .from('events')
      .select('id, occasion, event_date, client_id')
      .in('id', eventIds)
      .eq('tenant_id', user.entityId)

    if (eventError) {
      console.error('[trust-loop] Failed to load survey events:', eventError)
    }

    const clientIds = (eventRows ?? [])
      .map((event: any) => event.client_id)
      .filter((clientId: unknown): clientId is string => typeof clientId === 'string')

    let clientNameById = new Map<string, string>()
    if (clientIds.length > 0) {
      const { data: clientRows, error: clientError } = await db
        .from('clients')
        .select('id, full_name')
        .in('id', clientIds)

      if (clientError) {
        console.error('[trust-loop] Failed to load survey clients:', clientError)
      } else {
        clientNameById = new Map(
          (clientRows ?? []).map((client: any) => [client.id, client.full_name ?? ''])
        )
      }
    }

    const { data: clientReviews } = await db
      .from('client_reviews')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('tenant_id', user.entityId)
      .eq('display_consent', true)

    for (const review of clientReviews ?? []) {
      if (review.event_id) {
        publicReviewEvents.add(review.event_id)
      }
    }

    const eventById = new Map(
      (eventRows ?? []).map((event: any) => [
        event.id,
        {
          id: event.id,
          occasion: event.occasion ?? null,
          event_date: event.event_date ?? null,
          client:
            event.client_id && clientNameById.has(event.client_id)
              ? { full_name: clientNameById.get(event.client_id) ?? '' }
              : null,
        },
      ])
    )

    return (surveys ?? []).map((survey: any) => {
      const publicReviewShared = publicReviewEvents.has(survey.event_id)

      return {
        id: survey.id,
        event_id: survey.event_id,
        token: survey.survey_token,
        sent_at: survey.sent_at ?? null,
        submitted_at: survey.completed_at ?? null,
        created_at: survey.created_at,
        overall_rating: survey.overall ?? null,
        food_quality_rating: survey.food_quality ?? null,
        communication_rating: survey.communication_rating ?? null,
        value_rating: null,
        would_book_again: booleanToLegacyWouldBookAgain(survey.would_book_again),
        highlight_text: survey.what_they_loved ?? null,
        testimonial_consent: publicReviewShared,
        review_request_eligible: Boolean(survey.review_request_eligible),
        review_request_sent_at: survey.review_request_sent_at ?? null,
        public_review_shared: publicReviewShared,
        event: eventById.get(survey.event_id) ?? null,
      }
    })
  }

  return []
}

export async function getEventPostEventSurvey(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('post_event_surveys')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[trust-loop] Failed to load event survey:', error)
    return null
  }

  return data
}

export async function getEventTrustLoopState(eventId: string): Promise<EventTrustLoopState> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: survey, error } = await db
    .from('post_event_surveys')
    .select(
      'id, survey_token, sent_at, completed_at, overall, what_they_loved, would_book_again, review_request_eligible, review_request_sent_at'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[trust-loop] Failed to load event trust-loop survey:', error)
    return { survey: null }
  }

  if (!survey) {
    return { survey: null }
  }

  const { data: publicReview } = await db
    .from('client_reviews')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .eq('display_consent', true)
    .maybeSingle()

  return {
    survey: {
      id: survey.id,
      token: survey.survey_token,
      sent_at: survey.sent_at ?? null,
      completed_at: survey.completed_at ?? null,
      overall: survey.overall ?? null,
      what_they_loved: survey.what_they_loved ?? null,
      would_book_again: survey.would_book_again ?? null,
      review_request_eligible: Boolean(survey.review_request_eligible),
      review_request_sent_at: survey.review_request_sent_at ?? null,
      public_review_shared: Boolean(publicReview?.id),
    },
  }
}

export async function getRecentPostEventSurveys(limit = 10) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('post_event_surveys')
    .select(
      `
      *,
      clients (full_name),
      events (occasion, event_date)
    `
    )
    .eq('tenant_id', user.entityId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[trust-loop] Failed to load recent surveys:', error)
    return []
  }

  return data ?? []
}

export async function markSurveyReviewRequestSent(surveyId: string): Promise<{
  ok: boolean
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: survey, error } = await db
    .from('post_event_surveys')
    .select('completed_at, review_request_eligible, review_request_sent_at')
    .eq('id', surveyId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (error || !survey) {
    return { ok: false, error: 'Survey not found' }
  }

  const gate = getReviewRequestGate({
    completedAt: survey.completed_at,
    reviewRequestEligible: survey.review_request_eligible,
    reviewRequestSentAt: survey.review_request_sent_at,
  })

  if (!gate.ok) {
    const messages: Record<NonNullable<typeof gate.reason>, string> = {
      incomplete: 'Cannot request review for incomplete survey',
      not_eligible: 'Survey does not qualify for review request',
      already_sent: 'Review request already sent',
    }

    return { ok: false, error: messages[gate.reason!] }
  }

  const { error: updateError } = await db
    .from('post_event_surveys')
    .update({ review_request_sent_at: new Date().toISOString() })
    .eq('id', surveyId)
    .eq('tenant_id', user.entityId)

  if (updateError) {
    console.error('[trust-loop] Failed to mark review request sent:', updateError)
    return { ok: false, error: 'Failed to send review request' }
  }

  revalidatePath('/surveys')
  return { ok: true }
}

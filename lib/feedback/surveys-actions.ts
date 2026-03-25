'use server'

import * as crypto from 'crypto'
import { createElement } from 'react'
import { z } from 'zod'
import { generateSurveyToken, verifySurveyToken } from '@/lib/feedback/survey-tokens'
import { createServerClient } from '@/lib/db/server'

export async function createPostEventSurvey(
  eventId: string
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  const db = createServerClient({ admin: true })

  const { data: event } = await db
    .from('events')
    .select('id, client_id, tenant_id, occasion, event_date')
    .eq('id', eventId)
    .single()

  if (!event || !event.client_id) {
    return { success: false, error: 'Event not found or no client.' }
  }

  const { data: existing } = await db
    .from('post_event_surveys')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Survey already exists.' }
  }

  const surveyId = crypto.randomUUID()
  const token = generateSurveyToken(surveyId, event.client_id, event.tenant_id)

  const { error } = await db.from('post_event_surveys').insert({
    id: surveyId,
    event_id: eventId,
    tenant_id: event.tenant_id,
    client_id: event.client_id,
    survey_token: token,
  })

  if (error) {
    console.error('[surveys] Failed to create survey:', error.message)
    return { success: false, error: 'Failed to create survey.' }
  }

  return { success: true, surveyId }
}

export async function sendSurveyEmail(
  surveyId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createServerClient({ admin: true })

  const { data: survey } = await db
    .from('post_event_surveys')
    .select('id, survey_token, event_id, client_id, tenant_id, sent_at')
    .eq('id', surveyId)
    .single()

  if (!survey) return { success: false, error: 'Survey not found.' }
  if (survey.sent_at) return { success: false, error: 'Survey already sent.' }

  const [{ data: client }, { data: chef }, { data: event }] = await Promise.all([
    db.from('clients').select('full_name, email').eq('id', survey.client_id).single(),
    db.from('chefs').select('business_name').eq('id', survey.tenant_id).single(),
    db.from('events').select('occasion, event_date').eq('id', survey.event_id).single(),
  ])

  if (!client?.email) return { success: false, error: 'No client email.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const surveyUrl = `${appUrl}/feedback/${survey.survey_token}`

  try {
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail({
      to: client.email,
      subject: `How was your ${event?.occasion ?? 'event'}, ${client.full_name.split(' ')[0]}?`,
      react: createElement(
        'div',
        null,
        createElement('p', null, `Hi ${client.full_name.split(' ')[0]},`),
        createElement(
          'p',
          null,
          `Thank you for choosing ${chef?.business_name ?? 'us'} for your ${event?.occasion ?? 'event'}! We hope you had a wonderful experience.`
        ),
        createElement('p', null, 'We would love to hear your feedback. It only takes 2 minutes:'),
        createElement('p', null, surveyUrl),
        createElement(
          'p',
          null,
          'Your feedback helps us continue improving and making every event better.'
        ),
        createElement('p', null, `Thank you! ${chef?.business_name ?? 'Your Chef'}`)
      ),
    })
  } catch (error) {
    console.error('[surveys] Email send failed:', error)
    return { success: false, error: 'Failed to send email.' }
  }

  await db
    .from('post_event_surveys')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', surveyId)

  return { success: true }
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

  const tokenData = verifySurveyToken(parsed.data.token)
  if (!tokenData) return { success: false, error: 'This survey link has expired.' }

  const db = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('post_event_surveys')
    .select('id, completed_at')
    .eq('id', tokenData.surveyId)
    .single()

  if (!existing) return { success: false, error: 'Survey not found.' }
  if (existing.completed_at) {
    return { success: false, error: 'You have already submitted this survey. Thank you!' }
  }

  const { error } = await db
    .from('post_event_surveys')
    .update({
      food_quality: parsed.data.food_quality,
      portion_size: parsed.data.portion_size,
      punctuality: parsed.data.punctuality,
      communication_rating: parsed.data.communication_rating,
      presentation: parsed.data.presentation,
      cleanup: parsed.data.cleanup,
      overall: parsed.data.overall,
      what_they_loved: parsed.data.what_they_loved ?? null,
      what_could_improve: parsed.data.what_could_improve ?? null,
      would_book_again: parsed.data.would_book_again,
      additional_comments: parsed.data.additional_comments ?? null,
      dish_feedback: parsed.data.dish_feedback ?? [],
      completed_at: new Date().toISOString(),
      review_request_eligible: parsed.data.overall >= 4,
    })
    .eq('id', tokenData.surveyId)

  if (error) {
    console.error('[surveys] Submit failed:', error.message)
    return { success: false, error: 'Failed to save your feedback.' }
  }

  try {
    await db.from('notifications').insert({
      tenant_id: tokenData.tenantId,
      recipient_id: tokenData.tenantId,
      recipient_role: 'chef',
      client_id: tokenData.clientId,
      title: 'Post-event feedback received',
      body: `A client submitted feedback: ${parsed.data.overall}/5 overall.${parsed.data.would_book_again ? ' They would book again!' : ''}`,
      category: 'system',
      action: 'view_feedback',
      action_url: `/events/${existing.id}`,
    })
  } catch (error) {
    console.error('[surveys] Notification failed (non-blocking):', error)
  }

  return { success: true }
}

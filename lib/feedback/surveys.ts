'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as crypto from 'crypto'

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

const SURVEY_TOKEN_EXPIRY_DAYS = 30

function generateSurveyToken(surveyId: string, clientId: string, tenantId: string): string {
  const payload = {
    sid: surveyId,
    cid: clientId,
    tid: tenantId,
    type: 'survey',
    exp: Date.now() + SURVEY_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
  const json = JSON.stringify(payload)
  const encoded = Buffer.from(json).toString('base64url')
  const secret =
    process.env.SURVEY_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-survey-secret'
  const hmac = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${hmac}`
}

export function verifySurveyToken(
  token: string
): { surveyId: string; clientId: string; tenantId: string } | null {
  try {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return null

    const secret =
      process.env.SURVEY_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-survey-secret'
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url')

    if (signature !== expectedSignature) return null

    const json = Buffer.from(encoded, 'base64url').toString('utf-8')
    const payload = JSON.parse(json)

    if (payload.type !== 'survey') return null
    if (payload.exp < Date.now()) return null

    return { surveyId: payload.sid, clientId: payload.cid, tenantId: payload.tid }
  } catch {
    return null
  }
}

// ==========================================
// CREATE SURVEY (triggered after event completion)
// ==========================================

export async function createPostEventSurvey(
  eventId: string
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  const supabase = createServerClient({ admin: true })

  // Load event
  const { data: event } = await supabase
    .from('events')
    .select('id, client_id, tenant_id, occasion, event_date')
    .eq('id', eventId)
    .single()

  if (!event || !event.client_id) {
    return { success: false, error: 'Event not found or no client.' }
  }

  // Check if survey already exists
  const { data: existing } = await supabase
    .from('post_event_surveys')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Survey already exists.' }
  }

  // Create placeholder survey record
  const surveyId = crypto.randomUUID()
  const token = generateSurveyToken(surveyId, event.client_id, event.tenant_id)

  const { error } = await supabase.from('post_event_surveys').insert({
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

// ==========================================
// SEND SURVEY (email dispatch)
// ==========================================

export async function sendSurveyEmail(
  surveyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient({ admin: true })

  const { data: survey } = await supabase
    .from('post_event_surveys')
    .select('id, survey_token, event_id, client_id, tenant_id, sent_at')
    .eq('id', surveyId)
    .single()

  if (!survey) return { success: false, error: 'Survey not found.' }
  if (survey.sent_at) return { success: false, error: 'Survey already sent.' }

  // Load client and chef
  const [{ data: client }, { data: chef }, { data: event }] = await Promise.all([
    supabase.from('clients').select('full_name, email').eq('id', survey.client_id).single(),
    supabase.from('chefs').select('business_name').eq('id', survey.tenant_id).single(),
    supabase.from('events').select('occasion, event_date').eq('id', survey.event_id).single(),
  ])

  if (!client?.email) return { success: false, error: 'No client email.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const surveyUrl = `${appUrl}/feedback/${survey.survey_token}`

  try {
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail({
      to: client.email,
      subject: `How was your ${event?.occasion ?? 'event'}, ${client.full_name.split(' ')[0]}?`,
      text: `Hi ${client.full_name.split(' ')[0]},

Thank you for choosing ${chef?.business_name ?? 'us'} for your ${event?.occasion ?? 'event'}! We hope you had a wonderful experience.

We would love to hear your feedback. It only takes 2 minutes:

${surveyUrl}

Your feedback helps us continue improving and making every event better.

Thank you!
${chef?.business_name ?? 'Your Chef'}`,
    })
  } catch (err) {
    console.error('[surveys] Email send failed:', err)
    return { success: false, error: 'Failed to send email.' }
  }

  await supabase
    .from('post_event_surveys')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', surveyId)

  return { success: true }
}

// ==========================================
// SUBMIT SURVEY RESPONSE (public, token-authed)
// ==========================================

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

  const supabase = createServerClient({ admin: true })

  // Check if already completed
  const { data: existing } = await supabase
    .from('post_event_surveys')
    .select('id, completed_at')
    .eq('id', tokenData.surveyId)
    .single()

  if (!existing) return { success: false, error: 'Survey not found.' }
  if (existing.completed_at)
    return { success: false, error: 'You have already submitted this survey. Thank you!' }

  // Save response
  const { error } = await supabase
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

  // Notify chef (non-blocking side effect)
  try {
    await supabase.from('notifications').insert({
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
  } catch (err) {
    console.error('[surveys] Notification failed (non-blocking):', err)
  }

  return { success: true }
}

// ==========================================
// GET SURVEY DATA (for form pre-population)
// ==========================================

export async function getSurveyData(token: string) {
  const tokenData = verifySurveyToken(token)
  if (!tokenData) return null

  const supabase = createServerClient({ admin: true })

  const { data: survey } = await supabase
    .from('post_event_surveys')
    .select('id, event_id, completed_at')
    .eq('id', tokenData.surveyId)
    .single()

  if (!survey) return null

  // Load event details
  const { data: event } = await supabase
    .from('events')
    .select('occasion, event_date, menu_id')
    .eq('id', survey.event_id)
    .single()

  // Load chef name
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tokenData.tenantId)
    .single()

  // Load menu dishes for dish-level feedback
  let dishes: { id: string; name: string; course_name: string | null }[] = []
  if (event?.menu_id) {
    const { data: menuDishes } = await supabase
      .from('dishes')
      .select('id, name, course_name')
      .eq('menu_id', event.menu_id)
      .order('course_number', { ascending: true })

    dishes = menuDishes ?? []
  }

  return {
    surveyId: survey.id,
    alreadyCompleted: !!survey.completed_at,
    occasion: event?.occasion ?? 'your event',
    eventDate: event?.event_date ?? null,
    chefName: chef?.business_name ?? 'Your Chef',
    dishes,
  }
}

// ==========================================
// CHEF-SIDE: GET FEEDBACK FOR EVENT
// ==========================================

export async function getEventFeedback(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('post_event_surveys')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[surveys] Load failed:', error.message)
    return null
  }

  return data
}

// ==========================================
// CHEF-SIDE: GET ALL FEEDBACK (dashboard)
// ==========================================

export async function getRecentFeedback(limit = 10) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
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
    console.error('[surveys] Recent feedback load failed:', error.message)
    return []
  }

  return data ?? []
}

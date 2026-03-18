'use server'

// Communication Draft Generators - 10 Queue-Powered Templates
// PRIVACY: All drafts contain client PII → must stay local via Ollama.
// ALL drafts are tier 2 (approval required) - never auto-sent.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { withAiFallback } from '@/lib/ai/with-ai-fallback'
import {
  thankYouTemplate,
  referralRequestTemplate,
  testimonialRequestTemplate,
  quoteCoverLetterTemplate,
  declineResponseTemplate,
  cancellationResponseTemplate,
  paymentReminderTemplate,
  reEngagementTemplate,
  milestoneRecognitionTemplate,
  foodSafetyIncidentTemplate,
} from '@/lib/templates/email-drafts'
import type { TemplateVars } from '@/lib/templates/email-drafts'

// ============================================
// SHARED TYPES
// ============================================

export interface DraftResult {
  subject: string
  draftText: string
  clientId?: string
  clientName?: string
  eventId?: string
  _aiSource?: 'formula' | 'ai'
}

const EmailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
})

// ============================================
// SHARED HELPERS
// ============================================

async function loadClient(supabase: any, clientId: string, tenantId: string) {
  const { data } = await supabase
    .from('clients')
    .select('id, full_name, email, vibe_notes, dietary_restrictions, allergies')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()
  return data
}

async function findClientByName(supabase: any, name: string, tenantId: string) {
  // Strip common suffixes that users add but aren't in the DB name
  const cleanName = name
    .replace(/['\u2019]s\s*$/i, '')
    .replace(/\s+(?:family|account|household|group)$/i, '')
    .trim()

  const { data } = await supabase
    .from('clients')
    .select('id, full_name, email, vibe_notes, dietary_restrictions, allergies')
    .eq('tenant_id', tenantId)
    .ilike('full_name', `%${cleanName}%`)
    .limit(1)
  return data?.[0] ?? null
}

async function loadLastEvent(supabase: any, clientId: string, tenantId: string) {
  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, status, location')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function loadEvent(supabase: any, eventId: string, tenantId: string) {
  const { data } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, location, client_id, client:clients(full_name, email)'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
  return data
}

async function loadChefName(supabase: any, tenantId: string): Promise<string> {
  const { data } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', tenantId)
    .single()
  return data?.full_name ?? data?.business_name ?? 'Chef'
}

function firstName(fullName: string | null | undefined): string {
  return fullName?.split(' ')[0] ?? 'there'
}

function formatDraft(subject: string, body: string): string {
  return `Subject: ${subject}\n\n${body}`
}

// ============================================
// 1. THANK-YOU NOTE
// ============================================

export async function generateThankYouDraft(
  clientName: string,
  eventHint?: string
): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  if (!client) throw new Error(`No client found matching "${clientName}".`)

  // If an event hint is provided (e.g. "anniversary"), try to find a matching event by occasion
  let event: Record<string, unknown> | null = null
  if (eventHint) {
    const { data } = await supabase
      .from('events')
      .select('id, occasion, event_date, guest_count, status, location')
      .eq('client_id', client.id)
      .eq('tenant_id', tenantId)
      .ilike('occasion', `%${eventHint}%`)
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    event = data
  }
  // Fall back to most recent event if no hint or no match
  if (!event) {
    event = await loadLastEvent(supabase, client.id, tenantId)
  }

  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: client.full_name,
    clientFirstName: firstName(client.full_name),
    chefName,
    occasion: (event as any)?.occasion,
    eventDate: (event as any)?.event_date,
    guestCount: (event as any)?.guest_count,
  }

  // Build the event description explicitly - avoid Ollama confusing event types from vibe_notes
  const eventOccasion = (event as any)?.occasion ?? 'recent event'

  const { result, source } = await withAiFallback(
    () => thankYouTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a heartfelt thank-you note to a client after an event. First person singular "I". Warm, genuine, not generic. Reference specific details about their event. Keep it 3-4 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a thank-you note for:\nClient: ${client.full_name} (first name: ${firstName(client.full_name)})\nEvent: ${eventOccasion} on ${(event as any)?.event_date ?? 'N/A'}\nIMPORTANT: This is a "${eventOccasion}" - do NOT confuse with other event types.\nGuests: ${(event as any)?.guest_count ?? 'N/A'}\nLocation: ${(event as any)?.location ?? 'N/A'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client.id,
    clientName: client.full_name,
    eventId: (event as any)?.id,
    _aiSource: source,
  }
}

// ============================================
// 2. REFERRAL REQUEST
// ============================================

export async function generateReferralRequestDraft(clientName: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  if (!client) throw new Error(`No client found matching "${clientName}".`)

  const lastEvent = await loadLastEvent(supabase, client.id, tenantId)
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: client.full_name,
    clientFirstName: firstName(client.full_name),
    chefName,
    occasion: lastEvent?.occasion,
  }

  const { result, source } = await withAiFallback(
    () => referralRequestTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a warm, non-pushy referral request to a loyal client. First person singular "I". Express gratitude first, then casually ask if they know anyone who might enjoy your services. Keep it friendly and 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a referral request for:\nClient: ${client.full_name} (first name: ${firstName(client.full_name)})\nLast event: ${lastEvent?.occasion ?? 'recent event'} on ${lastEvent?.event_date ?? 'N/A'}\nClient notes: ${client.vibe_notes ?? 'none'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client.id,
    clientName: client.full_name,
    _aiSource: source,
  }
}

// ============================================
// 3. TESTIMONIAL REQUEST
// ============================================

export async function generateTestimonialRequestDraft(clientName: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  if (!client) throw new Error(`No client found matching "${clientName}".`)

  const lastEvent = await loadLastEvent(supabase, client.id, tenantId)
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: client.full_name,
    clientFirstName: firstName(client.full_name),
    chefName,
    occasion: lastEvent?.occasion,
    eventDate: lastEvent?.event_date,
  }

  const { result, source } = await withAiFallback(
    () => testimonialRequestTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a friendly testimonial request to a client who recently had a great experience. First person singular "I". Express gratitude, mention why their feedback matters, and make it easy to say yes (short review, Google, or a quote you can share). 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a testimonial request for:
Client: ${client.full_name} (first name: ${firstName(client.full_name)})
Last event: ${lastEvent?.occasion ?? 'recent event'} on ${lastEvent?.event_date ?? 'N/A'}
Guests: ${lastEvent?.guest_count ?? 'N/A'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client.id,
    clientName: client.full_name,
    _aiSource: source,
  }
}

// ============================================
// 4. QUOTE COVER LETTER
// ============================================

export async function generateQuoteCoverLetterDraft(eventIdOrName: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Try by ID first, then by name search
  let event = await loadEvent(supabase, eventIdOrName, tenantId)
  if (!event) {
    const { data: events } = await supabase
      .from('events')
      .select(
        'id, occasion, event_date, guest_count, status, location, client_id, client:clients(full_name, email)'
      )
      .eq('tenant_id', tenantId)
      .ilike('occasion', `%${eventIdOrName}%`)
      .limit(1)
    event = events?.[0] ?? null
  }
  if (!event) throw new Error(`No event found matching "${eventIdOrName}".`)

  const clientName = (event as any).client?.full_name ?? 'Client'
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName,
    clientFirstName: firstName(clientName),
    chefName,
    occasion: (event as any).occasion,
    eventDate: (event as any).event_date,
    guestCount: (event as any).guest_count,
  }

  const { result, source } = await withAiFallback(
    () => quoteCoverLetterTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a professional yet warm cover letter to accompany a quote/proposal. First person singular "I". Thank them for considering you, highlight your excitement about the event, and set expectations for what's included in the quote. 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a quote cover letter for:
Client: ${clientName} (first name: ${firstName(clientName)})
Event: ${(event as any).occasion ?? 'upcoming event'} on ${(event as any).event_date ?? 'TBD'}
Guests: ${(event as any).guest_count ?? 'TBD'}
Location: ${(event as any).location ?? 'TBD'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: (event as any).client_id,
    clientName,
    eventId: event.id,
    _aiSource: source,
  }
}

// ============================================
// 5. DECLINE RESPONSE
// ============================================

export async function generateDeclineResponseDraft(
  clientName: string,
  reason?: string
): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  const resolvedName = client?.full_name ?? clientName
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: resolvedName,
    clientFirstName: firstName(resolvedName),
    chefName,
    declineReason: reason,
  }

  const { result, source } = await withAiFallback(
    () => declineResponseTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a gracious decline to a potential booking. First person singular "I". Be warm and empathetic - express genuine regret, briefly explain if appropriate, and leave the door open for future opportunities. Suggest alternatives if possible. 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a decline response for:
Client: ${resolvedName} (first name: ${firstName(resolvedName)})
Reason for declining: ${reason ?? 'scheduling conflict'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client?.id,
    clientName: resolvedName,
    _aiSource: source,
  }
}

// ============================================
// 6. CANCELLATION RESPONSE
// ============================================

export async function generateCancellationResponseDraft(
  eventIdOrName: string
): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  let event = await loadEvent(supabase, eventIdOrName, tenantId)
  if (!event) {
    const { data: events } = await supabase
      .from('events')
      .select(
        'id, occasion, event_date, guest_count, status, location, client_id, client:clients(full_name, email)'
      )
      .eq('tenant_id', tenantId)
      .ilike('occasion', `%${eventIdOrName}%`)
      .limit(1)
    event = events?.[0] ?? null
  }
  if (!event) throw new Error(`No event found matching "${eventIdOrName}".`)

  const clientName = (event as any).client?.full_name ?? 'Client'
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName,
    clientFirstName: firstName(clientName),
    chefName,
    occasion: (event as any).occasion,
    eventDate: (event as any).event_date,
  }

  const { result, source } = await withAiFallback(
    () => cancellationResponseTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing an empathetic response to a client who cancelled their event. First person singular "I". Express understanding (never guilt), handle any refund/policy details professionally, and warmly invite them to rebook when ready. 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a cancellation response for:
Client: ${clientName} (first name: ${firstName(clientName)})
Event: ${(event as any).occasion ?? 'event'} originally on ${(event as any).event_date ?? 'N/A'}
Event status: ${(event as any).status ?? 'cancelled'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: (event as any).client_id,
    clientName,
    eventId: event.id,
    _aiSource: source,
  }
}

// ============================================
// 7. PAYMENT REMINDER
// ============================================

export async function generatePaymentReminderDraft(clientName: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  if (!client) throw new Error(`No client found matching "${clientName}".`)

  // Find events with outstanding balance
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status')
    .eq('client_id', client.id)
    .eq('tenant_id', tenantId)
    .in('status', ['accepted', 'confirmed', 'completed'])
    .order('event_date', { ascending: false })
    .limit(1)

  const lastEvent = events?.[0]
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: client.full_name,
    clientFirstName: firstName(client.full_name),
    chefName,
    occasion: lastEvent?.occasion,
    eventDate: lastEvent?.event_date,
  }

  const { result, source } = await withAiFallback(
    () => paymentReminderTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a friendly payment reminder. First person singular "I". Be warm and professional - never threatening or aggressive. Gently reference the event and the outstanding amount. Offer to help if there are any questions. 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a payment reminder for:
Client: ${client.full_name} (first name: ${firstName(client.full_name)})
Event: ${lastEvent?.occasion ?? 'recent event'} on ${lastEvent?.event_date ?? 'N/A'}
Status: ${lastEvent?.status ?? 'N/A'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client.id,
    clientName: client.full_name,
    eventId: lastEvent?.id,
    _aiSource: source,
  }
}

// ============================================
// 8. CLIENT RE-ENGAGEMENT
// ============================================

export async function generateReEngagementDraft(clientName: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  if (!client) throw new Error(`No client found matching "${clientName}".`)

  const lastEvent = await loadLastEvent(supabase, client.id, tenantId)
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: client.full_name,
    clientFirstName: firstName(client.full_name),
    chefName,
    occasion: lastEvent?.occasion,
    eventDate: lastEvent?.event_date,
  }

  const { result, source } = await withAiFallback(
    () => reEngagementTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef reaching out to a client you haven't heard from in a while. First person singular "I". Be warm and casual - not salesy. Reference your history together, mention something seasonal or exciting you're doing, and invite them to reconnect. 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a re-engagement email for:
Client: ${client.full_name} (first name: ${firstName(client.full_name)})
Last event: ${lastEvent?.occasion ?? 'N/A'} on ${lastEvent?.event_date ?? 'a while ago'}
Client notes: ${client.vibe_notes ?? 'none'}
Preferences: ${(client.dietary_restrictions as string[] | null)?.join(', ') ?? 'none noted'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client.id,
    clientName: client.full_name,
    _aiSource: source,
  }
}

// ============================================
// 9. MILESTONE RECOGNITION
// ============================================

export async function generateMilestoneRecognitionDraft(
  clientName: string,
  milestone?: string
): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const client = await findClientByName(supabase, clientName, tenantId)
  if (!client) throw new Error(`No client found matching "${clientName}".`)

  // Count events for this client
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id)
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')

  const chefName = await loadChefName(supabase, tenantId)
  const detectedMilestone =
    milestone ??
    (count && count >= 10
      ? `${count}th event together`
      : count && count >= 5
        ? `${count}th event together`
        : 'being a valued client')

  const templateVars: TemplateVars = {
    clientName: client.full_name,
    clientFirstName: firstName(client.full_name),
    chefName,
    milestone: detectedMilestone,
  }

  const { result, source } = await withAiFallback(
    () => milestoneRecognitionTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef celebrating a milestone with a loyal client. First person singular "I". Express genuine gratitude and excitement. Make them feel special and valued. Reference the milestone specifically. 2-3 short paragraphs. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a milestone recognition email for:
Client: ${client.full_name} (first name: ${firstName(client.full_name)})
Milestone: ${detectedMilestone}
Total events together: ${count ?? 'unknown'}
Client notes: ${client.vibe_notes ?? 'none'}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 800 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    clientId: client.id,
    clientName: client.full_name,
    _aiSource: source,
  }
}

// ============================================
// 10. FOOD SAFETY INCIDENT REPORT
// ============================================

export async function generateFoodSafetyIncidentDraft(description: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!
  const chefName = await loadChefName(supabase, tenantId)

  const templateVars: TemplateVars = {
    clientName: 'Internal',
    clientFirstName: 'Team',
    chefName,
    incidentDescription: description,
  }

  const { result, source } = await withAiFallback(
    () => foodSafetyIncidentTemplate(templateVars),
    () =>
      parseWithOllama(
        `You are ${chefName}, a private chef writing a formal food safety incident report. First person singular "I". Be factual, thorough, and professional. Include: what happened, when, what immediate action was taken, who was affected, what corrective action will be implemented. This is for internal records and potentially insurance/regulatory purposes. Keep it structured and clear. Return JSON: { "subject": "...", "body": "..." }`,
        `Write a food safety incident report for:
Incident description: ${description}
Date: ${new Date().toISOString().split('T')[0]}`,
        EmailDraftSchema,
        { modelTier: 'standard', maxTokens: 1024 }
      )
  )

  return {
    subject: result.subject,
    draftText: formatDraft(result.subject, result.body),
    _aiSource: source,
  }
}

// ============================================
// 11. BOOKING CONFIRMATION
// ============================================

export async function generateConfirmationDraft(eventIdOrClientName: string): Promise<DraftResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!
  const chefName = await loadChefName(supabase, tenantId)

  // Try to find by event ID first, then by client name
  let event: any = null
  let client: any = null

  if (eventIdOrClientName.match(/^[0-9a-f-]{36}$/i)) {
    event = await loadEvent(supabase, eventIdOrClientName, tenantId)
    if (event?.client) client = event.client
  }

  if (!event) {
    client = await findClientByName(supabase, eventIdOrClientName, tenantId)
    if (client) {
      event = await loadLastEvent(supabase, client.id, tenantId)
    }
  }

  const clientName = client?.full_name ?? eventIdOrClientName
  const occasion = event?.occasion ?? 'your upcoming event'
  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBD'
  const guestCount = event?.guest_count ?? 'TBD'

  const subject = `Booking Confirmed - ${occasion}`
  const body = `Hi ${firstName(clientName)},

Great news - your booking is confirmed! Here are the details:

Event: ${occasion}
Date: ${eventDate}
Guests: ${guestCount}

I'll be in touch soon with next steps on the menu and logistics. If you have any questions or changes in the meantime, don't hesitate to reach out.

Looking forward to it!

Best,
${chefName}`

  return {
    subject,
    draftText: formatDraft(subject, body),
    clientId: client?.id,
    clientName,
    eventId: event?.id,
    _aiSource: 'formula',
  }
}

// ============================================
// QUEUE HANDLER ADAPTER
// ============================================
// These functions adapt the above generators for the queue worker.
// The worker calls handler(payload, tenantId) - these bridge that to
// the server-action-style functions above.

export async function handleDraftTask(
  taskType: string,
  payload: Record<string, unknown>
): Promise<DraftResult> {
  const clientName = String(payload.clientName ?? payload.client_name ?? '')
  const eventId = String(payload.eventId ?? payload.event_id ?? '')
  const description = String(payload.description ?? '')
  const reason = payload.reason ? String(payload.reason) : undefined
  const milestone = payload.milestone ? String(payload.milestone) : undefined

  const eventHint = payload.eventName ? String(payload.eventName) : undefined

  switch (taskType) {
    case 'draft.thank_you':
      return generateThankYouDraft(clientName, eventHint)
    case 'draft.referral_request':
      return generateReferralRequestDraft(clientName)
    case 'draft.testimonial_request':
      return generateTestimonialRequestDraft(clientName)
    case 'draft.quote_cover_letter':
      return generateQuoteCoverLetterDraft(eventId || clientName)
    case 'draft.decline_response':
      return generateDeclineResponseDraft(clientName, reason)
    case 'draft.cancellation_response':
      return generateCancellationResponseDraft(eventId || clientName)
    case 'draft.payment_reminder':
      return generatePaymentReminderDraft(clientName)
    case 'draft.re_engagement':
      return generateReEngagementDraft(clientName)
    case 'draft.milestone_recognition':
      return generateMilestoneRecognitionDraft(clientName, milestone)
    case 'draft.food_safety_incident':
      return generateFoodSafetyIncidentDraft(description)
    case 'draft.confirmation':
      return generateConfirmationDraft(eventId || clientName)
    default:
      throw new Error(`Unknown draft task type: ${taskType}`)
  }
}

'use server'

// Campaign Outreach AI
//
// Two routing paths:
//   1. draftCampaignConcept() → OLLAMA (public marketing copy, no PII)
//      Writes the dinner's public-facing pitch (hook, description, CTA).
//
//   2. draftPersonalizedOutreach() → OLLAMA (private data)
//      Writes a 1:1 personalised invite for a specific recipient.
//      Uses client name, past event history, dietary prefs - all private.
//      Stores the draft directly in campaign_recipients.
//      Throws OllamaOfflineError if Ollama is offline.
//
//   3. generateAllDrafts() → batches over all recipients for a campaign.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { format } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import type {
  CampaignConceptDraft,
  GenerateAllResult,
  PersonalizedDraft,
} from './campaign-outreach-types'

// ============================================================
// 1. OLLAMA - CAMPAIGN CONCEPT COPY (no client PII)
// ============================================================

const CampaignConceptSchema = z.object({
  hook: z.string(),
  description: z.string(),
  callToAction: z.string(),
})

export async function draftCampaignConcept(input: {
  occasion: string
  proposed_date?: string // ISO date YYYY-MM-DD
  price_per_person_cents?: number
  guest_count_max?: number
  chef_name: string
  menu_name?: string
}): Promise<CampaignConceptDraft> {
  const priceDisplay = input.price_per_person_cents
    ? `$${Math.round(input.price_per_person_cents / 100)} per person`
    : 'pricing available on request'

  const dateDisplay = input.proposed_date
    ? format(new Date(input.proposed_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : 'a date to be announced'

  const prompt = `You are writing promotional copy for a private chef's exclusive dinner invitation.
The tone should be warm, refined, and exciting - like an invitation from a friend who happens to be a brilliant chef.
Not salesy. Not corporate. Personal and genuine.

Chef: ${input.chef_name}
Occasion/theme: ${input.occasion}
Date: ${dateDisplay}
Max guests: ${input.guest_count_max ?? 'intimate'}
Pricing: ${priceDisplay}
${input.menu_name ? `Menu: ${input.menu_name}` : ''}

Write the following sections:
- "hook": A single arresting sentence to open the invitation. Should feel personal, vivid, and evocative.
- "description": 2-3 sentences describing what makes this dinner special. Mention the occasion, intimacy, exclusivity. No clichés.
- "callToAction": One sentence. Low-pressure. Invites the reader to claim their spot or learn more.

Rules:
- No exclamation points in the hook
- No "Are you ready to..." or "Join us for..."
- No emoji
- Keep total word count under 80 words across all three fields

Return ONLY valid JSON: { "hook": "...", "description": "...", "callToAction": "..." }`

  const validated = await parseWithOllama(
    'You are writing promotional copy for a private chef\'s exclusive dinner invitation. The tone should be warm, refined, and exciting. Not salesy. Not corporate. Personal and genuine. No exclamation points in the hook. No "Are you ready to..." or "Join us for...". No emoji. Keep total word count under 80 words across all three fields.',
    prompt,
    CampaignConceptSchema,
    { temperature: 0.75, maxTokens: 512 }
  )
  return { ...validated, generatedAt: new Date().toISOString() }
}

// ============================================================
// 2. OLLAMA - PERSONALIZED OUTREACH (private data - stays local)
// ============================================================

const OutreachSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(10),
})

type ClientOutreachProfile = {
  full_name: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  vibe_notes: string | null
  last_event_date: string | null
  favorite_cuisines: string[] | null
  dislikes: string[] | null
}

type PastClientEvent = {
  occasion: string | null
  event_date: string
  service_style: string | null
  guest_count: number | null
}

type CampaignRecipientContext = {
  id: string
  client_id: string | null
  campaign_id: string
  email: string
}

function cleanList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
}

function buildPreferenceLines(client: ClientOutreachProfile): string[] {
  const lines: string[] = []
  const dietary = cleanList(client.dietary_restrictions)
  const allergies = cleanList(client.allergies)
  const favorites = cleanList(client.favorite_cuisines)
  const dislikes = cleanList(client.dislikes)

  if (dietary.length) lines.push(`Known dietary preferences: ${dietary.join(', ')}`)
  if (allergies.length) lines.push(`Known allergies to respect: ${allergies.join(', ')}`)
  if (favorites.length) lines.push(`Favorite cuisines: ${favorites.join(', ')}`)
  if (dislikes.length) lines.push(`Known dislikes: ${dislikes.join(', ')}`)
  if (client.vibe_notes) lines.push(`Relationship notes: ${client.vibe_notes}`)

  return lines.length ? lines : ['No recorded preferences for this recipient.']
}

function buildPastEventLines(events: PastClientEvent[]): string[] {
  if (!events.length) return ['No recorded past events with this client.']

  return events.map((event, index) => {
    const parts = [
      event.occasion || 'private event',
      `on ${event.event_date}`,
      event.service_style ? `style: ${event.service_style}` : '',
      event.guest_count ? `${event.guest_count} guests` : '',
    ].filter(Boolean)

    return `Past event ${index + 1}: ${parts.join(', ')}`
  })
}

/**
 * Drafts a personalised email invite for a single campaign recipient.
 * Fetches client PII + history from DB, sends to LOCAL Ollama only.
 * Stores the draft in campaign_recipients.draft_subject / draft_body.
 *
 * Throws OllamaOfflineError if Ollama is not running - caller re-throws.
 */
export async function draftPersonalizedOutreach(recipientId: string): Promise<PersonalizedDraft> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // 1. Load recipient → client → campaign
  const { data: recipient } = await db
    .from('campaign_recipients')
    .select('id, client_id, campaign_id, email')
    .eq('id', recipientId)
    .eq('chef_id', chef.entityId)
    .single()

  if (!recipient) throw new Error('Recipient not found')
  const recipientContext = recipient as CampaignRecipientContext

  const [campaignResult, chefResult] = await Promise.all([
    db
      .from('marketing_campaigns')
      .select(
        'name, occasion, proposed_date, proposed_time, price_per_person_cents, concept_description, guest_count_max'
      )
      .eq('id', recipientContext.campaign_id)
      .eq('chef_id', chef.entityId)
      .single(),
    db.from('chefs').select('full_name, business_name').eq('id', chef.entityId).single(),
  ])

  const campaign = campaignResult.data
  const chefData = chefResult.data

  if (!campaign) throw new Error('Data not found')

  let client: ClientOutreachProfile | null = null
  if (recipientContext.client_id) {
    const { data: clientData, error: clientError } = await db
      .from('clients')
      .select(
        'full_name, dietary_restrictions, allergies, vibe_notes, last_event_date, favorite_cuisines, dislikes'
      )
      .eq('id', recipientContext.client_id)
      .eq('tenant_id', chef.tenantId!)
      .maybeSingle()

    if (clientError) {
      console.warn('[campaign-outreach] Failed to load client profile', {
        recipientId,
        clientId: recipientContext.client_id,
        error: clientError.message,
      })
    }
    client = clientData as ClientOutreachProfile | null
  }

  // Fetch recent real event history for context.
  const { data: pastEvents } = recipientContext.client_id
    ? await db
        .from('events')
        .select('occasion, event_date, service_style, guest_count')
        .eq('tenant_id', chef.tenantId!)
        .eq('client_id', recipientContext.client_id)
        .not('status', 'in', '("cancelled","draft")')
        .order('event_date', { ascending: false })
        .limit(3)
    : { data: [] }

  const emailName = recipientContext.email.split('@')[0]?.replace(/[._-]+/g, ' ')
  const clientFirstName = (client?.full_name ?? '').split(' ')[0] || emailName || 'there'
  const chefName = chefData?.full_name ?? 'Your Chef'
  const priceDisplay = campaign.price_per_person_cents
    ? `$${Math.round(campaign.price_per_person_cents / 100)} per person`
    : null

  const dateDisplay = campaign.proposed_date
    ? format(
        new Date(dateToDateString(campaign.proposed_date as Date | string) + 'T12:00:00'),
        'EEEE, MMMM d'
      )
    : null

  const systemPrompt = `You are a private chef writing a warm, personal dinner invitation to one of your long-term clients.
You know this client well. The message should feel like a personal note from a friend, not a mass email.
Write in first person. One short paragraph or two at most. 120-160 words maximum.
End with a natural sign-off - just your first name, nothing formal.
No exclamation points. No "I hope this email finds you well." No bullet points.
Use only the history and preferences supplied. If details are missing, stay general instead of inventing them.
Return ONLY valid JSON: { "subject": "...", "body": "..." }`

  const userContent = [
    `Chef name: ${chefName}`,
    `Client first name: ${clientFirstName}`,
    '',
    `CLIENT HISTORY:`,
    ...buildPastEventLines((pastEvents ?? []) as PastClientEvent[]),
    '',
    `CLIENT PREFERENCES:`,
    ...(client ? buildPreferenceLines(client) : ['No recorded preferences for this recipient.']),
    '',
    `DINNER DETAILS:`,
    `Name: ${campaign.name}`,
    `Occasion: ${campaign.occasion}`,
    dateDisplay ? `Date: ${dateDisplay}` : '',
    priceDisplay ? `Price: ${priceDisplay}` : '',
    campaign.guest_count_max ? `Max guests: ${campaign.guest_count_max}` : '',
    campaign.concept_description ? `Description: ${campaign.concept_description}` : '',
    '',
    'Write a subject line and personal email body inviting this specific client to this dinner.',
    'Reference one past event only if it is useful. Use dietary and preference details as quiet care, not as a checklist.',
    campaign.guest_count_max
      ? `Make the invitation feel genuinely limited without pressure. There are only ${campaign.guest_count_max} seats.`
      : 'Make the invitation feel considered and personal without pretending there is a hard seat limit.',
    'Do NOT say "I am writing to invite you" - just dive in naturally.',
  ]
    .filter(Boolean)
    .join('\n')

  let draft: PersonalizedDraft
  try {
    draft = await parseWithOllama(systemPrompt, userContent, OutreachSchema)
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    throw new OllamaOfflineError(
      `Outreach draft failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  // Store draft in campaign_recipients
  const { error: updateError } = await db
    .from('campaign_recipients')
    .update({ draft_subject: draft.subject, draft_body: draft.body })
    .eq('id', recipientId)
    .eq('chef_id', chef.entityId)

  if (updateError) {
    console.error('[campaign-outreach] Failed to store outreach draft', updateError)
    throw new Error('Failed to store outreach draft')
  }

  return draft
}

// ============================================================
// 3. GENERATE ALL DRAFTS (batches over all recipients)
// ============================================================

export async function generateAllDrafts(campaignId: string): Promise<GenerateAllResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Fetch recipients that don't have a draft yet
  const { data: recipients } = await db
    .from('campaign_recipients')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('chef_id', chef.entityId)
    .is('draft_body', null)
    .is('sent_at', null)

  if (!recipients || recipients.length === 0) {
    return { generated: 0, failed: 0, ollamaOffline: false }
  }

  let generated = 0
  let failed = 0
  let ollamaOffline = false

  for (const recipient of recipients) {
    try {
      await draftPersonalizedOutreach(recipient.id)
      generated++
    } catch (err) {
      if (err instanceof OllamaOfflineError) {
        ollamaOffline = true
        break // No point continuing - Ollama won't come back up mid-loop
      }
      console.error('[generate-all-drafts] Failed for recipient', recipient.id, err)
      failed++
    }
  }

  return { generated, failed, ollamaOffline }
}

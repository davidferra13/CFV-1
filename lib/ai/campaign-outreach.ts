'use server'

// Campaign Outreach AI
//
// Two routing paths:
//   1. draftCampaignConcept() → GEMINI (public marketing copy, no PII)
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
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { format } from 'date-fns'

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

// ============================================================
// 1. GEMINI - CAMPAIGN CONCEPT COPY (no client PII)
// ============================================================

const CampaignConceptSchema = z.object({
  hook: z.string(),
  description: z.string(),
  callToAction: z.string(),
})

export interface CampaignConceptDraft {
  hook: string
  description: string
  callToAction: string
  generatedAt: string
}

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

  try {
    const ai = getGeminiClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.75, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const raw = JSON.parse(text)
    const validated = CampaignConceptSchema.safeParse(raw)
    if (!validated.success) {
      console.error('[campaign-concept] Zod validation failed:', validated.error.format())
      throw new Error('Campaign concept response did not match expected format. Please try again.')
    }
    return { ...validated.data, generatedAt: new Date().toISOString() }
  } catch (err) {
    console.error('[campaign-concept] Gemini failed:', err)
    throw new Error('Could not draft dinner concept. Please try again.')
  }
}

// ============================================================
// 2. OLLAMA - PERSONALIZED OUTREACH (private data - stays local)
// ============================================================

const OutreachSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(10),
})

export interface PersonalizedDraft {
  subject: string
  body: string
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
  const supabase: any = createServerClient()

  // 1. Load recipient → client → campaign
  const { data: recipient } = await supabase
    .from('campaign_recipients')
    .select('id, client_id, campaign_id')
    .eq('id', recipientId)
    .eq('chef_id', chef.entityId)
    .single()

  if (!recipient) throw new Error('Recipient not found')

  const [clientResult, campaignResult, chefResult] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'full_name, dietary_restrictions, allergies, vibe_notes, last_event_date, favorite_cuisines, dislikes'
      )
      .eq('id', recipient.client_id)
      .single(),
    supabase
      .from('marketing_campaigns')
      .select(
        'name, occasion, proposed_date, proposed_time, price_per_person_cents, concept_description, guest_count_max'
      )
      .eq('id', recipient.campaign_id)
      .single(),
    supabase.from('chefs').select('full_name, business_name').eq('id', chef.entityId).single(),
  ])

  const client = clientResult.data
  const campaign = campaignResult.data
  const chefData = chefResult.data

  if (!client || !campaign) throw new Error('Data not found')

  // Fetch last event for context
  const { data: lastEvent } = await supabase
    .from('events')
    .select('occasion, event_date, service_style')
    .eq('chef_id', chef.entityId)
    .eq('client_id', recipient.client_id)
    .not('status', 'in', '("cancelled","draft")')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const clientFirstName = (client.full_name ?? '').split(' ')[0] || 'there'
  const chefName = chefData?.full_name ?? 'Your Chef'
  const priceDisplay = campaign.price_per_person_cents
    ? `$${Math.round(campaign.price_per_person_cents / 100)} per person`
    : null

  const dateDisplay = campaign.proposed_date
    ? format(new Date(campaign.proposed_date + 'T12:00:00'), 'EEEE, MMMM d')
    : null

  const systemPrompt = `You are a private chef writing a warm, personal dinner invitation to one of your long-term clients.
You know this client well. The message should feel like a personal note from a friend, not a mass email.
Write in first person. One short paragraph or two at most. 120-160 words maximum.
End with a natural sign-off - just your first name, nothing formal.
No exclamation points. No "I hope this email finds you well." No bullet points.
Return ONLY valid JSON: { "subject": "...", "body": "..." }`

  const userContent = [
    `Chef name: ${chefName}`,
    `Client first name: ${clientFirstName}`,
    lastEvent
      ? `Last event I cooked for them: ${lastEvent.occasion} on ${lastEvent.event_date}`
      : 'This is a new client.',
    client.dietary_restrictions?.length
      ? `Their dietary restrictions: ${client.dietary_restrictions.join(', ')}`
      : '',
    client.favorite_cuisines?.length
      ? `Their favorite cuisines: ${client.favorite_cuisines.join(', ')}`
      : '',
    client.vibe_notes ? `Notes on their personality: ${client.vibe_notes}` : '',
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
    'Reference the past event if there was one. Make it feel genuine and personal.',
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
  await supabase
    .from('campaign_recipients')
    .update({ draft_subject: draft.subject, draft_body: draft.body })
    .eq('id', recipientId)

  return draft
}

// ============================================================
// 3. GENERATE ALL DRAFTS (batches over all recipients)
// ============================================================

export type GenerateAllResult = {
  generated: number
  failed: number
  ollamaOffline: boolean
}

export async function generateAllDrafts(campaignId: string): Promise<GenerateAllResult> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  // Fetch recipients that don't have a draft yet
  const { data: recipients } = await supabase
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

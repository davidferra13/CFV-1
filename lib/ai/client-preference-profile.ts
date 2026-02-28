'use server'

// Client Preference Profile Builder
// Privacy-first: synthesizes ALL event + message history with a single client into
// a structured profile. Routed to local Ollama (client PII + history).
// Output is DRAFT ONLY — displayed to chef as insight surface, never writes canon data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const ClientPreferenceProfileSchema = z.object({
  communicationStyle: z.string(), // e.g. "formal, detailed, prefers email"
  cuisinePreferences: z.array(z.string()), // e.g. ["Mediterranean", "light proteins"]
  servicePreferences: z.array(z.string()), // e.g. ["family-style", "outdoor preferred"]
  avoidances: z.array(z.string()), // dietary, style, or atmosphere avoidances
  budgetPattern: z.string(), // e.g. "avg $2,400, flexible for special occasions"
  relationshipNotes: z.string(), // key personality/relationship notes
  bookingPattern: z.string(), // e.g. "typically books 3–4 weeks ahead, May–Oct"
  topTip: z.string(), // single most important thing to remember for this client
  confidence: z.enum(['high', 'medium', 'low']),
})

export type ClientPreferenceProfile = z.infer<typeof ClientPreferenceProfileSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function buildClientPreferenceProfile(
  clientId: string
): Promise<ClientPreferenceProfile> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Gather all historical data for this client
  const [clientResult, eventsResult, messagesResult, inquiriesResult] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'full_name, dietary_restrictions, allergies, what_they_care_about, communication_style_notes, created_at'
      )
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('events')
      .select(
        'occasion, guest_count, event_date, status, quoted_price_cents, dietary_restrictions, allergies, special_requests, service_style'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('event_date', { ascending: false })
      .limit(20),
    supabase
      .from('messages')
      .select('body, direction, created_at')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('inquiries')
      .select('status, created_at')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const client = clientResult.data
  if (!client) throw new Error('Client not found')

  const events = eventsResult.data ?? []
  const messages = messagesResult.data ?? []
  const inquiries = inquiriesResult.data ?? []

  const systemPrompt = `You are a personal chef's business intelligence assistant.
Synthesize the client's event history, messages, and profile into a structured preference profile.
Focus on patterns the chef should know to delight this client in future events.
Be specific and actionable. Do NOT invent information not evidenced in the data.
Return valid JSON only.`

  const userContent = `
Client Profile:
Name: ${client.full_name}
Dietary restrictions: ${client.dietary_restrictions?.join(', ') || 'None noted'}
Allergies: ${client.allergies?.join(', ') || 'None noted'}
What they care about: ${client.what_they_care_about ?? 'None'}
Communication style notes: ${client.communication_style_notes ?? 'None'}
Client since: ${client.created_at?.split('T')[0] ?? 'Unknown'}

Event History (${events.length} events):
${events.map((e) => `- ${e.event_date ?? 'No date'}: ${e.occasion ?? 'Event'}, ${e.guest_count ?? '?'} guests, $${((e.quoted_price_cents ?? 0) / 100).toFixed(0)}, status: ${e.status}${e.special_requests ? ', requests: ' + e.special_requests : ''}${e.service_style ? ', style: ' + e.service_style : ''}`).join('\n') || '- No events yet'}

Recent Messages (last ${messages.length}):
${
  messages
    .slice(0, 15)
    .map((m) => `[${m.direction === 'inbound' ? 'Client' : 'Chef'}]: ${m.body.slice(0, 100)}`)
    .join('\n') || '- No messages'
}

Inquiry History (${inquiries.length} inquiries):
${inquiries.map((i) => `- ${i.created_at?.split('T')[0] ?? ''}: status=${i.status}`).join('\n') || '- None'}

Return JSON with these exact fields:
{
  "communicationStyle": "...",
  "cuisinePreferences": ["..."],
  "servicePreferences": ["..."],
  "avoidances": ["..."],
  "budgetPattern": "...",
  "relationshipNotes": "...",
  "bookingPattern": "...",
  "topTip": "...",
  "confidence": "high|medium|low"
}`

  try {
    return await parseWithOllama(systemPrompt, userContent, ClientPreferenceProfileSchema)
  } catch (err) {
    console.error('[client-preference-profile] Failed:', err)
    throw new Error('Could not generate preference profile. Please try again.')
  }
}

'use server'

// Gratuity Framing Message Generator
// PRIVACY: Sends client name, event financials - must stay local.
// Output is DRAFT ONLY - chef approves before sending.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { withAiFallback } from '@/lib/ai/with-ai-fallback'
import { calculateGratuityFormula } from '@/lib/formulas/gratuity-calc'

export interface GratuityFramingDraft {
  approach: 'mention_in_invoice' | 'verbal_mention' | 'note_in_message' | 'no_ask_needed'
  approachRationale: string
  messageDraft: string | null // if approach involves a written message
  verbalScript: string | null // if approach is verbal
  suggestedGratuityRangePercent: { min: number; max: number } | null
  timing: string // when to present the ask (e.g., "at end of service")
  generatedAt: string
  _aiSource?: string
}

const GratuityFramingSchema = z.object({
  approach: z.enum(['mention_in_invoice', 'verbal_mention', 'note_in_message', 'no_ask_needed']),
  approachRationale: z.string(),
  messageDraft: z.string().nullable(),
  verbalScript: z.string().nullable(),
  suggestedGratuityRangePercent: z.object({ min: z.number(), max: z.number() }).nullable(),
  timing: z.string(),
})

export async function draftGratuityFraming(eventId: string): Promise<GratuityFramingDraft> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, guest_count, event_date, quoted_price_cents, service_style,
      client_id,
      clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
  const clientName = client?.full_name ?? 'Client'
  const firstName = clientName.split(' ')[0]

  // Get event count for this client (relationship depth)
  const { count: eventCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'in_progress'])

  const isReturningClient = (eventCount ?? 0) > 1
  const totalSpend = event.quoted_price_cents ?? 0
  const isHighValue = totalSpend > 200000 // >$2,000
  const isVeryHighValue = totalSpend > 500000 // >$5,000

  const systemPrompt = `You are advising a private chef on how to handle the gratuity conversation with a client.
Be sensitive, natural, and non-transactional. The chef's relationship with the client comes first.
A gratuity ask should never feel mandatory or awkward. Return ONLY valid JSON.`

  const userContent = `Context:
  Client: ${firstName}
  Returning client: ${isReturningClient ? 'Yes (' + (eventCount ?? 0) + ' events)' : 'No (first event)'}
  Event: ${event.occasion ?? 'Private Dinner'}, ${event.guest_count ?? 'TBD'} guests
  Service style: ${event.service_style ?? 'plated'}
  Total event value: $${(totalSpend / 100).toFixed(0)}
  High-value event: ${isVeryHighValue ? 'Yes (>$5k)' : isHighValue ? 'Yes (>$2k)' : 'No'}

Approach options to choose from:
  - mention_in_invoice: add a gratuity line to the invoice (common for new clients, formal events)
  - verbal_mention: mention verbally at end of service ("gratuity is always appreciated but never expected")
  - note_in_message: include a brief line in the thank-you or follow-up message
  - no_ask_needed: returning client who tips consistently, or context makes ask unnecessary

Guidelines:
  - First event: mention_in_invoice or verbal_mention are safest
  - Returning client who always tips: no_ask_needed
  - High-value corporate/formal: mention_in_invoice
  - Casual/intimate dinner: verbal_mention
  - Never demand or make the client feel obligated

Return JSON: {
  "approach": "mention_in_invoice|verbal_mention|note_in_message|no_ask_needed",
  "approachRationale": "one sentence why",
  "messageDraft": "if note_in_message - the draft line to include, else null",
  "verbalScript": "if verbal_mention - the exact words to say, else null",
  "suggestedGratuityRangePercent": { "min": number, "max": number } or null,
  "timing": "when to present"
}`

  const { result, source } = await withAiFallback(
    // Formula: industry-standard rules - deterministic
    () =>
      calculateGratuityFormula({
        clientFirstName: firstName,
        isReturningClient,
        eventCount: eventCount ?? 0,
        occasion: event.occasion,
        guestCount: event.guest_count,
        serviceStyle: event.service_style,
        totalSpendCents: totalSpend,
      }),
    // AI: enhanced framing with personalized messaging (when Ollama is online)
    async () => {
      const aiResult = await parseWithOllama(systemPrompt, userContent, GratuityFramingSchema)
      return { ...aiResult, generatedAt: new Date().toISOString() }
    }
  )

  return { ...result, _aiSource: source }
}

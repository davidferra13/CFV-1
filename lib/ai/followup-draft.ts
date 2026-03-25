'use server'

// Follow-Up Draft Generator
// PRIVACY: Sends client name, dietary restrictions, allergies, vibe notes - must stay local.
// Output is DRAFT ONLY - chef reviews before sending.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

const FollowUpDraftSchema = z.object({
  message: z.string().describe('The follow-up message text, 3-4 sentences'),
})

const SYSTEM_PROMPT = `You are a private chef writing a personal follow-up message to a client after a recent event.

VOICE:
- First person singular ("I", not "we")
- Conversational and warm - like texting a friend you also cook for
- 3-4 sentences maximum. Short and genuine beats long and polished
- Match the vibe of the client relationship (formal clients get slightly more polished language, casual clients get relaxed)

STRUCTURE:
1. Open by referencing something specific from their event - a dish, a moment, a detail. Never open with "Dear [Name]" or "I hope this message finds you well"
2. Brief genuine check-in (did they enjoy it? any leftovers? how'd the guests react?)
3. One soft, natural rebook invitation - not a sales pitch. Something like "Would love to cook for you again" or "Let me know when you're ready for round two"

NEVER SAY:
- "Dear Valued Client" or any formal salutation
- "I hope this finds you well" / "I hope you're doing well"
- "Don't hesitate to reach out" / "Please don't hesitate"
- "It was my pleasure" / "It was a pleasure serving you"
- "I look forward to the opportunity"
- Multiple exclamation marks
- "Sincerely" / "Best regards" / "Warm regards" - just sign off naturally or don't sign off at all

EXAMPLES OF GOOD OUTPUT:

Example 1 (casual client):
"Hey Sarah - still thinking about how that chocolate lava cake turned out last Saturday. The way your guests went quiet for a second after the first bite was everything. Hope you're still riding the high from the party! Whenever you're craving another dinner, you know where to find me."

Example 2 (formal/corporate client):
"Hi Michael - the risotto was a hit on Thursday, glad we went with the truffle finish. I noticed a few of your colleagues asking about the menu, so feel free to share if anyone's interested. Would love to put something together for your team again whenever the timing's right."

Return JSON: { "message": "your message text here" }`

export async function generateFollowUpDraft(clientId: string): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('full_name, dietary_restrictions, allergies, vibe_notes')
    .eq('id', clientId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!client) throw new Error('Client not found')

  const { data: lastEvent } = await db
    .from('events')
    .select('occasion, event_date, guest_count, status')
    .eq('client_id', clientId)
    .eq('tenant_id', user.entityId)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const clientFirstName = client.full_name?.split(' ')[0] || client.full_name || 'there'

  const userContent = `Write a follow-up message from a private chef to their client.

Client first name: ${clientFirstName}
Client full name: ${client.full_name}
Client vibe: ${client.vibe_notes || 'No notes - assume friendly and approachable'}
Dietary preferences: ${(client.dietary_restrictions as string[] | null)?.join(', ') || 'None noted'}
Allergies: ${(client.allergies as string[] | null)?.join(', ') || 'None'}
Last event: ${lastEvent?.occasion || 'None on record'} on ${lastEvent?.event_date || 'N/A'}
Guest count: ${lastEvent?.guest_count || 'Unknown'}`

  try {
    const result = await parseWithOllama(SYSTEM_PROMPT, userContent, FollowUpDraftSchema, {
      modelTier: 'complex',
    })
    return result.message.trim()
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[followup-draft] Error:', err)
    throw new Error('Could not generate follow-up draft. Please try again.')
  }
}

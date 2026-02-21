'use server'

// Follow-Up Draft Generator
// PRIVACY: Sends client name, dietary restrictions, allergies, vibe notes — must stay local.
// Output is DRAFT ONLY — chef reviews before sending.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

const FollowUpDraftSchema = z.object({
  message: z.string().describe('The follow-up message text, 3-4 sentences'),
})

export async function generateFollowUpDraft(clientId: string): Promise<string> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('full_name, dietary_restrictions, allergies, vibe_notes')
    .eq('id', clientId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!client) throw new Error('Client not found')

  const { data: lastEvent } = await supabase
    .from('events')
    .select('occasion, event_date, guest_count, status')
    .eq('client_id', clientId)
    .eq('tenant_id', user.entityId)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const clientFirstName = client.full_name?.split(' ')[0] || client.full_name || 'there'

  const systemPrompt =
    'You are a private chef drafting personal, warm follow-up messages to clients. Keep responses brief, genuine, and never salesy. First person singular only. Return JSON with a "message" key containing the message text.'

  const userContent = `Write a warm, personalized follow-up message from a private chef to their client.

Client: ${client.full_name}
Client first name: ${clientFirstName}
Last event: ${lastEvent?.occasion || 'None on record'} on ${lastEvent?.event_date || 'N/A'}
Client preferences: ${(client.dietary_restrictions as string[] | null)?.join(', ') || 'None noted'}

Write a brief (3-4 sentences), friendly, personal follow-up message. Check in on the client, reference their last event if recent, and subtly invite them to book again. Do NOT use generic salutations like "Dear Valued Client". Address the client by their first name. Return JSON: { "message": "your message text here" }`

  try {
    const result = await parseWithOllama(systemPrompt, userContent, FollowUpDraftSchema)
    return result.message.trim()
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[followup-draft] Error:', err)
    throw new Error('Could not generate follow-up draft. Please try again.')
  }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

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

  const prompt = `Write a warm, personalized follow-up message from a private chef to their client.

Client: ${client.full_name}
Client first name: ${clientFirstName}
Last event: ${lastEvent?.occasion || 'None on record'} on ${lastEvent?.event_date || 'N/A'}
Client preferences: ${(client.dietary_restrictions as string[] | null)?.join(', ') || 'None noted'}

Write a brief (3-4 sentences), friendly, personal follow-up message. Check in on the client, reference their last event if recent, and subtly invite them to book again. Do NOT use generic salutations like "Dear Valued Client". Address the client by their first name. Return only the message text, no subject line, no meta-commentary.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction:
          'You are a private chef drafting personal, warm follow-up messages to clients. Keep responses brief, genuine, and never salesy. First person singular only.',
      },
    })
    return (response.text || '').trim()
  } catch (err) {
    console.error('[followup-draft] Error:', err)
    throw new Error('Could not generate follow-up draft. Please try again.')
  }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function sendCopilotMessage(
  userMessage: string,
  conversationHistory: CopilotMessage[]
): Promise<string> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get chef context
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, tagline')
    .eq('id', user.entityId)
    .single()

  // Get recent events for context
  const { data: recentEvents } = await supabase
    .from('events')
    .select('occasion, event_date, guest_count, status, client:clients(full_name)')
    .eq('tenant_id', user.entityId)
    .order('event_date', { ascending: false })
    .limit(5)

  const systemInstruction = `You are an AI assistant for ${chef?.business_name || 'a private chef'} using ChefFlow, a business management platform.

You help with:
- Drafting follow-up messages and client communications (always present as drafts for chef to review)
- Suggesting menus based on client preferences and dietary restrictions
- Analyzing revenue and business performance questions
- Creating quotes from inquiry details
- General business advice for private chef operations

Recent events context: ${JSON.stringify(recentEvents?.map(e => ({ occasion: e.occasion, date: e.event_date, guests: e.guest_count, status: e.status })))}

Important: Always present suggestions as drafts. Never claim to take autonomous actions. For financial data, acknowledge you are working from recent context. Keep responses concise and actionable.`

  // Build the conversation history in the format expected by @google/genai
  // Roles must alternate user/model; filter to only what Gemini accepts
  const historyContents = conversationHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // Append the new user message
  historyContents.push({ role: 'user', parts: [{ text: userMessage }] })

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: historyContents,
      config: {
        temperature: 0.7,
        systemInstruction,
      },
    })
    return response.text || ''
  } catch (err) {
    console.error('[copilot] Gemini error:', err)
    throw new Error('AI assistant is temporarily unavailable. Please try again.')
  }
}

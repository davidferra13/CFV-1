'use server'

// Copilot Assistant
// PRIVACY: Receives client names in recent events context — must stay local.
// Output is DRAFT ONLY — chef reviews all suggestions.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const CopilotResponseSchema = z.object({
  response: z.string().describe('The assistant response text'),
})

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

  // Get recent events for context (include client names for personalization)
  const { data: recentEvents } = await supabase
    .from('events')
    .select('occasion, event_date, guest_count, status, client:clients(full_name)')
    .eq('tenant_id', user.entityId)
    .order('event_date', { ascending: false })
    .limit(5)

  const systemPrompt = `You are an AI assistant for ${chef?.business_name || 'a private chef'} using ChefFlow, a business management platform.

You help with:
- Drafting follow-up messages and client communications (always present as drafts for chef to review)
- Suggesting menus based on client preferences and dietary restrictions
- Analyzing revenue and business performance questions
- Creating quotes from inquiry details
- General business advice for private chef operations

Recent events context: ${JSON.stringify(recentEvents?.map((e) => ({ occasion: e.occasion, date: e.event_date, guests: e.guest_count, status: e.status })))}

Important: Always present suggestions as drafts. Never claim to take autonomous actions. For financial data, acknowledge you are working from recent context. Keep responses concise and actionable.
Return JSON: { "response": "your response text here" }`

  // Build conversation context as a single user message (Ollama chat is system + user)
  const conversationContext =
    conversationHistory.length > 0
      ? 'Previous conversation:\n' +
        conversationHistory
          .map((m) => `${m.role === 'user' ? 'Chef' : 'Assistant'}: ${m.content}`)
          .join('\n') +
        '\n\n'
      : ''

  const userContent = `${conversationContext}Chef: ${userMessage}`

  try {
    const result = await parseWithOllama(systemPrompt, userContent, CopilotResponseSchema)
    return result.response
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[copilot] Ollama error:', err)
    throw new Error('AI assistant is temporarily unavailable. Please try again.')
  }
}

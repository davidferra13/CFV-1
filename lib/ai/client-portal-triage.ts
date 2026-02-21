'use server'

// Client Portal Auto-Triage
// When chef is mid-service (event status = in_progress), classifies incoming client
// portal messages and drafts holding responses. Routed to Ollama (client PII).
// Output is DRAFT ONLY — chef must approve before sending any response.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const TriageResultSchema = z.object({
  urgency: z.enum(['urgent', 'normal', 'low']),
  category: z.enum(['logistics', 'inquiry', 'complaint', 'payment', 'compliment', 'other']),
  summary: z.string(),         // one-line summary of what the client needs
  draftResponse: z.string(),   // holding response draft for the chef to approve/edit
  suggestedFollowUpAt: z.string(), // ISO time suggestion for when to respond, e.g. "within 2 hours"
  confidence: z.enum(['high', 'medium', 'low']),
})

export type TriageResult = z.infer<typeof TriageResultSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function triageIncomingMessage(
  messageId: string
): Promise<TriageResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: message } = await supabase
    .from('messages')
    .select(`
      body, created_at, client_id,
      clients(full_name, preferences)
    `)
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!message) throw new Error('Message not found')

  const client = Array.isArray(message.clients) ? message.clients[0] : message.clients
  const clientName = (client as any)?.full_name ?? 'Client'

  const systemPrompt = `You are managing messages for a private chef who is currently in service (cooking an event).
Classify the incoming client message and draft an appropriate holding response.

Urgency:
  urgent: safety issue, event logistics emergency, payment dispute
  normal: logistical question, follow-up request, change request
  low: compliment, general question, future booking inquiry

Draft response guidelines:
  - Warm, professional, first person ("I'll...")
  - Acknowledge their message
  - Give realistic timeframe (chef in service → "within 2 hours after service")
  - Never promise specific outcomes without chef review
  - Keep it under 3 sentences

Return valid JSON only.`

  const userContent = `
Client name: ${clientName}
Message received: ${message.created_at}
Message content: "${(message.body as string)?.slice(0, 500) ?? ''}"

Return JSON: {
  "urgency": "urgent|normal|low",
  "category": "logistics|inquiry|complaint|payment|compliment|other",
  "summary": "one line of what client needs",
  "draftResponse": "holding response draft",
  "suggestedFollowUpAt": "timeframe suggestion",
  "confidence": "high|medium|low"
}`

  try {
    return await parseWithOllama(systemPrompt, userContent, TriageResultSchema)
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[client-portal-triage] Failed:', err)
    return {
      urgency: 'normal',
      category: 'other',
      summary: 'Unable to classify — review manually',
      draftResponse: `Hi ${clientName}, thank you for your message. I'll follow up with you shortly.`,
      suggestedFollowUpAt: 'within 2 hours',
      confidence: 'low',
    }
  }
}

// Reputation Draft Generator
// Generates review/testimonial request drafts for happy clients.

import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { reputationRequestPrompt } from '@/lib/ai/signal-draft-prompts'
import { z } from 'zod'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { DraftResult } from './pipeline-draft'

const DraftSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  signOff: z.string(),
})

export async function generateReputationDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<DraftResult | null> {
  const db = createServerClient()
  const eventId = signal.entityIds[0]
  if (!eventId) return null

  // 1. Check dedup: no existing review request draft for this event
  const { data: existing } = await db
    .from('scheduled_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .eq('channel', 'email')
    .contains('metadata', { draftType: 'review_request', entityId: eventId })
    .limit(1)

  if (existing && existing.length > 0) return null

  // 2. Fetch event + client info
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event || !event.client_id) return null

  const { data: client } = await db
    .from('clients')
    .select('id, full_name, preferred_name, email')
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!client || !client.email) return null

  // 3. Fetch chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your chef'
  const clientName = client.preferred_name || client.full_name || 'there'

  const recentEvent = event.occasion || 'your recent dinner'
  const eventDate = event.event_date || null

  // 4. Generate AI copy (fallback to static template)
  const promptCtx = reputationRequestPrompt({
    clientName,
    chefName,
    recentEvent,
    eventDate,
  })

  let subject = `It meant a lot to cook for you`
  let body = `Hi ${clientName},\n\nThank you again for ${recentEvent}. It was truly a pleasure.\n\nIf you have a moment, a short review would mean the world. Even just a sentence or two helps other folks find their way to a great dining experience.\n\nNo worries at all if not. Hope to cook for you again soon!\n\nGratefully,\n${chefName}`

  const aiResult = await parseWithOllama(promptCtx.system, promptCtx.user, DraftSchema, {
    modelTier: 'fast',
    maxTokens: 200,
    timeoutMs: 8000,
  }).catch(() => null)

  if (aiResult) {
    subject = aiResult.subject
    body = `${aiResult.greeting}\n\n${aiResult.body}\n\n${aiResult.signOff}`
  }

  return {
    type: 'email',
    subject,
    body,
    recipientId: client.id,
    metadata: {
      signalId: signal.id,
      signalSource: signal.source,
      draftType: 'review_request',
      generatedAt: Date.now(),
      aiGenerated: !!aiResult,
      entityId: eventId,
    },
  }
}

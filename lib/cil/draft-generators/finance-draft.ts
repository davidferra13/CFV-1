// Finance Draft Generator
// Generates gentle payment reminder drafts for overdue invoices.

import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { financeReminderPrompt } from '@/lib/ai/signal-draft-prompts'
import { z } from 'zod'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { DraftResult } from './pipeline-draft'

const DraftSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  signOff: z.string(),
})

export async function generateFinanceDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<DraftResult | null> {
  const db = createServerClient()
  const eventId = signal.entityIds[0]
  if (!eventId) return null

  // 1. Check dedup: no existing payment reminder draft for this event
  const { data: existing } = await db
    .from('scheduled_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .eq('channel', 'email')
    .contains('metadata', { draftType: 'payment_reminder', entityId: eventId })
    .limit(1)

  if (existing && existing.length > 0) return null

  // 2. Fetch event + client info
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, client_id, total_price')
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

  // Calculate days overdue from signal or event date
  const daysOverdue = event.event_date
    ? Math.floor((Date.now() - new Date(event.event_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const amountDue = event.total_price
    ? `$${(event.total_price / 100).toFixed(2)}`
    : (signal.actionPayload?.amount as string) || 'outstanding balance'

  const eventReference =
    event.occasion || (event.event_date ? `your ${event.event_date} dinner` : null)

  // 4. Generate AI copy (fallback to static template)
  const promptCtx = financeReminderPrompt({
    clientName,
    chefName,
    amountDue,
    daysOverdue,
    eventReference,
  })

  let subject = `Quick note about your balance with ${chefName}`
  let body = `Hi ${clientName},\n\nHope you are doing well! Just a friendly heads-up that there is a balance of ${amountDue} remaining${eventReference ? ` from ${eventReference}` : ''}.\n\nNo rush, just wanted to make sure it did not slip through the cracks. Let me know if you have any questions.\n\nBest,\n${chefName}`

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
      draftType: 'payment_reminder',
      generatedAt: Date.now(),
      aiGenerated: !!aiResult,
      entityId: eventId,
    },
  }
}

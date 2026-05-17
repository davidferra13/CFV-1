// Pipeline Draft Generator
// Generates follow-up email drafts for stale leads and expiring proposals.

import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { pipelineFollowUpPrompt } from '@/lib/ai/signal-draft-prompts'
import { z } from 'zod'
import type { ProactiveSignal } from '@/lib/cil/types'

export interface DraftResult {
  type: 'email' | 'notification' | 'task'
  subject?: string
  body: string
  recipientId?: string
  metadata: {
    signalId: string
    signalSource: string
    draftType: string
    generatedAt: number
    aiGenerated: boolean
    entityId?: string
  }
}

const DraftSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  signOff: z.string(),
})

export async function generatePipelineDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<DraftResult | null> {
  const db = createServerClient()
  const entityId = signal.entityIds[0]
  if (!entityId) return null

  // 1. Check dedup: no existing draft for this entity
  const { data: existing } = await db
    .from('scheduled_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .eq('channel', 'email')
    .contains('metadata', { draftType: 'pipeline_followup', entityId })
    .limit(1)

  if (existing && existing.length > 0) return null

  // 2. Fetch context: inquiry/quote + client info
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id, client_name, client_email, occasion, created_at, notes')
    .eq('id', entityId)
    .eq('tenant_id', tenantId)
    .single()

  if (!inquiry || !inquiry.client_email) return null

  // Fetch chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your chef'
  const clientName = inquiry.client_name || 'there'
  const daysSinceContact = inquiry.created_at
    ? Math.floor((Date.now() - new Date(inquiry.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 7

  // 3. Generate AI copy (fallback to static template)
  const promptCtx = pipelineFollowUpPrompt({
    clientName,
    chefName,
    daysSinceContact,
    originalInquiry: inquiry.notes || null,
    occasion: inquiry.occasion || null,
  })

  let subject = `Following up on your inquiry with ${chefName}`
  let body = `Hi ${clientName},\n\nJust wanted to check in about your inquiry. If you are still interested, ${chefName} would love to help make your event special.\n\nNo rush at all. Feel free to reach out whenever you are ready.\n\nBest,\n${chefName}`

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
    recipientId: entityId,
    metadata: {
      signalId: signal.id,
      signalSource: signal.source,
      draftType: 'pipeline_followup',
      generatedAt: Date.now(),
      aiGenerated: !!aiResult,
      entityId,
    },
  }
}

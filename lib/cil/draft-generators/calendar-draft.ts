// Calendar Draft Generator
// Generates outreach email drafts for dead spots (open dates).

import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { calendarOutreachPrompt } from '@/lib/ai/signal-draft-prompts'
import { z } from 'zod'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { DraftResult } from './pipeline-draft'

const DraftSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  signOff: z.string(),
})

export async function generateCalendarDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<DraftResult | null> {
  const db = createServerClient()

  // 1. Check dedup: no existing calendar outreach draft in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await db
    .from('scheduled_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .eq('channel', 'email')
    .contains('metadata', { draftType: 'calendar_outreach' })
    .gte('created_at', weekAgo)
    .limit(1)

  if (existing && existing.length > 0) return null

  // 2. Find a dormant client to reach out to
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: dormantClients } = await db
    .from('clients')
    .select('id, full_name, preferred_name, email')
    .eq('tenant_id', tenantId)
    .not('email', 'is', null)
    .lt('last_event_date', thirtyDaysAgo)
    .order('last_event_date', { ascending: true })
    .limit(1)

  const client = dormantClients?.[0]
  if (!client || !client.email) return null

  // 3. Fetch chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your chef'
  const clientName = client.preferred_name || client.full_name || 'there'

  // Extract open dates from signal detail/payload
  const openDates: string[] = (signal.actionPayload?.openDates as string[]) || []
  const dateStr = openDates.length > 0 ? openDates.slice(0, 3).join(', ') : 'some upcoming weekends'

  // Determine season for menu tease
  const month = new Date().getMonth()
  const seasonalNote =
    month >= 2 && month <= 4
      ? 'Spring produce is at its peak'
      : month >= 5 && month <= 7
        ? 'Summer flavors are incredible right now'
        : month >= 8 && month <= 10
          ? 'Fall harvest season brings amazing ingredients'
          : 'Winter comfort food season is here'

  // 4. Generate AI copy (fallback to static template)
  const promptCtx = calendarOutreachPrompt({
    clientName,
    chefName,
    openDates: openDates.length > 0 ? openDates.slice(0, 3) : [dateStr],
    seasonalNote,
  })

  let subject = `${chefName} has some dates opening up`
  let body = `Hi ${clientName},\n\n${chefName} has ${dateStr} available and thought of you. ${seasonalNote}, so it would be a great time for a dinner.\n\nNo pressure, just wanted to let you know in case the timing works.\n\nBest,\n${chefName}`

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
      draftType: 'calendar_outreach',
      generatedAt: Date.now(),
      aiGenerated: !!aiResult,
    },
  }
}

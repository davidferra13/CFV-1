'use server'

// Daily Ops - Draft Engine
// Auto-drafts routine communications using local Ollama (private data stays local).
// Pro tier feature - Free tier gets organize + link only.
//
// PRIVACY: All client data processed locally via parseWithOllama.
// Never falls back to cloud AI. If Ollama is offline, drafts are skipped gracefully.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { REMY_PERSONALITY } from '@/lib/ai/remy-personality'

// ============================================
// TYPES
// ============================================

export type DraftType = 'follow_up' | 'confirmation' | 'birthday' | 'reminder'

export interface GeneratedDraft {
  id: string
  draftType: DraftType
  recipientName: string
  subject: string | null
  body: string
  sourceEntityType: string
  sourceEntityId: string
}

// ============================================
// SCHEMAS
// ============================================

const DraftOutputSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
})

// ============================================
// DRAFT GENERATORS
// ============================================

const FOLLOW_UP_SYSTEM = `${REMY_PERSONALITY}

You are drafting a follow-up message from a private chef to a client after an event.
Rules:
- Write in the chef's voice (first person "I")
- Reference the specific event occasion
- Keep it to 3-4 sentences
- Warm but professional, no emojis
- End with a soft call-to-action about future events
- Do NOT be salesy
- Return JSON: { "body": "the message text" }`

const BIRTHDAY_SYSTEM = `${REMY_PERSONALITY}

You are drafting a birthday/anniversary message from a private chef to a client.
Rules:
- Write in the chef's voice (first person "I")
- Reference any past events if provided
- Keep it to 2-3 sentences
- Warm and personal
- Optionally mention availability for a celebration dinner
- Do NOT be salesy
- Return JSON: { "body": "the message text" }`

const CONFIRMATION_SYSTEM = `${REMY_PERSONALITY}

You are drafting an event confirmation message from a private chef to a client.
Rules:
- Write in the chef's voice (first person "I")
- Reference the event date, occasion, and guest count
- Express genuine enthusiasm
- Keep it to 2-3 sentences
- Include a practical note (dietary needs, timing, etc.)
- Return JSON: { "body": "the message text" }`

// ============================================
// PUBLIC API
// ============================================

/**
 * Generate auto-drafts for the daily plan.
 * Scans for follow-up-needed events and upcoming milestones,
 * generates drafts via Ollama, and saves to daily_plan_drafts.
 *
 * Fails gracefully if Ollama is offline - returns empty array.
 */
export async function generateDailyDrafts(): Promise<GeneratedDraft[]> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const _td0 = new Date()
    const todayStr = `${_td0.getFullYear()}-${String(_td0.getMonth() + 1).padStart(2, '0')}-${String(_td0.getDate()).padStart(2, '0')}`

    // Check for existing drafts today - don't regenerate
    const { data: existing } = await db
      .from('daily_plan_drafts')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .eq('plan_date', todayStr)
      .eq('status', 'pending_review')
      .limit(1)

    if (existing && existing.length > 0) {
      // Already have drafts for today - return them
      return loadExistingDrafts(db, user.tenantId!, todayStr)
    }

    const drafts: GeneratedDraft[] = []

    // 1. Follow-up drafts - completed events without follow-up
    const followUpDrafts = await generateFollowUpDrafts(db, user.tenantId!)
    drafts.push(...followUpDrafts)

    // 2. Confirmation drafts - upcoming confirmed events
    const confirmDrafts = await generateConfirmationDrafts(db, user.tenantId!)
    drafts.push(...confirmDrafts)

    // Save all drafts to DB in a single batch insert
    if (drafts.length > 0) {
      await db.from('daily_plan_drafts').insert(
        drafts.map((draft) => ({
          chef_id: user.tenantId!,
          plan_date: todayStr,
          draft_type: draft.draftType,
          source_entity_type: draft.sourceEntityType,
          source_entity_id: draft.sourceEntityId,
          recipient_client_id: null,
          subject: draft.subject,
          body: draft.body,
          status: 'pending_review',
        }))
      )
    }

    return drafts
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      console.warn('[DraftEngine] Ollama offline - skipping draft generation')
      return []
    }
    console.error('[DraftEngine] generateDailyDrafts failed:', err)
    return []
  }
}

/**
 * Generate a birthday/anniversary draft message for a specific client on-demand.
 * Uses Ollama (client PII stays local). Falls back to a deterministic template
 * if Ollama is offline, so the button is always useful.
 */
export async function generateBirthdayDraft(
  clientId: string,
  milestone: 'birthday' | 'anniversary'
): Promise<{ body: string; clientName: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('id, full_name, allergies, dietary_restrictions')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const clientName = client.full_name
  const firstName = clientName?.split(' ')[0] || clientName

  // Last event for personal reference
  const { data: lastEvent } = await db
    .from('events')
    .select('occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  const lastEventContext = lastEvent
    ? `Their most recent event was a ${lastEvent.occasion ?? 'dinner'} on ${lastEvent.event_date}.`
    : ''

  try {
    const result = await parseWithOllama(
      BIRTHDAY_SYSTEM,
      `Draft a ${milestone} message for ${firstName} (${clientName}). ${lastEventContext}`,
      DraftOutputSchema,
      { modelTier: 'standard' }
    )
    return { body: result.body, clientName }
  } catch (err) {
    if (!(err instanceof OllamaOfflineError)) {
      console.warn('[DraftEngine] generateBirthdayDraft Ollama failed, using template:', err)
    }
    // Deterministic fallback - always works offline
    const verb = milestone === 'birthday' ? 'birthday' : 'anniversary'
    const body = lastEvent
      ? `Hi ${firstName}, thinking of you on your ${verb}! It was a pleasure cooking for you at your ${lastEvent.occasion ?? 'dinner'}. If you would like to celebrate with something special this year, I would love to help make it memorable.`
      : `Hi ${firstName}, thinking of you on your ${verb}! If you would like to celebrate with a special dinner this year, I would love to help make it memorable.`
    return { body, clientName }
  }
}

/**
 * Approve a draft - marks it as approved.
 */
export async function approveDraft(draftId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('daily_plan_drafts')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[DraftEngine] approveDraft failed:', error)
    return { success: false }
  }

  return { success: true }
}

/**
 * Dismiss a draft - marks it as dismissed.
 */
export async function dismissDraft(draftId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('daily_plan_drafts')
    .update({ status: 'dismissed' })
    .eq('id', draftId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[DraftEngine] dismissDraft failed:', error)
    return { success: false }
  }

  return { success: true }
}

// ============================================
// INTERNAL
// ============================================

async function loadExistingDrafts(
  db: any,
  chefId: string,
  planDate: string
): Promise<GeneratedDraft[]> {
  const { data } = await db
    .from('daily_plan_drafts')
    .select('id, draft_type, body, subject, source_entity_type, source_entity_id')
    .eq('chef_id', chefId)
    .eq('plan_date', planDate)
    .eq('status', 'pending_review')

  return (data ?? []).map((d: any) => ({
    id: d.id,
    draftType: d.draft_type as DraftType,
    recipientName: '', // Loaded separately if needed
    subject: d.subject,
    body: d.body,
    sourceEntityType: d.source_entity_type,
    sourceEntityId: d.source_entity_id,
  }))
}

async function generateFollowUpDrafts(db: any, tenantId: string): Promise<GeneratedDraft[]> {
  const drafts: GeneratedDraft[] = []

  // Find completed events without follow-up (last 7 days)
  const _now1 = new Date()
  const _sda7 = new Date(_now1.getFullYear(), _now1.getMonth(), _now1.getDate() - 7)
  const sevenDaysAgo = `${_sda7.getFullYear()}-${String(_sda7.getMonth() + 1).padStart(2, '0')}-${String(_sda7.getDate()).padStart(2, '0')}`

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, client:clients(id, full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('follow_up_sent', false)
    .gte('event_date', sevenDaysAgo)
    .limit(3)

  for (const event of events ?? []) {
    const clientName = (event.client as any)?.full_name ?? 'the client'
    try {
      const result = await parseWithOllama(
        FOLLOW_UP_SYSTEM,
        `Draft a follow-up for ${clientName} after their ${event.occasion ?? 'dinner'} on ${event.event_date} for ${event.guest_count ?? 'a few'} guests.`,
        DraftOutputSchema,
        { modelTier: 'standard' }
      )

      drafts.push({
        id: `follow_up:${event.id}`,
        draftType: 'follow_up',
        recipientName: clientName,
        subject: null,
        body: result.body,
        sourceEntityType: 'event',
        sourceEntityId: event.id,
      })
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      console.warn(`[DraftEngine] Follow-up draft failed for event ${event.id}:`, err)
    }
  }

  return drafts
}

async function generateConfirmationDrafts(db: any, tenantId: string): Promise<GeneratedDraft[]> {
  const drafts: GeneratedDraft[] = []

  // Find events happening in the next 3 days that are confirmed
  const _now2 = new Date()
  const _liso2 = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayStr = _liso2(_now2)
  const threeDaysOut = _liso2(new Date(_now2.getFullYear(), _now2.getMonth(), _now2.getDate() + 3))

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, client:clients(id, full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'confirmed')
    .gte('event_date', todayStr)
    .lte('event_date', threeDaysOut)
    .limit(3)

  for (const event of events ?? []) {
    const clientName = (event.client as any)?.full_name ?? 'the client'
    try {
      const result = await parseWithOllama(
        CONFIRMATION_SYSTEM,
        `Draft a confirmation for ${clientName}'s ${event.occasion ?? 'dinner'} on ${event.event_date} at ${event.serve_time ?? 'the scheduled time'} for ${event.guest_count ?? 'their'} guests.`,
        DraftOutputSchema,
        { modelTier: 'standard' }
      )

      drafts.push({
        id: `confirmation:${event.id}`,
        draftType: 'confirmation',
        recipientName: clientName,
        subject: null,
        body: result.body,
        sourceEntityType: 'event',
        sourceEntityId: event.id,
      })
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      console.warn(`[DraftEngine] Confirmation draft failed for event ${event.id}:`, err)
    }
  }

  return drafts
}

'use server'

// Prospecting Hub — Call Queue Actions
// Builds daily call queues, logs outcomes, converts prospects to inquiries.

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Prospect } from './types'
import { CALL_OUTCOMES } from './constants'

// ── Build Daily Queue ────────────────────────────────────────────────────────

export async function buildDailyQueue(
  count = 10,
  filters?: {
    category?: string
    region?: string
    priority?: string
  }
): Promise<Prospect[]> {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  // Smart queue priority:
  //   1. Follow-ups that are due (overdue first)
  //   2. Pipeline "responded" / "meeting_set" prospects (hot leads — no recent outreach)
  //   3. New/queued prospects (highest lead score first)
  //   4. Called/contacted prospects with no recent outreach (cold re-engage)
  const prospects: Prospect[] = []
  const seenIds = new Set<string>()

  function addUnique(items: Prospect[]) {
    for (const p of items) {
      if (!seenIds.has(p.id)) {
        prospects.push(p)
        seenIds.add(p.id)
      }
    }
  }

  function applyFilters(query: ReturnType<typeof supabase.from>) {
    let q = query
    if (filters?.category) q = q.eq('category', filters.category)
    if (filters?.region) q = q.ilike('region', `%${filters.region}%`)
    if (filters?.priority) q = q.eq('priority', filters.priority)
    return q
  }

  // 1. Follow-ups that are due
  const { data: followUps } = await applyFilters(
    supabase
      .from('prospects')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'follow_up')
      .lte('next_follow_up_at', new Date().toISOString())
      .order('next_follow_up_at', { ascending: true })
      .limit(count)
  )
  if (followUps) addUnique(followUps as Prospect[])

  // 2. Hot pipeline prospects (responded/meeting_set) — they showed interest, keep momentum
  if (prospects.length < count) {
    const { data: hotPipeline } = await applyFilters(
      supabase
        .from('prospects')
        .select('*')
        .eq('chef_id', user.tenantId!)
        .in('pipeline_stage', ['responded', 'meeting_set'])
        .not('status', 'in', '("converted","dead","not_interested")')
        .order('lead_score', { ascending: false })
        .limit(count - prospects.length)
    )
    if (hotPipeline) addUnique(hotPipeline as Prospect[])
  }

  // 3. Fill remaining slots with new/queued prospects (highest lead score first)
  if (prospects.length < count) {
    const { data: newProspects } = await applyFilters(
      supabase
        .from('prospects')
        .select('*')
        .eq('chef_id', user.tenantId!)
        .in('status', ['new', 'queued'])
        .order('lead_score', { ascending: false })
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(count - prospects.length)
    )
    if (newProspects) addUnique(newProspects as Prospect[])
  }

  // 4. Cold re-engage: called/contacted prospects not reached in 7+ days
  if (prospects.length < count) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: calledProspects } = await applyFilters(
      supabase
        .from('prospects')
        .select('*')
        .eq('chef_id', user.tenantId!)
        .in('status', ['called'])
        .lt('last_called_at', sevenDaysAgo.toISOString())
        .order('last_called_at', { ascending: true, nullsFirst: true })
        .limit(count - prospects.length)
    )
    if (calledProspects) addUnique(calledProspects as Prospect[])
  }

  // Mark all queued prospects as 'queued'
  const queuedIds = prospects.filter((p) => p.status === 'new').map((p) => p.id)
  if (queuedIds.length > 0) {
    await supabase
      .from('prospects')
      .update({ status: 'queued' })
      .in('id', queuedIds)
      .eq('chef_id', user.tenantId!)
  }

  return prospects
}

// ── Log Prospect Call ────────────────────────────────────────────────────────

export async function logProspectCall(
  prospectId: string,
  outcomeValue: string,
  notes?: string,
  nextFollowUpDays?: number
) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  // Get prospect data
  const { data: prospect, error: fetchError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !prospect) throw new Error('Prospect not found')

  // Find outcome definition
  const outcome = CALL_OUTCOMES.find((o) => o.value === outcomeValue)
  if (!outcome) throw new Error('Invalid outcome')

  // Update prospect
  const prospectUpdates: Record<string, unknown> = {
    last_called_at: new Date().toISOString(),
    call_count: (prospect.call_count ?? 0) + 1,
    last_outcome: outcome.label,
    status: outcome.nextStatus,
  }

  if (nextFollowUpDays && outcome.nextStatus === 'follow_up') {
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + nextFollowUpDays)
    prospectUpdates.next_follow_up_at = followUpDate.toISOString()
  }

  await supabase
    .from('prospects')
    .update(prospectUpdates)
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  // Create a scheduled_calls record
  await supabase.from('scheduled_calls').insert({
    tenant_id: user.tenantId!,
    call_type: 'prospecting',
    prospect_id: prospectId,
    contact_name: prospect.contact_person ?? prospect.name,
    contact_phone: prospect.phone ?? prospect.contact_direct_phone,
    contact_company: prospect.prospect_type === 'organization' ? prospect.name : null,
    scheduled_at: new Date().toISOString(),
    duration_minutes: 5,
    status: 'completed',
    completed_at: new Date().toISOString(),
    outcome_summary: outcome.label,
    call_notes: notes ?? null,
  })

  // Add a prospect note if notes were provided
  if (notes?.trim()) {
    await supabase.from('prospect_notes').insert({
      prospect_id: prospectId,
      chef_id: user.tenantId!,
      note_type: 'call_note',
      content: `${outcome.label}: ${notes.trim()}`,
    })
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'prospect_called',
      domain: 'prospecting',
      entityType: 'prospect',
      entityId: prospectId,
      summary: `Called ${prospect.name}: ${outcome.label}`,
      context: { outcome: outcomeValue, call_count: (prospect.call_count ?? 0) + 1 },
    })
  } catch (err) {
    console.error('[logProspectCall] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/queue')
  revalidatePath(`/prospecting/${prospectId}`)
  revalidatePath('/calls')

  return { success: true as const, newStatus: outcome.nextStatus }
}

// ── Convert to Inquiry ───────────────────────────────────────────────────────

export async function convertProspectToInquiry(prospectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: prospect, error: fetchError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !prospect) throw new Error('Prospect not found')

  // Create inquiry from prospect data
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: user.tenantId!,
      status: 'new',
      channel: 'outbound_prospecting',
      first_contact_at: new Date().toISOString(),
      source_message: [
        `Converted from prospect: ${prospect.name}`,
        prospect.category ? `Category: ${prospect.category}` : '',
        prospect.description ?? '',
        prospect.approach_strategy ? `Approach: ${prospect.approach_strategy}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })
    .select()
    .single()

  if (inquiryError || !inquiry) {
    console.error('[convertProspectToInquiry] Inquiry creation failed:', inquiryError)
    throw new Error('Failed to create inquiry')
  }

  // Update prospect with conversion link
  await supabase
    .from('prospects')
    .update({
      status: 'converted',
      converted_to_inquiry_id: inquiry.id,
      converted_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  // Add conversion note
  await supabase.from('prospect_notes').insert({
    prospect_id: prospectId,
    chef_id: user.tenantId!,
    note_type: 'general',
    content: `Converted to inquiry #${inquiry.id}`,
  })

  revalidatePath('/prospecting')
  revalidatePath(`/prospecting/${prospectId}`)
  revalidatePath('/inquiries')

  return { success: true as const, inquiryId: inquiry.id }
}

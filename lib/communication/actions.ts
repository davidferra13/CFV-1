'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createInquiry } from '@/lib/inquiries/actions'
import { addClientNote } from '@/lib/notes/actions'
import { isTakeAChefEmail, parseTakeAChefEmail } from '@/lib/gmail/take-a-chef-parser'
import { isYhangryEmail, parseYhangryEmail } from '@/lib/gmail/yhangry-parser'
import { ingestCommunicationEvent, seedDefaultCommunicationRules } from './pipeline'
import { recordSenderAction } from '@/lib/gmail/sender-reputation'
import type {
  CommunicationClassificationRule,
  CommunicationInboxItem,
  CommunicationInboxStats,
  CommunicationTab,
  SuggestedLink,
} from './types'

function mapSourceToInquiryChannel(source: string) {
  switch (source) {
    case 'email':
      return 'email'
    case 'website_form':
      return 'website'
    case 'sms':
    case 'whatsapp':
      return 'text'
    case 'instagram':
      return 'instagram'
    case 'facebook':
      return 'facebook'
    case 'takeachef':
      return 'take_a_chef'
    case 'yhangry':
      return 'yhangry'
    case 'theknot':
      return 'theknot'
    case 'thumbtack':
      return 'thumbtack'
    case 'bark':
      return 'bark'
    case 'cozymeal':
      return 'cozymeal'
    case 'google_business':
      return 'google_business'
    case 'gigsalad':
      return 'gigsalad'
    case 'phone':
      return 'phone'
    default:
      return 'other'
  }
}

function parseSenderIdentity(senderIdentity: string) {
  const emailMatch = senderIdentity.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const email = emailMatch ? emailMatch[0].toLowerCase() : null
  const stripped = senderIdentity
    .replace(email || '', '')
    .replace(/[<>\(\)]/g, '')
    .trim()
  const clientName = stripped || email?.split('@')[0] || 'Unknown client'
  return { clientName, email }
}

async function logAction(input: {
  tenantId: string
  communicationEventId?: string | null
  threadId?: string | null
  actorId?: string | null
  action: string
  source: 'manual' | 'webhook' | 'automation' | 'import'
  previousState: Record<string, unknown>
  newState: Record<string, unknown>
}) {
  const supabase: any = createServerClient({ admin: true })
  await supabase.from('communication_action_log' as any).insert({
    tenant_id: input.tenantId,
    communication_event_id: input.communicationEventId || null,
    thread_id: input.threadId || null,
    actor_id: input.actorId || null,
    action: input.action,
    source: input.source,
    previous_state: input.previousState,
    new_state: input.newState,
  })
}

export async function getCommunicationInbox(
  tab?: CommunicationTab,
  limit = 50
): Promise<
  Array<
    CommunicationInboxItem & {
      suggestions: SuggestedLink[]
      client_name: string | null
      linked_inquiry_title: string | null
      linked_event_title: string | null
    }
  >
> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  await seedDefaultCommunicationRules(user.tenantId!)

  let query = supabase
    .from('communication_inbox_items' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('last_activity_at', { ascending: false })
    .limit(limit)

  if (tab) {
    query = query.eq('tab', tab)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getCommunicationInbox] Error:', error)
    throw new Error('Failed to fetch communication inbox')
  }

  const items = (data || []) as CommunicationInboxItem[]
  const eventIds = items.map((item) => item.communication_event_id)

  const { data: suggestions } = eventIds.length
    ? await supabase
        .from('suggested_links' as any)
        .select(
          'id, communication_event_id, suggested_entity_type, suggested_entity_id, confidence_score, status'
        )
        .eq('tenant_id', user.tenantId!)
        .in('communication_event_id', eventIds)
        .order('confidence_score', { ascending: false })
    : { data: [] as any[] }

  const clientIds = Array.from(
    new Set(items.map((item) => item.client_id).filter(Boolean))
  ) as string[]
  const inquiryIds = Array.from(
    new Set(
      items
        .filter((i) => i.linked_entity_type === 'inquiry' && i.linked_entity_id)
        .map((i) => i.linked_entity_id!)
    )
  )
  const eventLinkIds = Array.from(
    new Set(
      items
        .filter((i) => i.linked_entity_type === 'event' && i.linked_entity_id)
        .map((i) => i.linked_entity_id!)
    )
  )

  const [{ data: clients }, { data: inquiries }, { data: events }] = await Promise.all([
    clientIds.length
      ? supabase
          .from('clients')
          .select('id, full_name')
          .eq('tenant_id', user.tenantId!)
          .in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
    inquiryIds.length
      ? supabase
          .from('inquiries')
          .select('id, confirmed_occasion')
          .eq('tenant_id', user.tenantId!)
          .in('id', inquiryIds)
      : Promise.resolve({ data: [] as any[] }),
    eventLinkIds.length
      ? supabase
          .from('events')
          .select('id, occasion')
          .eq('tenant_id', user.tenantId!)
          .in('id', eventLinkIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const clientNameById = new Map((clients || []).map((c: any) => [c.id, c.full_name]))
  const inquiryTitleById = new Map(
    (inquiries || []).map((i: any) => [i.id, i.confirmed_occasion || 'Inquiry'])
  )
  const eventTitleById = new Map((events || []).map((e: any) => [e.id, e.occasion || 'Event']))

  return items.map((item) => ({
    ...item,
    suggestions: (suggestions || []).filter(
      (s: any) => s.communication_event_id === item.communication_event_id
    ),
    client_name: item.client_id ? String(clientNameById.get(item.client_id) || '') || null : null,
    linked_inquiry_title:
      item.linked_entity_type === 'inquiry' && item.linked_entity_id
        ? String(inquiryTitleById.get(item.linked_entity_id) || 'Inquiry')
        : null,
    linked_event_title:
      item.linked_entity_type === 'event' && item.linked_entity_id
        ? String(eventTitleById.get(item.linked_entity_id) || 'Event')
        : null,
  }))
}

export async function getCommunicationInboxStats(): Promise<CommunicationInboxStats> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('communication_inbox_items' as any)
    .select('tab')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getCommunicationInboxStats] Error:', error)
    return { total: 0, unlinked: 0, needs_attention: 0, snoozed: 0, resolved: 0 }
  }

  const stats: CommunicationInboxStats = {
    total: (data || []).length,
    unlinked: 0,
    needs_attention: 0,
    snoozed: 0,
    resolved: 0,
  }

  for (const row of data || []) {
    const tab = String((row as any).tab)
    if (tab === 'unlinked') stats.unlinked += 1
    if (tab === 'needs_attention') stats.needs_attention += 1
    if (tab === 'snoozed') stats.snoozed += 1
    if (tab === 'resolved') stats.resolved += 1
  }

  return stats
}

export async function linkCommunicationEventToInquiry(
  communicationEventId: string,
  inquiryId: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: current } = await supabase
    .from('communication_events' as any)
    .select('id, tenant_id, thread_id, status, linked_entity_type, linked_entity_id')
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Communication event not found')
  }

  await supabase
    .from('communication_events' as any)
    .update({
      linked_entity_type: 'inquiry',
      linked_entity_id: inquiryId,
      status: 'linked',
    })
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)

  const { error: rejectErr } = await supabase
    .from('suggested_links' as any)
    .update({ status: 'rejected' })
    .eq('tenant_id', user.tenantId!)
    .eq('communication_event_id', communicationEventId)
    .eq('status', 'pending')

  if (rejectErr) {
    console.error('[linkCommunicationEventToInquiry] Failed to reject suggested_links:', rejectErr)
  }

  const { error: acceptErr } = await supabase
    .from('suggested_links' as any)
    .update({ status: 'accepted' })
    .eq('tenant_id', user.tenantId!)
    .eq('communication_event_id', communicationEventId)
    .eq('suggested_entity_type', 'inquiry')
    .eq('suggested_entity_id', inquiryId)

  if (acceptErr) {
    console.error('[linkCommunicationEventToInquiry] Failed to accept suggested_link:', acceptErr)
  }

  await logAction({
    tenantId: user.tenantId!,
    communicationEventId,
    threadId: current.thread_id,
    actorId: user.id,
    action: 'link_to_inquiry',
    source: 'manual',
    previousState: {
      status: current.status,
      linked_entity_type: current.linked_entity_type,
      linked_entity_id: current.linked_entity_id,
    },
    newState: {
      status: 'linked',
      linked_entity_type: 'inquiry',
      linked_entity_id: inquiryId,
    },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function attachCommunicationEventToEvent(
  communicationEventId: string,
  eventId: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: current } = await supabase
    .from('communication_events' as any)
    .select('id, tenant_id, thread_id, status, linked_entity_type, linked_entity_id')
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Communication event not found')
  }

  await supabase
    .from('communication_events' as any)
    .update({
      linked_entity_type: 'event',
      linked_entity_id: eventId,
      status: 'linked',
    })
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)

  const { error: rejectErr } = await supabase
    .from('suggested_links' as any)
    .update({ status: 'rejected' })
    .eq('tenant_id', user.tenantId!)
    .eq('communication_event_id', communicationEventId)
    .eq('status', 'pending')

  if (rejectErr) {
    console.error('[attachCommunicationEventToEvent] Failed to reject suggested_links:', rejectErr)
  }

  const { error: acceptErr } = await supabase
    .from('suggested_links' as any)
    .update({ status: 'accepted' })
    .eq('tenant_id', user.tenantId!)
    .eq('communication_event_id', communicationEventId)
    .eq('suggested_entity_type', 'event')
    .eq('suggested_entity_id', eventId)

  if (acceptErr) {
    console.error('[attachCommunicationEventToEvent] Failed to accept suggested_link:', acceptErr)
  }

  await logAction({
    tenantId: user.tenantId!,
    communicationEventId,
    threadId: current.thread_id,
    actorId: user.id,
    action: 'attach_to_event',
    source: 'manual',
    previousState: {
      status: current.status,
      linked_entity_type: current.linked_entity_type,
      linked_entity_id: current.linked_entity_id,
    },
    newState: {
      status: 'linked',
      linked_entity_type: 'event',
      linked_entity_id: eventId,
    },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function createInquiryFromCommunicationEvent(communicationEventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('communication_events' as any)
    .select(
      'id, tenant_id, source, sender_identity, raw_content, resolved_client_id, thread_id, status, linked_entity_type, linked_entity_id'
    )
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Communication event not found')
  }

  const sender = parseSenderIdentity(String(event.sender_identity || ''))
  const inquiry = await createInquiry({
    channel: mapSourceToInquiryChannel(event.source) as any,
    client_id: event.resolved_client_id,
    client_name: sender.clientName,
    client_email: sender.email || '',
    source_message: event.raw_content || '',
    notes: 'Created from Communication Inbox',
  })

  const inquiryId = inquiry.inquiry?.id

  await supabase
    .from('communication_events' as any)
    .update({
      linked_entity_type: 'inquiry',
      linked_entity_id: inquiryId,
      status: 'linked',
    })
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)

  await logAction({
    tenantId: user.tenantId!,
    communicationEventId,
    threadId: event.thread_id,
    actorId: user.id,
    action: 'create_inquiry_from_communication',
    source: 'manual',
    previousState: {
      status: event.status,
      linked_entity_type: event.linked_entity_type,
      linked_entity_id: event.linked_entity_id,
    },
    newState: {
      status: 'linked',
      linked_entity_type: 'inquiry',
      linked_entity_id: inquiryId,
    },
  })

  revalidatePath('/inbox')
  revalidatePath('/inquiries')
  return { success: true, inquiryId }
}

export async function addInternalNoteFromCommunication(
  communicationEventId: string,
  noteText: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const trimmed = noteText.trim()
  if (!trimmed) {
    throw new Error('Note cannot be empty')
  }

  const { data: event } = await supabase
    .from('communication_events' as any)
    .select('id, tenant_id, thread_id, resolved_client_id')
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Communication event not found')
  }

  if (event.resolved_client_id) {
    await addClientNote({
      client_id: event.resolved_client_id,
      note_text: trimmed,
      category: 'general',
      pinned: false,
    })
  }

  await logAction({
    tenantId: user.tenantId!,
    communicationEventId,
    threadId: event.thread_id,
    actorId: user.id,
    action: 'internal_note_added',
    source: 'manual',
    previousState: {},
    newState: {
      note_text: trimmed,
      persisted_to_client_notes: Boolean(event.resolved_client_id),
    },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function snoozeThread(threadId: string, hours = 24) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: current } = await supabase
    .from('conversation_threads' as any)
    .select('id, state, snoozed_until')
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Thread not found')
  }

  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

  await supabase
    .from('conversation_threads' as any)
    .update({ state: 'snoozed', snoozed_until: snoozedUntil })
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)

  await logAction({
    tenantId: user.tenantId!,
    threadId,
    actorId: user.id,
    action: 'thread_snoozed',
    source: 'manual',
    previousState: { state: current.state, snoozed_until: current.snoozed_until },
    newState: { state: 'snoozed', snoozed_until: snoozedUntil },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function unsnoozeThread(threadId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: current } = await supabase
    .from('conversation_threads' as any)
    .select('id, state, snoozed_until')
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Thread not found')
  }

  await supabase
    .from('conversation_threads' as any)
    .update({ state: 'active', snoozed_until: null })
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)

  await logAction({
    tenantId: user.tenantId!,
    threadId,
    actorId: user.id,
    action: 'thread_unsnoozed',
    source: 'manual',
    previousState: { state: current.state, snoozed_until: current.snoozed_until },
    newState: { state: 'active', snoozed_until: null },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function markCommunicationResolved(communicationEventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('communication_events' as any)
    .select('id, status, thread_id, sender_identity')
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Communication event not found')
  }

  await supabase
    .from('communication_events' as any)
    .update({ status: 'resolved' })
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)

  await supabase
    .from('conversation_threads' as any)
    .update({ state: 'closed', snoozed_until: null })
    .eq('id', event.thread_id)
    .eq('tenant_id', user.tenantId!)

  await logAction({
    tenantId: user.tenantId!,
    communicationEventId,
    threadId: event.thread_id,
    actorId: user.id,
    action: 'communication_resolved',
    source: 'manual',
    previousState: { status: event.status, thread_state: 'active_or_snoozed' },
    newState: { status: 'resolved', thread_state: 'closed' },
  })

  // Non-blocking: record sender reputation (chef dismissed this email)
  if (event.sender_identity) {
    recordSenderAction(user.tenantId!, event.sender_identity, 'mark_done').catch((err) =>
      console.error('[non-blocking] Sender reputation recording failed', err)
    )
  }

  revalidatePath('/inbox')
  return { success: true }
}

export async function reopenCommunication(communicationEventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('communication_events' as any)
    .select('id, status, thread_id')
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Communication event not found')
  }

  const nextStatus = event.status === 'resolved' ? 'linked' : event.status

  await supabase
    .from('communication_events' as any)
    .update({ status: nextStatus })
    .eq('id', communicationEventId)
    .eq('tenant_id', user.tenantId!)

  await supabase
    .from('conversation_threads' as any)
    .update({ state: 'active', snoozed_until: null })
    .eq('id', event.thread_id)
    .eq('tenant_id', user.tenantId!)

  await logAction({
    tenantId: user.tenantId!,
    communicationEventId,
    threadId: event.thread_id,
    actorId: user.id,
    action: 'communication_reopened',
    source: 'manual',
    previousState: { status: event.status, thread_state: 'closed' },
    newState: { status: nextStatus, thread_state: 'active' },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function getCommunicationClassificationRules(): Promise<
  CommunicationClassificationRule[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('communication_classification_rules' as any)
    .select('id, name, is_active, match_field, operator, match_value, label, priority')
    .eq('tenant_id', user.tenantId!)
    .order('priority', { ascending: false })

  if (error) {
    console.error('[getCommunicationClassificationRules] Error:', error)
    return []
  }

  return (data || []) as CommunicationClassificationRule[]
}

export async function toggleThreadStar(threadId: string, starred: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: current } = await supabase
    .from('conversation_threads' as any)
    .select('id, is_starred')
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Thread not found')
  }

  await supabase
    .from('conversation_threads' as any)
    .update({ is_starred: starred })
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)

  await logAction({
    tenantId: user.tenantId!,
    threadId,
    actorId: user.id,
    action: 'thread_star_toggled',
    source: 'manual',
    previousState: { is_starred: current.is_starred },
    newState: { is_starred: starred },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function bulkMarkDone(communicationEventIds: string[]) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })
  const uniqueIds = Array.from(new Set(communicationEventIds))
  if (uniqueIds.length === 0) return { success: true, count: 0 }

  // Fetch all events in one query to get their thread IDs + sender identities
  const { data: events } = await supabase
    .from('communication_events' as any)
    .select('id, status, thread_id, sender_identity')
    .eq('tenant_id', user.tenantId!)
    .in('id', uniqueIds)

  if (!events || events.length === 0) return { success: true, count: 0 }

  const threadIds = Array.from(
    new Set((events as any[]).map((e: any) => e.thread_id).filter(Boolean))
  )

  // Batch update all communication events to resolved
  await supabase
    .from('communication_events' as any)
    .update({ status: 'resolved' })
    .eq('tenant_id', user.tenantId!)
    .in('id', uniqueIds)

  // Batch update all threads to closed
  if (threadIds.length > 0) {
    await supabase
      .from('conversation_threads' as any)
      .update({ state: 'closed', snoozed_until: null })
      .eq('tenant_id', user.tenantId!)
      .in('id', threadIds)
  }

  // Log bulk action once
  await logAction({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'bulk_mark_done',
    source: 'manual',
    previousState: { event_ids: uniqueIds },
    newState: { status: 'resolved', thread_state: 'closed' },
  })

  // Non-blocking: record sender reputation for all dismissed emails
  const senderIdentities = (events as any[])
    .map((e: any) => e.sender_identity)
    .filter(Boolean) as string[]
  for (const identity of senderIdentities) {
    recordSenderAction(user.tenantId!, identity, 'mark_done').catch((err) =>
      console.error('[non-blocking] Bulk sender reputation recording failed', err)
    )
  }

  revalidatePath('/inbox')
  return { success: true, count: uniqueIds.length }
}

export async function bulkSnooze24h(threadIds: string[]) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })
  const uniqueIds = Array.from(new Set(threadIds))
  if (uniqueIds.length === 0) return { success: true, count: 0 }

  const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Batch update all threads to snoozed
  await supabase
    .from('conversation_threads' as any)
    .update({ state: 'snoozed', snoozed_until: snoozedUntil })
    .eq('tenant_id', user.tenantId!)
    .in('id', uniqueIds)

  // Log bulk action once
  await logAction({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'bulk_snooze_24h',
    source: 'manual',
    previousState: { thread_ids: uniqueIds },
    newState: { state: 'snoozed', snoozed_until: snoozedUntil },
  })

  revalidatePath('/inbox')
  return { success: true, count: uniqueIds.length }
}

export async function bulkUnassign(communicationEventIds: string[]) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })
  const uniqueIds = Array.from(new Set(communicationEventIds))
  if (uniqueIds.length === 0) return { success: true, count: 0 }

  const { data: currentRows } = await supabase
    .from('communication_events' as any)
    .select('id, thread_id, linked_entity_type, linked_entity_id, status')
    .eq('tenant_id', user.tenantId!)
    .in('id', uniqueIds)

  await supabase
    .from('communication_events' as any)
    .update({
      linked_entity_type: null,
      linked_entity_id: null,
      status: 'unlinked',
    })
    .eq('tenant_id', user.tenantId!)
    .in('id', uniqueIds)

  for (const row of currentRows || []) {
    await logAction({
      tenantId: user.tenantId!,
      communicationEventId: row.id,
      threadId: row.thread_id,
      actorId: user.id,
      action: 'bulk_unassign',
      source: 'manual',
      previousState: {
        status: row.status,
        linked_entity_type: row.linked_entity_type,
        linked_entity_id: row.linked_entity_id,
      },
      newState: {
        status: 'unlinked',
        linked_entity_type: null,
        linked_entity_id: null,
      },
    })
  }

  revalidatePath('/inbox')
  return { success: true, count: uniqueIds.length }
}

export async function createManualCommunicationLog(input: {
  senderIdentity: string
  content: string
}) {
  const user = await requireChef()
  const sender = input.senderIdentity.trim()
  const content = input.content.trim()

  if (!sender) {
    throw new Error('Sender is required')
  }
  if (!content) {
    throw new Error('Content is required')
  }

  await ingestCommunicationEvent({
    tenantId: user.tenantId!,
    source: 'manual_log',
    senderIdentity: sender,
    rawContent: content,
    direction: 'inbound',
    ingestionSource: 'manual',
    actorId: user.id,
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function upsertCommunicationClassificationRule(
  rule: Omit<CommunicationClassificationRule, 'id'> & { id?: string }
) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  if (rule.id) {
    await supabase
      .from('communication_classification_rules' as any)
      .update({
        name: rule.name,
        is_active: rule.is_active,
        match_field: rule.match_field,
        operator: rule.operator,
        match_value: rule.match_value,
        label: rule.label,
        priority: rule.priority,
      })
      .eq('id', rule.id)
      .eq('tenant_id', user.tenantId!)
  } else {
    await supabase.from('communication_classification_rules' as any).insert({
      tenant_id: user.tenantId!,
      name: rule.name,
      is_active: rule.is_active,
      match_field: rule.match_field,
      operator: rule.operator,
      match_value: rule.match_value,
      label: rule.label,
      priority: rule.priority,
    })
  }

  revalidatePath('/inbox')
  return { success: true }
}

export type TimelineSystemEvent = {
  id: string
  type: 'action' | 'inquiry_transition' | 'event_transition'
  timestamp: string
  label: string
  detail: string | null
}

export type ThreadDetail = {
  thread: {
    id: string
    state: 'active' | 'snoozed' | 'closed'
    snoozed_until: string | null
    is_starred: boolean
    last_activity_at: string
    client_id: string | null
    client_name: string | null
    client_email: string | null
  }
  events: Array<{
    id: string
    timestamp: string
    direction: 'inbound' | 'outbound'
    source: string
    sender_identity: string
    raw_content: string
    linked_entity_type: 'inquiry' | 'event' | null
    linked_entity_id: string | null
    status: string
  }>
  systemEvents: TimelineSystemEvent[]
  linked_inquiry: { id: string; title: string } | null
  linked_event: { id: string; title: string } | null
  suggestions: Array<{
    id: string
    communication_event_id: string
    suggested_entity_type: 'inquiry' | 'event'
    suggested_entity_id: string
    confidence_score: number
    entity_title: string
  }>
  primaryEventId: string | null
}

export async function getThreadWithEvents(threadId: string): Promise<ThreadDetail> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data: thread, error: threadError } = await supabase
    .from('conversation_threads' as any)
    .select('id, state, snoozed_until, is_starred, last_activity_at, client_id')
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (threadError || !thread) {
    throw new Error('Thread not found')
  }

  // Resolve client name + email
  let client_name: string | null = null
  let client_email: string | null = null
  if (thread.client_id) {
    const { data: client } = await supabase
      .from('clients' as any)
      .select('name, email')
      .eq('id', thread.client_id)
      .eq('chef_id', user.tenantId!)
      .single()
    if (client) {
      client_name = client.name ?? null
      client_email = client.email ?? null
    }
  }

  // Fetch all events for this thread in chronological order
  const { data: events, error: eventsError } = await supabase
    .from('communication_events' as any)
    .select(
      'id, timestamp, direction, source, sender_identity, raw_content, linked_entity_type, linked_entity_id, status'
    )
    .eq('thread_id', threadId)
    .eq('tenant_id', user.tenantId!)
    .order('timestamp', { ascending: true })

  if (eventsError) {
    throw new Error('Failed to load thread events')
  }

  // Resolve the most recent linked entity title
  let linked_inquiry: { id: string; title: string } | null = null
  let linked_event: { id: string; title: string } | null = null

  const linkedEvents = (events ?? []).filter((e: any) => e.linked_entity_id)
  const lastLinked = linkedEvents[linkedEvents.length - 1] as any | undefined

  if (lastLinked?.linked_entity_type === 'inquiry' && lastLinked.linked_entity_id) {
    const { data: inquiry } = await supabase
      .from('inquiries' as any)
      .select('id, occasion, event_date')
      .eq('id', lastLinked.linked_entity_id)
      .eq('chef_id', user.tenantId!)
      .single()
    if (inquiry) {
      const label = [
        inquiry.occasion,
        inquiry.event_date ? new Date(inquiry.event_date).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' · ')
      linked_inquiry = { id: inquiry.id, title: label || 'Inquiry' }
    }
  } else if (lastLinked?.linked_entity_type === 'event' && lastLinked.linked_entity_id) {
    const { data: event } = await supabase
      .from('events' as any)
      .select('id, title, event_date')
      .eq('id', lastLinked.linked_entity_id)
      .eq('chef_id', user.tenantId!)
      .single()
    if (event) {
      const label = [
        event.title,
        event.event_date ? new Date(event.event_date).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' · ')
      linked_event = { id: event.id, title: label || 'Event' }
    }
  }

  // Fetch pending suggested links for all events in this thread
  const eventIds = (events ?? []).map((e: any) => e.id)
  const enrichedSuggestions: ThreadDetail['suggestions'] = []

  if (eventIds.length > 0) {
    const { data: rawSuggestions } = await supabase
      .from('suggested_links' as any)
      .select(
        'id, communication_event_id, suggested_entity_type, suggested_entity_id, confidence_score'
      )
      .in('communication_event_id', eventIds)
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false })

    for (const s of rawSuggestions ?? []) {
      let entity_title = 'Unknown'
      if (s.suggested_entity_type === 'inquiry') {
        const { data: inq } = await supabase
          .from('inquiries' as any)
          .select('occasion, event_date')
          .eq('id', s.suggested_entity_id)
          .eq('chef_id', user.tenantId!)
          .single()
        if (inq) {
          entity_title =
            [inq.occasion, inq.event_date ? new Date(inq.event_date).toLocaleDateString() : null]
              .filter(Boolean)
              .join(' · ') || 'Inquiry'
        }
      } else if (s.suggested_entity_type === 'event') {
        const { data: ev } = await supabase
          .from('events' as any)
          .select('title, event_date')
          .eq('id', s.suggested_entity_id)
          .eq('chef_id', user.tenantId!)
          .single()
        if (ev) {
          entity_title =
            [ev.title, ev.event_date ? new Date(ev.event_date).toLocaleDateString() : null]
              .filter(Boolean)
              .join(' · ') || 'Event'
        }
      }
      enrichedSuggestions.push({
        id: s.id,
        communication_event_id: s.communication_event_id,
        suggested_entity_type: s.suggested_entity_type,
        suggested_entity_id: s.suggested_entity_id,
        confidence_score: s.confidence_score,
        entity_title,
      })
    }
  }

  // The most recent event ID — used for Create Inquiry action
  const primaryEventId = eventIds.length > 0 ? eventIds[eventIds.length - 1] : null

  // Fetch system events for the timeline
  const systemEvents: TimelineSystemEvent[] = []

  // 1. Communication action log entries for this thread
  const { data: actionLogs } = await supabase
    .from('communication_action_log' as any)
    .select('id, action, source, created_at, new_state')
    .eq('tenant_id', user.tenantId!)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  const ACTION_LABELS: Record<string, string> = {
    communication_event_ingested: 'Message received',
    communication_classified: 'Auto-classified',
    follow_up_timer_created: 'Follow-up timer set',
    follow_up_timer_completed_on_outbound: 'Follow-up cleared (you replied)',
    link_to_inquiry: 'Linked to inquiry',
    attach_to_event: 'Attached to event',
    create_inquiry_from_communication: 'Inquiry created',
    communication_resolved: 'Marked done',
    communication_reopened: 'Reopened',
    thread_snoozed: 'Snoozed',
    thread_unsnoozed: 'Unsnoozed',
    thread_star_toggled: 'Star toggled',
    internal_note_added: 'Note added',
    suggested_links_generated: 'Suggested links found',
    message_logged_to_thread: 'Message logged',
    bulk_unassign: 'Unassigned',
  }

  for (const log of actionLogs ?? []) {
    // Skip ingested/classified — these are implicit from the messages themselves
    if (
      log.action === 'communication_event_ingested' ||
      log.action === 'communication_classified'
    ) {
      continue
    }
    systemEvents.push({
      id: `action-${log.id}`,
      type: 'action',
      timestamp: log.created_at,
      label: ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' '),
      detail:
        log.action === 'follow_up_timer_created' && log.new_state?.due_at
          ? `Due: ${new Date(log.new_state.due_at as string).toLocaleString()}`
          : null,
    })
  }

  // 2. Inquiry state transitions if thread is linked to an inquiry
  if (linked_inquiry) {
    const { data: inquiryTransitions } = await supabase
      .from('inquiry_state_transitions' as any)
      .select('id, from_status, to_status, transitioned_at, reason')
      .eq('tenant_id', user.tenantId!)
      .eq('inquiry_id', linked_inquiry.id)
      .order('transitioned_at', { ascending: true })

    for (const t of inquiryTransitions ?? []) {
      systemEvents.push({
        id: `inq-tr-${t.id}`,
        type: 'inquiry_transition',
        timestamp: t.transitioned_at,
        label: `Inquiry: ${t.from_status ?? 'new'} → ${t.to_status}`,
        detail: t.reason || null,
      })
    }
  }

  // 3. Event state transitions if thread is linked to an event
  if (linked_event) {
    const { data: eventTransitions } = await supabase
      .from('event_state_transitions' as any)
      .select('id, from_status, to_status, transitioned_at, reason')
      .eq('tenant_id', user.tenantId!)
      .eq('event_id', linked_event.id)
      .order('transitioned_at', { ascending: true })

    for (const t of eventTransitions ?? []) {
      systemEvents.push({
        id: `evt-tr-${t.id}`,
        type: 'event_transition',
        timestamp: t.transitioned_at,
        label: `Event: ${t.from_status ?? 'new'} → ${t.to_status}`,
        detail: t.reason || null,
      })
    }
  }

  return {
    thread: {
      id: thread.id,
      state: thread.state,
      snoozed_until: thread.snoozed_until ?? null,
      is_starred: thread.is_starred ?? false,
      last_activity_at: thread.last_activity_at,
      client_id: thread.client_id ?? null,
      client_name,
      client_email,
    },
    events: events ?? [],
    systemEvents,
    linked_inquiry,
    linked_event,
    suggestions: enrichedSuggestions,
    primaryEventId,
  }
}

export async function logMessageToThread(input: {
  threadId: string
  senderIdentity: string
  content: string
  direction: 'inbound' | 'outbound'
}) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const content = input.content.trim()
  const senderIdentity = input.senderIdentity.trim()
  if (!content) throw new Error('Content is required')

  // Verify thread belongs to this chef
  const { data: thread, error } = await supabase
    .from('conversation_threads' as any)
    .select('id')
    .eq('id', input.threadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !thread) throw new Error('Thread not found')

  const now = new Date().toISOString()

  await supabase.from('communication_events' as any).insert({
    tenant_id: user.tenantId!,
    thread_id: input.threadId,
    source: 'manual_log',
    timestamp: now,
    sender_identity: senderIdentity,
    raw_content: content,
    normalized_content: content.toLowerCase().replace(/\s+/g, ' ').trim(),
    direction: input.direction,
  })

  // Update thread last_activity_at
  await supabase
    .from('conversation_threads' as any)
    .update({ last_activity_at: now })
    .eq('id', input.threadId)

  await logAction({
    tenantId: user.tenantId!,
    threadId: input.threadId,
    actorId: user.id,
    action: 'message_logged_to_thread',
    source: 'manual',
    previousState: {},
    newState: { direction: input.direction, sender_identity: senderIdentity },
  })

  revalidatePath(`/inbox/triage/${input.threadId}`)
  revalidatePath('/inbox')
  return { success: true }
}

// ─── Unread State ─────────────────────────────────────────────

export async function getUnreadThreadCount(): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  // Get all active/snoozed threads
  const { data: threads } = await supabase
    .from('conversation_threads' as any)
    .select('id, last_activity_at')
    .eq('tenant_id', user.tenantId!)
    .in('state', ['active', 'snoozed'])

  if (!threads || threads.length === 0) return 0

  const threadIds = threads.map((t: any) => t.id)

  // Get read receipts
  const { data: reads } = await supabase
    .from('conversation_thread_reads' as any)
    .select('thread_id, last_read_at')
    .eq('tenant_id', user.tenantId!)
    .in('thread_id', threadIds)

  const readMap = new Map((reads || []).map((r: any) => [r.thread_id, r.last_read_at]))

  let unread = 0
  for (const thread of threads) {
    const lastRead = readMap.get(thread.id)
    if (!lastRead || new Date(thread.last_activity_at) > new Date(lastRead as string)) {
      unread++
    }
  }

  return unread
}

export async function markThreadRead(threadId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  await supabase.from('conversation_thread_reads' as any).upsert(
    {
      tenant_id: user.tenantId!,
      thread_id: threadId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,thread_id' }
  )
}

// ─── Raw Feed (unfiltered chronological view) ─────────────────

export async function getRawCommunicationFeed(limit = 100): Promise<
  Array<{
    id: string
    source: string
    timestamp: string
    sender_identity: string
    raw_content: string
    direction: 'inbound' | 'outbound'
    thread_id: string
    status: string
    linked_entity_type: string | null
    is_dinner_opportunity: boolean
    platform: 'takeachef' | 'yhangry' | null
    platform_email_type: string | null
  }>
> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('communication_events' as any)
    .select(
      'id, source, timestamp, sender_identity, raw_content, direction, thread_id, status, linked_entity_type'
    )
    .eq('tenant_id', user.tenantId!)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRawCommunicationFeed] Error:', error)
    return []
  }

  const rows = ((data || []) as any[]).map((row) => {
    const senderIdentity = String(row.sender_identity || '')
    const rawContent = String(row.raw_content || '')
    const source = String(row.source || '')

    const emailMatch = senderIdentity.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    const fromEmail = emailMatch ? emailMatch[0].toLowerCase() : ''

    // Most email ingests store raw_content as "subject\n\nbody". Fall back to whole body.
    const normalized = rawContent.replace(/\r\n/g, '\n')
    const splitIndex = normalized.indexOf('\n\n')
    const subject =
      splitIndex > 0
        ? normalized.slice(0, splitIndex).trim()
        : normalized
            .split('\n')
            .find((line) => line.trim().length > 0)
            ?.trim() || ''
    const body = splitIndex > 0 ? normalized.slice(splitIndex + 2).trim() : normalized

    const syntheticEmail: any = {
      messageId: row.id,
      threadId: row.thread_id,
      from: { name: senderIdentity, email: fromEmail },
      to: '',
      subject,
      body,
      date: row.timestamp || '',
      snippet: body.slice(0, 180),
      labelIds: [],
      listUnsubscribe: '',
      precedence: '',
    }

    if (source === 'takeachef' || isTakeAChefEmail(fromEmail)) {
      const parsed = parseTakeAChefEmail(syntheticEmail)
      const isDinner = [
        'tac_new_inquiry',
        'tac_client_message',
        'tac_booking_confirmed',
        'tac_customer_info',
      ].includes(parsed.emailType)
      return {
        ...row,
        is_dinner_opportunity: isDinner,
        platform: 'takeachef' as const,
        platform_email_type: parsed.emailType,
      }
    }

    if (source === 'yhangry' || isYhangryEmail(fromEmail)) {
      const parsed = parseYhangryEmail(syntheticEmail)
      const isDinner = [
        'yhangry_new_inquiry',
        'yhangry_client_message',
        'yhangry_booking_confirmed',
      ].includes(parsed.emailType)
      return {
        ...row,
        is_dinner_opportunity: isDinner,
        platform: 'yhangry' as const,
        platform_email_type: parsed.emailType,
      }
    }

    return {
      ...row,
      is_dinner_opportunity: false,
      platform: null,
      platform_email_type: null,
    }
  })

  return rows
}

// ─── Send Reply via Channel ───────────────────────────────────

export async function sendReplyViaChannel(input: {
  threadId: string
  content: string
  channel: 'email' | 'sms' | 'whatsapp'
  recipientAddress: string // email address, phone number, or whatsapp number
}) {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const { threadId, content, channel, recipientAddress } = input

  // Verify thread belongs to this chef
  const { data: thread, error: threadErr } = await supabase
    .from('conversation_threads' as any)
    .select('id, client_id')
    .eq('id', threadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (threadErr || !thread) throw new Error('Thread not found')

  // Validate recipient matches thread's known contact
  const { data: latestInboundForValidation } = await supabase
    .from('communication_events' as any)
    .select('sender_identity')
    .eq('thread_id', threadId)
    .eq('tenant_id', user.tenantId!)
    .eq('direction', 'inbound')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestInboundForValidation) {
    const senderIdentity = String((latestInboundForValidation as any).sender_identity || '')
    if (channel === 'email') {
      const emailMatch = senderIdentity.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
      const threadEmail = emailMatch ? emailMatch[0].toLowerCase() : null
      if (threadEmail && threadEmail !== recipientAddress.toLowerCase()) {
        throw new Error('Recipient email does not match the thread contact')
      }
    } else {
      // SMS/WhatsApp: validate phone number matches sender_identity digits
      const senderDigits = senderIdentity.replace(/\D/g, '')
      const recipientDigits = recipientAddress.replace(/\D/g, '')
      if (
        senderDigits &&
        recipientDigits &&
        !senderDigits.endsWith(recipientDigits) &&
        !recipientDigits.endsWith(senderDigits)
      ) {
        throw new Error('Recipient phone does not match the thread contact')
      }
    }
  }

  const now = new Date().toISOString()

  if (channel === 'email') {
    // Send via Gmail API
    const { getPrimaryGoogleAccessTokenForChef } = await import('@/lib/google/mailboxes')
    const { sendEmail } = await import('@/lib/gmail/client')

    const token = await getPrimaryGoogleAccessTokenForChef(user.entityId!)

    // Get thread context for email subject
    const { data: lastInbound } = await supabase
      .from('communication_events' as any)
      .select('raw_content, sender_identity')
      .eq('thread_id', threadId)
      .eq('direction', 'inbound')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    const subject = lastInbound
      ? `Re: ${(lastInbound as any).sender_identity}`
      : 'Message from your chef'

    await sendEmail(token, {
      to: recipientAddress,
      subject,
      body: content,
    })
  } else if (channel === 'sms') {
    const { sendSMS } = await import('@/lib/sms/twilio-client')
    await sendSMS(recipientAddress, content)
  } else if (channel === 'whatsapp') {
    const { sendWhatsApp } = await import('@/lib/sms/twilio-client')
    await sendWhatsApp(recipientAddress, content)
  }

  // Log the sent message as an outbound event
  await supabase.from('communication_events' as any).insert({
    tenant_id: user.tenantId!,
    thread_id: threadId,
    source: channel === 'email' ? 'email' : channel,
    timestamp: now,
    sender_identity: 'Chef',
    raw_content: content,
    normalized_content: content.toLowerCase().replace(/\s+/g, ' ').trim(),
    direction: 'outbound',
  })

  await supabase
    .from('conversation_threads' as any)
    .update({ last_activity_at: now })
    .eq('id', threadId)

  await logAction({
    tenantId: user.tenantId!,
    threadId,
    actorId: user.id,
    action: 'reply_sent_via_channel',
    source: 'manual',
    previousState: {},
    newState: { channel, recipient: recipientAddress },
  })

  revalidatePath(`/inbox/triage/${threadId}`)
  revalidatePath('/inbox')
  return { success: true, channel }
}

// ─── Push Subscriptions ───────────────────────────────────────
// Use lib/push/subscriptions.ts for push subscription CRUD.
// savePushSubscription, removePushSubscription, getActiveSubscriptions,
// deactivateSubscription, incrementSubscriptionFailureCount
// are all exported from that module.

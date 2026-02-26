import { createServerClient } from '@/lib/supabase/server'
import type {
  CommunicationActionSource,
  CommunicationClassificationRule,
  CommunicationEventInput,
} from './types'

const DEFAULT_SILENCE_HOURS = 24

function normalizeContent(raw: string) {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractEmail(identity: string): string | null {
  const match = identity.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

function extractPhone(identity: string): string | null {
  const digits = identity.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : null
}

function buildThreadKey(input: {
  source: string
  externalThreadKey?: string | null
  senderIdentity: string
  resolvedClientId?: string | null
}) {
  if (input.externalThreadKey?.trim()) {
    return `${input.source}:${input.externalThreadKey.trim()}`
  }

  if (input.resolvedClientId) {
    return `${input.source}:client:${input.resolvedClientId}`
  }

  const email = extractEmail(input.senderIdentity)
  if (email) {
    return `${input.source}:email:${email}`
  }

  const phone = extractPhone(input.senderIdentity)
  if (phone) {
    return `${input.source}:phone:${phone}`
  }

  return `${input.source}:sender:${input.senderIdentity.trim().toLowerCase()}`
}

function ruleMatches(rule: CommunicationClassificationRule, values: Record<string, string>) {
  const left = values[rule.match_field] ?? ''
  const right = rule.match_value

  switch (rule.operator) {
    case 'equals':
      return left === right
    case 'starts_with':
      return left.startsWith(right)
    case 'contains':
      return left.includes(right)
    default:
      return false
  }
}

async function logCommunicationAction(input: {
  tenantId: string
  communicationEventId?: string | null
  threadId?: string | null
  actorId?: string | null
  action: string
  source: CommunicationActionSource
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
}) {
  const supabase: any = createServerClient({ admin: true })
  await supabase.from('communication_action_log' as any).insert({
    tenant_id: input.tenantId,
    communication_event_id: input.communicationEventId || null,
    thread_id: input.threadId || null,
    actor_id: input.actorId || null,
    action: input.action,
    source: input.source,
    previous_state: input.previousState || {},
    new_state: input.newState || {},
  })
}

async function resolveClientId(tenantId: string, senderIdentity: string) {
  const supabase: any = createServerClient({ admin: true })

  const email = extractEmail(senderIdentity)
  if (email) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', email)
      .maybeSingle()

    if (client?.id) {
      return client.id as string
    }
  }

  const phone = extractPhone(senderIdentity)
  if (phone) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, phone')
      .eq('tenant_id', tenantId)
      .not('phone', 'is', null)

    const matched = (clients || []).find((client: any) => {
      const clientPhone = String(client.phone || '')
        .replace(/\D/g, '')
        .slice(-10)
      return clientPhone.length === 10 && clientPhone === phone
    })

    if (matched?.id) {
      return matched.id as string
    }
  }

  return null
}

async function getOrCreateThread(input: {
  tenantId: string
  source: string
  senderIdentity: string
  resolvedClientId: string | null
  externalThreadKey?: string | null
  timestamp: string
}) {
  const supabase: any = createServerClient({ admin: true })
  const threadKey = buildThreadKey({
    source: input.source,
    externalThreadKey: input.externalThreadKey,
    senderIdentity: input.senderIdentity,
    resolvedClientId: input.resolvedClientId,
  })

  const { data: existing } = await supabase
    .from('conversation_threads' as any)
    .select('id, state')
    .eq('tenant_id', input.tenantId)
    .eq('external_thread_key', threadKey)
    .maybeSingle()

  if (existing?.id) {
    await supabase
      .from('conversation_threads' as any)
      .update({
        last_activity_at: input.timestamp,
        client_id: input.resolvedClientId,
      })
      .eq('id', existing.id)

    return existing.id as string
  }

  const { data: created, error } = await supabase
    .from('conversation_threads' as any)
    .insert({
      tenant_id: input.tenantId,
      client_id: input.resolvedClientId,
      external_thread_key: threadKey,
      last_activity_at: input.timestamp,
      state: 'active',
    })
    .select('id')
    .single()

  if (error) {
    // Handle concurrent insert racing on unique thread key.
    const { data: retry } = await supabase
      .from('conversation_threads' as any)
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('external_thread_key', threadKey)
      .maybeSingle()

    if (retry?.id) {
      return retry.id as string
    }

    throw new Error(`Failed to create conversation thread: ${error.message}`)
  }

  return created.id as string
}

async function applySilenceTimers(input: {
  tenantId: string
  threadId: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  actionSource: CommunicationActionSource
  actorId?: string | null
}) {
  const supabase: any = createServerClient({ admin: true })

  if (input.direction === 'outbound') {
    const { data: activeTimers } = await supabase
      .from('follow_up_timers' as any)
      .select('id, status, due_at, reason')
      .eq('tenant_id', input.tenantId)
      .eq('thread_id', input.threadId)
      .eq('status', 'active')

    if ((activeTimers || []).length > 0) {
      await supabase
        .from('follow_up_timers' as any)
        .update({ status: 'completed', completed_at: input.timestamp })
        .eq('tenant_id', input.tenantId)
        .eq('thread_id', input.threadId)
        .eq('status', 'active')

      await logCommunicationAction({
        tenantId: input.tenantId,
        threadId: input.threadId,
        actorId: input.actorId,
        action: 'follow_up_timer_completed_on_outbound',
        source: input.actionSource,
        previousState: { timers: activeTimers },
        newState: { status: 'completed', completed_at: input.timestamp },
      })
    }

    return
  }

  // Inbound refreshes silence follow-up timer.
  await supabase
    .from('follow_up_timers' as any)
    .update({ status: 'dismissed', dismissed_at: input.timestamp })
    .eq('tenant_id', input.tenantId)
    .eq('thread_id', input.threadId)
    .eq('status', 'active')

  const dueAt = new Date(
    new Date(input.timestamp).getTime() + DEFAULT_SILENCE_HOURS * 60 * 60 * 1000
  ).toISOString()
  const { data: timer } = await supabase
    .from('follow_up_timers' as any)
    .insert({
      tenant_id: input.tenantId,
      thread_id: input.threadId,
      due_at: dueAt,
      reason: `no_reply_after_${DEFAULT_SILENCE_HOURS}h`,
      status: 'active',
    })
    .select('id, due_at, reason, status')
    .single()

  await logCommunicationAction({
    tenantId: input.tenantId,
    threadId: input.threadId,
    actorId: input.actorId,
    action: 'follow_up_timer_created',
    source: input.actionSource,
    previousState: {},
    newState: timer || {
      due_at: dueAt,
      reason: `no_reply_after_${DEFAULT_SILENCE_HOURS}h`,
      status: 'active',
    },
  })
}

async function classifyCommunication(input: {
  tenantId: string
  normalizedContent: string
  senderIdentity: string
  source: string
  direction: 'inbound' | 'outbound'
}) {
  const supabase: any = createServerClient({ admin: true })

  const { data: rules } = await supabase
    .from('communication_classification_rules' as any)
    .select('id, name, is_active, match_field, operator, match_value, label, priority')
    .eq('tenant_id', input.tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  const values = {
    sender_identity: input.senderIdentity.toLowerCase(),
    normalized_content: input.normalizedContent,
    source: input.source,
    direction: input.direction,
  }

  const matched = ((rules || []) as CommunicationClassificationRule[])
    .filter((rule) => ruleMatches(rule, values))
    .map((rule) => ({ id: rule.id, label: rule.label, priority: rule.priority }))

  return matched
}

async function suggestLinks(input: {
  tenantId: string
  communicationEventId: string
  resolvedClientId: string | null
  actionSource: CommunicationActionSource
  actorId?: string | null
}) {
  if (!input.resolvedClientId) {
    return
  }

  const supabase: any = createServerClient({ admin: true })

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, status')
    .eq('tenant_id', input.tenantId)
    .eq('client_id', input.resolvedClientId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: events } = await supabase
    .from('events')
    .select('id, status, event_date')
    .eq('tenant_id', input.tenantId)
    .eq('client_id', input.resolvedClientId)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })
    .limit(2)

  const suggestions: Array<{
    suggested_entity_type: 'inquiry' | 'event'
    suggested_entity_id: string
    confidence_score: number
  }> = []

  for (const inquiry of inquiries || []) {
    suggestions.push({
      suggested_entity_type: 'inquiry',
      suggested_entity_id: inquiry.id,
      confidence_score: (inquiries?.length || 0) === 1 ? 0.92 : 0.68,
    })
  }

  for (const event of events || []) {
    suggestions.push({
      suggested_entity_type: 'event',
      suggested_entity_id: event.id,
      confidence_score: 0.57,
    })
  }

  for (const suggestion of suggestions) {
    const { data: exists } = await supabase
      .from('suggested_links' as any)
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('communication_event_id', input.communicationEventId)
      .eq('suggested_entity_type', suggestion.suggested_entity_type)
      .eq('suggested_entity_id', suggestion.suggested_entity_id)
      .maybeSingle()

    if (!exists?.id) {
      await supabase.from('suggested_links' as any).insert({
        tenant_id: input.tenantId,
        communication_event_id: input.communicationEventId,
        suggested_entity_type: suggestion.suggested_entity_type,
        suggested_entity_id: suggestion.suggested_entity_id,
        confidence_score: suggestion.confidence_score,
        status: 'pending',
      })
    }
  }

  if (suggestions.length > 0) {
    await logCommunicationAction({
      tenantId: input.tenantId,
      communicationEventId: input.communicationEventId,
      actorId: input.actorId,
      action: 'suggested_links_generated',
      source: input.actionSource,
      previousState: {},
      newState: { count: suggestions.length },
    })
  }
}

export async function ingestCommunicationEvent(input: CommunicationEventInput) {
  const supabase: any = createServerClient({ admin: true })
  const timestamp = input.timestamp || new Date().toISOString()
  const normalizedContent = normalizeContent(input.rawContent)
  const resolvedClientId = await resolveClientId(input.tenantId, input.senderIdentity)

  const threadId = await getOrCreateThread({
    tenantId: input.tenantId,
    source: input.source,
    senderIdentity: input.senderIdentity,
    resolvedClientId,
    externalThreadKey: input.externalThreadKey,
    timestamp,
  })

  const initialStatus = input.linkedEntityType && input.linkedEntityId ? 'linked' : 'unlinked'

  const { data: event, error } = await supabase
    .from('communication_events' as any)
    .insert({
      tenant_id: input.tenantId,
      source: input.source,
      external_id: input.externalId || null,
      timestamp,
      sender_identity: input.senderIdentity,
      resolved_client_id: resolvedClientId,
      thread_id: threadId,
      raw_content: input.rawContent,
      normalized_content: normalizedContent,
      direction: input.direction,
      linked_entity_type: input.linkedEntityType || null,
      linked_entity_id: input.linkedEntityId || null,
      status: initialStatus,
    })
    .select('id, status, linked_entity_type, linked_entity_id')
    .single()

  if (error?.message?.includes('uq_comm_events_external')) {
    const { data: existing } = await supabase
      .from('communication_events' as any)
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('source', input.source)
      .eq('external_id', input.externalId || '')
      .maybeSingle()

    return { id: existing?.id || null, deduped: true }
  }

  if (error || !event?.id) {
    throw new Error(`Failed to ingest communication event: ${error?.message || 'unknown error'}`)
  }

  await logCommunicationAction({
    tenantId: input.tenantId,
    communicationEventId: event.id,
    threadId,
    actorId: input.actorId,
    action: 'communication_event_ingested',
    source: input.ingestionSource,
    previousState: {},
    newState: {
      status: event.status,
      linked_entity_type: event.linked_entity_type,
      linked_entity_id: event.linked_entity_id,
      direction: input.direction,
      source: input.source,
    },
  })

  await applySilenceTimers({
    tenantId: input.tenantId,
    threadId,
    direction: input.direction,
    timestamp,
    actionSource: input.ingestionSource,
    actorId: input.actorId,
  })

  const matchedRules = await classifyCommunication({
    tenantId: input.tenantId,
    normalizedContent,
    senderIdentity: input.senderIdentity,
    source: input.source,
    direction: input.direction,
  })

  if (matchedRules.length > 0) {
    await logCommunicationAction({
      tenantId: input.tenantId,
      communicationEventId: event.id,
      threadId,
      actorId: input.actorId,
      action: 'communication_classified',
      source: input.ingestionSource,
      previousState: {},
      newState: { matched_rules: matchedRules },
    })
  }

  await suggestLinks({
    tenantId: input.tenantId,
    communicationEventId: event.id,
    resolvedClientId,
    actionSource: input.ingestionSource,
    actorId: input.actorId,
  })

  return { id: event.id, threadId, deduped: false }
}

export async function seedDefaultCommunicationRules(tenantId: string) {
  const supabase: any = createServerClient({ admin: true })

  const { data: existing } = await supabase
    .from('communication_classification_rules' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)

  if ((existing || []).length > 0) {
    return
  }

  await supabase.from('communication_classification_rules' as any).insert([
    {
      tenant_id: tenantId,
      name: 'Urgent keyword',
      match_field: 'normalized_content',
      operator: 'contains',
      match_value: 'urgent',
      label: 'urgent_attention',
      priority: 100,
      is_active: true,
    },
    {
      tenant_id: tenantId,
      name: 'Availability question',
      match_field: 'normalized_content',
      operator: 'contains',
      match_value: 'available',
      label: 'availability_request',
      priority: 80,
      is_active: true,
    },
    {
      tenant_id: tenantId,
      name: 'Booking intent',
      match_field: 'normalized_content',
      operator: 'contains',
      match_value: 'book',
      label: 'booking_intent',
      priority: 70,
      is_active: true,
    },
  ])
}

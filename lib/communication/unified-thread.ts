import { createServerClient } from '@/lib/db/server'

// Unified communication thread item, normalized across all channels
export type UnifiedThreadItem = {
  id: string
  type: 'email' | 'sms' | 'chat' | 'phone' | 'note' | 'whatsapp' | 'manual_log' | 'other'
  content: string
  timestamp: string
  direction: 'inbound' | 'outbound'
  channel: string
  read: boolean
  senderName: string | null
  threadId: string | null
  linkedEntityType: 'inquiry' | 'event' | null
  linkedEntityId: string | null
}

export type UnifiedThreadResult = {
  items: UnifiedThreadItem[]
  total: number
  hasMore: boolean
}

export type LastContactInfo = {
  clientId: string
  clientName: string
  lastContactAt: string | null
  lastContactChannel: string | null
  lastContactDirection: 'inbound' | 'outbound' | null
  daysSinceContact: number | null
}

function mapSourceToType(source: string): UnifiedThreadItem['type'] {
  switch (source) {
    case 'email':
      return 'email'
    case 'sms':
    case 'text':
      return 'sms'
    case 'whatsapp':
      return 'whatsapp'
    case 'phone':
      return 'phone'
    case 'manual_log':
      return 'manual_log'
    case 'internal_note':
      return 'note'
    default:
      return 'other'
  }
}

/**
 * Fetch a unified communication thread for a specific client.
 * Merges: communication_events, messages, and client_notes.
 * Results sorted chronologically (newest first by default).
 */
export async function getUnifiedThread(
  clientId: string,
  tenantId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<UnifiedThreadResult> {
  const db: any = createServerClient({ admin: true })
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  // 1. Fetch communication_events linked to this client
  const { data: commEvents, count: commCount } = await db
    .from('communication_events' as any)
    .select(
      'id, timestamp, direction, source, sender_identity, raw_content, thread_id, linked_entity_type, linked_entity_id, status',
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .eq('resolved_client_id', clientId)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  // 2. Fetch messages table entries for this client (legacy + compat messages)
  const { data: messages } = await db
    .from('messages' as any)
    .select(
      'id, direction, channel, content, body, sent_at, created_at, sender_type, inquiry_id, event_id'
    )
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // 3. Fetch client notes
  const { data: notes } = await db
    .from('client_notes' as any)
    .select('id, note_text, created_at, category')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Build unified items from communication_events
  const items: UnifiedThreadItem[] = []
  const seenIds = new Set<string>()

  for (const event of commEvents || []) {
    const id = `comm-${event.id}`
    if (seenIds.has(id)) continue
    seenIds.add(id)

    items.push({
      id,
      type: mapSourceToType(event.source),
      content: event.raw_content || '',
      timestamp: event.timestamp,
      direction: event.direction,
      channel: event.source,
      read: event.status === 'resolved',
      senderName: event.sender_identity || null,
      threadId: event.thread_id || null,
      linkedEntityType: event.linked_entity_type || null,
      linkedEntityId: event.linked_entity_id || null,
    })
  }

  // Merge messages (deduplicate by checking content+timestamp proximity)
  for (const msg of messages || []) {
    const id = `msg-${msg.id}`
    if (seenIds.has(id)) continue

    const msgContent = msg.body || msg.content || ''
    const msgTimestamp = msg.sent_at || msg.created_at

    // Skip if we already have a comm event with matching content within 60s
    const isDuplicate = items.some((item) => {
      if (!item.content || !msgContent) return false
      const timeDiff = Math.abs(
        new Date(item.timestamp).getTime() - new Date(msgTimestamp).getTime()
      )
      return timeDiff < 60000 && item.content.includes(msgContent.slice(0, 50))
    })

    if (isDuplicate) continue
    seenIds.add(id)

    items.push({
      id,
      type: msg.channel === 'email' ? 'email' : msg.channel === 'text' ? 'sms' : 'chat',
      content: msgContent,
      timestamp: msgTimestamp,
      direction: msg.direction || 'outbound',
      channel: msg.channel || 'email',
      read: true,
      senderName: msg.sender_type === 'chef' ? 'Chef' : null,
      threadId: null,
      linkedEntityType: msg.inquiry_id ? 'inquiry' : msg.event_id ? 'event' : null,
      linkedEntityId: msg.inquiry_id || msg.event_id || null,
    })
  }

  // Add notes as internal note items
  for (const note of notes || []) {
    const id = `note-${note.id}`
    if (seenIds.has(id)) continue
    seenIds.add(id)

    items.push({
      id,
      type: 'note',
      content: note.note_text || '',
      timestamp: note.created_at,
      direction: 'outbound',
      channel: 'internal_note',
      read: true,
      senderName: 'Chef',
      threadId: null,
      linkedEntityType: null,
      linkedEntityId: null,
    })
  }

  // Sort chronologically (newest first)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const total = (commCount || 0) + (messages?.length || 0) + (notes?.length || 0)

  return {
    items: items.slice(0, limit),
    total,
    hasMore: items.length > limit || (commCount || 0) > offset + limit,
  }
}

/**
 * Get last contact summary for all clients in a tenant.
 * Returns per-client "last contact" data for recency badges.
 */
export async function getLastContactSummary(tenantId: string): Promise<LastContactInfo[]> {
  const db: any = createServerClient({ admin: true })

  // Get all clients
  const { data: clients } = await db
    .from('clients' as any)
    .select('id, full_name')
    .eq('tenant_id', tenantId)

  if (!clients || clients.length === 0) return []

  // Get the latest communication event per client using conversation_threads
  const { data: latestComms } = await db
    .from('conversation_threads' as any)
    .select('client_id, last_activity_at')
    .eq('tenant_id', tenantId)
    .not('client_id', 'is', null)
    .order('last_activity_at', { ascending: false })

  // Also check messages table for legacy data
  const { data: latestMessages } = await db
    .from('messages' as any)
    .select('client_id, created_at, channel, direction')
    .eq('tenant_id', tenantId)
    .not('client_id', 'is', null)
    .order('created_at', { ascending: false })

  // Build a map of client_id -> latest contact
  const contactMap = new Map<
    string,
    { at: string; channel: string | null; direction: 'inbound' | 'outbound' | null }
  >()

  // Process conversation threads
  for (const thread of latestComms || []) {
    if (!thread.client_id) continue
    const existing = contactMap.get(thread.client_id)
    if (!existing || new Date(thread.last_activity_at) > new Date(existing.at)) {
      contactMap.set(thread.client_id, {
        at: thread.last_activity_at,
        channel: null,
        direction: null,
      })
    }
  }

  // Process messages
  for (const msg of latestMessages || []) {
    if (!msg.client_id) continue
    const existing = contactMap.get(msg.client_id)
    if (!existing || new Date(msg.created_at) > new Date(existing.at)) {
      contactMap.set(msg.client_id, {
        at: msg.created_at,
        channel: msg.channel || null,
        direction: msg.direction || null,
      })
    }
  }

  const now = Date.now()

  return clients.map((client: any) => {
    const contact = contactMap.get(client.id)
    const lastContactAt = contact?.at || null
    const daysSinceContact = lastContactAt
      ? Math.floor((now - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      clientId: client.id,
      clientName: client.full_name,
      lastContactAt,
      lastContactChannel: contact?.channel || null,
      lastContactDirection: contact?.direction || null,
      daysSinceContact,
    }
  })
}

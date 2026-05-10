'use server'

// Remy - Server-side conversation persistence
// CRUD for remy_conversations + remy_messages tables.
// Supplements IndexedDB with cross-device, searchable history.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RemyConversation,
  RemyMessageRow,
  ConversationWithPreview,
  RemyConciergeContext,
} from './types'
import { getCILInsights } from '@/lib/cil/api'

// ─── Conversations ──────────────────────────────────────────────────────────

export async function createConversation(title?: string): Promise<RemyConversation> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_conversations')
    .insert({
      tenant_id: user.tenantId,
      title: title || 'New conversation',
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)
  return data
}

export async function getConversations(
  opts: { archived?: boolean; limit?: number; offset?: number } = {}
): Promise<ConversationWithPreview[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { archived = false, limit = 50, offset = 0 } = opts

  // Get conversations with message count
  const { data: convos, error } = await db
    .from('remy_conversations')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('archived', archived)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Failed to load conversations: ${error.message}`)
  if (!convos || convos.length === 0) return []

  // Get message counts and last message preview for each conversation
  const ids = convos.map((c: RemyConversation) => c.id)

  const { data: msgStats } = await db
    .rpc('remy_conversation_stats', { conversation_ids: ids })
    .catch(() => ({ data: null }))

  // If RPC doesn't exist yet, build stats manually
  const statsMap = new Map<string, { count: number; preview: string | null }>()
  if (msgStats) {
    for (const s of msgStats) {
      statsMap.set(s.conversation_id, {
        count: s.message_count,
        preview: s.last_message,
      })
    }
  } else {
    // Fallback: get last message per conversation
    for (const c of convos) {
      const { data: lastMsg } = await db
        .from('remy_messages')
        .select('content')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count } = await db
        .from('remy_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)

      statsMap.set(c.id, {
        count: count || 0,
        preview: lastMsg?.content?.slice(0, 120) || null,
      })
    }
  }

  return convos.map((c: RemyConversation) => ({
    ...c,
    message_count: statsMap.get(c.id)?.count || 0,
    last_message_preview: statsMap.get(c.id)?.preview || null,
  }))
}

export async function getConversation(
  conversationId: string
): Promise<{ conversation: RemyConversation; messages: RemyMessageRow[] } | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: convo, error } = await db
    .from('remy_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (error || !convo) return null

  const { data: messages } = await db
    .from('remy_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return { conversation: convo, messages: messages || [] }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to update title: ${error.message}`)
}

export async function toggleConversationPin(conversationId: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('remy_conversations')
    .select('pinned')
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!data) throw new Error('Conversation not found')

  const newPinned = !data.pinned
  await db
    .from('remy_conversations')
    .update({ pinned: newPinned, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)

  return newPinned
}

export async function toggleConversationArchive(conversationId: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('remy_conversations')
    .select('archived')
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!data) throw new Error('Conversation not found')

  const newArchived = !data.archived
  await db
    .from('remy_conversations')
    .update({ archived: newArchived, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)

  return newArchived
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Messages cascade-deleted via FK
  const { error } = await db
    .from('remy_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete conversation: ${error.message}`)
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function saveMessage(
  conversationId: string,
  message: {
    role: 'user' | 'remy'
    content: string
    tasks?: unknown
    nav_suggestions?: unknown
    quick_replies?: string[]
  }
): Promise<RemyMessageRow> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_messages')
    .insert({
      conversation_id: conversationId,
      tenant_id: user.tenantId,
      role: message.role,
      content: message.content,
      tasks: message.tasks || null,
      nav_suggestions: message.nav_suggestions || null,
      quick_replies: message.quick_replies || null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to save message: ${error.message}`)

  // Update conversation timestamp and auto-title from first user message
  await db
    .from('remy_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('tenant_id', user.tenantId)

  return data
}

export async function setMessageFeedback(
  messageId: string,
  feedback: 'up' | 'down' | null
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_messages')
    .update({ feedback })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to set feedback: ${error.message}`)
}

export async function toggleMessagePin(messageId: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('remy_messages')
    .select('pinned')
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!data) throw new Error('Message not found')

  const newPinned = !data.pinned
  await db
    .from('remy_messages')
    .update({ pinned: newPinned })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId)

  return newPinned
}

// ─── Search ─────────────────────────────────────────────────────────────────

export async function searchConversations(
  query: string,
  limit = 20
): Promise<
  Array<{
    conversation: RemyConversation
    matching_message: string
    message_created_at: string
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Use full-text search on messages
  const { data: messages, error } = await db
    .from('remy_messages')
    .select('conversation_id, content, created_at')
    .eq('tenant_id', user.tenantId)
    .textSearch('content', query, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !messages || messages.length === 0) return []

  // Get parent conversations
  const convoIds = [...new Set(messages.map((m: any) => m.conversation_id))]
  const { data: convos } = await db.from('remy_conversations').select('*').in('id', convoIds)

  const convoMap = new Map((convos || []).map((c: RemyConversation) => [c.id, c]))

  return messages
    .filter((m: any) => convoMap.has(m.conversation_id))
    .map((m: any) => ({
      conversation: convoMap.get(m.conversation_id)!,
      matching_message: m.content.slice(0, 200),
      message_created_at: m.created_at,
    }))
}

// ─── Concierge Context ──────────────────────────────────────────────────────

export async function loadConciergeContext(): Promise<RemyConciergeContext> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [eventsRes, tasksRes, inboxRes, quotesRes, cilInsights] = await Promise.all([
    // Upcoming events (7 days)
    db
      .from('events')
      .select('id, title, event_date, guest_count, status')
      .eq('tenant_id', tenantId)
      .gte('event_date', now.toISOString())
      .lte('event_date', weekFromNow)
      .order('event_date', { ascending: true })
      .limit(10),

    // Overdue tasks
    db
      .from('tasks')
      .select('id, title, due_date')
      .eq('tenant_id', tenantId)
      .eq('completed', false)
      .lt('due_date', now.toISOString())
      .order('due_date', { ascending: true })
      .limit(10),

    // Unread inbox count
    db
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('read', false),

    // Pending quotes
    db
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'draft'),

    // CIL insights
    getCILInsights(tenantId).catch(() => null),
  ])

  return {
    upcoming_events: (eventsRes.data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.event_date,
      guest_count: e.guest_count || 0,
      status: e.status,
    })),
    overdue_tasks: (tasksRes.data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
    })),
    unread_inbox: inboxRes.count || 0,
    pending_quotes: quotesRes.count || 0,
    cil_insights:
      cilInsights?.insights
        ?.filter((i: any) => i.severity === 'high' || i.severity === 'medium')
        ?.slice(0, 5)
        ?.map((i: any) => ({
          title: i.title,
          detail: i.detail,
          severity: i.severity,
        })) || [],
  }
}

// ─── Auto-title ─────────────────────────────────────────────────────────────

export async function autoTitleConversation(
  conversationId: string,
  firstUserMessage: string
): Promise<string> {
  // Generate a short title from the first message (no LLM needed)
  const title = firstUserMessage
    .replace(/[#*_~`]/g, '')
    .trim()
    .slice(0, 60)
    .replace(/\s+/g, ' ')
    .trim()

  if (title) {
    const user = await requireChef()
    const db: any = createServerClient()
    await db
      .from('remy_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('tenant_id', user.tenantId)
  }

  return title || 'New conversation'
}

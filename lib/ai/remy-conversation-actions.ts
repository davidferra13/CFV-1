'use server'

// Remy Conversation Actions - create, list, load, and manage conversation threads
// PRIVACY: Conversations are tenant-scoped. RLS on the tables enforces ownership.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import type { RemyMessage } from '@/lib/ai/remy-types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RemyConversation {
  id: string
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastMessage?: string
}

// ─── Create Conversation ───────────────────────────────────────────────────

export async function createConversation(): Promise<{ id: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_conversations')
    .insert({ tenant_id: tenantId })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)
  return { id: data.id }
}

// ─── List Conversations ────────────────────────────────────────────────────

export async function listConversations(options?: {
  limit?: number
  offset?: number
}): Promise<{ conversations: RemyConversation[]; total: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const limit = options?.limit ?? 30
  const offset = options?.offset ?? 0

  const { data, error, count } = await db
    .from('remy_conversations')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Failed to list conversations: ${error.message}`)

  // Get last message for each conversation for preview
  const conversationIds = (data ?? []).map((c: Record<string, unknown>) => c.id as string)

  let lastMessages: Record<string, string> = {}
  if (conversationIds.length > 0) {
    const { data: msgs } = await db
      .from('remy_messages')
      .select('conversation_id, content')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })

    // Get the most recent message per conversation
    for (const msg of msgs ?? []) {
      const convId = msg.conversation_id as string
      if (!lastMessages[convId]) {
        const content = msg.content as string
        lastMessages[convId] = content.length > 80 ? content.slice(0, 77) + '...' : content
      }
    }
  }

  const conversations: RemyConversation[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastMessage: lastMessages[row.id as string],
  }))

  return { conversations, total: count ?? 0 }
}

// ─── Load Messages ─────────────────────────────────────────────────────────

export async function loadConversationMessages(conversationId: string): Promise<RemyMessage[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load messages: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    role: row.role as 'user' | 'remy',
    content: row.content as string,
    timestamp: row.created_at as string,
    tasks: row.tasks as RemyMessage['tasks'],
    navSuggestions: row.nav_suggestions as RemyMessage['navSuggestions'],
  }))
}

// ─── Save Message ──────────────────────────────────────────────────────────

export async function saveConversationMessage(input: {
  conversationId: string
  role: 'user' | 'remy'
  content: string
  tasks?: unknown
  navSuggestions?: unknown
}): Promise<{ id: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_messages')
    .insert({
      conversation_id: input.conversationId,
      tenant_id: tenantId,
      role: input.role,
      content: input.content,
      tasks: input.tasks ?? null,
      nav_suggestions: input.navSuggestions ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save message: ${error.message}`)

  // Touch the conversation's updated_at so it sorts to the top
  await db
    .from('remy_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversationId)
    .eq('tenant_id', tenantId)

  return { id: data.id }
}

// ─── Auto-Title Conversation ───────────────────────────────────────────────

const TitleSchema = z.object({
  title: z.string().describe('A short 3-6 word title summarizing the conversation topic'),
})

export async function autoTitleConversation(
  conversationId: string,
  userMessage: string,
  remyResponse: string
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  try {
    const result = await parseWithOllama(
      'Generate a short title (3-6 words) for this conversation. Return JSON: { "title": "..." }',
      `User: ${userMessage}\nAssistant: ${remyResponse.slice(0, 200)}`,
      TitleSchema,
      { modelTier: 'fast', cache: false }
    )

    await db
      .from('remy_conversations')
      .update({ title: result.title })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
  } catch (err) {
    // Non-blocking - if title generation fails, keep the default
    console.error('[non-blocking] Auto-title failed:', err)
  }
}

// ─── Delete Message ────────────────────────────────────────────────────────

export async function deleteConversationMessage(messageId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_messages')
    .delete()
    .eq('id', messageId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete message: ${error.message}`)
}

// ─── Summarize Conversation (for long threads) ────────────────────────────────

/**
 * Summarize older messages in a conversation to compress context.
 * Keeps the last `keepRecent` messages intact and summarizes the rest.
 */
export async function summarizeConversationHistory(
  messages: RemyMessage[],
  keepRecent = 10
): Promise<{ summary: string; recentMessages: RemyMessage[] }> {
  if (messages.length <= keepRecent) {
    return { summary: '', recentMessages: messages }
  }

  const olderMessages = messages.slice(0, -keepRecent)
  const recentMessages = messages.slice(-keepRecent)

  const condensed = olderMessages
    .map((m) => {
      const role = m.role === 'user' ? 'Chef' : 'Remy'
      const content = m.content.length > 200 ? m.content.slice(0, 197) + '...' : m.content
      return `${role}: ${content}`
    })
    .join('\n')

  try {
    const SummarySchema = z.object({
      summary: z
        .string()
        .describe(
          'A concise 2-4 sentence summary of the earlier conversation, highlighting key topics discussed and any decisions or facts established'
        ),
    })

    const result = await parseWithOllama(
      'Summarize this earlier conversation between a chef and their AI assistant Remy. Keep it concise - 2-4 sentences capturing the key topics, decisions, and facts.',
      condensed,
      SummarySchema,
      { modelTier: 'fast', cache: false }
    )

    return { summary: result.summary, recentMessages }
  } catch {
    const manualSummary = `Earlier in this conversation (${olderMessages.length} messages), the chef and Remy discussed: ${olderMessages
      .slice(0, 3)
      .map((m) => m.content.slice(0, 50))
      .join(', ')}...`
    return { summary: manualSummary, recentMessages }
  }
}

// ─── Export Conversation ──────────────────────────────────────────────────────

export async function exportConversation(
  conversationId: string,
  format: 'text' | 'markdown' = 'markdown'
): Promise<{ title: string; content: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: conv } = await db
    .from('remy_conversations')
    .select('title')
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .single()

  const title = (conv?.title as string) ?? 'Remy Conversation'
  const messages = await loadConversationMessages(conversationId)

  if (format === 'markdown') {
    const lines = [`# ${title}`, `_Exported from ChefFlow Remy_\n`]
    for (const msg of messages) {
      const role = msg.role === 'user' ? '**Chef**' : '**Remy**'
      const time = new Date(msg.timestamp).toLocaleString()
      lines.push(`${role} _(${time})_`)
      lines.push(msg.content)
      lines.push('')
    }
    return { title, content: lines.join('\n') }
  }

  const lines = [`${title}\n${'='.repeat(title.length)}\n`]
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'Chef' : 'Remy'
    const time = new Date(msg.timestamp).toLocaleString()
    lines.push(`[${time}] ${role}:`)
    lines.push(msg.content)
    lines.push('')
  }
  return { title, content: lines.join('\n') }
}

// ─── Delete Conversation (soft) ────────────────────────────────────────────

export async function deleteConversation(conversationId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_conversations')
    .update({ is_active: false })
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete conversation: ${error.message}`)
}

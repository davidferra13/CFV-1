// Real-Time Chat Server Actions
// Handles conversations, messages, read receipts, and image uploads
// Both chefs and clients can participate — uses requireAuth() as base guard

'use server'

import { requireAuth, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  Conversation,
  ConversationWithDetails,
  ChatMessage,
  ConversationParticipant,
} from './types'

// ============================================
// CONSTANTS
// ============================================

const CHAT_BUCKET = 'chat-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateConversationSchema = z.object({
  client_id: z.string().uuid(),
  context_type: z.enum(['standalone', 'inquiry', 'event']).default('standalone'),
  inquiry_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  initial_message: z.string().min(1).optional(),
}).refine(
  (data) => {
    if (data.context_type === 'inquiry') return !!data.inquiry_id
    if (data.context_type === 'event') return !!data.event_id
    return true
  },
  { message: 'Context type must have matching ID set' }
)

const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  message_type: z.enum(['text', 'image', 'link', 'event_ref']).default('text'),
  body: z.string().optional(),
  link_url: z.string().url().optional(),
  referenced_event_id: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.message_type === 'text') return !!data.body?.trim()
    if (data.message_type === 'link') return !!data.link_url
    if (data.message_type === 'event_ref') return !!data.referenced_event_id
    return true
  },
  { message: 'Message must have content matching its type' }
)

const GetMessagesSchema = z.object({
  conversation_id: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

/**
 * Create a new conversation (chef only).
 * Adds both the chef and the specified client as participants.
 */
export async function createConversation(input: z.infer<typeof CreateConversationSchema>) {
  const user = await requireChef()
  const validated = CreateConversationSchema.parse(input)
  const supabase = createServerClient()

  // Verify client belongs to this tenant
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, auth_user_id, tenant_id')
    .eq('id', validated.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    throw new Error('Client not found or does not belong to your tenant')
  }

  // Create the conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      tenant_id: user.tenantId!,
      context_type: validated.context_type,
      inquiry_id: validated.inquiry_id ?? null,
      event_id: validated.event_id ?? null,
    })
    .select()
    .single()

  if (convError || !conversation) {
    console.error('[createConversation] Error:', convError)
    throw new Error('Failed to create conversation')
  }

  // Add both participants
  const participants = [
    { conversation_id: conversation.id, auth_user_id: user.id, role: 'chef' as const },
  ]

  // Only add client as participant if they have an auth account
  if (client.auth_user_id) {
    participants.push({
      conversation_id: conversation.id,
      auth_user_id: client.auth_user_id,
      role: 'client' as const,
    })
  }

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants)

  if (partError) {
    console.error('[createConversation] Participant error:', partError)
    // Cleanup: delete the conversation if we can't add participants
    await supabase.from('conversations').delete().eq('id', conversation.id)
    throw new Error('Failed to add participants to conversation')
  }

  // Send initial message if provided
  if (validated.initial_message) {
    await supabase.from('chat_messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      message_type: 'text',
      body: validated.initial_message,
    })
  }

  revalidatePath('/chat')
  return { success: true as const, conversation: conversation as Conversation }
}

/**
 * Get or create a conversation for a specific context.
 * Used when opening chat from an event/inquiry page.
 */
export async function getOrCreateConversation(input: {
  client_id: string
  context_type?: 'standalone' | 'inquiry' | 'event'
  inquiry_id?: string
  event_id?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()
  const contextType = input.context_type || 'standalone'

  // Try to find existing conversation
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (contextType === 'event' && input.event_id) {
    query = query.eq('event_id', input.event_id).eq('context_type', 'event')
  } else if (contextType === 'inquiry' && input.inquiry_id) {
    query = query.eq('inquiry_id', input.inquiry_id).eq('context_type', 'inquiry')
  } else {
    // Standalone: find conversation with this client that has no context
    query = query.eq('context_type', 'standalone')
    // Need to check participants for the client
  }

  const { data: existing } = await query.limit(1).single()

  if (existing) {
    return { success: true as const, conversation: existing as Conversation, created: false }
  }

  // Create new conversation
  const result = await createConversation({
    client_id: input.client_id,
    context_type: contextType,
    inquiry_id: input.inquiry_id ?? null,
    event_id: input.event_id ?? null,
  })

  return { ...result, created: true }
}

/**
 * Get conversation inbox for the current user.
 * Chefs see all tenant conversations; clients see only their own.
 */
export async function getConversationInbox(): Promise<ConversationWithDetails[]> {
  const user = await requireAuth()
  const supabase = createServerClient()

  // Get conversations the user participates in
  const { data: participantRows, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('auth_user_id', user.id)

  if (partError || !participantRows?.length) {
    return []
  }

  const conversationIds = participantRows.map((p) => p.conversation_id)

  // Fetch conversations with participants
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select(`
      *,
      conversation_participants (
        id,
        auth_user_id,
        role,
        last_read_at,
        notifications_muted,
        joined_at
      )
    `)
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (convError || !conversations) {
    console.error('[getConversationInbox] Error:', convError)
    return []
  }

  // Get unread counts via RPC
  const { data: unreadData } = await supabase.rpc('get_unread_counts', {
    p_user_id: user.id,
  })

  const unreadMap = new Map<string, number>()
  if (unreadData) {
    for (const row of unreadData) {
      unreadMap.set(row.conversation_id, Number(row.unread_count))
    }
  }

  // Resolve participant names
  // Collect all auth_user_ids that aren't the current user
  const otherUserIds = new Set<string>()
  for (const conv of conversations) {
    const participants = (conv as any).conversation_participants || []
    for (const p of participants) {
      if (p.auth_user_id !== user.id) {
        otherUserIds.add(p.auth_user_id)
      }
    }
  }

  // Batch-fetch names: check chefs table first, then clients
  const nameMap = new Map<string, { name: string; email: string }>()

  if (otherUserIds.size > 0) {
    const userIdArray = Array.from(otherUserIds)

    // Get chef names
    const { data: chefs } = await supabase
      .from('chefs')
      .select('auth_user_id, business_name, email')
      .in('auth_user_id', userIdArray)

    if (chefs) {
      for (const c of chefs) {
        nameMap.set(c.auth_user_id, { name: c.business_name, email: c.email })
      }
    }

    // Get client names
    const { data: clients } = await supabase
      .from('clients')
      .select('auth_user_id, full_name, email')
      .in('auth_user_id', userIdArray)

    if (clients) {
      for (const c of clients) {
        if (c.auth_user_id) {
          nameMap.set(c.auth_user_id, { name: c.full_name, email: c.email })
        }
      }
    }
  }

  // Build enriched results
  return conversations.map((conv) => {
    const participants = (conv as any).conversation_participants || []
    const otherParticipant = participants.find(
      (p: ConversationParticipant) => p.auth_user_id !== user.id
    )

    const otherInfo = otherParticipant
      ? nameMap.get(otherParticipant.auth_user_id)
      : undefined

    return {
      id: conv.id,
      tenant_id: conv.tenant_id,
      context_type: conv.context_type as any,
      inquiry_id: conv.inquiry_id,
      event_id: conv.event_id,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      last_message_sender_id: conv.last_message_sender_id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants,
      unread_count: unreadMap.get(conv.id) || 0,
      other_participant_name: otherInfo?.name,
      other_participant_email: otherInfo?.email,
    }
  })
}

/**
 * Get a single conversation by ID (with participant verification).
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const user = await requireAuth()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (error || !data) return null

  // RLS handles access control, but double-check participation
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('auth_user_id', user.id)
    .single()

  if (!participant) return null

  return data as Conversation
}

/**
 * Get participants of a conversation.
 */
export async function getConversationParticipants(
  conversationId: string
): Promise<(ConversationParticipant & { name: string; email: string })[]> {
  const user = await requireAuth()
  const supabase = createServerClient()

  const { data: participants, error } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)

  if (error || !participants) return []

  // Resolve names
  const results: (ConversationParticipant & { name: string; email: string })[] = []

  for (const p of participants) {
    let name = 'Unknown'
    let email = ''

    if (p.role === 'chef') {
      const { data: chef } = await supabase
        .from('chefs')
        .select('business_name, email')
        .eq('auth_user_id', p.auth_user_id)
        .single()
      if (chef) {
        name = chef.business_name
        email = chef.email
      }
    } else {
      const { data: client } = await supabase
        .from('clients')
        .select('full_name, email')
        .eq('auth_user_id', p.auth_user_id)
        .single()
      if (client) {
        name = client.full_name
        email = client.email
      }
    }

    results.push({ ...p, name, email } as any)
  }

  return results
}

// ============================================
// MESSAGES
// ============================================

/**
 * Send a chat message (text, link, or event reference).
 */
export async function sendChatMessage(input: z.infer<typeof SendMessageSchema>) {
  const user = await requireAuth()
  const validated = SendMessageSchema.parse(input)
  const supabase = createServerClient()

  // Verify participation (RLS also enforces this)
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', validated.conversation_id)
    .eq('auth_user_id', user.id)
    .single()

  if (!participant) {
    throw new Error('You are not a participant in this conversation')
  }

  const insertData: Record<string, unknown> = {
    conversation_id: validated.conversation_id,
    sender_id: user.id,
    message_type: validated.message_type,
    body: validated.body ?? null,
  }

  if (validated.message_type === 'link' && validated.link_url) {
    insertData.link_url = validated.link_url
  }

  if (validated.message_type === 'event_ref' && validated.referenced_event_id) {
    insertData.referenced_event_id = validated.referenced_event_id
    if (!validated.body) {
      insertData.body = 'Shared an event'
    }
  }

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert(insertData)
    .select()
    .single()

  if (error || !message) {
    console.error('[sendChatMessage] Error:', error)
    throw new Error('Failed to send message')
  }

  // Auto-mark as read for sender
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', validated.conversation_id)
    .eq('auth_user_id', user.id)

  return { success: true as const, message: message as ChatMessage }
}

/**
 * Upload an image and send it as a chat message.
 */
export async function sendImageMessage(conversationId: string, formData: FormData) {
  const user = await requireAuth()
  const supabase = createServerClient()

  // Verify participation
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('auth_user_id', user.id)
    .single()

  if (!participant) {
    throw new Error('You are not a participant in this conversation')
  }

  // Get the conversation's tenant_id for storage path
  const { data: conversation } = await supabase
    .from('conversations')
    .select('tenant_id')
    .eq('id', conversationId)
    .single()

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const file = formData.get('image') as File | null
  const caption = formData.get('caption') as string | null

  if (!file) {
    throw new Error('No file provided')
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Accepted: JPEG, PNG, HEIC, WebP`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`)
  }

  // Generate a unique ID for the message first (we need it for storage path)
  const messageId = crypto.randomUUID()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `${conversation.tenant_id}/${conversationId}/${messageId}.${ext}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[sendImageMessage] Upload error:', uploadError)
    throw new Error(`Failed to upload image: ${uploadError.message}`)
  }

  // Create the chat message
  const { data: message, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      id: messageId,
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: 'image',
      body: caption || null,
      attachment_storage_path: storagePath,
      attachment_filename: file.name,
      attachment_content_type: file.type,
      attachment_size_bytes: file.size,
    })
    .select()
    .single()

  if (msgError || !message) {
    console.error('[sendImageMessage] Message error:', msgError)
    // Cleanup uploaded file
    await supabase.storage.from(CHAT_BUCKET).remove([storagePath])
    throw new Error('Failed to create message')
  }

  // Auto-mark as read for sender
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('auth_user_id', user.id)

  return { success: true as const, message: message as ChatMessage }
}

/**
 * Get messages for a conversation with cursor-based pagination.
 * Returns newest messages first (scroll up for older).
 */
export async function getConversationMessages(input: z.infer<typeof GetMessagesSchema>) {
  const user = await requireAuth()
  const validated = GetMessagesSchema.parse(input)
  const supabase = createServerClient()

  // Fetch one extra to determine hasMore
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', validated.conversation_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(validated.limit + 1)

  if (validated.cursor) {
    query = query.lt('created_at', validated.cursor)
  }

  const { data: messages, error } = await query

  if (error || !messages) {
    console.error('[getConversationMessages] Error:', error)
    return { messages: [] as ChatMessage[], nextCursor: null, hasMore: false }
  }

  const hasMore = messages.length > validated.limit
  const trimmed = hasMore ? messages.slice(0, validated.limit) : messages

  return {
    messages: trimmed as ChatMessage[],
    nextCursor: hasMore ? trimmed[trimmed.length - 1].created_at : null,
    hasMore,
  }
}

// ============================================
// READ RECEIPTS / UNREAD COUNTS
// ============================================

/**
 * Mark a conversation as read (updates last_read_at).
 */
export async function markConversationRead(conversationId: string) {
  const user = await requireAuth()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[markConversationRead] Error:', error)
    throw new Error('Failed to mark conversation as read')
  }

  return { success: true as const }
}

/**
 * Get unread counts for all conversations.
 */
export async function getUnreadCounts(): Promise<Record<string, number>> {
  const user = await requireAuth()
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('get_unread_counts', {
    p_user_id: user.id,
  })

  if (error || !data) {
    console.error('[getUnreadCounts] Error:', error)
    return {}
  }

  const result: Record<string, number> = {}
  for (const row of data) {
    result[row.conversation_id] = Number(row.unread_count)
  }
  return result
}

/**
 * Get total unread count (for nav badge).
 */
export async function getTotalUnreadCount(): Promise<number> {
  const user = await requireAuth()
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('get_total_unread_count', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('[getTotalUnreadCount] Error:', error)
    return 0
  }

  return Number(data) || 0
}

// ============================================
// IMAGE URLS
// ============================================

/**
 * Get a signed URL for a chat image attachment.
 * Verifies the caller is a participant in the message's conversation.
 */
export async function getChatImageUrl(messageId: string): Promise<string | null> {
  const user = await requireAuth()
  const supabase = createServerClient()

  // Get the message and verify access via RLS
  const { data: message, error } = await supabase
    .from('chat_messages')
    .select('attachment_storage_path, conversation_id')
    .eq('id', messageId)
    .single()

  if (error || !message?.attachment_storage_path) {
    return null
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedUrlData, error: signError } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(message.attachment_storage_path, 3600)

  if (signError) {
    console.error('[getChatImageUrl] Signed URL error:', signError)
    return null
  }

  return signedUrlData.signedUrl
}

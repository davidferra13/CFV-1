'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/types/database'
import type { HubMessage, HubPinnedNote } from './types'

// ---------------------------------------------------------------------------
// Hub Messages - Public (token-validated in app layer)
// ---------------------------------------------------------------------------

const PostMessageSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  body: z.string().min(1).max(2000),
  reply_to_message_id: z.string().uuid().optional().nullable(),
  media_urls: z.array(z.string()).optional(),
  media_captions: z.array(z.string()).optional(),
})

/**
 * Post a text message to a hub group thread.
 */
export async function postHubMessage(
  input: z.infer<typeof PostMessageSchema>
): Promise<HubMessage> {
  const validated = PostMessageSchema.parse(input)
  const supabase: any = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('Not a member of this group')
  if (!membership.can_post) throw new Error('You do not have permission to post')

  // Determine message type
  const messageType = validated.media_urls && validated.media_urls.length > 0 ? 'image' : 'text'

  const { data, error } = await supabase
    .from('hub_messages')
    .insert({
      group_id: validated.groupId,
      author_profile_id: profile.id,
      message_type: messageType,
      body: validated.body,
      reply_to_message_id: validated.reply_to_message_id ?? null,
      media_urls: validated.media_urls ?? [],
      media_captions: validated.media_captions ?? [],
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to post message: ${error.message}`)

  // Non-blocking: notify other circle members via email
  try {
    const { notifyCircleMembers } = await import('./circle-notification-actions')
    void notifyCircleMembers({
      groupId: validated.groupId,
      authorProfileId: profile.id,
      messageBody: validated.body,
    })
  } catch {
    // Non-blocking
  }

  return data as HubMessage
}

/**
 * Post a system message to a hub group thread. Internal use only.
 */
export async function postSystemMessage(input: {
  groupId: string
  authorProfileId: string
  systemEventType: string
  metadata?: Record<string, unknown>
  body?: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  try {
    await supabase.from('hub_messages').insert({
      group_id: input.groupId,
      author_profile_id: input.authorProfileId,
      message_type: 'system',
      system_event_type: input.systemEventType,
      system_metadata: (input.metadata ?? {}) as Json,
      body: input.body ?? null,
    })
  } catch {
    // System messages are non-blocking
    console.error('[non-blocking] Failed to post system message')
  }
}

/**
 * Get paginated messages for a group thread.
 */
export async function getHubMessages(input: {
  groupId: string
  cursor?: string
  limit?: number
}): Promise<{ messages: HubMessage[]; nextCursor: string | null }> {
  const supabase: any = createServerClient({ admin: true })
  const limit = input.limit ?? 50

  let query = supabase
    .from('hub_messages')
    .select('*, hub_guest_profiles!author_profile_id(*)')
    .eq('group_id', input.groupId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (input.cursor) {
    query = query.lt('created_at', input.cursor)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load messages: ${error.message}`)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const messages = (hasMore ? rows.slice(0, limit) : rows).map((m: any) => ({
    ...m,
    author: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubMessage[]

  return {
    messages,
    nextCursor: hasMore ? (messages[messages.length - 1]?.created_at ?? null) : null,
  }
}

/**
 * Get pinned messages for a group.
 */
export async function getPinnedMessages(groupId: string): Promise<HubMessage[]> {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_messages')
    .select('*, hub_guest_profiles!author_profile_id(*)')
    .eq('group_id', groupId)
    .eq('is_pinned', true)
    .is('deleted_at', null)
    .order('pinned_at', { ascending: false })

  if (error) throw new Error(`Failed to load pinned messages: ${error.message}`)

  return (data ?? []).map((m: any) => ({
    ...m,
    author: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubMessage[]
}

/**
 * Pin or unpin a message. Only owners, admins, and members with can_pin.
 */
export async function togglePinMessage(input: {
  messageId: string
  profileToken: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Get the message to find the group
  const { data: message } = await supabase
    .from('hub_messages')
    .select('group_id, is_pinned')
    .eq('id', input.messageId)
    .single()

  if (!message) throw new Error('Message not found')

  // Verify permission
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('role, can_pin')
    .eq('group_id', message.group_id)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('Not a member')
  if (!membership.can_pin && !['owner', 'admin'].includes(membership.role)) {
    throw new Error('No permission to pin messages')
  }

  const { error } = await supabase
    .from('hub_messages')
    .update({
      is_pinned: !message.is_pinned,
      pinned_by_profile_id: !message.is_pinned ? profile.id : null,
      pinned_at: !message.is_pinned ? new Date().toISOString() : null,
    })
    .eq('id', input.messageId)

  if (error) throw new Error(`Failed to toggle pin: ${error.message}`)
}

/**
 * Add an emoji reaction to a message.
 */
export async function addReaction(input: {
  messageId: string
  profileToken: string
  emoji: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { error } = await supabase.from('hub_message_reactions').insert({
    message_id: input.messageId,
    profile_id: profile.id,
    emoji: input.emoji,
  })

  // Ignore duplicate reaction (unique constraint)
  if (error && error.code !== '23505') {
    throw new Error(`Failed to add reaction: ${error.message}`)
  }

  // Update denormalized reaction counts on message
  const { data: counts } = await supabase
    .from('hub_message_reactions')
    .select('emoji')
    .eq('message_id', input.messageId)

  if (counts) {
    const reactionCounts: Record<string, number> = {}
    for (const r of counts) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1
    }
    await supabase
      .from('hub_messages')
      .update({ reaction_counts: reactionCounts })
      .eq('id', input.messageId)
  }
}

/**
 * Remove an emoji reaction.
 */
export async function removeReaction(input: {
  messageId: string
  profileToken: string
  emoji: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  await supabase
    .from('hub_message_reactions')
    .delete()
    .eq('message_id', input.messageId)
    .eq('profile_id', profile.id)
    .eq('emoji', input.emoji)

  // Update denormalized counts
  const { data: counts } = await supabase
    .from('hub_message_reactions')
    .select('emoji')
    .eq('message_id', input.messageId)

  const reactionCounts: Record<string, number> = {}
  if (counts) {
    for (const r of counts) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1
    }
  }
  await supabase
    .from('hub_messages')
    .update({ reaction_counts: reactionCounts })
    .eq('id', input.messageId)
}

/**
 * Soft-delete a message. Only author or owner/admin.
 */
export async function deleteHubMessage(input: {
  messageId: string
  profileToken: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: message } = await supabase
    .from('hub_messages')
    .select('group_id, author_profile_id')
    .eq('id', input.messageId)
    .single()

  if (!message) throw new Error('Message not found')

  // Check if author or admin
  const isAuthor = message.author_profile_id === profile.id
  if (!isAuthor) {
    const { data: membership } = await supabase
      .from('hub_group_members')
      .select('role')
      .eq('group_id', message.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only the author or group admins can delete messages')
    }
  }

  const { error } = await supabase
    .from('hub_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.messageId)

  if (error) throw new Error(`Failed to delete message: ${error.message}`)
}

/**
 * Mark messages as read for a member. Also records per-message reads for "Seen by."
 */
export async function markHubRead(input: { groupId: string; profileToken: string }): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) return

  // Record per-message reads before updating last_read_at (order matters)
  try {
    await recordMessageReads(input)
  } catch {
    // Non-blocking: per-message reads are a nice-to-have
  }

  await supabase
    .from('hub_group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
}

/**
 * Record per-message reads for "Seen by" feature.
 * Called alongside markHubRead to populate hub_message_reads.
 */
export async function recordMessageReads(input: {
  groupId: string
  profileToken: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) return

  // Get member's last_read_at to find which messages are newly read
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('last_read_at')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) return

  // Find messages in this group that this member hasn't read yet
  let query = supabase
    .from('hub_messages')
    .select('id')
    .eq('group_id', input.groupId)
    .is('deleted_at', null)
    .neq('author_profile_id', profile.id) // Don't record reads on own messages
    .order('created_at', { ascending: false })
    .limit(50) // Only track recent messages

  if (membership.last_read_at) {
    query = query.gt('created_at', membership.last_read_at)
  }

  const { data: unreadMessages } = await query
  if (!unreadMessages || unreadMessages.length === 0) return

  // Bulk upsert reads (ignore conflicts from duplicate reads)
  const rows = unreadMessages.map((m: any) => ({
    message_id: m.id,
    profile_id: profile.id,
  }))

  await supabase.from('hub_message_reads').upsert(rows, {
    onConflict: 'message_id,profile_id',
    ignoreDuplicates: true,
  })
}

/**
 * Get who has read a specific message. Returns profile names + avatars.
 */
export async function getMessageReaders(
  messageId: string
): Promise<
  { profile_id: string; display_name: string; avatar_url: string | null; read_at: string }[]
> {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_message_reads')
    .select('profile_id, read_at, hub_guest_profiles!profile_id(display_name, avatar_url)')
    .eq('message_id', messageId)
    .order('read_at', { ascending: true })
    .limit(20)

  if (error || !data) return []

  return data.map((r: any) => {
    const profile = r.hub_guest_profiles as unknown as {
      display_name: string
      avatar_url: string | null
    } | null
    return {
      profile_id: r.profile_id,
      display_name: profile?.display_name ?? 'Guest',
      avatar_url: profile?.avatar_url ?? null,
      read_at: r.read_at,
    }
  })
}

/**
 * Edit a message body. Only the author can edit.
 */
export async function editHubMessage(input: {
  messageId: string
  profileToken: string
  body: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: message } = await supabase
    .from('hub_messages')
    .select('author_profile_id')
    .eq('id', input.messageId)
    .single()

  if (!message) throw new Error('Message not found')
  if (message.author_profile_id !== profile.id) {
    throw new Error('Only the author can edit a message')
  }

  const trimmed = input.body.trim()
  if (!trimmed || trimmed.length > 2000) throw new Error('Invalid message body')

  const { error } = await supabase
    .from('hub_messages')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', input.messageId)

  if (error) throw new Error(`Failed to edit message: ${error.message}`)
}

/**
 * Search messages in a group by keyword.
 */
export async function searchHubMessages(input: {
  groupId: string
  query: string
  limit?: number
}): Promise<HubMessage[]> {
  const supabase: any = createServerClient({ admin: true })
  const limit = input.limit ?? 20
  const q = input.query.trim()

  if (!q || q.length < 2) return []

  const { data, error } = await supabase
    .from('hub_messages')
    .select('*, hub_guest_profiles!author_profile_id(*)')
    .eq('group_id', input.groupId)
    .is('deleted_at', null)
    .ilike('body', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []

  return (data ?? []).map((m: any) => ({
    ...m,
    author: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubMessage[]
}

// ---------------------------------------------------------------------------
// Pinned Notes
// ---------------------------------------------------------------------------

const CreateNoteSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  title: z.string().max(100).optional().nullable(),
  body: z.string().min(1).max(1000),
  color: z.enum(['default', 'yellow', 'pink', 'blue', 'green', 'purple', 'orange']).optional(),
})

/**
 * Create a pinned note in a group.
 */
export async function createPinnedNote(
  input: z.infer<typeof CreateNoteSchema>
): Promise<HubPinnedNote> {
  const validated = CreateNoteSchema.parse(input)
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !membership.can_post) {
    throw new Error('No permission to create notes')
  }

  const { data, error } = await supabase
    .from('hub_pinned_notes')
    .insert({
      group_id: validated.groupId,
      author_profile_id: profile.id,
      title: validated.title ?? null,
      body: validated.body,
      color: validated.color ?? 'default',
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create note: ${error.message}`)
  return data as HubPinnedNote
}

/**
 * Get all pinned notes for a group.
 */
export async function getGroupNotes(groupId: string): Promise<HubPinnedNote[]> {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_pinned_notes')
    .select('*, hub_guest_profiles!author_profile_id(*)')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load notes: ${error.message}`)

  return (data ?? []).map((n: any) => ({
    ...n,
    author: n.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubPinnedNote[]
}

/**
 * Delete a pinned note. Only author or owner/admin.
 */
export async function deletePinnedNote(input: {
  noteId: string
  profileToken: string
}): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: note } = await supabase
    .from('hub_pinned_notes')
    .select('group_id, author_profile_id')
    .eq('id', input.noteId)
    .single()

  if (!note) throw new Error('Note not found')

  const isAuthor = note.author_profile_id === profile.id
  if (!isAuthor) {
    const { data: membership } = await supabase
      .from('hub_group_members')
      .select('role')
      .eq('group_id', note.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only the author or group admins can delete notes')
    }
  }

  await supabase.from('hub_pinned_notes').delete().eq('id', input.noteId)
}

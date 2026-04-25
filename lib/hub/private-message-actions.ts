'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { PrivateThread, PrivateMessage } from './types'

// ---------------------------------------------------------------------------
// Private Circle Messaging: 1:1 threads between chef and circle members
// ---------------------------------------------------------------------------

/**
 * Resolve a profile_token to a profile ID. Throws on invalid token.
 */
async function resolveProfile(db: any, profileToken: string): Promise<string> {
  const { data } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!data) throw new Error('Invalid profile token')
  return data.id
}

/**
 * Find the chef's profile_id in a group.
 */
async function findChefInGroup(db: any, groupId: string): Promise<string | null> {
  const { data } = await db
    .from('hub_group_members')
    .select('profile_id, role')
    .eq('group_id', groupId)
    .in('role', ['owner', 'chef'])

  const owner = data?.find((row: any) => row.role === 'owner')
  return owner?.profile_id ?? data?.[0]?.profile_id ?? null
}

/**
 * Verify that a profile is a participant in a thread. Returns chef or member.
 */
async function verifyThreadAccess(
  db: any,
  threadId: string,
  profileId: string
): Promise<{ thread: any; role: 'chef' | 'member' }> {
  const { data: thread } = await db
    .from('hub_private_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (!thread) throw new Error('Thread not found')
  if (thread.chef_profile_id === profileId) return { thread, role: 'chef' }
  if (thread.member_profile_id === profileId) return { thread, role: 'member' }
  throw new Error('Access denied: not a participant in this thread')
}

function mapThread(row: any): PrivateThread {
  return {
    ...row,
    chef_profile: row.hub_guest_profiles ?? row.chef_profile ?? undefined,
    member_profile: row.member_prof ?? row.member_profile ?? undefined,
    hub_guest_profiles: undefined,
    member_prof: undefined,
  } as PrivateThread
}

// ---------------------------------------------------------------------------
// 1. Get or create a private thread
// ---------------------------------------------------------------------------

const GetOrCreateThreadSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  targetProfileId: z.string().uuid(),
})

/**
 * Get or create a private thread between the caller and a target profile.
 */
export async function getOrCreatePrivateThread(
  input: z.infer<typeof GetOrCreateThreadSchema>
): Promise<PrivateThread> {
  const validated = GetOrCreateThreadSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const callerProfileId = await resolveProfile(db, validated.profileToken)
  const chefProfileId = await findChefInGroup(db, validated.groupId)

  if (!chefProfileId) throw new Error('No chef found in this circle')

  let threadChefId: string
  let threadMemberId: string

  if (callerProfileId === chefProfileId) {
    threadChefId = callerProfileId
    threadMemberId = validated.targetProfileId
  } else if (validated.targetProfileId === chefProfileId) {
    threadChefId = validated.targetProfileId
    threadMemberId = callerProfileId
  } else {
    throw new Error('Private messages are only between the chef and a member')
  }

  if (threadChefId === threadMemberId) {
    throw new Error('Private messages are only between the chef and a member')
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', validated.groupId)
    .eq('profile_id', threadMemberId)
    .single()

  if (!membership) throw new Error('Target is not a member of this circle')

  const { data: existing } = await db
    .from('hub_private_threads')
    .select(
      '*, hub_guest_profiles!chef_profile_id(id, display_name, avatar_url, profile_token), member_prof:hub_guest_profiles!member_profile_id(id, display_name, avatar_url, profile_token)'
    )
    .eq('group_id', validated.groupId)
    .eq('chef_profile_id', threadChefId)
    .eq('member_profile_id', threadMemberId)
    .maybeSingle()

  if (existing) return mapThread(existing)

  const { data: newThread, error } = await db
    .from('hub_private_threads')
    .insert({
      group_id: validated.groupId,
      chef_profile_id: threadChefId,
      member_profile_id: threadMemberId,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create thread: ${error.message}`)
  return newThread as PrivateThread
}

// ---------------------------------------------------------------------------
// 2. Send a private message
// ---------------------------------------------------------------------------

const SendMessageSchema = z.object({
  threadId: z.string().uuid(),
  profileToken: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
})

/**
 * Send a message in a private thread. Caller must be a participant.
 */
export async function sendPrivateMessage(
  input: z.infer<typeof SendMessageSchema>
): Promise<PrivateMessage> {
  const validated = SendMessageSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const callerProfileId = await resolveProfile(db, validated.profileToken)
  await verifyThreadAccess(db, validated.threadId, callerProfileId)

  const { data, error } = await db
    .from('hub_private_messages')
    .insert({
      thread_id: validated.threadId,
      sender_profile_id: callerProfileId,
      body: validated.body,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to send message: ${error.message}`)
  return data as PrivateMessage
}

// ---------------------------------------------------------------------------
// 3. Get messages in a thread
// ---------------------------------------------------------------------------

const GetMessagesSchema = z.object({
  threadId: z.string().uuid(),
  profileToken: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

/**
 * Get paginated messages for a private thread. Caller must be a participant.
 */
export async function getPrivateMessages(input: {
  threadId: string
  profileToken: string
  cursor?: string
  limit?: number
}): Promise<{ messages: PrivateMessage[]; nextCursor: string | null }> {
  const validated = GetMessagesSchema.parse(input)
  const db: any = createServerClient({ admin: true })
  const limit = validated.limit ?? 50

  const callerProfileId = await resolveProfile(db, validated.profileToken)
  await verifyThreadAccess(db, validated.threadId, callerProfileId)

  let query = db
    .from('hub_private_messages')
    .select('*, hub_guest_profiles!sender_profile_id(id, display_name, avatar_url)')
    .eq('thread_id', validated.threadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (validated.cursor) {
    query = query.lt('created_at', validated.cursor)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load messages: ${error.message}`)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const messages = (hasMore ? rows.slice(0, limit) : rows).map((message: any) => ({
    ...message,
    sender: message.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as PrivateMessage[]

  return {
    messages,
    nextCursor: hasMore ? (messages[messages.length - 1]?.created_at ?? null) : null,
  }
}

// ---------------------------------------------------------------------------
// 4. List threads for a profile in a group
// ---------------------------------------------------------------------------

const GetMyThreadsSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

/**
 * Get all private threads for the caller in a specific circle.
 */
export async function getMyPrivateThreads(input: {
  groupId: string
  profileToken: string
}): Promise<PrivateThread[]> {
  const validated = GetMyThreadsSchema.parse(input)
  const db: any = createServerClient({ admin: true })
  const callerProfileId = await resolveProfile(db, validated.profileToken)

  const { data, error } = await db
    .from('hub_private_threads')
    .select(
      '*, hub_guest_profiles!chef_profile_id(id, display_name, avatar_url, profile_token), member_prof:hub_guest_profiles!member_profile_id(id, display_name, avatar_url, profile_token)'
    )
    .eq('group_id', validated.groupId)
    .or(`chef_profile_id.eq.${callerProfileId},member_profile_id.eq.${callerProfileId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) throw new Error(`Failed to load threads: ${error.message}`)

  return (data ?? []).map(mapThread)
}

// ---------------------------------------------------------------------------
// 5. Mark a thread as read
// ---------------------------------------------------------------------------

const MarkThreadReadSchema = z.object({
  threadId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

/**
 * Reset the caller's unread count to 0.
 */
export async function markPrivateThreadRead(input: {
  threadId: string
  profileToken: string
}): Promise<void> {
  const validated = MarkThreadReadSchema.parse(input)
  const db: any = createServerClient({ admin: true })
  const callerProfileId = await resolveProfile(db, validated.profileToken)
  const { role } = await verifyThreadAccess(db, validated.threadId, callerProfileId)

  const updateField = role === 'chef' ? 'chef_unread_count' : 'member_unread_count'
  const { error } = await db
    .from('hub_private_threads')
    .update({ [updateField]: 0 })
    .eq('id', validated.threadId)

  if (error) throw new Error(`Failed to mark thread read: ${error.message}`)
}

// ---------------------------------------------------------------------------
// 6. Get chef profile for chef-side UI
// ---------------------------------------------------------------------------

/**
 * Get the chef's hub profile for a circle. Must be called by an authenticated chef.
 */
export async function getChefHubProfileForCircle(groupId: string): Promise<{
  profileId: string
  profileToken: string
} | null> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const validatedGroupId = z.string().uuid().parse(groupId)
  const db: any = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, profile_token')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (!profile) return null

  const { data: membership } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', validatedGroupId)
    .eq('profile_id', profile.id)
    .in('role', ['owner', 'chef'])
    .maybeSingle()

  if (!membership) return null

  return { profileId: profile.id, profileToken: profile.profile_token }
}

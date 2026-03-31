'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────

export type CollabSpaceSummary = {
  id: string
  space_type: 'direct' | 'workspace'
  display_name: string
  member_count: number
  last_message_at: string | null
  last_message_preview: string | null
  unread: boolean
  thread_count: number
}

export type CollabSpaceDetail = {
  space: {
    id: string
    space_type: 'direct' | 'workspace'
    name: string | null
    description: string | null
    is_locked: boolean
    created_at: string
  }
  members: Array<{
    chef_id: string
    role: string
    display_name: string
    business_name: string
    profile_image_url: string | null
  }>
  threads: Array<{
    id: string
    thread_type: string
    starter_key: string | null
    title: string
    is_closed: boolean
    last_message_at: string | null
  }>
  active_thread: string | null
  messages: Array<CollabMessage>
}

export type CollabMessage = {
  id: string
  thread_id: string
  sender_chef_id: string
  sender_name: string
  sender_avatar: string | null
  message_type: 'text' | 'system' | 'handoff_reference'
  body: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ── Starter thread definitions ───────────────────────────────

const STARTER_THREADS = [
  { key: 'general', title: 'General', type: 'general' },
  { key: 'leads', title: 'Leads', type: 'starter' },
  { key: 'handoffs', title: 'Handoffs', type: 'starter' },
  { key: 'travel', title: 'Travel', type: 'starter' },
  { key: 'references', title: 'References', type: 'starter' },
] as const

// ── Helpers ──────────────────────────────────────────────────

function makePairKey(a: string, b: string): string {
  return [a, b].sort().join('::')
}

function revalidateNetworkPaths(spaceId?: string) {
  revalidatePath('/network')
  revalidatePath('/network/collabs')
  if (spaceId) revalidatePath(`/network/collabs/${spaceId}`)
}

async function createStarterThreads(
  db: ReturnType<typeof createServerClient>,
  spaceId: string,
  chefId: string
) {
  for (const t of STARTER_THREADS) {
    await db.from('chef_collab_threads').insert({
      space_id: spaceId,
      created_by_chef_id: chefId,
      thread_type: t.type,
      starter_key: t.key,
      title: t.title,
    })
  }
}

async function insertSystemMessage(
  db: ReturnType<typeof createServerClient>,
  threadId: string,
  chefId: string,
  body: string
) {
  await db.from('chef_collab_messages').insert({
    thread_id: threadId,
    sender_chef_id: chefId,
    message_type: 'system',
    body,
  })
}

// ── Read Actions ─────────────────────────────────────────────

export async function getCollabSpaceSummaries(limit = 50): Promise<CollabSpaceSummary[]> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  // Get all spaces this chef is a member of
  const { data: memberRows } = await db
    .from('chef_collab_space_members')
    .select('space_id, last_read_at')
    .eq('chef_id', chefId)

  if (!memberRows?.length) return []

  const spaceIds = memberRows.map((r: { space_id: string }) => r.space_id)
  const readMap = new Map(
    memberRows.map((r: { space_id: string; last_read_at: string | null }) => [
      r.space_id,
      r.last_read_at,
    ])
  )

  const { data: spaces } = await db
    .from('chef_collab_spaces')
    .select('*')
    .in('id', spaceIds)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (!spaces?.length) return []

  // Get member counts and thread counts per space
  const results: CollabSpaceSummary[] = []

  for (const space of spaces) {
    const { count: memberCount } = await db
      .from('chef_collab_space_members')
      .select('id', { count: 'exact' })
      .eq('space_id', space.id)

    const { count: threadCount } = await db
      .from('chef_collab_threads')
      .select('id', { count: 'exact' })
      .eq('space_id', space.id)

    // Compute display name
    let displayName = space.name || ''
    if (space.space_type === 'direct') {
      // For direct spaces, show the other chef's name
      const { data: otherMembers } = await db
        .from('chef_collab_space_members')
        .select('chef_id')
        .eq('space_id', space.id)
        .neq('chef_id', chefId)

      if (otherMembers?.[0]) {
        const { data: otherChef } = await db
          .from('chefs')
          .select('business_name')
          .eq('id', otherMembers[0].chef_id)
          .single()
        displayName = otherChef?.business_name || 'Chef'
      }
    }

    const lastRead = readMap.get(space.id) as string | null | undefined
    const unread = space.last_message_at
      ? !lastRead || new Date(space.last_message_at as string) > new Date(lastRead as string)
      : false

    results.push({
      id: space.id,
      space_type: space.space_type,
      display_name: displayName,
      member_count: memberCount || 0,
      last_message_at: space.last_message_at,
      last_message_preview: space.last_message_preview,
      unread,
      thread_count: threadCount || 0,
    })
  }

  return results
}

export async function getCollabSpacesUnreadCount(): Promise<number> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  const { data: memberRows } = await db
    .from('chef_collab_space_members')
    .select('space_id, last_read_at')
    .eq('chef_id', chefId)

  if (!memberRows?.length) return 0

  let count = 0
  for (const row of memberRows) {
    const { data: space } = await db
      .from('chef_collab_spaces')
      .select('last_message_at')
      .eq('id', row.space_id)
      .eq('is_archived', false)
      .single()

    if (
      space?.last_message_at &&
      (!row.last_read_at || new Date(space.last_message_at) > new Date(row.last_read_at))
    ) {
      count++
    }
  }

  return count
}

export async function getCollabSpaceDetail(input: {
  spaceId: string
  threadId?: string
}): Promise<CollabSpaceDetail | null> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  // Verify membership
  const { data: membership } = await db
    .from('chef_collab_space_members')
    .select('id')
    .eq('space_id', input.spaceId)
    .eq('chef_id', chefId)
    .single()

  if (!membership) return null

  // Get space
  const { data: space } = await db
    .from('chef_collab_spaces')
    .select('id, space_type, name, description, is_locked, created_at')
    .eq('id', input.spaceId)
    .single()

  if (!space) return null

  // Get members with chef info
  const { data: memberRows } = await db
    .from('chef_collab_space_members')
    .select('chef_id, role')
    .eq('space_id', input.spaceId)
    .order('joined_at', { ascending: true })

  const members = []
  for (const m of memberRows || []) {
    const { data: chef } = await db
      .from('chefs')
      .select('business_name, profile_image_url')
      .eq('id', m.chef_id)
      .single()
    members.push({
      chef_id: m.chef_id,
      role: m.role,
      display_name: chef?.business_name || 'Chef',
      business_name: chef?.business_name || 'Chef',
      profile_image_url: chef?.profile_image_url || null,
    })
  }

  // Get threads, starter first then by activity
  const { data: threads } = await db
    .from('chef_collab_threads')
    .select('id, thread_type, starter_key, title, is_closed, last_message_at')
    .eq('space_id', input.spaceId)
    .order('created_at', { ascending: true })

  const sortedThreads = (threads || []).sort(
    (
      a: { thread_type: string; starter_key: string | null; last_message_at: string | null },
      b: { thread_type: string; starter_key: string | null; last_message_at: string | null }
    ) => {
      // Starter/general first, then by activity
      const aIsStarter = a.thread_type === 'general' || a.thread_type === 'starter'
      const bIsStarter = b.thread_type === 'general' || b.thread_type === 'starter'
      if (aIsStarter && !bIsStarter) return -1
      if (!aIsStarter && bIsStarter) return 1
      if (aIsStarter && bIsStarter) {
        const order = ['general', 'leads', 'handoffs', 'travel', 'references']
        return order.indexOf(a.starter_key || 'general') - order.indexOf(b.starter_key || 'general')
      }
      // Custom threads by last activity
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return bTime - aTime
    }
  )

  // Determine active thread
  const activeThreadId = input.threadId || sortedThreads[0]?.id || null

  // Get messages for active thread
  let messages: CollabMessage[] = []
  if (activeThreadId) {
    const { data: msgRows } = await db
      .from('chef_collab_messages')
      .select('*')
      .eq('thread_id', activeThreadId)
      .order('created_at', { ascending: true })
      .limit(200)

    messages = await Promise.all(
      (msgRows || []).map(async (msg: Record<string, unknown>) => {
        const { data: sender } = await db
          .from('chefs')
          .select('business_name, profile_image_url')
          .eq('id', msg.sender_chef_id as string)
          .single()
        return {
          id: msg.id as string,
          thread_id: msg.thread_id as string,
          sender_chef_id: msg.sender_chef_id as string,
          sender_name: sender?.business_name || 'Chef',
          sender_avatar: sender?.profile_image_url || null,
          message_type: msg.message_type as 'text' | 'system' | 'handoff_reference',
          body: msg.body as string | null,
          metadata: (msg.metadata || {}) as Record<string, unknown>,
          created_at: msg.created_at as string,
        }
      })
    )
  }

  return {
    space,
    members,
    threads: sortedThreads,
    active_thread: activeThreadId,
    messages,
  }
}

// ── Mutation Actions ─────────────────────────────────────────

export async function getOrCreateDirectCollabSpace(input: {
  otherChefId: string
}): Promise<{ success: boolean; spaceId?: string; created?: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  if (input.otherChefId === chefId) {
    return { success: false, error: 'Cannot create a direct space with yourself.' }
  }

  // Verify accepted connection
  const { data: connection } = await db
    .from('chef_connections')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${chefId},recipient_id.eq.${input.otherChefId}),and(requester_id.eq.${input.otherChefId},recipient_id.eq.${chefId})`
    )
    .single()

  if (!connection) {
    return { success: false, error: 'You must be connected to create a direct space.' }
  }

  const pairKey = makePairKey(chefId, input.otherChefId)

  // Check for existing
  const { data: existing } = await db
    .from('chef_collab_spaces')
    .select('id')
    .eq('direct_pair_key', pairKey)
    .eq('space_type', 'direct')
    .eq('is_archived', false)
    .single()

  if (existing) {
    revalidateNetworkPaths(existing.id)
    return { success: true, spaceId: existing.id, created: false }
  }

  // Create new direct space
  const { data: newSpace } = await db
    .from('chef_collab_spaces')
    .insert({
      created_by_chef_id: chefId,
      space_type: 'direct',
      direct_pair_key: pairKey,
    })
    .select('id')
    .single()

  if (!newSpace) return { success: false, error: 'Failed to create space.' }

  // Add members
  await db.from('chef_collab_space_members').insert({
    space_id: newSpace.id,
    chef_id: chefId,
    role: 'owner',
  })
  await db.from('chef_collab_space_members').insert({
    space_id: newSpace.id,
    chef_id: input.otherChefId,
    role: 'member',
  })

  // Create starter threads
  await createStarterThreads(db, newSpace.id, chefId)

  // System message in General
  const { data: generalThread } = await db
    .from('chef_collab_threads')
    .select('id')
    .eq('space_id', newSpace.id)
    .eq('starter_key', 'general')
    .single()

  if (generalThread) {
    await insertSystemMessage(
      db,
      generalThread.id,
      chefId,
      'Direct space created. This is your private collaboration channel.'
    )
  }

  revalidateNetworkPaths(newSpace.id)
  return { success: true, spaceId: newSpace.id, created: true }
}

export async function createWorkspaceCollabSpace(input: {
  name: string
  description?: string
  memberChefIds?: string[]
  isLocked?: boolean
}): Promise<{ success: boolean; spaceId?: string; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  const trimmedName = input.name?.trim()
  if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 120) {
    return { success: false, error: 'Workspace name must be 1-120 characters.' }
  }

  // Validate all member chef IDs are accepted connections
  const memberIds = (input.memberChefIds || []).filter((id) => id !== chefId)
  for (const memberId of memberIds) {
    const { data: conn } = await db
      .from('chef_connections')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${chefId},recipient_id.eq.${memberId}),and(requester_id.eq.${memberId},recipient_id.eq.${chefId})`
      )
      .single()

    if (!conn) {
      return { success: false, error: `Not connected to one or more selected chefs.` }
    }
  }

  const { data: newSpace } = await db
    .from('chef_collab_spaces')
    .insert({
      created_by_chef_id: chefId,
      space_type: 'workspace',
      name: trimmedName,
      description: input.description?.trim() || null,
      is_locked: input.isLocked || false,
    })
    .select('id')
    .single()

  if (!newSpace) return { success: false, error: 'Failed to create workspace.' }

  // Add owner
  await db.from('chef_collab_space_members').insert({
    space_id: newSpace.id,
    chef_id: chefId,
    role: 'owner',
  })

  // Add additional members
  for (const memberId of memberIds) {
    await db.from('chef_collab_space_members').insert({
      space_id: newSpace.id,
      chef_id: memberId,
      role: 'member',
    })
  }

  // Create starter threads
  await createStarterThreads(db, newSpace.id, chefId)

  // System message
  const { data: generalThread } = await db
    .from('chef_collab_threads')
    .select('id')
    .eq('space_id', newSpace.id)
    .eq('starter_key', 'general')
    .single()

  if (generalThread) {
    await insertSystemMessage(db, generalThread.id, chefId, `Workspace "${trimmedName}" created.`)
  }

  revalidateNetworkPaths(newSpace.id)
  return { success: true, spaceId: newSpace.id }
}

export async function createCollabThread(input: {
  spaceId: string
  title: string
}): Promise<{ success: boolean; threadId?: string; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  // Verify membership
  const { data: membership } = await db
    .from('chef_collab_space_members')
    .select('id')
    .eq('space_id', input.spaceId)
    .eq('chef_id', chefId)
    .single()

  if (!membership) return { success: false, error: 'Not a member of this space.' }

  const trimmedTitle = input.title?.trim()
  if (!trimmedTitle || trimmedTitle.length < 1 || trimmedTitle.length > 120) {
    return { success: false, error: 'Thread title must be 1-120 characters.' }
  }

  // Check for duplicate title
  const { data: existing } = await db
    .from('chef_collab_threads')
    .select('id')
    .eq('space_id', input.spaceId)
    .eq('title', trimmedTitle)
    .single()

  if (existing) {
    return { success: false, error: 'A thread with that title already exists in this space.' }
  }

  const { data: newThread } = await db
    .from('chef_collab_threads')
    .insert({
      space_id: input.spaceId,
      created_by_chef_id: chefId,
      thread_type: 'topic',
      title: trimmedTitle,
    })
    .select('id')
    .single()

  if (!newThread) return { success: false, error: 'Failed to create thread.' }

  revalidateNetworkPaths(input.spaceId)
  return { success: true, threadId: newThread.id }
}

export async function sendCollabThreadMessage(input: {
  threadId: string
  body: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  const trimmedBody = input.body?.trim()
  if (!trimmedBody || trimmedBody.length < 1 || trimmedBody.length > 5000) {
    return { success: false, error: 'Message must be 1-5000 characters.' }
  }

  // Get thread and verify membership
  const { data: thread } = await db
    .from('chef_collab_threads')
    .select('id, space_id')
    .eq('id', input.threadId)
    .single()

  if (!thread) return { success: false, error: 'Thread not found.' }

  const { data: membership } = await db
    .from('chef_collab_space_members')
    .select('id')
    .eq('space_id', thread.space_id)
    .eq('chef_id', chefId)
    .single()

  if (!membership) return { success: false, error: 'Not a member of this space.' }

  // Insert message
  const { data: msg } = await db
    .from('chef_collab_messages')
    .insert({
      thread_id: input.threadId,
      sender_chef_id: chefId,
      message_type: 'text',
      body: trimmedBody,
    })
    .select('id')
    .single()

  if (!msg) return { success: false, error: 'Failed to send message.' }

  const now = new Date().toISOString()

  // Update thread last_message_at
  await db.from('chef_collab_threads').update({ last_message_at: now }).eq('id', input.threadId)

  // Update space last_message_at and preview
  const preview = trimmedBody.length > 100 ? trimmedBody.slice(0, 100) + '...' : trimmedBody
  await db
    .from('chef_collab_spaces')
    .update({ last_message_at: now, last_message_preview: preview })
    .eq('id', thread.space_id)

  // Mark sender as read
  await db
    .from('chef_collab_space_members')
    .update({ last_read_at: now })
    .eq('space_id', thread.space_id)
    .eq('chef_id', chefId)

  revalidateNetworkPaths(thread.space_id)
  return { success: true, messageId: msg.id }
}

export async function markCollabSpaceRead(input: {
  spaceId: string
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  await db
    .from('chef_collab_space_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('space_id', input.spaceId)
    .eq('chef_id', chefId)

  revalidateNetworkPaths(input.spaceId)
  return { success: true }
}

export async function attachHandoffReferenceToThread(input: {
  threadId: string
  handoffId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  // Verify thread membership
  const { data: thread } = await db
    .from('chef_collab_threads')
    .select('id, space_id')
    .eq('id', input.threadId)
    .single()

  if (!thread) return { success: false, error: 'Thread not found.' }

  const { data: membership } = await db
    .from('chef_collab_space_members')
    .select('id')
    .eq('space_id', thread.space_id)
    .eq('chef_id', chefId)
    .single()

  if (!membership) return { success: false, error: 'Not a member of this space.' }

  // Verify handoff exists and belongs to caller
  const { data: handoff } = await db
    .from('chef_handoffs')
    .select('id, title, handoff_type')
    .eq('id', input.handoffId)
    .eq('created_by_chef_id', chefId)
    .single()

  if (!handoff) return { success: false, error: 'Handoff not found or not yours.' }

  // Insert reference message
  await db.from('chef_collab_messages').insert({
    thread_id: input.threadId,
    sender_chef_id: chefId,
    message_type: 'handoff_reference',
    body: null,
    metadata: {
      handoff_id: handoff.id,
      handoff_title: handoff.title,
      handoff_type: handoff.handoff_type,
    },
  })

  revalidateNetworkPaths(thread.space_id)
  return { success: true }
}

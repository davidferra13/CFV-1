'use server'

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createHubGroup } from './group-actions'
import type { HubGuestProfile, HubGroupVisibility } from './types'

// ---------------------------------------------------------------------------
// Community Circle Actions
// Universal circle creation for any authenticated user (chef or client).
// ---------------------------------------------------------------------------

/**
 * Resolve (or create) a hub_guest_profile for any authenticated user.
 * Works for both chefs and clients by looking up auth_user_id.
 */
export async function getOrCreateUniversalHubProfile(): Promise<HubGuestProfile> {
  const user = await requireAuth()
  const db: any = createServerClient({ admin: true })

  // Try existing profile linked to this auth user
  const { data: existing } = await db
    .from('hub_guest_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return existing as HubGuestProfile

  // Resolve display name based on role
  let displayName = user.email.split('@')[0]

  if (user.role === 'chef' && user.tenantId) {
    const { data: chef } = await db
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', user.tenantId)
      .single()
    if (chef) displayName = chef.display_name || chef.business_name || displayName
  } else if (user.role === 'client' && user.entityId) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', user.entityId)
      .single()
    if (client) displayName = client.full_name || displayName
  }

  const { getOrCreateProfile } = await import('./profile-actions')
  return getOrCreateProfile({
    email: user.email,
    displayName,
    authUserId: user.id,
  })
}

/**
 * Create a community circle. Any authenticated user (chef or client).
 * Community circles are not tenant-scoped (tenant_id = null).
 */
export async function createCommunityCircle(input: {
  name: string
  description?: string
  emoji?: string
  visibility?: HubGroupVisibility
  topics?: string[]
}): Promise<{ groupToken: string }> {
  const profile = await getOrCreateUniversalHubProfile()

  // Rate limit: max 5 circles per hour per user
  await checkRateLimit(`create-circle:${profile.id}`, 5, 60 * 60 * 1000)

  const name = input.name.trim()
  if (!name || name.length > 100) {
    throw new Error('Circle name is required (max 100 characters)')
  }

  // Content moderation
  const { validateCircleName } = await import('@/lib/moderation/content-filter')
  const modResult = validateCircleName(name)
  if (!modResult.allowed) {
    throw new Error(modResult.reason ?? 'Circle name contains inappropriate content')
  }

  // Also check description
  if (input.description) {
    const { moderateText } = await import('@/lib/moderation/content-filter')
    const descResult = moderateText(input.description)
    if (!descResult.allowed) {
      throw new Error(descResult.reason ?? 'Description contains inappropriate content')
    }
  }

  const group = await createHubGroup({
    name,
    description: input.description?.trim() || null,
    emoji: input.emoji || null,
    tenant_id: null, // community circles are not tenant-scoped
    created_by_profile_id: profile.id,
    group_type: 'community',
    visibility: input.visibility || 'public',
    display_vibe: input.topics?.length ? input.topics : null,
  })

  return { groupToken: group.group_token }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface PublicCircleResult {
  id: string
  name: string
  description: string | null
  emoji: string | null
  group_token: string
  group_type: string
  visibility: string
  display_vibe: string[] | null
  member_count: number
  message_count: number
  last_message_at: string | null
  created_at: string
}

/**
 * Discover public community circles. No auth required.
 * Supports text search on name/description and topic filtering.
 */
export async function discoverPublicCircles(options?: {
  search?: string
  topic?: string
  limit?: number
  cursor?: string
}): Promise<{ circles: PublicCircleResult[]; nextCursor: string | null }> {
  const db: any = createServerClient({ admin: true })
  const limit = Math.min(options?.limit ?? 20, 50)

  let query = db
    .from('hub_groups')
    .select(
      'id, name, description, emoji, group_token, group_type, visibility, display_vibe, message_count, last_message_at, created_at'
    )
    .eq('visibility', 'public')
    .eq('is_active', true)
    .in('group_type', ['community', 'dinner_club'])
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit + 1)

  if (options?.cursor) {
    query = query.lt('last_message_at', options.cursor)
  }

  if (options?.search?.trim()) {
    const term = options.search.trim()
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
  }

  if (options?.topic?.trim()) {
    query = query.contains('display_vibe', [options.topic.trim()])
  }

  const { data: groups } = await query
  if (!groups || groups.length === 0) {
    return { circles: [], nextCursor: null }
  }

  // Determine pagination
  const hasMore = groups.length > limit
  const page = hasMore ? groups.slice(0, limit) : groups
  const nextCursor = hasMore ? page[page.length - 1].last_message_at : null

  // Get member counts in bulk
  const groupIds = page.map((g: any) => g.id)
  const { data: memberRows } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const countMap: Record<string, number> = {}
  for (const m of memberRows ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
  }

  const circles: PublicCircleResult[] = page.map((g: any) => ({
    ...g,
    member_count: countMap[g.id] ?? 0,
  }))

  return { circles, nextCursor }
}

/**
 * Archive a community circle. Any authenticated owner can archive.
 * Works for both chefs and clients (unlike archiveCircle which requires requireChef).
 */
export async function archiveCommunityCircle(groupId: string): Promise<void> {
  const profile = await getOrCreateUniversalHubProfile()
  const db: any = createServerClient({ admin: true })

  // Verify caller is owner of this group
  const { data: membership } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the circle owner can archive it')
  }

  await db
    .from('hub_groups')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .is('tenant_id', null) // safety: only community circles
}

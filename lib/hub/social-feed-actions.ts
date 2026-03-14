'use server'

import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Social Feed: aggregated activity across all circles a profile belongs to.
// ---------------------------------------------------------------------------

export interface SocialFeedItem {
  id: string
  group_id: string
  group_name: string
  group_emoji: string | null
  group_token: string
  author_name: string
  author_avatar_url: string | null
  message_type: string
  body: string | null
  media_urls: string[]
  created_at: string
}

/**
 * Get a unified social feed for a hub guest profile.
 * Shows recent messages across all circles the profile belongs to.
 */
export async function getSocialFeed(input: {
  profileId: string
  limit?: number
  cursor?: string
}): Promise<{ items: SocialFeedItem[]; nextCursor: string | null }> {
  const supabase = createServerClient({ admin: true })
  const limit = input.limit ?? 30

  // Get all groups the profile is a member of
  const { data: memberships } = await supabase
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', input.profileId)

  if (!memberships || memberships.length === 0) {
    return { items: [], nextCursor: null }
  }

  const groupIds = memberships.map((m) => m.group_id)

  // Fetch recent messages across all groups
  let query = supabase
    .from('hub_messages')
    .select(
      'id, group_id, author_profile_id, message_type, body, media_urls, created_at, hub_guest_profiles!author_profile_id(display_name, avatar_url)'
    )
    .in('group_id', groupIds)
    .is('deleted_at', null)
    .neq('message_type', 'system')
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (input.cursor) {
    query = query.lt('created_at', input.cursor)
  }

  const { data: messages, error } = await query
  if (error || !messages) return { items: [], nextCursor: null }

  // Load group info for names
  const uniqueGroupIds = [...new Set(messages.map((m) => m.group_id))]
  const { data: groups } = await supabase
    .from('hub_groups')
    .select('id, name, emoji, group_token')
    .in('id', uniqueGroupIds)

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]))

  const hasMore = messages.length > limit
  const rows = hasMore ? messages.slice(0, limit) : messages

  const items: SocialFeedItem[] = rows.map((m: any) => {
    const group = groupMap.get(m.group_id)
    const author = m.hub_guest_profiles
    return {
      id: m.id,
      group_id: m.group_id,
      group_name: group?.name ?? 'Circle',
      group_emoji: group?.emoji ?? null,
      group_token: group?.group_token ?? '',
      author_name: author?.display_name ?? 'Someone',
      author_avatar_url: author?.avatar_url ?? null,
      message_type: m.message_type,
      body: m.body,
      media_urls: m.media_urls ?? [],
      created_at: m.created_at,
    }
  })

  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.created_at ?? null) : null,
  }
}

/**
 * Get social feed for the current chef (via auth_user_id).
 */
export async function getChefSocialFeed(input?: {
  limit?: number
  cursor?: string
}): Promise<{ items: SocialFeedItem[]; nextCursor: string | null }> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (!profile) return { items: [], nextCursor: null }

  return getSocialFeed({
    profileId: profile.id,
    limit: input?.limit,
    cursor: input?.cursor,
  })
}

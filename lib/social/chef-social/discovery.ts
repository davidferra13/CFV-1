'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'

import { getFollowCounts, getFollowStatus } from './follows'
import type { SocialPostAuthor } from './types'

// ============================================================
// DISCOVERY
// ============================================================

export async function getDiscoverChefs(
  input: { limit?: number } = {}
): Promise<SocialPostAuthor[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 20, 50)

  // Chefs the current user isn't following yet, discoverable, ordered by followers
  const { data: alreadyFollowing } = await db
    .from('chef_follows')
    .select('following_chef_id')
    .eq('follower_chef_id', user.entityId)

  const excludeIds = [
    user.entityId,
    ...((alreadyFollowing || []) as any[]).map((f) => f.following_chef_id),
  ]

  const { data: chefs } = await db
    .from('chefs')
    .select(
      `id, display_name, business_name, profile_image_url,
             chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state, network_discoverable)`
    )
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .limit(limit * 2) // over-fetch to filter after

  const visible = ((chefs || []) as any[])
    .filter((c) => {
      const prefs = Array.isArray(c.chef_preferences) ? c.chef_preferences[0] : c.chef_preferences
      return prefs?.network_discoverable !== false
    })
    .slice(0, limit)

  return visible.map((c: any) => {
    const prefs = Array.isArray(c.chef_preferences) ? c.chef_preferences[0] : c.chef_preferences
    return {
      id: c.id,
      display_name: c.display_name ?? null,
      business_name: c.business_name ?? 'Unknown',
      profile_image_url: c.profile_image_url ?? null,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
    }
  })
}

export async function getTrendingHashtags(
  input: { limit?: number } = {}
): Promise<Array<{ tag: string; post_count: number }>> {
  const db = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 20, 50)

  const { data: tags } = await db
    .from('chef_social_hashtags')
    .select('tag, post_count')
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(limit)

  return (tags || []).map((t: any) => ({ tag: t.tag, post_count: t.post_count }))
}

// ============================================================
// PUBLIC CHEF PROFILE (within social platform)
// ============================================================

export async function getPublicChefSocialProfile(chefId: string): Promise<{
  id: string
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
  city: string | null
  state: string | null
  followers_count: number
  following_count: number
  post_count: number
  is_following: boolean
  is_followed_by: boolean
  is_connected: boolean
}> {
  const user = await requireChef()
  z.string().uuid().parse(chefId)
  const db = createServerClient({ admin: true })

  const [{ data: chef }, counts, followStatus, { data: conn }, { count: postCount }] =
    await Promise.all([
      db
        .from('chefs')
        .select(
          `id, display_name, business_name, bio, profile_image_url,
               chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)`
        )
        .eq('id', chefId)
        .single(),
      getFollowCounts(chefId),
      getFollowStatus(chefId),
      db
        .from('chef_connections')
        .select('id')
        .eq('status', 'accepted')
        .or(
          `and(requester_id.eq.${user.entityId},addressee_id.eq.${chefId}),and(requester_id.eq.${chefId},addressee_id.eq.${user.entityId})`
        )
        .maybeSingle(),
      db
        .from('chef_social_posts')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chefId)
        .eq('visibility', 'public'),
    ])

  if (!chef) throw new Error('Chef not found')

  const prefs = Array.isArray((chef as any).chef_preferences)
    ? (chef as any).chef_preferences[0]
    : (chef as any).chef_preferences

  return {
    id: (chef as any).id,
    display_name: (chef as any).display_name ?? null,
    business_name: (chef as any).business_name ?? 'Unknown',
    bio: (chef as any).bio ?? null,
    profile_image_url: (chef as any).profile_image_url ?? null,
    city: prefs?.home_city ?? null,
    state: prefs?.home_state ?? null,
    followers_count: counts.followers,
    following_count: counts.following,
    post_count: postCount ?? 0,
    is_following: followStatus.is_following,
    is_followed_by: followStatus.is_followed_by,
    is_connected: !!conn,
  }
}

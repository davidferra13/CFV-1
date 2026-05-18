// Chef Social Platform - shared hydration and parsing helpers

import type { PostType, PostVisibility, ReactionType, SocialPost, SocialPostAuthor } from './types'

export function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]{1,50})/g) || []
  return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())))
}

export async function buildAuthorMap(
  db: any,
  chefIds: string[]
): Promise<Map<string, SocialPostAuthor>> {
  if (!chefIds.length) return new Map()
  const { data: chefs } = await db
    .from('chefs')
    .select(
      `id, display_name, business_name, profile_image_url,
             chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)`
    )
    .in('id', chefIds)

  const map = new Map<string, SocialPostAuthor>()
  for (const chef of (chefs || []) as any[]) {
    const prefs = Array.isArray(chef.chef_preferences)
      ? chef.chef_preferences[0]
      : chef.chef_preferences
    map.set(chef.id, {
      id: chef.id,
      display_name: chef.display_name ?? null,
      business_name: chef.business_name ?? 'Unknown',
      profile_image_url: chef.profile_image_url ?? null,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
    })
  }
  return map
}

async function getMyReactionsForPosts(
  db: any,
  chefId: string,
  postIds: string[]
): Promise<Map<string, ReactionType>> {
  if (!postIds.length) return new Map()
  const { data } = await db
    .from('chef_post_reactions')
    .select('post_id, reaction_type')
    .eq('chef_id', chefId)
    .in('post_id', postIds)

  const map = new Map<string, ReactionType>()
  for (const row of (data || []) as any[]) {
    map.set(row.post_id, row.reaction_type as ReactionType)
  }
  return map
}

async function getMySavedPosts(db: any, chefId: string, postIds: string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set()
  const { data } = await db
    .from('chef_post_saves')
    .select('post_id')
    .eq('chef_id', chefId)
    .in('post_id', postIds)

  const set = new Set<string>()
  for (const row of (data || []) as any[]) set.add(row.post_id)
  return set
}

async function hydratePost(
  raw: any,
  authorMap: Map<string, SocialPostAuthor>,
  myReactions: Map<string, ReactionType>,
  mySaves: Set<string>,
  chefId: string,
  channelMap?: Map<string, any>
): Promise<SocialPost> {
  const author = authorMap.get(raw.chef_id) ?? {
    id: raw.chef_id,
    display_name: null,
    business_name: 'Unknown',
    profile_image_url: null,
    city: null,
    state: null,
  }

  let channel: SocialPost['channel'] | undefined
  if (raw.channel_id && channelMap?.has(raw.channel_id)) {
    const ch = channelMap.get(raw.channel_id)
    channel = { slug: ch.slug, name: ch.name, icon: ch.icon, color: ch.color }
  }

  return {
    id: raw.id,
    chef_id: raw.chef_id,
    content: raw.content,
    media_urls: raw.media_urls ?? [],
    media_types: raw.media_types ?? [],
    post_type: raw.post_type as PostType,
    visibility: raw.visibility as PostVisibility,
    channel_id: raw.channel_id ?? null,
    channel,
    hashtags: raw.hashtags ?? [],
    location_tag: raw.location_tag ?? null,
    original_post_id: raw.original_post_id ?? null,
    original_post: null, // loaded separately when needed
    share_comment: raw.share_comment ?? null,
    poll_question: raw.poll_question ?? null,
    poll_options: raw.poll_options ?? null,
    poll_closes_at: raw.poll_closes_at ?? null,
    reactions_count: raw.reactions_count ?? 0,
    comments_count: raw.comments_count ?? 0,
    saves_count: raw.saves_count ?? 0,
    shares_count: raw.shares_count ?? 0,
    is_edited: raw.is_edited ?? false,
    created_at: raw.created_at,
    author,
    my_reaction: myReactions.get(raw.id) ?? null,
    is_saved: mySaves.has(raw.id),
    is_mine: raw.chef_id === chefId,
  }
}

// Shared hydration helper used by multiple feed functions
export async function hydratePostList(
  db: any,
  posts: any[],
  chefId: string
): Promise<SocialPost[]> {
  if (!posts.length) return []

  const postIds = posts.map((p) => p.id)
  const authorIds = Array.from(new Set(posts.map((p) => p.chef_id)))
  const channelIds = Array.from(new Set(posts.map((p) => p.channel_id).filter(Boolean)))

  const [authorMap, myReactions, mySaves] = await Promise.all([
    buildAuthorMap(db, authorIds),
    getMyReactionsForPosts(db, chefId, postIds),
    getMySavedPosts(db, chefId, postIds),
  ])

  let channelMap = new Map<string, any>()
  if (channelIds.length) {
    const { data: channels } = await db
      .from('chef_social_channels')
      .select('id, slug, name, icon, color')
      .in('id', channelIds)
    for (const ch of (channels || []) as any[]) channelMap.set(ch.id, ch)
  }

  return Promise.all(
    posts.map((p) => hydratePost(p, authorMap, myReactions, mySaves, chefId, channelMap))
  )
}

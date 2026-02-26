// Chef Social Platform — Server Actions
// Cross-tenant social layer: posts, reactions, comments, follows,
// channels, stories, notifications, saves, discovery.
// All queries use admin client for cross-tenant access.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SOCIAL_MEDIA_BUCKET = 'chef-social-media'
const MAX_MEDIA_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov']
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

// ============================================================
// TYPES
// ============================================================

export type ReactionType = 'like' | 'fire' | 'clap' | 'wow' | 'hungry' | 'insightful'
export type PostVisibility = 'public' | 'followers' | 'connections' | 'private'
export type PostType = 'text' | 'photo' | 'video' | 'reel' | 'poll' | 'share'

export type SocialPostAuthor = {
  id: string
  display_name: string | null
  business_name: string
  profile_image_url: string | null
  city: string | null
  state: string | null
  // populated when viewing a specific profile
  followers_count?: number
  following_count?: number
}

export type SocialPost = {
  id: string
  chef_id: string
  content: string
  media_urls: string[]
  media_types: string[]
  post_type: PostType
  visibility: PostVisibility
  channel_id: string | null
  channel?: { slug: string; name: string; icon: string | null; color: string | null }
  hashtags: string[]
  location_tag: string | null
  original_post_id: string | null
  original_post?: SocialPost | null
  share_comment: string | null
  poll_question: string | null
  poll_options: Array<{ id: string; text: string; votes: number }> | null
  poll_closes_at: string | null
  reactions_count: number
  comments_count: number
  saves_count: number
  shares_count: number
  is_edited: boolean
  created_at: string
  author: SocialPostAuthor
  // viewer-context fields
  my_reaction: ReactionType | null
  is_saved: boolean
  is_mine: boolean
}

export type SocialComment = {
  id: string
  post_id: string
  chef_id: string
  content: string
  parent_comment_id: string | null
  reactions_count: number
  replies_count: number
  is_deleted: boolean
  is_edited: boolean
  created_at: string
  author: SocialPostAuthor
  my_reaction: ReactionType | null
  replies?: SocialComment[]
}

export type SocialChannel = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  category: string
  is_official: boolean
  member_count: number
  post_count: number
  visibility: 'public' | 'private'
  is_member: boolean
  notifications_enabled: boolean
}

export type SocialStory = {
  id: string
  chef_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  duration_seconds: number
  views_count: number
  reactions_count: number
  expires_at: string
  created_at: string
  author: SocialPostAuthor
  is_viewed: boolean
  my_reaction: string | null
}

export type StoryGroup = {
  chef: SocialPostAuthor
  stories: SocialStory[]
  has_unseen: boolean
}

export type SocialNotification = {
  id: string
  notification_type: string
  entity_type: string
  entity_id: string
  agg_count: number
  is_read: boolean
  created_at: string
  actor: SocialPostAuthor | null
}

export type FollowCounts = {
  followers: number
  following: number
}

// ============================================================
// HELPERS
// ============================================================

function db(supabase: ReturnType<typeof createServerClient>) {
  return supabase as any
}

function mimeToMediaType(mime: string): 'image' | 'video' {
  return ALLOWED_VIDEO_TYPES.includes(mime) ? 'video' : 'image'
}

// Extract #hashtags from content, return lowercased array
function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]{1,50})/g) || []
  return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())))
}

async function buildAuthorMap(
  supabase: ReturnType<typeof createServerClient>,
  chefIds: string[]
): Promise<Map<string, SocialPostAuthor>> {
  if (!chefIds.length) return new Map()
  const { data: chefs } = await db(supabase)
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
  supabase: ReturnType<typeof createServerClient>,
  chefId: string,
  postIds: string[]
): Promise<Map<string, ReactionType>> {
  if (!postIds.length) return new Map()
  const { data } = await db(supabase)
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

async function getMySavedPosts(
  supabase: ReturnType<typeof createServerClient>,
  chefId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (!postIds.length) return new Set()
  const { data } = await db(supabase)
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

// ============================================================
// FEED QUERIES
// ============================================================

export async function getSocialFeed(input: {
  mode?: 'for_you' | 'following' | 'global'
  limit?: number
  before?: string // cursor: created_at ISO string
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })
  const mode = input.mode ?? 'for_you'
  const limit = Math.min(input.limit ?? 30, 100)
  const before = input.before

  // Global feed: public posts only, no relationship needed
  if (mode === 'global') {
    let query = db(supabase)
      .from('chef_social_posts')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (before) query = query.lt('created_at', before)
    const { data: posts } = await query
    return hydratePostList(supabase, posts ?? [], user.entityId)
  }

  // Get follow and connection data in parallel
  const [{ data: follows }, { data: connections }] = await Promise.all([
    db(supabase)
      .from('chef_follows')
      .select('following_chef_id')
      .eq('follower_chef_id', user.entityId),
    db(supabase)
      .from('chef_connections')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`),
  ])

  const followingIds: string[] = (follows || []).map((f: any) => f.following_chef_id)
  const connIds: string[] = (connections || []).map((c: any) =>
    c.requester_id === user.entityId ? c.addressee_id : c.requester_id
  )

  if (mode === 'following') {
    if (!followingIds.length) return []
    // Following mode: can only see public + followers-only posts from followed chefs
    let query = db(supabase)
      .from('chef_social_posts')
      .select('*')
      .in('chef_id', followingIds)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (before) query = query.lt('created_at', before)
    const { data: posts } = await query
    return hydratePostList(supabase, posts ?? [], user.entityId)
  }

  // For You: own posts + following + connections, each with correct visibility rules.
  // We run parallel queries per relationship bucket to enforce visibility correctly.
  const followingSet = new Set(followingIds)
  const connSet = new Set(connIds)

  // Categorize authors by relationship (avoiding duplicates)
  const followOnlyIds = followingIds.filter((id) => !connSet.has(id))
  const connOnlyIds = connIds.filter((id) => !followingSet.has(id))
  const bothIds = followingIds.filter((id) => connSet.has(id))

  const queries: Promise<{ data: any[] | null }>[] = [
    // Own posts: all visibilities
    (async () => {
      let q = db(supabase)
        .from('chef_social_posts')
        .select('*')
        .eq('chef_id', user.entityId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (before) q = q.lt('created_at', before)
      return q
    })(),
  ]

  if (followOnlyIds.length) {
    queries.push(
      (async () => {
        let q = db(supabase)
          .from('chef_social_posts')
          .select('*')
          .in('chef_id', followOnlyIds)
          .in('visibility', ['public', 'followers'])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) q = q.lt('created_at', before)
        return q
      })()
    )
  }

  if (connOnlyIds.length) {
    queries.push(
      (async () => {
        let q = db(supabase)
          .from('chef_social_posts')
          .select('*')
          .in('chef_id', connOnlyIds)
          .in('visibility', ['public', 'connections'])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) q = q.lt('created_at', before)
        return q
      })()
    )
  }

  if (bothIds.length) {
    queries.push(
      (async () => {
        let q = db(supabase)
          .from('chef_social_posts')
          .select('*')
          .in('chef_id', bothIds)
          .in('visibility', ['public', 'followers', 'connections'])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) q = q.lt('created_at', before)
        return q
      })()
    )
  }

  const results = await Promise.all(queries)
  const allPosts = results.flatMap((r) => r.data ?? [])

  // Deduplicate by id, then sort descending and take top `limit`
  const seen = new Set<string>()
  const unique = allPosts
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return hydratePostList(supabase, unique, user.entityId)
}

// Shared hydration helper used by multiple feed functions
async function hydratePostList(
  supabase: ReturnType<typeof createServerClient>,
  posts: any[],
  chefId: string
): Promise<SocialPost[]> {
  if (!posts.length) return []

  const postIds = posts.map((p) => p.id)
  const authorIds = Array.from(new Set(posts.map((p) => p.chef_id)))
  const channelIds = Array.from(new Set(posts.map((p) => p.channel_id).filter(Boolean)))

  const [authorMap, myReactions, mySaves] = await Promise.all([
    buildAuthorMap(supabase, authorIds),
    getMyReactionsForPosts(supabase, chefId, postIds),
    getMySavedPosts(supabase, chefId, postIds),
  ])

  let channelMap = new Map<string, any>()
  if (channelIds.length) {
    const { data: channels } = await db(supabase)
      .from('chef_social_channels')
      .select('id, slug, name, icon, color')
      .in('id', channelIds)
    for (const ch of (channels || []) as any[]) channelMap.set(ch.id, ch)
  }

  return Promise.all(
    posts.map((p) => hydratePost(p, authorMap, myReactions, mySaves, chefId, channelMap))
  )
}

export async function getChannelFeed(input: {
  channelSlug: string
  limit?: number
  before?: string
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  // Fetch full channel metadata so hydratePostList can display name/icon/color
  const { data: channel } = await db(supabase)
    .from('chef_social_channels')
    .select('id, slug, name, icon, color')
    .eq('slug', input.channelSlug)
    .single()

  if (!channel) return []

  const ch = channel as any
  const limit = Math.min(input.limit ?? 30, 100)
  const before = input.before

  // Build relationship buckets to enforce visibility rules per author relationship
  const [{ data: follows }, { data: connections }] = await Promise.all([
    db(supabase)
      .from('chef_follows')
      .select('following_chef_id')
      .eq('follower_chef_id', user.entityId),
    db(supabase)
      .from('chef_connections')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`),
  ])

  const followingIds: string[] = (follows || []).map((f: any) => f.following_chef_id)
  const connIds: string[] = (connections || []).map((c: any) =>
    c.requester_id === user.entityId ? c.addressee_id : c.requester_id
  )

  const followingSet = new Set(followingIds)
  const connSet = new Set(connIds)
  const followOnlyIds = followingIds.filter((id) => !connSet.has(id))
  const connOnlyIds = connIds.filter((id) => !followingSet.has(id))
  const bothIds = followingIds.filter((id) => connSet.has(id))
  const knownIds = [user.entityId, ...followingIds, ...connIds]

  const baseQ = () => db(supabase).from('chef_social_posts').select('*').eq('channel_id', ch.id)

  const queries: Promise<{ data: any[] | null }>[] = [
    // Own posts: all visibilities
    (async () => {
      let q = baseQ()
        .eq('chef_id', user.entityId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (before) q = q.lt('created_at', before)
      return q
    })(),
    // Strangers (no relationship): public only — channels show all members' public posts
    (async () => {
      let q = baseQ()
        .not('chef_id', 'in', `(${knownIds.join(',')})`)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (before) q = q.lt('created_at', before)
      return q
    })(),
  ]

  if (followOnlyIds.length) {
    queries.push(
      (async () => {
        let q = baseQ()
          .in('chef_id', followOnlyIds)
          .in('visibility', ['public', 'followers'])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) q = q.lt('created_at', before)
        return q
      })()
    )
  }
  if (connOnlyIds.length) {
    queries.push(
      (async () => {
        let q = baseQ()
          .in('chef_id', connOnlyIds)
          .in('visibility', ['public', 'connections'])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) q = q.lt('created_at', before)
        return q
      })()
    )
  }
  if (bothIds.length) {
    queries.push(
      (async () => {
        let q = baseQ()
          .in('chef_id', bothIds)
          .in('visibility', ['public', 'followers', 'connections'])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) q = q.lt('created_at', before)
        return q
      })()
    )
  }

  const results = await Promise.all(queries)
  const allPosts = results.flatMap((r) => r.data ?? [])

  const seen = new Set<string>()
  const unique = allPosts
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return hydratePostList(supabase, unique, user.entityId)
}

export async function getProfilePosts(input: {
  chefId: string
  limit?: number
  before?: string
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 24, 100)

  // Determine which visibilities the viewer can see
  const isOwn = input.chefId === user.entityId
  let visibilities: PostVisibility[] = ['public']

  if (!isOwn) {
    // Check if following
    const { data: follow } = await db(supabase)
      .from('chef_follows')
      .select('id')
      .eq('follower_chef_id', user.entityId)
      .eq('following_chef_id', input.chefId)
      .maybeSingle()
    if (follow) visibilities = [...visibilities, 'followers']

    // Check if connected
    const { data: conn } = await db(supabase)
      .from('chef_connections')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${user.entityId},addressee_id.eq.${input.chefId}),and(requester_id.eq.${input.chefId},addressee_id.eq.${user.entityId})`
      )
      .maybeSingle()
    if (conn) visibilities = [...visibilities, 'connections']
  } else {
    visibilities = ['public', 'followers', 'connections', 'private']
  }

  let query = db(supabase)
    .from('chef_social_posts')
    .select('*')
    .eq('chef_id', input.chefId)
    .in('visibility', visibilities)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input.before) query = query.lt('created_at', input.before)

  const { data: posts } = await query
  return hydratePostList(supabase, posts ?? [], user.entityId)
}

export async function getTrendingPosts(input: { limit?: number } = {}): Promise<SocialPost[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 20, 50)

  // Public posts from the last 7 days, sorted by reactions
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: posts } = await db(supabase)
    .from('chef_social_posts')
    .select('*')
    .eq('visibility', 'public')
    .gte('created_at', since)
    .order('reactions_count', { ascending: false })
    .limit(limit)

  return hydratePostList(supabase, posts ?? [], user.entityId)
}

export async function getSavedPosts(input: { limit?: number } = {}): Promise<SocialPost[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 40, 100)

  const { data: saves } = await db(supabase)
    .from('chef_post_saves')
    .select('post_id, created_at')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!saves?.length) return []

  const postIds = (saves as any[]).map((s) => s.post_id)
  const { data: posts } = await db(supabase).from('chef_social_posts').select('*').in('id', postIds)

  // Re-sort to match save order (most recently saved first)
  const saveOrder = new Map((saves as any[]).map((s, i) => [s.post_id, i]))
  const sorted = (posts ?? []).sort(
    (a: any, b: any) => (saveOrder.get(a.id) ?? 999) - (saveOrder.get(b.id) ?? 999)
  )

  return hydratePostList(supabase, sorted, user.entityId)
}

// ============================================================
// POST MUTATIONS
// ============================================================

const CreatePostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  media_urls: z.array(z.string().url()).max(10).default([]),
  media_types: z
    .array(z.enum(['image', 'video']))
    .max(10)
    .default([]),
  post_type: z.enum(['text', 'photo', 'video', 'reel', 'poll', 'share']).default('text'),
  visibility: z.enum(['public', 'followers', 'connections', 'private']).default('public'),
  channel_id: z.string().uuid().nullable().optional(),
  location_tag: z.string().max(100).nullable().optional(),
  original_post_id: z.string().uuid().nullable().optional(),
  share_comment: z.string().max(1000).nullable().optional(),
  poll_question: z.string().max(200).nullable().optional(),
  poll_options: z
    .array(z.object({ id: z.string(), text: z.string().max(100) }))
    .max(4)
    .nullable()
    .optional(),
  poll_closes_at: z.string().datetime().nullable().optional(),
})

export async function createSocialPost(input: z.infer<typeof CreatePostSchema>) {
  const user = await requireChef()
  const validated = CreatePostSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const hashtags = extractHashtags(validated.content)

  const { data: post, error } = await db(supabase)
    .from('chef_social_posts')
    .insert({
      chef_id: user.entityId,
      content: validated.content,
      media_urls: validated.media_urls,
      media_types: validated.media_types,
      post_type: validated.post_type,
      visibility: validated.visibility,
      channel_id: validated.channel_id ?? null,
      hashtags,
      location_tag: validated.location_tag ?? null,
      original_post_id: validated.original_post_id ?? null,
      share_comment: validated.share_comment ?? null,
      poll_question: validated.poll_question ?? null,
      poll_options: validated.poll_options ?? null,
      poll_closes_at: validated.poll_closes_at ?? null,
    })
    .select('id, created_at')
    .single()

  if (error || !post) {
    console.error('[createSocialPost]', error)
    throw new Error('Failed to create post')
  }

  // Upsert hashtags into registry
  if (hashtags.length) {
    for (const tag of hashtags) {
      const { data: existing } = await db(supabase)
        .from('chef_social_hashtags')
        .select('id')
        .eq('tag', tag)
        .maybeSingle()

      let hashtagId: string
      if (existing) {
        hashtagId = (existing as any).id
      } else {
        const { data: newTag } = await db(supabase)
          .from('chef_social_hashtags')
          .insert({ tag })
          .select('id')
          .single()
        hashtagId = (newTag as any)?.id
      }

      if (hashtagId) {
        await db(supabase)
          .from('chef_post_hashtags')
          .insert({ post_id: (post as any).id, hashtag_id: hashtagId })
          .onConflict('post_id,hashtag_id')
          .ignore()
      }
    }
  }

  revalidatePath('/network')
  revalidatePath('/network/feed')
  return { success: true, post_id: (post as any).id }
}

export async function deleteSocialPost(postId: string) {
  const user = await requireChef()
  z.string().uuid().parse(postId)
  const supabase = createServerClient({ admin: true })

  const { data: post } = await db(supabase)
    .from('chef_social_posts')
    .select('chef_id')
    .eq('id', postId)
    .single()

  if (!post || (post as any).chef_id !== user.entityId) {
    throw new Error('Post not found or not yours')
  }

  await db(supabase).from('chef_social_posts').delete().eq('id', postId)

  revalidatePath('/network')
  revalidatePath('/network/feed')
  return { success: true }
}

export async function uploadPostMedia(
  formData: FormData
): Promise<{ url: string; type: 'image' | 'video' }> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) throw new Error('Unsupported file type')
  if (file.size > MAX_MEDIA_SIZE) throw new Error('File too large (max 50MB)')

  const ext = file.name.split('.').pop() || 'bin'
  const path = `${user.entityId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(SOCIAL_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error('Upload failed')

  const { data: urlData } = supabase.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl, type: mimeToMediaType(file.type) }
}

// ============================================================
// REACTIONS
// ============================================================

export async function togglePostReaction(input: { postId: string; reaction: ReactionType }) {
  const user = await requireChef()
  z.string().uuid().parse(input.postId)
  const supabase = createServerClient({ admin: true })

  const { data: existing } = await db(supabase)
    .from('chef_post_reactions')
    .select('id, reaction_type')
    .eq('post_id', input.postId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    const ex = existing as any
    if (ex.reaction_type === input.reaction) {
      // Same reaction → remove it (toggle off)
      await db(supabase).from('chef_post_reactions').delete().eq('id', ex.id)
    } else {
      // Different reaction → update type (count stays same)
      await db(supabase)
        .from('chef_post_reactions')
        .update({ reaction_type: input.reaction })
        .eq('id', ex.id)
    }
  } else {
    // New reaction
    await db(supabase).from('chef_post_reactions').insert({
      post_id: input.postId,
      chef_id: user.entityId,
      reaction_type: input.reaction,
    })

    // Notify post author (if not own post)
    const { data: postRow } = await db(supabase)
      .from('chef_social_posts')
      .select('chef_id')
      .eq('id', input.postId)
      .single()

    if (postRow && (postRow as any).chef_id !== user.entityId) {
      await db(supabase)
        .from('chef_social_notifications')
        .insert({
          recipient_chef_id: (postRow as any).chef_id,
          actor_chef_id: user.entityId,
          notification_type: 'post_reaction',
          entity_type: 'post',
          entity_id: input.postId,
        })
    }
  }

  revalidatePath('/network')
  return { success: true }
}

export async function toggleCommentReaction(input: { commentId: string; reaction: ReactionType }) {
  const user = await requireChef()
  z.string().uuid().parse(input.commentId)
  const supabase = createServerClient({ admin: true })

  const { data: existing } = await db(supabase)
    .from('chef_comment_reactions')
    .select('id, reaction_type')
    .eq('comment_id', input.commentId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    const ex = existing as any
    if (ex.reaction_type === input.reaction) {
      await db(supabase).from('chef_comment_reactions').delete().eq('id', ex.id)
    } else {
      await db(supabase)
        .from('chef_comment_reactions')
        .update({ reaction_type: input.reaction })
        .eq('id', ex.id)
    }
  } else {
    await db(supabase).from('chef_comment_reactions').insert({
      comment_id: input.commentId,
      chef_id: user.entityId,
      reaction_type: input.reaction,
    })
  }

  revalidatePath('/network')
  return { success: true }
}

// ============================================================
// COMMENTS
// ============================================================

export async function getPostComments(postId: string): Promise<SocialComment[]> {
  const user = await requireChef()
  z.string().uuid().parse(postId)
  const supabase = createServerClient({ admin: true })

  const { data: comments } = await db(supabase)
    .from('chef_post_comments')
    .select('*')
    .eq('post_id', postId)
    .is('parent_comment_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(100)

  if (!comments?.length) return []

  const commentIds = (comments as any[]).map((c) => c.id)
  const authorIds = Array.from(new Set((comments as any[]).map((c) => c.chef_id)))

  // Load top-level replies
  const { data: replies } = await db(supabase)
    .from('chef_post_comments')
    .select('*')
    .in('parent_comment_id', commentIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(200)

  const replyAuthorIds = Array.from(new Set((replies || []).map((r: any) => r.chef_id)))
  const allAuthorIds = Array.from(new Set([...authorIds, ...replyAuthorIds]))

  const { data: myReactionsData } = await db(supabase)
    .from('chef_comment_reactions')
    .select('comment_id, reaction_type')
    .eq('chef_id', user.entityId)
    .in('comment_id', [...commentIds, ...(replies || []).map((r: any) => r.id)])

  const myReactionMap = new Map<string, ReactionType>()
  for (const r of (myReactionsData || []) as any[]) {
    myReactionMap.set(r.comment_id, r.reaction_type)
  }

  const authorMap = await buildAuthorMap(supabase, allAuthorIds)

  const replyMap = new Map<string, SocialComment[]>()
  for (const reply of (replies || []) as any[]) {
    const arr = replyMap.get(reply.parent_comment_id) ?? []
    arr.push({
      id: reply.id,
      post_id: reply.post_id,
      chef_id: reply.chef_id,
      content: reply.content,
      parent_comment_id: reply.parent_comment_id,
      reactions_count: reply.reactions_count ?? 0,
      replies_count: reply.replies_count ?? 0,
      is_deleted: reply.is_deleted,
      is_edited: reply.is_edited,
      created_at: reply.created_at,
      author: authorMap.get(reply.chef_id) ?? {
        id: reply.chef_id,
        display_name: null,
        business_name: 'Unknown',
        profile_image_url: null,
        city: null,
        state: null,
      },
      my_reaction: myReactionMap.get(reply.id) ?? null,
    })
    replyMap.set(reply.parent_comment_id, arr)
  }

  return (comments as any[]).map((c) => ({
    id: c.id,
    post_id: c.post_id,
    chef_id: c.chef_id,
    content: c.content,
    parent_comment_id: null,
    reactions_count: c.reactions_count ?? 0,
    replies_count: c.replies_count ?? 0,
    is_deleted: c.is_deleted,
    is_edited: c.is_edited,
    created_at: c.created_at,
    author: authorMap.get(c.chef_id) ?? {
      id: c.chef_id,
      display_name: null,
      business_name: 'Unknown',
      profile_image_url: null,
      city: null,
      state: null,
    },
    my_reaction: myReactionMap.get(c.id) ?? null,
    replies: replyMap.get(c.id) ?? [],
  }))
}

export async function createComment(input: {
  postId: string
  content: string
  parentCommentId?: string | null
}) {
  const user = await requireChef()
  z.string().uuid().parse(input.postId)
  if (input.parentCommentId) z.string().uuid().parse(input.parentCommentId)
  const content = z.string().trim().min(1).max(2000).parse(input.content)
  const supabase = createServerClient({ admin: true })

  const { data: comment, error } = await db(supabase)
    .from('chef_post_comments')
    .insert({
      post_id: input.postId,
      chef_id: user.entityId,
      content,
      parent_comment_id: input.parentCommentId ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error('Failed to create comment')

  // Notify post/comment author
  const { data: postRow } = await db(supabase)
    .from('chef_social_posts')
    .select('chef_id')
    .eq('id', input.postId)
    .single()

  if (postRow && (postRow as any).chef_id !== user.entityId) {
    await db(supabase)
      .from('chef_social_notifications')
      .insert({
        recipient_chef_id: (postRow as any).chef_id,
        actor_chef_id: user.entityId,
        notification_type: input.parentCommentId ? 'comment_reply' : 'post_comment',
        entity_type: 'comment',
        entity_id: (comment as any).id,
      })
  }

  revalidatePath('/network')
  return { success: true, comment_id: (comment as any).id }
}

export async function deleteComment(commentId: string) {
  const user = await requireChef()
  z.string().uuid().parse(commentId)
  const supabase = createServerClient({ admin: true })

  const { data: comment } = await db(supabase)
    .from('chef_post_comments')
    .select('chef_id')
    .eq('id', commentId)
    .single()

  if (!comment || (comment as any).chef_id !== user.entityId) {
    throw new Error('Comment not found or not yours')
  }

  await db(supabase)
    .from('chef_post_comments')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', commentId)

  revalidatePath('/network')
  return { success: true }
}

// ============================================================
// FOLLOWS
// ============================================================

export async function followChef(targetChefId: string) {
  const user = await requireChef()
  z.string().uuid().parse(targetChefId)
  if (targetChefId === user.entityId) throw new Error('Cannot follow yourself')
  const supabase = createServerClient({ admin: true })

  await db(supabase)
    .from('chef_follows')
    .insert({ follower_chef_id: user.entityId, following_chef_id: targetChefId })

  // Notify target
  await db(supabase).from('chef_social_notifications').insert({
    recipient_chef_id: targetChefId,
    actor_chef_id: user.entityId,
    notification_type: 'new_follower',
    entity_type: 'follow',
    entity_id: user.entityId,
  })

  revalidatePath('/network')
  return { success: true }
}

export async function unfollowChef(targetChefId: string) {
  const user = await requireChef()
  z.string().uuid().parse(targetChefId)
  const supabase = createServerClient({ admin: true })

  await db(supabase)
    .from('chef_follows')
    .delete()
    .eq('follower_chef_id', user.entityId)
    .eq('following_chef_id', targetChefId)

  revalidatePath('/network')
  return { success: true }
}

export async function getFollowStatus(targetChefId: string): Promise<{
  is_following: boolean
  is_followed_by: boolean
}> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const [{ data: fwd }, { data: rev }] = await Promise.all([
    db(supabase)
      .from('chef_follows')
      .select('id')
      .eq('follower_chef_id', user.entityId)
      .eq('following_chef_id', targetChefId)
      .maybeSingle(),
    db(supabase)
      .from('chef_follows')
      .select('id')
      .eq('follower_chef_id', targetChefId)
      .eq('following_chef_id', user.entityId)
      .maybeSingle(),
  ])

  return { is_following: !!fwd, is_followed_by: !!rev }
}

export async function getFollowCounts(chefId: string): Promise<FollowCounts> {
  const supabase = createServerClient({ admin: true })

  const [{ count: followers }, { count: following }] = await Promise.all([
    db(supabase)
      .from('chef_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_chef_id', chefId),
    db(supabase)
      .from('chef_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_chef_id', chefId),
  ])

  return { followers: followers ?? 0, following: following ?? 0 }
}

// ============================================================
// CHANNELS
// ============================================================

export async function listChannels(input: { category?: string } = {}): Promise<SocialChannel[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  let query = db(supabase)
    .from('chef_social_channels')
    .select('*')
    .eq('visibility', 'public')
    .order('is_official', { ascending: false })
    .order('member_count', { ascending: false })

  if (input.category) query = query.eq('category', input.category)

  const { data: channels } = await query
  if (!channels?.length) return []

  // Get membership status for current chef
  const channelIds = (channels as any[]).map((c) => c.id)
  const { data: memberships } = await db(supabase)
    .from('chef_channel_memberships')
    .select('channel_id, notifications_enabled')
    .eq('chef_id', user.entityId)
    .in('channel_id', channelIds)

  const memberMap = new Map<string, { notifications_enabled: boolean }>()
  for (const m of (memberships || []) as any[]) {
    memberMap.set(m.channel_id, { notifications_enabled: m.notifications_enabled })
  }

  return (channels as any[]).map((ch) => ({
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    description: ch.description,
    icon: ch.icon,
    color: ch.color,
    category: ch.category,
    is_official: ch.is_official,
    member_count: ch.member_count,
    post_count: ch.post_count,
    visibility: ch.visibility,
    is_member: memberMap.has(ch.id),
    notifications_enabled: memberMap.get(ch.id)?.notifications_enabled ?? false,
  }))
}

export async function joinChannel(channelId: string) {
  const user = await requireChef()
  z.string().uuid().parse(channelId)
  const supabase = createServerClient({ admin: true })

  await db(supabase)
    .from('chef_channel_memberships')
    .upsert({ channel_id: channelId, chef_id: user.entityId }, { onConflict: 'channel_id,chef_id' })

  revalidatePath('/network/channels')
  return { success: true }
}

export async function leaveChannel(channelId: string) {
  const user = await requireChef()
  z.string().uuid().parse(channelId)
  const supabase = createServerClient({ admin: true })

  await db(supabase)
    .from('chef_channel_memberships')
    .delete()
    .eq('channel_id', channelId)
    .eq('chef_id', user.entityId)

  revalidatePath('/network/channels')
  return { success: true }
}

export async function getMyChannels(): Promise<SocialChannel[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data: memberships } = await db(supabase)
    .from('chef_channel_memberships')
    .select('channel_id, notifications_enabled')
    .eq('chef_id', user.entityId)

  if (!memberships?.length) return []

  const channelIds = (memberships as any[]).map((m) => m.channel_id)
  const memberMap = new Map(
    (memberships as any[]).map((m) => [m.channel_id, m.notifications_enabled])
  )

  const { data: channels } = await db(supabase)
    .from('chef_social_channels')
    .select('*')
    .in('id', channelIds)

  return (channels || []).map((ch: any) => ({
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    description: ch.description,
    icon: ch.icon,
    color: ch.color,
    category: ch.category,
    is_official: ch.is_official,
    member_count: ch.member_count,
    post_count: ch.post_count,
    visibility: ch.visibility,
    is_member: true,
    notifications_enabled: memberMap.get(ch.id) ?? true,
  }))
}

// ============================================================
// STORIES
// ============================================================

export async function getActiveStories(): Promise<StoryGroup[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  // Get chefs whose stories we can see: self + following + connections
  const [{ data: follows }, { data: connections }] = await Promise.all([
    db(supabase)
      .from('chef_follows')
      .select('following_chef_id')
      .eq('follower_chef_id', user.entityId),
    db(supabase)
      .from('chef_connections')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`),
  ])

  const followingIds = (follows || []).map((f: any) => f.following_chef_id)
  const connIds = (connections || []).map((c: any) =>
    c.requester_id === user.entityId ? c.addressee_id : c.requester_id
  )
  const visibleChefIds = Array.from(new Set([user.entityId, ...followingIds, ...connIds]))

  const { data: stories } = await db(supabase)
    .from('chef_stories')
    .select('*')
    .in('chef_id', visibleChefIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (!stories?.length) return []

  const storyIds = (stories as any[]).map((s) => s.id)
  const authorIds = Array.from(new Set((stories as any[]).map((s) => s.chef_id)))

  const [authorMap, { data: myViews }, { data: myReactions }] = await Promise.all([
    buildAuthorMap(supabase, authorIds),
    db(supabase)
      .from('chef_story_views')
      .select('story_id')
      .eq('viewer_chef_id', user.entityId)
      .in('story_id', storyIds),
    db(supabase)
      .from('chef_story_reactions')
      .select('story_id, emoji')
      .eq('chef_id', user.entityId)
      .in('story_id', storyIds),
  ])

  const viewedSet = new Set((myViews || []).map((v: any) => v.story_id))
  const reactionMap = new Map((myReactions || []).map((r: any) => [r.story_id, r.emoji]))

  // Group by chef
  const groupMap = new Map<string, SocialStory[]>()
  for (const story of stories as any[]) {
    const storyObj: SocialStory = {
      id: story.id,
      chef_id: story.chef_id,
      media_url: story.media_url,
      media_type: story.media_type,
      caption: story.caption,
      duration_seconds: story.duration_seconds,
      views_count: story.views_count,
      reactions_count: story.reactions_count,
      expires_at: story.expires_at,
      created_at: story.created_at,
      author: authorMap.get(story.chef_id) ?? {
        id: story.chef_id,
        display_name: null,
        business_name: 'Unknown',
        profile_image_url: null,
        city: null,
        state: null,
      },
      is_viewed: viewedSet.has(story.id),
      my_reaction: (reactionMap.get(story.id) ?? null) as string | null,
    }
    const arr = groupMap.get(story.chef_id) ?? []
    arr.push(storyObj)
    groupMap.set(story.chef_id, arr)
  }

  // Sort: own stories first, then unseen, then seen; within each group chronological
  const groups: StoryGroup[] = []
  for (const [chefId, chefStories] of groupMap) {
    const sorted = chefStories.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const has_unseen = sorted.some((s) => !s.is_viewed)
    groups.push({ chef: authorMap.get(chefId)!, stories: sorted, has_unseen })
  }

  return groups.sort((a, b) => {
    if (a.chef.id === user.entityId) return -1
    if (b.chef.id === user.entityId) return 1
    if (a.has_unseen && !b.has_unseen) return -1
    if (!a.has_unseen && b.has_unseen) return 1
    return 0
  })
}

export async function createStory(input: {
  media_url: string
  media_type: 'image' | 'video'
  caption?: string | null
  duration_seconds?: number
}) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { error } = await db(supabase)
    .from('chef_stories')
    .insert({
      chef_id: user.entityId,
      media_url: input.media_url,
      media_type: input.media_type,
      caption: input.caption ?? null,
      duration_seconds: input.duration_seconds ?? 5,
    })

  if (error) throw new Error('Failed to create story')
  revalidatePath('/network')
  return { success: true }
}

export async function markStoryViewed(storyId: string) {
  const user = await requireChef()
  z.string().uuid().parse(storyId)
  const supabase = createServerClient({ admin: true })

  await db(supabase)
    .from('chef_story_views')
    .upsert(
      { story_id: storyId, viewer_chef_id: user.entityId },
      { onConflict: 'story_id,viewer_chef_id' }
    )

  return { success: true }
}

export async function reactToStory(input: { storyId: string; emoji: string }) {
  const user = await requireChef()
  z.string().uuid().parse(input.storyId)
  const supabase = createServerClient({ admin: true })

  await db(supabase)
    .from('chef_story_reactions')
    .upsert(
      { story_id: input.storyId, chef_id: user.entityId, emoji: input.emoji.slice(0, 10) },
      { onConflict: 'story_id,chef_id' }
    )

  // Notify story owner
  const { data: story } = await db(supabase)
    .from('chef_stories')
    .select('chef_id')
    .eq('id', input.storyId)
    .single()

  if (story && (story as any).chef_id !== user.entityId) {
    await db(supabase)
      .from('chef_social_notifications')
      .insert({
        recipient_chef_id: (story as any).chef_id,
        actor_chef_id: user.entityId,
        notification_type: 'story_reaction',
        entity_type: 'story',
        entity_id: input.storyId,
      })
  }

  return { success: true }
}

// ============================================================
// SAVES
// ============================================================

export async function toggleSavePost(postId: string) {
  const user = await requireChef()
  z.string().uuid().parse(postId)
  const supabase = createServerClient({ admin: true })

  const { data: existing } = await db(supabase)
    .from('chef_post_saves')
    .select('id')
    .eq('post_id', postId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    await db(supabase)
      .from('chef_post_saves')
      .delete()
      .eq('id', (existing as any).id)
    revalidatePath('/network')
    return { saved: false }
  } else {
    await db(supabase).from('chef_post_saves').insert({ post_id: postId, chef_id: user.entityId })
    revalidatePath('/network')
    return { saved: true }
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getSocialNotifications(
  input: { limit?: number } = {}
): Promise<SocialNotification[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 40, 100)

  const { data: notifs } = await db(supabase)
    .from('chef_social_notifications')
    .select('*')
    .eq('recipient_chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!notifs?.length) return []

  const actorIds = Array.from(
    new Set((notifs as any[]).map((n) => n.actor_chef_id).filter(Boolean))
  )
  const authorMap = await buildAuthorMap(supabase, actorIds)

  return (notifs as any[]).map((n) => ({
    id: n.id,
    notification_type: n.notification_type,
    entity_type: n.entity_type,
    entity_id: n.entity_id,
    agg_count: n.agg_count ?? 1,
    is_read: n.is_read,
    created_at: n.created_at,
    actor: n.actor_chef_id ? (authorMap.get(n.actor_chef_id) ?? null) : null,
  }))
}

export async function markSocialNotificationsRead(notifIds?: string[]) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  let query = db(supabase)
    .from('chef_social_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_chef_id', user.entityId)

  if (notifIds?.length) {
    query = query.in('id', notifIds)
  }

  await query
  revalidatePath('/network')
  return { success: true }
}

export async function getUnreadSocialNotificationCount(): Promise<number> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { count } = await db(supabase)
    .from('chef_social_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_chef_id', user.entityId)
    .eq('is_read', false)

  return count ?? 0
}

// ============================================================
// DISCOVERY
// ============================================================

export async function getDiscoverChefs(
  input: { limit?: number } = {}
): Promise<SocialPostAuthor[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 20, 50)

  // Chefs the current user isn't following yet, discoverable, ordered by followers
  const { data: alreadyFollowing } = await db(supabase)
    .from('chef_follows')
    .select('following_chef_id')
    .eq('follower_chef_id', user.entityId)

  const excludeIds = [
    user.entityId,
    ...((alreadyFollowing || []) as any[]).map((f) => f.following_chef_id),
  ]

  const { data: chefs } = await db(supabase)
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
  const supabase = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 20, 50)

  const { data: tags } = await db(supabase)
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
  const supabase = createServerClient({ admin: true })

  const [{ data: chef }, counts, followStatus, { data: conn }, { count: postCount }] =
    await Promise.all([
      db(supabase)
        .from('chefs')
        .select(
          `id, display_name, business_name, bio, profile_image_url,
               chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)`
        )
        .eq('id', chefId)
        .single(),
      getFollowCounts(chefId),
      getFollowStatus(chefId),
      db(supabase)
        .from('chef_connections')
        .select('id')
        .eq('status', 'accepted')
        .or(
          `and(requester_id.eq.${user.entityId},addressee_id.eq.${chefId}),and(requester_id.eq.${chefId},addressee_id.eq.${user.entityId})`
        )
        .maybeSingle(),
      db(supabase)
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

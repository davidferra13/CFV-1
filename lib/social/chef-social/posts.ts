'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { extractHashtags, hydratePostList } from './helpers'
import type { PostType, PostVisibility, SocialPost } from './types'

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
function mimeToMediaType(mime: string): 'image' | 'video' {
  return ALLOWED_VIDEO_TYPES.includes(mime) ? 'video' : 'image'
}

// ============================================================
// FEED QUERIES
// ============================================================

export async function getSocialFeed(input: {
  mode?: 'for_you' | 'following' | 'global'
  limit?: number
  before?: string // cursor: created_at ISO string
  post_type?: PostType // optional filter: only return posts of this type
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const mode = input.mode ?? 'for_you'
  const limit = Math.min(input.limit ?? 30, 100)
  const before = input.before
  const postTypeFilter = input.post_type

  // Global feed: public posts only, no relationship needed
  if (mode === 'global') {
    let query = db
      .from('chef_social_posts')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (before) query = query.lt('created_at', before)
    if (postTypeFilter) query = query.eq('post_type', postTypeFilter)
    const { data: posts } = await query
    return hydratePostList(db, posts ?? [], user.entityId)
  }

  // Get follow and connection data in parallel
  const [{ data: follows }, { data: connections }] = await Promise.all([
    db.from('chef_follows').select('following_chef_id').eq('follower_chef_id', user.entityId),
    db
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
    let query = db
      .from('chef_social_posts')
      .select('*')
      .in('chef_id', followingIds)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (before) query = query.lt('created_at', before)
    if (postTypeFilter) query = query.eq('post_type', postTypeFilter)
    const { data: posts } = await query
    return hydratePostList(db, posts ?? [], user.entityId)
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
      let q = db
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
        let q = db
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
        let q = db
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
        let q = db
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

  // Deduplicate by id, optionally filter by post_type, then sort descending and take top `limit`
  const seen = new Set<string>()
  const unique = allPosts
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      if (postTypeFilter && p.post_type !== postTypeFilter) return false
      return true
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return hydratePostList(db, unique, user.entityId)
}

export async function getChannelFeed(input: {
  channelSlug: string
  limit?: number
  before?: string
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  // Fetch full channel metadata so hydratePostList can display name/icon/color
  const { data: channel } = await db
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
    db.from('chef_follows').select('following_chef_id').eq('follower_chef_id', user.entityId),
    db
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

  const baseQ = () => db.from('chef_social_posts').select('*').eq('channel_id', ch.id)

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
    // Strangers (no relationship): public only - channels show all members' public posts
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

  return hydratePostList(db, unique, user.entityId)
}

export async function getProfilePosts(input: {
  chefId: string
  limit?: number
  before?: string
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 24, 100)

  // Determine which visibilities the viewer can see
  const isOwn = input.chefId === user.entityId
  let visibilities: PostVisibility[] = ['public']

  if (!isOwn) {
    // Check if following
    const { data: follow } = await db
      .from('chef_follows')
      .select('id')
      .eq('follower_chef_id', user.entityId)
      .eq('following_chef_id', input.chefId)
      .maybeSingle()
    if (follow) visibilities = [...visibilities, 'followers']

    // Check if connected
    const { data: conn } = await db
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

  let query = db
    .from('chef_social_posts')
    .select('*')
    .eq('chef_id', input.chefId)
    .in('visibility', visibilities)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input.before) query = query.lt('created_at', input.before)

  const { data: posts } = await query
  return hydratePostList(db, posts ?? [], user.entityId)
}

export async function getTrendingPosts(input: { limit?: number } = {}): Promise<SocialPost[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 20, 50)

  // Public posts from the last 7 days, sorted by reactions
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: posts } = await db
    .from('chef_social_posts')
    .select('*')
    .eq('visibility', 'public')
    .gte('created_at', since)
    .order('reactions_count', { ascending: false })
    .limit(limit)

  return hydratePostList(db, posts ?? [], user.entityId)
}

export async function getSavedPosts(input: { limit?: number } = {}): Promise<SocialPost[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 40, 100)

  const { data: saves } = await db
    .from('chef_post_saves')
    .select('post_id, created_at')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!saves?.length) return []

  const postIds = (saves as any[]).map((s) => s.post_id)
  const { data: posts } = await db.from('chef_social_posts').select('*').in('id', postIds)

  // Re-sort to match save order (most recently saved first)
  const saveOrder = new Map((saves as any[]).map((s, i) => [s.post_id, i]))
  const sorted = (posts ?? []).sort(
    (a: any, b: any) => (saveOrder.get(a.id) ?? 999) - (saveOrder.get(b.id) ?? 999)
  )

  return hydratePostList(db, sorted, user.entityId)
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
  post_type: z
    .enum(['text', 'photo', 'video', 'reel', 'poll', 'share', 'opportunity'])
    .default('text'),
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
  const db = createServerClient({ admin: true })

  const hashtags = extractHashtags(validated.content)

  const { data: post, error } = await db
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
      const { data: existing } = await db
        .from('chef_social_hashtags')
        .select('id')
        .eq('tag', tag)
        .maybeSingle()

      let hashtagId: string
      if (existing) {
        hashtagId = (existing as any).id
      } else {
        const { data: newTag } = await db
          .from('chef_social_hashtags')
          .insert({ tag })
          .select('id')
          .single()
        hashtagId = (newTag as any)?.id
      }

      if (hashtagId) {
        try {
          await db
            .from('chef_post_hashtags')
            .insert({ post_id: (post as any).id, hashtag_id: hashtagId })
        } catch (e: any) {
          // Ignore duplicate key (unique constraint) errors
          if (!e?.message?.includes('duplicate key') && !e?.message?.includes('unique constraint'))
            throw e
        }
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
  const db = createServerClient({ admin: true })

  const { data: post } = await db
    .from('chef_social_posts')
    .select('chef_id')
    .eq('id', postId)
    .single()

  if (!post || (post as any).chef_id !== user.entityId) {
    throw new Error('Post not found or not yours')
  }

  await db.from('chef_social_posts').delete().eq('id', postId)

  revalidatePath('/network')
  revalidatePath('/network/feed')
  return { success: true }
}

export async function uploadPostMedia(
  formData: FormData
): Promise<{ url: string; type: 'image' | 'video' }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) throw new Error('Unsupported file type')
  if (file.size > MAX_MEDIA_SIZE) throw new Error('File too large (max 50MB)')

  const ext = file.name.split('.').pop() || 'bin'
  const path = `${user.entityId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await db.storage
    .from(SOCIAL_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error('Upload failed')

  const { data: urlData } = await db.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl, type: mimeToMediaType(file.type) }
}

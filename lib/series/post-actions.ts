'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  SeriesPost,
  SeriesPostCreateInput,
  SeriesPostUpdateInput,
  SeriesOperationResult,
} from './types'

const VALID_POST_TYPES = new Set([
  'update',
  'sourcing',
  'menu_preview',
  'behind_scenes',
  'announcement',
  'recap',
  'transparency',
  'milestone',
])

async function requirePublishingHost(
  db: any,
  seriesId: string,
  userId: string
): Promise<{ id: string } | null> {
  const { data } = await db
    .from('series_hosts')
    .select('id, can_publish_posts')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!data || !data.can_publish_posts) return null
  return { id: data.id }
}

async function requireActiveHost(
  db: any,
  seriesId: string,
  userId: string
): Promise<{ id: string } | null> {
  const { data } = await db
    .from('series_hosts')
    .select('id')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data ? { id: data.id } : null
}

function mapPostRow(row: any): SeriesPost {
  return {
    id: row.id,
    seriesId: row.series_id,
    authorHostId: row.author_host_id,
    postType: row.post_type,
    title: row.title,
    body: row.body,
    imageUrls: row.image_urls ?? [],
    linkUrl: row.link_url,
    linkLabel: row.link_label,
    eventId: row.event_id,
    visibility: row.visibility,
    pinned: row.pinned,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.series_hosts?.display_name,
    authorRole: row.series_hosts?.display_role,
    authorAvatarUrl: row.series_hosts?.avatar_url,
  }
}

export async function createSeriesPost(
  input: SeriesPostCreateInput
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requirePublishingHost(db, input.seriesId, user.userId)
    if (!host) return { success: false, error: 'No permission to publish posts' }

    const body = input.body.trim()
    if (!body) return { success: false, error: 'Post body is required' }
    if (body.length > 5000) return { success: false, error: 'Post body is too long' }

    if (!VALID_POST_TYPES.has(input.postType)) {
      return { success: false, error: 'Invalid post type' }
    }

    if (input.imageUrls && input.imageUrls.length > 20) {
      return { success: false, error: 'Maximum 20 images per post' }
    }

    const { data: post, error } = await db
      .from('series_posts')
      .insert({
        series_id: input.seriesId,
        author_host_id: host.id,
        post_type: input.postType,
        title: input.title?.trim() || null,
        body,
        image_urls: input.imageUrls ?? [],
        link_url: input.linkUrl?.trim() || null,
        link_label: input.linkLabel?.trim() || null,
        event_id: input.eventId ?? null,
        visibility: input.visibility ?? 'members',
        pinned: input.pinned ?? false,
      })
      .select('id')
      .single()

    if (error || !post) {
      return { success: false, error: error?.message ?? 'Failed to create post' }
    }

    revalidatePath('/circles')
    revalidatePath(`/series/${input.seriesId}`)
    return { success: true, seriesId: input.seriesId, postId: post.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function listSeriesPosts(input: {
  seriesId: string
  visibility?: 'members' | 'public' | 'all'
  limit?: number
  cursor?: string
}): Promise<{ posts: SeriesPost[]; nextCursor: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const host = await requireActiveHost(db, input.seriesId, user.userId)
  if (!host) return { posts: [], nextCursor: null }

  const limit = Math.min(input.limit ?? 20, 50)

  let query = db
    .from('series_posts')
    .select('*, series_hosts!author_host_id(display_name, display_role, avatar_url)')
    .eq('series_id', input.seriesId)
    .is('archived_at', null)
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit + 1)

  if (input.visibility && input.visibility !== 'all') {
    query = query.eq('visibility', input.visibility)
  }

  if (input.cursor) {
    query = query.lt('published_at', input.cursor)
  }

  const { data: rows } = await query

  if (!rows?.length) return { posts: [], nextCursor: null }

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? slice[slice.length - 1].published_at : null

  return {
    posts: slice.map(mapPostRow),
    nextCursor,
  }
}

export async function getSeriesPost(seriesId: string, postId: string): Promise<SeriesPost | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const host = await requireActiveHost(db, seriesId, user.userId)
  if (!host) return null

  const { data: row } = await db
    .from('series_posts')
    .select('*, series_hosts!author_host_id(display_name, display_role, avatar_url)')
    .eq('id', postId)
    .eq('series_id', seriesId)
    .maybeSingle()

  return row ? mapPostRow(row) : null
}

export async function updateSeriesPost(
  seriesId: string,
  postId: string,
  updates: SeriesPostUpdateInput
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requirePublishingHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'No permission to edit posts' }

    const { data: existing } = await db
      .from('series_posts')
      .select('id, author_host_id')
      .eq('id', postId)
      .eq('series_id', seriesId)
      .is('archived_at', null)
      .maybeSingle()

    if (!existing) return { success: false, error: 'Post not found' }
    if (existing.author_host_id !== host.id) {
      return { success: false, error: 'Can only edit your own posts' }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (updates.body !== undefined) {
      const body = updates.body.trim()
      if (!body) return { success: false, error: 'Post body is required' }
      if (body.length > 5000) return { success: false, error: 'Post body is too long' }
      patch.body = body
    }
    if (updates.title !== undefined) patch.title = updates.title?.trim() || null
    if (updates.imageUrls !== undefined) {
      if (updates.imageUrls.length > 20) {
        return { success: false, error: 'Maximum 20 images per post' }
      }
      patch.image_urls = updates.imageUrls
    }
    if (updates.linkUrl !== undefined) patch.link_url = updates.linkUrl?.trim() || null
    if (updates.linkLabel !== undefined) patch.link_label = updates.linkLabel?.trim() || null
    if (updates.visibility !== undefined) patch.visibility = updates.visibility
    if (updates.pinned !== undefined) patch.pinned = updates.pinned

    const { error } = await db.from('series_posts').update(patch).eq('id', postId)

    if (error) return { success: false, error: 'Failed to update post' }

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, postId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function pinSeriesPost(
  seriesId: string,
  postId: string,
  pinned: boolean
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requirePublishingHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'No permission to pin posts' }

    const { error } = await db
      .from('series_posts')
      .update({ pinned, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('series_id', seriesId)
      .is('archived_at', null)

    if (error) return { success: false, error: 'Failed to update pin status' }

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, postId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function archiveSeriesPost(
  seriesId: string,
  postId: string
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requirePublishingHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'No permission to archive posts' }

    const { data: existing } = await db
      .from('series_posts')
      .select('author_host_id')
      .eq('id', postId)
      .eq('series_id', seriesId)
      .is('archived_at', null)
      .maybeSingle()

    if (!existing) return { success: false, error: 'Post not found' }
    if (existing.author_host_id !== host.id) {
      return { success: false, error: 'Can only archive your own posts' }
    }

    const { error } = await db
      .from('series_posts')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', postId)

    if (error) return { success: false, error: 'Failed to archive post' }

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, postId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

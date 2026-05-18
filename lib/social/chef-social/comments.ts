'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildAuthorMap } from './helpers'
import type { ReactionType, SocialComment } from './types'

// ============================================================
// COMMENTS
// ============================================================

export async function getPostComments(postId: string): Promise<SocialComment[]> {
  const user = await requireChef()
  z.string().uuid().parse(postId)
  const db = createServerClient({ admin: true })

  const { data: comments } = await db
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
  const { data: replies } = await db
    .from('chef_post_comments')
    .select('*')
    .in('parent_comment_id', commentIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(200)

  const replyAuthorIds = Array.from(new Set((replies || []).map((r: any) => r.chef_id)))
  const allAuthorIds = Array.from(new Set([...authorIds, ...replyAuthorIds]))

  const { data: myReactionsData } = await db
    .from('chef_comment_reactions')
    .select('comment_id, reaction_type')
    .eq('chef_id', user.entityId)
    .in('comment_id', [...commentIds, ...(replies || []).map((r: any) => r.id)])

  const myReactionMap = new Map<string, ReactionType>()
  for (const r of (myReactionsData || []) as any[]) {
    myReactionMap.set(r.comment_id, r.reaction_type)
  }

  const authorMap = await buildAuthorMap(db, allAuthorIds)

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
  const db = createServerClient({ admin: true })

  const { data: comment, error } = await db
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
  const { data: postRow } = await db
    .from('chef_social_posts')
    .select('chef_id')
    .eq('id', input.postId)
    .single()

  if (postRow && (postRow as any).chef_id !== user.entityId) {
    await db.from('chef_social_notifications').insert({
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
  const db = createServerClient({ admin: true })

  const { data: comment } = await db
    .from('chef_post_comments')
    .select('chef_id')
    .eq('id', commentId)
    .single()

  if (!comment || (comment as any).chef_id !== user.entityId) {
    throw new Error('Comment not found or not yours')
  }

  await db
    .from('chef_post_comments')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', commentId)

  revalidatePath('/network')
  return { success: true }
}

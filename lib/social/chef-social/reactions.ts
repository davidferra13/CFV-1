'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { ReactionType } from './types'

// ============================================================
// REACTIONS
// ============================================================

export async function togglePostReaction(input: { postId: string; reaction: ReactionType }) {
  const user = await requireChef()
  z.string().uuid().parse(input.postId)
  const db = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('chef_post_reactions')
    .select('id, reaction_type')
    .eq('post_id', input.postId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    const ex = existing as any
    if (ex.reaction_type === input.reaction) {
      // Same reaction → remove it (toggle off)
      await db.from('chef_post_reactions').delete().eq('id', ex.id)
    } else {
      // Different reaction → update type (count stays same)
      await db.from('chef_post_reactions').update({ reaction_type: input.reaction }).eq('id', ex.id)
    }
  } else {
    // New reaction
    await db.from('chef_post_reactions').insert({
      post_id: input.postId,
      chef_id: user.entityId,
      reaction_type: input.reaction,
    })

    // Notify post author (if not own post)
    const { data: postRow } = await db
      .from('chef_social_posts')
      .select('chef_id')
      .eq('id', input.postId)
      .single()

    if (postRow && (postRow as any).chef_id !== user.entityId) {
      await db.from('chef_social_notifications').insert({
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
  const db = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('chef_comment_reactions')
    .select('id, reaction_type')
    .eq('comment_id', input.commentId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    const ex = existing as any
    if (ex.reaction_type === input.reaction) {
      await db.from('chef_comment_reactions').delete().eq('id', ex.id)
    } else {
      await db
        .from('chef_comment_reactions')
        .update({ reaction_type: input.reaction })
        .eq('id', ex.id)
    }
  } else {
    await db.from('chef_comment_reactions').insert({
      comment_id: input.commentId,
      chef_id: user.entityId,
      reaction_type: input.reaction,
    })
  }

  revalidatePath('/network')
  return { success: true }
}

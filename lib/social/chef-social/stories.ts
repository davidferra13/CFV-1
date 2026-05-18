'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildAuthorMap } from './helpers'
import type { SocialStory, StoryGroup } from './types'

// ============================================================
// STORIES
// ============================================================

export async function getActiveStories(): Promise<StoryGroup[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  // Get chefs whose stories we can see: self + following + connections
  const [{ data: follows }, { data: connections }] = await Promise.all([
    db.from('chef_follows').select('following_chef_id').eq('follower_chef_id', user.entityId),
    db
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

  const { data: stories } = await db
    .from('chef_stories')
    .select('*')
    .in('chef_id', visibleChefIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (!stories?.length) return []

  const storyIds = (stories as any[]).map((s) => s.id)
  const authorIds = Array.from(new Set((stories as any[]).map((s) => s.chef_id)))

  const [authorMap, { data: myViews }, { data: myReactions }] = await Promise.all([
    buildAuthorMap(db, authorIds),
    db
      .from('chef_story_views')
      .select('story_id')
      .eq('viewer_chef_id', user.entityId)
      .in('story_id', storyIds),
    db
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
  const db = createServerClient({ admin: true })

  const { error } = await db.from('chef_stories').insert({
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
  const db = createServerClient({ admin: true })

  await db
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
  const db = createServerClient({ admin: true })

  await db
    .from('chef_story_reactions')
    .upsert(
      { story_id: input.storyId, chef_id: user.entityId, emoji: input.emoji.slice(0, 10) },
      { onConflict: 'story_id,chef_id' }
    )

  // Notify story owner
  const { data: story } = await db
    .from('chef_stories')
    .select('chef_id')
    .eq('id', input.storyId)
    .single()

  if (story && (story as any).chef_id !== user.entityId) {
    await db.from('chef_social_notifications').insert({
      recipient_chef_id: (story as any).chef_id,
      actor_chef_id: user.entityId,
      notification_type: 'story_reaction',
      entity_type: 'story',
      entity_id: input.storyId,
    })
  }

  return { success: true }
}

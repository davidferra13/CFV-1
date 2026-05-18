'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { FollowCounts } from './types'

// ============================================================
// FOLLOWS
// ============================================================

export async function followChef(targetChefId: string) {
  const user = await requireChef()
  z.string().uuid().parse(targetChefId)
  if (targetChefId === user.entityId) throw new Error('Cannot follow yourself')
  const db = createServerClient({ admin: true })

  await db
    .from('chef_follows')
    .insert({ follower_chef_id: user.entityId, following_chef_id: targetChefId })

  // Notify target
  await db.from('chef_social_notifications').insert({
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
  const db = createServerClient({ admin: true })

  await db
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
  const db = createServerClient({ admin: true })

  const [{ data: fwd }, { data: rev }] = await Promise.all([
    db
      .from('chef_follows')
      .select('id')
      .eq('follower_chef_id', user.entityId)
      .eq('following_chef_id', targetChefId)
      .maybeSingle(),
    db
      .from('chef_follows')
      .select('id')
      .eq('follower_chef_id', targetChefId)
      .eq('following_chef_id', user.entityId)
      .maybeSingle(),
  ])

  return { is_following: !!fwd, is_followed_by: !!rev }
}

export async function getFollowCounts(chefId: string): Promise<FollowCounts> {
  const db = createServerClient({ admin: true })

  const [{ count: followers }, { count: following }] = await Promise.all([
    db
      .from('chef_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_chef_id', chefId),
    db
      .from('chef_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_chef_id', chefId),
  ])

  return { followers: followers ?? 0, following: following ?? 0 }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

import { buildAuthorMap } from './helpers'
import type { SocialNotification } from './types'

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getSocialNotifications(
  input: { limit?: number } = {}
): Promise<SocialNotification[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const limit = Math.min(input.limit ?? 40, 100)

  const { data: notifs } = await db
    .from('chef_social_notifications')
    .select('*')
    .eq('recipient_chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!notifs?.length) return []

  const actorIds = Array.from(
    new Set((notifs as any[]).map((n) => n.actor_chef_id).filter(Boolean))
  )
  const authorMap = await buildAuthorMap(db, actorIds)

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
  const db = createServerClient({ admin: true })

  let query = db
    .from('chef_social_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_chef_id', user.entityId)

  if (notifIds?.length) {
    query = query.in('id', notifIds)
  }

  await query
  revalidatePath('/network')
  revalidatePath('/tables')
  return { success: true }
}

export async function getUnreadSocialNotificationCount(): Promise<number> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { count } = await db
    .from('chef_social_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_chef_id', user.entityId)
    .eq('is_read', false)

  return count ?? 0
}

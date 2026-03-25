// Notification Check - Query helpers for reading and managing notifications
// Complements actions.ts with additional query patterns needed by the
// notifications page (filtered by type, paginated, etc.)
//
// All functions require authentication and scope to the current user.

'use server'

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { Notification, NotificationCategory } from './types'

// ─── Filtered queries ────────────────────────────────────────────────────

/**
 * Get notifications filtered by category.
 * Used by the notifications page type filter tabs.
 */
export async function getNotificationsByCategory(
  category: NotificationCategory,
  limit = 20,
  offset = 0
): Promise<Notification[]> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .eq('category', category)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getNotificationsByCategory] Query failed:', error)
    return []
  }

  return (data ?? []) as Notification[]
}

/**
 * Get only unread notifications.
 * Used by the notification bell panel in "unread" filter mode.
 */
export async function getUnreadNotifications(limit = 20, offset = 0): Promise<Notification[]> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .is('read_at', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getUnreadNotifications] Query failed:', error)
    return []
  }

  return (data ?? []) as Notification[]
}

/**
 * Get total notification count (non-archived) for pagination.
 * Optionally filter by category.
 */
export async function getNotificationCount(category?: NotificationCategory): Promise<number> {
  const user = await requireAuth()
  const db: any = createServerClient()

  let query = db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('archived_at', null)

  if (category) {
    query = query.eq('category', category)
  }

  const { count, error } = await query

  if (error) {
    console.error('[getNotificationCount] Query failed:', error)
    return 0
  }

  return count ?? 0
}

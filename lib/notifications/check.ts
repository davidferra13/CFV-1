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

// ─── Time-grouped queries ───────────────────────────────────────────────

export type NotificationTimeGroup = {
  label: string // 'Today', 'Yesterday', 'This Week', 'Older'
  key: string
  notifications: Notification[]
}

/**
 * Get notifications grouped by time period.
 * Returns groups in chronological order (today first), empty groups excluded.
 */
export async function getGroupedNotifications(
  category?: NotificationCategory,
  limit = 50
): Promise<NotificationTimeGroup[]> {
  const user = await requireAuth()
  const db: any = createServerClient()

  let query = db
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getGroupedNotifications] Query failed:', error)
    return []
  }

  const notifications = (data ?? []) as Notification[]

  // Group by time period using server-side date comparison
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const groups: Record<string, Notification[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    older: [],
  }

  for (const n of notifications) {
    const created = new Date(n.created_at)
    if (created >= todayStart) {
      groups.today.push(n)
    } else if (created >= yesterdayStart) {
      groups.yesterday.push(n)
    } else if (created >= weekStart) {
      groups.this_week.push(n)
    } else {
      groups.older.push(n)
    }
  }

  const orderedGroups: Array<{ key: string; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'this_week', label: 'This Week' },
    { key: 'older', label: 'Older' },
  ]

  return orderedGroups
    .filter((g) => groups[g.key].length > 0)
    .map((g) => ({
      label: g.label,
      key: g.key,
      notifications: groups[g.key],
    }))
}

// ─── Digest queries ─────────────────────────────────────────────────────

export type NotificationDigest = {
  action: string
  count: number
  latest: Notification
}

/**
 * Groups today's notifications by action type.
 * Returns count + latest per group, sorted by count descending.
 * Only includes groups with 2+ notifications (single items are not digests).
 */
export async function getNotificationDigests(limit?: number): Promise<NotificationDigest[]> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .is('archived_at', null)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getNotificationDigests] Query failed:', error)
    return []
  }

  const notifications = (data ?? []) as Notification[]

  // Group by action
  const byAction = new Map<string, Notification[]>()
  for (const n of notifications) {
    const group = byAction.get(n.action) ?? []
    group.push(n)
    byAction.set(n.action, group)
  }

  // Build digests (only groups with 2+ items)
  const digests: NotificationDigest[] = []
  for (const [action, items] of byAction) {
    if (items.length >= 2) {
      digests.push({
        action,
        count: items.length,
        latest: items[0], // already sorted desc by created_at
      })
    }
  }

  // Sort by count descending
  digests.sort((a, b) => b.count - a.count)

  return limit ? digests.slice(0, limit) : digests
}

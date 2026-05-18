'use server'

// Notification Triage Actions
// Bulk mark read/unread, snooze, filtering by source/priority, priority breakdown.
// Every action has auth gate + tenant scoping.

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_TIER_MAP } from './tier-config'
import { CATEGORY_LABELS } from './types'
import type { NotificationCategory, NotificationAction, Notification } from './types'
import type { NotificationTier } from './tier-config'
import type {
  TriageNotification,
  TriageFilter,
  PriorityBreakdown,
  TriageActionResult,
} from './triage-types'

// ---- Helpers ----------------------------------------------------------------

function resolveNotificationPriority(action: string): NotificationTier {
  return DEFAULT_TIER_MAP[action as NotificationAction] ?? 'info'
}

function resolveSourceLabel(category: string): string {
  return CATEGORY_LABELS[category as NotificationCategory] ?? category
}

function toTriageNotification(
  row: Notification & { snoozed_until?: string | null }
): TriageNotification {
  return {
    ...row,
    snoozed_until: row.snoozed_until ?? null,
    priority: resolveNotificationPriority(row.action),
    source_label: resolveSourceLabel(row.category),
  }
}

// ---- Read -------------------------------------------------------------------

/**
 * Get filtered triage inbox. Excludes archived and currently-snoozed notifications.
 * Snoozed notifications reappear automatically when snooze expires.
 */
export async function getTriageInbox(
  filters?: TriageFilter,
  limit = 40,
  offset = 0
): Promise<TriageNotification[]> {
  const user = await requireAuth()
  const db: any = createServerClient()

  let query = db
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  // Exclude currently snoozed (snoozed_until in the future)
  // Supabase does not support .gt on nullable columns cleanly,
  // so we fetch and filter client-side for snooze.
  // For source/priority/read we can filter server-side where possible.

  if (filters?.source) {
    query = query.eq('category', filters.source)
  }

  if (filters?.read === true) {
    query = query.not('read_at', 'is', null)
  } else if (filters?.read === false) {
    query = query.is('read_at', null)
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  // Fetch a generous window to allow client-side filtering for priority/snooze
  const fetchLimit = limit + offset + 100
  query = query.limit(fetchLimit)

  const { data, error } = await query

  if (error) {
    console.error('[getTriageInbox] Query failed:', error)
    return []
  }

  const now = new Date().toISOString()
  let results = ((data ?? []) as (Notification & { snoozed_until?: string | null })[])
    // Filter out currently snoozed
    .filter((n) => !n.snoozed_until || n.snoozed_until <= now)
    .map(toTriageNotification)

  // Client-side priority filter (priority is derived from action, not stored)
  if (filters?.priority) {
    results = results.filter((n) => n.priority === filters.priority)
  }

  return results.slice(offset, offset + limit)
}

/**
 * Get distinct notification sources (categories) that have notifications.
 */
export async function getNotificationSources(): Promise<
  Array<{ category: NotificationCategory; label: string; count: number }>
> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('notifications')
    .select('category')
    .eq('recipient_id', user.id)
    .is('archived_at', null)

  if (error) {
    console.error('[getNotificationSources] Query failed:', error)
    return []
  }

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category: category as NotificationCategory,
      label: CATEGORY_LABELS[category as NotificationCategory] ?? category,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get count of notifications per priority level.
 */
export async function getPriorityBreakdown(): Promise<PriorityBreakdown> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('notifications')
    .select('action')
    .eq('recipient_id', user.id)
    .is('archived_at', null)
    .is('read_at', null)

  if (error) {
    console.error('[getPriorityBreakdown] Query failed:', error)
    return { critical: 0, alert: 0, info: 0 }
  }

  const breakdown: PriorityBreakdown = { critical: 0, alert: 0, info: 0 }
  for (const row of data ?? []) {
    const tier = resolveNotificationPriority(row.action)
    breakdown[tier]++
  }

  return breakdown
}

// ---- Bulk Operations --------------------------------------------------------

/**
 * Mark multiple notifications as read.
 */
export async function bulkMarkRead(notificationIds: string[]): Promise<TriageActionResult> {
  if (!notificationIds.length) return { success: true, affected: 0 }

  const user = await requireAuth()
  const db: any = createServerClient()

  const { error, count } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', notificationIds)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[bulkMarkRead] Update failed:', error)
    return { success: false, error: 'Failed to mark notifications as read' }
  }

  // Log triage action
  await logTriageAction(user.id, notificationIds, 'mark_read')

  revalidatePath('/', 'layout')
  return { success: true, affected: count ?? notificationIds.length }
}

/**
 * Mark multiple notifications as unread.
 */
export async function bulkMarkUnread(notificationIds: string[]): Promise<TriageActionResult> {
  if (!notificationIds.length) return { success: true, affected: 0 }

  const user = await requireAuth()
  const db: any = createServerClient()

  const { error, count } = await db
    .from('notifications')
    .update({ read_at: null })
    .in('id', notificationIds)
    .eq('recipient_id', user.id)

  if (error) {
    console.error('[bulkMarkUnread] Update failed:', error)
    return { success: false, error: 'Failed to mark notifications as unread' }
  }

  await logTriageAction(user.id, notificationIds, 'mark_unread')

  revalidatePath('/', 'layout')
  return { success: true, affected: count ?? notificationIds.length }
}

// ---- Snooze -----------------------------------------------------------------

/**
 * Snooze a notification until a specific date/time.
 * Snoozed notifications are hidden from the inbox until the snooze expires.
 */
export async function snoozeNotification(
  notificationId: string,
  snoozeUntil: Date
): Promise<TriageActionResult> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { error } = await db
    .from('notifications')
    .update({ snoozed_until: snoozeUntil.toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)

  if (error) {
    console.error('[snoozeNotification] Update failed:', error)
    return { success: false, error: 'Failed to snooze notification' }
  }

  await logTriageAction(user.id, [notificationId], 'snooze')

  revalidatePath('/notifications')
  return { success: true, affected: 1 }
}

/**
 * Remove snooze from a notification, making it visible immediately.
 */
export async function unsnoozeNotification(notificationId: string): Promise<TriageActionResult> {
  const user = await requireAuth()
  const db: any = createServerClient()

  const { error } = await db
    .from('notifications')
    .update({ snoozed_until: null })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)

  if (error) {
    console.error('[unsnoozeNotification] Update failed:', error)
    return { success: false, error: 'Failed to unsnooze notification' }
  }

  await logTriageAction(user.id, [notificationId], 'unsnooze')

  revalidatePath('/notifications')
  return { success: true, affected: 1 }
}

// ---- Triage Log -------------------------------------------------------------

async function logTriageAction(
  userId: string,
  notificationIds: string[],
  action: 'mark_read' | 'mark_unread' | 'snooze' | 'unsnooze'
): Promise<void> {
  try {
    const db: any = createServerClient()
    await db.from('notification_triage_log').insert({
      chef_id: userId,
      notification_ids: notificationIds,
      action,
    })
  } catch (err) {
    // Non-critical; log and continue
    console.error('[logTriageAction] Insert failed:', err)
  }
}

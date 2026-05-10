'use server'

// Action Center - Notification Digest / Batching
// Groups same-action-type notifications within the same day into batches.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { Notification } from '@/lib/notifications/types'
import type { DigestGroupKey } from './types'

export type DigestGroup = {
  key: DigestGroupKey
  label: string
  count: number
  latestAt: string
  notifications: Notification[]
}

export type DigestedNotifications = {
  groups: DigestGroup[]
  individual: Notification[]
}

// Maps notification actions to their digest group key
const ACTION_TO_DIGEST_GROUP: Record<string, DigestGroupKey> = {
  new_inquiry: 'inquiries_batch',
  inquiry_reply: 'inquiries_batch',
  follow_up_due: 'inquiries_batch',
  wix_submission: 'inquiries_batch',
  payment_received: 'payments_batch',
  payment_failed: 'payments_batch',
  refund_processed: 'payments_batch',
  dispute_created: 'payments_batch',
  payment_due_approaching: 'payments_batch',
  payment_overdue: 'payments_batch',
  review_submitted: 'reviews_batch',
  client_meal_feedback_submitted: 'reviews_batch',
  event_confirmed: 'events_batch',
  event_completed: 'events_batch',
  event_cancelled: 'events_batch',
  proposal_accepted: 'events_batch',
  proposal_declined: 'events_batch',
  event_collaboration_invite: 'events_batch',
  system_alert: 'system_batch',
  account_access_alert: 'system_batch',
}

const DIGEST_GROUP_LABELS: Record<DigestGroupKey, string> = {
  inquiries_batch: 'New inquiries',
  payments_batch: 'Payment updates',
  reviews_batch: 'Reviews',
  events_batch: 'Event updates',
  system_batch: 'System alerts',
}

/**
 * Groups notifications by digest_group and day.
 * Notifications with a digest_group that have 2+ items on the same day get batched.
 * Everything else is returned as individual.
 */
export async function getDigestedNotifications(
  recipientId?: string
): Promise<DigestedNotifications> {
  const user = await requireChef()
  const targetRecipientId = recipientId ?? user.id
  const db: any = createServerClient()

  try {
    // Fetch recent unarchived notifications (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('recipient_id', targetRecipientId)
      .is('archived_at', null)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[ActionCenter] getDigestedNotifications fetch failed:', error)
      return { groups: [], individual: [] }
    }

    const notifications = (data ?? []) as Notification[]

    // Group by digest key + day
    const buckets = new Map<string, Notification[]>()
    const ungrouped: Notification[] = []

    for (const n of notifications) {
      const digestKey = (n as any).digest_group ?? ACTION_TO_DIGEST_GROUP[n.action]
      if (!digestKey) {
        ungrouped.push(n)
        continue
      }

      const day = n.created_at.split('T')[0]
      const bucketKey = `${digestKey}::${day}`

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, [])
      }
      buckets.get(bucketKey)!.push(n)
    }

    // Convert buckets into DigestGroups (only batch if 2+ in same day)
    const groups: DigestGroup[] = []

    for (const [bucketKey, items] of Array.from(buckets.entries())) {
      if (items.length < 2) {
        // Single item in this day bucket, treat as individual
        ungrouped.push(...items)
        continue
      }

      const digestKey = bucketKey.split('::')[0] as DigestGroupKey
      const label = DIGEST_GROUP_LABELS[digestKey] ?? digestKey

      // Find most recent timestamp
      const latestAt = items.reduce((latest, item) => {
        return item.created_at > latest ? item.created_at : latest
      }, items[0].created_at)

      groups.push({
        key: digestKey,
        label: `${items.length} ${label.toLowerCase()} today`,
        count: items.length,
        latestAt,
        notifications: items,
      })
    }

    // Sort groups by latest timestamp (most recent first)
    groups.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())

    return { groups, individual: ungrouped }
  } catch (err) {
    console.error('[ActionCenter] getDigestedNotifications error:', err)
    return { groups: [], individual: [] }
  }
}

/**
 * Assigns a digest_group value when creating a notification.
 * Call this after inserting the notification row.
 */
export async function assignDigestGroup(notificationId: string, action: string): Promise<void> {
  const digestGroup = ACTION_TO_DIGEST_GROUP[action]
  if (!digestGroup) return

  const db: any = createServerClient()

  try {
    const { error } = await db
      .from('notifications')
      .update({ digest_group: digestGroup })
      .eq('id', notificationId)

    if (error) {
      console.error('[ActionCenter] assignDigestGroup update failed:', error)
    }
  } catch (err) {
    // Non-blocking; digest grouping is a convenience feature
    console.error('[ActionCenter] assignDigestGroup error:', err)
  }
}

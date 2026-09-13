/**
 * Internal push subscription helpers. NOT a server action file.
 * These functions are called only from other server-side code
 * (e.g. circle-notification-actions), never from client components.
 *
 * Keeping them out of 'use server' prevents direct client invocation
 * of sensitive operations like deactivation and subscription enumeration.
 */

import { createServerClient } from '@/lib/db/server'

/**
 * Get all active push subscriptions for a hub guest profile.
 * Used by circle-notification-actions to deliver push to unauthenticated guests.
 */
export async function getHubPushSubscriptions(
  profileId: string
): Promise<{ id: string; endpoint: string; p256dh: string; auth_key: string }[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .lt('failed_count', 5)

  if (error) {
    console.error('[getHubPushSubscriptions] Query failed:', error)
    return []
  }

  return data ?? []
}

/**
 * Deactivate a hub push subscription (e.g., on 410 Gone from push service).
 */
export async function deactivateHubPushSubscription(endpoint: string): Promise<void> {
  const db: any = createServerClient({ admin: true })
  await db.from('hub_push_subscriptions').update({ is_active: false }).eq('endpoint', endpoint)
}

/**
 * Increment failed_count on a push subscription.
 * Auto-deactivates after 5 failures.
 */
export async function incrementPushFailedCount(endpoint: string): Promise<void> {
  const db: any = createServerClient({ admin: true })

  // Get current count
  const { data } = await db
    .from('hub_push_subscriptions')
    .select('id, failed_count')
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (!data) return

  const newCount = (data.failed_count ?? 0) + 1

  if (newCount >= 5) {
    await db
      .from('hub_push_subscriptions')
      .update({ is_active: false, failed_count: newCount })
      .eq('id', data.id)
  } else {
    await db.from('hub_push_subscriptions').update({ failed_count: newCount }).eq('id', data.id)
  }
}

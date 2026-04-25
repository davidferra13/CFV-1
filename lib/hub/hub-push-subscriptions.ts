'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'

const SaveHubPushSchema = z.object({
  profileToken: z.string().uuid(),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

/**
 * Save a Web Push subscription for a hub guest profile.
 * Token-validated, no auth session required.
 */
export async function saveHubPushSubscription(
  input: z.infer<typeof SaveHubPushSchema>
): Promise<void> {
  const validated = SaveHubPushSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  await db.from('hub_push_subscriptions').upsert(
    {
      profile_id: profile.id,
      endpoint: validated.endpoint,
      p256dh: validated.p256dh,
      auth_key: validated.auth,
      is_active: true,
      failed_count: 0,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
}

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

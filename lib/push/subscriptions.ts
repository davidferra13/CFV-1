// Push Subscription Management
// Server actions for storing, updating, and retrieving Web Push subscriptions.
// Subscriptions are scoped per user and automatically deactivated on failure.

'use server'

import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type PushSubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
  deviceLabel?: string
}

/**
 * Save (upsert) a browser push subscription for the current user.
 * Called after the browser's PushManager.subscribe() succeeds.
 */
export async function savePushSubscription(input: PushSubscriptionInput): Promise<void> {
  const user = await requireAuth()
  const supabase = createServerClient({ admin: true })

  if (!user.tenantId) {
    console.error('[savePushSubscription] No tenantId on user — skipping')
    return
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      tenant_id: user.tenantId,
      auth_user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth_key: input.auth,
      device_label: input.deviceLabel ?? null,
      is_active: true,
      failed_count: 0,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[savePushSubscription] Upsert failed:', error)
  }
}

/**
 * Remove a push subscription for the current user.
 * Called when the user explicitly revokes push permission.
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const user = await requireAuth()
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('endpoint', endpoint)
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[removePushSubscription] Update failed:', error)
  }
}

/**
 * Replace an old subscription with a new one (called on pushsubscriptionchange).
 * The service worker fires this when the browser silently rotates the endpoint.
 */
export async function resubscribePushSubscription(
  oldEndpoint: string | null,
  newSub: PushSubscriptionInput
): Promise<void> {
  const user = await requireAuth()
  const supabase = createServerClient({ admin: true })

  // Deactivate old subscription if known
  if (oldEndpoint) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', oldEndpoint)
      .eq('auth_user_id', user.id)
  }

  // Save new subscription
  await savePushSubscription(newSub)
}

/**
 * Get all active push subscriptions for a given auth user.
 * Used by the channel router to send to all devices.
 */
export async function getActiveSubscriptions(authUserId: string) {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .lt('failed_count', 5)

  if (error) {
    console.error('[getActiveSubscriptions] Query failed:', error)
    return []
  }

  return data ?? []
}

/**
 * Mark a subscription as deactivated (called when push service returns 410 Gone).
 * Service role only — called from channel-router.ts.
 */
export async function deactivateSubscription(endpoint: string): Promise<void> {
  const supabase = createServerClient({ admin: true })

  await supabase.from('push_subscriptions').update({ is_active: false }).eq('endpoint', endpoint)
}

/**
 * Increment failure count on a subscription.
 * Subscriptions with failed_count >= 5 are excluded from future sends.
 */
export async function incrementSubscriptionFailureCount(endpoint: string): Promise<void> {
  const supabase = createServerClient({ admin: true })

  // Read current count and bump by 1
  const { data } = await supabase
    .from('push_subscriptions')
    .select('failed_count')
    .eq('endpoint', endpoint)
    .single()

  if (data) {
    await supabase
      .from('push_subscriptions')
      .update({ failed_count: (data.failed_count ?? 0) + 1 })
      .eq('endpoint', endpoint)
  }
}

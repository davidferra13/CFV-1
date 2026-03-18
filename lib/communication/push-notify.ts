// Send push notifications to subscribed devices for new inbox messages.
// Uses the existing push subscription infrastructure from lib/push/subscriptions.ts.
// VAPID keys must be set in env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

import { createServerClient } from '@/lib/supabase/server'
import { deactivateSubscription, incrementSubscriptionFailureCount } from '@/lib/push/subscriptions'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = 'mailto:hello@cheflowhq.com'

type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Send a push notification to all subscribed devices for a tenant.
 * Non-blocking - failures are logged, never thrown.
 */
export async function sendInboxPushNotification(
  tenantId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // VAPID keys not configured - skip silently
    return
  }

  try {
    // Dynamic import web-push only when needed (server-side only)
    const webpush = await import('web-push').catch(() => null)
    if (!webpush) {
      console.warn('[push-notify] web-push package not installed, skipping push notification')
      return
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    // Query active subscriptions for this tenant using the existing schema
    const supabase = createServerClient({ admin: true })
    const { data: subscriptions } = await (supabase as any)
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .lt('failed_count', 5)

    if (!subscriptions || subscriptions.length === 0) return

    const message = JSON.stringify(payload)

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          message
        )
      )
    )

    // Handle failed/expired subscriptions using existing infrastructure
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        const statusCode = (result.reason as any)?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired - deactivate it
          try {
            await deactivateSubscription(subscriptions[i].endpoint)
          } catch {
            // Non-blocking
          }
        } else {
          // Transient failure - increment failure count
          try {
            await incrementSubscriptionFailureCount(subscriptions[i].endpoint)
          } catch {
            // Non-blocking
          }
        }
      }
    }
  } catch (err) {
    console.error('[push-notify] Failed to send push notification:', err)
  }
}

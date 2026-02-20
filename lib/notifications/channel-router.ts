// Notification Channel Router
// Orchestrates multi-channel delivery for a notification after it has been
// inserted into the notifications table.
//
// Called as a non-blocking fire-and-forget from createNotification().
// Never throws — all errors are caught and logged internally.
//
// Channel build status:
//   email  ✓ Phase 2 (dispatched at call sites alongside createNotification)
//   push   ✓ Phase 3 (sends to all active push_subscriptions for the recipient)
//   sms    ✓ Phase 5 (Twilio REST, rate-limited by sms_send_log)
//
// When a channel is not yet implemented, it logs 'skipped' in delivery_log
// so the audit trail is complete from day one.

import { createServerClient } from '@/lib/supabase/server'
import { resolveChannels } from './resolve-preferences'
import type { NotificationAction } from './types'
import { sendPushNotification } from '@/lib/push/send'
import {
  getActiveSubscriptions,
  deactivateSubscription,
  incrementSubscriptionFailureCount,
} from '@/lib/push/subscriptions'
import { sendSms, formatSmsBody } from '@/lib/sms/send'
import { isSmsAllowed, recordSmsSent } from '@/lib/sms/rate-limit'

export type RouteInput = {
  notificationId: string
  tenantId: string
  recipientId: string   // auth_user_id of the recipient
  action: NotificationAction
  title: string
  body?: string
  actionUrl?: string
}

/**
 * Route a notification to all appropriate out-of-app channels.
 * Called as a fire-and-forget tail from createNotification().
 */
export async function routeNotification(input: RouteInput): Promise<void> {
  const { notificationId, tenantId, recipientId, action, title, body, actionUrl } = input

  try {
    const channels = await resolveChannels(tenantId, recipientId, action)

    // Fire all enabled channels in parallel, log each result
    const sends: Promise<void>[] = []

    if (channels.email) {
      sends.push(
        deliverEmail(input, notificationId, tenantId).catch((err) => {
          console.error('[routeNotification] email delivery error:', err)
        })
      )
    } else {
      sends.push(
        logDelivery(notificationId, tenantId, 'email', 'skipped').catch(() => {})
      )
    }

    if (channels.push) {
      sends.push(
        deliverPush(input, notificationId, tenantId, recipientId).catch((err) => {
          console.error('[routeNotification] push delivery error:', err)
        })
      )
    } else {
      sends.push(
        logDelivery(notificationId, tenantId, 'push', 'skipped').catch(() => {})
      )
    }

    if (channels.sms && channels.smsPhone) {
      sends.push(
        deliverSms(input, notificationId, tenantId, channels.smsPhone).catch((err) => {
          console.error('[routeNotification] sms delivery error:', err)
        })
      )
    } else {
      sends.push(
        logDelivery(notificationId, tenantId, 'sms', 'skipped').catch(() => {})
      )
    }

    await Promise.allSettled(sends)
  } catch (err) {
    console.error('[routeNotification] top-level error:', err)
  }
}

// ─── Email Delivery ──────────────────────────────────────────────────────────

async function deliverEmail(
  input: RouteInput,
  notificationId: string,
  tenantId: string,
): Promise<void> {
  // Phase 2: Wire to lib/email/notifications.ts dispatchers.
  // Each action type maps to a specific sendXxxEmail() function.
  // For now, log as 'skipped' with a note that email routing is not yet connected.
  //
  // When Phase 2 is complete this function will be replaced with:
  //   const sent = await routeEmailByAction(input)
  //   await logDelivery(notificationId, tenantId, 'email', sent ? 'sent' : 'failed')

  await logDelivery(notificationId, tenantId, 'email', 'skipped', 'Phase 2 email routing not yet connected')
}

// ─── Browser Push Delivery ───────────────────────────────────────────────────

async function deliverPush(
  input: RouteInput,
  notificationId: string,
  tenantId: string,
  authUserId: string,
): Promise<void> {
  const subscriptions = await getActiveSubscriptions(authUserId)

  if (subscriptions.length === 0) {
    await logDelivery(notificationId, tenantId, 'push', 'skipped', 'No active subscriptions')
    return
  }

  const payload = {
    title: input.title,
    body: input.body,
    action_url: input.actionUrl,
    icon: '/icon-192.png',
  }

  // Send to all devices in parallel; handle each result independently
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  )

  let sent = 0
  let failed = 0

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const sub = subscriptions[i]

    if (result.status === 'fulfilled') {
      if (result.value === 'sent') {
        sent++
      } else if (result.value === 'gone') {
        // Subscription is expired — deactivate silently
        await deactivateSubscription(sub.endpoint).catch(() => {})
        failed++
      } else {
        // Transient failure — increment failure counter
        await incrementSubscriptionFailureCount(sub.endpoint).catch(() => {})
        failed++
      }
    } else {
      await incrementSubscriptionFailureCount(sub.endpoint).catch(() => {})
      failed++
    }
  }

  const status = sent > 0 ? 'sent' : 'failed'
  const errorNote =
    failed > 0 ? `${sent} sent, ${failed} failed out of ${subscriptions.length}` : undefined
  await logDelivery(notificationId, tenantId, 'push', status, errorNote)
}

// ─── SMS Delivery ────────────────────────────────────────────────────────────

async function deliverSms(
  input: RouteInput,
  notificationId: string,
  tenantId: string,
  phone: string,
): Promise<void> {
  // Rate-limit check: prevent SMS flooding for the same (tenant, action)
  const allowed = await isSmsAllowed(tenantId, input.action)
  if (!allowed) {
    await logDelivery(notificationId, tenantId, 'sms', 'skipped', 'Rate limited')
    return
  }

  const smsBody = formatSmsBody(input.title, input.body)
  const result = await sendSms(phone, smsBody)

  if (result === 'sent') {
    await recordSmsSent(tenantId, input.action).catch(() => {})
    await logDelivery(notificationId, tenantId, 'sms', 'sent')
  } else if (result === 'not_configured') {
    await logDelivery(notificationId, tenantId, 'sms', 'skipped', 'Twilio not configured')
  } else {
    await logDelivery(notificationId, tenantId, 'sms', 'failed', 'Twilio API error')
  }
}

// ─── Delivery Log ────────────────────────────────────────────────────────────

async function logDelivery(
  notificationId: string,
  tenantId: string,
  channel: 'email' | 'push' | 'sms',
  status: 'sent' | 'failed' | 'skipped',
  errorMessage?: string,
): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })
    await supabase.from('notification_delivery_log').insert({
      notification_id: notificationId,
      tenant_id: tenantId,
      channel,
      status,
      error_message: errorMessage ?? null,
    })
  } catch (err) {
    // Never let logging failures bubble up
    console.error('[logDelivery] Failed to write delivery log:', err)
  }
}

// Notification Channel Router
// Orchestrates multi-channel delivery for a notification after it has been
// inserted into the notifications table.
//
// Called as a non-blocking fire-and-forget from createNotification().
// Never throws - all errors are caught and logged internally.
//
// Channel build status:
//   email  ✓ Phase 2 (Resend - generic notification template via lib/email/route-email.ts)
//   push   ✓ Phase 3 (sends to all active push_subscriptions for the recipient)
//   sms    ✓ Phase 5 (Twilio REST, rate-limited by sms_send_log)
//
// When a channel is not yet implemented, it logs 'skipped' in delivery_log
// so the audit trail is complete from day one.

import { createServerClient } from '@/lib/db/server'
import { resolveChannels } from './resolve-preferences'
import type { NotificationAction } from './types'
import { DEFAULT_TIER_MAP } from './tier-config'
import { isOffHours, BYPASS_ACTIONS } from './off-hours-check'
import { sendPushNotification } from '@/lib/push/send'
import {
  getActiveSubscriptions,
  deactivateSubscription,
  incrementSubscriptionFailureCount,
} from '@/lib/push/subscriptions'
import { sendSms, formatSmsBody } from '@/lib/sms/send'
import { isSmsAllowed, recordSmsSent } from '@/lib/sms/rate-limit'
import { routeEmailByAction } from '@/lib/email/route-email'
import {
  buildInterruptionAuditMetadata,
  evaluateNotificationInterruption,
  type EventDayFocusContext,
  type InterruptionAuditMetadata,
} from './interruption-policy'

export type RouteInput = {
  notificationId: string
  tenantId: string
  recipientId: string // auth_user_id of the recipient
  action: NotificationAction
  title: string
  body?: string
  actionUrl?: string
  eventId?: string | null
  inquiryId?: string | null
  clientId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Route a notification to all appropriate out-of-app channels.
 * Called as a fire-and-forget tail from createNotification().
 */
export async function routeNotification(input: RouteInput): Promise<void> {
  const { notificationId, tenantId, recipientId, action, title, body, actionUrl } = input

  try {
    const outboundEnabled = process.env.NOTIFICATIONS_OUTBOUND_ENABLED !== 'false'
    if (!outboundEnabled) {
      await Promise.allSettled([
        logDelivery(notificationId, tenantId, 'email', 'skipped', 'Outbound disabled by env'),
        logDelivery(notificationId, tenantId, 'push', 'skipped', 'Outbound disabled by env'),
        logDelivery(notificationId, tenantId, 'sms', 'skipped', 'Outbound disabled by env'),
      ])
      return
    }

    const channels = await resolveChannels(tenantId, recipientId, action)
    const eventDayFocus = await getTenantEventDayFocusContext(tenantId)
    const interruption = evaluateNotificationInterruption({
      action,
      metadata: input.metadata,
      eventId: input.eventId,
      inquiryId: input.inquiryId,
      clientId: input.clientId,
      actionUrl,
      eventDayFocus,
    })
    const routedChannels = { ...channels }
    if (interruption.level === 'badge' || interruption.level === 'silent') {
      routedChannels.email = false
      routedChannels.push = false
      routedChannels.sms = false
    }
    await recordHapticAudit(
      notificationId,
      tenantId,
      input.metadata,
      buildInterruptionAuditMetadata(
        {
          action,
          metadata: input.metadata,
          eventId: input.eventId,
          inquiryId: input.inquiryId,
          clientId: input.clientId,
          actionUrl,
          eventDayFocus,
        },
        interruption
      )
    )

    // F1: Check quiet hours - suppress non-critical out-of-app delivery during quiet window
    const tier = DEFAULT_TIER_MAP[action]
    const isBypass =
      interruption.bypassQuietHours ||
      tier === 'critical' ||
      (BYPASS_ACTIONS as readonly string[]).includes(action)
    if (!isBypass) {
      try {
        const db = createServerClient({ admin: true })
        const { data: prefs } = await (db as any)
          .from('chef_preferences')
          .select(
            'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end'
          )
          .eq('tenant_id', tenantId)
          .single()

        if (prefs?.notification_quiet_hours_enabled) {
          const quietActive = isOffHours(
            {
              off_hours_start: prefs.notification_quiet_hours_start ?? null,
              off_hours_end: prefs.notification_quiet_hours_end ?? null,
              off_days: null,
            },
            new Date()
          )
          if (quietActive) {
            // Suppress all out-of-app channels; in-app notification already created
            await Promise.allSettled([
              logDelivery(notificationId, tenantId, 'email', 'skipped', 'Quiet hours active'),
              logDelivery(notificationId, tenantId, 'push', 'skipped', 'Quiet hours active'),
              logDelivery(notificationId, tenantId, 'sms', 'skipped', 'Quiet hours active'),
            ])
            return
          }
        }
      } catch (err) {
        // Non-blocking: if quiet hours check fails, deliver normally
        console.error('[routeNotification] quiet hours check failed (non-blocking):', err)
      }
    }

    // Fire all enabled channels in parallel, log each result
    const sends: Promise<void>[] = []

    if (routedChannels.email) {
      sends.push(
        deliverEmail(input, notificationId, tenantId).catch((err) => {
          console.error('[routeNotification] email delivery error:', err)
        })
      )
    } else {
      sends.push(
        logDelivery(notificationId, tenantId, 'email', 'skipped').catch((err) => {
          console.error('[non-blocking] logDelivery email-skipped failed:', err)
        })
      )
    }

    if (routedChannels.push) {
      sends.push(
        deliverPush(input, notificationId, tenantId, recipientId, eventDayFocus).catch((err) => {
          console.error('[routeNotification] push delivery error:', err)
        })
      )
    } else {
      sends.push(
        logDelivery(notificationId, tenantId, 'push', 'skipped').catch((err) => {
          console.error('[non-blocking] logDelivery push-skipped failed:', err)
        })
      )
    }

    if (routedChannels.sms && channels.smsPhone) {
      sends.push(
        deliverSms(input, notificationId, tenantId, channels.smsPhone).catch((err) => {
          console.error('[routeNotification] sms delivery error:', err)
        })
      )
    } else {
      sends.push(
        logDelivery(notificationId, tenantId, 'sms', 'skipped').catch((err) => {
          console.error('[non-blocking] logDelivery sms-skipped failed:', err)
        })
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
  tenantId: string
): Promise<void> {
  const sent = await routeEmailByAction(input)
  await logDelivery(notificationId, tenantId, 'email', sent ? 'sent' : 'failed')
}

// ─── Browser Push Delivery ───────────────────────────────────────────────────

async function deliverPush(
  input: RouteInput,
  notificationId: string,
  tenantId: string,
  authUserId: string,
  eventDayFocus?: EventDayFocusContext
): Promise<void> {
  const subscriptions = await getActiveSubscriptions(authUserId)

  if (subscriptions.length === 0) {
    await logDelivery(notificationId, tenantId, 'push', 'skipped', 'No active subscriptions')
    return
  }

  const interruption = evaluateNotificationInterruption({
    action: input.action,
    eventId: input.eventId,
    inquiryId: input.inquiryId,
    clientId: input.clientId,
    actionUrl: input.actionUrl,
    metadata: input.metadata,
    eventDayFocus,
  })

  const payload = {
    title: input.title,
    body: input.body,
    action_url: input.actionUrl,
    url: input.actionUrl,
    icon: '/icon-192.png',
    tag: interruption.tag,
    renotify: interruption.renotify,
    vibrate: interruption.pattern,
    interruption_level: interruption.level,
    interruption_reason: interruption.reason,
    interruption_group: interruption.group,
  }

  // Send to all devices in parallel; handle each result independently
  const results = await Promise.allSettled(
    subscriptions.map((sub: any) => sendPushNotification(sub, payload))
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
        // Subscription is expired - deactivate silently
        await deactivateSubscription(sub.endpoint).catch((err) => {
          console.error('[non-blocking] deactivateSubscription failed:', err)
        })
        failed++
      } else {
        // Transient failure - increment failure counter
        await incrementSubscriptionFailureCount(sub.endpoint).catch((err) => {
          console.error('[non-blocking] incrementSubscriptionFailureCount failed:', err)
        })
        failed++
      }
    } else {
      await incrementSubscriptionFailureCount(sub.endpoint).catch((err) => {
        console.error('[non-blocking] incrementSubscriptionFailureCount failed:', err)
      })
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
  phone: string
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
    await recordSmsSent(tenantId, input.action).catch((err) => {
      console.error('[non-blocking] recordSmsSent failed:', err)
    })
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
  errorMessage?: string
): Promise<void> {
  try {
    const db = createServerClient({ admin: true })
    await db.from('notification_delivery_log').insert({
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

function localDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function getTenantEventDayFocusContext(tenantId: string): Promise<EventDayFocusContext> {
  try {
    const db = createServerClient({ admin: true })
    const today = localDateString()
    const { data, error } = await (db as any)
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('event_date', today)
      .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])

    if (error) {
      console.error('[getTenantEventDayFocusContext] Query failed:', error)
      return { active: false, eventIds: [], eventCount: 0, reason: null }
    }

    const eventIds = ((data ?? []) as Array<{ id: string }>).map((event) => event.id)
    return {
      active: eventIds.length > 0,
      eventIds,
      eventCount: eventIds.length,
      reason:
        eventIds.length > 0
          ? `Event-day focus active for ${eventIds.length} event${eventIds.length === 1 ? '' : 's'} today`
          : null,
    }
  } catch (err) {
    console.error('[getTenantEventDayFocusContext] Failed:', err)
    return { active: false, eventIds: [], eventCount: 0, reason: null }
  }
}

async function recordHapticAudit(
  notificationId: string,
  tenantId: string,
  existingMetadata: Record<string, unknown> | undefined,
  audit: InterruptionAuditMetadata
): Promise<void> {
  try {
    const db = createServerClient({ admin: true })
    const metadata = {
      ...(existingMetadata ?? {}),
      haptic_audit: audit,
    }
    await db
      .from('notifications')
      .update({ metadata })
      .eq('id', notificationId)
      .eq('tenant_id', tenantId)
  } catch (err) {
    console.error('[recordHapticAudit] Failed to update notification metadata:', err)
  }
}

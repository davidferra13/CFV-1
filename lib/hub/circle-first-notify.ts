'use server'

import { createElement } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import { getCircleForContext, getChefHubProfileId } from './circle-lookup'
import type { HubNotificationType } from './types'

// ---------------------------------------------------------------------------
// Circle-First Notify
// Single entry point for lifecycle notifications. Posts a rich notification
// card to the Dinner Circle, then sends a SHORT email to members pointing
// them to the circle. If no circle exists, sends a standalone fallback email.
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

// Labels for the notification email subject/preview
const NOTIFICATION_LABELS: Record<HubNotificationType, string> = {
  quote_sent: 'Quote',
  quote_accepted: 'Quote Accepted',
  payment_received: 'Payment',
  event_confirmed: 'Event Confirmed',
  event_completed: 'Event Complete',
  menu_shared: 'Menu',
  photos_ready: 'Photos',
  contract_ready: 'Contract',
  invoice_sent: 'Invoice',
  guest_count_updated: 'Guest Update',
  dietary_updated: 'Dietary Update',
  running_late: 'Timing Update',
  repeat_booking_request: 'Booking Request',
}

interface CircleFirstInput {
  // Where to find the circle
  eventId?: string | null
  inquiryId?: string | null

  // What to post
  notificationType: HubNotificationType
  body: string
  metadata?: Record<string, unknown>
  actionUrl?: string
  actionLabel?: string

  // Fallback if no circle exists
  fallbackEmail?: {
    to: string
    subject: string
    react: React.ReactElement
  }
}

/**
 * Post a rich notification to the Dinner Circle, then email members
 * a short "you have an update" notification pointing to the circle.
 *
 * If no circle exists, sends the fallback email (same as current behavior).
 * This function is always non-blocking: wrap in try/catch at the call site.
 */
export async function circleFirstNotify(input: CircleFirstInput): Promise<void> {
  const circle = await getCircleForContext({
    eventId: input.eventId,
    inquiryId: input.inquiryId,
  })

  if (!circle) {
    // No circle - send standalone fallback email if provided
    if (input.fallbackEmail) {
      const { sendEmail } = await import('@/lib/email/send')
      await sendEmail({
        to: input.fallbackEmail.to,
        subject: input.fallbackEmail.subject,
        react: input.fallbackEmail.react,
      })
    }
    console.warn(
      `[circle-first] No circle found for event=${input.eventId} inquiry=${input.inquiryId}, used fallback email`
    )
    return
  }

  const chefProfileId = await getChefHubProfileId(circle.tenantId)
  if (!chefProfileId) {
    console.warn(`[circle-first] No hub profile for chef tenant=${circle.tenantId}`)
    return
  }

  const supabase = createServerClient({ admin: true })

  // 1. Post the notification message to the circle
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'notification',
    notification_type: input.notificationType,
    body: input.body,
    source: 'system',
    action_url: input.actionUrl ?? null,
    action_label: input.actionLabel ?? null,
    system_metadata: (input.metadata ?? null) as Json,
  })

  // 2. Email members a short notification pointing to the circle
  await notifyMembersOfUpdate({
    groupId: circle.groupId,
    groupToken: circle.groupToken,
    authorProfileId: chefProfileId,
    chefTenantId: circle.tenantId,
    notificationType: input.notificationType,
    messagePreview: input.body,
  })
}

/**
 * Send short notification emails to circle members about a lifecycle update.
 * Respects the same throttle and preferences as regular circle message notifications.
 */
async function notifyMembersOfUpdate(input: {
  groupId: string
  groupToken: string
  authorProfileId: string
  chefTenantId: string
  notificationType: HubNotificationType
  messagePreview: string
}): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })

    const [groupResult, membersResult, chefResult] = await Promise.all([
      supabase.from('hub_groups').select('name').eq('id', input.groupId).single(),
      supabase
        .from('hub_group_members')
        .select(
          'profile_id, notifications_muted, last_notified_at, notify_email, hub_guest_profiles(id, email, display_name, notifications_enabled, auth_user_id)'
        )
        .eq('group_id', input.groupId),
      supabase
        .from('chefs')
        .select('display_name, business_name')
        .eq('id', input.chefTenantId)
        .single(),
    ])

    const group = groupResult.data
    const members = membersResult.data ?? []
    const chefName = chefResult.data?.display_name || chefResult.data?.business_name || 'Your Chef'

    if (!group) return

    const circleUrl = `${APP_URL}/hub/g/${input.groupToken}`
    const label = NOTIFICATION_LABELS[input.notificationType] ?? 'Update'
    const now = Date.now()

    const { sendEmail } = await import('@/lib/email/send')
    const { CircleUpdateNotificationEmail } =
      await import('@/lib/email/templates/circle-update-notification')
    const { getActiveSubscriptions } = await import('@/lib/push/subscriptions')
    const { sendPushNotification } = await import('@/lib/push/send')

    for (const member of members) {
      if (member.profile_id === input.authorProfileId) continue
      if (member.notifications_muted) continue

      const profile = member.hub_guest_profiles as unknown as {
        id: string
        email: string | null
        display_name: string
        notifications_enabled: boolean
        auth_user_id: string | null
      } | null

      if (!profile || !profile.notifications_enabled) continue

      // Check throttle
      const lastNotified = member.last_notified_at ? new Date(member.last_notified_at).getTime() : 0
      const withinCooldown = now - lastNotified < NOTIFY_COOLDOWN_MS

      // Check email preference (defaults to true for existing members without the column yet)
      const emailEnabled = member.notify_email !== false

      // Send short notification email
      if (profile.email && !withinCooldown && emailEnabled) {
        await sendEmail({
          to: profile.email,
          subject: `${label} from ${chefName} in ${group.name}`,
          react: createElement(CircleUpdateNotificationEmail, {
            recipientName: profile.display_name,
            chefName,
            groupName: group.name,
            updateLabel: label,
            updatePreview: input.messagePreview.slice(0, 200),
            circleUrl,
          }),
        })

        await supabase
          .from('hub_group_members')
          .update({ last_notified_at: new Date().toISOString() })
          .eq('group_id', input.groupId)
          .eq('profile_id', member.profile_id)
      }

      // Push notification (always, unless push disabled)
      if (profile.auth_user_id) {
        try {
          const subs = await getActiveSubscriptions(profile.auth_user_id)
          await Promise.allSettled(
            subs.map((sub) =>
              sendPushNotification(sub, {
                title: `${label} from ${chefName}`,
                body: input.messagePreview.slice(0, 120),
                icon: '/icon-192.png',
                action_url: circleUrl,
              })
            )
          )
        } catch {
          // Non-blocking
        }
      }
    }
  } catch (err) {
    console.error('[non-blocking] Failed to send circle-first notifications', err)
  }
}

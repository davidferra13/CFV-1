'use server'

import { createServerClient } from '@/lib/supabase/server'
import { sendCircleMessageEmail, sendFriendRequestEmail } from '@/lib/email/notifications'
import { getActiveSubscriptions } from '@/lib/push/subscriptions'
import { sendPushNotification } from '@/lib/push/send'

// ---------------------------------------------------------------------------
// Circle Notification Actions
// Non-blocking email + push notifications for hub activity.
// All functions are fire-and-forget: errors logged, never thrown.
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

// Throttle: don't email the same member more than once per 5 minutes per circle.
// Push notifications are always sent (lightweight, no inbox clutter).
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

/**
 * Send email notifications to all circle members when a new message is posted.
 * Skips: the author, muted members, members without email, members with notifications disabled.
 * Throttles: emails are rate-limited to once per 5 minutes per member per circle.
 * Push notifications are always sent (no throttle).
 */
export async function notifyCircleMembers(input: {
  groupId: string
  authorProfileId: string
  messageBody: string
}): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })

    // Load group info + members + author in parallel
    const [groupResult, membersResult, authorResult] = await Promise.all([
      supabase.from('hub_groups').select('name, group_token').eq('id', input.groupId).single(),
      supabase
        .from('hub_group_members')
        .select(
          'profile_id, notifications_muted, last_notified_at, hub_guest_profiles(id, email, display_name, notifications_enabled, auth_user_id)'
        )
        .eq('group_id', input.groupId),
      supabase
        .from('hub_guest_profiles')
        .select('display_name')
        .eq('id', input.authorProfileId)
        .single(),
    ])

    const group = groupResult.data
    const members = membersResult.data ?? []
    const authorName = authorResult.data?.display_name ?? 'Someone'

    if (!group) return

    const now = Date.now()

    for (const member of members) {
      // Skip the author
      if (member.profile_id === input.authorProfileId) continue

      // Skip muted members
      if (member.notifications_muted) continue

      const profile = member.hub_guest_profiles as unknown as {
        id: string
        email: string | null
        display_name: string
        notifications_enabled: boolean
        auth_user_id: string | null
      } | null

      if (!profile) continue

      // Skip if notifications disabled globally
      if (!profile.notifications_enabled) continue

      // Check throttle: was this member emailed recently?
      const lastNotified = member.last_notified_at ? new Date(member.last_notified_at).getTime() : 0
      const withinCooldown = now - lastNotified < NOTIFY_COOLDOWN_MS

      // Send email if member has email AND not within cooldown
      if (profile.email && !withinCooldown) {
        await sendCircleMessageEmail({
          recipientEmail: profile.email,
          recipientName: profile.display_name,
          senderName: authorName,
          groupName: group.name,
          messagePreview: input.messageBody,
          groupToken: group.group_token,
        })

        // Update last_notified_at
        await supabase
          .from('hub_group_members')
          .update({ last_notified_at: new Date().toISOString() })
          .eq('group_id', input.groupId)
          .eq('profile_id', member.profile_id)
      }

      // Push notifications are always sent (lightweight, no inbox clutter)
      if (profile.auth_user_id) {
        try {
          const subs = await getActiveSubscriptions(profile.auth_user_id)
          const circleUrl = `${APP_URL}/hub/g/${group.group_token}`
          await Promise.allSettled(
            subs.map((sub) =>
              sendPushNotification(sub, {
                title: `${authorName} in ${group.name}`,
                body: input.messageBody.slice(0, 120),
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
    console.error('[non-blocking] Failed to send circle notifications', err)
  }
}

/**
 * Send email notification when a friend request is received.
 */
export async function notifyFriendRequest(input: {
  requesterProfileId: string
  addresseeProfileId: string
}): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })

    const [requesterResult, addresseeResult] = await Promise.all([
      supabase
        .from('hub_guest_profiles')
        .select('display_name')
        .eq('id', input.requesterProfileId)
        .single(),
      supabase
        .from('hub_guest_profiles')
        .select('email, display_name, profile_token, notifications_enabled')
        .eq('id', input.addresseeProfileId)
        .single(),
    ])

    const requester = requesterResult.data
    const addressee = addresseeResult.data

    if (!requester || !addressee) return
    if (!addressee.email || !addressee.notifications_enabled) return

    await sendFriendRequestEmail({
      recipientEmail: addressee.email,
      recipientName: addressee.display_name,
      senderName: requester.display_name,
      hubUrl: `${APP_URL}/hub/me/${addressee.profile_token}`,
    })
  } catch (err) {
    console.error('[non-blocking] Failed to send friend request notification', err)
  }
}

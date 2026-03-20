'use server'

import { createServerClient } from '@/lib/supabase/server'
import { sendCircleMessageEmail, sendFriendRequestEmail } from '@/lib/email/notifications'
import { getActiveSubscriptions } from '@/lib/push/subscriptions'
import { sendPushNotification } from '@/lib/push/send'

// ---------------------------------------------------------------------------
// Circle Notification Actions
// Non-blocking email + push notifications for hub activity.
// All functions are fire-and-forget: errors logged, never thrown.
//
// Supports: throttling, quiet hours, digest mode, smart grouping.
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

// Throttle: don't email the same member more than once per 5 minutes per circle.
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

// Smart grouping: batch messages from the same author within 2 minutes
const GROUPING_WINDOW_MS = 2 * 60 * 1000

// In-memory grouping buffer (per-process, reset on restart)
const pendingNotifications = new Map<
  string,
  { authorName: string; messages: string[]; timer: ReturnType<typeof setTimeout> }
>()

/**
 * Check if current time is within the member's quiet hours.
 * Quiet hours are stored as TIME (HH:MM:SS) in the member's timezone.
 * Since we don't store timezone, we use UTC; members set their quiet hours accordingly.
 */
function isWithinQuietHours(quietStart: string | null, quietEnd: string | null): boolean {
  if (!quietStart || !quietEnd) return false

  const now = new Date()
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  const [startH, startM] = quietStart.split(':').map(Number)
  const [endH, endM] = quietEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes <= endMinutes) {
    // Same day: e.g., 22:00 to 23:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Overnight: e.g., 22:00 to 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
}

/**
 * Send email notifications to all circle members when a new message is posted.
 * Respects: muting, throttle, quiet hours, digest mode, email/push preferences.
 * Smart grouping: batches rapid messages from the same author.
 */
export async function notifyCircleMembers(input: {
  groupId: string
  authorProfileId: string
  messageBody: string
}): Promise<void> {
  try {
    const supabase: any = createServerClient({ admin: true })

    // Load group info + members + author in parallel
    const [groupResult, membersResult, authorResult] = await Promise.all([
      supabase.from('hub_groups').select('name, group_token').eq('id', input.groupId).single(),
      supabase
        .from('hub_group_members')
        .select(
          'profile_id, notifications_muted, last_notified_at, notify_email, notify_push, quiet_hours_start, quiet_hours_end, digest_mode, hub_guest_profiles(id, email, display_name, notifications_enabled, auth_user_id)'
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
    const circleUrl = `${APP_URL}/hub/g/${group.group_token}`

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

      // --- Email notification ---
      const emailEnabled = (member as any).notify_email !== false
      const digestMode = (member as any).digest_mode || 'instant'

      if (profile.email && emailEnabled && digestMode === 'instant') {
        // Check quiet hours
        const inQuietHours = isWithinQuietHours(
          (member as any).quiet_hours_start,
          (member as any).quiet_hours_end
        )

        if (!inQuietHours) {
          // Check throttle
          const lastNotified = member.last_notified_at
            ? new Date(member.last_notified_at).getTime()
            : 0
          const withinCooldown = now - lastNotified < NOTIFY_COOLDOWN_MS

          if (!withinCooldown) {
            // Smart grouping: check if there's a pending notification from the same author
            const groupingKey = `${input.groupId}:${member.profile_id}:${input.authorProfileId}`
            const pending = pendingNotifications.get(groupingKey)

            if (pending) {
              // Batch: add this message to the pending group
              pending.messages.push(input.messageBody)
            } else {
              // Start a new grouping window
              const entry = {
                authorName,
                messages: [input.messageBody],
                timer: setTimeout(async () => {
                  pendingNotifications.delete(groupingKey)
                  try {
                    const msgCount = entry.messages.length
                    const preview =
                      msgCount === 1
                        ? entry.messages[0]
                        : `${entry.authorName} sent ${msgCount} messages`

                    await sendCircleMessageEmail({
                      recipientEmail: profile.email!,
                      recipientName: profile.display_name,
                      senderName: entry.authorName,
                      groupName: group.name,
                      messagePreview: preview,
                      groupToken: group.group_token,
                    })

                    // Update last_notified_at
                    const supa: any = createServerClient({ admin: true })
                    await supa
                      .from('hub_group_members')
                      .update({ last_notified_at: new Date().toISOString() })
                      .eq('group_id', input.groupId)
                      .eq('profile_id', member.profile_id)
                  } catch (err) {
                    console.error('[non-blocking] Grouped email notification failed', err)
                  }
                }, GROUPING_WINDOW_MS),
              }
              pendingNotifications.set(groupingKey, entry)
            }
          }
        }
        // If in quiet hours or within cooldown: message will be picked up by digest
      }
      // If digest_mode is 'hourly' or 'daily': skip email entirely, cron handles it

      // --- Push notification ---
      const pushEnabled = (member as any).notify_push !== false

      if (profile.auth_user_id && pushEnabled) {
        // Push notifications respect quiet hours too, except for urgent types
        const inQuietHours = isWithinQuietHours(
          (member as any).quiet_hours_start,
          (member as any).quiet_hours_end
        )

        if (!inQuietHours) {
          try {
            const subs = await getActiveSubscriptions(profile.auth_user_id)
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
    const supabase: any = createServerClient({ admin: true })

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

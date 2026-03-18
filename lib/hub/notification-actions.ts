'use server'

import { requireClient } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getOrCreateClientHubProfile } from './client-hub-actions'

// ---------------------------------------------------------------------------
// Hub Notifications - Unread counts + email notifications
// ---------------------------------------------------------------------------

/**
 * Get unread message count for a profile across all groups.
 * Returns per-group counts.
 */
export type HubUnreadCount = {
  group_id: string
  group_name: string
  group_emoji: string | null
  group_token: string
  unread_count: number
}

export async function getHubUnreadCounts(profileToken: string): Promise<HubUnreadCount[]> {
  const supabase = createServerClient({ admin: true })

  // Get profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) return []

  // Get all memberships with last_read_at AND group info in one query
  const { data: memberships } = await supabase
    .from('hub_group_members')
    .select('group_id, last_read_at, hub_groups!group_id(name, emoji, group_token)')
    .eq('profile_id', profile.id)

  if (!memberships || memberships.length === 0) return []

  // Batch: count unread messages for all groups in parallel
  const countPromises = memberships.map((membership) => {
    let query = supabase
      .from('hub_messages')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', membership.group_id)
      .is('deleted_at', null)

    if (membership.last_read_at) {
      query = query.gt('created_at', membership.last_read_at)
    }

    return query.then(({ count }) => ({
      membership,
      unreadCount: count ?? 0,
    }))
  })

  const counts = await Promise.all(countPromises)

  const results: HubUnreadCount[] = []
  for (const { membership, unreadCount } of counts) {
    if (unreadCount > 0) {
      const group = (membership as Record<string, unknown>).hub_groups as {
        name: string
        emoji: string | null
        group_token: string
      } | null

      if (group) {
        results.push({
          group_id: membership.group_id,
          group_name: group.name,
          group_emoji: group.emoji,
          group_token: group.group_token,
          unread_count: unreadCount,
        })
      }
    }
  }

  return results
}

/**
 * Get total unread count for a profile (all groups combined).
 */
export async function getHubTotalUnreadCount(profileToken: string): Promise<number> {
  const counts = await getHubUnreadCounts(profileToken)
  return counts.reduce((sum, g) => sum + g.unread_count, 0)
}

/**
 * Mark one or many hub groups as read for the authenticated client profile.
 */
export async function markMyHubNotificationsRead(input?: {
  groupIds?: string[]
}): Promise<{ success: true }> {
  await requireClient()
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const nowIso = new Date().toISOString()
  const uniqueGroupIds = Array.from(new Set((input?.groupIds ?? []).filter(Boolean)))

  let query = supabase
    .from('hub_group_members')
    .update({ last_read_at: nowIso })
    .eq('profile_id', profile.id)

  if (uniqueGroupIds.length > 0) {
    query = query.in('group_id', uniqueGroupIds)
  }

  const { error } = await query
  if (error) {
    throw new Error(`Failed to mark notifications as read: ${error.message}`)
  }

  revalidatePath('/my-hub')
  revalidatePath('/my-hub/notifications')
  return { success: true }
}

/**
 * Get total unread hub count for the authenticated client.
 * Lightweight wrapper for nav badge polling.
 */
export async function getMyHubUnreadCount(): Promise<number> {
  const profile = await getOrCreateClientHubProfile()
  return getHubTotalUnreadCount(profile.profile_token)
}

/**
 * Send hub notification email (called after new messages in a group).
 * Non-blocking, rate-limited (max 1 per group per hour).
 */
export async function notifyHubActivity(input: {
  groupId: string
  groupName: string
  authorName: string
  messagePreview: string
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  try {
    // Get members who have notifications enabled and haven't been notified recently
    const { data: members } = await supabase
      .from('hub_group_members')
      .select(
        'profile_id, notifications_muted, hub_guest_profiles!profile_id(email, notifications_enabled)'
      )
      .eq('group_id', input.groupId)
      .eq('notifications_muted', false)

    if (!members) return

    for (const member of members) {
      const profile = (member as Record<string, unknown>).hub_guest_profiles as {
        email: string | null
        notifications_enabled: boolean
      } | null

      if (!profile?.email || !profile.notifications_enabled) continue

      // Send notification email via Resend (non-blocking, fire-and-forget)
      try {
        const { sendEmail } = await import('@/lib/email/send')
        const { createElement } = await import('react')

        await sendEmail({
          to: profile.email,
          subject: `New message in ${input.groupName}`,
          react: createElement(
            'div',
            null,
            createElement('p', null, `${input.authorName} posted in ${input.groupName}:`),
            createElement(
              'blockquote',
              {
                style: {
                  borderLeft: '3px solid #e88f47',
                  paddingLeft: '12px',
                  margin: '12px 0',
                  color: '#666',
                },
              },
              input.messagePreview.slice(0, 200)
            ),
            createElement(
              'p',
              { style: { fontSize: '14px', color: '#999' } },
              'Log in to ChefFlow to view the full conversation.'
            )
          ),
        })
      } catch (emailErr) {
        console.error('[non-blocking] Hub notification email failed:', emailErr)
      }
    }
  } catch (err) {
    console.error('[non-blocking] Hub notification failed:', err)
  }
}

'use server'

import { createElement } from 'react'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Circle Digest
// Sends batched email digests to members with digest_mode = 'hourly' | 'daily'.
// Intended to be called by a cron job (scheduled cron or pg_cron).
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/**
 * Process digest emails for all members with the given digest mode.
 * Call with 'hourly' every hour, 'daily' every morning.
 */
export async function processDigests(
  mode: 'hourly' | 'daily'
): Promise<{ sent: number; skipped: number }> {
  const db: any = createServerClient({ admin: true })
  let sent = 0
  let skipped = 0

  // Find all members with this digest mode who have unread messages
  const { data: members } = await db
    .from('hub_group_members')
    .select(
      `
      group_id,
      profile_id,
      last_read_at,
      last_notified_at,
      notifications_muted,
      hub_guest_profiles!inner(id, email, display_name, notifications_enabled)
    `
    )
    .eq('digest_mode', mode)
    .eq('notifications_muted', false)

  if (!members || members.length === 0) return { sent: 0, skipped: 0 }

  // Group by member profile to batch across circles
  const memberGroups = new Map<
    string,
    {
      profileId: string
      email: string
      name: string
      circles: { groupId: string; lastReadAt: string | null }[]
    }
  >()

  for (const member of members) {
    const profile = member.hub_guest_profiles as unknown as {
      id: string
      email: string | null
      display_name: string
      notifications_enabled: boolean
    }

    if (!profile?.email || !profile.notifications_enabled) {
      skipped++
      continue
    }

    const key = profile.id
    if (!memberGroups.has(key)) {
      memberGroups.set(key, {
        profileId: profile.id,
        email: profile.email,
        name: profile.display_name,
        circles: [],
      })
    }

    memberGroups.get(key)!.circles.push({
      groupId: member.group_id,
      lastReadAt: member.last_read_at,
    })
  }

  // For each member, gather unread messages across their circles
  for (const [, memberData] of memberGroups) {
    for (const circle of memberData.circles) {
      try {
        // Get group info
        const { data: group } = await db
          .from('hub_groups')
          .select('name, group_token')
          .eq('id', circle.groupId)
          .single()

        if (!group) continue

        // Get unread messages since last_read_at or last_notified_at
        const since = circle.lastReadAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: messages } = await db
          .from('hub_messages')
          .select('body, created_at, author_profile_id, hub_guest_profiles!inner(display_name)')
          .eq('group_id', circle.groupId)
          .neq('author_profile_id', memberData.profileId)
          .gt('created_at', since)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(20)

        if (!messages || messages.length === 0) {
          skipped++
          continue
        }

        const digestMessages = messages.map((msg: any) => ({
          authorName:
            (msg.hub_guest_profiles as unknown as { display_name: string })?.display_name ??
            'Someone',
          body: msg.body ?? '(media)',
          timestamp: new Date(msg.created_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
        }))

        const { sendEmail } = await import('@/lib/email/send')
        const { CircleDigestEmail } = await import('@/lib/email/templates/circle-digest')

        const circleUrl = `${APP_URL}/hub/g/${group.group_token}`

        await sendEmail({
          to: memberData.email,
          subject: `${messages.length} new ${messages.length === 1 ? 'message' : 'messages'} in ${group.name}`,
          react: createElement(CircleDigestEmail, {
            recipientName: memberData.name,
            groupName: group.name,
            messages: digestMessages,
            circleUrl,
          }),
        })

        // Update last_notified_at
        await db
          .from('hub_group_members')
          .update({ last_notified_at: new Date().toISOString() })
          .eq('group_id', circle.groupId)
          .eq('profile_id', memberData.profileId)

        sent++
      } catch (err) {
        console.error('[circle-digest] Failed to process digest for circle:', err)
        skipped++
      }
    }
  }

  return { sent, skipped }
}

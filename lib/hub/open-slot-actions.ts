'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { Json } from '@/types/database'
import { getChefHubProfileId } from './circle-lookup'
import type { HubNotificationType } from './types'

// ---------------------------------------------------------------------------
// Open Slot Broadcast
// Chef pushes "I'm available on [date]" to a Dinner Circle.
// Posts a notification message + emails all members.
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

interface OpenSlotInput {
  circleId: string
  date: string // ISO date string, e.g. "2026-04-25"
  time: string // Display time, e.g. "7:00 PM"
  menuName: string // Name of the menu (display only)
  menuId?: string // Optional menu ID for linking
  pricePerHead: number // Price per head in dollars (display only)
  maxGuests: number // How many spots available
  message?: string // Optional personal note from chef
}

export async function broadcastOpenSlot(
  input: OpenSlotInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    // Verify chef owns this circle
    const { data: group } = await db
      .from('hub_groups')
      .select('id, name, group_token, tenant_id')
      .eq('id', input.circleId)
      .single()

    if (!group || group.tenant_id !== user.tenantId) {
      return { success: false, error: 'Circle not found' }
    }

    const chefProfileId = await getChefHubProfileId(user.tenantId!)
    if (!chefProfileId) {
      return { success: false, error: 'No hub profile found' }
    }

    // Build the notification body
    const body = [
      `Open slot: ${input.date} at ${input.time}`,
      `Menu: ${input.menuName}`,
      `$${input.pricePerHead}/person, ${input.maxGuests} spots`,
      input.message ? `\n${input.message}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const metadata: Record<string, unknown> = {
      slot_date: input.date,
      slot_time: input.time,
      menu_name: input.menuName,
      menu_id: input.menuId ?? null,
      price_per_head_dollars: input.pricePerHead,
      max_guests: input.maxGuests,
    }

    // 1. Post notification message to circle
    const notificationType: HubNotificationType = 'open_slot'

    await db.from('hub_messages').insert({
      group_id: input.circleId,
      author_profile_id: chefProfileId,
      message_type: 'notification',
      notification_type: notificationType,
      body,
      source: 'system',
      action_url: null,
      action_label: null,
      system_metadata: metadata as Json,
    })

    // 2. Email all circle members (reuse same pattern as broadcastEventToCircleMembers)
    const { data: members } = await db
      .from('hub_group_members')
      .select(
        'profile_id, notifications_muted, notify_email, hub_guest_profiles(id, email, display_name, notifications_enabled)'
      )
      .eq('group_id', input.circleId)

    if (members && members.length > 0) {
      const { sendEmail } = await import('@/lib/email/send')
      const { createElement } = await import('react')
      const { CircleUpdateNotificationEmail } =
        await import('@/lib/email/templates/circle-update-notification')

      const { data: chefRecord } = await db
        .from('chefs')
        .select('display_name, business_name')
        .eq('id', user.tenantId)
        .single()
      const chefName = chefRecord?.display_name || chefRecord?.business_name || 'Your Chef'

      for (const member of members) {
        if (member.profile_id === chefProfileId) continue
        if (member.notifications_muted) continue

        const profile = member.hub_guest_profiles as unknown as {
          id: string
          email: string | null
          display_name: string
          notifications_enabled: boolean
        } | null

        if (!profile || !profile.notifications_enabled || !profile.email) continue

        const emailEnabled = (member as any).notify_email !== false
        if (!emailEnabled) continue

        try {
          await sendEmail({
            to: profile.email,
            subject: `${chefName} has an open slot on ${input.date}!`,
            react: createElement(CircleUpdateNotificationEmail, {
              recipientName: profile.display_name,
              chefName,
              groupName: group.name,
              updateLabel: 'Open Slot',
              updatePreview: body.slice(0, 200),
              circleUrl: `${APP_URL}/hub/g/${group.group_token}`,
            }),
          })
        } catch (err) {
          console.error('[non-blocking] Open slot email failed for', profile.email, err)
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[open-slot-broadcast] Failed:', err)
    return { success: false, error: 'Failed to broadcast open slot' }
  }
}

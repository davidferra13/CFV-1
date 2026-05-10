'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

/**
 * Broadcast a message to all members of a circle.
 * Inserts into hub_messages with type 'broadcast'.
 * Optionally queues email delivery to all members.
 */
export async function broadcastToCircle(
  circleId: string,
  message: string,
  options?: { includeEmail?: boolean }
): Promise<{ success: boolean; recipientCount: number; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient({ admin: true })

    // Validate input
    if (!message || message.trim().length === 0) {
      return { success: false, recipientCount: 0, error: 'Message cannot be empty' }
    }
    if (message.length > 500) {
      return { success: false, recipientCount: 0, error: 'Message exceeds 500 characters' }
    }

    // Verify circle belongs to this chef
    const { data: circle } = await db
      .from('hub_groups')
      .select('id, name')
      .eq('id', circleId)
      .eq('tenant_id', tenantId)
      .single()

    if (!circle) {
      return { success: false, recipientCount: 0, error: 'Circle not found' }
    }

    // Get chef's hub profile
    const { data: chefProfile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', user.userId)
      .maybeSingle()

    if (!chefProfile) {
      return { success: false, recipientCount: 0, error: 'Chef profile not found' }
    }

    // Insert broadcast message
    const { error: msgError } = await db.from('hub_messages').insert({
      group_id: circleId,
      author_profile_id: chefProfile.id,
      message_type: 'broadcast',
      body: message.trim(),
    })

    if (msgError) {
      return { success: false, recipientCount: 0, error: 'Failed to send broadcast' }
    }

    // Update group last_message_at and message_count
    await db
      .from('hub_groups')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.trim().slice(0, 100),
        message_count: (circle.message_count ?? 0) + 1,
      })
      .eq('id', circleId)

    // Get member count (excluding chef)
    const { data: members } = await db
      .from('hub_group_members')
      .select('profile_id')
      .eq('group_id', circleId)
      .neq('profile_id', chefProfile.id)

    const recipientCount = members?.length ?? 0

    // Queue email if requested
    if (options?.includeEmail && recipientCount > 0) {
      const memberProfileIds = members.map((m: any) => m.profile_id)

      // Get emails for members
      const { data: profiles } = await db
        .from('hub_guest_profiles')
        .select('id, email')
        .in('id', memberProfileIds)
        .not('email', 'is', null)

      if (profiles?.length) {
        const emailRows = profiles.map((p: any) => ({
          to_email: p.email,
          subject: `Message from your chef: ${circle.name}`,
          body: message.trim(),
          status: 'pending',
          tenant_id: tenantId,
        }))

        await db.from('email_queue').insert(emailRows)
      }
    }

    revalidatePath(`/circles/${circleId}`)
    revalidatePath('/circles')

    return { success: true, recipientCount }
  } catch (err) {
    return {
      success: false,
      recipientCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

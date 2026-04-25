'use server'

import { createServerClient } from '@/lib/db/server'
import { getChefHubProfileId } from '@/lib/hub/circle-lookup'
import { findOrCreateClientHubProfile } from '@/lib/hub/email-to-circle'

/**
 * Ensure a recurring client has a Dinner Circle for ongoing communication.
 * If the client already has a circle (via clients.dinner_circle_group_id), returns it.
 * Otherwise creates one and links it.
 *
 * Non-blocking: logs errors, never throws.
 */
export async function ensureRecurringClientCircle(
  chefId: string,
  clientId: string,
  serviceName: string
): Promise<string | null> {
  try {
    const db: any = createServerClient({ admin: true })

    // 1. Check if client already has a circle
    const { data: client } = await db
      .from('clients')
      .select('id, dinner_circle_group_id, full_name, email')
      .eq('id', clientId)
      .eq('tenant_id', chefId)
      .single()

    if (!client) {
      console.warn('[circle-bridge] Client not found:', clientId)
      return null
    }

    if (client.dinner_circle_group_id) {
      return client.dinner_circle_group_id
    }

    // 2. Get or create hub profiles for chef and client
    const chefProfileId = await getChefHubProfileId(chefId)
    if (!chefProfileId) {
      console.warn('[circle-bridge] Chef has no hub profile, skipping circle creation')
      return null
    }

    // Client needs email for hub profile
    if (!client.email) {
      console.warn('[circle-bridge] Client has no email, skipping circle creation')
      return null
    }

    // 3. Create the circle (hub_group)
    const circleName = `${client.full_name || 'Client'} - ${serviceName}`

    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name: circleName,
        group_type: 'circle',
        tenant_id: chefId,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: 'private',
        chef_approval_required: false,
        consent_status: 'ready',
      })
      .select('id, group_token')
      .single()

    if (groupError || !group) {
      console.error('[circle-bridge] Failed to create circle:', groupError?.message)
      return null
    }

    // 4. Add chef as member
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })

    // 5. Add client as member (creates hub profile if needed)
    const { profileId: clientProfileId } = await findOrCreateClientHubProfile({
      email: client.email,
      name: client.full_name || '',
      circleGroupId: group.id,
    })

    // 6. Link circle to client record
    await db
      .from('clients')
      .update({ dinner_circle_group_id: group.id })
      .eq('id', clientId)
      .eq('tenant_id', chefId)

    // Also link the hub profile to the client record if not already linked
    await db
      .from('hub_guest_profiles')
      .update({ client_id: clientId })
      .eq('id', clientProfileId)
      .is('client_id', null)

    return group.id
  } catch (err) {
    console.error('[circle-bridge] ensureRecurringClientCircle failed:', err)
    return null
  }
}

/**
 * Post a system message to a client's dinner circle.
 * If the client has no circle, silently skips.
 *
 * Non-blocking: logs errors, never throws.
 */
export async function postRecurringLifecycleMessage(
  chefId: string,
  clientId: string,
  messageBody: string
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })

    // Get client's circle
    const { data: client } = await db
      .from('clients')
      .select('dinner_circle_group_id')
      .eq('id', clientId)
      .eq('tenant_id', chefId)
      .single()

    if (!client?.dinner_circle_group_id) return

    const groupId = client.dinner_circle_group_id

    // Get chef's hub profile for authorship
    const chefProfileId = await getChefHubProfileId(chefId)
    if (!chefProfileId) return

    // Post system message
    await db.from('hub_messages').insert({
      group_id: groupId,
      author_profile_id: chefProfileId,
      message_type: 'system',
      body: messageBody,
      source: 'system',
    })

    // Update circle's last message metadata
    const preview = messageBody.length > 100 ? messageBody.slice(0, 97) + '...' : messageBody
    await db
      .from('hub_groups')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
      })
      .eq('id', groupId)
  } catch (err) {
    console.error('[circle-bridge] postRecurringLifecycleMessage failed:', err)
  }
}

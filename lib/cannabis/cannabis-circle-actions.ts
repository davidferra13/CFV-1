import 'server-only'

import { createServerClient } from '@/lib/db/server'

export async function seedCannabisCircleForEvent(input: {
  eventId: string
  tenantId: string
  clientId: string
  occasion: string | null
}): Promise<{ groupId: string; groupToken: string } | null> {
  const db: any = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('hub_groups')
    .select('id, group_token')
    .eq('event_id', input.eventId)
    .eq('group_type', 'cannabis_circle')
    .eq('is_active', true)
    .maybeSingle()

  if (existing) return { groupId: existing.id, groupToken: existing.group_token }

  const { data: chef } = await db
    .from('chefs')
    .select('id, business_name, display_name, auth_user_id')
    .eq('id', input.tenantId)
    .single()

  let chefProfileId: string | null = null
  if (chef?.auth_user_id) {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', chef.auth_user_id)
      .maybeSingle()

    chefProfileId = profile?.id ?? null
  }

  if (!chefProfileId) {
    const chefName = chef?.business_name ?? chef?.display_name ?? 'Chef'
    const { data: newProfile } = await db
      .from('hub_guest_profiles')
      .insert({
        display_name: chefName,
        auth_user_id: chef?.auth_user_id ?? null,
        email: null,
      })
      .select('id')
      .single()

    chefProfileId = newProfile?.id ?? null
  }

  if (!chefProfileId) return null

  const { data: client } = await db
    .from('clients')
    .select('full_name, email')
    .eq('id', input.clientId)
    .eq('tenant_id', input.tenantId)
    .single()

  let clientProfileId: string | null = null
  if (client?.email) {
    const normalized = client.email.toLowerCase().trim()
    const { data: existingClient } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('email_normalized', normalized)
      .maybeSingle()

    clientProfileId = existingClient?.id ?? null
  }

  if (!clientProfileId && client) {
    const { data: newClient } = await db
      .from('hub_guest_profiles')
      .insert({
        display_name: client.full_name || 'Guest',
        email: client.email,
      })
      .select('id')
      .single()

    clientProfileId = newClient?.id ?? null
  }

  const groupName = input.occasion
    ? `Cannabis Circle: ${input.occasion}`
    : `Cannabis Dinner Circle`

  const { data: group, error } = await db
    .from('hub_groups')
    .insert({
      name: groupName,
      event_id: input.eventId,
      tenant_id: input.tenantId,
      created_by_profile_id: chefProfileId,
      group_type: 'cannabis_circle',
      visibility: 'secret',
      emoji: '🌿',
    })
    .select('id, group_token')
    .single()

  if (error || !group) return null

  await db.from('hub_group_members').insert({
    group_id: group.id,
    profile_id: chefProfileId,
    role: 'chef',
    can_post: true,
    can_invite: true,
    can_pin: true,
  })

  if (clientProfileId) {
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: clientProfileId,
      role: 'host',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })
  }

  return { groupId: group.id, groupToken: group.group_token }
}

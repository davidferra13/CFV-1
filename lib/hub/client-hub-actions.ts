'use server'

import { requireClient, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { HubGuestProfile, HubGroup } from './types'

// ---------------------------------------------------------------------------
// Client Hub Actions — Authenticated client → hub profile bridging
// ---------------------------------------------------------------------------

/**
 * Get or create a hub guest profile for an authenticated client.
 * Links by auth_user_id or client_id, or creates a new profile if none exists.
 */
export async function getOrCreateClientHubProfile(): Promise<HubGuestProfile> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Try to find existing profile linked to this auth user or client
  const { data: existing } = await supabase
    .from('hub_guest_profiles')
    .select('*')
    .or(`auth_user_id.eq.${user.id},client_id.eq.${user.entityId}`)
    .limit(1)
    .single()

  if (existing) {
    // Ensure both links are set
    const updates: Record<string, string> = {}
    if (!existing.auth_user_id) updates.auth_user_id = user.id
    if (!existing.client_id) updates.client_id = user.entityId

    if (Object.keys(updates).length > 0) {
      await supabase.from('hub_guest_profiles').update(updates).eq('id', existing.id)
    }

    return existing as HubGuestProfile
  }

  // Try to find by email match
  if (user.email) {
    const normalized = user.email.toLowerCase().trim()
    const { data: emailMatch } = await supabase
      .from('hub_guest_profiles')
      .select('*')
      .eq('email_normalized', normalized)
      .limit(1)
      .single()

    if (emailMatch) {
      // Link the existing profile to this client
      await supabase
        .from('hub_guest_profiles')
        .update({ auth_user_id: user.id, client_id: user.entityId })
        .eq('id', emailMatch.id)

      return { ...emailMatch, auth_user_id: user.id, client_id: user.entityId } as HubGuestProfile
    }
  }

  // Get client name for the display name
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', user.entityId)
    .single()

  const displayName = client?.full_name || user.email.split('@')[0]

  // Create a new profile
  const { data: profile, error } = await supabase
    .from('hub_guest_profiles')
    .insert({
      display_name: displayName,
      email: user.email,
      auth_user_id: user.id,
      client_id: user.entityId,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create hub profile: ${error.message}`)
  return profile as HubGuestProfile
}

export type ClientHubGroup = HubGroup & {
  member_count: number
  has_unread: boolean
  my_role: string
}

/**
 * Get all hub groups the client belongs to, with enriched data.
 */
export async function getClientHubGroups(): Promise<ClientHubGroup[]> {
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  // Get all memberships
  const { data: memberships, error: memErr } = await supabase
    .from('hub_group_members')
    .select('group_id, role, last_read_at')
    .eq('profile_id', profile.id)

  if (memErr || !memberships?.length) return []

  const groupIds = memberships.map((m) => m.group_id)

  // Fetch groups
  const { data: groups, error: grpErr } = await supabase
    .from('hub_groups')
    .select('*, event_themes(*)')
    .in('id', groupIds)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (grpErr || !groups?.length) return []

  // Get member counts
  const { data: countRows } = await supabase
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const memberCounts: Record<string, number> = {}
  for (const row of countRows ?? []) {
    memberCounts[row.group_id] = (memberCounts[row.group_id] || 0) + 1
  }

  // Build lookup for membership data
  const membershipMap = new Map(memberships.map((m) => [m.group_id, m]))

  return groups.map((g) => {
    const membership = membershipMap.get(g.id)
    const lastRead = membership?.last_read_at
    const hasUnread = !!(g.last_message_at && (!lastRead || g.last_message_at > lastRead))

    return {
      ...g,
      theme: g.event_themes ?? null,
      event_themes: undefined,
      member_count: memberCounts[g.id] || 0,
      has_unread: hasUnread,
      my_role: membership?.role || 'member',
    } as ClientHubGroup
  })
}

/**
 * Get the client's hub profile token (for use with existing hub components).
 */
export async function getClientProfileToken(): Promise<string> {
  const profile = await getOrCreateClientHubProfile()
  return profile.profile_token
}

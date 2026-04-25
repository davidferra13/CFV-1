'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { HubGuestProfile, HubGroup } from './types'

// ---------------------------------------------------------------------------
// Client Hub Actions - Authenticated client → hub profile bridging
// ---------------------------------------------------------------------------

/**
 * Get or create a hub guest profile for an authenticated client.
 * Links by auth_user_id or client_id, or creates a new profile if none exists.
 */
export async function getOrCreateClientHubProfile(): Promise<HubGuestProfile> {
  const user = await requireClient()
  const db = createServerClient({ admin: true })

  // Try to find existing profile linked to this auth user or client
  const { data: existing } = await db
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
      await db.from('hub_guest_profiles').update(updates).eq('id', existing.id)
    }

    return existing as HubGuestProfile
  }

  // Try to find by email match
  if (user.email) {
    const normalized = user.email.toLowerCase().trim()
    const { data: emailMatch } = await db
      .from('hub_guest_profiles')
      .select('*')
      .eq('email_normalized', normalized)
      .limit(1)
      .single()

    if (emailMatch) {
      // Link the existing profile to this client
      await db
        .from('hub_guest_profiles')
        .update({ auth_user_id: user.id, client_id: user.entityId })
        .eq('id', emailMatch.id)

      return { ...emailMatch, auth_user_id: user.id, client_id: user.entityId } as HubGuestProfile
    }
  }

  // Get client name for the display name
  const { data: client } = await db
    .from('clients')
    .select('full_name')
    .eq('id', user.entityId)
    .single()

  const displayName = client?.full_name || user.email.split('@')[0]

  // Create a new profile
  const { data: profile, error } = await db
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
  const db = createServerClient({ admin: true })

  // Get all memberships
  const { data: memberships, error: memErr } = await db
    .from('hub_group_members')
    .select('group_id, role, last_read_at')
    .eq('profile_id', profile.id)

  if (memErr || !memberships?.length) return []

  const groupIds = memberships.map((m: any) => m.group_id)

  // Fetch groups
  const { data: groups, error: grpErr } = await db
    .from('hub_groups')
    .select('*, event_themes(*)')
    .in('id', groupIds)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (grpErr || !groups?.length) return []

  // Get member counts
  const { data: countRows } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const memberCounts: Record<string, number> = {}
  for (const row of countRows ?? []) {
    memberCounts[row.group_id] = (memberCounts[row.group_id] || 0) + 1
  }

  // Build lookup for membership data
  const membershipMap = new Map(memberships.map((m: any) => [m.group_id, m]))

  return groups.map((g: any) => {
    const membership = membershipMap.get(g.id) as any
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

/**
 * Get the circle group token for a client's event, if one exists.
 */
export async function getCircleTokenForEvent(eventId: string): Promise<string | null> {
  const user = await requireClient()
  const db = createServerClient({ admin: true })

  // Check direct event link
  const { data: group } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .maybeSingle()

  if (group) return group.group_token

  // Check via inquiry conversion
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id')
    .eq('converted_to_event_id', eventId)
    .maybeSingle()

  if (inquiry) {
    const { data: inquiryGroup } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('inquiry_id', inquiry.id)
      .eq('is_active', true)
      .maybeSingle()

    if (inquiryGroup) return inquiryGroup.group_token
  }

  // Check via hub_group_events junction table
  const { data: linkedGroup } = await db
    .from('hub_group_events')
    .select('hub_groups(group_token, is_active)')
    .eq('event_id', eventId)
    .limit(1)
    .maybeSingle()

  if (linkedGroup) {
    const g = linkedGroup.hub_groups as unknown as {
      group_token: string
      is_active: boolean
    } | null
    if (g?.is_active) return g.group_token
  }

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, occasion, status')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (!event || event.status === 'cancelled') {
    return null
  }

  try {
    const { ensureEventDinnerCircle } = await import('./integration-actions')
    const ensured = await ensureEventDinnerCircle({
      eventId: event.id,
      tenantId: event.tenant_id,
      eventTitle: event.occasion || 'Dinner Circle',
    })
    return ensured.groupToken
  } catch {
    return null
  }
}

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { HubGroup, HubGroupMember, HubGroupEvent } from './types'

// ---------------------------------------------------------------------------
// Hub Groups - Public (link-based access)
// ---------------------------------------------------------------------------

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  emoji: z.string().max(10).optional().nullable(),
  theme_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  event_stub_id: z.string().uuid().optional().nullable(),
  tenant_id: z.string().uuid().optional().nullable(),
  created_by_profile_id: z.string().uuid(),
  group_type: z.enum(['circle', 'dinner_club', 'planning']).optional(),
})

/**
 * Create a new hub group.
 */
export async function createHubGroup(input: z.infer<typeof CreateGroupSchema>): Promise<HubGroup> {
  const validated = CreateGroupSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: group, error } = await supabase
    .from('hub_groups')
    .insert(validated)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create group: ${error.message}`)

  // Auto-add creator as owner
  await supabase.from('hub_group_members').insert({
    group_id: group.id,
    profile_id: validated.created_by_profile_id,
    role: 'owner',
    can_post: true,
    can_invite: true,
    can_pin: true,
  })

  // Post system message: group created
  await supabase.from('hub_messages').insert({
    group_id: group.id,
    author_profile_id: validated.created_by_profile_id,
    message_type: 'system',
    system_event_type: 'group_created',
    system_metadata: { group_name: validated.name },
  })

  return group as HubGroup
}

/**
 * Get a group by its shareable token.
 */
export async function getGroupByToken(groupToken: string): Promise<HubGroup | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_groups')
    .select('*, event_themes(*)')
    .eq('group_token', groupToken)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load group: ${error.message}`)
  }
  if (!data) return null

  // Reshape the joined theme
  const group = {
    ...data,
    theme: data.event_themes ?? null,
  } as HubGroup & { event_themes?: unknown }
  delete group.event_themes

  return group
}

/**
 * Get a group by ID.
 */
export async function getGroupById(groupId: string): Promise<HubGroup | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_groups')
    .select('*, event_themes(*)')
    .eq('id', groupId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load group: ${error.message}`)
  }
  if (!data) return null

  const group = {
    ...data,
    theme: data.event_themes ?? null,
  } as HubGroup & { event_themes?: unknown }
  delete group.event_themes

  return group
}

/**
 * Join a group. Creates profile if needed, adds as member.
 */
export async function joinHubGroup(input: {
  groupToken: string
  profileId: string
}): Promise<HubGroupMember> {
  const supabase = createServerClient({ admin: true })

  // Look up group
  const { data: group } = await supabase
    .from('hub_groups')
    .select('id, is_active')
    .eq('group_token', input.groupToken)
    .single()

  if (!group || !group.is_active) {
    throw new Error('Group not found or inactive')
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('hub_group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('profile_id', input.profileId)
    .single()

  if (existing) return existing as HubGroupMember

  // Add as member
  const { data: member, error } = await supabase
    .from('hub_group_members')
    .insert({
      group_id: group.id,
      profile_id: input.profileId,
      role: 'member',
      can_post: true,
      can_invite: false,
      can_pin: false,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to join group: ${error.message}`)

  // Get profile name for system message
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('display_name')
    .eq('id', input.profileId)
    .single()

  // Post system message (non-blocking)
  try {
    await supabase.from('hub_messages').insert({
      group_id: group.id,
      author_profile_id: input.profileId,
      message_type: 'system',
      system_event_type: 'member_joined',
      body: `${profile?.display_name ?? 'Someone'} joined! Welcome to the dinner circle. Chat with the group, share photos, update dietary needs, and stay in the loop on all event details here.`,
      system_metadata: { display_name: profile?.display_name ?? 'Someone' },
    })
  } catch {
    // Non-blocking
  }

  // Referral tracking: record first group + who created it (non-blocking)
  try {
    const { data: currentProfile } = await supabase
      .from('hub_guest_profiles')
      .select('first_group_id')
      .eq('id', input.profileId)
      .single()

    if (currentProfile && !(currentProfile as any).first_group_id) {
      // Find group creator for referral attribution
      const { data: creator } = await supabase
        .from('hub_group_members')
        .select('profile_id')
        .eq('group_id', group.id)
        .eq('role', 'owner')
        .single()

      await (supabase as any)
        .from('hub_guest_profiles')
        .update({
          first_group_id: group.id,
          referred_by_profile_id: creator?.profile_id ?? null,
        })
        .eq('id', input.profileId)
        .is('first_group_id', null)
    }
  } catch {
    // Non-blocking referral tracking
  }

  return member as HubGroupMember
}

/**
 * Get all members of a group.
 */
export async function getGroupMembers(groupId: string): Promise<HubGroupMember[]> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_group_members')
    .select('*, hub_guest_profiles(*)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  if (error) throw new Error(`Failed to load members: ${error.message}`)

  return (data ?? []).map((m) => ({
    ...m,
    profile: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubGroupMember[]
}

/**
 * Get events linked to a group.
 */
export async function getGroupEvents(groupId: string): Promise<HubGroupEvent[]> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_group_events')
    .select('*')
    .eq('group_id', groupId)
    .order('added_at', { ascending: false })

  if (error) throw new Error(`Failed to load group events: ${error.message}`)
  return (data ?? []) as HubGroupEvent[]
}

/**
 * Link an event to a group.
 */
export async function addEventToGroup(input: { groupId: string; eventId: string }): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase.from('hub_group_events').insert({
    group_id: input.groupId,
    event_id: input.eventId,
  })

  if (error && error.code !== '23505') {
    // 23505 = unique violation (already linked)
    throw new Error(`Failed to link event: ${error.message}`)
  }
}

/**
 * Update group settings.
 */
export async function updateHubGroup(input: {
  groupId: string
  profileToken: string
  name?: string
  description?: string | null
  emoji?: string | null
  allow_member_invites?: boolean
  allow_anonymous_posts?: boolean
}): Promise<HubGroup> {
  const supabase = createServerClient({ admin: true })

  // Verify profile is owner/admin
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('role')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only owners and admins can update group settings')
  }

  const { groupId, profileToken, ...updates } = input
  const { data, error } = await supabase
    .from('hub_groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update group: ${error.message}`)
  return data as HubGroup
}

/**
 * Get the member count for a group.
 */
export async function getGroupMemberCount(groupId: string): Promise<number> {
  const supabase = createServerClient({ admin: true })

  const { count, error } = await supabase
    .from('hub_group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)

  if (error) return 0
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Notification Muting
// ---------------------------------------------------------------------------

/**
 * Toggle mute/unmute notifications for a circle.
 */
export async function toggleMuteCircle(input: {
  groupId: string
  profileToken: string
}): Promise<boolean> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('notifications_muted')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('Not a member')

  const newMuted = !membership.notifications_muted

  await supabase
    .from('hub_group_members')
    .update({ notifications_muted: newMuted })
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)

  return newMuted
}

// ---------------------------------------------------------------------------
// Member Management - Owner/Admin actions
// ---------------------------------------------------------------------------

/**
 * Verify that a profile token corresponds to an owner or admin of a group.
 * Returns the caller's profile ID or throws.
 */
async function requireGroupAdmin(groupId: string, profileToken: string) {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only owners and admins can manage group members')
  }

  return { profileId: profile.id, role: membership.role }
}

/**
 * Update a member's role within a group.
 * Owners can set any role. Admins can set member/viewer but not owner/admin.
 */
export async function updateMemberRole(input: {
  groupId: string
  profileToken: string
  targetMemberId: string
  newRole: 'admin' | 'member' | 'viewer'
}): Promise<void> {
  const caller = await requireGroupAdmin(input.groupId, input.profileToken)
  const supabase = createServerClient({ admin: true })

  // Admins cannot promote to admin
  if (caller.role === 'admin' && input.newRole === 'admin') {
    throw new Error('Only owners can promote members to admin')
  }

  // Cannot change the owner's role
  const { data: target } = await supabase
    .from('hub_group_members')
    .select('role, profile_id')
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)
    .single()

  if (!target) throw new Error('Member not found')
  if (target.role === 'owner') throw new Error("Cannot change the owner's role")
  if (target.role === 'chef') throw new Error("Cannot change the chef's role")

  // Set default permissions based on role
  const permissions =
    input.newRole === 'admin'
      ? { can_post: true, can_invite: true, can_pin: true }
      : input.newRole === 'viewer'
        ? { can_post: false, can_invite: false, can_pin: false }
        : { can_post: true, can_invite: false, can_pin: false }

  const { error } = await supabase
    .from('hub_group_members')
    .update({ role: input.newRole, ...permissions })
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)

  if (error) throw new Error(`Failed to update role: ${error.message}`)
}

/**
 * Update a member's permissions (can_post, can_invite, can_pin).
 */
export async function updateMemberPermissions(input: {
  groupId: string
  profileToken: string
  targetMemberId: string
  can_post?: boolean
  can_invite?: boolean
  can_pin?: boolean
}): Promise<void> {
  await requireGroupAdmin(input.groupId, input.profileToken)
  const supabase = createServerClient({ admin: true })

  // Cannot change owner/chef permissions
  const { data: target } = await supabase
    .from('hub_group_members')
    .select('role')
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)
    .single()

  if (!target) throw new Error('Member not found')
  if (target.role === 'owner' || target.role === 'chef') {
    throw new Error(`Cannot change ${target.role} permissions`)
  }

  const updates: Record<string, boolean> = {}
  if (input.can_post !== undefined) updates.can_post = input.can_post
  if (input.can_invite !== undefined) updates.can_invite = input.can_invite
  if (input.can_pin !== undefined) updates.can_pin = input.can_pin

  if (Object.keys(updates).length === 0) return

  const { error } = await supabase
    .from('hub_group_members')
    .update(updates)
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)

  if (error) throw new Error(`Failed to update permissions: ${error.message}`)
}

/**
 * Remove a member from a group. Owner/admin only.
 * Cannot remove the owner or yourself (use leaveGroup for that).
 */
export async function removeMember(input: {
  groupId: string
  profileToken: string
  targetMemberId: string
}): Promise<void> {
  const caller = await requireGroupAdmin(input.groupId, input.profileToken)
  const supabase = createServerClient({ admin: true })

  const { data: target } = await supabase
    .from('hub_group_members')
    .select('role, profile_id')
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)
    .single()

  if (!target) throw new Error('Member not found')
  if (target.role === 'owner') throw new Error('Cannot remove the group owner')
  if (target.profile_id === caller.profileId) {
    throw new Error('Use leaveGroup to leave the group yourself')
  }

  // Admins cannot remove other admins
  if (caller.role === 'admin' && target.role === 'admin') {
    throw new Error('Admins cannot remove other admins')
  }

  const { error } = await supabase
    .from('hub_group_members')
    .delete()
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)

  // Post system message (non-blocking)
  try {
    const { data: profile } = await supabase
      .from('hub_guest_profiles')
      .select('display_name')
      .eq('id', target.profile_id)
      .single()

    await supabase.from('hub_messages').insert({
      group_id: input.groupId,
      author_profile_id: caller.profileId,
      message_type: 'system',
      system_event_type: 'member_removed',
      system_metadata: { display_name: profile?.display_name ?? 'Someone' },
    })
  } catch {
    // Non-blocking
  }
}

/**
 * Leave a group voluntarily. Any member can call this.
 * The sole owner cannot leave (must transfer ownership first).
 */
export async function leaveGroup(input: { groupId: string; profileToken: string }): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('id, role')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('You are not a member of this group')

  // If owner, check there's another owner or admin to take over
  if (membership.role === 'owner') {
    const { data: otherAdmins } = await supabase
      .from('hub_group_members')
      .select('id')
      .eq('group_id', input.groupId)
      .in('role', ['owner', 'admin'])
      .neq('profile_id', profile.id)

    if (!otherAdmins?.length) {
      throw new Error('You are the only owner. Promote another member to admin before leaving.')
    }
  }

  const { error } = await supabase.from('hub_group_members').delete().eq('id', membership.id)

  if (error) throw new Error(`Failed to leave group: ${error.message}`)

  // Post system message (non-blocking)
  try {
    await supabase.from('hub_messages').insert({
      group_id: input.groupId,
      author_profile_id: profile.id,
      message_type: 'system',
      system_event_type: 'member_left',
      system_metadata: { display_name: profile.display_name ?? 'Someone' },
    })
  } catch {
    // Non-blocking
  }
}

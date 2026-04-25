'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { Json } from '@/types/database'
import type { HubGroup, HubGroupMember, HubGroupEvent } from './types'
import { formatInviteSenderLabel, resolveHubInviteAttribution } from './invite-links'

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
  group_type: z.enum(['circle', 'dinner_club', 'planning', 'bridge', 'community']).optional(),
  visibility: z.enum(['public', 'private', 'secret']).optional(),
  display_vibe: z.array(z.string()).optional().nullable(),
  planning_brief: z.record(z.string(), z.unknown()).optional().nullable(),
})

/**
 * Create a new hub group.
 * SECURITY (Q5): Validates that created_by_profile_id exists and, if
 * tenant_id is provided, that the tenant actually exists in the chefs table.
 */
export async function createHubGroup(input: z.infer<typeof CreateGroupSchema>): Promise<HubGroup> {
  const validated = CreateGroupSchema.parse(input)
  const db = createServerClient({ admin: true })

  // SECURITY (Q5): Verify profile exists (prevents arbitrary profile spoofing)
  const { data: creatorProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('id', validated.created_by_profile_id)
    .single()
  if (!creatorProfile) throw new Error('Invalid profile')

  // SECURITY (Q5): If tenant_id provided, verify it exists
  if (validated.tenant_id) {
    const { data: tenant } = await db
      .from('chefs')
      .select('id')
      .eq('id', validated.tenant_id)
      .single()
    if (!tenant) validated.tenant_id = null
  }

  const { data: group, error } = await db.from('hub_groups').insert(validated).select('*').single()

  if (error) throw new Error(`Failed to create group: ${error.message}`)

  // Auto-add creator as owner
  await db.from('hub_group_members').insert({
    group_id: group.id,
    profile_id: validated.created_by_profile_id,
    role: 'owner',
    can_post: true,
    can_invite: true,
    can_pin: true,
  })

  // Post system message: group created
  await db.from('hub_messages').insert({
    group_id: group.id,
    author_profile_id: validated.created_by_profile_id,
    message_type: 'system',
    system_event_type: 'group_created',
    system_metadata: { group_name: validated.name },
  })

  // Loyalty trigger: hub group created (non-blocking)
  // This is an internal utility with no session; caller must provide tenant_id
  if (validated.tenant_id && validated.created_by_profile_id) {
    try {
      // Resolve profile to client_id
      const { data: profile } = await db
        .from('hub_guest_profiles')
        .select('client_id')
        .eq('id', validated.created_by_profile_id)
        .single()
      if (profile?.client_id) {
        const { fireTrigger } = await import('@/lib/loyalty/triggers')
        await fireTrigger('hub_group_created', validated.tenant_id, profile.client_id, {
          description: `Created group: ${validated.name}`,
        })
      }
    } catch (err) {
      console.error('[createHubGroup] Loyalty trigger failed (non-blocking):', err)
    }
  }

  return group as HubGroup
}

/**
 * Get a group by its shareable token.
 */
export async function getGroupByToken(groupToken: string): Promise<HubGroup | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  inviteToken?: string | null
}): Promise<HubGroupMember> {
  const db = createServerClient({ admin: true })

  // Look up group
  const { data: group } = await db
    .from('hub_groups')
    .select('id, is_active, name, group_token, group_type')
    .eq('group_token', input.groupToken)
    .single()

  if (!group || !group.is_active) {
    throw new Error('Group not found or inactive')
  }

  // Check if already a member
  const { data: existing } = await db
    .from('hub_group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('profile_id', input.profileId)
    .single()

  if (existing) return existing as HubGroupMember

  const inviteAttribution = await resolveHubInviteAttribution({
    groupToken: input.groupToken,
    inviteToken: input.inviteToken ?? null,
  }).catch(() => null)
  const attributedInviter =
    inviteAttribution?.inviterProfileId === input.profileId ? null : inviteAttribution

  // Add as member
  const { data: member, error } = await db
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

  // Get profile name and email for system message + confirmation email
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('display_name, email, profile_token')
    .eq('id', input.profileId)
    .single()

  // Post system message (non-blocking)
  try {
    const messageBody = attributedInviter
      ? `${profile?.display_name ?? 'Someone'} joined via ${formatInviteSenderLabel(
          attributedInviter.copyRole,
          attributedInviter.inviterDisplayName
        )}'s invite.`
      : group.group_type === 'community'
        ? `${profile?.display_name ?? 'Someone'} joined the circle. Welcome them in.`
        : `${profile?.display_name ?? 'Someone'} joined the Dinner Circle.`

    const { data: systemMessage } = await db
      .from('hub_messages')
      .insert({
        group_id: group.id,
        author_profile_id: input.profileId,
        message_type: 'system',
        system_event_type: 'member_joined',
        body: messageBody,
        system_metadata: {
          display_name: profile?.display_name ?? 'Someone',
          invited_by_profile_id: attributedInviter?.inviterProfileId ?? null,
          invited_by_display_name: attributedInviter?.inviterDisplayName ?? null,
          invited_by_copy_role: attributedInviter?.copyRole ?? null,
        } as Json,
      })
      .select('*, hub_guest_profiles!author_profile_id(*)')
      .single()

    if (systemMessage) {
      const { broadcast } = await import('@/lib/realtime/sse-server')
      broadcast(`hub_messages:${group.id}`, 'INSERT', {
        new: {
          ...systemMessage,
          author: systemMessage.hub_guest_profiles ?? undefined,
          hub_guest_profiles: undefined,
        },
      })
    }
  } catch {
    // Non-blocking
  }

  // Notify existing members about new member (non-blocking)
  try {
    const { notifyCircleMembers } = await import('./circle-notification-actions')
    const displayName = profile?.display_name ?? 'Someone'
    await notifyCircleMembers({
      groupId: group.id,
      authorProfileId: input.profileId,
      messageBody: `${displayName} just joined. Say hello!`,
    })
  } catch (err) {
    console.error('[joinHubGroup] Member join notification failed (non-blocking):', err)
  }

  // Send confirmation email to guest with their circle link (non-blocking)
  if (profile?.email && group.group_token) {
    try {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
      const circleUrl = `${APP_URL}/hub/g/${group.group_token}`
      const { sendEmail } = await import('@/lib/email/send')
      const { createElement } = await import('react')
      const { NotificationGenericEmail } =
        await import('@/lib/email/templates/notification-generic')
      await sendEmail({
        to: profile.email,
        subject: `You joined ${group.name || 'the circle'}`,
        react: createElement(NotificationGenericEmail, {
          title: `You are in the circle`,
          body:
            group.group_type === 'community'
              ? `Bookmark this link so you can always find your way back. This is where you can chat with the community, share photos, and connect with fellow food lovers.`
              : `Bookmark this link so you can always find your way back. This is where you can chat with the chef, share photos, and track everything leading up to the event.`,
          actionUrl: circleUrl,
          actionLabel:
            group.group_type === 'community' ? 'Open Your Circle' : 'Open Your Dinner Circle',
        }),
      })
    } catch {
      // Non-blocking
    }
  }

  // Referral tracking: record first group + who created it (non-blocking)
  try {
    const { data: currentProfile } = await db
      .from('hub_guest_profiles')
      .select('first_group_id')
      .eq('id', input.profileId)
      .single()

    if (currentProfile && !(currentProfile as any).first_group_id) {
      // Find group creator for referral attribution
      const { data: creator } = await db
        .from('hub_group_members')
        .select('profile_id')
        .eq('group_id', group.id)
        .eq('role', 'owner')
        .single()

      await (db as any)
        .from('hub_guest_profiles')
        .update({
          first_group_id: group.id,
          referred_by_profile_id:
            attributedInviter?.inviterProfileId ?? creator?.profile_id ?? null,
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_group_members')
    .select('*, hub_guest_profiles(*)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  if (error) throw new Error(`Failed to load members: ${error.message}`)

  return (data ?? []).map((m: any) => ({
    ...m,
    profile: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubGroupMember[]
}

/**
 * Get events linked to a group.
 */
export async function getGroupEvents(groupId: string): Promise<HubGroupEvent[]> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const { error } = await db.from('hub_group_events').insert({
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
  const db = createServerClient({ admin: true })

  // Verify profile is owner/admin
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only owners and admins can update group settings')
  }

  const { groupId, profileToken, ...updates } = input
  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const { count, error } = await db
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
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
    .from('hub_group_members')
    .select('notifications_muted')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('Not a member')

  const newMuted = !membership.notifications_muted

  await db
    .from('hub_group_members')
    .update({ notifications_muted: newMuted })
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)

  return newMuted
}

// ---------------------------------------------------------------------------
// Member Notification Preferences
// ---------------------------------------------------------------------------

/**
 * Update notification preferences for the current member.
 */
export async function updateMemberNotificationPreferences(input: {
  groupId: string
  profileToken: string
  prefs: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) return { success: false, error: 'Invalid profile token' }

  // Only allow known notification fields
  const allowed = [
    'notifications_muted',
    'notify_email',
    'notify_push',
    'quiet_hours_start',
    'quiet_hours_end',
    'digest_mode',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in input.prefs) {
      updates[key] = input.prefs[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db
    .from('hub_group_members')
    .update(updates)
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Member Management - Owner/Admin actions
// ---------------------------------------------------------------------------

/**
 * Verify that a profile token corresponds to an owner or admin of a group.
 * Returns the caller's profile ID or throws.
 */
async function requireGroupAdmin(groupId: string, profileToken: string) {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
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
  const db = createServerClient({ admin: true })

  // Admins cannot promote to admin
  if (caller.role === 'admin' && input.newRole === 'admin') {
    throw new Error('Only owners can promote members to admin')
  }

  // Cannot change the owner's role
  const { data: target } = await db
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

  const { error } = await db
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
  const db = createServerClient({ admin: true })

  // Cannot change owner/chef permissions
  const { data: target } = await db
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

  const { error } = await db
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
  const db = createServerClient({ admin: true })

  const { data: target } = await db
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

  const { error } = await db
    .from('hub_group_members')
    .delete()
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)

  // Post system message (non-blocking)
  try {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('display_name')
      .eq('id', target.profile_id)
      .single()

    await db.from('hub_messages').insert({
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
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
    .from('hub_group_members')
    .select('id, role')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('You are not a member of this group')

  // If owner, check there's another owner or admin to take over
  if (membership.role === 'owner') {
    const { data: otherAdmins } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', input.groupId)
      .in('role', ['owner', 'admin'])
      .neq('profile_id', profile.id)

    if (!otherAdmins?.length) {
      throw new Error('You are the only owner. Promote another member to admin before leaving.')
    }
  }

  const { error } = await db.from('hub_group_members').delete().eq('id', membership.id)

  if (error) throw new Error(`Failed to leave group: ${error.message}`)

  // Post system message (non-blocking)
  try {
    await db.from('hub_messages').insert({
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

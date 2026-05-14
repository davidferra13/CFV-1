'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { Json } from '@/types/database'
import type { HubGroup, HubGroupMember, HubGroupEvent } from './types'
import { formatInviteSenderLabel, resolveHubInviteAttribution } from './invite-links'
import {
  canAssignCircleMemberRole,
  canManageCircleMember,
  canManageThread,
  defaultCircleMemberPermissions,
  type CircleAccessActor,
  type CircleAccessContext,
} from './circle-access-policy'

type HubGroupManagementRole = 'owner' | 'admin' | 'chef' | 'host'
type ManagedHubMemberRole = 'admin' | 'host' | 'member' | 'viewer' | 'delegate'

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

function buildCircleAccessContext(
  group: Pick<
    HubGroup,
    | 'visibility'
    | 'tenant_id'
    | 'created_by_profile_id'
    | 'allow_anonymous_posts'
    | 'allow_member_invites'
  > & { group_type?: HubGroup['group_type'] | null }
): CircleAccessContext {
  return {
    group: {
      visibility: group.visibility,
      tenant_id: group.tenant_id,
      created_by_profile_id: group.created_by_profile_id,
      allow_anonymous_posts: group.allow_anonymous_posts,
      allow_member_invites: group.allow_member_invites,
      group_type: group.group_type ?? undefined,
    },
  }
}

function buildCircleActor(
  profileId: string,
  membership: Pick<HubGroupMember, 'role' | 'can_post' | 'can_invite' | 'can_pin'>
): CircleAccessActor {
  return {
    role: membership.role,
    profileId,
    isMember: true,
    member: membership,
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
  circle_mode?: 'standard' | 'residency'
  default_tab?: 'chat' | 'meals' | 'events' | 'photos' | 'notes' | 'members'
  silent_by_default?: boolean
}): Promise<HubGroup> {
  const db = createServerClient({ admin: true })

  // Verify profile can manage client-facing group settings.
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
    .from('hub_group_members')
    .select('role, can_post, can_invite, can_pin')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  const { data: groupForPolicy } = await db
    .from('hub_groups')
    .select(
      'visibility, tenant_id, created_by_profile_id, allow_anonymous_posts, allow_member_invites, group_type'
    )
    .eq('id', input.groupId)
    .single()

  if (
    !membership ||
    !groupForPolicy ||
    !canManageThread(
      buildCircleActor(profile.id, membership),
      buildCircleAccessContext(groupForPolicy)
    )
  ) {
    throw new Error('Only owners, admins, chefs, and hosts can update group settings')
  }

  const updates: {
    name?: string
    description?: string | null
    emoji?: string | null
    allow_member_invites?: boolean
    allow_anonymous_posts?: boolean
    circle_mode?: 'standard' | 'residency'
    default_tab?: 'chat' | 'meals' | 'events' | 'photos' | 'notes' | 'members'
    silent_by_default?: boolean
  } = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.emoji !== undefined) updates.emoji = input.emoji
  if (input.allow_member_invites !== undefined) {
    updates.allow_member_invites = input.allow_member_invites
  }
  if (input.allow_anonymous_posts !== undefined) {
    updates.allow_anonymous_posts = input.allow_anonymous_posts
  }
  if (input.circle_mode !== undefined) {
    if (!['standard', 'residency'].includes(input.circle_mode)) {
      throw new Error('Invalid circle mode')
    }
    updates.circle_mode = input.circle_mode
  }
  if (input.default_tab !== undefined) {
    if (!['chat', 'meals', 'events', 'photos', 'notes', 'members'].includes(input.default_tab)) {
      throw new Error('Invalid default tab')
    }
    updates.default_tab = input.default_tab
  }
  if (input.silent_by_default !== undefined) {
    updates.silent_by_default = input.silent_by_default
  }

  const { data, error } = await db
    .from('hub_groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', input.groupId)
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
    'show_remy',
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
// Member Management - Owner/Admin/Chef/Host actions
// ---------------------------------------------------------------------------

/**
 * Verify that a profile token corresponds to an owner, admin, chef, or host of a group.
 * Returns the caller's profile ID or throws.
 */
async function requireGroupManager(groupId: string, profileToken: string) {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
    .from('hub_group_members')
    .select('role, can_post, can_invite, can_pin')
    .eq('group_id', groupId)
    .eq('profile_id', profile.id)
    .single()

  const { data: groupForPolicy } = await db
    .from('hub_groups')
    .select(
      'visibility, tenant_id, created_by_profile_id, allow_anonymous_posts, allow_member_invites, group_type'
    )
    .eq('id', groupId)
    .single()

  if (!membership || !groupForPolicy) {
    throw new Error('Only owners, admins, chefs, and hosts can manage group members')
  }

  const context = buildCircleAccessContext(groupForPolicy)
  const actor = buildCircleActor(profile.id, membership)
  if (!canManageThread(actor, context)) {
    throw new Error('Only owners, admins, chefs, and hosts can manage group members')
  }

  return { profileId: profile.id, role: membership.role as HubGroupManagementRole, actor, context }
}

/**
 * Update a member's role within a group.
 * Owners and chefs can set any non-owner/non-chef role.
 * Admins can set host/member/viewer/delegate.
 * Hosts can only manage ordinary member/viewer/delegate roles.
 */
export async function updateMemberRole(input: {
  groupId: string
  profileToken: string
  targetMemberId: string
  newRole: ManagedHubMemberRole
}): Promise<void> {
  const caller = await requireGroupManager(input.groupId, input.profileToken)
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
  if (!canAssignCircleMemberRole(caller.actor, caller.context, target.role, input.newRole)) {
    throw new Error('You cannot assign that circle role')
  }

  const permissions = defaultCircleMemberPermissions(input.newRole)

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
  const caller = await requireGroupManager(input.groupId, input.profileToken)
  const db = createServerClient({ admin: true })

  // Cannot change owner/chef permissions. Hosts are limited to ordinary members.
  const { data: target } = await db
    .from('hub_group_members')
    .select('role')
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)
    .single()

  if (!target) throw new Error('Member not found')
  if (!canManageCircleMember(caller.actor, caller.context, target.role)) {
    throw new Error('You cannot change that circle member')
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
 * Remove a member from a group. Owner/admin/chef/host only.
 * Cannot remove the owner or yourself (use leaveGroup for that).
 */
export async function removeMember(input: {
  groupId: string
  profileToken: string
  targetMemberId: string
}): Promise<void> {
  const caller = await requireGroupManager(input.groupId, input.profileToken)
  const db = createServerClient({ admin: true })

  const { data: target } = await db
    .from('hub_group_members')
    .select('role, profile_id')
    .eq('id', input.targetMemberId)
    .eq('group_id', input.groupId)
    .single()

  if (!target) throw new Error('Member not found')
  if (!canManageCircleMember(caller.actor, caller.context, target.role)) {
    throw new Error('You cannot remove that circle member')
  }
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
 * The sole owner cannot leave (must transfer ownership first). A sole host is
 * held only when no other owner/admin/host remains for client-facing controls.
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

  // If owner/sole host, check there's another manager to take over.
  if (membership.role === 'owner' || membership.role === 'host') {
    const { data: otherManagers } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', input.groupId)
      .in('role', membership.role === 'owner' ? ['owner', 'admin'] : ['owner', 'admin', 'host'])
      .neq('profile_id', profile.id)

    if (!otherManagers?.length) {
      throw new Error(
        membership.role === 'owner'
          ? 'You are the only owner. Promote another member to admin before leaving.'
          : 'You are the only host. Promote another member to host or admin before leaving.'
      )
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

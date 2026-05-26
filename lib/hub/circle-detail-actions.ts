'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Circle Detail Actions
// Server actions for the chef-side circle command center (/circles/[id]).
// ---------------------------------------------------------------------------

export interface CircleMemberDetail {
  id: string
  profile_id: string
  display_name: string
  avatar_url: string | null
  email: string | null
  client_id: string | null
  client_name: string | null
  role: string
  can_post: boolean
  can_invite: boolean
  can_pin: boolean
  rsvp_status: string | null
  joined_at: string
  last_read_at: string | null
  notifications_muted: boolean
  last_notified_at: string | null
  notify_email: boolean | null
  notify_push: boolean | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  digest_mode: string | null
  show_remy: boolean
}

export interface CircleEventLink {
  event_id: string
  event_title: string
  event_date: string | null
  event_status: string
  guest_count: number | null
  linked_at: string
}

export interface CircleMessage {
  id: string
  author_name: string
  author_avatar: string | null
  message_type: string
  body: string | null
  created_at: string
  is_pinned: boolean
}

export interface CircleDetail {
  id: string
  name: string
  description: string | null
  emoji: string | null
  group_type: string
  group_token: string
  visibility: string
  allow_member_invites: boolean
  allow_anonymous_posts: boolean
  circle_mode: string
  default_tab: string
  silent_by_default: boolean
  is_active: boolean
  message_count: number
  last_message_at: string | null
  created_at: string
  members: CircleMemberDetail[]
  events: CircleEventLink[]
  recent_messages: CircleMessage[]
  chef_profile_token: string | null
  chef_show_remy: boolean
  has_co_hosts: boolean
}

export interface CircleEventPickerItem {
  id: string
  title: string
  event_date: string | null
  status: string
  guest_count: number | null
}

export interface UpdateCircleSettingsInput {
  name?: string
  description?: string | null
  emoji?: string | null
  allow_member_invites?: boolean
  allow_anonymous_posts?: boolean
  circle_mode?: 'standard' | 'residency'
  default_tab?: 'chat' | 'meals' | 'events' | 'photos' | 'notes' | 'members'
  silent_by_default?: boolean
}

export type CircleMemberRole = 'admin' | 'member' | 'viewer'

export interface UpdateCircleMemberPermissionsInput {
  can_post?: boolean
  can_invite?: boolean
  can_pin?: boolean
}

type OwnedCircle = {
  id: string
  group_token: string | null
}

async function requireOwnedCircle(
  db: any,
  circleId: string,
  tenantId: string
): Promise<OwnedCircle | null> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, group_token')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  return circle ?? null
}

function revalidateCirclePaths(circleId: string, groupToken?: string | null) {
  revalidatePath(`/circles/${circleId}`)
  revalidatePath('/circles')
  if (groupToken) {
    revalidatePath(`/hub/g/${groupToken}`)
  }
}

/**
 * Get full circle detail for the chef-side command center.
 * Auth-gated: only the owning chef can view.
 */
export async function getCircleDetail(circleId: string): Promise<CircleDetail | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // 1. Get the circle, verify tenant ownership
  const { data: circle } = await db
    .from('hub_groups')
    .select('*')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return null

  // 2. Get members with profile + client data
  const { data: memberships } = await db
    .from('hub_group_members')
    .select(
      [
        'id',
        'profile_id',
        'role',
        'can_post',
        'can_invite',
        'can_pin',
        'joined_at',
        'last_read_at',
        'notifications_muted',
        'last_notified_at',
        'notify_email',
        'notify_push',
        'quiet_hours_start',
        'quiet_hours_end',
        'digest_mode',
        'rsvp_status',
        'show_remy',
      ].join(', ')
    )
    .eq('group_id', circleId)
    .order('joined_at', { ascending: true })

  const profileIds = (memberships ?? []).map((m: any) => m.profile_id)

  let profileMap: Record<string, any> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, avatar_url, email, client_id, profile_token')
      .in('id', profileIds)

    for (const p of profiles ?? []) {
      profileMap[p.id] = p
    }
  }

  // Get client names for profiles that have client_id
  const clientIds = Object.values(profileMap)
    .map((p: any) => p.client_id)
    .filter(Boolean)

  let clientNameMap: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await db.from('clients').select('id, full_name').in('id', clientIds)

    for (const c of clients ?? []) {
      clientNameMap[c.id] = c.full_name
    }
  }

  const members: CircleMemberDetail[] = (memberships ?? []).map((m: any) => {
    const profile = profileMap[m.profile_id] ?? {}
    return {
      id: m.id,
      profile_id: m.profile_id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url ?? null,
      email: profile.email ?? null,
      client_id: profile.client_id ?? null,
      client_name: profile.client_id ? (clientNameMap[profile.client_id] ?? null) : null,
      role: m.role,
      can_post: m.can_post ?? true,
      can_invite: m.can_invite ?? false,
      can_pin: m.can_pin ?? false,
      rsvp_status: m.rsvp_status ?? null,
      joined_at: m.joined_at,
      last_read_at: m.last_read_at,
      notifications_muted: m.notifications_muted ?? false,
      last_notified_at: m.last_notified_at ?? null,
      notify_email: m.notify_email ?? null,
      notify_push: m.notify_push ?? null,
      quiet_hours_start: m.quiet_hours_start ?? null,
      quiet_hours_end: m.quiet_hours_end ?? null,
      digest_mode: m.digest_mode ?? null,
      show_remy: m.show_remy ?? true,
    }
  })

  // 3. Get linked events with status
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id, linked_at:added_at')
    .eq('group_id', circleId)
    .order('added_at', { ascending: false })

  const eventIds = (eventLinks ?? []).map((e: any) => e.event_id)

  let eventMap: Record<string, any> = {}
  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, title, event_date, status, guest_count')
      .in('id', eventIds)

    for (const e of events ?? []) {
      eventMap[e.id] = e
    }
  }

  const events: CircleEventLink[] = (eventLinks ?? []).map((link: any) => {
    const event = eventMap[link.event_id] ?? {}
    return {
      event_id: link.event_id,
      event_title: event.title ?? 'Unknown Event',
      event_date: event.event_date ?? null,
      event_status: event.status ?? 'unknown',
      guest_count: event.guest_count ?? null,
      linked_at: link.linked_at,
    }
  })

  // 4. Get recent messages (last 20)
  const { data: messages } = await db
    .from('hub_messages')
    .select('id, author_profile_id, message_type, body, created_at, is_pinned')
    .eq('group_id', circleId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const msgAuthorIds = (messages ?? []).map((m: any) => m.author_profile_id)
  let msgAuthorMap: Record<string, any> = {}
  if (msgAuthorIds.length > 0) {
    const { data: msgProfiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, avatar_url')
      .in('id', msgAuthorIds)

    for (const p of msgProfiles ?? []) {
      msgAuthorMap[p.id] = p
    }
  }

  const recent_messages: CircleMessage[] = (messages ?? []).reverse().map((m: any) => {
    const author = msgAuthorMap[m.author_profile_id] ?? {}
    return {
      id: m.id,
      author_name: author.display_name ?? 'Unknown',
      author_avatar: author.avatar_url ?? null,
      message_type: m.message_type,
      body: m.body,
      created_at: m.created_at,
      is_pinned: m.is_pinned ?? false,
    }
  })

  // 5. Check for co-hosts
  const { count: coHostCount } = await db
    .from('circle_co_hosts')
    .select('id', { count: 'exact', head: true })
    .eq('circle_id', circleId)

  // Find the chef member to expose their profile token and show_remy preference.
  const ownerMembership = (memberships ?? []).find((m: any) => ['owner', 'chef'].includes(m.role))
  const ownerProfile = ownerMembership ? profileMap[ownerMembership.profile_id] : null

  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    emoji: circle.emoji,
    group_type: circle.group_type ?? 'circle',
    group_token: circle.group_token,
    visibility: circle.visibility ?? 'public',
    allow_member_invites: circle.allow_member_invites ?? true,
    allow_anonymous_posts: circle.allow_anonymous_posts ?? false,
    circle_mode: circle.circle_mode ?? 'standard',
    default_tab: circle.default_tab ?? 'chat',
    silent_by_default: circle.silent_by_default ?? false,
    is_active: circle.is_active,
    message_count: circle.message_count ?? 0,
    last_message_at: circle.last_message_at,
    created_at: circle.created_at,
    members,
    events,
    recent_messages,
    chef_profile_token: ownerProfile?.profile_token ?? null,
    chef_show_remy: ownerMembership?.show_remy ?? true,
    has_co_hosts: (coHostCount ?? 0) > 0,
  }
}

/**
 * Update chef-owned circle settings from the command center.
 */
export async function updateCircleSettings(
  circleId: string,
  input: UpdateCircleSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const circle = await requireOwnedCircle(db, circleId, tenantId)
  if (!circle) return { success: false, error: 'Circle not found' }

  const updates: Record<string, unknown> = {}

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    const name = input.name?.trim()
    if (!name) return { success: false, error: 'Circle name is required' }
    if (name.length > 100) return { success: false, error: 'Circle name is too long' }
    const { validateCircleName } = await import('@/lib/moderation/content-filter')
    const modResult = validateCircleName(name)
    if (!modResult.allowed) {
      return { success: false, error: modResult.reason ?? 'Circle name is not allowed' }
    }
    updates.name = name
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const description = input.description?.trim() ?? null
    if (description && description.length > 500) {
      return { success: false, error: 'Description is too long' }
    }
    if (description) {
      const { moderateText } = await import('@/lib/moderation/content-filter')
      const modResult = moderateText(description)
      if (!modResult.allowed) {
        return { success: false, error: modResult.reason ?? 'Description is not allowed' }
      }
    }
    updates.description = description || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'emoji')) {
    const emoji = input.emoji?.trim() ?? null
    if (emoji && emoji.length > 10) return { success: false, error: 'Emoji is too long' }
    updates.emoji = emoji || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'allow_member_invites')) {
    if (typeof input.allow_member_invites !== 'boolean') {
      return { success: false, error: 'Invalid invite setting' }
    }
    updates.allow_member_invites = input.allow_member_invites
  }

  if (Object.prototype.hasOwnProperty.call(input, 'allow_anonymous_posts')) {
    if (typeof input.allow_anonymous_posts !== 'boolean') {
      return { success: false, error: 'Invalid anonymous posting setting' }
    }
    updates.allow_anonymous_posts = input.allow_anonymous_posts
  }

  if (Object.prototype.hasOwnProperty.call(input, 'circle_mode')) {
    if (!input.circle_mode || !['standard', 'residency'].includes(input.circle_mode)) {
      return { success: false, error: 'Invalid circle mode' }
    }
    updates.circle_mode = input.circle_mode
  }

  if (Object.prototype.hasOwnProperty.call(input, 'default_tab')) {
    if (
      !input.default_tab ||
      !['chat', 'meals', 'events', 'photos', 'notes', 'members'].includes(input.default_tab)
    ) {
      return { success: false, error: 'Invalid default tab' }
    }
    updates.default_tab = input.default_tab
  }

  if (Object.prototype.hasOwnProperty.call(input, 'silent_by_default')) {
    if (typeof input.silent_by_default !== 'boolean') {
      return { success: false, error: 'Invalid silent default setting' }
    }
    updates.silent_by_default = input.silent_by_default
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db
    .from('hub_groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', circleId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: 'Failed to update circle settings' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Update a member's role in a chef-owned circle.
 */
export async function updateCircleMemberRole(
  circleId: string,
  membershipId: string,
  role: CircleMemberRole
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const circle = await requireOwnedCircle(db, circleId, tenantId)
  if (!circle) return { success: false, error: 'Circle not found' }

  if (!['admin', 'member', 'viewer'].includes(role)) {
    return { success: false, error: 'Invalid member role' }
  }

  const { data: target } = await db
    .from('hub_group_members')
    .select('id, role')
    .eq('id', membershipId)
    .eq('group_id', circleId)
    .single()

  if (!target) return { success: false, error: 'Member not found' }
  if (target.role === 'owner' || target.role === 'chef') {
    return { success: false, error: `Cannot change ${target.role} role` }
  }

  const permissions =
    role === 'admin'
      ? { can_post: true, can_invite: true, can_pin: true }
      : role === 'viewer'
        ? { can_post: false, can_invite: false, can_pin: false }
        : { can_post: true, can_invite: false, can_pin: false }

  const { error } = await db
    .from('hub_group_members')
    .update({ role, ...permissions })
    .eq('id', membershipId)
    .eq('group_id', circleId)

  if (error) return { success: false, error: 'Failed to update member role' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Update granular member permissions in a chef-owned circle.
 */
export async function updateCircleMemberPermissions(
  circleId: string,
  membershipId: string,
  input: UpdateCircleMemberPermissionsInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const circle = await requireOwnedCircle(db, circleId, tenantId)
  if (!circle) return { success: false, error: 'Circle not found' }

  const { data: target } = await db
    .from('hub_group_members')
    .select('id, role')
    .eq('id', membershipId)
    .eq('group_id', circleId)
    .single()

  if (!target) return { success: false, error: 'Member not found' }
  if (target.role === 'owner' || target.role === 'chef') {
    return { success: false, error: `Cannot change ${target.role} permissions` }
  }

  const updates: Record<string, boolean> = {}
  for (const key of ['can_post', 'can_invite', 'can_pin'] as const) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key]
      if (typeof value !== 'boolean') {
        return { success: false, error: 'Invalid member permission' }
      }
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db
    .from('hub_group_members')
    .update(updates)
    .eq('id', membershipId)
    .eq('group_id', circleId)

  if (error) return { success: false, error: 'Failed to update member permissions' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Add an existing client to a circle.
 * Creates a hub_guest_profile for the client if one doesn't exist,
 * then adds them as a member.
 */
export async function addClientToCircle(
  circleId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const circle = await requireOwnedCircle(db, circleId, tenantId)

  if (!circle) return { success: false, error: 'Circle not found' }

  // Verify client belongs to this chef
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  // Find or create hub_guest_profile for this client
  let profileId: string

  const { data: existingProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingProfile) {
    profileId = existingProfile.id
  } else {
    const { data: newProfile, error: profileError } = await db
      .from('hub_guest_profiles')
      .insert({
        display_name: client.full_name || 'Guest',
        email: client.email,
        client_id: clientId,
      })
      .select('id')
      .single()

    if (profileError || !newProfile) {
      return { success: false, error: 'Failed to create profile' }
    }
    profileId = newProfile.id
  }

  // Check if already a member
  const { data: existingMember } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existingMember) {
    return { success: false, error: 'Client is already a member of this circle' }
  }

  // Add as member
  const { error: memberError } = await db.from('hub_group_members').insert({
    group_id: circleId,
    profile_id: profileId,
    role: 'member',
    can_post: true,
    can_invite: false,
    can_pin: false,
  })

  if (memberError) {
    return { success: false, error: 'Failed to add member' }
  }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Remove a member from a circle.
 */
export async function removeCircleMember(
  circleId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const circle = await requireOwnedCircle(db, circleId, tenantId)

  if (!circle) return { success: false, error: 'Circle not found' }

  const { data: target } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .single()

  if (!target) return { success: false, error: 'Member not found' }
  if (target.role === 'owner' || target.role === 'chef') {
    return { success: false, error: `Cannot remove ${target.role} member` }
  }

  const { error } = await db
    .from('hub_group_members')
    .delete()
    .eq('group_id', circleId)
    .eq('profile_id', profileId)

  if (error) return { success: false, error: 'Failed to remove member' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Get chef-owned events that are not currently linked to a circle.
 */
export async function getEventsNotInCircle(circleId: string): Promise<CircleEventPickerItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  if (!(await requireOwnedCircle(db, circleId, tenantId))) return []

  const { data: linked } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', circleId)

  const linkedEventIds = (linked ?? []).map((row: any) => row.event_id).filter(Boolean)

  let query = db
    .from('events')
    .select('id, title, event_date, status, guest_count')
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false, nullsFirst: false })

  if (linkedEventIds.length > 0) {
    query = query.not('id', 'in', `(${linkedEventIds.join(',')})`)
  }

  const { data: events } = await query

  return (events ?? []).map((event: any) => ({
    id: event.id,
    title: event.title ?? 'Untitled Event',
    event_date: event.event_date ?? null,
    status: event.status ?? 'draft',
    guest_count: event.guest_count ?? null,
  }))
}

/**
 * Link an existing event to a circle.
 */
export async function linkEventToCircle(
  circleId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const circle = await requireOwnedCircle(db, circleId, tenantId)

  if (!circle) return { success: false, error: 'Circle not found' }

  // Verify event belongs to this chef
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  // Check if already linked
  const { data: existing } = await db
    .from('hub_group_events')
    .select('id')
    .eq('group_id', circleId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return { success: false, error: 'Event is already linked to this circle' }

  const { error } = await db.from('hub_group_events').insert({
    group_id: circleId,
    event_id: eventId,
  })

  if (error) return { success: false, error: 'Failed to link event' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Unlink an event from a circle.
 */
export async function unlinkEventFromCircle(
  circleId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const circle = await requireOwnedCircle(db, circleId, tenantId)

  if (!circle) return { success: false, error: 'Circle not found' }

  const { error } = await db
    .from('hub_group_events')
    .delete()
    .eq('group_id', circleId)
    .eq('event_id', eventId)

  if (error) return { success: false, error: 'Failed to unlink event' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Restore an archived chef-owned circle.
 */
export async function restoreCircle(
  circleId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const circle = await requireOwnedCircle(db, circleId, tenantId)
  if (!circle) return { success: false, error: 'Circle not found' }

  const { error } = await db
    .from('hub_groups')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', circleId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: 'Failed to restore circle' }

  revalidateCirclePaths(circleId, circle.group_token)
  return { success: true }
}

/**
 * Get the chef's clients for the "add member" picker.
 * Returns clients NOT already in the specified circle.
 */
export async function getClientsNotInCircle(
  circleId: string
): Promise<Array<{ id: string; full_name: string; email: string | null }>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  if (!(await requireOwnedCircle(db, circleId, tenantId))) return []

  // Get all chef's clients
  const { data: allClients } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .order('full_name', { ascending: true })

  if (!allClients?.length) return []

  // Get client_ids already in circle (via hub_guest_profiles -> hub_group_members)
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circleId)

  const memberProfileIds = (members ?? []).map((m: any) => m.profile_id)

  let existingClientIds = new Set<string>()
  if (memberProfileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('client_id')
      .in('id', memberProfileIds)
      .not('client_id', 'is', null)

    for (const p of profiles ?? []) {
      if (p.client_id) existingClientIds.add(p.client_id)
    }
  }

  return allClients.filter((c: any) => !existingClientIds.has(c.id))
}

// â”€â”€â”€ SOURCING DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CircleSourcingItem {
  event_id: string
  event_title: string
  ingredient_id: string
  ingredient_name: string
  unit: string
  recipe_qty: string
  buy_qty: string
  purchased_qty: string
  used_qty: string
  computed_leftover_qty: string
  preferred_vendor: string | null
}

/**
 * Get ingredient lifecycle data across all events linked to a circle.
 * Uses the event_ingredient_lifecycle SQL view.
 */
export async function getCircleSourcingData(circleId: string): Promise<CircleSourcingItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  if (!(await requireOwnedCircle(db, circleId, tenantId))) return []

  // 1. Get linked event IDs for this circle
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', circleId)

  const eventIds = (eventLinks ?? []).map((e: any) => e.event_id)
  if (eventIds.length === 0) return []

  // 2. Get event titles (verify tenant ownership)
  const { data: events } = await db
    .from('events')
    .select('id, title')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  const titleMap: Record<string, string> = {}
  for (const e of events ?? []) {
    titleMap[e.id] = e.title
  }

  // Filter to only tenant-owned events
  const ownedEventIds = Object.keys(titleMap)
  if (ownedEventIds.length === 0) return []

  // 3. Get lifecycle data from the view
  const { data: lifecycle } = await db
    .from('event_ingredient_lifecycle')
    .select('*')
    .in('event_id', ownedEventIds)

  if (!lifecycle || lifecycle.length === 0) return []

  // 4. Get preferred vendors from ingredients table
  const ingredientIds = [...new Set((lifecycle as any[]).map((l: any) => l.ingredient_id))]
  let vendorMap: Record<string, string | null> = {}

  if (ingredientIds.length > 0) {
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, preferred_vendor')
      .in('id', ingredientIds)

    for (const ing of ingredients ?? []) {
      vendorMap[ing.id] = ing.preferred_vendor ?? null
    }
  }

  // 5. Combine into result
  return (lifecycle as any[]).map((l: any) => ({
    event_id: l.event_id,
    event_title: titleMap[l.event_id] ?? 'Unknown Event',
    ingredient_id: l.ingredient_id,
    ingredient_name: l.ingredient_name,
    unit: l.unit,
    recipe_qty: l.recipe_qty,
    buy_qty: l.buy_qty,
    purchased_qty: l.purchased_qty,
    used_qty: l.used_qty,
    computed_leftover_qty: l.computed_leftover_qty,
    preferred_vendor: vendorMap[l.ingredient_id] ?? null,
  }))
}

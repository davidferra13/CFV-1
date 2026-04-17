'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Chef Circle Actions
// Server actions for the chef's circle dashboard/inbox.
// ---------------------------------------------------------------------------

export interface ChefCircleSummary {
  id: string
  name: string
  emoji: string | null
  group_token: string
  group_type: string
  event_id: string | null
  inquiry_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  message_count: number
  member_count: number
  unread_count: number
  is_active: boolean
  created_at: string
  linked_event_count?: number
}

/**
 * Get Dinner Circles for the current chef, with unread counts.
 * When limit is set, caps results and uses a fast boolean has_unread check
 * instead of per-circle COUNT queries (avoids N+1 for dashboard preview).
 */
export async function getChefCircles(options?: { limit?: number }): Promise<ChefCircleSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get chef's hub profile
  const { data: chefProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  // Get tenant-scoped circles (business circles)
  let groupQuery = db
    .from('hub_groups')
    .select(
      'id, name, emoji, group_token, group_type, event_id, inquiry_id, last_message_at, last_message_preview, message_count, is_active, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (options?.limit) {
    groupQuery = groupQuery.limit(options.limit)
  }

  const { data: tenantGroups } = await groupQuery

  // Also get community circles the chef is a member of (tenant_id=null)
  let communityGroups: any[] = []
  if (chefProfile) {
    const { data: communityMemberships } = await db
      .from('hub_group_members')
      .select('group_id')
      .eq('profile_id', chefProfile.id)

    if (communityMemberships?.length) {
      const memberGroupIds = communityMemberships.map((m: any) => m.group_id)
      const { data: cGroups } = await db
        .from('hub_groups')
        .select(
          'id, name, emoji, group_token, group_type, event_id, inquiry_id, last_message_at, last_message_preview, message_count, is_active, created_at'
        )
        .in('id', memberGroupIds)
        .eq('is_active', true)
        .is('tenant_id', null)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (cGroups) communityGroups = cGroups
    }
  }

  // Merge and deduplicate, sort by last_message_at
  const allGroups = [...(tenantGroups ?? []), ...communityGroups]
  const seen = new Set<string>()
  const groups = allGroups
    .filter((g: any) => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })
    .sort((a: any, b: any) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return bTime - aTime
    })

  if (options?.limit) groups.splice(options.limit)

  if (groups.length === 0) return []

  // Get member counts + chef's last_read_at for each group
  const groupIds = groups.map((g: any) => g.id)

  const { data: memberCounts } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
  }

  // Get chef's last_read_at per group
  let readMap: Record<string, string | null> = {}
  if (chefProfile) {
    const { data: memberships } = await db
      .from('hub_group_members')
      .select('group_id, last_read_at')
      .eq('profile_id', chefProfile.id)
      .in('group_id', groupIds)

    for (const m of memberships ?? []) {
      readMap[m.group_id] = m.last_read_at
    }
  }

  const useFastUnread = !!options?.limit

  // Count unread messages per group
  const results: ChefCircleSummary[] = []
  for (const group of groups) {
    let unreadCount = 0
    const lastRead = readMap[group.id]

    if (useFastUnread) {
      // Fast path: boolean check only (no per-circle COUNT query)
      if (!lastRead && group.message_count > 0) {
        unreadCount = group.message_count
      } else if (lastRead && group.last_message_at) {
        if (new Date(group.last_message_at) > new Date(lastRead)) {
          unreadCount = 1 // Signal "has unread" without exact count
        }
      }
    } else {
      // Full path: exact unread count per circle
      if (lastRead && group.last_message_at) {
        if (new Date(group.last_message_at) > new Date(lastRead)) {
          const { count } = await db
            .from('hub_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .is('deleted_at', null)
            .gt('created_at', lastRead)

          unreadCount = count ?? 0
        }
      } else if (!lastRead && group.message_count > 0) {
        unreadCount = group.message_count
      }
    }

    results.push({
      ...group,
      member_count: countMap[group.id] ?? 0,
      unread_count: unreadCount,
    })
  }

  return results
}

/**
 * Get total unread message count across all circles for the current chef.
 * Lightweight query for nav badge polling.
 */
export async function getCirclesUnreadCount(): Promise<number> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get chef's hub profile
  const { data: chefProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (!chefProfile) return 0

  // Get tenant-scoped groups with activity
  const { data: tenantGroups } = await db
    .from('hub_groups')
    .select('id, last_message_at, message_count')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('last_message_at', 'is', null)

  // Also get community circles chef is a member of
  let communityGroups: any[] = []
  const { data: communityMemberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', chefProfile.id)

  if (communityMemberships?.length) {
    const memberGroupIds = communityMemberships.map((m: any) => m.group_id)
    const { data: cGroups } = await db
      .from('hub_groups')
      .select('id, last_message_at, message_count')
      .in('id', memberGroupIds)
      .eq('is_active', true)
      .is('tenant_id', null)
      .not('last_message_at', 'is', null)
    communityGroups = cGroups ?? []
  }

  // Merge and deduplicate
  const seen = new Set<string>()
  const groups: any[] = []
  for (const g of [...(tenantGroups ?? []), ...communityGroups]) {
    if (!seen.has(g.id)) {
      seen.add(g.id)
      groups.push(g)
    }
  }

  if (groups.length === 0) return 0

  const groupIds = groups.map((g: any) => g.id)

  // Get chef's last_read_at per group
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id, last_read_at')
    .eq('profile_id', chefProfile.id)
    .in('group_id', groupIds)

  const readMap: Record<string, string | null> = {}
  for (const m of memberships ?? []) {
    readMap[m.group_id] = m.last_read_at
  }

  let total = 0
  for (const group of groups) {
    const lastRead = readMap[group.id]
    if (!lastRead) {
      total += group.message_count
    } else if (group.last_message_at && new Date(group.last_message_at) > new Date(lastRead)) {
      const { count } = await db
        .from('hub_messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
        .is('deleted_at', null)
        .gt('created_at', lastRead)
      total += count ?? 0
    }
  }

  return total
}

/**
 * Create a circle manually for an event that doesn't have one.
 */
export async function createCircleForEvent(eventId: string): Promise<{ groupToken: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Check if circle already exists
  const { data: existing } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing) return { groupToken: existing.group_token }

  // Also check via inquiry
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id')
    .eq('converted_to_event_id', eventId)
    .maybeSingle()

  if (inquiry) {
    const { data: inquiryCircle } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('inquiry_id', inquiry.id)
      .maybeSingle()

    if (inquiryCircle) return { groupToken: inquiryCircle.group_token }
  }

  // Load event for naming
  const { data: event } = await db
    .from('events')
    .select('event_date, occasion, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found')

  // Load client name
  let clientName = 'Guest'
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    if (client) clientName = client.full_name.split(' ')[0]
  }

  // Get or create chef hub profile
  const { getOrCreateProfile } = await import('./profile-actions')
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Chef'
  const chefEmail = user.email || null

  const chefProfile = await getOrCreateProfile({
    email: chefEmail,
    displayName: chefName,
    authUserId: user.userId,
  })

  const groupName = event.occasion
    ? `${event.occasion} with ${clientName}`
    : `Dinner with ${clientName}`

  // Create the group
  const { createHubGroup } = await import('./group-actions')
  const group = await createHubGroup({
    name: groupName,
    event_id: eventId,
    tenant_id: tenantId,
    created_by_profile_id: chefProfile.id,
    emoji: '🍽️',
  })

  // Add chef as chef role (creator is already owner, update role)
  await db
    .from('hub_group_members')
    .update({ role: 'chef' })
    .eq('group_id', group.id)
    .eq('profile_id', chefProfile.id)

  // Add client if they have a hub profile
  if (event.client_id) {
    const { data: clientProfile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('client_id', event.client_id)
      .maybeSingle()

    if (clientProfile) {
      await db.from('hub_group_members').insert({
        group_id: group.id,
        profile_id: clientProfile.id,
        role: 'member',
        can_post: true,
        can_invite: true,
        can_pin: false,
      })
    }
  }

  return { groupToken: group.group_token }
}

/**
 * Archive (deactivate) a circle.
 */
export async function archiveCircle(groupId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  await db
    .from('hub_groups')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
}

/**
 * Restore an archived circle.
 */
export async function restoreCircle(groupId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  await db
    .from('hub_groups')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
}

// ---------------------------------------------------------------------------
// Multi-Event Circles (Dinner Clubs / Recurring Groups)
// ---------------------------------------------------------------------------

/**
 * Create a dinner club or multi-event circle.
 */
export async function createDinnerClub(input: {
  name: string
  description?: string
  emoji?: string
}): Promise<{ groupToken: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get or create chef hub profile
  const { getOrCreateProfile } = await import('./profile-actions')
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Chef'

  const chefProfile = await getOrCreateProfile({
    email: user.email || null,
    displayName: chefName,
    authUserId: user.userId,
  })

  const { createHubGroup } = await import('./group-actions')
  const group = await createHubGroup({
    name: input.name,
    description: input.description ?? null,
    tenant_id: tenantId,
    created_by_profile_id: chefProfile.id,
    emoji: input.emoji || null,
    group_type: 'dinner_club',
  })

  // Set chef role
  await db
    .from('hub_group_members')
    .update({ role: 'chef' })
    .eq('group_id', group.id)
    .eq('profile_id', chefProfile.id)

  return { groupToken: group.group_token }
}

/**
 * Link an event to a multi-event circle.
 */
export async function linkEventToCircle(input: {
  groupId: string
  eventId: string
}): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify group belongs to tenant
  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', input.groupId)
    .eq('tenant_id', tenantId)
    .single()

  if (!group) throw new Error('Circle not found')

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found')

  // Insert (ignore duplicate)
  const { error } = await db.from('hub_group_events').insert({
    group_id: input.groupId,
    event_id: input.eventId,
  })

  if (error && error.code !== '23505') {
    throw new Error(`Failed to link event: ${error.message}`)
  }
}

/**
 * Unlink an event from a multi-event circle.
 */
export async function unlinkEventFromCircle(input: {
  groupId: string
  eventId: string
}): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify group belongs to tenant
  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', input.groupId)
    .eq('tenant_id', tenantId)
    .single()

  if (!group) throw new Error('Circle not found')

  await db
    .from('hub_group_events')
    .delete()
    .eq('group_id', input.groupId)
    .eq('event_id', input.eventId)
}

/**
 * Get events linked to a multi-event circle.
 */
export async function getCircleEvents(groupId: string): Promise<
  {
    id: string
    event_id: string
    event_date: string | null
    occasion: string | null
    status: string
  }[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('hub_group_events')
    .select('id, event_id, events(event_date, occasion, status)')
    .eq('group_id', groupId)

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    event_id: row.event_id,
    event_date: row.events?.event_date ?? null,
    occasion: row.events?.occasion ?? null,
    status: row.events?.status ?? 'draft',
  }))
}

// ---------------------------------------------------------------------------
// System-level circle auto-creation (no auth required - called from transitions)
// ---------------------------------------------------------------------------

/**
 * Ensure a circle exists for an event. Called by the event FSM when an event
 * transitions to 'paid' so the coordination channel is always ready before the
 * chef receives the payment confirmation. Idempotent: no-op if circle exists.
 *
 * Uses admin DB client and looks up the chef's auth_user_id from user_roles
 * so it works in system/webhook contexts where there is no active session.
 */
export async function ensureCircleForEvent(
  eventId: string,
  tenantId: string
): Promise<{ groupToken: string } | null> {
  try {
    const db: any = createServerClient({ admin: true })

    // Idempotency check: circle already linked to event
    const { data: existing } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (existing) return { groupToken: existing.group_token }

    // Also check via inquiry (inquiry circle may predate the event)
    const { data: inquiry } = await db
      .from('inquiries')
      .select('id')
      .eq('converted_to_event_id', eventId)
      .maybeSingle()

    if (inquiry) {
      const { data: inquiryCircle } = await db
        .from('hub_groups')
        .select('group_token')
        .eq('inquiry_id', inquiry.id)
        .maybeSingle()

      if (inquiryCircle) return { groupToken: inquiryCircle.group_token }
    }

    // Check for bridge-created circles (from Introduction Bridge handoff flow)
    // If target chef created a circle via a bridge, adopt it for this event
    try {
      const { data: bridge } = await db
        .from('chef_intro_bridges')
        .select('target_circle_group_id')
        .eq('target_chef_id', tenantId)
        .not('target_circle_group_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (bridge?.target_circle_group_id) {
        // Check if bridge circle has no event_id yet (available for adoption)
        const { data: bridgeCircle } = await db
          .from('hub_groups')
          .select('id, group_token, event_id')
          .eq('id', bridge.target_circle_group_id)
          .is('event_id', null)
          .maybeSingle()

        if (bridgeCircle) {
          // Adopt: link the bridge circle to this event
          await db.from('hub_groups').update({ event_id: eventId }).eq('id', bridgeCircle.id)
          return { groupToken: bridgeCircle.group_token }
        }
      }
    } catch (err) {
      // Bridge adoption is non-blocking; fall through to create new circle
      console.error('[ensureCircleForEvent] bridge adoption failed (non-blocking)', err)
    }

    // Fetch event for naming
    const { data: event } = await db
      .from('events')
      .select('event_date, occasion, client_id')
      .eq('id', eventId)
      .single()

    if (!event) return null

    // Fetch chef name and auth user id
    const [{ data: chef }, { data: chefUserRole }] = await Promise.all([
      db.from('chefs').select('display_name, business_name, email').eq('id', tenantId).single(),
      db
        .from('user_roles')
        .select('auth_user_id, id')
        .eq('entity_id', tenantId)
        .eq('role', 'chef')
        .single(),
    ])

    if (!chefUserRole) return null

    const chefName = chef?.display_name || chef?.business_name || 'Chef'
    const chefEmail = chef?.email || null

    // Get or create chef hub profile
    const { getOrCreateProfile } = await import('./profile-actions')
    const chefProfile = await getOrCreateProfile({
      email: chefEmail,
      displayName: chefName,
      authUserId: chefUserRole.auth_user_id,
    })

    // Client first name for circle name
    let clientFirstName = 'Guest'
    if (event.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('full_name')
        .eq('id', event.client_id)
        .single()
      if (client) clientFirstName = client.full_name.split(' ')[0]
    }

    const groupName = event.occasion
      ? `${event.occasion} with ${clientFirstName}`
      : `Dinner with ${clientFirstName}`

    // Create the group
    const { createHubGroup } = await import('./group-actions')
    const group = await createHubGroup({
      name: groupName,
      event_id: eventId,
      tenant_id: tenantId,
      created_by_profile_id: chefProfile.id,
      emoji: '🍽️',
    })

    // Set chef role (creator is already owner - elevate to chef role)
    await db
      .from('hub_group_members')
      .update({ role: 'chef' })
      .eq('group_id', group.id)
      .eq('profile_id', chefProfile.id)

    // Auto-add client if they already have a hub profile
    if (event.client_id) {
      const { data: clientProfile } = await db
        .from('hub_guest_profiles')
        .select('id')
        .eq('client_id', event.client_id)
        .maybeSingle()

      if (clientProfile) {
        await db.from('hub_group_members').insert({
          group_id: group.id,
          profile_id: clientProfile.id,
          role: 'member',
          can_post: true,
          can_invite: true,
          can_pin: false,
        })
      }
    }

    return { groupToken: group.group_token }
  } catch {
    // Non-blocking - circle creation failure must never block payment confirmation
    return null
  }
}

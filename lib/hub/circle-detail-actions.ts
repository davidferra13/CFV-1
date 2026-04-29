'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Circle Detail Actions
// Server actions for the chef-side circle command center (/circles/[id]).
// ---------------------------------------------------------------------------

export interface CircleMemberDetail {
  profile_id: string
  display_name: string
  avatar_url: string | null
  email: string | null
  client_id: string | null
  client_name: string | null
  role: string
  joined_at: string
  last_read_at: string | null
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
  is_active: boolean
  message_count: number
  last_message_at: string | null
  created_at: string
  members: CircleMemberDetail[]
  events: CircleEventLink[]
  recent_messages: CircleMessage[]
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
    .select('profile_id, role, joined_at, last_read_at')
    .eq('group_id', circleId)
    .order('joined_at', { ascending: true })

  const profileIds = (memberships ?? []).map((m: any) => m.profile_id)

  let profileMap: Record<string, any> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, avatar_url, email, client_id')
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
      profile_id: m.profile_id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url ?? null,
      email: profile.email ?? null,
      client_id: profile.client_id ?? null,
      client_name: profile.client_id ? (clientNameMap[profile.client_id] ?? null) : null,
      role: m.role,
      joined_at: m.joined_at,
      last_read_at: m.last_read_at,
    }
  })

  // 3. Get linked events with status
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id, linked_at')
    .eq('group_id', circleId)
    .order('linked_at', { ascending: false })

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

  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    emoji: circle.emoji,
    group_type: circle.group_type ?? 'circle',
    group_token: circle.group_token,
    visibility: circle.visibility ?? 'public',
    is_active: circle.is_active,
    message_count: circle.message_count ?? 0,
    last_message_at: circle.last_message_at,
    created_at: circle.created_at,
    members,
    events,
    recent_messages,
  }
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
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

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

  revalidatePath(`/circles/${circleId}`)
  revalidatePath('/circles')
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
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return { success: false, error: 'Circle not found' }

  const { error } = await db
    .from('hub_group_members')
    .delete()
    .eq('group_id', circleId)
    .eq('profile_id', profileId)

  if (error) return { success: false, error: 'Failed to remove member' }

  revalidatePath(`/circles/${circleId}`)
  revalidatePath('/circles')
  return { success: true }
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
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

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

  revalidatePath(`/circles/${circleId}`)
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

  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return { success: false, error: 'Circle not found' }

  const { error } = await db
    .from('hub_group_events')
    .delete()
    .eq('group_id', circleId)
    .eq('event_id', eventId)

  if (error) return { success: false, error: 'Failed to unlink event' }

  revalidatePath(`/circles/${circleId}`)
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

type CircleSourcingItem = {
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

  const { data: circle, error: circleError } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (circleError) throw new Error(`Failed to load circle: ${circleError.message}`)
  if (!circle) return []

  // 1. Get linked event IDs for this circle
  const { data: eventLinks, error: eventLinksError } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', circleId)

  if (eventLinksError)
    throw new Error(`Failed to load circle event links: ${eventLinksError.message}`)

  const eventIds = (eventLinks ?? []).map((e: any) => e.event_id)
  if (eventIds.length === 0) return []

  // 2. Get event titles (verify tenant ownership)
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, title')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  if (eventsError) throw new Error(`Failed to load circle events: ${eventsError.message}`)

  const titleMap: Record<string, string> = {}
  for (const e of events ?? []) {
    titleMap[e.id] = e.title
  }

  // Filter to only tenant-owned events
  const ownedEventIds = Object.keys(titleMap)
  if (ownedEventIds.length === 0) return []

  // 3. Get lifecycle data from the view
  const { data: lifecycle, error: lifecycleError } = await db
    .from('event_ingredient_lifecycle')
    .select('*')
    .in('event_id', ownedEventIds)
    .eq('chef_id', tenantId)

  if (lifecycleError) {
    throw new Error(`Failed to load circle ingredient lifecycle: ${lifecycleError.message}`)
  }

  if (!lifecycle || lifecycle.length === 0) return []

  // 4. Get preferred vendors from ingredients table
  const ingredientIds = [...new Set((lifecycle as any[]).map((l: any) => l.ingredient_id))]
  const vendorMap: Record<string, string | null> = {}

  if (ingredientIds.length > 0) {
    const { data: ingredients, error: ingredientsError } = await db
      .from('ingredients')
      .select('id, preferred_vendor')
      .in('id', ingredientIds)
      .eq('tenant_id', tenantId)

    if (ingredientsError) {
      throw new Error(`Failed to load circle ingredient vendors: ${ingredientsError.message}`)
    }

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

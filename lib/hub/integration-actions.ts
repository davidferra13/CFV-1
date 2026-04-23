'use server'

import { createServerClient } from '@/lib/db/server'
import { resolvePublicShareDinnerCircleAccess } from '@/lib/hub/public-share-access'

// ---------------------------------------------------------------------------
// Hub Integration Actions
// Connects hub system to existing RSVP, events, and sharing flows.
// ---------------------------------------------------------------------------

/**
 * Auto-create or match a hub guest profile when someone RSVPs.
 * Called from submitRSVP flow (non-blocking).
 * SECURITY (Q4): Validates that the event actually exists and belongs to
 * the tenant before creating profiles or joining groups.
 */
export async function syncRSVPToHubProfile(input: {
  email: string | null
  displayName: string
  eventId: string
  tenantId: string
  rsvpStatus: string
  allergies?: string[]
  dietaryRestrictions?: string[]
}): Promise<void> {
  const db = createServerClient({ admin: true })

  try {
    // SECURITY (Q4): Verify event exists and belongs to this tenant
    const { data: event } = await db
      .from('events')
      .select('id')
      .eq('id', input.eventId)
      .eq('tenant_id', input.tenantId)
      .single()
    if (!event) return // Silently exit - event doesn't exist or wrong tenant

    let profileId: string | null = null

    // Try to find existing profile by email
    if (input.email) {
      const normalized = input.email.toLowerCase().trim()
      const { data: existing } = await db
        .from('hub_guest_profiles')
        .select('id')
        .eq('email_normalized', normalized)
        .single()

      if (existing) {
        profileId = existing.id

        // Update dietary info if provided
        const updates: Record<string, unknown> = {}
        if (input.allergies?.length) updates.known_allergies = input.allergies
        if (input.dietaryRestrictions?.length) updates.known_dietary = input.dietaryRestrictions
        if (Object.keys(updates).length > 0) {
          await db
            .from('hub_guest_profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', profileId)
        }
      }
    }

    // Create profile if not found
    if (!profileId) {
      const { data: newProfile } = await db
        .from('hub_guest_profiles')
        .insert({
          display_name: input.displayName,
          email: input.email,
          known_allergies: input.allergies ?? [],
          known_dietary: input.dietaryRestrictions ?? [],
        })
        .select('id')
        .single()

      profileId = newProfile?.id ?? null
    }

    if (!profileId) return

    // Upsert event history entry
    const { data: eventDetails } = await db
      .from('events')
      .select('occasion, event_date')
      .eq('id', input.eventId)
      .single()

    // Get chef name
    const { data: chef } = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', input.tenantId)
      .single()

    const chefName = chef?.business_name ?? chef?.display_name ?? 'Chef'

    await db.from('hub_guest_event_history').upsert(
      {
        profile_id: profileId,
        event_id: input.eventId,
        tenant_id: input.tenantId,
        rsvp_status: input.rsvpStatus,
        chef_name: chefName,
        event_date: eventDetails?.event_date ?? null,
        occasion: eventDetails?.occasion ?? null,
      },
      { onConflict: 'profile_id,event_id' }
    )

    // Auto-join hub group for this event (if one exists)
    const { data: eventGroup } = await db
      .from('hub_groups')
      .select('id, group_token')
      .eq('event_id', input.eventId)
      .eq('is_active', true)
      .single()

    if (eventGroup) {
      // Check if already a member
      const { data: existingMember } = await db
        .from('hub_group_members')
        .select('id')
        .eq('group_id', eventGroup.id)
        .eq('profile_id', profileId)
        .single()

      if (!existingMember) {
        await db.from('hub_group_members').insert({
          group_id: eventGroup.id,
          profile_id: profileId,
          role: 'member',
          can_post: true,
          can_invite: false,
          can_pin: false,
        })

        // System message
        const { data: profile } = await db
          .from('hub_guest_profiles')
          .select('display_name')
          .eq('id', profileId)
          .single()

        await db.from('hub_messages').insert({
          group_id: eventGroup.id,
          author_profile_id: profileId,
          message_type: 'system',
          system_event_type: 'rsvp_joined',
          system_metadata: {
            display_name: profile?.display_name ?? input.displayName,
            rsvp_status: input.rsvpStatus,
          },
        })
      }
    }
  } catch (err) {
    // Non-blocking - RSVP should never fail because of hub sync
    console.error('[non-blocking] Hub profile sync failed:', err)
  }
}

/**
 * Snapshot menu data into hub_guest_event_history when an event completes.
 * Called from event transitions (non-blocking).
 */
export async function snapshotEventToHub(input: {
  eventId: string
  tenantId: string
}): Promise<void> {
  const db = createServerClient({ admin: true })

  try {
    // Get menu items for snapshot via menus → dishes
    const { data: menus } = await db.from('menus').select('id').eq('event_id', input.eventId)

    const menuIds = (menus ?? []).map((m: any) => m.id)
    let coursesServed: { name: string | null; course: string; description: string | null }[] = []

    if (menuIds.length > 0) {
      const { data: dishes } = await db
        .from('dishes')
        .select('name, course_name, description')
        .in('menu_id', menuIds)
        .order('course_number', { ascending: true })

      coursesServed = (dishes ?? []).map((d: any) => ({
        name: d.name,
        course: d.course_name,
        description: d.description,
      }))
    }

    // Update all history entries for this event with courses snapshot
    if (coursesServed.length > 0) {
      await db
        .from('hub_guest_event_history')
        .update({ courses_served: coursesServed })
        .eq('event_id', input.eventId)
    }

    // Post system message to hub group
    const { data: eventGroup } = await db
      .from('hub_groups')
      .select('id')
      .eq('event_id', input.eventId)
      .single()

    if (eventGroup) {
      // Find any member to be author of system message
      const { data: anyMember } = await db
        .from('hub_group_members')
        .select('profile_id')
        .eq('group_id', eventGroup.id)
        .limit(1)
        .single()

      if (anyMember) {
        await db.from('hub_messages').insert({
          group_id: eventGroup.id,
          author_profile_id: anyMember.profile_id,
          message_type: 'system',
          system_event_type: 'event_completed',
          system_metadata: {
            courses_count: coursesServed.length,
          },
          body: `Dinner complete! ${coursesServed.length} course${coursesServed.length !== 1 ? 's' : ''} served.`,
        })
      }
    }
  } catch (err) {
    console.error('[non-blocking] Hub event snapshot failed:', err)
  }
}

/**
 * Ensure a Dinner Circle exists for an event.
 * This is the canonical event-level guest coordination container.
 */
export async function ensureEventDinnerCircle(input: {
  eventId: string
  tenantId: string
  eventTitle: string
}): Promise<{ groupToken: string }> {
  const db = createServerClient({ admin: true })

  // Check if a group already exists for this event
  const { data: existing } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', input.eventId)
    .eq('is_active', true)
    .single()

  if (existing) return { groupToken: existing.group_token }

  // Find or create a system profile for the chef
  const { data: chef } = await db
    .from('chefs')
    .select('id, business_name, display_name, auth_user_id')
    .eq('id', input.tenantId)
    .single()

  const chefName = chef?.business_name ?? chef?.display_name ?? 'Chef'

  // Check if chef already has a hub profile
  let chefProfileId: string | null = null
  if (chef?.auth_user_id) {
    const { data: chefProfile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', chef.auth_user_id)
      .single()

    chefProfileId = chefProfile?.id ?? null
  }

  if (!chefProfileId) {
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

  if (!chefProfileId) throw new Error('Failed to create chef profile for hub')

  // Create the group
  const { data: group, error } = await db
    .from('hub_groups')
    .insert({
      name: input.eventTitle || 'Dinner Group',
      event_id: input.eventId,
      tenant_id: input.tenantId,
      created_by_profile_id: chefProfileId,
      emoji: '🍽️',
    })
    .select('id, group_token')
    .single()

  if (error) throw new Error(`Failed to create hub group: ${error.message}`)

  // Add chef as owner
  await db.from('hub_group_members').insert({
    group_id: group.id,
    profile_id: chefProfileId,
    role: 'chef',
    can_post: true,
    can_invite: true,
    can_pin: true,
  })

  return { groupToken: group.group_token }
}

/**
 * Public Dinner Circle entrypoint for share-token holders.
 * The token is the boundary contract. Public callers never pass tenant ids.
 */
export async function getOrCreateEventHubGroup(input: {
  eventId: string
  shareToken: string
  eventTitle: string
}): Promise<{ groupToken: string }> {
  const db = createServerClient({ admin: true })

  const { data: share } = await db
    .from('event_shares')
    .select('event_id, tenant_id, is_active, expires_at')
    .eq('token', input.shareToken)
    .maybeSingle()

  return ensureEventDinnerCircle(
    resolvePublicShareDinnerCircleAccess({
      share: share as
        | {
            event_id: string
            tenant_id: string
            is_active: boolean
            expires_at: string | null
          }
        | null,
      eventId: input.eventId,
      eventTitle: input.eventTitle,
    })
  )
}

/**
 * Get hub group info for an event (used by share page and event detail).
 */
export async function getEventHubGroupToken(eventId: string): Promise<string | null> {
  const db = createServerClient({ admin: true })

  const { data } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .single()

  return data?.group_token ?? null
}

/**
 * Report guest-visible events that still lack a Dinner Circle.
 * Guest-visible currently means there is at least one active event share.
 */
export async function getGuestVisibleEventsMissingDinnerCircles(): Promise<{
  totalGuestVisibleEvents: number
  totalMissingDinnerCircles: number
  events: {
    eventId: string
    tenantId: string
    occasion: string | null
    status: string | null
    activeShareCount: number
  }[]
}> {
  const db = createServerClient({ admin: true })

  const { data: activeShares, error: sharesError } = await db
    .from('event_shares')
    .select('event_id, tenant_id')
    .eq('is_active', true)

  if (sharesError || !activeShares?.length) {
    return {
      totalGuestVisibleEvents: 0,
      totalMissingDinnerCircles: 0,
      events: [],
    }
  }

  const shareCountsByEvent = new Map<string, { tenantId: string; activeShareCount: number }>()
  for (const share of activeShares) {
    const existing = shareCountsByEvent.get(share.event_id)
    if (existing) {
      existing.activeShareCount += 1
    } else {
      shareCountsByEvent.set(share.event_id, {
        tenantId: share.tenant_id,
        activeShareCount: 1,
      })
    }
  }

  const eventIds = Array.from(shareCountsByEvent.keys())
  const { data: existingGroups } = await db
    .from('hub_groups')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('is_active', true)

  const eventIdsWithCircles = new Set(
    (existingGroups ?? []).map((group: { event_id: string }) => group.event_id)
  )
  const missingEventIds = eventIds.filter((eventId) => !eventIdsWithCircles.has(eventId))

  if (!missingEventIds.length) {
    return {
      totalGuestVisibleEvents: eventIds.length,
      totalMissingDinnerCircles: 0,
      events: [],
    }
  }

  const { data: missingEvents } = await db
    .from('events')
    .select('id, tenant_id, occasion, status')
    .in('id', missingEventIds)

  const events = (missingEvents ?? []).map(
    (event: { id: string; tenant_id: string; occasion: string | null; status: string | null }) => ({
      eventId: event.id,
      tenantId: event.tenant_id,
      occasion: event.occasion ?? null,
      status: event.status ?? null,
      activeShareCount: shareCountsByEvent.get(event.id)?.activeShareCount ?? 0,
    })
  )

  return {
    totalGuestVisibleEvents: eventIds.length,
    totalMissingDinnerCircles: events.length,
    events,
  }
}

/**
 * Get event stubs that are seeking a chef (for chef inbox).
 */
export async function getStubsSeekingChef(): Promise<
  {
    id: string
    title: string
    occasion: string | null
    event_date: string | null
    guest_count: number | null
    location_text: string | null
    notes: string | null
    created_at: string
    created_by_name: string
    group_member_count: number
  }[]
> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('event_stubs')
    .select('*, hub_guest_profiles!created_by_profile_id(display_name)')
    .eq('status', 'seeking_chef')
    .order('created_at', { ascending: false })

  if (error) return []

  // Get member counts for each stub's group
  const results = await Promise.all(
    (data ?? []).map(async (stub: any) => {
      let memberCount = 0
      if (stub.hub_group_id) {
        const { count } = await db
          .from('hub_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', stub.hub_group_id)

        memberCount = count ?? 0
      }

      return {
        id: stub.id,
        title: stub.title,
        occasion: stub.occasion,
        event_date: stub.event_date,
        guest_count: stub.guest_count,
        location_text: stub.location_text,
        notes: stub.notes,
        created_at: stub.created_at,
        created_by_name: stub.hub_guest_profiles?.display_name ?? 'Someone',
        group_member_count: memberCount,
      }
    })
  )

  return results
}

/**
 * Get hub stats for admin overview.
 */
export async function getHubStats(): Promise<{
  totalProfiles: number
  totalGroups: number
  activeGroups: number
  totalMessages: number
  totalMedia: number
  stubsSeekingChef: number
  recentActivity: {
    id: string
    group_name: string
    message_preview: string
    author_name: string
    created_at: string
  }[]
}> {
  const db = createServerClient({ admin: true })

  const [profiles, groups, activeGroups, messages, mediaCount, stubs, recentMessages] =
    await Promise.all([
      db.from('hub_guest_profiles').select('*', { count: 'exact', head: true }),
      db.from('hub_groups').select('*', { count: 'exact', head: true }),
      db.from('hub_groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('hub_messages').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      db.from('hub_media').select('*', { count: 'exact', head: true }),
      db
        .from('event_stubs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'seeking_chef'),
      db
        .from('hub_messages')
        .select(
          'id, body, created_at, hub_guest_profiles!author_profile_id(display_name), hub_groups!group_id(name)'
        )
        .is('deleted_at', null)
        .neq('message_type', 'system')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  const recentActivity = (recentMessages.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    group_name: (m.hub_groups as { name: string } | null)?.name ?? 'Unknown',
    message_preview: ((m.body as string) ?? '').slice(0, 100),
    author_name: (m.hub_guest_profiles as { display_name: string } | null)?.display_name ?? 'Guest',
    created_at: m.created_at as string,
  }))

  return {
    totalProfiles: profiles.count ?? 0,
    totalGroups: groups.count ?? 0,
    activeGroups: activeGroups.count ?? 0,
    totalMessages: messages.count ?? 0,
    totalMedia: mediaCount.count ?? 0,
    stubsSeekingChef: stubs.count ?? 0,
    recentActivity,
  }
}

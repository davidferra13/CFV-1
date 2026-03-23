'use server'

import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Hub Integration Actions
// Connects hub system to existing RSVP, events, and sharing flows.
// ---------------------------------------------------------------------------

/**
 * Auto-create or match a hub guest profile when someone RSVPs.
 * Called from submitRSVP flow (non-blocking).
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
  const supabase = createServerClient({ admin: true })

  try {
    let profileId: string | null = null

    // Try to find existing profile by email
    if (input.email) {
      const normalized = input.email.toLowerCase().trim()
      const { data: existing } = await supabase
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
          await supabase
            .from('hub_guest_profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', profileId)
        }
      }
    }

    // Create profile if not found
    if (!profileId) {
      const { data: newProfile } = await supabase
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
    const { data: event } = await supabase
      .from('events')
      .select('occasion, event_date')
      .eq('id', input.eventId)
      .single()

    // Get chef name
    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', input.tenantId)
      .single()

    const chefName = chef?.business_name ?? chef?.display_name ?? 'Chef'

    await supabase.from('hub_guest_event_history').upsert(
      {
        profile_id: profileId,
        event_id: input.eventId,
        tenant_id: input.tenantId,
        rsvp_status: input.rsvpStatus,
        chef_name: chefName,
        event_date: event?.event_date ?? null,
        occasion: event?.occasion ?? null,
      },
      { onConflict: 'profile_id,event_id' }
    )

    // Auto-join hub group for this event (if one exists)
    const { data: eventGroup } = await supabase
      .from('hub_groups')
      .select('id, group_token')
      .eq('event_id', input.eventId)
      .eq('is_active', true)
      .single()

    if (eventGroup) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('hub_group_members')
        .select('id')
        .eq('group_id', eventGroup.id)
        .eq('profile_id', profileId)
        .single()

      if (!existingMember) {
        await supabase.from('hub_group_members').insert({
          group_id: eventGroup.id,
          profile_id: profileId,
          role: 'member',
          can_post: true,
          can_invite: false,
          can_pin: false,
        })

        // System message
        const { data: profile } = await supabase
          .from('hub_guest_profiles')
          .select('display_name')
          .eq('id', profileId)
          .single()

        await supabase.from('hub_messages').insert({
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
  const supabase = createServerClient({ admin: true })

  try {
    // Get menu items for snapshot via menus → dishes
    const { data: menus } = await supabase.from('menus').select('id').eq('event_id', input.eventId)

    const menuIds = (menus ?? []).map((m: any) => m.id)
    let coursesServed: { name: string | null; course: string; description: string | null }[] = []

    if (menuIds.length > 0) {
      const { data: dishes } = await supabase
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
      await supabase
        .from('hub_guest_event_history')
        .update({ courses_served: coursesServed })
        .eq('event_id', input.eventId)
    }

    // Post system message to hub group
    const { data: eventGroup } = await supabase
      .from('hub_groups')
      .select('id')
      .eq('event_id', input.eventId)
      .single()

    if (eventGroup) {
      // Find any member to be author of system message
      const { data: anyMember } = await supabase
        .from('hub_group_members')
        .select('profile_id')
        .eq('group_id', eventGroup.id)
        .limit(1)
        .single()

      if (anyMember) {
        await supabase.from('hub_messages').insert({
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
 * Get or create a hub group for an event.
 * Used when a guest clicks "Join the Hub" on the share page.
 */
export async function getOrCreateEventHubGroup(input: {
  eventId: string
  tenantId: string
  eventTitle: string
}): Promise<{ groupToken: string }> {
  const supabase = createServerClient({ admin: true })

  // Check if a group already exists for this event
  const { data: existing } = await supabase
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', input.eventId)
    .eq('is_active', true)
    .single()

  if (existing) return { groupToken: existing.group_token }

  // Find or create a system profile for the chef
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, auth_user_id')
    .eq('id', input.tenantId)
    .single()

  const chefName = chef?.business_name ?? chef?.display_name ?? 'Chef'

  // Check if chef already has a hub profile
  let chefProfileId: string | null = null
  if (chef?.auth_user_id) {
    const { data: chefProfile } = await supabase
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', chef.auth_user_id)
      .single()

    chefProfileId = chefProfile?.id ?? null
  }

  if (!chefProfileId) {
    const { data: newProfile } = await supabase
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
  const { data: group, error } = await supabase
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
  await supabase.from('hub_group_members').insert({
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
 * Get hub group info for an event (used by share page and event detail).
 */
export async function getEventHubGroupToken(eventId: string): Promise<string | null> {
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .single()

  return data?.group_token ?? null
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
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
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
        const { count } = await supabase
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
  const supabase = createServerClient({ admin: true })

  const [profiles, groups, activeGroups, messages, mediaCount, stubs, recentMessages] =
    await Promise.all([
      supabase.from('hub_guest_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('hub_groups').select('*', { count: 'exact', head: true }),
      supabase.from('hub_groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('hub_messages')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),
      supabase.from('hub_media').select('*', { count: 'exact', head: true }),
      supabase
        .from('event_stubs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'seeking_chef'),
      supabase
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

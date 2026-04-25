'use server'

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Crew Circle Actions - Team coordination circles for event staff
// Uses existing hub_groups infrastructure with group_type = 'crew'
// ---------------------------------------------------------------------------

/**
 * Ensure a crew-type circle exists for an event. Idempotent.
 * Returns the group_token if created/found, null on failure.
 */
export async function ensureCrewCircle(
  eventId: string,
  tenantId: string
): Promise<{ groupToken: string } | null> {
  try {
    const db: any = createServerClient({ admin: true })

    // Idempotency check: crew circle already exists for this event
    const { data: existing } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('group_type', 'crew')
      .maybeSingle()

    if (existing) return { groupToken: existing.group_token }

    // Fetch event for naming
    const { data: event } = await db
      .from('events')
      .select('event_date, occasion')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) {
      console.error('[ensureCrewCircle] Event not found:', eventId)
      return null
    }

    // Fetch chef info and auth user id
    const [{ data: chef }, { data: chefUserRole }] = await Promise.all([
      db.from('chefs').select('display_name, business_name, email').eq('id', tenantId).single(),
      db
        .from('user_roles')
        .select('auth_user_id')
        .eq('entity_id', tenantId)
        .eq('role', 'chef')
        .single(),
    ])

    if (!chefUserRole) {
      console.error('[ensureCrewCircle] No chef user_role found for tenant:', tenantId)
      return null
    }

    const chefName = chef?.display_name || chef?.business_name || 'Chef'
    const chefEmail = chef?.email || null

    // Get or create chef hub profile
    const { getOrCreateProfile } = await import('./profile-actions')
    const chefProfile = await getOrCreateProfile({
      email: chefEmail,
      displayName: chefName,
      authUserId: chefUserRole.auth_user_id,
    })

    // Build circle name
    const datePart = event.event_date
      ? new Date(event.event_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : ''
    const groupName = `Crew: ${event.occasion || 'Event'}${datePart ? ` - ${datePart}` : ''}`

    // Insert directly into hub_groups (bypass createHubGroup, its Zod schema rejects 'crew')
    const { data: group, error } = await db
      .from('hub_groups')
      .insert({
        name: groupName,
        group_type: 'crew',
        visibility: 'private',
        event_id: eventId,
        tenant_id: tenantId,
        created_by_profile_id: chefProfile.id,
        emoji: null,
      })
      .select('id, group_token')
      .single()

    if (error || !group) {
      console.error('[ensureCrewCircle] Failed to create crew circle:', error)
      return null
    }

    // Add chef as member with role 'chef'
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfile.id,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })

    return { groupToken: group.group_token }
  } catch (err) {
    console.error('[ensureCrewCircle] Unexpected error (non-blocking)', err)
    return null
  }
}

/**
 * Add a staff member to the crew circle for an event. Idempotent.
 */
export async function addStaffToCrewCircle(
  eventId: string,
  staffMemberId: string,
  tenantId: string
): Promise<void> {
  try {
    // Ensure crew circle exists (idempotent)
    const result = await ensureCrewCircle(eventId, tenantId)
    if (!result) {
      console.error('[addStaffToCrewCircle] Could not ensure crew circle for event:', eventId)
      return
    }

    const db: any = createServerClient({ admin: true })

    // Find the crew circle
    const { data: circle } = await db
      .from('hub_groups')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('group_type', 'crew')
      .single()

    if (!circle) return

    // Get staff member info
    const { data: staff } = await db
      .from('staff_members')
      .select('name, email')
      .eq('id', staffMemberId)
      .eq('chef_id', tenantId)
      .single()

    if (!staff) {
      console.error('[addStaffToCrewCircle] Staff member not found:', staffMemberId)
      return
    }

    if (!staff.email) {
      console.error('[addStaffToCrewCircle] Staff member has no email:', staffMemberId)
      return
    }

    // Get or create hub profile for staff member
    const { getOrCreateProfile } = await import('./profile-actions')
    const profile = await getOrCreateProfile({
      displayName: staff.name,
      email: staff.email,
    })

    // Upsert into hub_group_members (idempotent on group_id + profile_id)
    await db.from('hub_group_members').upsert(
      {
        group_id: circle.id,
        profile_id: profile.id,
        role: 'member',
        can_post: true,
        can_invite: false,
        can_pin: false,
      },
      { onConflict: 'group_id,profile_id' }
    )
  } catch (err) {
    console.error('[addStaffToCrewCircle] Unexpected error (non-blocking)', err)
  }
}

/**
 * Remove a staff member from the crew circle for an event.
 */
export async function removeStaffFromCrewCircle(
  eventId: string,
  staffMemberId: string,
  tenantId: string
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })

    // Find crew circle
    const { data: circle } = await db
      .from('hub_groups')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('group_type', 'crew')
      .maybeSingle()

    if (!circle) return

    // Get staff member's email
    const { data: staff } = await db
      .from('staff_members')
      .select('email')
      .eq('id', staffMemberId)
      .eq('chef_id', tenantId)
      .single()

    if (!staff?.email) return

    // Find staff member's hub profile by email
    const normalized = staff.email.toLowerCase().trim()
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('email_normalized', normalized)
      .maybeSingle()

    if (!profile) return

    // Delete membership
    await db
      .from('hub_group_members')
      .delete()
      .eq('group_id', circle.id)
      .eq('profile_id', profile.id)
  } catch (err) {
    console.error('[removeStaffFromCrewCircle] Unexpected error (non-blocking)', err)
  }
}

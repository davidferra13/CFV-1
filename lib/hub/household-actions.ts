'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HouseholdMember {
  id: string
  profile_id: string
  display_name: string
  relationship: string
  age_group: string | null
  dietary_restrictions: string[]
  allergies: string[]
  dislikes: string[]
  favorites: string[]
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface HouseholdDietarySummary {
  members: HouseholdMember[]
  allAllergies: string[]
  allDietary: string[]
  // null  = guest never answered the allergy question (unknown risk)
  // []    = guest explicitly confirmed no allergies (safe)
  profilesNotAnswered: number
  profilesConfirmedNone: number
}

// ---------------------------------------------------------------------------
// Get household members for a profile
// ---------------------------------------------------------------------------

export async function getHouseholdMembers(profileToken: string): Promise<HouseholdMember[]> {
  const db: any = createServerClient({ admin: true })

  // Resolve profileId from token - token acts as the auth credential for this profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await db
    .from('hub_household_members')
    .select('*')
    .eq('profile_id', profile.id)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load household: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Get full dietary summary for a circle (all members + their households)
// ---------------------------------------------------------------------------

/**
 * Same as getCircleHouseholdSummary but looks up groupId from groupToken.
 * Used by the chef's event detail panel which only has the token.
 */
export async function getCircleDietarySummaryByToken(
  groupToken: string
): Promise<HouseholdDietarySummary | null> {
  const db: any = createServerClient({ admin: true })
  const { data: group, error: groupError } = await db
    .from('hub_groups')
    .select('id')
    .eq('group_token', groupToken)
    .maybeSingle()

  if (groupError) throw new Error(`Failed to verify circle access: ${groupError.message}`)
  if (!group) return null
  return getCircleHouseholdSummary(group.id, groupToken)
}

export async function getCircleHouseholdSummary(
  groupId: string,
  groupToken?: string
): Promise<HouseholdDietarySummary> {
  const db: any = createServerClient({ admin: true })

  if (groupToken) {
    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .select('id')
      .eq('id', groupId)
      .eq('group_token', groupToken)
      .maybeSingle()

    if (groupError) throw new Error(`Failed to verify circle access: ${groupError.message}`)
    if (!group) throw new Error('Access denied')
  }

  // Get all profile IDs in the group
  const { data: memberships, error: membershipsError } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', groupId)

  if (membershipsError) {
    throw new Error(`Failed to load circle members: ${membershipsError.message}`)
  }

  const profileIdSet = new Set<string>((memberships ?? []).map((m: any) => m.profile_id))

  // Also include hub profiles linked to event clients for this circle.
  // This catches chef-managed household records even when the client profile was
  // created after the circle membership list was assembled.
  const eventIds = new Set<string>()
  const { data: groupLink, error: groupLinkError } = await db
    .from('hub_groups')
    .select('event_id')
    .eq('id', groupId)
    .single()

  if (groupLinkError) {
    throw new Error(`Failed to load circle event link: ${groupLinkError.message}`)
  }

  if (groupLink?.event_id) eventIds.add(groupLink.event_id)

  const { data: linkedEvents, error: linkedEventsError } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', groupId)

  if (linkedEventsError) {
    throw new Error(`Failed to load linked circle events: ${linkedEventsError.message}`)
  }

  for (const linkedEvent of linkedEvents ?? []) {
    if (linkedEvent.event_id) eventIds.add(linkedEvent.event_id)
  }

  if (eventIds.size > 0) {
    const { data: events, error: eventsError } = await db
      .from('events')
      .select('client_id')
      .in('id', [...eventIds])

    if (eventsError) {
      throw new Error(`Failed to load linked clients: ${eventsError.message}`)
    }

    const clientIds = (events ?? [])
      .map((event: any) => event.client_id)
      .filter((clientId: string | null) => clientId != null)

    if (clientIds.length > 0) {
      const { data: clientProfiles, error: clientProfilesError } = await db
        .from('hub_guest_profiles')
        .select('id')
        .in('client_id', clientIds)

      if (clientProfilesError) {
        throw new Error(`Failed to load client household profiles: ${clientProfilesError.message}`)
      }

      for (const profile of clientProfiles ?? []) {
        profileIdSet.add(profile.id)
      }
    }
  }

  const profileIds = [...profileIdSet]
  if (profileIds.length === 0) {
    return {
      members: [],
      allAllergies: [],
      allDietary: [],
      profilesNotAnswered: 0,
      profilesConfirmedNone: 0,
    }
  }

  // Get all household members for those profiles
  const { data: householdMembers, error: householdError } = await db
    .from('hub_household_members')
    .select('*')
    .in('profile_id', profileIds)
    .order('sort_order', { ascending: true })

  if (householdError) {
    throw new Error(`Failed to load household members: ${householdError.message}`)
  }

  const members: HouseholdMember[] = householdMembers ?? []

  // Also get profile-level dietary data
  const { data: profiles, error: profilesError } = await db
    .from('hub_guest_profiles')
    .select('known_allergies, known_dietary')
    .in('id', profileIds)

  if (profilesError) {
    throw new Error(`Failed to load profile dietary data: ${profilesError.message}`)
  }

  // Aggregate all allergies and dietary restrictions
  const allergySet = new Set<string>()
  const dietarySet = new Set<string>()
  let profilesNotAnswered = 0
  let profilesConfirmedNone = 0

  for (const profile of profiles ?? []) {
    if (profile.known_allergies === null) {
      // null = never answered - unknown risk
      profilesNotAnswered++
    } else if ((profile.known_allergies as string[]).length === 0) {
      // empty array = explicitly confirmed no allergies
      profilesConfirmedNone++
    }
    for (const a of profile.known_allergies ?? []) allergySet.add(a)
    for (const d of profile.known_dietary ?? []) dietarySet.add(d)
  }

  for (const member of members) {
    for (const a of member.allergies) allergySet.add(a)
    for (const d of member.dietary_restrictions) dietarySet.add(d)
  }

  return {
    members,
    allAllergies: [...allergySet].sort(),
    allDietary: [...dietarySet].sort(),
    profilesNotAnswered,
    profilesConfirmedNone,
  }
}

// ---------------------------------------------------------------------------
// Add household member
// ---------------------------------------------------------------------------

const AddHouseholdSchema = z.object({
  profileToken: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  relationship: z.enum([
    'partner',
    'spouse',
    'child',
    'parent',
    'sibling',
    'assistant',
    'house_manager',
    'nanny',
    'other',
  ]),
  ageGroup: z.enum(['infant', 'toddler', 'child', 'teen', 'adult']).optional().nullable(),
  dietaryRestrictions: z.array(z.string().max(100)).max(50).optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
  dislikes: z.array(z.string().max(100)).max(100).optional(),
  favorites: z.array(z.string().max(100)).max(100).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function addHouseholdMember(
  input: z.infer<typeof AddHouseholdSchema>
): Promise<{ success: boolean; member?: HouseholdMember; error?: string }> {
  try {
    const validated = AddHouseholdSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('profile_token', validated.profileToken)
      .single()
    if (!profile) throw new Error('Invalid profile token')

    // Get next sort order
    const { data: existing } = await db
      .from('hub_household_members')
      .select('sort_order')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

    const { data, error } = await db
      .from('hub_household_members')
      .insert({
        profile_id: profile.id,
        display_name: validated.displayName,
        relationship: validated.relationship,
        age_group: validated.ageGroup ?? null,
        dietary_restrictions: validated.dietaryRestrictions ?? [],
        allergies: validated.allergies ?? [],
        dislikes: validated.dislikes ?? [],
        favorites: validated.favorites ?? [],
        notes: validated.notes ?? null,
        sort_order: nextOrder,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, member: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Update household member
// ---------------------------------------------------------------------------

const UpdateHouseholdSchema = z.object({
  memberId: z.string().uuid(),
  profileToken: z.string().uuid(),
  displayName: z.string().min(1).max(100).optional(),
  relationship: z
    .enum([
      'partner',
      'spouse',
      'child',
      'parent',
      'sibling',
      'assistant',
      'house_manager',
      'nanny',
      'other',
    ])
    .optional(),
  ageGroup: z.enum(['infant', 'toddler', 'child', 'teen', 'adult']).optional().nullable(),
  dietaryRestrictions: z.array(z.string().max(100)).max(50).optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
  dislikes: z.array(z.string().max(100)).max(100).optional(),
  favorites: z.array(z.string().max(100)).max(100).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function updateHouseholdMember(
  input: z.infer<typeof UpdateHouseholdSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = UpdateHouseholdSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('profile_token', validated.profileToken)
      .single()
    if (!profile) throw new Error('Invalid profile token')

    // Verify ownership
    const { data: member } = await db
      .from('hub_household_members')
      .select('profile_id, display_name')
      .eq('id', validated.memberId)
      .single()
    if (!member) throw new Error('Household member not found')
    if (member.profile_id !== profile.id) throw new Error('Not your household member')

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (validated.displayName !== undefined) updates.display_name = validated.displayName
    if (validated.relationship !== undefined) updates.relationship = validated.relationship
    if (validated.ageGroup !== undefined) updates.age_group = validated.ageGroup
    if (validated.dietaryRestrictions !== undefined)
      updates.dietary_restrictions = validated.dietaryRestrictions
    if (validated.allergies !== undefined) updates.allergies = validated.allergies
    if (validated.dislikes !== undefined) updates.dislikes = validated.dislikes
    if (validated.favorites !== undefined) updates.favorites = validated.favorites
    if (validated.notes !== undefined) updates.notes = validated.notes

    const { error } = await db
      .from('hub_household_members')
      .update(updates)
      .eq('id', validated.memberId)

    if (error) throw new Error(error.message)

    if (validated.dietaryRestrictions !== undefined || validated.allergies !== undefined) {
      // Alert chef about dietary change (non-blocking)
      try {
        const profileId = profile.id
        const displayName = validated.displayName ?? member.display_name ?? 'Someone'
        const { data: memberships } = await db
          .from('hub_group_members')
          .select('group_id')
          .eq('profile_id', profileId)

        if (memberships?.length) {
          const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
          for (const m of memberships) {
            const { data: group } = await db
              .from('hub_groups')
              .select('event_id')
              .eq('id', m.group_id)
              .eq('is_active', true)
              .maybeSingle()

            if (group?.event_id) {
              await circleFirstNotify({
                eventId: group.event_id,
                inquiryId: null,
                notificationType: 'dietary_updated',
                body: `${displayName} updated their dietary information.`,
                metadata: { profile_id: profileId },
              })
              break
            }
          }
        }
      } catch (err) {
        console.error('[updateDietary] Circle dietary notification failed (non-blocking):', err)
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Remove household member
// ---------------------------------------------------------------------------

const RemoveHouseholdSchema = z.object({
  memberId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

export async function removeHouseholdMember(
  input: z.infer<typeof RemoveHouseholdSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = RemoveHouseholdSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('profile_token', validated.profileToken)
      .single()
    if (!profile) throw new Error('Invalid profile token')

    // Verify ownership
    const { data: member } = await db
      .from('hub_household_members')
      .select('profile_id')
      .eq('id', validated.memberId)
      .single()
    if (!member) throw new Error('Household member not found')
    if (member.profile_id !== profile.id) throw new Error('Not your household member')

    const { error } = await db.from('hub_household_members').delete().eq('id', validated.memberId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Get household members for a client (chef-side, via client_id -> profile)
// ---------------------------------------------------------------------------

export interface ClientHouseholdSummary {
  members: HouseholdMember[]
  allAllergies: string[]
  allDietary: string[]
  adultCount: number
  childCount: number
  hasHubProfile: boolean
}

const ClientHouseholdMemberSchema = z.object({
  clientId: z.string().uuid(),
  displayName: z.string().min(1, 'Name is required').max(100),
  relationship: z.enum([
    'partner',
    'spouse',
    'child',
    'parent',
    'sibling',
    'assistant',
    'house_manager',
    'nanny',
    'other',
  ]),
  ageGroup: z.enum(['infant', 'toddler', 'child', 'teen', 'adult']).nullable().optional(),
  dietaryRestrictions: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  allergies: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  dislikes: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  favorites: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

const UpdateClientHouseholdMemberSchema = ClientHouseholdMemberSchema.extend({
  memberId: z.string().uuid(),
})
  .omit({ clientId: true })
  .extend({
    clientId: z.string().uuid(),
  })

const RemoveClientHouseholdMemberSchema = z.object({
  clientId: z.string().uuid(),
  memberId: z.string().uuid(),
})

function summarizeClientHousehold(
  members: HouseholdMember[],
  hasHubProfile: boolean
): ClientHouseholdSummary {
  const allergySet = new Set<string>()
  const dietarySet = new Set<string>()
  let adultCount = 0
  let childCount = 0

  for (const member of members) {
    for (const allergy of member.allergies ?? []) allergySet.add(allergy)
    for (const dietary of member.dietary_restrictions ?? []) dietarySet.add(dietary)
    if (['infant', 'toddler', 'child', 'teen'].includes(member.age_group ?? '')) {
      childCount++
    } else {
      adultCount++
    }
  }

  return {
    members,
    allAllergies: [...allergySet].sort(),
    allDietary: [...dietarySet].sort(),
    adultCount,
    childCount,
    hasHubProfile,
  }
}

async function getClientProfileIdsForChef(
  db: any,
  clientId: string,
  options?: { createIfMissing?: boolean }
): Promise<string[]> {
  const user = await requireChef()

  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id, full_name, email, allergies, dietary_restrictions')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .maybeSingle()

  if (clientError) throw new Error(`Failed to load client: ${clientError.message}`)
  if (!client) throw new Error('Client not found')

  const { data: profilesByClient, error: profilesByClientError } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('client_id', clientId)

  if (profilesByClientError) {
    throw new Error(`Failed to load client household profile: ${profilesByClientError.message}`)
  }

  if (profilesByClient?.length) return profilesByClient.map((profile: any) => profile.id)

  if (client.email) {
    const { data: profileByEmail, error: profileByEmailError } = await db
      .from('hub_guest_profiles')
      .select('id, client_id')
      .eq('email_normalized', String(client.email).toLowerCase().trim())
      .maybeSingle()

    if (profileByEmailError) {
      throw new Error(`Failed to load email household profile: ${profileByEmailError.message}`)
    }

    if (profileByEmail?.id) {
      if (!profileByEmail.client_id) {
        await db
          .from('hub_guest_profiles')
          .update({ client_id: clientId, updated_at: new Date().toISOString() })
          .eq('id', profileByEmail.id)
      }
      return [profileByEmail.id]
    }
  }

  if (!options?.createIfMissing) return []

  const { data: created, error } = await db
    .from('hub_guest_profiles')
    .insert({
      display_name: client.full_name || client.email || 'Client',
      email: client.email ?? null,
      client_id: clientId,
      known_allergies: Array.isArray(client.allergies) ? client.allergies : [],
      known_dietary: Array.isArray(client.dietary_restrictions) ? client.dietary_restrictions : [],
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create household profile')
  }

  return [created.id]
}

export async function getHouseholdForClient(clientId: string): Promise<ClientHouseholdSummary> {
  const db: any = createServerClient({ admin: true })

  const profileIds = await getClientProfileIdsForChef(db, clientId)
  if (profileIds.length === 0) return summarizeClientHousehold([], false)

  const { data: members, error: membersError } = await db
    .from('hub_household_members')
    .select('*')
    .in('profile_id', profileIds)
    .order('sort_order', { ascending: true })

  if (membersError) throw new Error(`Failed to load household members: ${membersError.message}`)

  return summarizeClientHousehold((members ?? []) as HouseholdMember[], true)
}

export async function addClientHouseholdMember(
  input: z.infer<typeof ClientHouseholdMemberSchema>
): Promise<{ success: boolean; member?: HouseholdMember; error?: string }> {
  try {
    const validated = ClientHouseholdMemberSchema.parse(input)
    const db: any = createServerClient({ admin: true })
    const profileIds = await getClientProfileIdsForChef(db, validated.clientId, {
      createIfMissing: true,
    })
    const profileId = profileIds[0]
    if (!profileId) throw new Error('Could not resolve client household profile')

    const { data: existing } = await db
      .from('hub_household_members')
      .select('sort_order')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

    const { data, error } = await db
      .from('hub_household_members')
      .insert({
        profile_id: profileId,
        display_name: validated.displayName,
        relationship: validated.relationship,
        age_group: validated.ageGroup ?? null,
        dietary_restrictions: validated.dietaryRestrictions ?? [],
        allergies: validated.allergies ?? [],
        dislikes: validated.dislikes ?? [],
        favorites: validated.favorites ?? [],
        notes: validated.notes || null,
        sort_order: nextOrder,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    if (validated.dietaryRestrictions !== undefined || validated.allergies !== undefined) {
      // Alert chef about dietary change (non-blocking)
      try {
        const profileId = (data as any).profile_id ?? profileIds[0]
        const displayName = (data as any).display_name ?? validated.displayName ?? 'Someone'
        const { data: memberships } = await db
          .from('hub_group_members')
          .select('group_id')
          .eq('profile_id', profileId)

        if (memberships?.length) {
          const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
          for (const m of memberships) {
            const { data: group } = await db
              .from('hub_groups')
              .select('event_id')
              .eq('id', m.group_id)
              .eq('is_active', true)
              .maybeSingle()

            if (group?.event_id) {
              await circleFirstNotify({
                eventId: group.event_id,
                inquiryId: null,
                notificationType: 'dietary_updated',
                body: `${displayName} updated their dietary information.`,
                metadata: { profile_id: profileId },
              })
              break
            }
          }
        }
      } catch (err) {
        console.error('[updateDietary] Circle dietary notification failed (non-blocking):', err)
      }
    }

    revalidatePath(`/clients/${validated.clientId}`)
    return { success: true, member: data as HouseholdMember }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add household member',
    }
  }
}

export async function updateClientHouseholdMember(
  input: z.infer<typeof UpdateClientHouseholdMemberSchema>
): Promise<{ success: boolean; member?: HouseholdMember; error?: string }> {
  try {
    const validated = UpdateClientHouseholdMemberSchema.parse(input)
    const db: any = createServerClient({ admin: true })
    const profileIds = await getClientProfileIdsForChef(db, validated.clientId)
    if (profileIds.length === 0) throw new Error('Household member not found')

    const { data: existing } = await db
      .from('hub_household_members')
      .select('id')
      .eq('id', validated.memberId)
      .in('profile_id', profileIds)
      .maybeSingle()

    if (!existing) throw new Error('Household member not found')

    const { data, error } = await db
      .from('hub_household_members')
      .update({
        display_name: validated.displayName,
        relationship: validated.relationship,
        age_group: validated.ageGroup ?? null,
        dietary_restrictions: validated.dietaryRestrictions ?? [],
        allergies: validated.allergies ?? [],
        dislikes: validated.dislikes ?? [],
        favorites: validated.favorites ?? [],
        notes: validated.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.memberId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    if (validated.dietaryRestrictions !== undefined || validated.allergies !== undefined) {
      // Alert chef about dietary change (non-blocking)
      try {
        const profileId = (data as any).profile_id ?? profileIds[0]
        const displayName = (data as any).display_name ?? validated.displayName ?? 'Someone'
        const { data: memberships } = await db
          .from('hub_group_members')
          .select('group_id')
          .eq('profile_id', profileId)

        if (memberships?.length) {
          const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
          for (const m of memberships) {
            const { data: group } = await db
              .from('hub_groups')
              .select('event_id')
              .eq('id', m.group_id)
              .eq('is_active', true)
              .maybeSingle()

            if (group?.event_id) {
              await circleFirstNotify({
                eventId: group.event_id,
                inquiryId: null,
                notificationType: 'dietary_updated',
                body: `${displayName} updated their dietary information.`,
                metadata: { profile_id: profileId },
              })
              break
            }
          }
        }
      } catch (err) {
        console.error('[updateDietary] Circle dietary notification failed (non-blocking):', err)
      }
    }

    revalidatePath(`/clients/${validated.clientId}`)
    return { success: true, member: data as HouseholdMember }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update household member',
    }
  }
}

export async function removeClientHouseholdMember(
  input: z.infer<typeof RemoveClientHouseholdMemberSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = RemoveClientHouseholdMemberSchema.parse(input)
    const db: any = createServerClient({ admin: true })
    const profileIds = await getClientProfileIdsForChef(db, validated.clientId)
    if (profileIds.length === 0) throw new Error('Household member not found')

    const { data: existing } = await db
      .from('hub_household_members')
      .select('id')
      .eq('id', validated.memberId)
      .in('profile_id', profileIds)
      .maybeSingle()

    if (!existing) throw new Error('Household member not found')

    const { error } = await db
      .from('hub_household_members')
      .delete()
      .eq('id', validated.memberId)
      .in('profile_id', profileIds)

    if (error) throw new Error(error.message)
    revalidatePath(`/clients/${validated.clientId}`)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove household member',
    }
  }
}

// ---------------------------------------------------------------------------
// Meal Attendance
// ---------------------------------------------------------------------------

export interface MealAttendance {
  id: string
  meal_entry_id: string
  household_member_id: string
  status: 'in' | 'out' | 'maybe'
  created_at: string
}

/**
 * Get all household members for a circle (across all profiles in the group).
 */
export async function getCircleHouseholdMembers(groupId: string): Promise<HouseholdMember[]> {
  const db: any = createServerClient({ admin: true })

  const { data: memberships } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', groupId)

  const profileIds = (memberships ?? []).map((m: any) => m.profile_id)
  if (profileIds.length === 0) return []

  const { data, error } = await db
    .from('hub_household_members')
    .select('*')
    .in('profile_id', profileIds)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load household members: ${error.message}`)
  return data ?? []
}

/**
 * Get attendance records for a meal entry.
 */
export async function getMealAttendance(mealEntryId: string): Promise<MealAttendance[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_meal_attendance')
    .select('*')
    .eq('meal_entry_id', mealEntryId)

  if (error) throw new Error(`Failed to load attendance: ${error.message}`)
  return data ?? []
}

/**
 * Set attendance for a household member on a meal (upsert).
 */
export async function setMealAttendance(input: {
  mealEntryId: string
  householdMemberId: string
  status: 'in' | 'out' | 'maybe'
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })

    const { error } = await db.from('hub_meal_attendance').upsert(
      {
        meal_entry_id: input.mealEntryId,
        household_member_id: input.householdMemberId,
        status: input.status,
      },
      { onConflict: 'meal_entry_id,household_member_id' }
    )

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Bulk set attendance for all household members on a meal.
 * Accepts a map of householdMemberId -> status.
 */
export async function bulkSetMealAttendance(input: {
  mealEntryId: string
  attendance: Record<string, 'in' | 'out' | 'maybe'>
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })

    const rows = Object.entries(input.attendance).map(([householdMemberId, status]) => ({
      meal_entry_id: input.mealEntryId,
      household_member_id: householdMemberId,
      status,
    }))

    if (rows.length === 0) return { success: true }

    const { error } = await db
      .from('hub_meal_attendance')
      .upsert(rows, { onConflict: 'meal_entry_id,household_member_id' })

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

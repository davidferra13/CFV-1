'use server'

import { createServerClient } from '@/lib/db/server'
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

  // Resolve profileId from token — token acts as the auth credential for this profile
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

export async function getCircleHouseholdSummary(groupId: string): Promise<HouseholdDietarySummary> {
  const db: any = createServerClient({ admin: true })

  // Get all profile IDs in the group
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', groupId)

  const profileIds = (memberships ?? []).map((m: any) => m.profile_id)
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
  const { data: householdMembers } = await db
    .from('hub_household_members')
    .select('*')
    .in('profile_id', profileIds)
    .order('sort_order', { ascending: true })

  const members: HouseholdMember[] = householdMembers ?? []

  // Also get profile-level dietary data
  const { data: profiles } = await db
    .from('hub_guest_profiles')
    .select('known_allergies, known_dietary')
    .in('id', profileIds)

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
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  favorites: z.array(z.string()).optional(),
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
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  favorites: z.array(z.string()).optional(),
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
      .select('profile_id')
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

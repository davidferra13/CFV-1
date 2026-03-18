'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { HubGuestProfile, HubGuestEventHistory } from './types'

// ---------------------------------------------------------------------------
// Guest Profile - Public (no auth, link-based access)
// ---------------------------------------------------------------------------

const CreateProfileSchema = z.object({
  display_name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  auth_user_id: z.string().uuid().optional().nullable(),
})

/**
 * Get or create a guest profile. Deduplicates by email when provided.
 * Public - no auth required.
 */
export async function getOrCreateProfile(input: {
  display_name?: string
  displayName?: string
  email?: string | null
  auth_user_id?: string | null
  authUserId?: string | null
}): Promise<HubGuestProfile> {
  const validated = CreateProfileSchema.parse({
    display_name: input.display_name ?? input.displayName,
    email: input.email ?? null,
    auth_user_id: input.auth_user_id ?? input.authUserId ?? null,
  })
  const supabase = createServerClient({ admin: true })

  // If email provided, try to find existing profile
  if (validated.email) {
    const normalized = validated.email.toLowerCase().trim()
    const { data: existing } = await supabase
      .from('hub_guest_profiles')
      .select('*')
      .eq('email_normalized', normalized)
      .single()

    if (existing) {
      if (validated.auth_user_id && !existing.auth_user_id) {
        const { data: linked } = await supabase
          .from('hub_guest_profiles')
          .update({
            auth_user_id: validated.auth_user_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*')
          .single()

        return (linked ?? existing) as HubGuestProfile
      }

      return existing as HubGuestProfile
    }
  }

  // Create new profile
  const { data, error } = await supabase
    .from('hub_guest_profiles')
    .insert({
      display_name: validated.display_name,
      email: validated.email ?? null,
      auth_user_id: validated.auth_user_id ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  return data as HubGuestProfile
}

/**
 * Get a profile by its persistent token.
 * Public - no auth required.
 */
export async function getProfileByToken(profileToken: string): Promise<HubGuestProfile | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_guest_profiles')
    .select('*')
    .eq('profile_token', profileToken)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load profile: ${error.message}`)
  }
  return (data as HubGuestProfile) ?? null
}

/**
 * Get a profile by ID.
 */
export async function getProfileById(profileId: string): Promise<HubGuestProfile | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_guest_profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load profile: ${error.message}`)
  }
  return (data as HubGuestProfile) ?? null
}

const UpdateProfileSchema = z.object({
  profileToken: z.string().uuid(),
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  known_allergies: z.array(z.string()).optional(),
  known_dietary: z.array(z.string()).optional(),
})

/**
 * Update profile details. Validated by profile token.
 */
export async function updateProfile(
  input: z.infer<typeof UpdateProfileSchema>
): Promise<HubGuestProfile> {
  const validated = UpdateProfileSchema.parse(input)
  const { profileToken, ...updates } = validated
  const supabase = createServerClient({ admin: true })

  // Verify token
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await supabase
    .from('hub_guest_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update profile: ${error.message}`)
  return data as HubGuestProfile
}

/**
 * Get a guest's full event history (all dinners they've attended).
 */
export async function getProfileEventHistory(
  profileToken: string
): Promise<HubGuestEventHistory[]> {
  const supabase = createServerClient({ admin: true })

  // Get profile by token
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await supabase
    .from('hub_guest_event_history')
    .select('*')
    .eq('profile_id', profile.id)
    .order('event_date', { ascending: false, nullsFirst: false })

  if (error) throw new Error(`Failed to load event history: ${error.message}`)
  return (data ?? []) as HubGuestEventHistory[]
}

/**
 * Upgrade a guest profile to a full client account.
 * Links the hub_guest_profile to the new auth user and client record,
 * preserving all dietary info and group memberships.
 */
export async function upgradeGuestToClient(input: {
  profileToken: string
  authUserId: string
  clientId: string
}): Promise<HubGuestProfile> {
  const supabase = createServerClient({ admin: true })

  // Verify profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('*')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')
  if (profile.auth_user_id) throw new Error('Profile already linked to an account')

  const now = new Date().toISOString()
  const knownDietary = profile.known_dietary ?? []
  const knownAllergies = profile.known_allergies ?? []
  const firstGroupId =
    'first_group_id' in profile ? (profile.first_group_id as string | null) : null
  const referredByProfileId =
    'referred_by_profile_id' in profile ? (profile.referred_by_profile_id as string | null) : null

  // Link profile to account
  const { data: updated, error } = await supabase
    .from('hub_guest_profiles')
    .update({
      auth_user_id: input.authUserId,
      client_id: input.clientId,
      upgraded_to_client_at: now,
      updated_at: now,
    })
    .eq('id', profile.id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upgrade profile: ${error.message}`)

  // Copy dietary info to client if client has none
  if (knownDietary.length > 0 || knownAllergies.length > 0) {
    const { data: client } = await supabase
      .from('clients')
      .select('dietary_restrictions, allergies')
      .eq('id', input.clientId)
      .single()

    if (client) {
      const updates: Record<string, unknown> = {}
      if (
        (!client.dietary_restrictions || client.dietary_restrictions.length === 0) &&
        knownDietary.length > 0
      ) {
        updates.dietary_restrictions = knownDietary
      }
      if ((!client.allergies || client.allergies.length === 0) && knownAllergies.length > 0) {
        updates.allergies = knownAllergies
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('clients').update(updates).eq('id', input.clientId)
      }
    }
  }

  // Record referral source on the client
  if (firstGroupId || referredByProfileId) {
    const referralUpdates: Record<string, unknown> = {}
    if (firstGroupId) {
      referralUpdates.referred_from_group_id = firstGroupId
    }
    if (referredByProfileId) {
      // Find the referring profile's client_id
      const { data: referrer } = await supabase
        .from('hub_guest_profiles')
        .select('client_id')
        .eq('id', referredByProfileId)
        .single()
      if (referrer?.client_id) {
        referralUpdates.referred_by_client_id = referrer.client_id
      }
    }
    if (Object.keys(referralUpdates).length > 0) {
      await supabase.from('clients').update(referralUpdates).eq('id', input.clientId)
    }
  }

  return updated as HubGuestProfile
}

/**
 * Get all groups a guest belongs to.
 */
export async function getProfileGroups(
  profileToken: string
): Promise<{ group_id: string; role: string; joined_at: string }[]> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await supabase
    .from('hub_group_members')
    .select('group_id, role, joined_at')
    .eq('profile_id', profile.id)

  if (error) throw new Error(`Failed to load groups: ${error.message}`)
  return data ?? []
}

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { HubGuestProfile, HubGuestEventHistory } from './types'

// ---------------------------------------------------------------------------
// Guest Profile — Public (no auth, link-based access)
// ---------------------------------------------------------------------------

const CreateProfileSchema = z.object({
  display_name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
})

/**
 * Get or create a guest profile. Deduplicates by email when provided.
 * Public — no auth required.
 */
export async function getOrCreateProfile(input: {
  display_name: string
  email?: string | null
}): Promise<HubGuestProfile> {
  const validated = CreateProfileSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // If email provided, try to find existing profile
  if (validated.email) {
    const normalized = validated.email.toLowerCase().trim()
    const { data: existing } = await supabase
      .from('hub_guest_profiles')
      .select('*')
      .eq('email_normalized', normalized)
      .single()

    if (existing) return existing as HubGuestProfile
  }

  // Create new profile
  const { data, error } = await supabase
    .from('hub_guest_profiles')
    .insert({
      display_name: validated.display_name,
      email: validated.email ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  return data as HubGuestProfile
}

/**
 * Get a profile by its persistent token.
 * Public — no auth required.
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

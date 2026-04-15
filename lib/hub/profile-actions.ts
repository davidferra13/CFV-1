'use server'

import { createServerClient } from '@/lib/db/server'
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
  const db = createServerClient({ admin: true })

  // If email provided, try to find existing profile
  if (validated.email) {
    const normalized = validated.email.toLowerCase().trim()
    const { data: existing } = await db
      .from('hub_guest_profiles')
      .select('*')
      .eq('email_normalized', normalized)
      .single()

    if (existing) {
      if (validated.auth_user_id && !existing.auth_user_id) {
        const { data: linked } = await db
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
  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  // Verify token
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  // Get profile by token
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await db
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
  const db = createServerClient({ admin: true })

  // Verify profile
  const { data: profile } = await db
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
  const { data: updated, error } = await db
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
    const { data: client } = await db
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
        await db.from('clients').update(updates).eq('id', input.clientId)
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
      const { data: referrer } = await db
        .from('hub_guest_profiles')
        .select('client_id')
        .eq('id', referredByProfileId)
        .single()
      if (referrer?.client_id) {
        referralUpdates.referred_by_client_id = referrer.client_id
      }
    }
    if (Object.keys(referralUpdates).length > 0) {
      await db.from('clients').update(referralUpdates).eq('id', input.clientId)
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
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await db
    .from('hub_group_members')
    .select('group_id, role, joined_at')
    .eq('profile_id', profile.id)

  if (error) throw new Error(`Failed to load groups: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Profile token recovery - for guests who cleared cookies
// ---------------------------------------------------------------------------

/**
 * Send a recovery link to a guest's email so they can reclaim their circle access.
 * Looks up their profile by email, verifies membership in the group,
 * then sends an email with a /hub/recover/[groupToken]?t=[profileToken] link.
 *
 * Public - no auth required. Rate limiting should be applied at the route layer.
 */
export async function sendCircleRecoveryEmail(
  email: string,
  groupToken: string
): Promise<{ success: boolean; message: string }> {
  // Rate limit: 3 recovery emails per email address per 15 minutes
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit')
    const normalized0 = email.toLowerCase().trim()
    await checkRateLimit(`hub-recovery:${normalized0}`, 3, 15 * 60 * 1000)
  } catch {
    return { success: false, message: 'Too many requests. Please try again later.' }
  }

  const db: any = createServerClient({ admin: true })

  const normalized = email.toLowerCase().trim()

  // Look up profile by email
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, profile_token, display_name')
    .eq('email_normalized', normalized)
    .single()

  if (!profile) {
    // Return same message to prevent email enumeration
    return { success: true, message: 'If that email is in our system, we sent a link.' }
  }

  // Verify profile is in this group
  const { data: group } = await db
    .from('hub_groups')
    .select('id, name')
    .eq('group_token', groupToken)
    .single()

  if (!group) {
    return { success: false, message: 'Circle not found.' }
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!membership) {
    return { success: true, message: 'If that email is in our system, we sent a link.' }
  }

  // Send recovery email
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const recoveryUrl = `${APP_URL}/hub/recover/${groupToken}?t=${profile.profile_token}`

  try {
    const { sendEmail } = await import('@/lib/email/send')
    const { createElement } = await import('react')
    const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

    await sendEmail({
      to: email,
      subject: `Your link to rejoin ${group.name || 'the dinner circle'}`,
      react: createElement(NotificationGenericEmail, {
        title: 'Rejoin your dinner circle',
        body: `Here is your access link to rejoin ${group.name || 'the circle'}. Click below to continue where you left off.`,
        actionUrl: recoveryUrl,
        actionLabel: 'Rejoin Circle',
      }),
    })
  } catch {
    // Non-blocking - tell user it worked to avoid confusion
  }

  return { success: true, message: 'If that email is in our system, we sent a link.' }
}

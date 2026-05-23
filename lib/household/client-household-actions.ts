// Client Household Actions - Self-service household member management
// Clients manage their own household members and dietary needs.
// Data lives in hub_household_members, linked via hub_guest_profiles.client_id.

'use server'

import { requireAuth, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type { HouseholdMember } from '@/lib/hub/household-actions'

const MemberSchema = z.object({
  display_name: z.string().min(1, 'Name is required').max(100),
  relationship: z.preprocess(
    (value) => (value === '' || value == null ? 'other' : value),
    z.enum([
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
  ),
  age_group: z.enum(['adult', 'child', 'infant', '']).nullable().default(null),
  dietary_restrictions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  notes: z.string().max(500).nullable().default(null),
})

/**
 * Resolve or create the hub_guest_profile for the current client.
 * Returns the profile ID used to scope household members.
 */
function requireClientSubject(user: AuthUser): asserts user is AuthUser & { tenantId: string } {
  if (user.role !== 'client' || !user.entityId || !user.tenantId) {
    throw new Error('Client account is missing household access context')
  }
}

async function resolveClientProfileId(db: any, user: AuthUser): Promise<string> {
  requireClientSubject(user)

  const { data: client } = await db
    .from('clients')
    .select('full_name, email, tenant_id')
    .eq('id', user.entityId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()

  if (!client) throw new Error('Client record not found')

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (profile) return profile.id

  // Auto-create a hub profile for this tenant-scoped client.
  const { data: newProfile, error } = await db
    .from('hub_guest_profiles')
    .insert({
      client_id: user.entityId,
      display_name: client.full_name || 'Guest',
      email: client.email,
      profile_token: crypto.randomUUID(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  return newProfile.id
}

export async function getMyHousehold() {
  const user = await requireAuth()
  const db: any = createServerClient()
  const profileId = await resolveClientProfileId(db, user)

  const { data, error } = await db
    .from('hub_household_members')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getMyHousehold] Query failed:', error)
    throw new Error('Failed to load household members')
  }

  return data ?? []
}

export async function addHouseholdMember(formData: {
  display_name: string
  relationship?: string
  age_group?: string | null
  dietary_restrictions?: string[]
  allergies?: string[]
  notes?: string | null
}) {
  const user = await requireAuth()
  const parsed = MemberSchema.parse(formData)
  const db: any = createServerClient()
  const profileId = await resolveClientProfileId(db, user)

  // Get next sort order
  const { data: existing } = await db
    .from('hub_household_members')
    .select('sort_order')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = ((existing?.[0]?.sort_order ?? 0) as number) + 1

  const { error } = await db.from('hub_household_members').insert({
    profile_id: profileId,
    display_name: parsed.display_name,
    relationship: parsed.relationship || null,
    age_group: parsed.age_group || null,
    dietary_restrictions: parsed.dietary_restrictions,
    allergies: parsed.allergies,
    notes: parsed.notes,
    sort_order: nextOrder,
  })

  if (error) {
    console.error('[addHouseholdMember] Insert failed:', error)
    throw new Error('Failed to add household member')
  }

  revalidatePath('/my-household')
  return { success: true }
}

export async function updateHouseholdMember(
  memberId: string,
  formData: {
    display_name: string
    relationship?: string
    age_group?: string | null
    dietary_restrictions?: string[]
    allergies?: string[]
    notes?: string | null
  }
) {
  const user = await requireAuth()
  const parsed = MemberSchema.parse(formData)
  const db: any = createServerClient()
  const profileId = await resolveClientProfileId(db, user)

  // Verify ownership
  const { data: member } = await db
    .from('hub_household_members')
    .select('id')
    .eq('id', memberId)
    .eq('profile_id', profileId)
    .single()

  if (!member) throw new Error('Household member not found')

  const { error } = await db
    .from('hub_household_members')
    .update({
      display_name: parsed.display_name,
      relationship: parsed.relationship || null,
      age_group: parsed.age_group || null,
      dietary_restrictions: parsed.dietary_restrictions,
      allergies: parsed.allergies,
      notes: parsed.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('profile_id', profileId)

  if (error) {
    console.error('[updateHouseholdMember] Update failed:', error)
    throw new Error('Failed to update household member')
  }

  revalidatePath('/my-household')
  return { success: true }
}

export async function removeHouseholdMember(memberId: string) {
  const user = await requireAuth()
  const db: any = createServerClient()
  const profileId = await resolveClientProfileId(db, user)

  // Verify ownership before delete
  const { data: member } = await db
    .from('hub_household_members')
    .select('id')
    .eq('id', memberId)
    .eq('profile_id', profileId)
    .single()

  if (!member) throw new Error('Household member not found')

  const { error } = await db
    .from('hub_household_members')
    .delete()
    .eq('id', memberId)
    .eq('profile_id', profileId)

  if (error) {
    console.error('[removeHouseholdMember] Delete failed:', error)
    throw new Error('Failed to remove household member')
  }

  revalidatePath('/my-household')
  return { success: true }
}

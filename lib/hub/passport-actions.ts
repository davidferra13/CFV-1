'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAuth } from '@/lib/auth/get-user'
import { z } from 'zod'
import type { ClientPassport } from './types'

// ---------------------------------------------------------------------------
// Client Passport CRUD
// ---------------------------------------------------------------------------

const PassportLocationSchema = z.object({
  label: z.string().min(1).max(100),
  address: z.string().max(300).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
})

const UpsertPassportSchema = z.object({
  profileId: z.string().uuid(),
  defaultGuestCount: z.number().int().min(1).max(500).nullable().optional(),
  budgetRangeMinCents: z.number().int().min(0).nullable().optional(),
  budgetRangeMaxCents: z.number().int().min(0).nullable().optional(),
  serviceStyle: z
    .enum(['formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'])
    .nullable()
    .optional(),
  communicationMode: z.enum(['direct', 'delegate_only', 'delegate_preferred']).optional(),
  preferredContactMethod: z.enum(['email', 'sms', 'phone', 'circle']).nullable().optional(),
  maxInteractionRounds: z.number().int().min(1).max(10).optional(),
  chefAutonomyLevel: z.enum(['full', 'high', 'moderate', 'low']).optional(),
  autoApproveUnderCents: z.number().int().min(0).nullable().optional(),
  standingInstructions: z.string().max(2000).nullable().optional(),
  defaultLocations: z.array(PassportLocationSchema).max(10).optional(),
})

/**
 * Get passport for a guest profile. Returns null if none exists.
 */
export async function getPassportForProfile(profileId: string): Promise<ClientPassport | null> {
  await requireAuth()
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('client_passports')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('[getPassportForProfile] Error:', error)
    return null
  }

  return data as ClientPassport | null
}

/**
 * Create or update a client passport.
 * Uses upsert on the unique profile_id constraint.
 */
export async function upsertPassport(
  input: z.infer<typeof UpsertPassportSchema>
): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const validated = UpsertPassportSchema.parse(input)
  const db = createServerClient({ admin: true })

  const row = {
    profile_id: validated.profileId,
    default_guest_count: validated.defaultGuestCount ?? null,
    budget_range_min_cents: validated.budgetRangeMinCents ?? null,
    budget_range_max_cents: validated.budgetRangeMaxCents ?? null,
    service_style: validated.serviceStyle ?? null,
    communication_mode: validated.communicationMode ?? 'direct',
    preferred_contact_method: validated.preferredContactMethod ?? null,
    max_interaction_rounds: validated.maxInteractionRounds ?? 1,
    chef_autonomy_level: validated.chefAutonomyLevel ?? 'full',
    auto_approve_under_cents: validated.autoApproveUnderCents ?? null,
    standing_instructions: validated.standingInstructions ?? null,
    default_locations: JSON.stringify(validated.defaultLocations ?? []),
  }

  const { error } = await db.from('client_passports').upsert(row, { onConflict: 'profile_id' })

  if (error) {
    console.error('[upsertPassport] Error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

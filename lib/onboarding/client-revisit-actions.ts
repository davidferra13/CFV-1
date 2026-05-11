'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { generateOnboardingToken } from '@/lib/clients/onboarding-tokens'

/**
 * Check whether the current client has completed onboarding and can revisit it.
 */
export async function canRevisitOnboarding(): Promise<boolean> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('onboarding_completed_at')
    .eq('id', user.entityId)
    .single()

  // Client can revisit if they have completed onboarding at least once
  return !!client?.onboarding_completed_at
}

/**
 * Get the client's current onboarding answers (preferences already on record).
 */
export async function getOnboardingAnswers() {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select(
      `
      dietary_restrictions, allergies, dislikes,
      spice_tolerance, favorite_cuisines, favorite_dishes,
      kitchen_size, kitchen_constraints,
      equipment_available, parking_instructions, access_instructions,
      house_rules, preferred_contact_method, personal_milestones,
      onboarding_completed_at
    `
    )
    .eq('id', user.entityId)
    .single()

  if (!client) return null
  return client
}

/**
 * Generate a fresh onboarding token for the current client so they can
 * re-visit and update their preferences through the onboarding flow.
 * This temporarily clears the onboarding_completed_at so the form renders
 * in edit mode, then re-sets it on submission.
 */
export async function generateRevisitToken(): Promise<{ token: string } | { error: string }> {
  const user = await requireClient()

  if (!user.tenantId) {
    return { error: 'No tenant associated with your account' }
  }

  const db: any = createServerClient()

  // Clear onboarding_completed_at so the form shows as editable
  const { error } = await db
    .from('clients')
    .update({ onboarding_completed_at: null })
    .eq('id', user.entityId)

  if (error) {
    return { error: 'Failed to prepare onboarding for editing' }
  }

  // Generate a fresh token
  const token = generateOnboardingToken(user.entityId, user.tenantId)
  return { token }
}

// Client Self-Service Profile Actions
// Clients can view and update their own profile information

'use server'

import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import { FUN_QA_QUESTIONS, type FunQAKey, type FunQAAnswers } from './fun-qa-constants'

// Re-export for any server-side consumers that previously imported from here.
// Client components should import directly from '@/lib/clients/fun-qa-constants'.
export type { FunQAKey, FunQAAnswers } from './fun-qa-constants'

const UpdateClientProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  preferred_name: z.string().nullable().optional(),
  partner_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  dietary_protocols: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).nullable().optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  wine_beverage_preferences: z.string().nullable().optional(),
  parking_instructions: z.string().nullable().optional(),
  access_instructions: z.string().nullable().optional(),
  kitchen_size: z.string().nullable().optional(),
  kitchen_constraints: z.string().nullable().optional(),
  house_rules: z.string().nullable().optional(),
  equipment_available: z.array(z.string()).optional(),
  children: z.array(z.string()).optional(),
  family_notes: z.string().nullable().optional(),
})

export type UpdateClientProfileInput = z.infer<typeof UpdateClientProfileSchema>

/**
 * Get the current client's own profile
 */
export async function getMyProfile() {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data: profile, error } = await supabase
    .from('clients')
    .select(
      `
      id, email, full_name, preferred_name, partner_name, phone, address,
      dietary_restrictions, dietary_protocols, allergies, dislikes, spice_tolerance,
      favorite_cuisines, favorite_dishes, wine_beverage_preferences,
      parking_instructions, access_instructions,
      kitchen_size, kitchen_constraints, house_rules, equipment_available,
      children, family_notes,
      loyalty_tier, loyalty_points, status
    `
    )
    .eq('id', user.entityId)
    .single()

  if (error) {
    console.error('[getMyProfile] Error:', error)
    throw new Error('Failed to fetch profile')
  }

  return profile
}

/**
 * Client updates their own profile
 */
export async function updateMyProfile(input: UpdateClientProfileInput) {
  const user = await requireClient()
  const validated = UpdateClientProfileSchema.parse(input)
  const supabase = createServerClient()

  // Convert empty strings to null for optional text fields
  const cleanedData = {
    ...validated,
    preferred_name: validated.preferred_name || null,
    partner_name: validated.partner_name || null,
    phone: validated.phone || null,
    address: validated.address || null,
    spice_tolerance: validated.spice_tolerance || null,
    wine_beverage_preferences: validated.wine_beverage_preferences || null,
    parking_instructions: validated.parking_instructions || null,
    access_instructions: validated.access_instructions || null,
    kitchen_size: validated.kitchen_size || null,
    kitchen_constraints: validated.kitchen_constraints || null,
    house_rules: validated.house_rules || null,
    family_notes: validated.family_notes || null,
  }

  // Fetch current profile to detect allergy/dietary changes (food safety)
  const { data: oldProfile } = await supabase
    .from('clients')
    .select('allergies, dietary_restrictions, tenant_id')
    .eq('id', user.entityId)
    .single()

  const { error } = await supabase.from('clients').update(cleanedData).eq('id', user.entityId)

  if (error) {
    console.error('[updateMyProfile] Error:', error)
    throw new Error('Failed to update profile')
  }

  revalidatePath('/my-profile')
  revalidatePath('/my-events')

  // Chef-side cache
  revalidatePath(`/clients/${user.entityId}`)

  // Non-blocking: notify chef if allergy or dietary fields changed (food safety)
  try {
    if (oldProfile) {
      const oldAllergies = JSON.stringify(oldProfile.allergies ?? [])
      const newAllergies = JSON.stringify(validated.allergies ?? [])
      const oldDietary = JSON.stringify(oldProfile.dietary_restrictions ?? [])
      const newDietary = JSON.stringify(validated.dietary_restrictions ?? [])

      if (oldAllergies !== newAllergies || oldDietary !== newDietary) {
        const chefAuthId = await getChefAuthUserId(oldProfile.tenant_id)
        if (chefAuthId) {
          const changes: string[] = []
          if (oldAllergies !== newAllergies)
            changes.push(`Allergies: ${(validated.allergies ?? []).join(', ') || 'none'}`)
          if (oldDietary !== newDietary)
            changes.push(`Dietary: ${(validated.dietary_restrictions ?? []).join(', ') || 'none'}`)

          await createNotification({
            tenantId: oldProfile.tenant_id,
            recipientId: chefAuthId,
            category: 'client',
            action: 'client_allergy_changed',
            title: `${validated.full_name} updated dietary info`,
            body: changes.join('; '),
            clientId: user.entityId,
          })
        }
      }
    }
  } catch (err) {
    console.error('[updateMyProfile] Non-blocking allergy notification failed:', err)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Fun Q&A actions
// ---------------------------------------------------------------------------

/**
 * Client: fetch their own fun Q&A answers
 */
export async function getMyFunQA(): Promise<FunQAAnswers> {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select('fun_qa_answers')
    .eq('id', user.entityId)
    .single()

  if (error) {
    console.error('[getMyFunQA] Error:', error)
    return {}
  }

  return ((data as any)?.fun_qa_answers as FunQAAnswers) ?? {}
}

/**
 * Client: save their fun Q&A answers (full replace of the JSONB object)
 */
export async function updateMyFunQA(answers: FunQAAnswers) {
  const user = await requireClient()
  const supabase = createServerClient()

  // Strip blank strings so the object stays clean
  const cleaned: FunQAAnswers = {}
  for (const [k, v] of Object.entries(answers)) {
    if (v && v.trim()) cleaned[k as FunQAKey] = v.trim()
  }

  const { error } = await supabase
    .from('clients')
    .update({ fun_qa_answers: cleaned } as any)
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateMyFunQA] Error:', error)
    throw new Error('Failed to save answers')
  }

  revalidatePath('/my-profile')
  return { success: true }
}

/**
 * Chef: read a client's fun Q&A answers (read-only, tenant-scoped)
 */
export async function getClientFunQA(clientId: string): Promise<FunQAAnswers> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select('fun_qa_answers')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getClientFunQA] Error:', error)
    return {}
  }

  return ((data as any)?.fun_qa_answers as FunQAAnswers) ?? {}
}

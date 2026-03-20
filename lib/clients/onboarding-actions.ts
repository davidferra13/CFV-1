'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { generateOnboardingToken, verifyOnboardingToken } from '@/lib/clients/onboarding-tokens'
import { createServerClient } from '@/lib/supabase/server'

export async function generateOnboardingLink(
  clientId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email, onboarding_completed_at')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found.' }
  }

  const token = generateOnboardingToken(clientId, user.tenantId!)
  await supabase
    .from('clients')
    .update({ onboarding_token: token } as any)
    .eq('id', clientId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const url = `${appUrl}/onboarding/${token}`

  return { success: true, url }
}

const OnboardingSubmissionSchema = z.object({
  token: z.string().min(1),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z
    .array(
      z.object({
        allergen: z.string().min(1),
        severity: z.enum(['life_threatening', 'intolerance', 'preference']),
      })
    )
    .optional(),
  household_size: z.number().int().min(1).max(50).optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).optional(),
  kitchen_size: z.string().optional(),
  kitchen_constraints: z.string().optional(),
  equipment_available: z.array(z.string()).optional(),
  parking_instructions: z.string().max(500).optional(),
  access_instructions: z.string().max(500).optional(),
  house_rules: z.string().max(500).optional(),
  preferred_contact_method: z.enum(['email', 'phone', 'text']).optional(),
  important_dates: z
    .array(
      z.object({
        type: z.string(),
        date: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
})

export async function submitOnboarding(
  input: z.infer<typeof OnboardingSubmissionSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = OnboardingSubmissionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid form data.' }
  }

  const tokenData = verifyOnboardingToken(parsed.data.token)
  if (!tokenData) {
    return { success: false, error: 'This link has expired. Please ask your chef for a new one.' }
  }

  const supabase = createServerClient({ admin: true })
  const { clientId, tenantId } = tokenData

  const clientUpdate: Record<string, any> = {
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.dietary_restrictions?.length) {
    clientUpdate.dietary_restrictions = parsed.data.dietary_restrictions
  }
  if (parsed.data.favorite_cuisines?.length) {
    clientUpdate.favorite_cuisines = parsed.data.favorite_cuisines
  }
  if (parsed.data.favorite_dishes?.length) {
    clientUpdate.favorite_dishes = parsed.data.favorite_dishes
  }
  if (parsed.data.dislikes?.length) {
    clientUpdate.dislikes = parsed.data.dislikes
  }
  if (parsed.data.spice_tolerance) {
    clientUpdate.spice_tolerance = parsed.data.spice_tolerance
  }
  if (parsed.data.kitchen_size) {
    clientUpdate.kitchen_size = parsed.data.kitchen_size
  }
  if (parsed.data.kitchen_constraints) {
    clientUpdate.kitchen_constraints = parsed.data.kitchen_constraints
  }
  if (parsed.data.equipment_available?.length) {
    clientUpdate.equipment_available = parsed.data.equipment_available
  }
  if (parsed.data.parking_instructions) {
    clientUpdate.parking_instructions = parsed.data.parking_instructions
  }
  if (parsed.data.access_instructions) {
    clientUpdate.access_instructions = parsed.data.access_instructions
  }
  if (parsed.data.house_rules) {
    clientUpdate.house_rules = parsed.data.house_rules
  }
  if (parsed.data.preferred_contact_method) {
    clientUpdate.preferred_contact_method = parsed.data.preferred_contact_method
    clientUpdate.communication_preference = {
      preferred_method: parsed.data.preferred_contact_method,
    }
  }
  if (parsed.data.important_dates?.length) {
    clientUpdate.personal_milestones = parsed.data.important_dates
  }

  const { error: updateError } = await supabase
    .from('clients')
    .update(clientUpdate)
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[onboarding] Failed to update client:', updateError.message)
    return { success: false, error: 'Failed to save your preferences.' }
  }

  if (parsed.data.allergies?.length) {
    const allergyRecords = parsed.data.allergies.map((allergy) => ({
      tenant_id: tenantId,
      client_id: clientId,
      allergen: allergy.allergen,
      severity: allergy.severity,
      source: 'onboarding',
      confirmed_by_chef: false,
    }))

    await supabase.from('client_allergy_records').upsert(allergyRecords, {
      onConflict: 'client_id,allergen',
      ignoreDuplicates: true,
    })
  }

  try {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', clientId)
      .single()

    await supabase.from('notifications').insert({
      tenant_id: tenantId,
      recipient_id: tenantId,
      recipient_role: 'chef',
      client_id: clientId,
      title: 'Client onboarding completed',
      body: `${client?.full_name ?? 'A client'} completed their preference form.`,
      category: 'system',
      action: 'view_client',
      action_url: `/clients/${clientId}`,
    })
  } catch (error) {
    console.error('[onboarding] Notification failed (non-blocking):', error)
  }

  return { success: true }
}

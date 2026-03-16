'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as crypto from 'crypto'

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

const ONBOARDING_TOKEN_EXPIRY_DAYS = 7

function generateOnboardingToken(clientId: string, tenantId: string): string {
  const payload = {
    cid: clientId,
    tid: tenantId,
    type: 'onboarding',
    exp: Date.now() + ONBOARDING_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
  const json = JSON.stringify(payload)
  const encoded = Buffer.from(json).toString('base64url')
  const secret =
    process.env.ONBOARDING_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-onboarding-secret'
  const hmac = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${hmac}`
}

export function verifyOnboardingToken(
  token: string
): { clientId: string; tenantId: string } | null {
  try {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return null

    const secret =
      process.env.ONBOARDING_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-onboarding-secret'
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url')

    if (signature !== expectedSignature) return null

    const json = Buffer.from(encoded, 'base64url').toString('utf-8')
    const payload = JSON.parse(json)

    if (payload.type !== 'onboarding') return null
    if (payload.exp < Date.now()) return null

    return { clientId: payload.cid, tenantId: payload.tid }
  } catch {
    return null
  }
}

// ==========================================
// GENERATE ONBOARDING LINK
// ==========================================

export async function generateOnboardingLink(
  clientId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to this chef
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email, onboarding_completed_at')
    .eq('id', clientId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found.' }
  }

  const token = generateOnboardingToken(clientId, user.entityId)

  // Store token on client record
  await supabase.from('clients').update({ onboarding_token: token }).eq('id', clientId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const url = `${appUrl}/onboarding/${token}`

  return { success: true, url }
}

// ==========================================
// SUBMIT ONBOARDING (called from client-facing form)
// ==========================================

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

  // Verify token
  const tokenData = verifyOnboardingToken(parsed.data.token)
  if (!tokenData) {
    return { success: false, error: 'This link has expired. Please ask your chef for a new one.' }
  }

  const supabase = createServerClient({ admin: true })
  const { clientId, tenantId } = tokenData

  // Update client profile
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
  }
  if (parsed.data.important_dates?.length) {
    clientUpdate.personal_milestones = parsed.data.important_dates
  }
  if (parsed.data.preferred_contact_method) {
    clientUpdate.communication_preference = {
      preferred_method: parsed.data.preferred_contact_method,
    }
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

  // Create allergy records if provided
  if (parsed.data.allergies?.length) {
    const allergyRecords = parsed.data.allergies.map((a) => ({
      tenant_id: tenantId,
      client_id: clientId,
      allergen: a.allergen,
      severity: a.severity,
      source: 'onboarding',
      confirmed_by_chef: false,
    }))

    await supabase.from('client_allergy_records').upsert(allergyRecords, {
      onConflict: 'client_id,allergen',
      ignoreDuplicates: true,
    })
  }

  // Notify chef that onboarding is complete
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
  } catch (err) {
    console.error('[onboarding] Notification failed (non-blocking):', err)
  }

  return { success: true }
}

// ==========================================
// GET ONBOARDING DATA (for pre-populating form)
// ==========================================

export async function getOnboardingData(token: string) {
  const tokenData = verifyOnboardingToken(token)
  if (!tokenData) return null

  const supabase = createServerClient({ admin: true })

  const { data: client } = await supabase
    .from('clients')
    .select(
      `
      id, full_name, email,
      dietary_restrictions, allergies, dislikes,
      spice_tolerance, favorite_cuisines, favorite_dishes,
      kitchen_size, kitchen_constraints,
      equipment_available, parking_instructions, access_instructions,
      house_rules, preferred_contact_method, personal_milestones,
      onboarding_completed_at
    `
    )
    .eq('id', tokenData.clientId)
    .eq('tenant_id', tokenData.tenantId)
    .single()

  if (!client) return null

  // Get chef name for display
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tokenData.tenantId)
    .single()

  return {
    client,
    chefName: chef?.business_name ?? 'Your Chef',
    alreadyCompleted: !!client.onboarding_completed_at,
  }
}

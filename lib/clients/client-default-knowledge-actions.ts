'use server'

import { revalidatePath } from 'next/cache'
import { requireClient } from '@/lib/auth/get-user'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'
import { createServerClient } from '@/lib/db/server'
import {
  UpdateClientDefaultKnowledgeSchema,
  buildClientDefaultKnowledgeSnapshot,
  normalizeClientDefaultKnowledgeInput,
} from './client-default-knowledge'

const CLIENT_PROFILE_SELECT = `
  id, tenant_id, updated_at,
  full_name, preferred_name, email, phone, address,
  dietary_restrictions, dietary_protocols, allergies, dislikes, spice_tolerance,
  favorite_cuisines, favorite_dishes, wine_beverage_preferences,
  parking_instructions, access_instructions, kitchen_size, kitchen_constraints,
  house_rules, equipment_available, partner_name, children, family_notes
`

const CLIENT_PASSPORT_SELECT = `
  communication_mode, preferred_contact_method, chef_autonomy_level,
  auto_approve_under_cents, max_interaction_rounds, standing_instructions,
  default_guest_count, budget_range_min_cents, budget_range_max_cents,
  service_style, delegate_name, delegate_email, delegate_phone, updated_at
`

export async function getMyDefaultKnowledgeSettings() {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: profile, error: profileError } = await db
    .from('clients')
    .select(CLIENT_PROFILE_SELECT)
    .eq('id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (profileError || !profile) {
    console.error('[getMyDefaultKnowledgeSettings] Profile lookup error:', profileError)
    throw new Error('Failed to load default knowledge settings')
  }

  const { data: passport, error: passportError } = await db
    .from('client_passports')
    .select(CLIENT_PASSPORT_SELECT)
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (passportError) {
    console.error('[getMyDefaultKnowledgeSettings] Passport lookup error:', passportError)
    throw new Error('Failed to load default knowledge settings')
  }

  return buildClientDefaultKnowledgeSnapshot(profile, passport ?? null)
}

export async function updateMyDefaultKnowledgeSettings(input: unknown) {
  const user = await requireClient()
  const validated = UpdateClientDefaultKnowledgeSchema.parse(input)
  const passport = normalizeClientDefaultKnowledgeInput(validated)
  const db: any = createServerClient()

  const { data: profile, error: profileError } = await db
    .from('clients')
    .select(CLIENT_PROFILE_SELECT)
    .eq('id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (profileError || !profile) {
    console.error('[updateMyDefaultKnowledgeSettings] Profile lookup error:', profileError)
    throw new Error('Failed to resolve your profile')
  }

  const { data: updatedPassport, error: upsertError } = await db
    .from('client_passports')
    .upsert(
      {
        tenant_id: user.tenantId!,
        client_id: user.entityId,
        ...passport,
      },
      { onConflict: 'tenant_id,client_id' }
    )
    .select(CLIENT_PASSPORT_SELECT)
    .single()

  if (upsertError || !updatedPassport) {
    console.error('[updateMyDefaultKnowledgeSettings] Upsert error:', upsertError)
    throw new Error('Failed to save default knowledge settings')
  }

  revalidatePath('/my-profile')
  revalidatePath('/my-events')
  revalidatePath(`/clients/${user.entityId}`)

  try {
    await invalidateRemyContextCache(user.tenantId!)
  } catch (err) {
    console.error('[updateMyDefaultKnowledgeSettings] Remy cache invalidation failed:', err)
  }

  return {
    success: true,
    snapshot: buildClientDefaultKnowledgeSnapshot(profile, updatedPassport),
  }
}

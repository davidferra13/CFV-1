// Client Passport Actions - Communication preferences, autonomy, delegate settings

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type ClientPassport = {
  communicationMode: 'direct' | 'delegate_only' | 'delegate_preferred'
  preferredContactMethod: 'email' | 'sms' | 'phone' | 'circle'
  chefAutonomyLevel: 'full' | 'high' | 'moderate' | 'low'
  autoApproveUnderCents: number
  maxInteractionRounds: number | null
  standingInstructions: string | null
  defaultGuestCount: number
  budgetRangeMinCents: number | null
  budgetRangeMaxCents: number | null
  serviceStyle: string | null
  delegateName: string | null
  delegateEmail: string | null
  delegatePhone: string | null
}

const DEFAULTS: ClientPassport = {
  communicationMode: 'direct',
  preferredContactMethod: 'email',
  chefAutonomyLevel: 'moderate',
  autoApproveUnderCents: 0,
  maxInteractionRounds: null,
  standingInstructions: null,
  defaultGuestCount: 2,
  budgetRangeMinCents: null,
  budgetRangeMaxCents: null,
  serviceStyle: null,
  delegateName: null,
  delegateEmail: null,
  delegatePhone: null,
}

export async function getMyPassport(): Promise<ClientPassport> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_passports')
    .select('*')
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[getMyPassport] Query failed:', error)
    return DEFAULTS
  }

  if (!data) return DEFAULTS

  return {
    communicationMode: data.communication_mode || 'direct',
    preferredContactMethod: data.preferred_contact_method || 'email',
    chefAutonomyLevel: data.chef_autonomy_level || 'moderate',
    autoApproveUnderCents: data.auto_approve_under_cents || 0,
    maxInteractionRounds: data.max_interaction_rounds,
    standingInstructions: data.standing_instructions,
    defaultGuestCount: data.default_guest_count || 2,
    budgetRangeMinCents: data.budget_range_min_cents,
    budgetRangeMaxCents: data.budget_range_max_cents,
    serviceStyle: data.service_style,
    delegateName: data.delegate_name,
    delegateEmail: data.delegate_email,
    delegatePhone: data.delegate_phone,
  }
}

export async function updateMyPassport(passport: ClientPassport) {
  const user = await requireClient()
  const db: any = createServerClient()

  const row = {
    client_id: user.entityId,
    tenant_id: user.tenantId,
    communication_mode: passport.communicationMode,
    preferred_contact_method: passport.preferredContactMethod,
    chef_autonomy_level: passport.chefAutonomyLevel,
    auto_approve_under_cents: passport.autoApproveUnderCents,
    max_interaction_rounds: passport.maxInteractionRounds,
    standing_instructions: passport.standingInstructions || null,
    default_guest_count: passport.defaultGuestCount,
    budget_range_min_cents: passport.budgetRangeMinCents,
    budget_range_max_cents: passport.budgetRangeMaxCents,
    service_style: passport.serviceStyle || null,
    delegate_name: passport.delegateName || null,
    delegate_email: passport.delegateEmail || null,
    delegate_phone: passport.delegatePhone || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await db
    .from('client_passports')
    .upsert(row, { onConflict: 'tenant_id,client_id' })

  if (error) {
    console.error('[updateMyPassport] Upsert failed:', error)
    throw new Error('Failed to save passport')
  }

  revalidatePath('/my-passport')
  return { success: true }
}

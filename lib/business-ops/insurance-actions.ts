'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type PolicyType =
  | 'general_liability'
  | 'professional_liability'
  | 'auto'
  | 'health'
  | 'equipment'
  | 'workers_comp'
  | 'other'

export type PremiumFrequency = 'annual' | 'semi_annual' | 'quarterly' | 'monthly'

export type InsurancePolicy = {
  id: string
  tenant_id: string
  policy_type: PolicyType
  provider_name: string
  policy_number: string | null
  coverage_amount_cents: number | null
  premium_cents: number | null
  premium_frequency: PremiumFrequency | null
  renewal_date: string | null
  agent_name: string | null
  agent_phone: string | null
  agent_email: string | null
  portal_url: string | null
  document_path: string | null
  notes: string | null
  reminder_sent_30d: boolean
  reminder_sent_7d: boolean
  created_at: string
  updated_at: string
}

export type CreateInsurancePolicyInput = {
  policy_type: PolicyType
  provider_name: string
  policy_number?: string | null
  coverage_amount_cents?: number | null
  premium_cents?: number | null
  premium_frequency?: PremiumFrequency | null
  renewal_date?: string | null
  agent_name?: string | null
  agent_phone?: string | null
  agent_email?: string | null
  portal_url?: string | null
  notes?: string | null
}

export type UpdateInsurancePolicyInput = Partial<CreateInsurancePolicyInput>

// ============================================
// ACTIONS
// ============================================

export async function getInsurancePolicies(): Promise<InsurancePolicy[]> {
  const user = await requireChef()
  const db = createServerClient()

  const { data, error } = await db
    .from('chef_insurance_policies')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('renewal_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Failed to load insurance policies: ${error.message}`)
  return (data ?? []) as InsurancePolicy[]
}

export async function createInsurancePolicy(
  input: CreateInsurancePolicyInput
): Promise<{ success: true; policy: InsurancePolicy }> {
  const user = await requireChef()
  const db = createServerClient()

  if (!input.provider_name?.trim()) {
    throw new Error('Provider name is required')
  }

  const { data, error } = await db
    .from('chef_insurance_policies')
    .insert({
      tenant_id: user.tenantId!,
      policy_type: input.policy_type,
      provider_name: input.provider_name.trim(),
      policy_number: input.policy_number?.trim() || null,
      coverage_amount_cents: input.coverage_amount_cents ?? null,
      premium_cents: input.premium_cents ?? null,
      premium_frequency: input.premium_frequency || null,
      renewal_date: input.renewal_date || null,
      agent_name: input.agent_name?.trim() || null,
      agent_phone: input.agent_phone?.trim() || null,
      agent_email: input.agent_email?.trim() || null,
      portal_url: input.portal_url?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create insurance policy: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true, policy: data as InsurancePolicy }
}

export async function updateInsurancePolicy(
  id: string,
  input: UpdateInsurancePolicyInput
): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.policy_type !== undefined) updates.policy_type = input.policy_type
  if (input.provider_name !== undefined) updates.provider_name = input.provider_name.trim()
  if (input.policy_number !== undefined) updates.policy_number = input.policy_number?.trim() || null
  if (input.coverage_amount_cents !== undefined)
    updates.coverage_amount_cents = input.coverage_amount_cents
  if (input.premium_cents !== undefined) updates.premium_cents = input.premium_cents
  if (input.premium_frequency !== undefined) updates.premium_frequency = input.premium_frequency
  if (input.renewal_date !== undefined) updates.renewal_date = input.renewal_date || null
  if (input.agent_name !== undefined) updates.agent_name = input.agent_name?.trim() || null
  if (input.agent_phone !== undefined) updates.agent_phone = input.agent_phone?.trim() || null
  if (input.agent_email !== undefined) updates.agent_email = input.agent_email?.trim() || null
  if (input.portal_url !== undefined) updates.portal_url = input.portal_url?.trim() || null
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  const { error } = await db
    .from('chef_insurance_policies')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update insurance policy: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

export async function deleteInsurancePolicy(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const { error } = await db
    .from('chef_insurance_policies')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete insurance policy: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

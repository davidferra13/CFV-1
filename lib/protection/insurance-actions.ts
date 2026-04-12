'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const REVALIDATE_PATH = '/settings/protection/insurance'

const PolicyTypeEnum = z.enum([
  'general_liability',
  'liquor_liability',
  'vehicle',
  'workers_comp',
  'professional_liability',
  'disability',
  'health',
  'other',
])

const PolicySchema = z.object({
  policy_type: PolicyTypeEnum,
  carrier: z.string().min(1, 'Carrier is required'),
  policy_number: z.string().optional(),
  coverage_limit_cents: z.number().int().nonnegative().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
  document_url: z.string().url().optional().or(z.literal('')).optional(),
})

const UpdatePolicySchema = PolicySchema.partial()

export type AddPolicyInput = z.infer<typeof PolicySchema>
export type UpdatePolicyInput = z.infer<typeof UpdatePolicySchema>

/**
 * Add a new insurance policy for the current chef tenant.
 */
export async function addPolicy(input: AddPolicyInput) {
  const chef = await requireChef()
  await requirePro('protection')
  const tenantId = chef.tenantId!
  const validated = PolicySchema.parse(input)

  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_insurance_policies')
    .insert({ ...validated, tenant_id: tenantId })
    .select()
    .single()

  if (error) throw new Error(`Failed to add policy: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Update an existing insurance policy. Verifies tenant ownership.
 */
export async function updatePolicy(id: string, input: UpdatePolicyInput) {
  const chef = await requireChef()
  await requirePro('protection')
  const tenantId = chef.tenantId!
  const validated = UpdatePolicySchema.parse(input)

  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('chef_insurance_policies')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Policy not found or access denied')

  const { data, error } = await db
    .from('chef_insurance_policies')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update policy: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Delete an insurance policy. Verifies tenant ownership.
 */
export async function deletePolicy(id: string) {
  const chef = await requireChef()
  await requirePro('protection')
  const tenantId = chef.tenantId!

  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('chef_insurance_policies')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Policy not found or access denied')

  const { error } = await db
    .from('chef_insurance_policies')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete policy: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
}

/**
 * List all insurance policies for the current tenant, ordered by expiry date asc.
 */
export async function getPolicies() {
  const chef = await requireChef()
  await requirePro('protection')
  const tenantId = chef.tenantId!

  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_insurance_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch policies: ${error.message}`)

  return data ?? []
}

/**
 * Return policies expiring within N days from today.
 * Intended for use in cron jobs or dashboard alerts.
 */
export async function getExpiringPolicies(daysAhead: number) {
  const chef = await requireChef()
  await requirePro('protection')
  const tenantId = chef.tenantId!

  const db: any = createServerClient()

  const _tn = new Date()
  const cutoff = new Date(_tn.getFullYear(), _tn.getMonth(), _tn.getDate() + daysAhead)
  const _todayStr = `${_tn.getFullYear()}-${String(_tn.getMonth() + 1).padStart(2, '0')}-${String(_tn.getDate()).padStart(2, '0')}`
  const _cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('chef_insurance_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .lte('expiry_date', _cutoffStr)
    .gte('expiry_date', _todayStr)
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch expiring policies: ${error.message}`)

  return data ?? []
}

/**
 * Returns a coverage gap report indicating which core coverage types
 * the tenant currently has active policies for.
 */
export async function getCoverageGapReport() {
  const chef = await requireChef()
  await requirePro('protection')
  const tenantId = chef.tenantId!

  const db: any = createServerClient()

  const _ti = new Date()
  const today = `${_ti.getFullYear()}-${String(_ti.getMonth() + 1).padStart(2, '0')}-${String(_ti.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('chef_insurance_policies')
    .select('policy_type')
    .eq('tenant_id', tenantId)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)

  if (error) throw new Error(`Failed to fetch coverage gap report: ${error.message}`)

  const types = new Set((data ?? []).map((p: { policy_type: string }) => p.policy_type))

  return {
    hasGeneralLiability: types.has('general_liability'),
    hasLiquorLiability: types.has('liquor_liability'),
    hasVehicle: types.has('vehicle'),
    hasWorkersComp: types.has('workers_comp'),
    hasDisability: types.has('disability'),
  }
}

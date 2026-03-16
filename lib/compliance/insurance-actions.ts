// DEFERRED: This file is inactive until the insurance_policies table migration
// is applied. The 'use server' directive has been removed to prevent runtime
// crashes from importing these functions. Re-enable once the schema exists.
//
// Original directive: 'use server'

// Insurance Documentation Tracking - Server Actions (DEFERRED)
// CRUD for insurance_policies. All mutations are tenant-scoped via requireChef().
// DO NOT import or call these functions until the table migration is complete.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type AnySupabase = ReturnType<typeof createServerClient> & { from: (t: string) => any }
function db(): AnySupabase {
  return createServerClient() as AnySupabase
}

export type InsurancePolicyType =
  | 'general_liability'
  | 'product_liability'
  | 'professional_liability'
  | 'workers_comp'
  | 'commercial_auto'
  | 'property'
  | 'umbrella'
  | 'other'

export type InsuranceStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled'

export interface InsurancePolicy {
  id: string
  chef_id: string
  policy_type: InsurancePolicyType
  provider: string
  policy_number: string | null
  coverage_amount_cents: number | null
  premium_cents: number | null
  start_date: string
  end_date: string
  auto_renew: boolean
  document_url: string | null
  notes: string | null
  status: InsuranceStatus
  created_at: string
  updated_at: string
  computed_status?: InsuranceStatus
}

export interface InsuranceStats {
  activeCount: number
  expiringSoonCount: number
  totalCoverageCents: number
  nextExpiryDate: string | null
}

function computeStatus(policy: InsurancePolicy): InsuranceStatus {
  if (policy.status === 'cancelled') return 'cancelled'
  const now = new Date()
  const endDate = new Date(policy.end_date)
  if (endDate < now) return 'expired'
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  if (endDate <= thirtyDaysFromNow) return 'expiring_soon'
  return 'active'
}

function withComputedStatus(policy: InsurancePolicy): InsurancePolicy {
  return { ...policy, computed_status: computeStatus(policy) }
}

// ---- READ ----

export async function getInsurancePolicies(): Promise<InsurancePolicy[]> {
  const user = await requireChef()
  const supabase = db()

  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('end_date', { ascending: true })

  if (error) throw new Error(`Failed to load insurance policies: ${error.message}`)
  return (data ?? []).map(withComputedStatus)
}

export async function getExpiringPolicies(daysAhead: number = 30): Promise<InsurancePolicy[]> {
  const user = await requireChef()
  const supabase = db()

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .neq('status', 'cancelled')
    .lte('end_date', futureDate.toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('end_date', { ascending: true })

  if (error) throw new Error(`Failed to load expiring policies: ${error.message}`)
  return (data ?? []).map(withComputedStatus)
}

export async function getInsuranceStats(): Promise<InsuranceStats> {
  const policies = await getInsurancePolicies()
  const nonCancelled = policies.filter((p) => p.computed_status !== 'cancelled')
  const active = nonCancelled.filter((p) => p.computed_status === 'active')
  const expiringSoon = nonCancelled.filter((p) => p.computed_status === 'expiring_soon')
  const totalCoverageCents = active.reduce((sum, p) => sum + (p.coverage_amount_cents ?? 0), 0)
  const nextExpiry = nonCancelled
    .filter((p) => new Date(p.end_date) >= new Date())
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0]

  return {
    activeCount: active.length,
    expiringSoonCount: expiringSoon.length,
    totalCoverageCents,
    nextExpiryDate: nextExpiry?.end_date ?? null,
  }
}

// ---- CREATE ----

export interface CreateInsurancePolicyInput {
  policy_type: InsurancePolicyType
  provider: string
  policy_number?: string
  coverage_amount_cents?: number
  premium_cents?: number
  start_date: string
  end_date: string
  auto_renew?: boolean
  document_url?: string
  notes?: string
}

export async function createPolicy(input: CreateInsurancePolicyInput) {
  const user = await requireChef()
  const supabase = db()

  const { data, error } = await supabase
    .from('insurance_policies')
    .insert({
      chef_id: user.tenantId!,
      policy_type: input.policy_type,
      provider: input.provider,
      policy_number: input.policy_number ?? null,
      coverage_amount_cents: input.coverage_amount_cents ?? null,
      premium_cents: input.premium_cents ?? null,
      start_date: input.start_date,
      end_date: input.end_date,
      auto_renew: input.auto_renew ?? false,
      document_url: input.document_url ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create policy: ${error.message}`)
  revalidatePath('/compliance')
  return data
}

// ---- UPDATE ----

export async function updatePolicy(id: string, input: Partial<CreateInsurancePolicyInput>) {
  const user = await requireChef()
  const supabase = db()

  const { data, error } = await supabase
    .from('insurance_policies')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update policy: ${error.message}`)
  revalidatePath('/compliance')
  return data
}

// ---- DELETE ----

export async function deletePolicy(id: string) {
  const user = await requireChef()
  const supabase = db()

  const { error } = await supabase
    .from('insurance_policies')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete policy: ${error.message}`)
  revalidatePath('/compliance')
  return { success: true }
}

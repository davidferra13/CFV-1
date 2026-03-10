'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type PermitType =
  | 'health'
  | 'business'
  | 'fire'
  | 'parking'
  | 'vendor'
  | 'mobile_food'
  | 'other'
export type PermitStatus = 'active' | 'expired' | 'pending_renewal' | 'revoked'

export type Permit = {
  id: string
  tenant_id: string
  name: string
  permit_type: PermitType
  issuing_authority: string | null
  permit_number: string | null
  issue_date: string | null
  expiry_date: string
  renewal_lead_days: number
  cost_cents: number | null
  notes: string | null
  document_url: string | null
  status: PermitStatus
  created_at: string
  updated_at: string
}

export type CreatePermitInput = {
  name: string
  permit_type: PermitType
  issuing_authority?: string | null
  permit_number?: string | null
  issue_date?: string | null
  expiry_date: string
  renewal_lead_days?: number
  cost_cents?: number | null
  notes?: string | null
  document_url?: string | null
  status?: PermitStatus
}

export type UpdatePermitInput = Partial<CreatePermitInput>

// ---- Helpers ----

const PERMIT_PATH = '/food-truck/permits'

function sanitizePermitInput(input: CreatePermitInput) {
  return {
    name: input.name.trim(),
    permit_type: input.permit_type,
    issuing_authority: input.issuing_authority?.trim() || null,
    permit_number: input.permit_number?.trim() || null,
    issue_date: input.issue_date || null,
    expiry_date: input.expiry_date,
    renewal_lead_days: input.renewal_lead_days ?? 30,
    cost_cents: input.cost_cents ?? null,
    notes: input.notes?.trim() || null,
    document_url: input.document_url?.trim() || null,
    status: input.status ?? 'active',
  }
}

// ---- CRUD ----

export async function createPermit(input: CreatePermitInput): Promise<Permit> {
  const user = await requireChef()
  const supabase = createServerClient()
  const data = sanitizePermitInput(input)

  const { data: permit, error } = await (supabase as any)
    .from('permits')
    .insert({
      tenant_id: user.tenantId!,
      ...data,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create permit: ${error.message}`)
  revalidatePath(PERMIT_PATH)
  return permit as Permit
}

export async function updatePermit(id: string, input: UpdatePermitInput): Promise<Permit> {
  const user = await requireChef()
  const supabase = createServerClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.permit_type !== undefined) updates.permit_type = input.permit_type
  if (input.issuing_authority !== undefined)
    updates.issuing_authority = input.issuing_authority?.trim() || null
  if (input.permit_number !== undefined) updates.permit_number = input.permit_number?.trim() || null
  if (input.issue_date !== undefined) updates.issue_date = input.issue_date || null
  if (input.expiry_date !== undefined) updates.expiry_date = input.expiry_date
  if (input.renewal_lead_days !== undefined) updates.renewal_lead_days = input.renewal_lead_days
  if (input.cost_cents !== undefined) updates.cost_cents = input.cost_cents
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null
  if (input.document_url !== undefined) updates.document_url = input.document_url?.trim() || null
  if (input.status !== undefined) updates.status = input.status

  const { data: permit, error } = await (supabase as any)
    .from('permits')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update permit: ${error.message}`)
  revalidatePath(PERMIT_PATH)
  return permit as Permit
}

export async function deletePermit(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('permits')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete permit: ${error.message}`)
  revalidatePath(PERMIT_PATH)
}

// ---- Queries ----

export async function getPermits(): Promise<Permit[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('permits')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to load permits: ${error.message}`)
  return (data ?? []) as Permit[]
}

export async function getExpiringPermits(daysAhead: number = 30): Promise<Permit[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const futureDate = new Date(now)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await (supabase as any)
    .from('permits')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')
    .gte('expiry_date', now.toISOString().split('T')[0])
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to load expiring permits: ${error.message}`)
  return (data ?? []) as Permit[]
}

export async function getExpiredPermits(): Promise<Permit[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await (supabase as any)
    .from('permits')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .lt('expiry_date', today)
    .in('status', ['active', 'pending_renewal'])
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to load expired permits: ${error.message}`)
  return (data ?? []) as Permit[]
}

export async function renewPermit(
  id: string,
  newExpiryDate: string,
  newCostCents?: number | null
): Promise<Permit> {
  const user = await requireChef()
  const supabase = createServerClient()

  const updates: Record<string, any> = {
    expiry_date: newExpiryDate,
    status: 'active',
    updated_at: new Date().toISOString(),
  }
  if (newCostCents !== undefined) updates.cost_cents = newCostCents

  const { data: permit, error } = await (supabase as any)
    .from('permits')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to renew permit: ${error.message}`)
  revalidatePath(PERMIT_PATH)
  return permit as Permit
}

export async function getPermitCostSummary(): Promise<{
  totalCents: number
  byType: Record<PermitType, number>
  count: number
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('permits')
    .select('permit_type, cost_cents')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['active', 'pending_renewal'])

  if (error) throw new Error(`Failed to load permit costs: ${error.message}`)

  const permits = (data ?? []) as Array<{ permit_type: PermitType; cost_cents: number | null }>
  const byType: Record<string, number> = {}
  let totalCents = 0

  for (const p of permits) {
    const cost = p.cost_cents ?? 0
    totalCents += cost
    byType[p.permit_type] = (byType[p.permit_type] ?? 0) + cost
  }

  return {
    totalCents,
    byType: byType as Record<PermitType, number>,
    count: permits.length,
  }
}

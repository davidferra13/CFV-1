'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PERMIT_TYPES, PERMIT_STATUSES } from './permit-constants'
import type { PermitType, PermitStatus } from './permit-constants'

// Types, labels, and constants are in permit-constants.ts - import from there in client components.
export type { PermitType, PermitStatus } from './permit-constants'

const PermitInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  permit_type: z.enum(PERMIT_TYPES),
  issuing_authority: z.string().optional().nullable(),
  permit_number: z.string().optional().nullable(),
  issue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date required (YYYY-MM-DD)'),
  renewal_lead_days: z.number().int().min(0).default(30),
  cost_cents: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  document_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(PERMIT_STATUSES).default('active'),
})

export type PermitInput = z.infer<typeof PermitInputSchema>

export interface PermitRow {
  id: string
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
}

export async function listPermits(): Promise<PermitRow[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('permits')
    .select('*')
    .eq('tenant_id', user.entityId)
    .order('expiry_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getExpiringPermits(withinDays = 60): Promise<PermitRow[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + withinDays)
  const { data, error } = await db
    .from('permits')
    .select('*')
    .eq('tenant_id', user.entityId)
    .in('status', ['active', 'pending_renewal'])
    .lte('expiry_date', cutoff.toISOString().slice(0, 10))
    .gte('expiry_date', new Date().toISOString().slice(0, 10))
    .order('expiry_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createPermit(input: unknown): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const parsed = PermitInputSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input')

  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('permits')
    .insert({
      tenant_id: user.entityId,
      name: parsed.data.name,
      permit_type: parsed.data.permit_type,
      issuing_authority: parsed.data.issuing_authority ?? null,
      permit_number: parsed.data.permit_number ?? null,
      issue_date: parsed.data.issue_date ?? null,
      expiry_date: parsed.data.expiry_date,
      renewal_lead_days: parsed.data.renewal_lead_days ?? 30,
      cost_cents: parsed.data.cost_cents ?? null,
      notes: parsed.data.notes ?? null,
      document_url: parsed.data.document_url || null,
      status: parsed.data.status ?? 'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
  return { success: true, id: data.id }
}

export async function updatePermitStatus(
  id: string,
  status: PermitStatus
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const { error } = await db
    .from('permits')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.entityId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
  return { success: true }
}

export async function deletePermit(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const { error } = await db.from('permits').delete().eq('id', id).eq('tenant_id', user.entityId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
  return { success: true }
}

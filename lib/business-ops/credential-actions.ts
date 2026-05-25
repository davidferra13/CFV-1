'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type CredentialType =
  | 'food_handler'
  | 'business_license'
  | 'event_permit'
  | 'certification'
  | 'other'

export type Credential = {
  id: string
  tenant_id: string
  credential_name: string
  credential_type: CredentialType
  issuing_authority: string | null
  credential_number: string | null
  issue_date: string | null
  expiry_date: string | null
  renewal_url: string | null
  document_path: string | null
  notes: string | null
  reminder_sent_30d: boolean
  reminder_sent_7d: boolean
  created_at: string
  updated_at: string
}

export type CreateCredentialInput = {
  credential_name: string
  credential_type: CredentialType
  issuing_authority?: string | null
  credential_number?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  renewal_url?: string | null
  notes?: string | null
}

export type UpdateCredentialInput = Partial<CreateCredentialInput>

// ============================================
// ACTIONS
// ============================================

export async function getCredentials(): Promise<Credential[]> {
  const user = await requireChef()
  const db = createServerClient()

  const { data, error } = await db
    .from('chef_credentials')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('expiry_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Failed to load credentials: ${error.message}`)
  return (data ?? []) as Credential[]
}

export async function createCredential(
  input: CreateCredentialInput
): Promise<{ success: true; credential: Credential }> {
  const user = await requireChef()
  const db = createServerClient()

  if (!input.credential_name?.trim()) {
    throw new Error('Credential name is required')
  }

  const { data, error } = await db
    .from('chef_credentials')
    .insert({
      tenant_id: user.tenantId!,
      credential_name: input.credential_name.trim(),
      credential_type: input.credential_type,
      issuing_authority: input.issuing_authority?.trim() || null,
      credential_number: input.credential_number?.trim() || null,
      issue_date: input.issue_date || null,
      expiry_date: input.expiry_date || null,
      renewal_url: input.renewal_url?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create credential: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true, credential: data as Credential }
}

export async function updateCredential(
  id: string,
  input: UpdateCredentialInput
): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.credential_name !== undefined) updates.credential_name = input.credential_name.trim()
  if (input.credential_type !== undefined) updates.credential_type = input.credential_type
  if (input.issuing_authority !== undefined)
    updates.issuing_authority = input.issuing_authority?.trim() || null
  if (input.credential_number !== undefined)
    updates.credential_number = input.credential_number?.trim() || null
  if (input.issue_date !== undefined) updates.issue_date = input.issue_date || null
  if (input.expiry_date !== undefined) updates.expiry_date = input.expiry_date || null
  if (input.renewal_url !== undefined) updates.renewal_url = input.renewal_url?.trim() || null
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  const { error } = await db
    .from('chef_credentials')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update credential: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

export async function deleteCredential(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient()

  const { error } = await db
    .from('chef_credentials')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete credential: ${error.message}`)

  revalidatePath('/business/ops')
  return { success: true }
}

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type ProposalAddon = {
  id: string
  chefId: string
  name: string
  description: string | null
  priceCentsPerPerson: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type AddonToggleResult = {
  addonId: string
  enabled: boolean
  addonPriceCentsPerPerson: number
  message: string
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateAddonSchema = z.object({
  name: z.string().min(1, 'Addon name is required'),
  description: z.string().optional(),
  priceCentsPerPerson: z.number().int().min(0),
  isDefault: z.boolean().optional(),
})

const UpdateAddonSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priceCentsPerPerson: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function createAddon(
  input: z.infer<typeof CreateAddonSchema>
): Promise<ProposalAddon> {
  const user = await requireChef()
  const parsed = CreateAddonSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('proposal_addons')
    .insert({
      chef_id: user.tenantId!,
      name: parsed.name,
      description: parsed.description || null,
      price_cents_per_person: parsed.priceCentsPerPerson,
      is_default: parsed.isDefault ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create addon: ${error.message}`)

  revalidatePath('/proposals')

  return mapAddon(data)
}

export async function listAddons(): Promise<ProposalAddon[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('proposal_addons')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to list addons: ${error.message}`)

  return (data || []).map(mapAddon)
}

export async function updateAddon(
  id: string,
  updates: z.infer<typeof UpdateAddonSchema>
): Promise<ProposalAddon> {
  const user = await requireChef()
  const parsed = UpdateAddonSchema.parse(updates)
  const supabase = createServerClient()

  // Build update payload — only include provided fields
  const payload: Record<string, unknown> = {}
  if (parsed.name !== undefined) payload.name = parsed.name
  if (parsed.description !== undefined) payload.description = parsed.description
  if (parsed.priceCentsPerPerson !== undefined) payload.price_cents_per_person = parsed.priceCentsPerPerson
  if (parsed.isDefault !== undefined) payload.is_default = parsed.isDefault

  if (Object.keys(payload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data, error } = await (supabase as any)
    .from('proposal_addons')
    .update(payload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update addon: ${error.message}`)

  revalidatePath('/proposals')

  return mapAddon(data)
}

export async function deleteAddon(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('proposal_addons')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete addon: ${error.message}`)

  revalidatePath('/proposals')
}

export async function toggleAddonForQuote(
  quoteId: string,
  addonId: string,
  enabled: boolean
): Promise<AddonToggleResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the addon to get its price (with tenant check)
  const { data: addon, error } = await (supabase as any)
    .from('proposal_addons')
    .select('id, name, price_cents_per_person')
    .eq('id', addonId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !addon) throw new Error(`Failed to fetch addon: ${error?.message || 'Not found'}`)

  // Placeholder: In a full implementation this would insert/remove a quote_line_item row.
  // For now we return the addon info so the caller can compute the new total client-side.
  return {
    addonId: addon.id,
    enabled,
    addonPriceCentsPerPerson: addon.price_cents_per_person,
    message: enabled
      ? `Addon "${addon.name}" enabled for quote ${quoteId}`
      : `Addon "${addon.name}" disabled for quote ${quoteId}`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapAddon(row: any): ProposalAddon {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    description: row.description,
    priceCentsPerPerson: row.price_cents_per_person,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Commerce Engine V1 - Product Modifier Actions
// CRUD for modifier groups, modifiers, and product assignments.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

export type CreateModifierGroupInput = {
  name: string
  selectionType: 'single' | 'multiple'
  required?: boolean
  minSelections?: number
  maxSelections?: number | null
  sortOrder?: number
}

export type UpdateModifierGroupInput = Partial<CreateModifierGroupInput> & { id: string }

export type AddModifierInput = {
  groupId: string
  name: string
  priceAdjustmentCents?: number
  isDefault?: boolean
  available?: boolean
  sortOrder?: number
}

export type UpdateModifierInput = {
  id: string
  name?: string
  priceAdjustmentCents?: number
  isDefault?: boolean
  available?: boolean
  sortOrder?: number
}

// ─── Modifier Groups ─────────────────────────────────────────────

export async function createModifierGroup(input: CreateModifierGroupInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  if (!input.name.trim()) {
    throw new Error('Group name is required')
  }

  const { data, error } = await (supabase
    .from('product_modifier_groups')
    .insert({
      chef_id: user.tenantId!,
      name: input.name.trim(),
      selection_type: input.selectionType,
      required: input.required ?? false,
      min_selections: input.minSelections ?? 0,
      max_selections: input.maxSelections ?? null,
      sort_order: input.sortOrder ?? 0,
    } as any)
    .select('id')
    .single() as any)

  if (error) throw new Error(`Failed to create modifier group: ${error.message}`)

  revalidatePath('/commerce/modifiers')
  revalidatePath('/commerce/products')
  return { id: data.id }
}

export async function updateModifierGroup(input: UpdateModifierGroupInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.selectionType !== undefined) updates.selection_type = input.selectionType
  if (input.required !== undefined) updates.required = input.required
  if (input.minSelections !== undefined) updates.min_selections = input.minSelections
  if (input.maxSelections !== undefined) updates.max_selections = input.maxSelections
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder

  const { error } = await (supabase
    .from('product_modifier_groups')
    .update(updates as any)
    .eq('id', input.id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update modifier group: ${error.message}`)

  revalidatePath('/commerce/modifiers')
  revalidatePath('/commerce/products')
}

export async function deleteModifierGroup(id: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('product_modifier_groups')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to delete modifier group: ${error.message}`)

  revalidatePath('/commerce/modifiers')
  revalidatePath('/commerce/products')
}

export async function getModifierGroups() {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: groups, error } = await (supabase
    .from('product_modifier_groups')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true }) as any)

  if (error) throw new Error(`Failed to fetch modifier groups: ${error.message}`)

  // Fetch modifiers for each group
  const groupIds = (groups ?? []).map((g: any) => g.id)
  let modifiers: any[] = []
  if (groupIds.length > 0) {
    const { data: mods } = await (supabase
      .from('product_modifiers')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .in('group_id', groupIds)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }) as any)
    modifiers = mods ?? []
  }

  // Attach modifiers to their groups
  return (groups ?? []).map((group: any) => ({
    ...group,
    modifiers: modifiers.filter((m: any) => m.group_id === group.id),
  }))
}

// ─── Modifiers ────────────────────────────────────────────────────

export async function addModifier(input: AddModifierInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  if (!input.name.trim()) {
    throw new Error('Modifier name is required')
  }

  const { data, error } = await (supabase
    .from('product_modifiers')
    .insert({
      group_id: input.groupId,
      chef_id: user.tenantId!,
      name: input.name.trim(),
      price_adjustment_cents: input.priceAdjustmentCents ?? 0,
      is_default: input.isDefault ?? false,
      available: input.available ?? true,
      sort_order: input.sortOrder ?? 0,
    } as any)
    .select('id')
    .single() as any)

  if (error) throw new Error(`Failed to add modifier: ${error.message}`)

  revalidatePath('/commerce/modifiers')
  return { id: data.id }
}

export async function updateModifier(input: UpdateModifierInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.priceAdjustmentCents !== undefined)
    updates.price_adjustment_cents = input.priceAdjustmentCents
  if (input.isDefault !== undefined) updates.is_default = input.isDefault
  if (input.available !== undefined) updates.available = input.available
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder

  if (Object.keys(updates).length === 0) return

  const { error } = await (supabase
    .from('product_modifiers')
    .update(updates as any)
    .eq('id', input.id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update modifier: ${error.message}`)

  revalidatePath('/commerce/modifiers')
}

export async function deleteModifier(id: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('product_modifiers')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to delete modifier: ${error.message}`)

  revalidatePath('/commerce/modifiers')
}

// ─── Product Assignments ──────────────────────────────────────────

export async function assignModifierGroupToProduct(productId: string, groupId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('product_modifier_assignments')
    .insert({
      product_id: productId,
      modifier_group_id: groupId,
      chef_id: user.tenantId!,
    } as any)
    .select('id')
    .single() as any)

  if (error) {
    if (error.code === '23505') {
      throw new Error('This modifier group is already assigned to this product')
    }
    throw new Error(`Failed to assign modifier group: ${error.message}`)
  }

  revalidatePath('/commerce/products')
}

export async function removeModifierGroupFromProduct(productId: string, groupId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('product_modifier_assignments')
    .delete()
    .eq('product_id', productId)
    .eq('modifier_group_id', groupId)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to remove modifier group: ${error.message}`)

  revalidatePath('/commerce/products')
}

export async function getProductModifiers(productId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Get assignments for this product
  const { data: assignments, error: aErr } = await (supabase
    .from('product_modifier_assignments')
    .select('modifier_group_id')
    .eq('product_id', productId)
    .eq('chef_id', user.tenantId!) as any)

  if (aErr) throw new Error(`Failed to fetch product modifiers: ${aErr.message}`)

  const groupIds = (assignments ?? []).map((a: any) => a.modifier_group_id)
  if (groupIds.length === 0) return []

  // Fetch groups
  const { data: groups } = await (supabase
    .from('product_modifier_groups')
    .select('*')
    .in('id', groupIds)
    .eq('chef_id', user.tenantId!)
    .order('sort_order', { ascending: true }) as any)

  // Fetch modifiers
  const { data: modifiers } = await (supabase
    .from('product_modifiers')
    .select('*')
    .in('group_id', groupIds)
    .eq('chef_id', user.tenantId!)
    .eq('available', true)
    .order('sort_order', { ascending: true }) as any)

  return (groups ?? []).map((group: any) => ({
    ...group,
    modifiers: (modifiers ?? []).filter((m: any) => m.group_id === group.id),
  }))
}

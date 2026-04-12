'use server'

// Reorder Settings Server Actions
// CRUD for per-ingredient par level / reorder quantity configuration.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type ReorderSetting = {
  id: string
  ingredient_name: string
  par_level: number
  reorder_qty: number
  unit: string
  preferred_vendor_id: string | null
  preferred_vendor_name: string | null
  is_active: boolean
}

export type UpsertReorderSettingInput = {
  ingredient_name: string
  par_level: number
  reorder_qty: number
  unit: string
  preferred_vendor_id?: string | null
  is_active?: boolean
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function getReorderSettings(): Promise<ReorderSetting[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('reorder_settings')
    .select(
      'id, ingredient_name, par_level, reorder_qty, unit, preferred_vendor_id, is_active, vendors(name)'
    )
    .eq('chef_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data as any[]) || []).map((row) => ({
    id: row.id,
    ingredient_name: row.ingredient_name,
    par_level: Number(row.par_level),
    reorder_qty: Number(row.reorder_qty),
    unit: row.unit,
    preferred_vendor_id: row.preferred_vendor_id,
    preferred_vendor_name: row.vendors?.name ?? null,
    is_active: row.is_active,
  }))
}

// ── Upsert ───────────────────────────────────────────────────────────────────

export async function upsertReorderSetting(
  input: UpsertReorderSettingInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!input.ingredient_name.trim()) {
    return { success: false, error: 'Ingredient name is required' }
  }
  if (input.par_level < 0 || input.reorder_qty < 0) {
    return { success: false, error: 'Par level and reorder quantity must be non-negative' }
  }

  const { error } = await db.from('reorder_settings').upsert(
    {
      chef_id: user.tenantId!,
      ingredient_name: input.ingredient_name.trim(),
      par_level: input.par_level,
      reorder_qty: input.reorder_qty,
      unit: input.unit || 'each',
      preferred_vendor_id: input.preferred_vendor_id ?? null,
      is_active: input.is_active ?? true,
    },
    { onConflict: 'chef_id,ingredient_name' }
  )

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/reorder')
  revalidatePath('/inventory/demand')
  return { success: true }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteReorderSetting(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('reorder_settings')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/reorder')
  revalidatePath('/inventory/demand')
  return { success: true }
}

// ── Toggle active ────────────────────────────────────────────────────────────

export async function toggleReorderSetting(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('reorder_settings')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/reorder')
  revalidatePath('/inventory/demand')
  return { success: true }
}

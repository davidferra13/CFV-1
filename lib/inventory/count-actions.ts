// Inventory Count Server Actions
// Chef-only: Track ingredient inventory levels, par alerts, and reorder suggestions

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type InventoryCount = {
  id: string
  chefId: string
  ingredientId: string | null
  ingredientName: string
  currentQty: number
  parLevel: number | null
  unit: string
  lastCountedAt: string
  vendorId: string | null
  createdAt: string
  updatedAt: string
}

export type ParAlert = {
  id: string
  ingredientName: string
  currentQty: number
  parLevel: number
  unit: string
  deficit: number
  vendorId: string | null
}

export type ReorderGroup = {
  vendorId: string | null
  items: {
    id: string
    ingredientName: string
    currentQty: number
    parLevel: number
    unit: string
    deficit: number
  }[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const UpdateInventoryCountSchema = z.object({
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  currentQty: z.number().min(0, 'Quantity cannot be negative'),
  parLevel: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  vendorId: z.string().uuid().optional(),
})

export type UpdateInventoryCountInput = z.infer<typeof UpdateInventoryCountSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Upsert an inventory count by chef_id + ingredient_name.
 * Creates the record if it doesn't exist, updates if it does.
 */
export async function updateInventoryCount(
  input: UpdateInventoryCountInput
): Promise<InventoryCount> {
  const user = await requireChef()
  const parsed = UpdateInventoryCountSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('inventory_counts')
    .upsert(
      {
        chef_id: user.tenantId!,
        ingredient_name: parsed.ingredientName,
        current_qty: parsed.currentQty,
        par_level: parsed.parLevel ?? null,
        unit: parsed.unit,
        vendor_id: parsed.vendorId ?? null,
        last_counted_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id,ingredient_name' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to update inventory count: ${error.message}`)

  revalidatePath('/inventory')

  return {
    id: data.id,
    chefId: data.chef_id,
    ingredientId: data.ingredient_id,
    ingredientName: data.ingredient_name,
    currentQty: parseFloat(data.current_qty),
    parLevel: data.par_level != null ? parseFloat(data.par_level) : null,
    unit: data.unit,
    lastCountedAt: data.last_counted_at,
    vendorId: data.vendor_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Get all inventory items for the current chef, ordered by ingredient name.
 */
export async function getInventoryCounts(): Promise<InventoryCount[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('inventory_counts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch inventory counts: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    currentQty: parseFloat(row.current_qty),
    parLevel: row.par_level != null ? parseFloat(row.par_level) : null,
    unit: row.unit,
    lastCountedAt: row.last_counted_at,
    vendorId: row.vendor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Get items where current_qty < par_level (items needing restock).
 */
export async function getParAlerts(): Promise<ParAlert[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch items that have a par_level set
  const { data, error } = await (supabase as any)
    .from('inventory_counts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)
    .order('ingredient_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch par alerts: ${error.message}`)

  // Filter client-side: current_qty < par_level
  return (data || [])
    .filter((row: any) => parseFloat(row.current_qty) < parseFloat(row.par_level))
    .map((row: any) => ({
      id: row.id,
      ingredientName: row.ingredient_name,
      currentQty: parseFloat(row.current_qty),
      parLevel: parseFloat(row.par_level),
      unit: row.unit,
      deficit: parseFloat(row.par_level) - parseFloat(row.current_qty),
      vendorId: row.vendor_id,
    }))
}

/**
 * Get items below par level grouped by vendor for easy reordering.
 * Items without a vendor are grouped under vendorId = null.
 */
export async function getReorderSuggestions(): Promise<ReorderGroup[]> {
  const alerts = await getParAlerts()

  // Group by vendor_id
  const groups = new Map<string | null, ReorderGroup>()

  for (const alert of alerts) {
    const key = alert.vendorId
    if (!groups.has(key)) {
      groups.set(key, { vendorId: key, items: [] })
    }
    groups.get(key)!.items.push({
      id: alert.id,
      ingredientName: alert.ingredientName,
      currentQty: alert.currentQty,
      parLevel: alert.parLevel,
      unit: alert.unit,
      deficit: alert.deficit,
    })
  }

  // Sort groups: named vendors first, null vendor last
  return Array.from(groups.values()).sort((a, b) => {
    if (a.vendorId === null) return 1
    if (b.vendorId === null) return -1
    return 0
  })
}

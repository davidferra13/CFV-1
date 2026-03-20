'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type StoreType =
  | 'supermarket'
  | 'costco_wholesale'
  | 'farmers_market'
  | 'specialty'
  | 'butcher'
  | 'fishmonger'
  | 'bakery'
  | 'international'
  | 'online'
  | 'other'

export type AssignmentReason = 'best_price' | 'best_quality' | 'only_source' | 'convenience'

export type PreferredStore = {
  id: string
  chef_id: string
  store_name: string
  store_type: StoreType
  address: string | null
  notes: string | null
  is_default: boolean
  sort_order: number
  created_at: string
}

export type StoreAssignment = {
  id: string
  chef_id: string
  ingredient_keyword: string
  store_id: string
  reason: AssignmentReason | null
  created_at: string
}

export type GroceryItem = {
  name: string
  quantity: number | string
  unit: string
}

export type StoreSplit = {
  store: PreferredStore
  items: GroceryItem[]
}

// ============================================
// PREFERRED STORES
// ============================================

export async function getPreferredStores(): Promise<PreferredStore[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_preferred_stores')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('sort_order', { ascending: true })
    .order('store_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addPreferredStore(input: {
  store_name: string
  store_type: StoreType
  address?: string
  notes?: string
  is_default?: boolean
  sort_order?: number
}): Promise<PreferredStore> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // If setting as default, unset other defaults first
  if (input.is_default) {
    await (supabase as any)
      .from('chef_preferred_stores')
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
  }

  const { data, error } = await (supabase as any)
    .from('chef_preferred_stores')
    .insert({
      chef_id: user.tenantId!,
      store_name: input.store_name.trim(),
      store_type: input.store_type,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      is_default: input.is_default ?? false,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/grocery')
  return data
}

export async function updatePreferredStore(
  id: string,
  input: {
    store_name?: string
    store_type?: StoreType
    address?: string | null
    notes?: string | null
    is_default?: boolean
    sort_order?: number
  }
): Promise<PreferredStore> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // If setting as default, unset other defaults first
  if (input.is_default) {
    await (supabase as any)
      .from('chef_preferred_stores')
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
  }

  const updateData: Record<string, unknown> = {}
  if (input.store_name !== undefined) updateData.store_name = input.store_name.trim()
  if (input.store_type !== undefined) updateData.store_type = input.store_type
  if (input.address !== undefined) updateData.address = input.address?.trim() || null
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null
  if (input.is_default !== undefined) updateData.is_default = input.is_default
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order

  const { data, error } = await (supabase as any)
    .from('chef_preferred_stores')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/grocery')
  return data
}

export async function deletePreferredStore(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await (supabase as any)
    .from('chef_preferred_stores')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/grocery')
}

// ============================================
// ITEM-TO-STORE ASSIGNMENTS
// ============================================

export async function assignItemToStore(
  keyword: string,
  storeId: string,
  reason?: AssignmentReason
): Promise<StoreAssignment> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalizedKeyword = keyword.trim().toLowerCase()

  const { data, error } = await (supabase as any)
    .from('store_item_assignments')
    .upsert(
      {
        chef_id: user.tenantId!,
        ingredient_keyword: normalizedKeyword,
        store_id: storeId,
        reason: reason ?? null,
      },
      { onConflict: 'chef_id,ingredient_keyword' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/grocery')
  return data
}

export async function getStoreAssignments(): Promise<
  (StoreAssignment & { store: PreferredStore })[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('store_item_assignments')
    .select('*, store:chef_preferred_stores(*)')
    .eq('chef_id', user.tenantId!)
    .order('ingredient_keyword', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function deleteStoreAssignment(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await (supabase as any)
    .from('store_item_assignments')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/grocery')
}

export async function getStoreShoppingList(storeId: string): Promise<StoreAssignment[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('store_item_assignments')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('store_id', storeId)
    .order('ingredient_keyword', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function bulkAssignItems(
  assignments: { keyword: string; storeId: string; reason?: AssignmentReason }[]
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const rows = assignments.map((a) => ({
    chef_id: user.tenantId!,
    ingredient_keyword: a.keyword.trim().toLowerCase(),
    store_id: a.storeId,
    reason: a.reason ?? null,
  }))

  const { error } = await (supabase as any)
    .from('store_item_assignments')
    .upsert(rows, { onConflict: 'chef_id,ingredient_keyword' })

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/grocery')
}

// ============================================
// SPLIT LIST BY STORE
// ============================================

/**
 * Takes a flat grocery list and splits it by store based on saved assignments.
 * Unassigned items go to the default store (or an "Unassigned" bucket).
 * Pure keyword-based lookup, no AI. Formula > AI.
 */
export async function splitListByStore(
  items: GroceryItem[]
): Promise<{ splits: StoreSplit[]; unassigned: GroceryItem[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch stores and assignments in parallel
  const [storesResult, assignmentsResult] = await Promise.all([
    (supabase as any)
      .from('chef_preferred_stores')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .order('sort_order', { ascending: true }),
    (supabase as any).from('store_item_assignments').select('*').eq('chef_id', user.tenantId!),
  ])

  if (storesResult.error) throw new Error(storesResult.error.message)
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)

  const stores: PreferredStore[] = storesResult.data ?? []
  const assignments: StoreAssignment[] = assignmentsResult.data ?? []

  // Build keyword -> store_id lookup
  const keywordToStore = new Map<string, string>()
  for (const a of assignments) {
    keywordToStore.set(a.ingredient_keyword.toLowerCase(), a.store_id)
  }

  // Find default store
  const defaultStore = stores.find((s) => s.is_default)

  // Split items by store
  const storeItemsMap = new Map<string, GroceryItem[]>()
  const unassigned: GroceryItem[] = []

  for (const item of items) {
    const normalizedName = item.name.trim().toLowerCase()

    // Try exact match first, then check if any keyword is contained in the item name
    let matchedStoreId = keywordToStore.get(normalizedName)

    if (!matchedStoreId) {
      // Check if any saved keyword is a substring of this item name
      for (const [keyword, storeId] of keywordToStore) {
        if (normalizedName.includes(keyword) || keyword.includes(normalizedName)) {
          matchedStoreId = storeId
          break
        }
      }
    }

    if (!matchedStoreId && defaultStore) {
      matchedStoreId = defaultStore.id
    }

    if (matchedStoreId) {
      const existing = storeItemsMap.get(matchedStoreId) ?? []
      existing.push(item)
      storeItemsMap.set(matchedStoreId, existing)
    } else {
      unassigned.push(item)
    }
  }

  // Build result with store metadata
  const splits: StoreSplit[] = []
  for (const store of stores) {
    const storeItems = storeItemsMap.get(store.id)
    if (storeItems && storeItems.length > 0) {
      splits.push({ store, items: storeItems })
    }
  }

  return { splits, unassigned }
}

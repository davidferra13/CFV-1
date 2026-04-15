'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function flagIngredientEntry(params: {
  ingredientName: string
  storeProductId?: number | null
  vendorName?: string | null
  source: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    await db.from('ingredient_accuracy_flags').insert({
      chef_id: user.tenantId!,
      ingredient_name: params.ingredientName.trim(),
      store_product_id: params.storeProductId ?? null,
      vendor_name: params.vendorName ?? null,
      source: params.source,
      reason: params.reason ?? null,
    })
    return { success: true }
  } catch (err) {
    console.error('[ingredient-flags] flag insert error:', err)
    return { success: false, error: 'Failed to save flag.' }
  }
}

export async function getFlaggedEntries(
  ingredientName: string
): Promise<{ storeProductIds: number[]; vendorNames: string[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Q45: Guard DB query - unguarded throw crashes the parent ingredient
  // resolution call. Return empty on failure so resolution degrades gracefully.
  let data: any[] | null = null
  try {
    const result = await db
      .from('ingredient_accuracy_flags')
      .select('store_product_id, vendor_name')
      .eq('chef_id', user.tenantId!)
      .ilike('ingredient_name', `%${ingredientName.trim()}%`)
      .eq('reviewed', false)
    data = result.data
  } catch (err) {
    console.error('[ingredient-flags] getFlaggedEntries query failed:', err)
    return { storeProductIds: [], vendorNames: [] }
  }

  if (!data?.length) return { storeProductIds: [], vendorNames: [] }

  return {
    storeProductIds: data
      .filter((r: any) => r.store_product_id)
      .map((r: any) => r.store_product_id),
    vendorNames: data.filter((r: any) => r.vendor_name).map((r: any) => r.vendor_name),
  }
}

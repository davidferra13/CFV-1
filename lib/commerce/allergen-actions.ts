// Menu Allergen Flagging Actions
// Manage allergen labels and dietary flags on product projections.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Constants ───────────────────────────────────────────────────

export const ALLERGENS = [
  { id: 'milk', label: 'Milk', icon: '🥛' },
  { id: 'eggs', label: 'Eggs', icon: '🥚' },
  { id: 'fish', label: 'Fish', icon: '🐟' },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { id: 'tree_nuts', label: 'Tree Nuts', icon: '🌰' },
  { id: 'peanuts', label: 'Peanuts', icon: '🥜' },
  { id: 'wheat', label: 'Wheat', icon: '🌾' },
  { id: 'soy', label: 'Soy', icon: '🫘' },
  { id: 'sesame', label: 'Sesame', icon: '⚪' },
] as const

export const DIETARY_FLAGS = [
  { id: 'vegetarian', label: 'Vegetarian', color: 'bg-green-600' },
  { id: 'vegan', label: 'Vegan', color: 'bg-green-700' },
  { id: 'gluten_free', label: 'Gluten Free', color: 'bg-amber-600' },
  { id: 'dairy_free', label: 'Dairy Free', color: 'bg-blue-600' },
  { id: 'nut_free', label: 'Nut Free', color: 'bg-orange-600' },
  { id: 'keto', label: 'Keto', color: 'bg-purple-600' },
  { id: 'halal', label: 'Halal', color: 'bg-teal-600' },
  { id: 'kosher', label: 'Kosher', color: 'bg-indigo-600' },
] as const

// ─── Types ───────────────────────────────────────────────────────

export type ProductAllergenInfo = {
  productId: string
  productName: string
  category: string | null
  allergens: string[]
  dietaryFlags: string[]
}

// ─── Actions ─────────────────────────────────────────────────────

export async function updateProductAllergens(
  productId: string,
  allergens: string[],
  dietaryFlags: string[]
): Promise<{ success: true }> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('product_projections')
    .update({
      allergen_flags: allergens,
      dietary_tags: dietaryFlags,
    })
    .eq('id', productId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update allergens: ${error.message}`)

  revalidatePath('/commerce/products')
  return { success: true }
}

export async function getProductAllergens(productId: string): Promise<ProductAllergenInfo> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('product_projections')
    .select('id, name, category, allergen_flags, dietary_tags')
    .eq('id', productId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (error) throw new Error(`Failed to load product allergens: ${error.message}`)

  return {
    productId: data.id,
    productName: data.name,
    category: data.category,
    allergens: data.allergen_flags ?? [],
    dietaryFlags: data.dietary_tags ?? [],
  }
}

export async function getMenuAllergenMatrix(): Promise<ProductAllergenInfo[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('product_projections')
    .select('id, name, category, allergen_flags, dietary_tags')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('category')
    .order('name') as any)

  if (error) throw new Error(`Failed to load allergen matrix: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    productId: row.id,
    productName: row.name,
    category: row.category,
    allergens: row.allergen_flags ?? [],
    dietaryFlags: row.dietary_tags ?? [],
  }))
}

export async function filterMenuByDietary(flags: string[]): Promise<ProductAllergenInfo[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('product_projections')
    .select('id, name, category, allergen_flags, dietary_tags')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .overlaps('dietary_tags', flags)
    .order('category')
    .order('name') as any)

  if (error) throw new Error(`Failed to filter by dietary flags: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    productId: row.id,
    productName: row.name,
    category: row.category,
    allergens: row.allergen_flags ?? [],
    dietaryFlags: row.dietary_tags ?? [],
  }))
}

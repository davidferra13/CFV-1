'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SEED_INGREDIENTS, expandSeedIngredient } from './seed-data'

// ---------------------------------------------------------------------------
// Search system ingredients (full-text + category filter)
// ---------------------------------------------------------------------------
export async function searchSystemIngredients(query: string, category?: string, limit = 50) {
  const supabase: any = createServerClient()

  let q = supabase
    .from('system_ingredients')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(limit)

  if (category) {
    q = q.eq('category', category)
  }

  if (query.trim().length > 0) {
    // Use ilike for partial matching (trigram index helps perf)
    q = q.ilike('name', `%${query.trim()}%`)
  }

  const { data, error } = await q

  if (error) {
    console.error('[searchSystemIngredients]', error)
    return []
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// Get distinct categories from system_ingredients
// ---------------------------------------------------------------------------
export async function getSystemIngredientCategories(): Promise<string[]> {
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('system_ingredients')
    .select('category')
    .eq('is_active', true)

  if (error || !data) {
    console.error('[getSystemIngredientCategories]', error)
    return []
  }

  const unique = [...new Set(data.map((r: any) => r.category as string))]
  unique.sort()
  return unique
}

// ---------------------------------------------------------------------------
// Import a single system ingredient into the chef's personal ingredient list
// ---------------------------------------------------------------------------
export async function importSystemIngredient(systemIngredientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the system ingredient
  const { data: si, error: fetchErr } = await supabase
    .from('system_ingredients')
    .select('*')
    .eq('id', systemIngredientId)
    .single()

  if (fetchErr || !si) {
    console.error('[importSystemIngredient] not found', fetchErr)
    throw new Error('System ingredient not found')
  }

  // Check for duplicate by name
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', si.name)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, reason: 'duplicate', existingId: existing[0].id }
  }

  // Insert into chef's ingredients table
  const { data: inserted, error: insertErr } = await supabase
    .from('ingredients')
    .insert({
      tenant_id: user.tenantId!,
      name: si.name,
      category: si.category,
      default_unit: si.standard_unit,
      allergen_flags: si.allergen_tags ?? [],
      average_price_cents: si.cost_per_unit_cents || null,
      is_staple: false,
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[importSystemIngredient] insert failed', insertErr)
    throw new Error('Failed to import ingredient')
  }

  revalidatePath('/ingredients')
  return { success: true, ingredientId: inserted.id }
}

// ---------------------------------------------------------------------------
// Bulk import system ingredients
// ---------------------------------------------------------------------------
export async function bulkImportSystemIngredients(ids: string[]) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (ids.length === 0) return { imported: 0, skipped: 0 }
  if (ids.length > 200) throw new Error('Maximum 200 ingredients per import')

  // Fetch all requested system ingredients
  const { data: systemIngredients, error: fetchErr } = await supabase
    .from('system_ingredients')
    .select('*')
    .in('id', ids)

  if (fetchErr || !systemIngredients) {
    throw new Error('Failed to fetch system ingredients')
  }

  // Get existing ingredient names for dedup
  const { data: existingNames } = await supabase
    .from('ingredients')
    .select('name')
    .eq('tenant_id', user.tenantId!)

  const existingSet = new Set(
    (existingNames ?? []).map((e: any) => (e.name as string).toLowerCase())
  )

  // Filter out duplicates
  const toInsert = systemIngredients.filter(
    (si: any) => !existingSet.has((si.name as string).toLowerCase())
  )

  if (toInsert.length === 0) {
    return { imported: 0, skipped: ids.length }
  }

  const rows = toInsert.map((si: any) => ({
    tenant_id: user.tenantId!,
    name: si.name,
    category: si.category,
    default_unit: si.standard_unit,
    allergen_flags: si.allergen_tags ?? [],
    average_price_cents: si.cost_per_unit_cents || null,
    is_staple: false,
  }))

  const { error: insertErr } = await supabase.from('ingredients').insert(rows)

  if (insertErr) {
    console.error('[bulkImportSystemIngredients] insert failed', insertErr)
    throw new Error('Failed to import ingredients')
  }

  revalidatePath('/ingredients')
  return {
    imported: toInsert.length,
    skipped: ids.length - toInsert.length,
  }
}

// ---------------------------------------------------------------------------
// Seed system_ingredients table from seed-data.ts (admin only)
// ---------------------------------------------------------------------------
export async function seedSystemIngredients() {
  const user = await requireChef()

  // Only admins can seed
  const { isAdmin } = await import('@/lib/auth/admin')
  if (!(await isAdmin())) {
    throw new Error('Only admins can seed system ingredients')
  }

  const supabase: any = createServerClient()

  // Check if already seeded
  const { count } = await supabase
    .from('system_ingredients')
    .select('*', { count: 'exact', head: true })

  if (count && count > 100) {
    return { success: false, reason: 'already_seeded', count }
  }

  // Expand and insert in batches
  const expanded = SEED_INGREDIENTS.map(expandSeedIngredient)
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < expanded.length; i += batchSize) {
    const batch = expanded.slice(i, i + batchSize)
    const { error } = await supabase.from('system_ingredients').insert(batch)

    if (error) {
      console.error(`[seedSystemIngredients] batch ${i} failed:`, error)
      throw new Error(`Seed failed at batch starting index ${i}: ${error.message}`)
    }
    inserted += batch.length
  }

  return { success: true, inserted }
}

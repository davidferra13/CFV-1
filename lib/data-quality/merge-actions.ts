// Data Quality: Merge and Dismiss Actions
// Server actions for merging duplicate entities and dismissing false positives.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Validation ─────────────────────────────────────────────────────────────

const MergeSchema = z.object({
  keepId: z.string().uuid(),
  removeId: z.string().uuid(),
})

const DismissSchema = z.object({
  entityType: z.enum(['client', 'ingredient', 'recipe']),
  entityId1: z.string().uuid(),
  entityId2: z.string().uuid(),
})

// ─── Merge Clients ──────────────────────────────────────────────────────────

export async function mergeClients(
  keepId: string,
  removeId: string
): Promise<{ success: boolean; error?: string; movedRecords?: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const parsed = MergeSchema.safeParse({ keepId, removeId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  if (keepId === removeId) {
    return { success: false, error: 'Cannot merge a client into itself' }
  }

  // Verify both clients belong to this tenant
  const [{ data: keepClient }, { data: removeClient }] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('id', keepId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('id', removeId)
      .eq('tenant_id', tenantId)
      .single(),
  ])

  if (!keepClient || !removeClient) {
    return { success: false, error: 'Client not found' }
  }

  // Reassign all linked records to the kept client
  const tablesToReassign = [
    'inquiries',
    'events',
    'messages',
    'client_notes',
    'client_tags',
    'client_allergy_records',
    'client_preferences',
    'loyalty_transactions',
    'client_referrals',
    'quotes',
    'conversations',
    'follow_up_sends',
    'client_touchpoint_rules',
    'ledger_entries',
    'contracts',
    'client_dietary_logs',
  ]

  let movedRecords = 0

  for (const table of tablesToReassign) {
    try {
      const { data } = await db
        .from(table as any)
        .update({ client_id: keepId })
        .eq('client_id', removeId)
        .eq('tenant_id', tenantId)
        .select('id')

      if (data) movedRecords += data.length
    } catch {
      // Some tables may not exist or have different columns; skip silently
    }
  }

  // Reassign referrer references
  try {
    await db
      .from('client_referrals' as any)
      .update({ referrer_client_id: keepId })
      .eq('referrer_client_id', removeId)
      .eq('tenant_id', tenantId)
  } catch {
    // non-blocking
  }

  // Soft-delete the merged client
  await db
    .from('clients')
    .update({
      deleted_at: new Date().toISOString(),
      full_name: `[MERGED] ${removeClient.full_name}`,
    })
    .eq('id', removeId)
    .eq('tenant_id', tenantId)

  revalidatePath('/clients')
  revalidatePath('/settings/data-quality')

  return { success: true, movedRecords }
}

// ─── Merge Ingredients ──────────────────────────────────────────────────────

export async function mergeIngredients(
  keepId: string,
  removeId: string
): Promise<{ success: boolean; error?: string; movedRecords?: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const parsed = MergeSchema.safeParse({ keepId, removeId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  if (keepId === removeId) {
    return { success: false, error: 'Cannot merge an ingredient into itself' }
  }

  // Verify both belong to tenant
  const [{ data: keepItem }, { data: removeItem }] = await Promise.all([
    db
      .from('ingredients')
      .select('id, name')
      .eq('id', keepId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('ingredients')
      .select('id, name')
      .eq('id', removeId)
      .eq('tenant_id', tenantId)
      .single(),
  ])

  if (!keepItem || !removeItem) {
    return { success: false, error: 'Ingredient not found' }
  }

  let movedRecords = 0

  // Update recipe_ingredients: reassign to kept ingredient
  // First check for conflicts (same recipe already has the kept ingredient)
  const { data: removeLinks } = await db
    .from('recipe_ingredients')
    .select('id, recipe_id')
    .eq('ingredient_id', removeId)

  if (removeLinks && removeLinks.length > 0) {
    const { data: keepLinks } = await db
      .from('recipe_ingredients')
      .select('recipe_id')
      .eq('ingredient_id', keepId)

    const keepRecipeIds = new Set((keepLinks || []).map((l: any) => l.recipe_id))

    for (const link of removeLinks) {
      if (keepRecipeIds.has(link.recipe_id)) {
        // Recipe already has the kept ingredient; delete the duplicate link
        await db.from('recipe_ingredients').delete().eq('id', link.id)
      } else {
        // Safe to reassign
        await db
          .from('recipe_ingredients')
          .update({ ingredient_id: keepId })
          .eq('id', link.id)
        movedRecords++
      }
    }
  }

  // Update ingredient_price_history
  try {
    const { data } = await db
      .from('ingredient_price_history')
      .update({ ingredient_id: keepId })
      .eq('ingredient_id', removeId)
      .eq('tenant_id', tenantId)
      .select('id')

    if (data) movedRecords += data.length
  } catch {
    // table may not exist
  }

  // Update shopping_list_items if they exist
  try {
    const { data: removeShopItems } = await db
      .from('shopping_list_items')
      .select('id, shopping_list_id')
      .eq('ingredient_id', removeId)

    if (removeShopItems && removeShopItems.length > 0) {
      const { data: keepShopItems } = await db
        .from('shopping_list_items')
        .select('shopping_list_id')
        .eq('ingredient_id', keepId)

      const keepListIds = new Set((keepShopItems || []).map((s: any) => s.shopping_list_id))

      for (const item of removeShopItems) {
        if (keepListIds.has(item.shopping_list_id)) {
          await db.from('shopping_list_items').delete().eq('id', item.id)
        } else {
          await db
            .from('shopping_list_items')
            .update({ ingredient_id: keepId })
            .eq('id', item.id)
          movedRecords++
        }
      }
    }
  } catch {
    // table may not exist
  }

  // Archive the removed ingredient
  await db
    .from('ingredients')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      name: `[MERGED] ${removeItem.name}`,
    })
    .eq('id', removeId)
    .eq('tenant_id', tenantId)

  revalidatePath('/recipes')
  revalidatePath('/settings/data-quality')

  return { success: true, movedRecords }
}

// ─── Merge Recipes ──────────────────────────────────────────────────────────

export async function mergeRecipes(
  keepId: string,
  removeId: string
): Promise<{ success: boolean; error?: string; movedRecords?: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const parsed = MergeSchema.safeParse({ keepId, removeId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  if (keepId === removeId) {
    return { success: false, error: 'Cannot merge a recipe into itself' }
  }

  // Verify both belong to tenant
  const [{ data: keepItem }, { data: removeItem }] = await Promise.all([
    db
      .from('recipes')
      .select('id, name, times_cooked, dietary_tags, occasion_tags')
      .eq('id', keepId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('recipes')
      .select('id, name, times_cooked, dietary_tags, occasion_tags')
      .eq('id', removeId)
      .eq('tenant_id', tenantId)
      .single(),
  ])

  if (!keepItem || !removeItem) {
    return { success: false, error: 'Recipe not found' }
  }

  let movedRecords = 0

  // Merge times_cooked (add together)
  const combinedTimesCooked = (keepItem.times_cooked || 0) + (removeItem.times_cooked || 0)

  // Merge tags (union of both sets)
  const mergedDietaryTags = [
    ...new Set([...(keepItem.dietary_tags || []), ...(removeItem.dietary_tags || [])].filter(Boolean)),
  ]
  const mergedOccasionTags = [
    ...new Set(
      [...(keepItem.occasion_tags || []), ...(removeItem.occasion_tags || [])].filter(Boolean)
    ),
  ]

  await db
    .from('recipes')
    .update({
      times_cooked: combinedTimesCooked,
      dietary_tags: mergedDietaryTags,
      occasion_tags: mergedOccasionTags,
    })
    .eq('id', keepId)
    .eq('tenant_id', tenantId)

  // Move recipe ingredients that the kept recipe does not already have
  const { data: removeIngredients } = await db
    .from('recipe_ingredients')
    .select('id, ingredient_id')
    .eq('recipe_id', removeId)

  if (removeIngredients && removeIngredients.length > 0) {
    const { data: keepIngredients } = await db
      .from('recipe_ingredients')
      .select('ingredient_id')
      .eq('recipe_id', keepId)

    const keepIngredientIds = new Set((keepIngredients || []).map((i: any) => i.ingredient_id))

    for (const ri of removeIngredients) {
      if (!keepIngredientIds.has(ri.ingredient_id)) {
        await db
          .from('recipe_ingredients')
          .update({ recipe_id: keepId })
          .eq('id', ri.id)
        movedRecords++
      }
    }
  }

  // Update dish references (dishes link to recipes via components or dish_index)
  try {
    const { data } = await db
      .from('dish_index')
      .update({ linked_recipe_id: keepId })
      .eq('linked_recipe_id', removeId)
      .select('id')

    if (data) movedRecords += data.length
  } catch {
    // table may not exist or column missing
  }

  // Update components that reference this recipe
  try {
    const { data } = await db
      .from('components')
      .update({ recipe_id: keepId })
      .eq('recipe_id', removeId)
      .select('id')

    if (data) movedRecords += data.length
  } catch {
    // non-blocking
  }

  // Update inquiry recipe links
  try {
    const { data } = await db
      .from('inquiry_recipe_links')
      .update({ recipe_id: keepId })
      .eq('recipe_id', removeId)
      .select('id')

    if (data) movedRecords += data.length
  } catch {
    // non-blocking
  }

  // Archive the removed recipe
  await db
    .from('recipes')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      name: `[MERGED] ${removeItem.name}`,
    })
    .eq('id', removeId)
    .eq('tenant_id', tenantId)

  revalidatePath('/recipes')
  revalidatePath('/settings/data-quality')

  return { success: true, movedRecords }
}

// ─── Dismiss Duplicate ──────────────────────────────────────────────────────

export async function dismissDuplicate(
  entityType: 'client' | 'ingredient' | 'recipe',
  entityId1: string,
  entityId2: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const parsed = DismissSchema.safeParse({ entityType, entityId1, entityId2 })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  // Sort IDs for consistency
  const [id1, id2] = [entityId1, entityId2].sort()

  // Check if already dismissed
  const { data: existing } = await db
    .from('dismissed_duplicates')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id_1', id1)
    .eq('entity_id_2', id2)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true } // Already dismissed
  }

  const { error } = await db.from('dismissed_duplicates').insert({
    tenant_id: tenantId,
    entity_type: entityType,
    entity_id_1: id1,
    entity_id_2: id2,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/data-quality')
  return { success: true }
}

// ─── Get Merge Impact Preview ───────────────────────────────────────────────

export async function getMergeImpact(
  entityType: 'client' | 'ingredient' | 'recipe',
  removeId: string
): Promise<{
  label: string
  details: { table: string; count: number }[]
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const details: { table: string; count: number }[] = []

  if (entityType === 'client') {
    const tables = [
      { table: 'events', label: 'Events' },
      { table: 'inquiries', label: 'Inquiries' },
      { table: 'quotes', label: 'Quotes' },
      { table: 'ledger_entries', label: 'Payments' },
      { table: 'conversations', label: 'Conversations' },
      { table: 'contracts', label: 'Contracts' },
    ]

    for (const t of tables) {
      try {
        const { data } = await db
          .from(t.table)
          .select('id', { count: 'exact', head: true })
          .eq('client_id', removeId)
          .eq('tenant_id', tenantId)

        const count = data?.length ?? 0
        if (count > 0) {
          details.push({ table: t.label, count })
        }
      } catch {
        // table may not exist
      }
    }

    return { label: 'Records that will be reassigned', details }
  }

  if (entityType === 'ingredient') {
    try {
      const { data } = await db
        .from('recipe_ingredients')
        .select('id', { count: 'exact', head: true })
        .eq('ingredient_id', removeId)

      details.push({ table: 'Recipe references', count: data?.length ?? 0 })
    } catch {
      // non-blocking
    }

    try {
      const { data } = await db
        .from('ingredient_price_history')
        .select('id', { count: 'exact', head: true })
        .eq('ingredient_id', removeId)
        .eq('tenant_id', tenantId)

      const count = data?.length ?? 0
      if (count > 0) {
        details.push({ table: 'Price records', count })
      }
    } catch {
      // non-blocking
    }

    return { label: 'References that will be updated', details }
  }

  if (entityType === 'recipe') {
    try {
      const { data } = await db
        .from('recipe_ingredients')
        .select('id', { count: 'exact', head: true })
        .eq('recipe_id', removeId)

      details.push({ table: 'Ingredients', count: data?.length ?? 0 })
    } catch {
      // non-blocking
    }

    try {
      const { data } = await db
        .from('dish_index')
        .select('id', { count: 'exact', head: true })
        .eq('linked_recipe_id', removeId)

      const count = data?.length ?? 0
      if (count > 0) {
        details.push({ table: 'Menu references', count })
      }
    } catch {
      // non-blocking
    }

    return { label: 'References that will be updated', details }
  }

  return { label: 'No impact data', details: [] }
}

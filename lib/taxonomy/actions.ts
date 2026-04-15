'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { getSystemDefaults } from './system-defaults'
import type { TaxonomyCategory, TaxonomyEntry } from './types'

/**
 * Get merged taxonomy for a category: system defaults (minus hidden) + chef custom entries.
 * Sorted by sort_order, then alphabetically.
 */
export async function getTaxonomy(category: TaxonomyCategory): Promise<TaxonomyEntry[]> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  // Get system defaults for this category
  const systemDefaults = getSystemDefaults(category)

  // Get chef's hidden entries
  const { data: hiddenRows } = await db
    .from('chef_taxonomy_hidden' as any)
    .select('value')
    .eq('chef_id', chefId)
    .eq('category', category)

  const hiddenSet = new Set((hiddenRows ?? []).map((r: any) => r.value))

  // Get chef's custom entries
  const { data: customRows } = await db
    .from('chef_taxonomy_extensions' as any)
    .select('*')
    .eq('chef_id', chefId)
    .eq('category', category)
    .order('sort_order', { ascending: true })

  // Merge: system defaults (with hidden flag) + custom entries
  const merged: TaxonomyEntry[] = []

  for (const entry of systemDefaults) {
    merged.push({
      ...entry,
      isHidden: hiddenSet.has(entry.value),
    })
  }

  for (const row of customRows ?? []) {
    merged.push({
      id: row.id,
      value: row.value,
      displayLabel: row.display_label,
      isSystem: false,
      isHidden: false,
      sortOrder: row.sort_order,
      metadata: row.metadata ?? {},
    })
  }

  // Sort: non-hidden first, then by sortOrder, then alphabetically
  merged.sort((a, b) => {
    if (a.isHidden !== b.isHidden) return a.isHidden ? 1 : -1
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.displayLabel.localeCompare(b.displayLabel)
  })

  return merged
}

/**
 * Get only the active (visible) entries for a category.
 * This is what dropdowns and pickers should use.
 */
export async function getActiveTaxonomy(category: TaxonomyCategory): Promise<TaxonomyEntry[]> {
  const all = await getTaxonomy(category)
  return all.filter((e) => !e.isHidden)
}

/**
 * Alias for getActiveTaxonomy. Returns system defaults + chef custom entries merged.
 * Convenience name for use in form components.
 */
export async function getTaxonomyOptions(category: TaxonomyCategory): Promise<TaxonomyEntry[]> {
  return getActiveTaxonomy(category)
}

/**
 * Add a custom taxonomy entry for the current chef.
 */
export async function addTaxonomyEntry(
  category: TaxonomyCategory,
  value: string,
  displayLabel: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  const slug = value
    .toLowerCase()
    .replace(/[\s/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  if (!slug) return { success: false, error: 'Invalid value' }

  const { error } = await db.from('chef_taxonomy_extensions' as any).insert({
    chef_id: chefId,
    category,
    value: slug,
    display_label: displayLabel.trim(),
    sort_order: 999,
    metadata: metadata ?? {},
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Entry already exists' }
    return { success: false, error: error.message }
  }

  // Non-blocking webhook
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(chefId, 'taxonomy.updated' as any, { category, action: 'add', value: slug })
  } catch (err) {
    console.error('[addTaxonomyEntry] Webhook emit failed (non-blocking):', err)
  }

  revalidatePath('/settings/taxonomy')
  return { success: true }
}

/**
 * Remove a custom taxonomy entry (only non-system entries).
 */
export async function removeTaxonomyEntry(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_taxonomy_extensions' as any)
    .delete()
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) return { success: false, error: error.message }

  // Non-blocking webhook
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(chefId, 'taxonomy.updated' as any, { action: 'remove', id })
  } catch (err) {
    console.error('[removeTaxonomyEntry] Webhook emit failed (non-blocking):', err)
  }

  revalidatePath('/settings/taxonomy')
  return { success: true }
}

/**
 * Hide a system default entry for the current chef.
 */
export async function hideTaxonomyDefault(
  category: TaxonomyCategory,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  const { error } = await db.from('chef_taxonomy_hidden' as any).insert({
    chef_id: chefId,
    category,
    value,
  })

  if (error) {
    if (error.code === '23505') return { success: true } // already hidden
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/taxonomy')
  return { success: true }
}

/**
 * Unhide (restore) a system default entry.
 */
export async function unhideTaxonomyDefault(
  category: TaxonomyCategory,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_taxonomy_hidden' as any)
    .delete()
    .eq('chef_id', chefId)
    .eq('category', category)
    .eq('value', value)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/taxonomy')
  return { success: true }
}

/**
 * Reorder entries for a category (custom entries only, system defaults keep their position).
 */
export async function reorderTaxonomy(
  category: TaxonomyCategory,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db: any = createServerClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db
      .from('chef_taxonomy_extensions' as any)
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('chef_id', chefId)

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/settings/taxonomy')
  return { success: true }
}

'use server'

// Dish Source Actions - canonical dish to menu pipeline
// Add canonical dishes to menus by reference or copy.
// Sync referenced menu dishes from canonical source.
// Convert reference dishes to copies.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { materializeCanonicalDishIntoMenu } from './canonical-dish-menu-core'

// ============================================================
// SCHEMAS
// ============================================================

const AddCanonicalDishSchema = z.object({
  menuId: z.string().uuid(),
  dishId: z.string().uuid(),
  mode: z.enum(['reference', 'copy']),
  courseNumber: z.number().int().positive().optional(),
  courseName: z.string().optional(),
})

// ============================================================
// ADD CANONICAL DISH TO MENU
// ============================================================

/**
 * Add a dish from dish_index to a menu as either a reference or copy.
 * reference: synced compatibility rows (source edits flow through on sync)
 * copy:      isolated compatibility rows (frozen at clone time)
 *
 * Both modes create rows in the existing `dishes` and `components` tables
 * so the current menu editor continues to work without change.
 */
export async function addCanonicalDishToMenu(input: {
  menuId: string
  dishId: string
  mode: 'reference' | 'copy'
  courseNumber?: number
  courseName?: string
}) {
  const user = await requireChef()
  const validated = AddCanonicalDishSchema.parse(input)

  const db: any = createServerClient()

  try {
    const materialized = await materializeCanonicalDishIntoMenu({
      db,
      tenantId: user.tenantId!,
      actorUserId: user.id,
      menuId: validated.menuId,
      dishId: validated.dishId,
      mode: validated.mode,
      courseNumber: validated.courseNumber,
      courseName: validated.courseName,
    })

    return { success: true, menuDishId: materialized.menuDishId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create menu dish',
    }
  }
}

// ============================================================
// CONVERT REFERENCE TO COPY
// ============================================================

/**
 * Freeze a referenced menu dish into an independent copy.
 * After conversion, canonical dish edits no longer flow to this dish.
 */
export async function convertReferencedMenuDishToCopy(menuDishId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: dish } = await db
    .from('dishes')
    .select('id, menu_id, source_mode, dish_index_id')
    .eq('id', menuDishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) {
    return { success: false, error: 'Menu dish not found' }
  }

  if (dish.source_mode !== 'reference') {
    return { success: false, error: 'Only reference-mode dishes can be converted to copies' }
  }

  const { error } = await db
    .from('dishes')
    .update({
      source_mode: 'copy',
      copied_from_dish_index_id: dish.dish_index_id,
      dish_index_id: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', menuDishId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[convertReferencedMenuDishToCopy] Error:', error)
    return { success: false, error: 'Failed to convert dish to copy' }
  }

  // Also clear dish_index_component_id on components (freeze them)
  await db
    .from('components')
    .update({ dish_index_component_id: null })
    .eq('dish_id', menuDishId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/menus/${dish.menu_id}`)

  return { success: true }
}

// ============================================================
// SYNC REFERENCED MENU DISH FROM CANONICAL SOURCE
// ============================================================

/**
 * Pull the latest canonical dish data into a reference-mode menu dish.
 * Only applies to menus in 'draft' or 'shared' status. Locked menus are frozen.
 */
export async function syncReferencedMenuDish(menuDishId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: dish } = await db
    .from('dishes')
    .select('id, menu_id, source_mode, dish_index_id')
    .eq('id', menuDishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) {
    return { success: false, error: 'Menu dish not found' }
  }

  if (dish.source_mode !== 'reference' || !dish.dish_index_id) {
    return { success: false, error: 'Dish is not in reference mode' }
  }

  // Check menu status - locked menus are frozen
  const { data: menu } = await db
    .from('menus')
    .select('status')
    .eq('id', dish.menu_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) {
    return { success: false, error: 'Menu not found' }
  }

  if (menu.status === 'locked') {
    return { success: false, error: 'Locked menus cannot be synced' }
  }

  // Fetch canonical dish data
  const { data: canonical } = await db
    .from('dish_index')
    .select('name, description, dietary_tags, allergen_flags')
    .eq('id', dish.dish_index_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!canonical) {
    return { success: false, error: 'Canonical dish source not found' }
  }

  // Update menu dish from canonical
  const { error: updateError } = await db
    .from('dishes')
    .update({
      name: canonical.name,
      description: canonical.description ?? null,
      dietary_tags: canonical.dietary_tags ?? [],
      allergen_flags: canonical.allergen_flags ?? [],
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', menuDishId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[syncReferencedMenuDish] dish update error:', updateError)
    return { success: false, error: 'Failed to sync dish' }
  }

  // Sync components that are linked to canonical components
  const { data: canonicalComponents } = await db
    .from('dish_index_components')
    .select('id, name, category, description, sort_order')
    .eq('dish_id', dish.dish_index_id)
    .eq('tenant_id', user.tenantId!)

  if (canonicalComponents && canonicalComponents.length > 0) {
    const { data: menuComponents } = await db
      .from('components')
      .select('id, dish_index_component_id')
      .eq('dish_id', menuDishId)
      .eq('tenant_id', user.tenantId!)
      .not('dish_index_component_id', 'is', null)

    for (const menuComp of menuComponents ?? []) {
      const canonical = canonicalComponents.find(
        (c: any) => c.id === menuComp.dish_index_component_id
      )
      if (!canonical) continue

      await db
        .from('components')
        .update({
          name: canonical.name,
          category: canonical.category,
          description: canonical.description ?? null,
          sort_order: canonical.sort_order,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', menuComp.id)
        .eq('tenant_id', user.tenantId!)
    }
  }

  revalidatePath(`/menus/${dish.menu_id}`)

  return { success: true }
}

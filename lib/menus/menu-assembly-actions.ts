'use server'

// Menu Assembly Actions - build menus from dish catalog picks
// Creates menus via materializeCanonicalDishIntoMenu for each pick.
// All tenant-scoped, auth-gated.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { materializeCanonicalDishIntoMenu } from './canonical-dish-menu-core'
import { checkRateLimit } from '@/lib/rateLimit'
import type { AssembleMenuInput, AssemblyResult } from './assembly-types'

// ============================================
// SCHEMAS
// ============================================

const AssemblyPickSchema = z.object({
  dishId: z.string().uuid(),
  course: z.string().min(1),
  position: z.number().int().positive().max(12),
})

const AssembleMenuSchema = z.object({
  title: z.string().min(1, 'Menu title required'),
  description: z.string().optional(),
  eventId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  serviceStyle: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  cuisineType: z.string().optional(),
  targetGuestCount: z.number().int().positive().optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  targetDate: z.string().optional(),
  dishes: z.array(AssemblyPickSchema).min(1, 'At least one dish required').max(12),
})

const AddDishSchema = z.object({
  menuId: z.string().uuid(),
  dishId: z.string().uuid(),
  course: z.string().min(1),
  position: z.number().int().positive().max(12),
})

const ReorderSchema = z.object({
  menuId: z.string().uuid(),
  dishOrder: z
    .array(
      z.object({
        dishId: z.string().uuid(),
        position: z.number().int().positive().max(12),
      })
    )
    .min(1),
})

// ============================================
// ASSEMBLE MENU FROM DISHES
// ============================================

/**
 * Create a new menu from a set of catalog dish picks.
 * Each dish is materialized via reference mode (linked to dish_index).
 * origin_type = 'chef_created' with origin_metadata.assembly = true.
 */
export async function assembleMenuFromDishes(
  tenantId: string,
  input: AssembleMenuInput
): Promise<AssemblyResult> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  await checkRateLimit(`assembleMenu:${user.id}`)

  const validated = AssembleMenuSchema.parse(input)

  // Check for duplicate positions
  const positions = validated.dishes.map((d) => d.position)
  const uniquePositions = new Set(positions)
  if (uniquePositions.size !== positions.length) {
    return { success: false, errors: ['Duplicate course positions detected'] }
  }

  // Check for duplicate dish IDs
  const dishIds = validated.dishes.map((d) => d.dishId)
  const uniqueDishIds = new Set(dishIds)
  if (uniqueDishIds.size !== dishIds.length) {
    return { success: false, errors: ['Same dish cannot be added twice'] }
  }

  const db: any = createServerClient()

  // If event_id provided, verify it belongs to tenant
  if (validated.eventId) {
    const { data: event } = await db
      .from('events')
      .select('tenant_id')
      .eq('id', validated.eventId)
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .single()

    if (!event) {
      return { success: false, errors: ['Event not found or does not belong to your tenant'] }
    }
  }

  // Create the menu shell
  const { data: menu, error: menuError } = await db
    .from('menus')
    .insert({
      tenant_id: tenantId,
      name: validated.title,
      description: validated.description ?? null,
      event_id: validated.eventId ?? null,
      client_id: validated.clientId ?? null,
      service_style: validated.serviceStyle ?? null,
      cuisine_type: validated.cuisineType ?? null,
      target_guest_count: validated.targetGuestCount ?? null,
      season: validated.season ?? null,
      target_date: validated.targetDate ?? null,
      origin_type: 'chef_created',
      origin_metadata: { assembly: true, dishCount: validated.dishes.length },
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id, name')
    .single()

  if (menuError || !menu) {
    return {
      success: false,
      errors: [`Failed to create menu: ${menuError?.message ?? 'unknown error'}`],
    }
  }

  // Materialize each dish into the menu
  const dishResults: AssemblyResult['dishResults'] = []
  const errors: string[] = []

  // Sort by position for deterministic ordering
  const sortedPicks = [...validated.dishes].sort((a, b) => a.position - b.position)

  for (const pick of sortedPicks) {
    try {
      const result = await materializeCanonicalDishIntoMenu({
        db,
        tenantId,
        actorUserId: user.id,
        menuId: menu.id,
        dishId: pick.dishId,
        mode: 'reference',
        courseNumber: pick.position,
        courseName: pick.course,
      })

      dishResults.push({
        dishId: pick.dishId,
        menuDishId: result.menuDishId,
        courseNumber: result.courseNumber,
        courseName: result.courseName,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to add dish ${pick.dishId}`
      errors.push(msg)
    }
  }

  revalidatePath('/menus')
  revalidatePath(`/menus/${menu.id}`)
  revalidatePath('/culinary/menus')

  return {
    success: errors.length === 0,
    menuId: menu.id,
    menuName: menu.name,
    dishResults,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// ============================================
// ADD DISH TO EXISTING MENU
// ============================================

/**
 * Add a single catalog dish to an existing draft/shared menu.
 */
export async function addDishToMenu(
  tenantId: string,
  menuId: string,
  dishId: string,
  course: string,
  position: number
): Promise<{ success: boolean; menuDishId?: string; error?: string }> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  AddDishSchema.parse({ menuId, dishId, course, position })

  const db: any = createServerClient()

  // Verify menu belongs to tenant and is editable
  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .single()

  if (!menu) {
    return { success: false, error: 'Menu not found' }
  }

  if (menu.status === 'locked') {
    return { success: false, error: 'Cannot add dishes to a locked menu' }
  }

  // Check for existing course at this position
  const { data: existing } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .eq('course_number', position)
    .maybeSingle()

  if (existing) {
    return { success: false, error: `Course position ${position} is already occupied` }
  }

  try {
    const result = await materializeCanonicalDishIntoMenu({
      db,
      tenantId,
      actorUserId: user.id,
      menuId,
      dishId,
      mode: 'reference',
      courseNumber: position,
      courseName: course,
    })

    revalidatePath(`/menus/${menuId}`)
    revalidatePath('/culinary/menus')

    return { success: true, menuDishId: result.menuDishId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add dish',
    }
  }
}

// ============================================
// REMOVE DISH FROM MENU
// ============================================

/**
 * Remove a dish from a menu by its menu dish ID (row in dishes table).
 * Only works on draft/shared menus.
 */
export async function removeDishFromMenu(
  tenantId: string,
  menuId: string,
  menuDishId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  const db: any = createServerClient()

  // Verify menu is editable
  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .single()

  if (!menu) {
    return { success: false, error: 'Menu not found' }
  }

  if (menu.status === 'locked') {
    return { success: false, error: 'Cannot remove dishes from a locked menu' }
  }

  // Verify dish belongs to this menu and tenant
  const { data: dish } = await db
    .from('dishes')
    .select('id')
    .eq('id', menuDishId)
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!dish) {
    return { success: false, error: 'Dish not found in this menu' }
  }

  // Delete components first (cascade should handle this, but be explicit)
  await db.from('components').delete().eq('dish_id', menuDishId).eq('tenant_id', tenantId)

  // Delete the dish
  const { error } = await db
    .from('dishes')
    .delete()
    .eq('id', menuDishId)
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)

  if (error) {
    return { success: false, error: `Failed to remove dish: ${error.message}` }
  }

  revalidatePath(`/menus/${menuId}`)
  revalidatePath('/culinary/menus')

  return { success: true }
}

// ============================================
// REORDER DISHES IN MENU
// ============================================

/**
 * Reorder dishes within a menu by updating course_number.
 * Validates no duplicate positions and menu is editable.
 */
export async function reorderDishesInMenu(
  tenantId: string,
  menuId: string,
  dishOrder: Array<{ dishId: string; position: number }>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  ReorderSchema.parse({ menuId, dishOrder })

  // Check for duplicate positions
  const positions = dishOrder.map((d) => d.position)
  const uniquePositions = new Set(positions)
  if (uniquePositions.size !== positions.length) {
    return { success: false, error: 'Duplicate course positions detected' }
  }

  const db: any = createServerClient()

  // Verify menu is editable
  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .single()

  if (!menu) {
    return { success: false, error: 'Menu not found' }
  }

  if (menu.status === 'locked') {
    return { success: false, error: 'Cannot reorder dishes in a locked menu' }
  }

  // To avoid unique constraint violations during reorder, we use a two-pass
  // approach: first set all to temporary negative values, then set final values.
  const now = new Date().toISOString()

  // Pass 1: Set temporary course numbers (negative to avoid collisions)
  for (let i = 0; i < dishOrder.length; i++) {
    const { dishId } = dishOrder[i]
    const tempNumber = -(i + 1000)

    const { error } = await db
      .from('dishes')
      .update({ course_number: tempNumber, updated_at: now, updated_by: user.id })
      .eq('id', dishId)
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)

    if (error) {
      return { success: false, error: `Failed to reorder: ${error.message}` }
    }
  }

  // Pass 2: Set final course numbers
  for (const { dishId, position } of dishOrder) {
    const { error } = await db
      .from('dishes')
      .update({
        course_number: position,
        sort_order: position,
        updated_at: now,
        updated_by: user.id,
      })
      .eq('id', dishId)
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)

    if (error) {
      return { success: false, error: `Failed to set position: ${error.message}` }
    }
  }

  revalidatePath(`/menus/${menuId}`)
  revalidatePath('/culinary/menus')

  return { success: true }
}

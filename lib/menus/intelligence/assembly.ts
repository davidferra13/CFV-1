// Menu Intelligence: Phase 2 Assembly
// Deep copy dishes from sources, add recipes as components, quick add.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import { getDuplicateCourseError } from '@/lib/menus/course-utils'
import { revalidateMenuIntelligenceCache } from './cache-utils'
import type { AssemblySource, AssemblyDish, AddDishResult } from './shared'

// ============================================
// 7. GET ASSEMBLY SOURCES (Templates + Past Menus)
// ============================================

export async function getAssemblySources(filters?: {
  type?: 'template' | 'past_menu'
  search?: string
  serviceStyle?: string
  cuisineType?: string
}): Promise<AssemblySource[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('menus')
    .select(
      'id, name, service_style, cuisine_type, target_guest_count, is_template, event_id, created_at'
    )
    .eq('tenant_id', user.tenantId!)

  // Filter by type
  if (filters?.type === 'template') {
    query = query.eq('is_template', true)
  } else if (filters?.type === 'past_menu') {
    query = query.eq('is_template', false)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters?.serviceStyle) {
    query = query.eq('service_style', filters.serviceStyle)
  }

  if (filters?.cuisineType) {
    query = query.ilike('cuisine_type', `%${filters.cuisineType}%`)
  }

  query = query.order('created_at', { ascending: false }).limit(50)

  const { data: menus, error } = await query

  if (error) {
    console.error('[getAssemblySources] Error:', error)
    throw new UnknownAppError('Failed to fetch assembly sources')
  }

  if (!menus?.length) return []

  // Get dish counts per menu
  const menuIds = menus.map((m: any) => m.id)
  const { data: dishes } = await db
    .from('dishes')
    .select('menu_id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  const dishCountMap = new Map<string, number>()
  for (const d of dishes || []) {
    dishCountMap.set(d.menu_id, (dishCountMap.get(d.menu_id) || 0) + 1)
  }

  // Get client names for event-linked menus
  const eventIds = menus.filter((m: any) => m.event_id).map((m: any) => m.event_id)
  const clientNameMap = new Map<string, string>()
  const eventDateMap = new Map<string, string>()

  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, client_id, event_date')
      .in('id', eventIds)
      .eq('tenant_id', user.tenantId!)

    if (events?.length) {
      for (const e of events) {
        if (e.event_date) eventDateMap.set(e.id, e.event_date)
      }

      const clientIds = events.filter((e: any) => e.client_id).map((e: any) => e.client_id)
      if (clientIds.length > 0) {
        const { data: clients } = await db
          .from('clients')
          .select('id, full_name')
          .in('id', clientIds)
          .eq('tenant_id', user.tenantId!)

        if (clients) {
          const clientMap = new Map<string, string>()
          for (const c of clients) {
            clientMap.set(c.id, c.full_name || '')
          }
          for (const e of events) {
            if (e.client_id && clientMap.has(e.client_id)) {
              clientNameMap.set(e.id, clientMap.get(e.client_id)!)
            }
          }
        }
      }
    }
  }

  return menus.map((m: any) => ({
    id: m.id,
    name: m.name,
    type: m.is_template ? ('template' as const) : ('past_menu' as const),
    serviceStyle: m.service_style,
    guestCount: m.target_guest_count,
    cuisineType: m.cuisine_type,
    eventDate: m.event_id ? eventDateMap.get(m.event_id) || null : null,
    clientName: m.event_id ? clientNameMap.get(m.event_id) || null : null,
    dishCount: dishCountMap.get(m.id) || 0,
  }))
}

// ============================================
// 8. GET DISHES FROM A SOURCE MENU
// ============================================

export async function getDishesFromMenu(sourceMenuId: string): Promise<AssemblyDish[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: dishes, error } = await db
    .from('dishes')
    .select('id, name, course_name, course_number, description, dietary_tags')
    .eq('menu_id', sourceMenuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getDishesFromMenu] Error:', error)
    throw new UnknownAppError('Failed to fetch dishes')
  }

  if (!dishes?.length) return []

  const dishIds = dishes.map((d: any) => d.id)

  // Get component info
  const { data: components } = await db
    .from('components')
    .select('dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  const compCountMap = new Map<string, number>()
  const hasRecipeMap = new Map<string, boolean>()
  for (const c of components || []) {
    compCountMap.set(c.dish_id, (compCountMap.get(c.dish_id) || 0) + 1)
    if (c.recipe_id) hasRecipeMap.set(c.dish_id, true)
  }

  return dishes.map((d: any) => ({
    id: d.id,
    name: d.name,
    courseName: d.course_name,
    courseNumber: d.course_number,
    description: d.description,
    dietaryTags: d.dietary_tags || [],
    componentCount: compCountMap.get(d.id) || 0,
    hasRecipe: hasRecipeMap.get(d.id) || false,
  }))
}

// ============================================
// 9. ADD DISH FROM SOURCE (Deep Copy)
// ============================================

export async function addDishFromSource(
  targetMenuId: string,
  sourceDishId: string,
  targetCourseNumber: number,
  targetCourseName?: string
): Promise<AddDishResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify target menu exists and is editable
  const { data: targetMenu } = await db
    .from('menus')
    .select('id, status, target_guest_count')
    .eq('id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!targetMenu) throw new UnknownAppError('Target menu not found')
  if (targetMenu.status === 'locked')
    throw new UnknownAppError('Cannot add dishes to a locked menu')

  // Fetch source dish with full detail
  const { data: sourceDish } = await db
    .from('dishes')
    .select('*')
    .eq('id', sourceDishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!sourceDish) throw new UnknownAppError('Source dish not found')

  // Get source menu guest count for scale adjustment
  const { data: sourceMenu } = await db
    .from('menus')
    .select('target_guest_count')
    .eq('id', sourceDish.menu_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  const sourceGuestCount = sourceMenu?.target_guest_count || 0
  const targetGuestCount = targetMenu.target_guest_count || 0

  const { data: existingDish } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .eq('course_number', targetCourseNumber)
    .maybeSingle()

  if (existingDish) {
    throw new UnknownAppError(getDuplicateCourseError(targetCourseNumber))
  }

  // Deep copy the dish
  const { data: newDish, error: dishErr } = await db
    .from('dishes')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: targetMenuId,
      course_name: targetCourseName || sourceDish.course_name,
      course_number: targetCourseNumber,
      name: sourceDish.name,
      description: sourceDish.description,
      dietary_tags: sourceDish.dietary_tags || [],
      allergen_flags: sourceDish.allergen_flags || [],
      chef_notes: sourceDish.chef_notes,
      client_notes: sourceDish.client_notes,
      plating_instructions: sourceDish.plating_instructions ?? null,
      beverage_pairing: sourceDish.beverage_pairing ?? null,
      beverage_pairing_notes: sourceDish.beverage_pairing_notes ?? null,
      sort_order: targetCourseNumber,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (dishErr || !newDish) {
    console.error('[addDishFromSource] Dish copy error:', dishErr)
    if (dishErr?.code === '23505') {
      throw new UnknownAppError(getDuplicateCourseError(targetCourseNumber))
    }
    throw new UnknownAppError('Failed to copy dish')
  }

  // Deep copy components
  const { data: sourceComponents } = await db
    .from('components')
    .select('*')
    .eq('dish_id', sourceDishId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  let componentsAdded = 0
  let scaleAdjusted = false
  let newScaleFactor: number | null = null

  for (const comp of sourceComponents || []) {
    let scaleFactor = comp.scale_factor || 1

    // Auto-adjust scale if guest counts differ
    if (sourceGuestCount > 0 && targetGuestCount > 0 && sourceGuestCount !== targetGuestCount) {
      scaleFactor = scaleFactor * (targetGuestCount / sourceGuestCount)
      scaleFactor = Math.round(scaleFactor * 100) / 100
      scaleAdjusted = true
      newScaleFactor = scaleFactor
    }

    const { error: compErr } = await db.from('components').insert({
      tenant_id: user.tenantId!,
      dish_id: newDish.id,
      name: comp.name,
      category: comp.category,
      description: comp.description,
      recipe_id: comp.recipe_id,
      scale_factor: scaleFactor,
      is_make_ahead: comp.is_make_ahead,
      make_ahead_window_hours: comp.make_ahead_window_hours,
      transport_category: comp.transport_category,
      execution_notes: comp.execution_notes,
      storage_notes: comp.storage_notes,
      sort_order: comp.sort_order,
      portion_quantity: comp.portion_quantity ?? null,
      portion_unit: comp.portion_unit ?? null,
      prep_day_offset: comp.prep_day_offset ?? 0,
      prep_time_of_day: comp.prep_time_of_day ?? null,
      prep_station: comp.prep_station ?? null,
      created_by: user.id,
      updated_by: user.id,
    } as any)

    if (compErr) {
      console.error('[addDishFromSource] Component copy error:', compErr)
    } else {
      componentsAdded++
    }
  }

  revalidatePath(`/culinary/menus/${targetMenuId}`)
  revalidateMenuIntelligenceCache(targetMenuId)

  return {
    success: true,
    newDishId: newDish.id,
    componentsAdded,
    scaleAdjusted,
    newScaleFactor,
  }
}

// ============================================
// 10. ADD RECIPE AS COMPONENT
// ============================================

export async function addRecipeAsComponent(
  targetMenuId: string,
  targetDishId: string,
  recipeId: string
): Promise<{ success: boolean; componentId: string; scaleFactor: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify target menu is editable
  const { data: targetMenu } = await db
    .from('menus')
    .select('id, status, target_guest_count')
    .eq('id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!targetMenu) throw new UnknownAppError('Target menu not found')
  if (targetMenu.status === 'locked') throw new UnknownAppError('Cannot modify a locked menu')

  // Verify dish belongs to this menu
  const { data: dish } = await db
    .from('dishes')
    .select('id, menu_id')
    .eq('id', targetDishId)
    .eq('menu_id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) throw new UnknownAppError('Dish not found in this menu')

  // Fetch recipe for name and yield
  const { data: recipe } = await db
    .from('recipes')
    .select('id, name, yield_quantity, category')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new UnknownAppError('Recipe not found')

  // Calculate scale factor from recipe yield vs menu guest count
  let scaleFactor = 1
  const targetGuestCount = targetMenu.target_guest_count || 0
  if (recipe.yield_quantity && recipe.yield_quantity > 0 && targetGuestCount > 0) {
    scaleFactor = targetGuestCount / recipe.yield_quantity
    scaleFactor = Math.round(scaleFactor * 100) / 100
  }

  // Determine sort order (append)
  const { data: existingComps } = await db
    .from('components')
    .select('sort_order')
    .eq('dish_id', targetDishId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = existingComps?.length ? (existingComps[0].sort_order || 0) + 1 : 0

  // Map recipe category to component category
  const categoryMap: Record<string, string> = {
    protein: 'protein',
    starch: 'starch',
    vegetable: 'vegetable',
    sauce: 'sauce',
    dessert: 'dessert',
    bread: 'bread',
    soup: 'soup',
    salad: 'salad',
    appetizer: 'other',
    pasta: 'starch',
    beverage: 'other',
    condiment: 'sauce',
    fruit: 'other',
  }
  const componentCategory = categoryMap[recipe.category] || 'other'

  const { data: component, error } = await db
    .from('components')
    .insert({
      tenant_id: user.tenantId!,
      dish_id: targetDishId,
      name: recipe.name,
      category: componentCategory,
      recipe_id: recipeId,
      scale_factor: scaleFactor,
      sort_order: nextSort,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error || !component) {
    console.error('[addRecipeAsComponent] Error:', error)
    throw new UnknownAppError('Failed to add recipe as component')
  }

  revalidatePath(`/culinary/menus/${targetMenuId}`)
  revalidateMenuIntelligenceCache(targetMenuId)

  return {
    success: true,
    componentId: component.id,
    scaleFactor,
  }
}

// ============================================
// 11. QUICK ADD DISH (Empty dish, no source)
// ============================================

export async function quickAddDish(
  targetMenuId: string,
  dishName: string,
  courseNumber: number,
  courseName: string
): Promise<{ success: boolean; dishId: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu is editable
  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')
  if (menu.status === 'locked') throw new UnknownAppError('Cannot add dishes to a locked menu')

  const { data: existingDish } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', targetMenuId)
    .eq('tenant_id', user.tenantId!)
    .eq('course_number', courseNumber)
    .maybeSingle()

  if (existingDish) {
    throw new UnknownAppError(getDuplicateCourseError(courseNumber))
  }

  const { data: dish, error } = await db
    .from('dishes')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: targetMenuId,
      course_name: courseName,
      course_number: courseNumber,
      name: dishName,
      sort_order: courseNumber,
      dietary_tags: [],
      allergen_flags: [],
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error || !dish) {
    console.error('[quickAddDish] Error:', error)
    if (error?.code === '23505') {
      throw new UnknownAppError(getDuplicateCourseError(courseNumber))
    }
    throw new UnknownAppError('Failed to add dish')
  }

  revalidatePath(`/culinary/menus/${targetMenuId}`)
  revalidateMenuIntelligenceCache(targetMenuId)

  return { success: true, dishId: dish.id }
}

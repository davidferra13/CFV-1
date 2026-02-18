// Menu CRUD Server Actions
// Chef-only: Manage menus, dishes, and components (relational model)
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'

type MenuStatus = Database['public']['Enums']['menu_status']
// 'draft' | 'shared' | 'locked' | 'archived'

type ServiceStyle = Database['public']['Enums']['event_service_style']
type ComponentCategory = Database['public']['Enums']['component_category']

// ============================================
// MENU SCHEMAS
// ============================================

const CreateMenuSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  service_style: z.enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other']).optional(),
  cuisine_type: z.string().optional(),
  target_guest_count: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_template: z.boolean().optional(),
  event_id: z.string().uuid().optional()
})

const UpdateMenuSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  service_style: z.enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other']).optional(),
  cuisine_type: z.string().optional(),
  target_guest_count: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_template: z.boolean().optional()
})

export type CreateMenuInput = z.infer<typeof CreateMenuSchema>
export type UpdateMenuInput = z.infer<typeof UpdateMenuSchema>

// ============================================
// DISH SCHEMAS
// ============================================

const CreateDishSchema = z.object({
  menu_id: z.string().uuid(),
  course_name: z.string().min(1, 'Course name required'),
  course_number: z.number().int().positive(),
  description: z.string().optional(),
  dietary_tags: z.array(z.string()).default([]),
  allergen_flags: z.array(z.string()).default([]),
  chef_notes: z.string().optional(),
  client_notes: z.string().optional(),
  sort_order: z.number().int().optional()
})

const UpdateDishSchema = z.object({
  course_name: z.string().min(1).optional(),
  course_number: z.number().int().positive().optional(),
  description: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  allergen_flags: z.array(z.string()).optional(),
  chef_notes: z.string().optional(),
  client_notes: z.string().optional(),
  sort_order: z.number().int().optional()
})

export type CreateDishInput = z.infer<typeof CreateDishSchema>
export type UpdateDishInput = z.infer<typeof UpdateDishSchema>

// ============================================
// COMPONENT SCHEMAS
// ============================================

const CreateComponentSchema = z.object({
  dish_id: z.string().uuid(),
  name: z.string().min(1, 'Component name required'),
  category: z.enum([
    'sauce', 'protein', 'starch', 'vegetable', 'garnish',
    'base', 'topping', 'seasoning', 'other'
  ]),
  description: z.string().optional(),
  recipe_id: z.string().uuid().optional(),
  scale_factor: z.number().positive().default(1),
  is_make_ahead: z.boolean().default(false),
  make_ahead_window_hours: z.number().int().positive().optional(),
  execution_notes: z.string().optional(),
  storage_notes: z.string().optional(),
  sort_order: z.number().int().optional()
})

const UpdateComponentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum([
    'sauce', 'protein', 'starch', 'vegetable', 'garnish',
    'base', 'topping', 'seasoning', 'other'
  ]).optional(),
  description: z.string().optional(),
  recipe_id: z.string().uuid().nullable().optional(),
  scale_factor: z.number().positive().optional(),
  is_make_ahead: z.boolean().optional(),
  make_ahead_window_hours: z.number().int().positive().nullable().optional(),
  execution_notes: z.string().optional(),
  storage_notes: z.string().optional(),
  sort_order: z.number().int().optional()
})

export type CreateComponentInput = z.infer<typeof CreateComponentSchema>
export type UpdateComponentInput = z.infer<typeof UpdateComponentSchema>

// ============================================
// MENU CRUD
// ============================================

/**
 * Create menu (chef-only)
 * Status defaults to 'draft' in database
 */
export async function createMenu(input: CreateMenuInput) {
  const user = await requireChef()
  const validated = CreateMenuSchema.parse(input)

  const supabase = createServerClient()

  // If event_id provided, verify event belongs to tenant
  if (validated.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('tenant_id')
      .eq('id', validated.event_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!event) {
      throw new Error('Event not found or does not belong to your tenant')
    }
  }

  const { data: menu, error } = await supabase
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description,
      service_style: validated.service_style as ServiceStyle | undefined,
      cuisine_type: validated.cuisine_type,
      target_guest_count: validated.target_guest_count,
      notes: validated.notes,
      is_template: validated.is_template,
      event_id: validated.event_id,
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('[createMenu] Error:', error)
    throw new Error('Failed to create menu')
  }

  // Log initial transition to 'draft'
  await supabase.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: menu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id
  })

  revalidatePath('/menus')

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'menu_created',
      domain: 'menu',
      entityType: 'menu',
      entityId: menu.id,
      summary: `Created menu: ${validated.name}${validated.is_template ? ' (template)' : ''}`,
      context: { name: validated.name, is_template: validated.is_template, event_id: validated.event_id },
    })
  } catch (err) {
    console.error('[createMenu] Activity log failed (non-blocking):', err)
  }

  return { success: true, menu }
}

/**
 * Get all menus for chef's tenant
 */
export async function getMenus({ statusFilter }: { statusFilter?: MenuStatus } = {}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('menus')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: menus, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[getMenus] Error:', error)
    throw new Error('Failed to fetch menus')
  }

  return menus
}

/**
 * Get single menu by ID with dishes and components (chef-only)
 */
export async function getMenuById(menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: menu, error } = await supabase
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getMenuById] Error:', error)
    return null
  }

  // Fetch dishes for this menu
  const { data: dishes } = await supabase
    .from('dishes')
    .select('*')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  // Fetch components for all dishes
  const dishIds = (dishes || []).map(d => d.id)

  // Query components if there are dishes
  const componentRows = dishIds.length > 0
    ? (await supabase
        .from('components')
        .select('*')
        .in('dish_id', dishIds)
        .eq('tenant_id', user.tenantId!)
        .order('sort_order', { ascending: true })
      ).data || []
    : []

  // Group components by dish_id
  const componentsByDish = new Map<string, typeof componentRows>()
  if (componentRows) {
    for (const comp of componentRows) {
      const existing = componentsByDish.get(comp.dish_id) || []
      existing.push(comp)
      componentsByDish.set(comp.dish_id, existing)
    }
  }

  return {
    ...menu,
    dishes: (dishes || []).map(dish => ({
      ...dish,
      components: componentsByDish.get(dish.id) || []
    }))
  }
}

/**
 * Update menu (chef-only)
 * Only allowed when menu is in 'draft' status
 */
export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const user = await requireChef()
  const validated = UpdateMenuSchema.parse(input)

  const supabase = createServerClient()

  // Verify menu exists and is editable
  const { data: currentMenu } = await supabase
    .from('menus')
    .select('status')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!currentMenu) {
    throw new Error('Menu not found')
  }

  if (currentMenu.status === 'locked') {
    throw new Error('Cannot edit a locked menu')
  }

  const { data: menu, error } = await supabase
    .from('menus')
    .update({
      ...validated,
      service_style: validated.service_style as ServiceStyle | undefined,
      updated_by: user.id
    })
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateMenu] Error:', error)
    throw new Error('Failed to update menu')
  }

  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'menu_updated',
      domain: 'menu',
      entityType: 'menu',
      entityId: menuId,
      summary: `Updated menu: ${menu.name} — ${Object.keys(validated).join(', ')}`,
      context: { name: menu.name, changed_fields: Object.keys(validated) },
    })
  } catch (err) {
    console.error('[updateMenu] Activity log failed (non-blocking):', err)
  }

  return { success: true, menu }
}

/**
 * Delete menu (chef-only)
 * Only draft menus with no event attachment can be deleted
 */
export async function deleteMenu(menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check menu status and event attachment
  const { data: menu } = await supabase
    .from('menus')
    .select('status, event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) {
    throw new Error('Menu not found')
  }

  if (menu.status !== 'draft') {
    throw new Error('Can only delete menus in draft status. Archive instead.')
  }

  if (menu.event_id) {
    throw new Error('Cannot delete menu attached to an event. Detach first.')
  }

  // Delete menu (cascades to dishes → components via ON DELETE CASCADE)
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteMenu] Error:', error)
    throw new Error('Failed to delete menu')
  }

  revalidatePath('/menus')
  return { success: true }
}

// ============================================
// MENU-EVENT LINKING (via menus.event_id FK)
// ============================================

/**
 * Attach menu to event (set menus.event_id)
 */
export async function attachMenuToEvent(eventId: string, menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  // Update menu to attach to event
  const { error } = await supabase
    .from('menus')
    .update({ event_id: eventId, updated_by: user.id })
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[attachMenuToEvent] Error:', error)
    throw new Error('Failed to attach menu to event')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/menus/${menuId}`)
  return { success: true }
}

/**
 * Detach menu from event (set menus.event_id to null)
 */
export async function detachMenuFromEvent(menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get current event_id for revalidation
  const { data: menu } = await supabase
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { error } = await supabase
    .from('menus')
    .update({ event_id: null, updated_by: user.id })
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[detachMenuFromEvent] Error:', error)
    throw new Error('Failed to detach menu from event')
  }

  if (menu?.event_id) {
    revalidatePath(`/events/${menu.event_id}`)
  }
  revalidatePath(`/menus/${menuId}`)
  return { success: true }
}

/**
 * Get menus attached to an event (via menus.event_id FK)
 */
export async function getEventMenus(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: menus, error } = await supabase
    .from('menus')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventMenus] Error:', error)
    throw new Error('Failed to fetch event menus')
  }

  return menus || []
}

/**
 * Get events using a specific menu
 */
export async function getMenuEvent(menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: menu, error } = await supabase
    .from('menus')
    .select(`
      event_id,
      event:events(id, occasion, event_date, status, quoted_price_cents)
    `)
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getMenuEvent] Error:', error)
    return null
  }

  return menu?.event || null
}

// ============================================
// MENU STATUS TRANSITIONS
// ============================================

const VALID_MENU_TRANSITIONS: Record<MenuStatus, MenuStatus[]> = {
  draft: ['shared', 'archived'],
  shared: ['locked', 'draft', 'archived'],
  locked: ['archived'],
  archived: ['draft']
}

/**
 * Transition menu status (chef-only)
 */
export async function transitionMenu(menuId: string, toStatus: MenuStatus, reason?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current menu
  const { data: menu } = await supabase
    .from('menus')
    .select('status')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) {
    throw new Error('Menu not found')
  }

  const currentStatus = menu.status as MenuStatus
  const allowedTransitions = VALID_MENU_TRANSITIONS[currentStatus] || []

  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(`Cannot transition menu from '${currentStatus}' to '${toStatus}'`)
  }

  // Build update payload with status-specific timestamps
  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    updated_by: user.id
  }

  if (toStatus === 'shared') {
    updatePayload.shared_at = new Date().toISOString()
  } else if (toStatus === 'locked') {
    updatePayload.locked_at = new Date().toISOString()
  } else if (toStatus === 'archived') {
    updatePayload.archived_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('menus')
    .update(updatePayload)
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[transitionMenu] Error:', updateError)
    throw new Error('Failed to transition menu')
  }

  // Log transition
  await supabase.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: menuId,
    from_status: currentStatus,
    to_status: toStatus,
    transitioned_by: user.id,
    reason
  })

  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'menu_transitioned',
      domain: 'menu',
      entityType: 'menu',
      entityId: menuId,
      summary: `Menu moved from ${currentStatus} → ${toStatus}`,
      context: { from_status: currentStatus, to_status: toStatus, reason },
    })
  } catch (err) {
    console.error('[transitionMenu] Activity log failed (non-blocking):', err)
  }

  return { success: true }
}

// ============================================
// DISH CRUD
// ============================================

/**
 * Add dish to menu (chef-only)
 */
export async function addDishToMenu(input: CreateDishInput) {
  const user = await requireChef()
  const validated = CreateDishSchema.parse(input)

  const supabase = createServerClient()

  // Verify menu belongs to tenant and is editable
  const { data: menu } = await supabase
    .from('menus')
    .select('status')
    .eq('id', validated.menu_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) {
    throw new Error('Menu not found')
  }

  if (menu.status === 'locked') {
    throw new Error('Cannot add dishes to a locked menu')
  }

  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: validated.menu_id,
      course_name: validated.course_name,
      course_number: validated.course_number,
      description: validated.description,
      dietary_tags: validated.dietary_tags,
      allergen_flags: validated.allergen_flags,
      chef_notes: validated.chef_notes,
      client_notes: validated.client_notes,
      sort_order: validated.sort_order ?? 0,
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('[addDishToMenu] Error:', error)
    throw new Error('Failed to add dish')
  }

  revalidatePath(`/menus/${validated.menu_id}`)
  return { success: true, dish }
}

/**
 * Update dish (chef-only)
 */
export async function updateDish(dishId: string, input: UpdateDishInput) {
  const user = await requireChef()
  const validated = UpdateDishSchema.parse(input)

  const supabase = createServerClient()

  const { data: dish, error } = await supabase
    .from('dishes')
    .update({
      ...validated,
      updated_by: user.id
    })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateDish] Error:', error)
    throw new Error('Failed to update dish')
  }

  revalidatePath(`/menus/${dish.menu_id}`)
  return { success: true, dish }
}

/**
 * Delete dish (chef-only)
 * Cascades to components via ON DELETE CASCADE
 */
export async function deleteDish(dishId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get menu_id for revalidation
  const { data: dish } = await supabase
    .from('dishes')
    .select('menu_id')
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) {
    throw new Error('Dish not found')
  }

  const { error } = await supabase
    .from('dishes')
    .delete()
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteDish] Error:', error)
    throw new Error('Failed to delete dish')
  }

  revalidatePath(`/menus/${dish.menu_id}`)
  return { success: true }
}

// ============================================
// COMPONENT CRUD
// ============================================

/**
 * Add component to dish (chef-only)
 */
export async function addComponentToDish(input: CreateComponentInput) {
  const user = await requireChef()
  const validated = CreateComponentSchema.parse(input)

  const supabase = createServerClient()

  const { data: component, error } = await supabase
    .from('components')
    .insert({
      tenant_id: user.tenantId!,
      dish_id: validated.dish_id,
      name: validated.name,
      category: validated.category as ComponentCategory,
      description: validated.description,
      recipe_id: validated.recipe_id,
      scale_factor: validated.scale_factor,
      is_make_ahead: validated.is_make_ahead,
      make_ahead_window_hours: validated.make_ahead_window_hours,
      execution_notes: validated.execution_notes,
      storage_notes: validated.storage_notes,
      sort_order: validated.sort_order ?? 0,
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('[addComponentToDish] Error:', error)
    throw new Error('Failed to add component')
  }

  return { success: true, component }
}

/**
 * Update component (chef-only)
 */
export async function updateComponent(componentId: string, input: UpdateComponentInput) {
  const user = await requireChef()
  const validated = UpdateComponentSchema.parse(input)

  const supabase = createServerClient()

  const { data: component, error } = await supabase
    .from('components')
    .update({
      ...validated,
      category: validated.category as ComponentCategory | undefined,
      updated_by: user.id
    })
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateComponent] Error:', error)
    throw new Error('Failed to update component')
  }

  return { success: true, component }
}

/**
 * Delete component (chef-only)
 */
export async function deleteComponent(componentId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('components')
    .delete()
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteComponent] Error:', error)
    throw new Error('Failed to delete component')
  }

  return { success: true }
}

// ============================================
// MENU DUPLICATION
// ============================================

/**
 * Duplicate menu with full hierarchy (chef-only)
 * Copies: menu → dishes → components
 * New menu is always 'draft' with no event attachment
 */
export async function duplicateMenu(menuId: string) {
  const user = await requireChef()

  // Get full menu with dishes and components
  const original = await getMenuById(menuId)
  if (!original) {
    throw new Error('Menu not found')
  }

  const supabase = createServerClient()

  // Create menu copy (no event attachment, draft status)
  const { data: newMenu, error: menuError } = await supabase
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: `${original.name} (Copy)`,
      description: original.description,
      service_style: original.service_style,
      cuisine_type: original.cuisine_type,
      target_guest_count: original.target_guest_count,
      notes: original.notes,
      is_template: original.is_template,
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single()

  if (menuError || !newMenu) {
    console.error('[duplicateMenu] Error:', menuError)
    throw new Error('Failed to duplicate menu')
  }

  // Copy dishes and their components
  for (const dish of original.dishes) {
    const { data: newDish, error: dishError } = await supabase
      .from('dishes')
      .insert({
        tenant_id: user.tenantId!,
        menu_id: newMenu.id,
        course_name: dish.course_name,
        course_number: dish.course_number,
        description: dish.description,
        dietary_tags: dish.dietary_tags,
        allergen_flags: dish.allergen_flags,
        chef_notes: dish.chef_notes,
        client_notes: dish.client_notes,
        sort_order: dish.sort_order,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single()

    if (dishError || !newDish) {
      console.error('[duplicateMenu] Dish copy error:', dishError)
      continue
    }

    // Copy components for this dish
    for (const comp of dish.components) {
      const { error } = await supabase.from('components').insert({
        tenant_id: user.tenantId!,
        dish_id: newDish.id,
        name: comp.name,
        category: comp.category,
        description: comp.description,
        recipe_id: comp.recipe_id,
        scale_factor: comp.scale_factor,
        is_make_ahead: comp.is_make_ahead,
        make_ahead_window_hours: comp.make_ahead_window_hours,
        execution_notes: comp.execution_notes,
        storage_notes: comp.storage_notes,
        sort_order: comp.sort_order,
        created_by: user.id,
        updated_by: user.id
      })
      if (error) {
        console.error('[duplicateMenu] Component insert failed:', error)
        throw new Error('Failed to duplicate menu component')
      }
    }
  }

  // Log initial transition
  await supabase.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: newMenu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    reason: `Duplicated from menu ${menuId}`
  })

  revalidatePath('/menus')
  return { success: true, menu: newMenu }
}

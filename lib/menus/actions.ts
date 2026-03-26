// Menu CRUD Server Actions
// Chef-only: Manage menus, dishes, and components (relational model)
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'
import type { ComponentCategory } from './constants'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import { createConflictError } from '@/lib/mutations/conflict'
import { UnknownAppError } from '@/lib/errors/app-error'
import { isMissingSoftDeleteColumn } from '@/lib/mutations/soft-delete-compat'
import { getDuplicateCourseError } from '@/lib/menus/course-utils'

type MenuStatus = Database['public']['Enums']['menu_status']
// 'draft' | 'shared' | 'locked' | 'archived'

type ServiceStyle = Database['public']['Enums']['event_service_style']

// ============================================
// MENU SCHEMAS
// ============================================

const CreateMenuSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  cuisine_type: z.string().optional(),
  scene_type: z.string().optional(),
  target_guest_count: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_template: z.boolean().optional(),
  event_id: z.string().uuid().optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  client_id: z.string().uuid().optional(),
  target_date: z.string().optional(),
  idempotency_key: z.string().optional(),
})

const UpdateMenuSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  cuisine_type: z.string().optional(),
  scene_type: z.string().optional(),
  target_guest_count: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_template: z.boolean().optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  target_date: z.string().nullable().optional(),
  expected_updated_at: z.string().optional(),
  idempotency_key: z.string().optional(),
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
  name: z.string().optional(),
  description: z.string().optional(),
  dietary_tags: z.array(z.string()).default([]),
  allergen_flags: z.array(z.string()).default([]),
  chef_notes: z.string().optional(),
  client_notes: z.string().optional(),
  sort_order: z.number().int().optional(),
  plating_instructions: z.string().optional(),
  beverage_pairing: z.string().optional(),
  beverage_pairing_notes: z.string().optional(),
})

const UpdateDishSchema = z.object({
  course_name: z.string().min(1).optional(),
  course_number: z.number().int().positive().optional(),
  name: z.string().nullable().optional(),
  description: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  allergen_flags: z.array(z.string()).optional(),
  chef_notes: z.string().optional(),
  client_notes: z.string().optional(),
  sort_order: z.number().int().optional(),
  plating_instructions: z.string().nullable().optional(),
  beverage_pairing: z.string().nullable().optional(),
  beverage_pairing_notes: z.string().nullable().optional(),
})

export type CreateDishInput = z.infer<typeof CreateDishSchema>
export type UpdateDishInput = z.infer<typeof UpdateDishSchema>

// ============================================
// COMPONENT SCHEMAS
// ============================================

// COMPONENT_CATEGORIES and TRANSPORT_CATEGORIES exported from lib/menus/constants.ts
import { COMPONENT_CATEGORIES, TRANSPORT_CATEGORIES, PREP_TIMES_OF_DAY } from './constants'

const CreateComponentSchema = z.object({
  dish_id: z.string().uuid(),
  name: z.string().min(1, 'Component name required'),
  category: z.enum(COMPONENT_CATEGORIES),
  description: z.string().optional(),
  recipe_id: z.string().uuid().optional(),
  scale_factor: z.number().positive().default(1),
  is_make_ahead: z.boolean().default(false),
  make_ahead_window_hours: z.number().int().positive().optional(),
  transport_category: z.enum(TRANSPORT_CATEGORIES).optional(),
  execution_notes: z.string().optional(),
  storage_notes: z.string().optional(),
  sort_order: z.number().int().optional(),
  // Portion sizing
  portion_quantity: z.number().positive().optional(),
  portion_unit: z.string().optional(),
  // Prep timeline
  prep_day_offset: z.number().int().max(0).optional(),
  prep_time_of_day: z.enum(PREP_TIMES_OF_DAY).optional(),
  prep_station: z.string().optional(),
})

const UpdateComponentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(COMPONENT_CATEGORIES).optional(),
  description: z.string().optional(),
  recipe_id: z.string().uuid().nullable().optional(),
  scale_factor: z.number().positive().optional(),
  is_make_ahead: z.boolean().optional(),
  make_ahead_window_hours: z.number().int().positive().nullable().optional(),
  transport_category: z.enum(TRANSPORT_CATEGORIES).nullable().optional(),
  execution_notes: z.string().optional(),
  storage_notes: z.string().optional(),
  sort_order: z.number().int().optional(),
  // Portion sizing
  portion_quantity: z.number().positive().nullable().optional(),
  portion_unit: z.string().nullable().optional(),
  // Prep timeline
  prep_day_offset: z.number().int().max(0).nullable().optional(),
  prep_time_of_day: z.enum(PREP_TIMES_OF_DAY).nullable().optional(),
  prep_station: z.string().nullable().optional(),
})

export type CreateComponentInput = z.infer<typeof CreateComponentSchema>
export type UpdateComponentInput = z.infer<typeof UpdateComponentSchema>
export type { ComponentCategory, TransportCategory } from './constants'
// COMPONENT_CATEGORIES and TRANSPORT_CATEGORIES are in lib/menus/constants.ts

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
  const db: any = createServerClient()

  // If event_id provided, verify event belongs to tenant
  if (validated.event_id) {
    const { data: event } = await db
      .from('events')
      .select('tenant_id')
      .eq('id', validated.event_id)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .single()

    if (!event) {
      throw new UnknownAppError('Event not found or does not belong to your tenant')
    }
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'menus.create',
    idempotencyKey: validated.idempotency_key,
    execute: async () => {
      const { data: menu, error } = await db
        .from('menus')
        .insert({
          tenant_id: user.tenantId!,
          name: validated.name,
          description: validated.description,
          service_style: validated.service_style as ServiceStyle | undefined,
          cuisine_type: validated.cuisine_type,
          scene_type: validated.scene_type,
          target_guest_count: validated.target_guest_count,
          notes: validated.notes,
          is_template: validated.is_template,
          event_id: validated.event_id,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single()

      if (error || !menu) {
        console.error('[createMenu] Error:', error)
        throw new UnknownAppError('Failed to create menu')
      }

      // Log initial transition to 'draft'
      await db.from('menu_state_transitions').insert({
        tenant_id: user.tenantId!,
        menu_id: menu.id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: user.id,
      })

      if (validated.event_id) {
        await (db
          .from('events' as any)
          .update({
            menu_id: menu.id,
            course_count: 1,
            updated_by: user.id,
          })
          .eq('id', validated.event_id)
          .eq('tenant_id', user.tenantId!)
          .is('deleted_at' as any, null) as any)
      }

      revalidatePath('/menus')
      return { success: true, menu }
    },
  })

  const menu = result.menu

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
      context: {
        name: validated.name,
        is_template: validated.is_template,
        event_id: validated.event_id,
      },
    })
  } catch (err) {
    console.error('[createMenu] Activity log failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'menu.created', {
      menu_id: menu.id,
      name: validated.name,
      event_id: validated.event_id || null,
      is_template: validated.is_template || false,
    })
  } catch {}

  return result
}

// ─── Course input type for createMenuWithCourses ──────────────────────────────

export type CourseInput = {
  course_label: string
  dish_name?: string
  description?: string
}

/**
 * Create a menu with an initial set of courses in one operation.
 * Returns { menu, dishes, courseErrors } so callers can surface any per-course failures.
 */
export async function createMenuWithCourses(
  menuInput: CreateMenuInput,
  courses: CourseInput[]
): Promise<{ menu: any; dishes: any[]; courseErrors: string[] }> {
  const menuResult = await createMenu(menuInput)
  const menu = (menuResult as any).menu
  if (!menu?.id) throw new UnknownAppError('Menu creation failed')

  const dishes: any[] = []
  const courseErrors: string[] = []

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i]
    const courseNumber = i + 1
    try {
      const result = await addDishToMenu({
        menu_id: menu.id,
        course_number: courseNumber,
        course_name: course.course_label || `Course ${courseNumber}`,
        name: course.dish_name || undefined,
        description: course.description || undefined,
        dietary_tags: [],
        allergen_flags: [],
      })
      if ((result as any).dish) dishes.push((result as any).dish)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Course ${courseNumber} failed`
      courseErrors.push(msg)
      console.error(`[createMenuWithCourses] Course ${courseNumber} error:`, err)
    }
  }

  return { menu, dishes, courseErrors }
}

/**
 * Get all menus for chef's tenant
 */
export async function getMenus({ statusFilter }: { statusFilter?: MenuStatus } = {}) {
  const user = await requireChef()
  const db: any = createServerClient()

  const buildQuery = (withSoftDeleteFilter: boolean) => {
    let query = db.from('menus').select('*').eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    return query
  }

  let response = await buildQuery(true).order('created_at', { ascending: false })
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await buildQuery(false).order('created_at', { ascending: false })
  }
  const { data: menus, error } = response

  if (error) {
    console.error('[getMenus] Error:', error)
    throw new UnknownAppError('Failed to fetch menus')
  }

  return menus
}

/**
 * Get single menu by ID with dishes and components (chef-only)
 */
export async function getMenuById(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db.from('menus').select('*').eq('id', menuId).eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: menu, error } = response

  if (error) {
    console.error('[getMenuById] Error:', error)
    return null
  }

  // Fetch dishes for this menu
  const { data: dishes } = await db
    .from('dishes')
    .select('*')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  // Fetch components for all dishes
  const dishIds = (dishes || []).map((d: any) => d.id)

  // Query components if there are dishes
  const componentRows =
    dishIds.length > 0
      ? (
          await db
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
    dishes: (dishes || []).map((dish: any) => ({
      ...dish,
      components: componentsByDish.get(dish.id) || [],
    })),
  }
}

/**
 * Update menu (chef-only)
 * Only allowed when menu is in 'draft' status
 */
export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const user = await requireChef()
  const validated = UpdateMenuSchema.parse(input)
  const { expected_updated_at, idempotency_key, ...updateFields } = validated

  const db: any = createServerClient()

  // Verify menu exists and is editable
  const { data: currentMenu } = await (db
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!currentMenu || currentMenu.deleted_at) {
    throw new UnknownAppError('Menu not found')
  }

  if (currentMenu.status === 'locked') {
    throw new UnknownAppError('Cannot edit a locked menu')
  }

  if (expected_updated_at && currentMenu.updated_at !== expected_updated_at) {
    throw createConflictError('This record changed elsewhere.', currentMenu.updated_at)
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'menus.update',
    idempotencyKey: idempotency_key,
    execute: async () => {
      const runUpdate = async (withSoftDeleteFilter: boolean) => {
        let query = db
          .from('menus')
          .update({
            ...updateFields,
            service_style: updateFields.service_style as ServiceStyle | undefined,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', menuId)
          .eq('tenant_id', user.tenantId!)
        if (withSoftDeleteFilter) {
          query = query.is('deleted_at' as any, null)
        }
        if (expected_updated_at) {
          query = query.eq('updated_at', expected_updated_at)
        }
        return query.select().single()
      }

      let response = await runUpdate(true)
      if (isMissingSoftDeleteColumn(response.error)) {
        response = await runUpdate(false)
      }
      const { data: menu, error } = response

      if (error || !menu) {
        if (expected_updated_at) {
          const getLatest = async (withSoftDeleteFilter: boolean) => {
            let query = db
              .from('menus')
              .select('updated_at')
              .eq('id', menuId)
              .eq('tenant_id', user.tenantId!)
            if (withSoftDeleteFilter) {
              query = query.is('deleted_at' as any, null)
            }
            return query.maybeSingle()
          }

          let latestResponse = await getLatest(true)
          if (isMissingSoftDeleteColumn(latestResponse.error)) {
            latestResponse = await getLatest(false)
          }
          const latest = latestResponse.data

          if (latest?.updated_at && latest.updated_at !== expected_updated_at) {
            throw createConflictError('This record changed elsewhere.', latest.updated_at)
          }
        }

        console.error('[updateMenu] Error:', error)
        throw new UnknownAppError('Failed to update menu')
      }

      revalidatePath('/menus')
      revalidatePath(`/menus/${menuId}`)

      // Log chef activity (non-blocking)
      try {
        const { logChefActivity } = await import('@/lib/activity/log-chef')
        const changedFields = Object.keys(updateFields)
        const fieldDiffs = Object.fromEntries(
          changedFields.map((field) => [
            field,
            {
              before: (currentMenu as Record<string, unknown>)[field] ?? null,
              after: (menu as Record<string, unknown>)[field] ?? null,
            },
          ])
        )
        await logChefActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'menu_updated',
          domain: 'menu',
          entityType: 'menu',
          entityId: menuId,
          summary: `Updated menu: ${menu.name} - ${changedFields.join(', ')}`,
          context: {
            name: menu.name,
            changed_fields: changedFields,
            field_diffs: fieldDiffs,
          },
        })
      } catch (err) {
        console.error('[updateMenu] Activity log failed (non-blocking):', err)
      }

      // Outbound webhook dispatch (non-blocking)
      try {
        const { emitWebhook } = await import('@/lib/webhooks/emitter')
        await emitWebhook(user.tenantId!, 'menu.updated', {
          menu_id: menuId,
          name: menu.name,
          changed_fields: Object.keys(updateFields),
        })
      } catch {}

      return { success: true, menu }
    },
  })

  return result
}

/**
 * Delete menu (chef-only)
 * Only draft menus with no event attachment can be deleted
 */
export async function deleteMenu(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check menu status and event attachment
  const { data: menu } = await (db
    .from('menus')
    .select('status, event_id, deleted_at')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!menu || menu.deleted_at) {
    throw new UnknownAppError('Menu not found')
  }

  if (menu.status !== 'draft') {
    throw new UnknownAppError('Can only delete menus in draft status. Archive instead.')
  }

  if (menu.event_id) {
    throw new UnknownAppError('Cannot delete menu attached to an event. Detach first.')
  }

  // Soft delete menu
  const { error } = await db
    .from('menus')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    } as any)
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[deleteMenu] Error:', error)
    throw new UnknownAppError('Failed to delete menu')
  }

  revalidatePath('/menus')
  return { success: true }
}

export async function restoreMenu(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('menus')
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_by: user.id,
    } as any)
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreMenu] Error:', error)
    throw new UnknownAppError('Failed to restore menu')
  }

  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)
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
  const db: any = createServerClient()

  const { error } = await db.rpc('attach_menu_to_event_atomic', {
    p_event_id: eventId,
    p_menu_id: menuId,
    p_tenant_id: user.tenantId!,
    p_actor_id: user.id,
  })

  if (error) {
    console.error('[attachMenuToEvent] RPC error:', error)
    throw new UnknownAppError(error.message || 'Failed to attach menu to event')
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
  const db: any = createServerClient()

  const { data, error } = await db.rpc('detach_menu_from_event_atomic', {
    p_menu_id: menuId,
    p_tenant_id: user.tenantId!,
    p_actor_id: user.id,
  })

  if (error) {
    console.error('[detachMenuFromEvent] RPC error:', error)
    throw new UnknownAppError(error.message || 'Failed to detach menu from event')
  }

  const detached = data as { event_id: string | null } | null

  if (detached?.event_id) {
    revalidatePath(`/events/${detached.event_id}`)
  }
  revalidatePath(`/menus/${menuId}`)
  return { success: true }
}

/**
 * Get menus attached to an event (via menus.event_id FK)
 */
export async function getEventMenus(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menus, error } = await db
    .from('menus')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventMenus] Error:', error)
    throw new UnknownAppError('Failed to fetch event menus')
  }

  return menus || []
}

/**
 * Get events using a specific menu
 */
export async function getMenuEvent(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu, error } = await db
    .from('menus')
    .select(
      `
      event_id,
      event:events(id, occasion, event_date, status, quoted_price_cents, clients(full_name))
    `
    )
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
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
  archived: ['draft'],
}

/**
 * Transition menu status (chef-only)
 */
export async function transitionMenu(menuId: string, toStatus: MenuStatus, reason?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current menu
  const { data: menu } = await (db
    .from('menus')
    .select('status, deleted_at')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single() as any)

  if (!menu || menu.deleted_at) {
    throw new UnknownAppError('Menu not found')
  }

  const currentStatus = menu.status as MenuStatus
  const allowedTransitions = VALID_MENU_TRANSITIONS[currentStatus] || []

  if (!allowedTransitions.includes(toStatus)) {
    throw new UnknownAppError(`Cannot transition menu from '${currentStatus}' to '${toStatus}'`)
  }

  // Build update payload with status-specific timestamps
  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    updated_by: user.id,
  }

  if (toStatus === 'shared') {
    updatePayload.shared_at = new Date().toISOString()
  } else if (toStatus === 'locked') {
    updatePayload.locked_at = new Date().toISOString()
  } else if (toStatus === 'archived') {
    updatePayload.archived_at = new Date().toISOString()
  }

  const { error: updateError } = await db
    .from('menus')
    .update(updatePayload)
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (updateError) {
    console.error('[transitionMenu] Error:', updateError)
    throw new UnknownAppError('Failed to transition menu')
  }

  // Log transition
  await db.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: menuId,
    from_status: currentStatus,
    to_status: toStatus,
    transitioned_by: user.id,
    reason,
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

  // Circle-first: post menu shared notification (non-blocking)
  if (toStatus === 'shared') {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      const adminSupa = createServerClient({ admin: true })
      const { data: menuData } = await adminSupa
        .from('menus')
        .select('name, event_id')
        .eq('id', menuId)
        .single()

      let inquiryId: string | null = null
      if (menuData?.event_id) {
        const { data: inq } = await adminSupa
          .from('inquiries')
          .select('id')
          .eq('converted_to_event_id', menuData.event_id)
          .limit(1)
          .maybeSingle()
        inquiryId = inq?.id ?? null
      }

      const menuName = menuData?.name || 'Menu'
      await circleFirstNotify({
        eventId: menuData?.event_id ?? null,
        inquiryId,
        notificationType: 'menu_shared',
        body: `Menu shared: ${menuName}. Take a look and let me know what you think!`,
        metadata: {
          menu_id: menuId,
          menu_name: menuName,
        },
        actionUrl: menuData?.event_id ? `/my-events/${menuData.event_id}` : undefined,
        actionLabel: 'View Menu',
      })
    } catch (err) {
      console.error('[transitionMenu] Circle-first notify failed (non-blocking):', err)
    }
  }

  // Auto-index dishes when a menu is locked (non-blocking side effect)
  if (toStatus === 'locked') {
    try {
      const { indexDishesFromMenu } = await import('@/lib/menus/dish-index-bridge')
      await indexDishesFromMenu(menuId, user.tenantId!, user.id)
    } catch (err) {
      console.error('[transitionMenu] Dish index bridge failed (non-blocking):', err)
    }
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

  const db: any = createServerClient()

  // Verify menu belongs to tenant and is editable
  const { data: menu } = await db
    .from('menus')
    .select('status')
    .eq('id', validated.menu_id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!menu) {
    throw new UnknownAppError('Menu not found')
  }

  if (menu.status === 'locked') {
    throw new UnknownAppError('Cannot add dishes to a locked menu')
  }

  const { data: existingDish } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', validated.menu_id)
    .eq('tenant_id', user.tenantId!)
    .eq('course_number', validated.course_number)
    .maybeSingle()

  if (existingDish) {
    throw new UnknownAppError(getDuplicateCourseError(validated.course_number))
  }

  const { data: dish, error } = await db
    .from('dishes')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: validated.menu_id,
      course_name: validated.course_name,
      course_number: validated.course_number,
      name: validated.name,
      description: validated.description,
      dietary_tags: validated.dietary_tags,
      allergen_flags: validated.allergen_flags,
      chef_notes: validated.chef_notes,
      client_notes: validated.client_notes,
      sort_order: validated.sort_order ?? 0,
      plating_instructions: validated.plating_instructions,
      beverage_pairing: validated.beverage_pairing,
      beverage_pairing_notes: validated.beverage_pairing_notes,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('[addDishToMenu] Error:', error)
    if (error.code === '23505') {
      throw new UnknownAppError(getDuplicateCourseError(validated.course_number))
    }
    throw new UnknownAppError('Failed to add dish')
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

  const db: any = createServerClient()

  const { data: dish, error } = await db
    .from('dishes')
    .update({
      ...validated,
      updated_by: user.id,
    })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateDish] Error:', error)
    throw new UnknownAppError('Failed to update dish')
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
  const db: any = createServerClient()

  // Get menu_id for revalidation
  const { data: dish } = await db
    .from('dishes')
    .select('menu_id')
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) {
    throw new UnknownAppError('Dish not found')
  }

  const { error } = await db
    .from('dishes')
    .delete()
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteDish] Error:', error)
    throw new UnknownAppError('Failed to delete dish')
  }

  revalidatePath(`/menus/${dish.menu_id}`)
  return { success: true }
}

/**
 * Get all dishes across all menus (for component assignment)
 */
export async function getAllDishes(): Promise<{ id: string; name: string; menuName: string }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dishes')
    .select('id, name, course_name, menu:menus(name)')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllDishes] Error:', error)
    return []
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name || d.course_name || 'Untitled Dish',
    menuName: d.menu?.name || '',
  }))
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

  const db: any = createServerClient()

  const { data: component, error } = await db
    .from('components')
    .insert({
      tenant_id: user.tenantId!,
      dish_id: validated.dish_id,
      name: validated.name,
      category: validated.category,
      description: validated.description,
      recipe_id: validated.recipe_id,
      scale_factor: validated.scale_factor,
      is_make_ahead: validated.is_make_ahead,
      make_ahead_window_hours: validated.make_ahead_window_hours,
      transport_category: validated.transport_category,
      execution_notes: validated.execution_notes,
      storage_notes: validated.storage_notes,
      sort_order: validated.sort_order ?? 0,
      portion_quantity: validated.portion_quantity,
      portion_unit: validated.portion_unit,
      prep_day_offset: validated.prep_day_offset,
      prep_time_of_day: validated.prep_time_of_day,
      prep_station: validated.prep_station,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('[addComponentToDish] Error:', error)
    throw new UnknownAppError('Failed to add component')
  }

  return { success: true, component }
}

/**
 * Update component (chef-only)
 */
export async function updateComponent(componentId: string, input: UpdateComponentInput) {
  const user = await requireChef()
  const validated = UpdateComponentSchema.parse(input)

  const db: any = createServerClient()

  const { data: component, error } = await db
    .from('components')
    .update({
      ...validated,
      category: validated.category,
      updated_by: user.id,
    })
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateComponent] Error:', error)
    throw new UnknownAppError('Failed to update component')
  }

  return { success: true, component }
}

/**
 * Delete component (chef-only)
 */
export async function deleteComponent(componentId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('components')
    .delete()
    .eq('id', componentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteComponent] Error:', error)
    throw new UnknownAppError('Failed to delete component')
  }

  return { success: true }
}

// ============================================
// ALL COMPONENTS (cross-menu)
// ============================================

export type ComponentListItem = {
  id: string
  name: string
  category: string
  is_make_ahead: boolean
  make_ahead_window_hours: number | null
  transport_category: string | null
  storage_notes: string | null
  execution_notes: string | null
  recipe_id: string | null
  dish_id: string
  dish_name: string | null
  menu_id: string | null
  menu_name: string | null
  created_at: string
}

export async function getAllComponents(filters?: {
  is_make_ahead?: boolean
  has_recipe?: boolean
}): Promise<ComponentListItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('components')
    .select(
      `
      id, name, category, is_make_ahead, make_ahead_window_hours,
      transport_category, storage_notes, execution_notes, recipe_id, dish_id, created_at,
      dish:dishes(id, course_name, menu:menus(id, name))
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.is_make_ahead === true) {
    query = query.eq('is_make_ahead', true)
  }

  const { data: components, error } = await query

  if (error) {
    console.error('[getAllComponents] Error:', error)
    throw new UnknownAppError('Failed to fetch components')
  }

  let result: ComponentListItem[] = (components || []).map((c: any) => {
    const dish = c.dish as any
    const raw = c as any
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      is_make_ahead: c.is_make_ahead,
      make_ahead_window_hours: c.make_ahead_window_hours,
      transport_category: raw.transport_category ?? null,
      storage_notes: c.storage_notes,
      execution_notes: c.execution_notes,
      recipe_id: c.recipe_id,
      dish_id: c.dish_id,
      dish_name: dish?.course_name ?? null,
      menu_id: dish?.menu?.id ?? null,
      menu_name: dish?.menu?.name ?? null,
      created_at: c.created_at,
    }
  })

  if (filters?.has_recipe === true) {
    result = result.filter((c) => c.recipe_id !== null)
  } else if (filters?.has_recipe === false) {
    result = result.filter((c) => c.recipe_id === null)
  }

  return result
}

// ============================================
// MENU COST SUMMARIES (from DB view)
// ============================================

export type MenuCostSummary = {
  menu_id: string
  menu_name: string | null
  event_id: string | null
  total_component_count: number | null
  total_recipe_cost_cents: number | null
  cost_per_guest_cents: number | null
  food_cost_percentage: number | null
  has_all_recipe_costs: boolean | null
}

export async function getMenuCostSummaries(): Promise<MenuCostSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_cost_summary')
    .select(
      'menu_id, menu_name, event_id, total_component_count, total_recipe_cost_cents, cost_per_guest_cents, food_cost_percentage, has_all_recipe_costs'
    )
    .eq('tenant_id', user.tenantId!)
    .order('total_recipe_cost_cents', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[getMenuCostSummaries] Error:', error)
    throw new UnknownAppError('Failed to fetch menu cost summaries')
  }

  return (data || []) as MenuCostSummary[]
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
    throw new UnknownAppError('Menu not found')
  }

  const db: any = createServerClient()

  // Create menu copy (no event attachment, draft status)
  const { data: newMenu, error: menuError } = await db
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
      updated_by: user.id,
    })
    .select()
    .single()

  if (menuError || !newMenu) {
    console.error('[duplicateMenu] Error:', menuError)
    throw new UnknownAppError('Failed to duplicate menu')
  }

  // Copy dishes and their components
  for (const dish of original.dishes) {
    const dishRaw = dish as any
    const { data: newDish, error: dishError } = await db
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
        plating_instructions: dishRaw.plating_instructions ?? null,
        beverage_pairing: dishRaw.beverage_pairing ?? null,
        beverage_pairing_notes: dishRaw.beverage_pairing_notes ?? null,
        created_by: user.id,
        updated_by: user.id,
      } as any)
      .select()
      .single()

    if (dishError || !newDish) {
      console.error('[duplicateMenu] Dish copy error:', dishError)
      continue
    }

    // Copy components for this dish
    for (const comp of dish.components) {
      const compRaw = comp as any
      const { error } = await db.from('components').insert({
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
        portion_quantity: compRaw.portion_quantity ?? null,
        portion_unit: compRaw.portion_unit ?? null,
        prep_day_offset: compRaw.prep_day_offset ?? 0,
        prep_time_of_day: compRaw.prep_time_of_day ?? null,
        prep_station: compRaw.prep_station ?? null,
        created_by: user.id,
        updated_by: user.id,
      } as any)
      if (error) {
        console.error('[duplicateMenu] Component insert failed:', error)
        throw new UnknownAppError('Failed to duplicate menu component')
      }
    }
  }

  // Log initial transition
  await db.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: newMenu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    reason: `Duplicated from menu ${menuId}`,
  })

  revalidatePath('/menus')
  return { success: true, menu: newMenu }
}

// ============================================
// MENU TEMPLATES
// ============================================

/**
 * Clone a menu - creates a draft copy with "(Copy)" suffix.
 * Copies the full hierarchy: menu → dishes → components.
 * The clone is never attached to an event and is never a template.
 */
export async function cloneMenu(menuId: string) {
  // Delegate to the existing duplicateMenu which performs a full deep copy
  const result = await duplicateMenu(menuId)

  // Ensure the clone is not marked as a template
  try {
    const db: any = createServerClient()
    const user = await requireChef()
    await db
      .from('menus')
      .update({ is_template: false, event_id: null })
      .eq('id', result.menu.id)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
  } catch {
    // Non-blocking: if the update fails the clone itself still exists as draft
  }

  revalidatePath('/menus')
  return result.menu
}

/**
 * Save an existing menu as a template (sets is_template = true).
 * The menu remains in its current state; it is just flagged as reusable.
 */
export async function saveMenuAsTemplate(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('menus')
    .update({ is_template: true, updated_by: user.id })
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[saveMenuAsTemplate] Error:', error)
    throw new UnknownAppError('Failed to save menu as template')
  }

  revalidatePath('/menus')
  revalidatePath('/settings/templates')
  return { success: true }
}

/**
 * List all menus flagged as templates for the chef's tenant.
 */
export async function listMenuTemplates() {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data, error } = await db
      .from('menus')
      .select('id, name, description, service_style, cuisine_type, target_guest_count, created_at')
      .eq('tenant_id', user.tenantId!)
      .eq('is_template', true)
      .is('deleted_at' as any, null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[listMenuTemplates] Error:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[listMenuTemplates] Unexpected error:', err)
    return []
  }
}

// ============================================
// PREP TIMELINE
// ============================================

export type PrepTimelineSlot = {
  dayOffset: number
  dayLabel: string
  components: {
    id: string
    name: string
    category: string
    timeOfDay: string | null
    timeLabel: string
    station: string | null
    dishName: string | null
    courseName: string | null
  }[]
}

/**
 * Get prep timeline for a menu - components grouped by prep_day_offset
 */
export async function getMenuPrepTimeline(menuId: string): Promise<PrepTimelineSlot[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all components for this menu with dish info
  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_name')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map<string, string>(dishes.map((d: any) => [d.id, d.course_name]))

  const { data: components } = await (db
    .from('components')
    .select('id, name, category, dish_id, prep_day_offset, prep_time_of_day, prep_station')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('prep_day_offset', { ascending: true })
    .order('sort_order', { ascending: true }) as any)

  if (!components || components.length === 0) return []

  const { PREP_TIME_LABELS } = await import('./constants')

  // Group by day offset
  const grouped = new Map<number, PrepTimelineSlot['components']>()
  for (const c of components) {
    const raw = c as any
    const offset = raw.prep_day_offset ?? 0
    const arr = grouped.get(offset) || []
    arr.push({
      id: c.id,
      name: c.name,
      category: c.category,
      timeOfDay: raw.prep_time_of_day ?? null,
      timeLabel: raw.prep_time_of_day
        ? ((PREP_TIME_LABELS as Record<string, string>)[raw.prep_time_of_day] ??
          raw.prep_time_of_day)
        : 'Unscheduled',
      station: raw.prep_station ?? null,
      dishName: (raw as any).name ?? null,
      courseName: dishMap.get(c.dish_id) ?? null,
    })
    grouped.set(offset, arr)
  }

  // Sort by offset (most days before first: -3, -2, -1, 0)
  const offsets = Array.from(grouped.keys()).sort((a, b) => a - b)
  return offsets.map((offset) => ({
    dayOffset: offset,
    dayLabel:
      offset === 0
        ? 'Day of Service'
        : `${Math.abs(offset)} day${Math.abs(offset) > 1 ? 's' : ''} before`,
    components: grouped.get(offset) || [],
  }))
}

// ============================================
// QUICK VIEW DATA (for menu list modal)
// ============================================

export type MenuQuickViewData = {
  courses: {
    courseName: string
    courseNumber: number
    description: string | null
    componentCount: number
    dietaryTags: string[]
    allergenFlags: string[]
  }[]
  totalComponents: number
  allDietaryTags: string[]
  allAllergenFlags: string[]
  costPerGuestCents: number | null
  foodCostPercentage: number | null
  linkedEvent: {
    id: string
    occasion: string | null
    eventDate: string
    status: string
    clientName: string | null
  } | null
}

/**
 * Fetch rich quick view data for a menu (lazy-loaded when modal opens).
 * Returns courses with component counts, aggregated dietary/allergen info,
 * cost summary, and linked event details.
 */
export async function getMenuQuickViewData(menuId: string): Promise<MenuQuickViewData> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch dishes with component counts
  const { data: dishes } = await db
    .from('dishes')
    .select(
      'id, course_name, course_number, description, dietary_tags, allergen_flags, components(id)'
    )
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  // Fetch menu for event_id
  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Fetch cost summary
  const { data: costData } = await db
    .from('menu_cost_summary' as any)
    .select('cost_per_guest_cents, food_cost_percentage')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  // Fetch linked event if present
  let linkedEvent: MenuQuickViewData['linkedEvent'] = null
  if (menu?.event_id) {
    const { data: event } = await db
      .from('events')
      .select('id, occasion, event_date, status, clients(full_name)')
      .eq('id', menu.event_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (event) {
      linkedEvent = {
        id: event.id,
        occasion: event.occasion,
        eventDate: event.event_date,
        status: event.status,
        clientName: (event.clients as any)?.full_name ?? null,
      }
    }
  }

  const allDietaryTags = new Set<string>()
  const allAllergenFlags = new Set<string>()
  let totalComponents = 0

  const courses = (dishes || []).map((dish: any) => {
    const componentCount = Array.isArray(dish.components) ? dish.components.length : 0
    totalComponents += componentCount
    const tags = (dish.dietary_tags || []) as string[]
    const flags = (dish.allergen_flags || []) as string[]
    tags.forEach((t) => allDietaryTags.add(t))
    flags.forEach((f) => allAllergenFlags.add(f))
    return {
      courseName: dish.course_name,
      courseNumber: dish.course_number,
      description: dish.description,
      componentCount,
      dietaryTags: tags,
      allergenFlags: flags,
    }
  })

  return {
    courses,
    totalComponents,
    allDietaryTags: Array.from(allDietaryTags),
    allAllergenFlags: Array.from(allAllergenFlags),
    costPerGuestCents: (costData as any)?.cost_per_guest_cents ?? null,
    foodCostPercentage: (costData as any)?.food_cost_percentage ?? null,
    linkedEvent,
  }
}

// ============================================
// APPLY MENU TO EVENT (auto-duplicate templates)
// ============================================

/**
 * Apply a menu to an event. If the menu is a template, duplicates it first
 * so the original stays clean. Non-templates are attached directly.
 */
export async function applyMenuToEvent(menuId: string, eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu } = await db
    .from('menus')
    .select('id, is_template, is_showcase, name, times_used')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')

  let targetMenuId = menuId
  let wasDuplicated = false

  if (menu.is_template || menu.is_showcase) {
    const result = await duplicateMenu(menuId)
    targetMenuId = result.menu.id
    wasDuplicated = true

    // Rename the copy: remove " (Copy)" and mark it as event-specific
    await db
      .from('menus')
      .update({
        name: menu.name.replace(/ \(Copy\)$/, ''),
        is_template: false,
        is_showcase: false,
        updated_by: user.id,
      })
      .eq('id', targetMenuId)
      .eq('tenant_id', user.tenantId!)
  }

  // Increment usage count on the source menu (non-blocking, informational)
  try {
    await db
      .from('menus')
      .update({ times_used: (menu.times_used ?? 0) + 1 })
      .eq('id', menuId)
      .eq('tenant_id', user.tenantId!)
  } catch (err) {
    console.error('[applyMenuToEvent] Non-blocking times_used increment failed:', err)
  }

  await attachMenuToEvent(eventId, targetMenuId)
  return { success: true, menuId: targetMenuId, wasDuplicated }
}

// ============================================
// DISH INDEX (cross-menu dish library)
// ============================================

export type DishIndexEntry = {
  id: string
  courseName: string
  description: string | null
  courseNumber: number
  dietaryTags: string[]
  allergenFlags: string[]
  chefNotes: string | null
  menuId: string
  menuName: string
  menuStatus: string
  eventId: string | null
  componentCount: number
  createdAt: string
}

/**
 * Get a rich index of all dishes across all menus for the chef.
 * Used by the Dish Index page (/menus/dishes).
 */
export async function getDishIndex(): Promise<DishIndexEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dishes')
    .select(
      `
      id, course_name, description, course_number,
      dietary_tags, allergen_flags, chef_notes, created_at,
      menu:menus!inner(id, name, status, event_id),
      components(id)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDishIndex] Error:', error)
    return []
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    courseName: d.course_name || 'Untitled Dish',
    description: d.description,
    courseNumber: d.course_number,
    dietaryTags: d.dietary_tags || [],
    allergenFlags: d.allergen_flags || [],
    chefNotes: d.chef_notes,
    menuId: d.menu?.id || '',
    menuName: d.menu?.name || '',
    menuStatus: d.menu?.status || 'draft',
    eventId: d.menu?.event_id || null,
    componentCount: Array.isArray(d.components) ? d.components.length : 0,
    createdAt: d.created_at,
  }))
}

// ============================================
// MENU SHOPPING LIST
// ============================================

export type ShoppingListItem = {
  ingredientId: string
  ingredientName: string
  category: string
  totalQuantity: number
  unit: string
  estimatedCostCents: number
  isOptional: boolean
  hasPricing: boolean
  sources: { componentName: string; recipeName: string; dish: string; scaledQty: number }[]
}

export type MenuShoppingListResult = {
  menuName: string
  guestCount: number
  items: ShoppingListItem[]
  grouped: Record<string, ShoppingListItem[]>
  totalEstimatedCostCents: number
  linkedRecipeCount: number
  unlinkedComponentCount: number
}

export async function getMenuShoppingList(menuId: string): Promise<MenuShoppingListResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu } = await db
    .from('menus')
    .select('id, name, target_guest_count')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new Error('Menu not found')

  const guestCount = menu.target_guest_count || 1

  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_name, course_number')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return {
      menuName: menu.name,
      guestCount,
      items: [],
      grouped: {},
      totalEstimatedCostCents: 0,
      linkedRecipeCount: 0,
      unlinkedComponentCount: 0,
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('id, name, scale_factor, recipe_id, dish_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  if (!components || components.length === 0) {
    return {
      menuName: menu.name,
      guestCount,
      items: [],
      grouped: {},
      totalEstimatedCostCents: 0,
      linkedRecipeCount: 0,
      unlinkedComponentCount: 0,
    }
  }

  const linkedComponents = components.filter((c: any) => c.recipe_id)
  const unlinkedCount = components.length - linkedComponents.length

  if (linkedComponents.length === 0) {
    return {
      menuName: menu.name,
      guestCount,
      items: [],
      grouped: {},
      totalEstimatedCostCents: 0,
      linkedRecipeCount: 0,
      unlinkedComponentCount: unlinkedCount,
    }
  }

  const recipeIds = [...new Set(linkedComponents.map((c: any) => c.recipe_id))] as string[]

  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, yield_quantity, yield_unit')
    .in('id', recipeIds)
    .eq('tenant_id', user.tenantId!)

  const recipeMap = new Map(((recipes as any[]) || []).map((r: any) => [r.id, r]))

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select(
      'id, recipe_id, quantity, unit, is_optional, ingredient:ingredients(id, name, category, average_price_cents, last_price_cents)'
    )
    .in('recipe_id', recipeIds)
    .eq('tenant_id', user.tenantId!)

  const dishLookup = new Map(((dishes as any[]) || []).map((d: any) => [d.id, d]))
  const ingredientMap = new Map<string, ShoppingListItem>()

  for (const comp of linkedComponents as any[]) {
    const recipe: any = recipeMap.get(comp.recipe_id)
    if (!recipe) continue

    const yieldQty = recipe.yield_quantity || guestCount
    const scale = (((comp.scale_factor as number) || 1) * guestCount) / yieldQty
    const dish: any = dishLookup.get(comp.dish_id)
    const compIngredients = ((recipeIngredients as any[]) || []).filter(
      (ri: any) => ri.recipe_id === comp.recipe_id
    )

    for (const ri of compIngredients) {
      const ingredient = ri.ingredient
      if (!ingredient) continue

      const scaledQty = ri.quantity * scale
      const priceCents = ingredient.last_price_cents || ingredient.average_price_cents || 0
      const hasPricing = !!(ingredient.last_price_cents || ingredient.average_price_cents)
      const scaledCost = Math.round(priceCents * scaledQty)

      if (ingredientMap.has(ingredient.id)) {
        const existing = ingredientMap.get(ingredient.id)!
        existing.totalQuantity += scaledQty
        existing.estimatedCostCents += scaledCost
        existing.sources.push({
          componentName: comp.name,
          recipeName: recipe.name,
          dish: dish?.course_name || 'Course',
          scaledQty,
        })
      } else {
        ingredientMap.set(ingredient.id, {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          category: ingredient.category || 'other',
          totalQuantity: scaledQty,
          unit: ri.unit,
          estimatedCostCents: scaledCost,
          isOptional: ri.is_optional || false,
          hasPricing,
          sources: [
            {
              componentName: comp.name,
              recipeName: recipe.name,
              dish: dish?.course_name || 'Course',
              scaledQty,
            },
          ],
        })
      }
    }
  }

  const items = Array.from(ingredientMap.values()).sort((a, b) =>
    a.ingredientName.localeCompare(b.ingredientName)
  )

  const grouped = items.reduce(
    (acc, item) => {
      const cat = item.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, ShoppingListItem[]>
  )

  return {
    menuName: menu.name,
    guestCount,
    items,
    grouped,
    totalEstimatedCostCents: items.reduce((sum, i) => sum + i.estimatedCostCents, 0),
    linkedRecipeCount: recipeIds.length,
    unlinkedComponentCount: unlinkedCount,
  }
}

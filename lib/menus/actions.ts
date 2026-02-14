// Menu CRUD Server Actions
// Chef-only: Manage menu templates
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateMenuSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  price_per_person_cents: z.number().int().nonnegative().optional()
})

const UpdateMenuSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price_per_person_cents: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
})

export type CreateMenuInput = z.infer<typeof CreateMenuSchema>
export type UpdateMenuInput = z.infer<typeof UpdateMenuSchema>

/**
 * Create menu template (chef-only)
 */
export async function createMenu(input: CreateMenuInput) {
  const user = await requireChef()
  const validated = CreateMenuSchema.parse(input)

  const supabase = createServerClient()

  const { data: menu, error } = await supabase
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description,
      price_per_person_cents: validated.price_per_person_cents
    })
    .select()
    .single()

  if (error) {
    console.error('[createMenu] Error:', error)
    throw new Error('Failed to create menu')
  }

  revalidatePath('/chef/menus')
  return { success: true, menu }
}

/**
 * Get all menus for chef's tenant
 */
export async function getMenus({ activeOnly = false }: { activeOnly?: boolean } = {}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('menus')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data: menus, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[getMenus] Error:', error)
    throw new Error('Failed to fetch menus')
  }

  return menus
}

/**
 * Get single menu by ID (chef-only)
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

  return menu
}

/**
 * Update menu (chef-only)
 */
export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const user = await requireChef()
  const validated = UpdateMenuSchema.parse(input)

  const supabase = createServerClient()

  const { data: menu, error } = await supabase
    .from('menus')
    .update(validated)
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateMenu] Error:', error)
    throw new Error('Failed to update menu')
  }

  revalidatePath('/chef/menus')
  revalidatePath(`/chef/menus/${menuId}`)
  return { success: true, menu }
}

/**
 * Delete menu (chef-only)
 * Only if not attached to any events
 */
export async function deleteMenu(menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check if menu is attached to any events
  const { data: attachments } = await supabase
    .from('event_menus')
    .select('event_id')
    .eq('menu_id', menuId)
    .limit(1)

  if (attachments && attachments.length > 0) {
    throw new Error('Cannot delete menu that is attached to events. Set to inactive instead.')
  }

  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteMenu] Error:', error)
    throw new Error('Failed to delete menu')
  }

  revalidatePath('/chef/menus')
  return { success: true }
}

/**
 * Attach menu to event (chef-only)
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

  // Verify menu belongs to tenant
  const { data: menu } = await supabase
    .from('menus')
    .select('tenant_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) {
    throw new Error('Menu not found')
  }

  // Attach menu to event (ignore if already attached)
  const { error } = await supabase
    .from('event_menus')
    .insert({ event_id: eventId, menu_id: menuId })

  if (error && error.code !== '23505') { // 23505 = unique constraint violation (already attached)
    console.error('[attachMenuToEvent] Error:', error)
    throw new Error('Failed to attach menu to event')
  }

  revalidatePath(`/chef/events/${eventId}`)
  return { success: true }
}

/**
 * Detach menu from event (chef-only)
 */
export async function detachMenuFromEvent(eventId: string, menuId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to tenant (via RLS this will fail if not)
  const { error } = await supabase
    .from('event_menus')
    .delete()
    .eq('event_id', eventId)
    .eq('menu_id', menuId)

  if (error) {
    console.error('[detachMenuFromEvent] Error:', error)
    throw new Error('Failed to detach menu from event')
  }

  revalidatePath(`/chef/events/${eventId}`)
  return { success: true }
}

/**
 * Get menus attached to event
 */
export async function getEventMenus(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: eventMenus, error } = await supabase
    .from('event_menus')
    .select(`
      menu_id,
      menus (*)
    `)
    .eq('event_id', eventId)

  if (error) {
    console.error('[getEventMenus] Error:', error)
    throw new Error('Failed to fetch event menus')
  }

  return eventMenus.map(em => em.menus).filter(Boolean)
}

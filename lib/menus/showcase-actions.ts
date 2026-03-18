// Menu Showcase - Server actions for the chef's menu portfolio
// Showcase menus are visible to the chef's clients so they can browse
// past work, pick menus, and use them as starting points.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// CHEF ACTIONS
// ============================================

/**
 * Toggle showcase visibility on a menu.
 */
export async function toggleShowcase(menuId: string, isShowcase: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('menus')
    .update({ is_showcase: isShowcase, updated_by: user.id })
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleShowcase] Error:', error)
    throw new Error('Failed to update showcase status')
  }

  revalidatePath(`/menus/${menuId}`)
  revalidatePath('/menus')
}

/**
 * Get the chef's menu library for an event - templates, showcase, recent menus.
 * Used by the Menu Library Picker on the event detail page.
 * Returns menus with dish counts, sorted by relevance.
 */
export async function getMenuLibraryForEvent(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all non-archived menus (templates, showcase, and recent)
  const { data: menus, error } = await supabase
    .from('menus')
    .select(
      `
      id, name, description, cuisine_type, service_style,
      is_template, is_showcase, status, times_used,
      target_guest_count, created_at, updated_at,
      dishes (id, course_name, course_number, description, dietary_tags, allergen_flags)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[getMenuLibraryForEvent] Error:', error)
    throw new Error('Failed to fetch menu library')
  }

  // Fetch client preferences for this event (if any)
  const { data: preferences } = await supabase
    .from('menu_preferences')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  // Format menus with summary data
  const formattedMenus = (menus ?? []).map((menu: any) => {
    const dishes = menu.dishes ?? []
    const allTags = dishes.flatMap((d: any) => d.dietary_tags ?? [])
    const uniqueTags = [...new Set(allTags)]

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      cuisineType: menu.cuisine_type,
      serviceStyle: menu.service_style,
      isTemplate: menu.is_template,
      isShowcase: menu.is_showcase,
      status: menu.status,
      timesUsed: menu.times_used ?? 0,
      guestCount: menu.target_guest_count,
      dishCount: dishes.length,
      dietaryTags: uniqueTags,
      updatedAt: menu.updated_at,
      dishes: dishes.map((d: any) => ({
        id: d.id,
        courseName: d.course_name,
        courseNumber: d.course_number,
        description: d.description,
        dietaryTags: d.dietary_tags ?? [],
        allergenFlags: d.allergen_flags ?? [],
      })),
    }
  })

  return {
    menus: formattedMenus,
    preferences,
  }
}

// ============================================
// CLIENT ACTIONS
// ============================================

/**
 * Get showcase menus for a specific chef (client browsing).
 * Returns menus marked as showcase with their dishes.
 */
export async function getShowcaseMenus(tenantId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Verify client has an event with this chef
  const { data: hasEvent } = await supabase
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', user.entityId)
    .limit(1)
    .maybeSingle()

  if (!hasEvent) throw new Error('No events found with this chef')

  const { data: menus, error } = await supabase
    .from('menus')
    .select(
      `
      id, name, description, cuisine_type, service_style,
      target_guest_count, times_used,
      dishes (id, course_name, course_number, description, dietary_tags, allergen_flags)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('is_showcase', true)
    .neq('status', 'archived')
    .order('times_used', { ascending: false })

  if (error) {
    console.error('[getShowcaseMenus] Error:', error)
    throw new Error('Failed to fetch showcase menus')
  }

  return (menus ?? []).map((menu: any) => ({
    id: menu.id,
    name: menu.name,
    description: menu.description,
    cuisineType: menu.cuisine_type,
    serviceStyle: menu.service_style,
    guestCount: menu.target_guest_count,
    timesUsed: menu.times_used ?? 0,
    dishCount: (menu.dishes ?? []).length,
    dishes: (menu.dishes ?? []).map((d: any) => ({
      id: d.id,
      courseName: d.course_name,
      courseNumber: d.course_number,
      description: d.description,
      dietaryTags: d.dietary_tags ?? [],
      allergenFlags: d.allergen_flags ?? [],
    })),
  }))
}

/**
 * Get a single showcase menu with full dish details (client preview).
 */
export async function getShowcaseMenuDetail(menuId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: menu, error } = await supabase
    .from('menus')
    .select(
      `
      id, name, description, cuisine_type, service_style,
      target_guest_count, times_used,
      dishes (
        id, course_name, course_number, description,
        dietary_tags, allergen_flags, sort_order
      )
    `
    )
    .eq('id', menuId)
    .eq('is_showcase', true)
    .single()

  if (error || !menu) throw new Error('Menu not found')

  // Verify client has event with this chef (via RLS, but double-check)
  const { data: hasEvent } = await supabase
    .from('events')
    .select('id')
    .eq('tenant_id', (menu as any).tenant_id)
    .eq('client_id', user.entityId)
    .limit(1)
    .maybeSingle()

  // RLS should handle this, but be safe
  if (!hasEvent && !(menu as any).is_showcase) throw new Error('Access denied')

  const dishes = ((menu as any).dishes ?? []).sort(
    (a: any, b: any) => (a.course_number ?? 0) - (b.course_number ?? 0)
  )

  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    cuisineType: menu.cuisine_type,
    serviceStyle: menu.service_style,
    guestCount: menu.target_guest_count,
    dishes: dishes.map((d: any) => ({
      id: d.id,
      courseName: d.course_name,
      courseNumber: d.course_number,
      description: d.description,
      dietaryTags: d.dietary_tags ?? [],
      allergenFlags: d.allergen_flags ?? [],
    })),
  }
}

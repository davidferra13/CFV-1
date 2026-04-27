'use server'

import { createAdminClient } from '@/lib/db/admin'
import { validateDeviceToken } from '@/lib/devices/token'

export type KioskMenuDish = {
  id: string
  name: string | null
  description: string | null
  course_name: string
  course_number: number
  sort_order: number
  dietary_tags: string[]
  allergen_flags: string[]
}

export type KioskMenu = {
  menu_id: string
  menu_name: string
  menu_description: string | null
  event_id: string
  event_occasion: string | null
  event_date: string
  serve_time: string | null
  guest_count: number
  dishes: KioskMenuDish[]
}

/**
 * Get today's event menus for a kiosk device's chef.
 * Tenant-scoped via device token validation.
 * Returns menus with their dishes grouped by course.
 */
export async function getKioskMenus(
  deviceToken: string
): Promise<{ success: true; menus: KioskMenu[] } | { success: false; error: string }> {
  if (!deviceToken || typeof deviceToken !== 'string') {
    return { success: false, error: 'Device token required' }
  }

  try {
    const device = await validateDeviceToken(deviceToken)
    if (!device) {
      return { success: false, error: 'Invalid or inactive device' }
    }

    const tenantId = device.tenantId
    const db: any = createAdminClient()

    // Get today's date in local format (YYYY-MM-DD)
    const today = new Date()
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')

    // Find events for today belonging to this chef
    const { data: events, error: eventsError } = await db
      .from('events')
      .select('id, event_date, occasion, serve_time, guest_count, status')
      .eq('tenant_id', tenantId)
      .eq('event_date', todayStr)

    if (eventsError) {
      console.error('[kiosk-menu] Events query error:', eventsError)
      return { success: false, error: 'Failed to load events' }
    }

    if (!events || events.length === 0) {
      return { success: true, menus: [] }
    }

    // Filter to non-cancelled events
    const activeEvents = events.filter((e: any) => e.status !== 'cancelled' && e.status !== 'draft')

    if (activeEvents.length === 0) {
      return { success: true, menus: [] }
    }

    const eventIds = activeEvents.map((e: any) => e.id)

    // Get menus linked to these events
    const { data: menus, error: menusError } = await db
      .from('menus')
      .select('id, name, description, event_id')
      .in('event_id', eventIds)

    if (menusError) {
      console.error('[kiosk-menu] Menus query error:', menusError)
      return { success: false, error: 'Failed to load menus' }
    }

    if (!menus || menus.length === 0) {
      return { success: true, menus: [] }
    }

    const menuIds = menus.map((m: any) => m.id)

    // Get all dishes for these menus
    const { data: dishes, error: dishesError } = await db
      .from('dishes')
      .select(
        'id, name, description, menu_id, course_name, course_number, sort_order, dietary_tags, allergen_flags'
      )
      .in('menu_id', menuIds)
      .order('course_number', { ascending: true })

    if (dishesError) {
      console.error('[kiosk-menu] Dishes query error:', dishesError)
      return { success: false, error: 'Failed to load dishes' }
    }

    // Build the response, grouping dishes under their menus
    const eventMap = new Map(activeEvents.map((e: any) => [e.id, e]))
    const dishMap = new Map<string, KioskMenuDish[]>()

    for (const dish of dishes || []) {
      const menuDishes = dishMap.get(dish.menu_id) || []
      menuDishes.push({
        id: dish.id,
        name: dish.name,
        description: dish.description,
        course_name: dish.course_name,
        course_number: dish.course_number,
        sort_order: dish.sort_order,
        dietary_tags: (dish.dietary_tags || []).filter((t: string) => t && t.trim()),
        allergen_flags: (dish.allergen_flags || []).filter((f: string) => f && f.trim()),
      })
      dishMap.set(dish.menu_id, menuDishes)
    }

    const result: KioskMenu[] = menus.map((menu: any) => {
      const event = eventMap.get(menu.event_id)
      return {
        menu_id: menu.id,
        menu_name: menu.name,
        menu_description: menu.description,
        event_id: menu.event_id,
        event_occasion: event?.occasion || null,
        event_date: event?.event_date || todayStr,
        serve_time: event?.serve_time || null,
        guest_count: event?.guest_count || 0,
        dishes: (dishMap.get(menu.id) || []).sort(
          (a, b) => a.course_number - b.course_number || a.sort_order - b.sort_order
        ),
      }
    })

    return { success: true, menus: result }
  } catch (err) {
    console.error('[kiosk-menu] Unexpected error:', err)
    return { success: false, error: 'Internal error' }
  }
}

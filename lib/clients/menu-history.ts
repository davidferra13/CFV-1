'use server'

// Client Menu History
// Aggregates all menus/dishes/components served to a client across all completed events.
// Helps chef avoid repeating the same menu and spots culinary patterns per client.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DishHistory = {
  courseNumber: number
  courseName: string
  dishName: string | null
  componentNames: string[]
  dietaryTags: string[]
  allergenFlags: string[]
}

export type MenuHistoryEntry = {
  eventId: string
  eventDate: string
  occasion: string | null
  guestCount: number
  menuId: string | null
  menuName: string | null
  cuisineType: string | null
  isSimpleMode: boolean
  simpleContent: string | null
  dishes: DishHistory[]
}

export type ComponentFrequency = {
  name: string
  count: number
}

export type ClientMenuHistory = {
  entries: MenuHistoryEntry[] // Most recent first
  totalEvents: number
  topComponents: ComponentFrequency[] // Most frequently served components (top 8)
  cuisinesServed: string[] // Distinct cuisine types used
}

// ── Server Action ──────────────────────────────────────────────────────────────

export async function getClientMenuHistory(clientId: string): Promise<ClientMenuHistory> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const empty: ClientMenuHistory = {
    entries: [],
    totalEvents: 0,
    topComponents: [],
    cuisinesServed: [],
  }

  // 1. Get all completed events for this client (with menu_id)
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, guest_count, menu_id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) return empty

  // 2. Fetch menus for events that have a menu_id
  const menuIds = events.map((e) => e.menu_id).filter((id): id is string => !!id)

  const menuMap = new Map<
    string,
    {
      id: string
      name: string
      cuisine_type: string | null
      simple_mode: boolean
      simple_mode_content: string | null
    }
  >()

  if (menuIds.length > 0) {
    const { data: menus } = await supabase
      .from('menus')
      .select('id, name, cuisine_type, simple_mode, simple_mode_content')
      .in('id', menuIds)
      .eq('tenant_id', user.tenantId!)

    for (const m of menus ?? []) {
      menuMap.set(m.id, m)
    }
  }

  // 3. Fetch all dishes for those menus (only non-simple-mode)
  const nonSimpleMenuIds = [...menuMap.values()].filter((m) => !m.simple_mode).map((m) => m.id)

  const dishMap = new Map<
    string,
    {
      id: string
      menu_id: string
      course_number: number
      course_name: string
      name: string | null
      dietary_tags: string[]
      allergen_flags: string[]
    }[]
  >() // keyed by menu_id → array of dishes

  if (nonSimpleMenuIds.length > 0) {
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, menu_id, course_number, course_name, name, dietary_tags, allergen_flags')
      .in('menu_id', nonSimpleMenuIds)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    for (const d of dishes ?? []) {
      const existing = dishMap.get(d.menu_id) ?? []
      existing.push({
        id: d.id,
        menu_id: d.menu_id,
        course_number: d.course_number,
        course_name: d.course_name,
        name: d.name,
        dietary_tags: (d.dietary_tags as string[]) ?? [],
        allergen_flags: (d.allergen_flags as string[]) ?? [],
      })
      dishMap.set(d.menu_id, existing)
    }
  }

  // 4. Fetch all components for those dishes
  const allDishes = [...dishMap.values()].flat()
  const dishIds = allDishes.map((d) => d.id)

  const componentMap = new Map<string, string[]>() // dish_id → component names

  if (dishIds.length > 0) {
    const { data: components } = await supabase
      .from('components')
      .select('dish_id, name')
      .in('dish_id', dishIds)
      .eq('tenant_id', user.tenantId!)
      .order('sort_order', { ascending: true })

    for (const c of components ?? []) {
      const existing = componentMap.get(c.dish_id) ?? []
      existing.push(c.name)
      componentMap.set(c.dish_id, existing)
    }
  }

  // 5. Assemble MenuHistoryEntry per event
  const entries: MenuHistoryEntry[] = events.map((event) => {
    const menu = event.menu_id ? menuMap.get(event.menu_id) : undefined

    if (!menu) {
      return {
        eventId: event.id,
        eventDate: event.event_date,
        occasion: event.occasion,
        guestCount: event.guest_count,
        menuId: null,
        menuName: null,
        cuisineType: null,
        isSimpleMode: false,
        simpleContent: null,
        dishes: [],
      }
    }

    const dishesForMenu = dishMap.get(menu.id) ?? []
    const dishes: DishHistory[] = dishesForMenu.map((d) => ({
      courseNumber: d.course_number,
      courseName: d.course_name,
      dishName: d.name,
      componentNames: componentMap.get(d.id) ?? [],
      dietaryTags: d.dietary_tags,
      allergenFlags: d.allergen_flags,
    }))

    return {
      eventId: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
      guestCount: event.guest_count,
      menuId: menu.id,
      menuName: menu.name,
      cuisineType: menu.cuisine_type,
      isSimpleMode: menu.simple_mode,
      simpleContent: menu.simple_mode_content,
      dishes,
    }
  })

  // 6. Aggregate: component frequency + cuisines served
  const componentCounts = new Map<string, number>()
  const cuisineSet = new Set<string>()

  for (const entry of entries) {
    if (entry.cuisineType) cuisineSet.add(entry.cuisineType)
    for (const dish of entry.dishes) {
      for (const name of dish.componentNames) {
        componentCounts.set(name, (componentCounts.get(name) ?? 0) + 1)
      }
    }
  }

  const topComponents: ComponentFrequency[] = [...componentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  return {
    entries,
    totalEvents: entries.length,
    topComponents,
    cuisinesServed: [...cuisineSet],
  }
}

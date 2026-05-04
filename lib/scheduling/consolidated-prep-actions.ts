'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ──────────────────────────────────────────────────────────

export type ConsolidatedPrepItem = {
  eventId: string
  eventName: string
  eventDate: string | null
  taskId: string
  taskTitle: string
  taskCategory: string | null
  dueDate: string | null
  completed: boolean
}

export type ConsolidatedGroceryItem = {
  ingredientName: string
  totalQuantity: number
  unit: string | null
  events: Array<{
    eventId: string
    eventName: string
    eventDate: string | null
    quantity: number
  }>
}

export type WeeklyPrepDashboard = {
  dateRange: { start: string; end: string }
  events: Array<{
    id: string
    occasion: string | null
    event_date: string | null
    status: string | null
    guest_count: number | null
  }>
  prepTasks: ConsolidatedPrepItem[]
  groceryItems: ConsolidatedGroceryItem[]
  totalPrepTasks: number
  completedPrepTasks: number
}

// ─── Queries ────────────────────────────────────────────────────────

export async function getWeeklyPrepDashboard(input?: {
  startDate?: string
  endDate?: string
}): Promise<WeeklyPrepDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const start = input?.startDate ?? now.toISOString().split('T')[0]
  const endDate =
    input?.endDate ?? new Date(now.getTime() + 14 * 86_400_000).toISOString().split('T')[0]

  // Get all events in the date range
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', start)
    .lte('event_date', endDate)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })

  const eventList = events ?? []
  if (eventList.length === 0) {
    return {
      dateRange: { start, end: endDate },
      events: [],
      prepTasks: [],
      groceryItems: [],
      totalPrepTasks: 0,
      completedPrepTasks: 0,
    }
  }

  const eventIds = eventList.map((e: any) => e.id)
  const eventMap = new Map<string, any>(eventList.map((e: any) => [e.id, e]))

  // Get prep tasks across all events (from tasks table)
  const { data: tasks } = await db
    .from('tasks')
    .select('id, title, category, due_date, completed_at, event_id')
    .in('event_id', eventIds)
    .eq('tenant_id', user.tenantId!)
    .order('due_date', { ascending: true })

  const prepTasks: ConsolidatedPrepItem[] = (tasks ?? []).map((t: any) => {
    const evt = eventMap.get(t.event_id)
    return {
      eventId: t.event_id,
      eventName: evt?.occasion ?? 'Event',
      eventDate: evt?.event_date ?? null,
      taskId: t.id,
      taskTitle: t.title,
      taskCategory: t.category ?? null,
      dueDate: t.due_date ?? null,
      completed: Boolean(t.completed_at),
    }
  })

  // Get grocery items across all events
  // Look up menu ingredients via event_menus -> menus -> dishes -> dish_ingredients
  const groceryMap = new Map<string, ConsolidatedGroceryItem>()

  const { data: menuLinks } = await db
    .from('event_menus')
    .select('event_id, menu_id')
    .in('event_id', eventIds)

  if (menuLinks && menuLinks.length > 0) {
    const menuIds = [...new Set(menuLinks.map((ml: any) => ml.menu_id))]
    const menuToEvent = new Map<string, string[]>()
    for (const ml of menuLinks) {
      const existing = menuToEvent.get(ml.menu_id) ?? []
      existing.push(ml.event_id)
      menuToEvent.set(ml.menu_id, existing)
    }

    // Get dishes for these menus
    const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: any) => d.id)
      const dishToMenu = new Map<string, string>(dishes.map((d: any) => [d.id, d.menu_id]))

      // Get ingredients for these dishes
      const { data: ingredients } = await db
        .from('dish_ingredients')
        .select('dish_id, ingredient_name, quantity, unit')
        .in('dish_id', dishIds)

      for (const ing of ingredients ?? []) {
        const menuId = dishToMenu.get(ing.dish_id)
        const associatedEventIds = menuId ? (menuToEvent.get(menuId) ?? []) : []
        const key = `${(ing.ingredient_name || '').toLowerCase().trim()}|${ing.unit || ''}`

        if (!groceryMap.has(key)) {
          groceryMap.set(key, {
            ingredientName: ing.ingredient_name || 'Unknown',
            totalQuantity: 0,
            unit: ing.unit ?? null,
            events: [],
          })
        }

        const item = groceryMap.get(key)!
        const qty = Number(ing.quantity) || 0
        item.totalQuantity += qty

        for (const eid of associatedEventIds) {
          const evt = eventMap.get(eid)
          const existingEvent = item.events.find((e) => e.eventId === eid)
          if (existingEvent) {
            existingEvent.quantity += qty
          } else {
            item.events.push({
              eventId: eid,
              eventName: evt?.occasion ?? 'Event',
              eventDate: evt?.event_date ?? null,
              quantity: qty,
            })
          }
        }
      }
    }
  }

  const groceryItems = Array.from(groceryMap.values()).sort((a, b) =>
    a.ingredientName.localeCompare(b.ingredientName)
  )

  return {
    dateRange: { start, end: endDate },
    events: eventList,
    prepTasks,
    groceryItems,
    totalPrepTasks: prepTasks.length,
    completedPrepTasks: prepTasks.filter((t) => t.completed).length,
  }
}

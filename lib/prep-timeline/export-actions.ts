'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computePrepTimeline, type TimelineRecipeInput } from './compute-timeline'
import { format } from 'date-fns'

// -- Types --

export type PrepScheduleExport = {
  eventName: string
  eventDate: string
  serveTime: string | null
  guestCount: number
  clientName: string | null
  days: PrepScheduleDay[]
  groceryDeadline: string | null
  untimedItems: Array<{ recipeName: string; componentName: string; reason: string }>
  totalPrepHours: number
  equipmentNeeds: EquipmentNeed[]
}

export type PrepScheduleDay = {
  date: string
  label: string
  daysBeforeService: number
  isServiceDay: boolean
  phase: 'grocery' | 'prep' | 'cook' | 'service'
  items: PrepScheduleItem[]
  totalActiveMinutes: number
  totalPassiveMinutes: number
  totalMinutes: number
}

export type PrepScheduleItem = {
  recipeName: string
  componentName: string
  dishName: string
  courseName: string
  category: string | null
  prepTimeMinutes: number
  storageMethod: string
  notes: string | null
}

export type EquipmentNeed = {
  day: string
  equipment: string
  forRecipe: string
}

// -- Helpers --

function buildServiceDateTime(eventDate: string, serveTime: string | null): Date {
  const serviceDate = new Date(eventDate)
  if (serveTime) {
    const [h, m] = serveTime.split(':').map(Number)
    serviceDate.setHours(h, m, 0, 0)
  } else {
    serviceDate.setHours(18, 0, 0, 0)
  }
  return serviceDate
}

// -- Server Action --

/**
 * Generate a full prep schedule for export/print.
 * Uses the same menus -> dishes -> components -> recipes query pattern
 * as ops-hub-actions.ts to stay consistent.
 */
export async function generatePrepSchedule(eventId: string): Promise<PrepScheduleExport | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, client:clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (!event) return null

  const emptyResult: PrepScheduleExport = {
    eventName: event.occasion ?? 'Untitled Event',
    eventDate: event.event_date,
    serveTime: event.serve_time,
    guestCount: event.guest_count,
    clientName: event.client?.full_name ?? null,
    days: [],
    groceryDeadline: null,
    untimedItems: [],
    totalPrepHours: 0,
    equipmentNeeds: [],
  }

  // Fetch menu
  const { data: menuRows } = await db
    .from('menus')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  const menuRow = menuRows?.[0] ?? null
  if (!menuRow) return emptyResult

  // Fetch dishes
  const { data: dishRows } = await db
    .from('dishes')
    .select('id, name, course_name, course_number, sort_order')
    .eq('menu_id', menuRow.id)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  const dishes = dishRows ?? []
  if (dishes.length === 0) return emptyResult

  // Fetch components
  const { data: componentRows } = await db
    .from('components')
    .select('id, name, dish_id, recipe_id, make_ahead_window_hours, sort_order')
    .eq('tenant_id', user.tenantId!)
    .in(
      'dish_id',
      dishes.map((d: any) => d.id)
    )
    .order('sort_order', { ascending: true })

  const components = componentRows ?? []
  const recipeIds = [
    ...new Set(components.map((c: any) => c.recipe_id).filter(Boolean)),
  ] as string[]

  if (recipeIds.length === 0) return emptyResult

  // Fetch recipes (including equipment field)
  const { data: recipeRows } = await db
    .from('recipes')
    .select(
      'id, name, category, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours, prep_time_minutes, active_prep_minutes, passive_prep_minutes, hold_class, prep_tier, equipment'
    )
    .eq('tenant_id', user.tenantId!)
    .in('id', recipeIds)

  const recipes = recipeRows ?? []
  if (recipes.length === 0) return emptyResult

  const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))
  const dishMap = new Map(dishes.map((d: any) => [d.id, d]))

  // Fetch allergen flags
  const allergenMap: Record<string, string[]> = {}
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id')
    .in('recipe_id', recipeIds)

  const ingredientIds = [
    ...new Set(
      ((recipeIngredients ?? []) as any[]).map((ri: any) => ri.ingredient_id).filter(Boolean)
    ),
  ] as string[]

  if (ingredientIds.length > 0) {
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, allergen_flags')
      .eq('tenant_id', user.tenantId!)
      .in('id', ingredientIds)

    const ingredientMap = new Map(
      ((ingredients ?? []) as any[]).map((i: any) => [i.id, i.allergen_flags ?? []])
    )

    for (const ri of (recipeIngredients ?? []) as any[]) {
      const flags = ingredientMap.get(ri.ingredient_id) ?? []
      if (flags.length === 0) continue
      const existing = allergenMap[ri.recipe_id] ?? []
      allergenMap[ri.recipe_id] = [...new Set([...existing, ...flags])]
    }
  }

  // Build timeline input
  const timelineItems: TimelineRecipeInput[] = components
    .filter((c: any) => c.recipe_id && recipeMap.has(c.recipe_id))
    .map((c: any) => {
      const recipe: any = recipeMap.get(c.recipe_id)
      const dish: any = dishMap.get(c.dish_id)

      return {
        recipeId: recipe.id,
        recipeName: recipe.name ?? c.name,
        componentName: c.name,
        dishName: dish?.name ?? dish?.course_name ?? 'Unknown',
        courseName: dish?.course_name ?? 'Unknown',
        category: recipe.category ?? null,
        peakHoursMin: recipe.peak_hours_min ?? null,
        peakHoursMax: recipe.peak_hours_max ?? null,
        safetyHoursMax: recipe.safety_hours_max ?? null,
        storageMethod: recipe.storage_method ?? null,
        freezable: recipe.freezable ?? null,
        frozenExtendsHours: recipe.frozen_extends_hours ?? null,
        prepTimeMinutes: recipe.prep_time_minutes ?? 30,
        activeMinutes: recipe.active_prep_minutes ?? null,
        passiveMinutes: recipe.passive_prep_minutes ?? null,
        holdClass: recipe.hold_class ?? null,
        prepTier: recipe.prep_tier ?? null,
        allergenFlags: allergenMap[recipe.id] ?? [],
        makeAheadWindowHours: c.make_ahead_window_hours ?? null,
      }
    })

  if (timelineItems.length === 0) return emptyResult

  // Compute timeline
  const serviceDateTime = buildServiceDateTime(event.event_date, event.serve_time)
  const timeline = computePrepTimeline(timelineItems, serviceDateTime)

  // Map days to export format
  const days: PrepScheduleDay[] = timeline.days
    .filter((day) => day.items.length > 0)
    .map((day) => ({
      date: format(day.date, 'yyyy-MM-dd'),
      label: day.label,
      daysBeforeService: day.daysBeforeService,
      isServiceDay: day.isServiceDay,
      phase: day.isServiceDay
        ? ('service' as const)
        : day.deadlineType === 'prep'
          ? ('cook' as const)
          : day.deadlineType === 'grocery'
            ? ('grocery' as const)
            : ('prep' as const),
      items: day.items.map((item) => {
        const recipe = recipeMap.get(item.recipeId) as any
        return {
          recipeName: item.recipeName,
          componentName: item.componentName,
          dishName: item.dishName,
          courseName: item.courseName,
          category: recipe?.category ?? null,
          prepTimeMinutes: item.prepTimeMinutes ?? 0,
          storageMethod: item.storageMethod ?? 'fridge',
          notes: null,
        }
      }),
      totalActiveMinutes: day.activeMinutes,
      totalPassiveMinutes: day.passiveMinutes,
      totalMinutes: day.totalPrepMinutes,
    }))

  // Extract equipment needs from recipes
  const equipmentNeeds: EquipmentNeed[] = []
  for (const day of timeline.days) {
    const dayDateStr = format(day.date, 'yyyy-MM-dd')
    for (const item of day.items) {
      const recipe = recipeMap.get(item.recipeId) as any
      const equipment = recipe?.equipment
      if (equipment) {
        const equipList =
          typeof equipment === 'string' ? [equipment] : Array.isArray(equipment) ? equipment : []
        for (const equip of equipList) {
          if (equip && !equipmentNeeds.some((e) => e.day === dayDateStr && e.equipment === equip)) {
            equipmentNeeds.push({
              day: dayDateStr,
              equipment: equip,
              forRecipe: item.recipeName,
            })
          }
        }
      }
    }
  }

  // Map untimed items
  const untimedItems = timeline.untimedItems.map((item) => ({
    recipeName: item.recipeName,
    componentName: item.componentName,
    reason: 'No peak window or category defaults set',
  }))

  const totalPrepHours =
    Math.round((days.reduce((sum, d) => sum + d.totalMinutes, 0) / 60) * 10) / 10

  return {
    eventName: event.occasion ?? 'Untitled Event',
    eventDate: event.event_date,
    serveTime: event.serve_time,
    guestCount: event.guest_count,
    clientName: event.client?.full_name ?? null,
    days,
    groceryDeadline: timeline.groceryDeadline
      ? format(timeline.groceryDeadline, 'yyyy-MM-dd')
      : null,
    untimedItems,
    totalPrepHours,
    equipmentNeeds,
  }
}

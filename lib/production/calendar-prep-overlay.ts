'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computePrepTimeline, type TimelineRecipeInput } from '@/lib/prep-timeline/compute-timeline'
import { startOfMonth, endOfMonth, addDays, subDays, format } from 'date-fns'

export type CalendarPrepDay = {
  date: string // YYYY-MM-DD
  totalPrepMinutes: number
  activeMinutes: number
  passiveMinutes: number
  phase: 'grocery' | 'prep' | 'cook' | 'service' | null
  eventIds: string[]
  itemCount: number
}

export type MonthPrepOverlay = {
  prepDays: Record<string, CalendarPrepDay> // keyed by YYYY-MM-DD
  maxPrepMinutes: number // for normalizing the load bar
}

const PHASE_PRIORITY: Record<string, number> = {
  service: 4,
  cook: 3,
  prep: 2,
  grocery: 1,
}

export async function getMonthPrepOverlay(monthStr: string): Promise<MonthPrepOverlay> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch events in a wider window (prep can start weeks before)
  const monthDate = new Date(monthStr + '-01T00:00:00')
  const windowStart = format(subDays(startOfMonth(monthDate), 14), 'yyyy-MM-dd')
  const windowEnd = format(addDays(endOfMonth(monthDate), 14), 'yyyy-MM-dd')

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, status')
    .eq('tenant_id', user.tenantId!)
    .not('status', 'eq', 'cancelled')
    .gte('event_date', windowStart)
    .lte('event_date', windowEnd)

  if (!events?.length) return { prepDays: {}, maxPrepMinutes: 0 }

  const prepDays: Record<string, CalendarPrepDay> = {}
  let maxPrepMinutes = 0

  for (const event of events) {
    // Follow the same menu->dishes->components->recipes pattern as ops-hub-actions
    const { data: menuRows } = await db
      .from('menus')
      .select('id')
      .eq('event_id', event.id)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: true })
      .limit(1)

    const menuRow = menuRows?.[0]
    if (!menuRow) continue

    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, course_name, course_number')
      .eq('menu_id', menuRow.id)
      .eq('tenant_id', user.tenantId!)

    if (!dishes?.length) continue

    const { data: components } = await db
      .from('components')
      .select('id, name, dish_id, recipe_id, make_ahead_window_hours')
      .eq('tenant_id', user.tenantId!)
      .in(
        'dish_id',
        dishes.map((d: any) => d.id)
      )

    if (!components?.length) continue

    const recipeIds = [
      ...new Set(components.map((c: any) => c.recipe_id).filter(Boolean)),
    ] as string[]

    if (recipeIds.length === 0) continue

    const { data: recipeRows } = await db
      .from('recipes')
      .select(
        'id, name, category, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours, prep_time_minutes, active_prep_minutes, passive_prep_minutes, hold_class, prep_tier'
      )
      .eq('tenant_id', user.tenantId!)
      .in('id', recipeIds)

    const recipes = recipeRows ?? []
    if (recipes.length === 0) continue

    const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))
    const dishMap = new Map(dishes.map((d: any) => [d.id, d]))

    // Build TimelineRecipeInput array (same shape as ops-hub-actions)
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
          allergenFlags: [],
          makeAheadWindowHours: c.make_ahead_window_hours ?? null,
        }
      })

    if (timelineItems.length === 0) continue

    // Build service datetime
    const serviceDate = new Date(event.event_date)
    if (event.serve_time) {
      const [h, m] = event.serve_time.split(':').map(Number)
      serviceDate.setHours(h, m, 0, 0)
    } else {
      serviceDate.setHours(18, 0, 0, 0)
    }

    // Compute prep timeline
    const timeline = computePrepTimeline(timelineItems, serviceDate)

    // Merge into calendar
    for (const day of timeline.days) {
      const dateKey = format(day.date, 'yyyy-MM-dd')
      const existing = prepDays[dateKey]

      // Determine phase
      let phase: CalendarPrepDay['phase'] = 'prep'
      if (day.isServiceDay) phase = 'service'
      else if (day.deadlineType === 'prep') phase = 'cook'
      else if (day.deadlineType === 'grocery') phase = 'grocery'

      if (existing) {
        existing.totalPrepMinutes += day.totalPrepMinutes
        existing.activeMinutes += day.activeMinutes
        existing.passiveMinutes += day.passiveMinutes
        existing.itemCount += day.items.length
        if (!existing.eventIds.includes(event.id)) existing.eventIds.push(event.id)
        // Highest priority phase wins
        if (
          phase &&
          (!existing.phase || (PHASE_PRIORITY[phase] ?? 0) > (PHASE_PRIORITY[existing.phase] ?? 0))
        ) {
          existing.phase = phase
        }
      } else {
        prepDays[dateKey] = {
          date: dateKey,
          totalPrepMinutes: day.totalPrepMinutes,
          activeMinutes: day.activeMinutes,
          passiveMinutes: day.passiveMinutes,
          phase,
          eventIds: [event.id],
          itemCount: day.items.length,
        }
      }
    }
  }

  // Find max for normalization
  for (const day of Object.values(prepDays)) {
    if (day.totalPrepMinutes > maxPrepMinutes) maxPrepMinutes = day.totalPrepMinutes
  }

  return { prepDays, maxPrepMinutes }
}

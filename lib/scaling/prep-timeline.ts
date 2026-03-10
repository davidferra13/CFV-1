// Prep Timeline Generator
// Backwards-plans from serve time using prep/cook times from recipes.
// Pure math + sorting. No AI.
//
// Takes a menu's scaled components (from recipe-scaling.ts) and a serve time,
// then produces a chronological prep schedule working backwards.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface PrepTask {
  componentId: string
  componentName: string
  dishName: string
  courseNumber: number
  prepMinutes: number
  cookMinutes: number
  totalMinutes: number
  isMakeAhead: boolean
  makeAheadWindowHours: number | null
  prepDayOffset: number | null
  prepTimeOfDay: string | null
  prepStation: string | null
  executionNotes: string | null
  // Computed schedule
  startTime: Date
  endTime: Date
  startLabel: string
  endLabel: string
  dayLabel: string
}

export interface PrepTimeline {
  serveTime: Date
  tasks: PrepTask[]
  // Grouped by day
  dayGroups: DayGroup[]
  totalPrepMinutes: number
  totalCookMinutes: number
  earliestStart: Date
}

export interface DayGroup {
  dayLabel: string
  dayOffset: number // 0 = day of, -1 = day before, etc.
  tasks: PrepTask[]
}

// ============================================
// CORE: Generate prep timeline for a menu + event
// ============================================

export async function generatePrepTimeline(
  menuId: string,
  serveTimeISO?: string
): Promise<PrepTimeline> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get menu + linked event
  const { data: menu } = await supabase
    .from('menus')
    .select('id, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) throw new Error('Menu not found')

  // 2. Determine serve time
  let serveTime: Date

  if (serveTimeISO) {
    serveTime = new Date(serveTimeISO)
  } else if (menu.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('event_date, serve_time')
      .eq('id', menu.event_id)
      .eq('tenant_id', tenantId)
      .single()

    if (event?.serve_time) {
      // Combine event_date + serve_time
      const dateStr = event.event_date // "2026-04-15"
      const timeStr = event.serve_time // "18:00" or "18:00:00"
      serveTime = new Date(`${dateStr}T${timeStr}`)
    } else if (event?.event_date) {
      // Default to 6pm if no serve time set
      serveTime = new Date(`${event.event_date}T18:00:00`)
    } else {
      // Fallback: today at 6pm
      const today = new Date()
      today.setHours(18, 0, 0, 0)
      serveTime = today
    }
  } else {
    const today = new Date()
    today.setHours(18, 0, 0, 0)
    serveTime = today
  }

  // 3. Fetch dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return buildEmptyTimeline(serveTime)
  }

  // 4. Fetch components with recipe timing data
  const dishIds = dishes.map((d: any) => d.id)
  const dishMap = new Map(dishes.map((d: any) => [d.id, d]))

  const { data: components } = await supabase
    .from('components')
    .select(
      `
      id,
      name,
      dish_id,
      recipe_id,
      is_make_ahead,
      make_ahead_window_hours,
      execution_notes,
      prep_day_offset,
      prep_time_of_day,
      prep_station,
      sort_order
    `
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  // 5. Fetch recipe timing for linked recipes
  const recipeIds = (components || []).map((c: any) => c.recipe_id).filter(Boolean)

  const recipeMap = new Map<string, any>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, prep_time_minutes, cook_time_minutes, total_time_minutes')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    for (const r of recipes || []) {
      recipeMap.set(r.id, r)
    }
  }

  // 6. Build prep tasks
  const tasks: PrepTask[] = []
  let totalPrepMinutes = 0
  let totalCookMinutes = 0

  for (const comp of components || []) {
    const dish = dishMap.get(comp.dish_id)
    if (!dish) continue

    const recipe = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null

    const prepMins = recipe?.prep_time_minutes ?? 0
    const cookMins = recipe?.cook_time_minutes ?? 0
    // Use total_time if set, otherwise sum prep + cook
    const totalMins = recipe?.total_time_minutes ?? prepMins + cookMins

    // Skip components with no time data and no make-ahead info
    if (totalMins === 0 && !comp.is_make_ahead && comp.prep_day_offset == null) {
      continue
    }

    // Calculate start time
    const taskMinutes = Math.max(totalMins, 15) // minimum 15 min per task
    let startTime: Date
    let endTime: Date

    if (comp.prep_day_offset != null && comp.prep_day_offset < 0) {
      // Make-ahead on a previous day
      const daysBefore = Math.abs(comp.prep_day_offset)
      startTime = new Date(serveTime)
      startTime.setDate(startTime.getDate() - daysBefore)

      // Set time of day based on prep_time_of_day
      const hour = getTimeOfDayHour(comp.prep_time_of_day)
      startTime.setHours(hour, 0, 0, 0)

      endTime = new Date(startTime.getTime() + taskMinutes * 60000)
    } else {
      // Day-of: work backwards from serve time
      endTime = new Date(serveTime)
      startTime = new Date(serveTime.getTime() - taskMinutes * 60000)
    }

    totalPrepMinutes += prepMins
    totalCookMinutes += cookMins

    tasks.push({
      componentId: comp.id,
      componentName: comp.name,
      dishName: dish.course_name,
      courseNumber: dish.course_number,
      prepMinutes: prepMins,
      cookMinutes: cookMins,
      totalMinutes: taskMinutes,
      isMakeAhead: comp.is_make_ahead ?? false,
      makeAheadWindowHours: comp.make_ahead_window_hours,
      prepDayOffset: comp.prep_day_offset,
      prepTimeOfDay: comp.prep_time_of_day,
      prepStation: comp.prep_station,
      executionNotes: comp.execution_notes,
      startTime,
      endTime,
      startLabel: formatTime(startTime),
      endLabel: formatTime(endTime),
      dayLabel: getDayLabel(startTime, serveTime),
    })
  }

  // 7. Sort: make-ahead first (earliest day), then day-of by start time
  tasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // 8. Resolve day-of overlaps (stagger tasks so they don't all end at serve time)
  resolveOverlaps(tasks, serveTime)

  // 9. Group by day
  const dayGroups = groupByDay(tasks, serveTime)

  const earliestStart = tasks.length > 0 ? tasks[0].startTime : serveTime

  return {
    serveTime,
    tasks,
    dayGroups,
    totalPrepMinutes,
    totalCookMinutes,
    earliestStart,
  }
}

// ============================================
// OVERLAP RESOLUTION
// ============================================

/**
 * For day-of tasks that all end at serve time, stagger them backwards.
 * Longest tasks start first, shorter tasks start later.
 */
function resolveOverlaps(tasks: PrepTask[], serveTime: Date): void {
  // Only resolve day-of tasks (prep_day_offset === 0 or null)
  const dayOfTasks = tasks.filter((t) => t.prepDayOffset == null || t.prepDayOffset === 0)

  if (dayOfTasks.length <= 1) return

  // Sort by total time descending (longest tasks first)
  dayOfTasks.sort((a, b) => b.totalMinutes - a.totalMinutes)

  // Stack backwards from serve time
  let cursor = serveTime.getTime()

  for (const task of dayOfTasks) {
    task.endTime = new Date(cursor)
    task.startTime = new Date(cursor - task.totalMinutes * 60000)
    task.startLabel = formatTime(task.startTime)
    task.endLabel = formatTime(task.endTime)
    task.dayLabel = getDayLabel(task.startTime, serveTime)
    cursor = task.startTime.getTime()
  }

  // Re-sort the full list by start time
  tasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

// ============================================
// GROUPING
// ============================================

function groupByDay(tasks: PrepTask[], serveTime: Date): DayGroup[] {
  const groups = new Map<number, PrepTask[]>()

  for (const task of tasks) {
    const offset = getDayOffset(task.startTime, serveTime)
    const existing = groups.get(offset) || []
    existing.push(task)
    groups.set(offset, existing)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([offset, dayTasks]) => ({
      dayLabel:
        offset === 0
          ? 'Day of Event'
          : `${Math.abs(offset)} day${Math.abs(offset) > 1 ? 's' : ''} before`,
      dayOffset: offset,
      tasks: dayTasks,
    }))
}

// ============================================
// HELPERS
// ============================================

function getTimeOfDayHour(timeOfDay: string | null): number {
  switch (timeOfDay) {
    case 'early_morning':
      return 7
    case 'morning':
      return 9
    case 'midday':
      return 12
    case 'afternoon':
      return 14
    case 'evening':
      return 17
    default:
      return 9 // default to morning
  }
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function getDayOffset(date: Date, serveTime: Date): number {
  const serveDay = new Date(serveTime)
  serveDay.setHours(0, 0, 0, 0)
  const taskDay = new Date(date)
  taskDay.setHours(0, 0, 0, 0)
  return Math.round((taskDay.getTime() - serveDay.getTime()) / 86400000)
}

function getDayLabel(date: Date, serveTime: Date): string {
  const offset = getDayOffset(date, serveTime)
  if (offset === 0) return 'Day of'
  if (offset === -1) return '1 day before'
  if (offset < -1) return `${Math.abs(offset)} days before`
  return 'Day of'
}

function buildEmptyTimeline(serveTime: Date): PrepTimeline {
  return {
    serveTime,
    tasks: [],
    dayGroups: [],
    totalPrepMinutes: 0,
    totalCookMinutes: 0,
    earliestStart: serveTime,
  }
}

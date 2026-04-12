'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from '@/lib/documents/pdf-layout'
import { dateToDateString } from '@/lib/utils/format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrepCategory = 'day-before' | 'morning' | 'afternoon' | 'final-hour' | 'plating'

export type PrepTask = {
  recipeName: string
  componentName: string
  courseName: string
  courseNumber: number
  startTime: string // HH:MM format or "Day Before"
  durationMinutes: number
  category: PrepCategory
  isMakeAhead: boolean
  executionNotes: string | null
}

export type PrepTimeline = {
  eventId: string
  eventDate: string
  serveTime: string
  guestCount: number
  occasion: string | null
  tasks: PrepTask[]
  totalPrepMinutes: number
}

// ---------------------------------------------------------------------------
// Category labels (shared constant, also exported from prep-timeline-constants.ts
// for client components that cannot import from 'use server' files)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<PrepCategory, string> = {
  'day-before': 'Day Before',
  morning: 'Morning Of',
  afternoon: 'Afternoon',
  'final-hour': 'Final Hour',
  plating: 'Plating / Service',
}

const CATEGORY_ORDER: PrepCategory[] = [
  'day-before',
  'morning',
  'afternoon',
  'final-hour',
  'plating',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a TIME string (HH:MM:SS or HH:MM) into total minutes since midnight */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

/** Convert total minutes since midnight to HH:MM string */
function minutesToTimeStr(totalMinutes: number): string {
  // Handle negative (day before) by wrapping
  let m = totalMinutes
  if (m < 0) m += 24 * 60
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

/** Format HH:MM into 12-hour display (e.g. "2:30 PM") */
function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  let h = parseInt(hStr ?? '0', 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

/** Determine which time block a task falls into based on minutes before service */
function categorize(minutesBefore: number, isMakeAhead: boolean): PrepCategory {
  if (isMakeAhead || minutesBefore > 24 * 60) return 'day-before'
  if (minutesBefore > 4 * 60) return 'morning'
  if (minutesBefore > 60) return 'afternoon'
  if (minutesBefore > 15) return 'final-hour'
  return 'plating'
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generatePrepTimeline(eventId: string): Promise<PrepTimeline> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = await createServerClient()

  // 1. Fetch event
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, event_date, serve_time, guest_count, occasion, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new Error('Event not found or access denied')
  }

  if (!event.menu_id) {
    return {
      eventId,
      eventDate: dateToDateString(event.event_date as Date | string),
      serveTime: event.serve_time,
      guestCount: event.guest_count,
      occasion: event.occasion,
      tasks: [],
      totalPrepMinutes: 0,
    }
  }

  // 2. Fetch dishes for this menu
  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_name, course_number, name')
    .eq('menu_id', event.menu_id)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return {
      eventId,
      eventDate: dateToDateString(event.event_date as Date | string),
      serveTime: event.serve_time,
      guestCount: event.guest_count,
      occasion: event.occasion,
      tasks: [],
      totalPrepMinutes: 0,
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  // 3. Fetch components with their recipes
  const { data: components } = await db
    .from('components')
    .select('id, name, dish_id, recipe_id, is_make_ahead, execution_notes, sort_order')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (!components || components.length === 0) {
    return {
      eventId,
      eventDate: dateToDateString(event.event_date as Date | string),
      serveTime: event.serve_time,
      guestCount: event.guest_count,
      occasion: event.occasion,
      tasks: [],
      totalPrepMinutes: 0,
    }
  }

  // 4. Fetch recipes for components that have recipe_id
  const recipeIds = components
    .map((c: any) => c.recipe_id)
    .filter((id: any): id is string => id !== null)

  let recipesMap: Map<
    string,
    {
      name: string
      prep_time_minutes: number | null
      cook_time_minutes: number | null
      total_time_minutes: number | null
    }
  > = new Map()

  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name, prep_time_minutes, cook_time_minutes, total_time_minutes')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    if (recipes) {
      for (const r of recipes) {
        recipesMap.set(r.id, r)
      }
    }
  }

  // 5. Build dish lookup
  const dishMap = new Map(dishes.map((d: any) => [d.id, d]))

  // 6. Build tasks
  const serveMinutes = parseTimeToMinutes(event.serve_time)
  const tasks: PrepTask[] = []

  for (const comp of components) {
    const dish = dishMap.get(comp.dish_id)
    if (!dish) continue

    const recipe = comp.recipe_id ? recipesMap.get(comp.recipe_id) : null
    const recipeName = recipe?.name ?? comp.name

    // Calculate duration: use total_time if available, otherwise prep + cook, fallback to 30 min
    let duration = 30 // default estimate
    if (recipe) {
      if (recipe.total_time_minutes != null && recipe.total_time_minutes > 0) {
        duration = recipe.total_time_minutes
      } else {
        const prep = recipe.prep_time_minutes ?? 0
        const cook = recipe.cook_time_minutes ?? 0
        if (prep + cook > 0) duration = prep + cook
      }
    }

    // Calculate start time (minutes before serve)
    const minutesBefore = duration
    const category = categorize(minutesBefore, comp.is_make_ahead)

    let startTime: string
    if (category === 'day-before') {
      startTime = 'Day Before'
    } else {
      const startMinutes = serveMinutes - minutesBefore
      startTime = formatTime12h(minutesToTimeStr(startMinutes))
    }

    tasks.push({
      recipeName,
      componentName: comp.name,
      courseName: (dish as any).course_name,
      courseNumber: (dish as any).course_number,
      startTime,
      durationMinutes: duration,
      category,
      isMakeAhead: comp.is_make_ahead,
      executionNotes: comp.execution_notes,
    })
  }

  // 7. Sort tasks by category order, then by duration descending (longest first within block)
  tasks.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category)
    const catB = CATEGORY_ORDER.indexOf(b.category)
    if (catA !== catB) return catA - catB
    return b.durationMinutes - a.durationMinutes
  })

  const totalPrepMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0)

  return {
    eventId,
    eventDate: event.event_date,
    serveTime: event.serve_time,
    guestCount: event.guest_count,
    occasion: event.occasion,
    tasks,
    totalPrepMinutes,
  }
}

// ---------------------------------------------------------------------------
// PDF generator
// ---------------------------------------------------------------------------

export async function generatePrepTimelinePdf(eventId: string): Promise<Buffer> {
  const timeline = await generatePrepTimeline(eventId)
  const pdf = new PDFLayout()

  // Title
  const titleText = timeline.occasion ? `Prep Timeline - ${timeline.occasion}` : 'Prep Timeline'
  pdf.title(titleText)
  pdf.space(1)

  // Event info bar
  const eventDateFormatted = new Date(timeline.eventDate + 'T00:00:00').toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
  const serveFormatted = formatTime12h(minutesToTimeStr(parseTimeToMinutes(timeline.serveTime)))

  pdf.headerBar([
    ['Date', eventDateFormatted],
    ['Serve Time', serveFormatted],
    ['Guests', String(timeline.guestCount)],
    ['Total Prep', `${timeline.totalPrepMinutes} min`],
  ])
  pdf.space(2)

  if (timeline.tasks.length === 0) {
    pdf.text(
      'No prep tasks found. Add recipes with prep/cook times to your menu components to generate a timeline.',
      9,
      'italic'
    )
    pdf.generatedBy('ChefFlow', 'Prep Timeline')
    return pdf.toBuffer()
  }

  // Group tasks by category
  const grouped = new Map<PrepCategory, PrepTask[]>()
  for (const task of timeline.tasks) {
    const list = grouped.get(task.category) ?? []
    list.push(task)
    grouped.set(task.category, list)
  }

  // Render each category block
  for (const cat of CATEGORY_ORDER) {
    const catTasks = grouped.get(cat)
    if (!catTasks || catTasks.length === 0) continue

    pdf.sectionHeader(CATEGORY_LABELS[cat])

    for (const task of catTasks) {
      const timeLabel = task.category === 'day-before' ? 'Day Before' : task.startTime
      const label = `${timeLabel} - ${task.recipeName} (${task.durationMinutes} min)`
      const extra = `${task.courseName} / ${task.componentName}`
      pdf.checkbox(label, 9, extra)

      if (task.executionNotes) {
        pdf.text(task.executionNotes, 8, 'italic', 10)
      }
    }

    pdf.space(2)
  }

  // Footer
  pdf.generatedBy('ChefFlow', 'Prep Timeline')

  return pdf.toBuffer()
}

// Execution Sheet Generator (Printed Sheet #2 — Service Execution Sheet)
// Single page taped to the counter at the client's house during service.
// Sections: FRONT OF HOUSE → ALLERGY ALERT → ARRIVAL SETUP → COURSE EXECUTION → clean-as-you-go.
// DIETARY WARNINGS are the most prominent element — safety-critical.
// MUST fit on ONE page — no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'

export type ExecutionSheetData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string
    arrival_time: string | null
    guest_count: number
    dietary_restrictions: string[]
    allergies: string[]
    special_requests: string | null
    service_style: string
    location_address: string | null
    location_city: string | null
    location_state: string | null
  }
  client: {
    full_name: string
    dietary_restrictions: string[] | null
    allergies: string[] | null
  }
  courses: Array<{
    courseNumber: number
    courseName: string
    dishDescription: string | null
    dishAllergenFlags: string[]
    componentCount: number
    components: Array<{
      name: string
      category: string
      execution_notes: string | null
      is_make_ahead: boolean
      make_ahead_window_hours: number | null
    }>
  }>
  totalComponentCount: number
  /** Components that need to be started the moment the chef arrives — ordered by lead time descending */
  arrivalTasks: Array<{
    name: string
    execution_notes: string | null
    make_ahead_window_hours: number | null
    courseName: string
  }>
}

/** Fetch all data needed for the execution sheet */
export async function fetchExecutionSheetData(eventId: string): Promise<ExecutionSheetData | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event with extended client data
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, serve_time, arrival_time, guest_count,
      dietary_restrictions, allergies, special_requests, service_style,
      location_address, location_city, location_state,
      client:clients(full_name, dietary_restrictions, allergies)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Find menu
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menuId = menus[0].id

  // Fetch dishes (include allergen_flags for component-level dietary flagging)
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number, description, allergen_flags, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  // Fetch components — include make_ahead_window_hours for arrival task ordering
  const dishIds = dishes.map((d) => d.id)
  const { data: components } = await supabase
    .from('components')
    .select(
      'dish_id, name, category, execution_notes, is_make_ahead, make_ahead_window_hours, sort_order'
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  const compsByDish = new Map<string, typeof components>()
  for (const comp of components || []) {
    const arr = compsByDish.get(comp.dish_id) || []
    arr.push(comp)
    compsByDish.set(comp.dish_id, arr)
  }

  // Group dishes by course number
  const courseMap = new Map<
    number,
    {
      courseName: string
      dishDescription: string | null
      dishAllergenFlags: string[]
      components: NonNullable<typeof components>
    }
  >()

  for (const dish of dishes) {
    const existing = courseMap.get(dish.course_number)
    const dishComps = compsByDish.get(dish.id) || []
    if (existing) {
      existing.components.push(...dishComps)
      // Merge allergen flags across multiple dishes in the same course
      for (const flag of dish.allergen_flags ?? []) {
        if (!existing.dishAllergenFlags.includes(flag)) {
          existing.dishAllergenFlags.push(flag)
        }
      }
    } else {
      courseMap.set(dish.course_number, {
        courseName: dish.course_name,
        dishDescription: dish.description,
        dishAllergenFlags: dish.allergen_flags ?? [],
        components: [...dishComps],
      })
    }
  }

  let totalComponentCount = 0
  const courses = Array.from(courseMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([courseNumber, data]) => {
      totalComponentCount += data.components.length
      return {
        courseNumber,
        courseName: data.courseName,
        dishDescription: data.dishDescription,
        dishAllergenFlags: data.dishAllergenFlags,
        componentCount: data.components.length,
        components: data.components.map((c) => ({
          name: c.name,
          category: c.category,
          execution_notes: c.execution_notes,
          is_make_ahead: c.is_make_ahead,
          make_ahead_window_hours: c.make_ahead_window_hours ?? null,
        })),
      }
    })

  const clientData = event.client as unknown as {
    full_name: string
    dietary_restrictions: string[] | null
    allergies: string[] | null
  } | null

  // Derive arrival tasks: components that need to be started immediately on arrival.
  // Two criteria:
  //   1. make_ahead_window_hours > 0 — items that were prepped at home but need finishing on-site
  //      (e.g., re-churn gelato, reheat braise, finish sous vide). Ordered by hours descending.
  //   2. Execution notes containing long-cook keywords — items cooked on-site but needing long lead time
  //      (e.g., "sous vide", "oven", "slow", "braise", "roast"). Ordered before quick-cook tasks.
  const LONG_COOK_KEYWORDS = [
    'sous vide',
    'oven',
    'slow',
    'braise',
    'roast',
    'bake',
    'reheat',
    'warm',
  ]

  const arrivalTaskCandidates: Array<{
    name: string
    execution_notes: string | null
    make_ahead_window_hours: number | null
    courseName: string
    sortKey: number
  }> = []

  for (const [courseNumber, courseData] of courseMap.entries()) {
    const courseName = courseData.courseName
    for (const comp of courseData.components) {
      const hours = comp.make_ahead_window_hours ?? null
      const notes = comp.execution_notes?.toLowerCase() ?? ''
      const hasLongCookKeyword = LONG_COOK_KEYWORDS.some((kw) => notes.includes(kw))
      const hasMakeAheadWindow = hours !== null && hours > 0

      if (hasMakeAheadWindow || hasLongCookKeyword) {
        arrivalTaskCandidates.push({
          name: comp.name,
          execution_notes: comp.execution_notes,
          make_ahead_window_hours: hours,
          courseName,
          // Sort: explicit window hours descending, then keyword matches, then course order
          sortKey: hasMakeAheadWindow ? (hours ?? 0) * 1000 + courseNumber : courseNumber,
        })
      }
    }
  }

  const arrivalTasks = arrivalTaskCandidates
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _sortKey, ...rest }) => rest)

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      guest_count: event.guest_count,
      dietary_restrictions: event.dietary_restrictions ?? [],
      allergies: event.allergies ?? [],
      special_requests: event.special_requests,
      service_style: event.service_style,
      location_address: event.location_address ?? null,
      location_city: event.location_city ?? null,
      location_state: event.location_state ?? null,
    },
    client: {
      full_name: clientData?.full_name ?? 'Unknown',
      dietary_restrictions: clientData?.dietary_restrictions ?? null,
      allergies: clientData?.allergies ?? null,
    },
    courses,
    totalComponentCount,
    arrivalTasks,
  }
}

/** Render execution sheet onto a PDFLayout instance */
export function renderExecutionSheet(pdf: PDFLayout, data: ExecutionSheetData) {
  const { event, client, courses, totalComponentCount, arrivalTasks } = data

  // Scale down for dense menus — more aggressive because FOH + BOH + arrival tasks all on one page
  const hasArrivalTasks = arrivalTasks.length > 0
  const densityFactor = totalComponentCount + arrivalTasks.length
  if (densityFactor > 20) pdf.setFontScale(0.85)
  if (densityFactor > 30) pdf.setFontScale(0.75)
  if (densityFactor > 40) pdf.setFontScale(0.7)

  // ===== HEADER =====
  // "MENU — [Client Name]"
  pdf.title(`MENU \u2014 ${client.full_name}`, 14)

  // Detail bar: "[N] Guests | Day of Week, Date | Address | Arrive [time] | Serve [time]"
  const dateStr = format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')
  const addressParts = [event.location_address, event.location_city, event.location_state].filter(
    Boolean
  )
  const addressStr = addressParts.length > 0 ? addressParts.join(', ') : null

  const detailParts: string[] = [
    `${event.guest_count} Guests`,
    dateStr,
    ...(addressStr ? [addressStr] : []),
    ...(event.arrival_time ? [`Arrive ${event.arrival_time}`] : []),
    `Serve ${event.serve_time}`,
  ]
  pdf.text(detailParts.join('  |  '), 8, 'normal', 0)
  pdf.space(3)

  // ===== TOP HALF: FRONT OF HOUSE =====
  pdf.sectionHeader('FRONT OF HOUSE', 11, true)

  for (const course of courses) {
    pdf.courseHeader(`Course ${course.courseNumber}: ${course.courseName}`)

    if (course.dishDescription) {
      pdf.text(course.dishDescription, 8, 'italic', 6)
    } else if (course.components.length > 0) {
      // Auto-derive FOH description from component names as a clean, comma-separated list
      const compList = course.components.map((c) => c.name).join(', ')
      pdf.text(compList, 8, 'italic', 6)
    }
  }
  pdf.space(2)

  // ===== DIETARY WARNINGS — SAFETY-CRITICAL =====
  // Merge event + client allergies and dietary restrictions
  const allAllergies = new Set<string>()
  for (const a of event.allergies) allAllergies.add(a.toLowerCase())
  if (client.allergies) {
    for (const a of client.allergies) allAllergies.add(a.toLowerCase())
  }

  const allDietary = new Set<string>()
  for (const d of event.dietary_restrictions) allDietary.add(d)
  if (client.dietary_restrictions) {
    for (const d of client.dietary_restrictions) allDietary.add(d)
  }

  if (allAllergies.size > 0) {
    const allergyText = Array.from(allAllergies)
      .map((a) => a.toUpperCase())
      .join(', ')
    pdf.warningBox(`ALLERGY WARNING: ${allergyText} \u2014 CHECK ALL COURSES`)
  }

  if (allDietary.size > 0) {
    const dietaryText = Array.from(allDietary).join(', ')
    pdf.text(`Dietary: ${dietaryText}`, 9, 'bold', 0)
    pdf.space(1)
  }

  if (event.special_requests) {
    pdf.text(`Special Requests: ${event.special_requests}`, 8, 'italic', 0)
    pdf.space(1)
  }

  // ===== ARRIVAL TASKS — start these the moment you walk in =====
  if (hasArrivalTasks) {
    pdf.sectionHeader('ON ARRIVAL \u2014 START IMMEDIATELY', 11, true)
    arrivalTasks.forEach((task, idx) => {
      const parts: string[] = [`${idx + 1}. ${task.name}`]
      if (task.make_ahead_window_hours) {
        parts.push(`(${task.make_ahead_window_hours} min lead time)`)
      }
      if (task.execution_notes) {
        parts.push(`\u2014 ${task.execution_notes}`)
      }
      pdf.text(parts.join(' '), 8, 'normal', 6)
    })
    pdf.space(2)
  }

  // ===== COURSE EXECUTION — COMPONENT BREAKDOWN =====
  pdf.sectionHeader('COURSE EXECUTION', 11, true)

  for (const course of courses) {
    // Compute allergen conflict once per course — dish-level granularity
    const conflictingAllergens = course.dishAllergenFlags
      .filter((flag) => allAllergies.has(flag.toLowerCase()))
      .map((a) => a.toUpperCase())

    // Course header: allergen flag goes here (once, at the dish level — not on every component)
    const courseHeaderText =
      conflictingAllergens.length > 0
        ? `COURSE ${course.courseNumber} \u2014 ${course.courseName} (${course.componentCount} components)  \u26a0 CONTAINS ${conflictingAllergens.join(', ')}`
        : `COURSE ${course.courseNumber} \u2014 ${course.courseName} (${course.componentCount} components)`
    pdf.courseHeader(courseHeaderText)

    // List ALL components numbered — no split by make-ahead (that's the Prep Sheet's domain)
    course.components.forEach((comp, idx) => {
      const parts: string[] = [`${idx + 1}. ${comp.name}`]

      // Method/prep note in parens
      if (comp.execution_notes) {
        parts.push(`(${comp.execution_notes})`)
      }

      // Flag pre-made items inline instead of separating them into a different group
      if (comp.is_make_ahead) {
        parts.push('[pre-made]')
      }

      pdf.text(parts.join(' '), 8, 'normal', 6)
    })

    pdf.space(1)
  }

  // ===== CLEAN-AS-YOU-GO REMINDER =====
  pdf.text('Clean as you go. Kitchen to baseline before dessert.', 8, 'bold', 0)
  pdf.space(1)

  // ===== SUMMARY LINE =====
  pdf.hr()

  const dietarySummaryParts: string[] = []
  if (allAllergies.size > 0) {
    dietarySummaryParts.push(
      `Allergies: ${Array.from(allAllergies)
        .map((a) => a.toUpperCase())
        .join(', ')}`
    )
  }
  if (allDietary.size > 0) {
    dietarySummaryParts.push(`Dietary: ${Array.from(allDietary).join(', ')}`)
  }

  const summaryLine =
    dietarySummaryParts.length > 0
      ? `${totalComponentCount} TOTAL COMPONENTS  |  ${dietarySummaryParts.join('  |  ')}`
      : `${totalComponentCount} TOTAL COMPONENTS`

  pdf.text(summaryLine, 9, 'bold')

  // Footer — serve time is always shown; arrive time is conditional
  const footerParts: string[] = []
  if (event.arrival_time) footerParts.push(`Arrive by ${event.arrival_time}`)
  footerParts.push(`Serve at ${event.serve_time}`)
  pdf.footer(footerParts.join('  |  '))
}

/** Generate a standalone execution sheet PDF */
export async function generateExecutionSheet(eventId: string): Promise<Buffer> {
  const data = await fetchExecutionSheetData(eventId)
  if (!data) throw new Error('Cannot generate execution sheet: missing event or menu data')

  const pdf = new PDFLayout()
  renderExecutionSheet(pdf, data)
  return pdf.toBuffer()
}

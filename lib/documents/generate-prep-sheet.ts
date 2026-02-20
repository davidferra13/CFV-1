// Prep Sheet Generator (Printed Sheet #1) — v2.0
// Used AT HOME during cooking. Gets food on it. Dies after prep.
// Sections: AT HOME (PREP NOW | PREP AFTER SHOPPING) + BEFORE LEAVING + ON SITE
// MUST fit on ONE page — no exceptions

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

type ComponentIngredient = {
  is_optional: boolean
  ingredient: { name: string; is_staple: boolean }
}

type RecipeInfo = {
  id: string
  method: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  recipe_ingredients: ComponentIngredient[]
}

type PrepComponent = {
  id: string
  name: string
  category: string
  is_make_ahead: boolean
  execution_notes: string | null
  storage_notes: string | null
  sort_order: number
  dish_id: string
  recipe: RecipeInfo | null
}

type PrepDish = {
  id: string
  course_name: string
  course_number: number
  allergen_flags: string[]
  dietary_tags: string[]
}

export type PrepSheetData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string
    arrival_time: string | null
    departure_time: string | null
    guest_count: number
    location_address: string
    location_city: string
    location_state: string
    location_zip: string
  }
  clientName: string
  dishes: PrepDish[]
  components: PrepComponent[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Category priority: longest/most-complex cook tasks first, quick tasks last
const CATEGORY_PRIORITY: Record<string, number> = {
  protein: 1,
  sauce: 2,
  starch: 3,
  vegetable: 4,
  fruit: 5,
  bread: 6,
  other: 7,
  condiment: 8,
  beverage: 9,
  dessert: 10,
  garnish: 11,
  cheese: 12,
}

function sortByPriority(comps: PrepComponent[]): PrepComponent[] {
  return [...comps].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category] ?? 7
    const pb = CATEGORY_PRIORITY[b.category] ?? 7
    if (pa !== pb) return pa - pb
    // Secondary: total cook time descending (longer tasks first)
    const ta = (a.recipe?.prep_time_minutes ?? 0) + (a.recipe?.cook_time_minutes ?? 0)
    const tb = (b.recipe?.prep_time_minutes ?? 0) + (b.recipe?.cook_time_minutes ?? 0)
    return tb - ta
  })
}

// Dependency split: uses is_staple on required (non-optional) ingredients as proxy.
// If all required ingredients are staples → PREP NOW (can start immediately, no shopping needed).
// Any non-staple required ingredient → PREP AFTER SHOPPING.
// No linked recipe → PREP AFTER SHOPPING (safe default).
function classifyDependency(comp: PrepComponent): 'prep_now' | 'prep_after_shopping' {
  if (!comp.recipe) return 'prep_after_shopping'
  const required = comp.recipe.recipe_ingredients.filter(ri => !ri.is_optional)
  if (required.length === 0) return 'prep_now'
  return required.every(ri => ri.ingredient.is_staple) ? 'prep_now' : 'prep_after_shopping'
}

// Extract a brief method note from the recipe: first sentence if ≤120 chars, else null.
function getBriefMethodNote(recipe: RecipeInfo | null): string | null {
  if (!recipe?.method) return null
  const method = recipe.method.trim()
  const first = method.split(/[.!?]/)[0]?.trim()
  if (first && first.length <= 120) return first
  if (method.length <= 100) return method
  return null
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchPrepSheetData(eventId: string): Promise<PrepSheetData | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event with client
  const { data: event } = await supabase
    .from('events')
    .select(`
      occasion, event_date, serve_time, arrival_time, departure_time,
      guest_count, location_address, location_city, location_state, location_zip,
      client:clients(full_name)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Find menu attached to this event
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menuId = menus[0].id

  // Fetch dishes with allergen/dietary flags for per-task labeling
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number, allergen_flags, dietary_tags, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const dishIds = dishes.map(d => d.id)

  // Fetch components with linked recipe + ingredient staple data for dependency split
  const { data: rawComponents } = await supabase
    .from('components')
    .select(`
      id, name, category, is_make_ahead, execution_notes, storage_notes, sort_order, dish_id,
      recipe:recipes(
        id, method, prep_time_minutes, cook_time_minutes,
        recipe_ingredients(
          is_optional,
          ingredient:ingredients(name, is_staple)
        )
      )
    `)
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  const clientData = event.client as unknown as { full_name: string } | null

  // Normalize Supabase's single-row join (recipe is object|null, not array)
  const components: PrepComponent[] = (rawComponents || []).map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    is_make_ahead: c.is_make_ahead,
    execution_notes: c.execution_notes,
    storage_notes: c.storage_notes,
    sort_order: c.sort_order,
    dish_id: c.dish_id,
    recipe: Array.isArray(c.recipe) ? (c.recipe[0] ?? null) : (c.recipe ?? null),
  }))

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      departure_time: event.departure_time,
      guest_count: event.guest_count,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      location_zip: event.location_zip,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    dishes: dishes.map(d => ({
      id: d.id,
      course_name: d.course_name,
      course_number: d.course_number,
      allergen_flags: (d.allergen_flags as string[]) || [],
      dietary_tags: (d.dietary_tags as string[]) || [],
    })),
    components,
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderPrepSheet(pdf: PDFLayout, data: PrepSheetData) {
  const { event, clientName, dishes, components } = data

  // Build a dish lookup for allergen flags
  const dishById = new Map(dishes.map(d => [d.id, d]))

  // Separate AT HOME components (is_make_ahead) vs ON SITE
  const atHomeComponents = components.filter(c => c.is_make_ahead)
  const onSiteComponents = components.filter(c => !c.is_make_ahead)

  // Estimate density for font scaling
  const totalComponents = components.length
  if (totalComponents > 25) pdf.setFontScale(0.8)
  if (totalComponents > 35) pdf.setFontScale(0.7)
  if (totalComponents > 45) pdf.setFontScale(0.65)

  // ─── Header ────────────────────────────────────────────────────────────────

  pdf.title('PREP SHEET', 14)

  const dateStr = format(parseISO(event.event_date), 'EEE, MMM d, yyyy')
  pdf.headerBar([
    ['Event', event.occasion || 'Dinner'],
    ['Date', dateStr],
    ['Guests', String(event.guest_count)],
  ])

  // Departure time is TIMESTAMPTZ (full ISO string) — extract just the time for display
  const leaveBy = event.departure_time
    ? format(new Date(event.departure_time), 'h:mm a')
    : 'TBD'
  pdf.headerBar([
    ['LEAVE BY', leaveBy],
    ['Arrive', event.arrival_time || 'TBD'],
    ['Serve', event.serve_time],
    ['Client', clientName],
  ])

  const location = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')
  if (location) {
    pdf.text(`Location: ${location}`, 8, 'normal', 0)
  }
  pdf.space(1)

  // ─── AT HOME Section ───────────────────────────────────────────────────────

  pdf.sectionHeader('AT HOME', 11, true)

  if (atHomeComponents.length === 0) {
    pdf.text('No make-ahead components for this event.', 8, 'italic')
    pdf.space(1)
  } else {
    // Split into PREP NOW and PREP AFTER SHOPPING
    const prepNow = atHomeComponents.filter(c => classifyDependency(c) === 'prep_now')
    const prepAfter = atHomeComponents.filter(c => classifyDependency(c) === 'prep_after_shopping')

    // Group each set by course, then priority-sort within course
    function groupByCourse(comps: PrepComponent[]) {
      const map = new Map<number, { courseName: string; components: PrepComponent[] }>()
      for (const comp of comps) {
        const dish = dishById.get(comp.dish_id)
        if (!dish) continue
        const existing = map.get(dish.course_number)
        if (existing) {
          existing.components.push(comp)
        } else {
          map.set(dish.course_number, { courseName: dish.course_name, components: [comp] })
        }
      }
      // Sort within each course by priority
      for (const group of map.values()) {
        group.components = sortByPriority(group.components)
      }
      return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
    }

    // PREP NOW subsection
    if (prepNow.length > 0) {
      pdf.sectionHeader('PREP NOW — start immediately, everything on hand', 9, false)
      for (const [courseNum, course] of groupByCourse(prepNow)) {
        pdf.courseHeader(`Course ${courseNum} \u2014 ${course.courseName}`)
        for (const comp of course.components) {
          const dish = dishById.get(comp.dish_id)
          const methodNote = getBriefMethodNote(comp.recipe)
          const allergenFlags = dish?.allergen_flags ?? []

          let label = comp.name
          if (methodNote) label += ` \u2014 ${methodNote}`
          if (comp.storage_notes) label += `. ${comp.storage_notes}`
          if (allergenFlags.length > 0) label += ` [ALLERGEN: ${allergenFlags.join(', ')}]`

          pdf.checkbox(label, 8)
        }
        pdf.space(1)
      }
    } else {
      pdf.text('All tasks require grocery items — see below.', 8, 'italic')
      pdf.space(1)
    }

    // PREP AFTER SHOPPING subsection
    if (prepAfter.length > 0) {
      pdf.sectionHeader('PREP AFTER SHOPPING — blocked until groceries arrive', 9, false)
      for (const [courseNum, course] of groupByCourse(prepAfter)) {
        pdf.courseHeader(`Course ${courseNum} \u2014 ${course.courseName}`)
        for (const comp of course.components) {
          const dish = dishById.get(comp.dish_id)
          const allergenFlags = dish?.allergen_flags ?? []

          let label = comp.name
          if (comp.storage_notes) label += ` \u2014 ${comp.storage_notes}`
          if (allergenFlags.length > 0) label += ` [ALLERGEN: ${allergenFlags.join(', ')}]`

          pdf.checkbox(label, 8)
        }
        pdf.space(1)
      }
    } else {
      pdf.text('All tasks use on-hand ingredients — prep starts immediately.', 8, 'italic')
      pdf.space(1)
    }

    // Component counts per course (bridge to packing list)
    const countsByCourse = new Map<number, { name: string; count: number }>()
    for (const comp of atHomeComponents) {
      const dish = dishById.get(comp.dish_id)
      if (!dish) continue
      const existing = countsByCourse.get(dish.course_number)
      if (existing) {
        existing.count++
      } else {
        countsByCourse.set(dish.course_number, { name: dish.course_name, count: 1 })
      }
    }
    const courseCounts = Array.from(countsByCourse.entries()).sort((a, b) => a[0] - b[0])
    const totalAtHome = atHomeComponents.length
    const countParts = courseCounts.map(([num, c]) => `C${num}: ${c.count}`)
    pdf.text(`COMPONENTS: ${countParts.join('  ')}  TOTAL: ${totalAtHome}`, 8, 'bold', 0)
    pdf.space(1)
  }

  // ─── Before Leaving Section ────────────────────────────────────────────────

  pdf.sectionHeader('BEFORE LEAVING', 10, true)
  pdf.checkbox('Pack all components — frozen items LAST', 8)
  pdf.checkbox('Non-negotiables check', 8)
  pdf.checkbox(`Depart by ${leaveBy}`, 8)
  pdf.space(1)

  // ─── ON SITE Section ───────────────────────────────────────────────────────

  const siteLocation = [event.location_city, event.location_state].filter(Boolean).join(', ')
  pdf.sectionHeader(`ON SITE${siteLocation ? ` \u2014 ${siteLocation}` : ''}`, 11, true)

  if (onSiteComponents.length === 0) {
    pdf.text('No on-site execution tasks.', 8, 'italic')
  } else {
    const onSiteByCourse = new Map<number, { courseName: string; components: PrepComponent[] }>()
    for (const comp of onSiteComponents) {
      const dish = dishById.get(comp.dish_id)
      if (!dish) continue
      const existing = onSiteByCourse.get(dish.course_number)
      if (existing) {
        existing.components.push(comp)
      } else {
        onSiteByCourse.set(dish.course_number, {
          courseName: dish.course_name,
          components: [comp],
        })
      }
    }

    const sortedSite = Array.from(onSiteByCourse.entries()).sort((a, b) => a[0] - b[0])
    for (const [courseNum, course] of sortedSite) {
      pdf.courseHeader(`Course ${courseNum} \u2014 ${course.courseName}`)
      for (const comp of sortByPriority(course.components)) {
        const dish = dishById.get(comp.dish_id)
        const allergenFlags = dish?.allergen_flags ?? []

        let label = comp.name
        if (comp.execution_notes) label += ` \u2014 ${comp.execution_notes}`
        if (allergenFlags.length > 0) label += ` [ALLERGEN: ${allergenFlags.join(', ')}]`

        pdf.checkbox(label, 8)
      }
      pdf.space(1)
    }
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generatePrepSheet(eventId: string): Promise<Buffer> {
  const data = await fetchPrepSheetData(eventId)
  if (!data) throw new Error('Cannot generate prep sheet: missing event or menu data')

  const pdf = new PDFLayout()
  renderPrepSheet(pdf, data)
  return pdf.toBuffer()
}

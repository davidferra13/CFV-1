// Prep Sheet Generator (Printed Sheet #1)
// Used AT HOME during cooking. Gets food on it. Dies after prep.
// Two sections: AT HOME (prep tasks by course) + ON SITE (execution tasks)
// MUST fit on ONE page — no exceptions

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format } from 'date-fns'

type DishWithComponents = {
  course_name: string
  course_number: number
  description: string | null
  sort_order: number
  components: Array<{
    name: string
    category: string
    description: string | null
    is_make_ahead: boolean
    execution_notes: string | null
    storage_notes: string | null
    sort_order: number
  }>
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
  dishes: DishWithComponents[]
}

/** Fetch all data needed for the prep sheet */
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

  // Fetch dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number, description, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  // Fetch components for all dishes
  const dishIds = dishes.map(d => d.id)
  const { data: components } = await supabase
    .from('components')
    .select('dish_id, name, category, description, is_make_ahead, execution_notes, storage_notes, sort_order')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  // Group components by dish
  const compsByDish = new Map<string, typeof components>()
  for (const comp of components || []) {
    const arr = compsByDish.get(comp.dish_id) || []
    arr.push(comp)
    compsByDish.set(comp.dish_id, arr)
  }

  const clientData = event.client as unknown as { full_name: string } | null

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
      course_name: d.course_name,
      course_number: d.course_number,
      description: d.description,
      sort_order: d.sort_order,
      components: (compsByDish.get(d.id) || []).map(c => ({
        name: c.name,
        category: c.category,
        description: c.description,
        is_make_ahead: c.is_make_ahead,
        execution_notes: c.execution_notes,
        storage_notes: c.storage_notes,
        sort_order: c.sort_order,
      }))
    }))
  }
}

/** Render prep sheet onto a PDFLayout instance */
export function renderPrepSheet(pdf: PDFLayout, data: PrepSheetData) {
  const { event, clientName, dishes } = data

  // Estimate content density to decide font scale
  const totalComponents = dishes.reduce((sum, d) => sum + d.components.length, 0)
  if (totalComponents > 25) pdf.setFontScale(0.8)
  if (totalComponents > 35) pdf.setFontScale(0.7)
  if (totalComponents > 45) pdf.setFontScale(0.65)

  // Header
  pdf.title('PREP SHEET', 14)

  // Event info bar
  const dateStr = format(new Date(event.event_date), 'EEE, MMM d, yyyy')
  pdf.headerBar([
    ['Event', event.occasion || 'Dinner'],
    ['Date', dateStr],
    ['Guests', String(event.guest_count)],
  ])
  pdf.headerBar([
    ['Arrive', event.arrival_time || 'TBD'],
    ['Serve', event.serve_time],
    ['Client', clientName],
  ])

  const location = [event.location_address, event.location_city, event.location_state].filter(Boolean).join(', ')
  pdf.text(`Location: ${location}`, 8, 'normal', 0)
  pdf.space(1)

  // Separate components into AT HOME and ON SITE
  const atHomeByCoure = new Map<number, { courseName: string; components: typeof dishes[0]['components'] }>()
  const onSiteByCourse = new Map<number, { courseName: string; components: typeof dishes[0]['components'] }>()

  for (const dish of dishes) {
    const homeComps = dish.components.filter(c => c.is_make_ahead)
    const siteComps = dish.components.filter(c => !c.is_make_ahead)

    if (homeComps.length > 0) {
      const existing = atHomeByCoure.get(dish.course_number)
      if (existing) {
        existing.components.push(...homeComps)
      } else {
        atHomeByCoure.set(dish.course_number, {
          courseName: dish.course_name,
          components: [...homeComps]
        })
      }
    }
    if (siteComps.length > 0) {
      const existing = onSiteByCourse.get(dish.course_number)
      if (existing) {
        existing.components.push(...siteComps)
      } else {
        onSiteByCourse.set(dish.course_number, {
          courseName: dish.course_name,
          components: [...siteComps]
        })
      }
    }
  }

  // AT HOME section
  pdf.sectionHeader('AT HOME', 11, true)

  const sortedHomeCourses = Array.from(atHomeByCoure.entries()).sort((a, b) => a[0] - b[0])
  for (const [courseNum, course] of sortedHomeCourses) {
    pdf.courseHeader(`COURSE ${courseNum} \u2014 ${course.courseName}`)
    for (const comp of course.components) {
      let desc = `${comp.name} (${comp.category})`
      if (comp.description) desc += ` \u2014 ${comp.description}`
      if (comp.storage_notes) desc += ` [${comp.storage_notes}]`
      pdf.bullet(desc, 8, 4)
    }
    pdf.space(1)
  }

  if (sortedHomeCourses.length === 0) {
    pdf.text('No make-ahead components for this event.', 8, 'italic')
    pdf.space(1)
  }

  // ON SITE section
  pdf.sectionHeader('ON SITE', 11, true)

  const sortedSiteCourses = Array.from(onSiteByCourse.entries()).sort((a, b) => a[0] - b[0])
  for (const [courseNum, course] of sortedSiteCourses) {
    pdf.courseHeader(`COURSE ${courseNum} \u2014 ${course.courseName}`)
    for (const comp of course.components) {
      let desc = comp.name
      if (comp.execution_notes) desc += ` \u2014 ${comp.execution_notes}`
      pdf.bullet(desc, 8, 4)
    }
    pdf.space(1)
  }

  if (sortedSiteCourses.length === 0) {
    pdf.text('No on-site execution tasks.', 8, 'italic')
  }

  // Footer
  if (event.departure_time) {
    pdf.footer(`Leave by ${event.departure_time}`)
  }
}

/** Generate a standalone prep sheet PDF */
export async function generatePrepSheet(eventId: string): Promise<Buffer> {
  const data = await fetchPrepSheetData(eventId)
  if (!data) throw new Error('Cannot generate prep sheet: missing event or menu data')

  const pdf = new PDFLayout()
  renderPrepSheet(pdf, data)
  return pdf.toBuffer()
}

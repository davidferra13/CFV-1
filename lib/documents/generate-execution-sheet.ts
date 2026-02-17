// Execution Sheet Generator (Printed Sheet #2)
// Clean, goes to client's house, taped to counter during service.
// Top half: clean client-facing menu. Bottom half: operational execution plan.
// DIETARY WARNINGS are the most prominent element — safety-critical.
// MUST fit on ONE page — no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format } from 'date-fns'

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
    componentCount: number
    components: Array<{
      name: string
      category: string
      execution_notes: string | null
      is_make_ahead: boolean
    }>
  }>
  totalComponentCount: number
}

/** Fetch all data needed for the execution sheet */
export async function fetchExecutionSheetData(eventId: string): Promise<ExecutionSheetData | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event with extended client data
  const { data: event } = await supabase
    .from('events')
    .select(`
      occasion, event_date, serve_time, arrival_time, guest_count,
      dietary_restrictions, allergies, special_requests, service_style,
      client:clients(full_name, dietary_restrictions, allergies)
    `)
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

  // Fetch dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number, description, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  // Fetch components
  const dishIds = dishes.map(d => d.id)
  const { data: components } = await supabase
    .from('components')
    .select('dish_id, name, category, execution_notes, is_make_ahead, sort_order')
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
  const courseMap = new Map<number, { courseName: string; dishDescription: string | null; components: NonNullable<typeof components> }>()
  for (const dish of dishes) {
    const existing = courseMap.get(dish.course_number)
    const dishComps = compsByDish.get(dish.id) || []
    if (existing) {
      existing.components.push(...dishComps)
    } else {
      courseMap.set(dish.course_number, {
        courseName: dish.course_name,
        dishDescription: dish.description,
        components: [...dishComps]
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
        componentCount: data.components.length,
        components: data.components.map(c => ({
          name: c.name,
          category: c.category,
          execution_notes: c.execution_notes,
          is_make_ahead: c.is_make_ahead,
        }))
      }
    })

  const clientData = event.client as unknown as { full_name: string; dietary_restrictions: string[] | null; allergies: string[] | null } | null

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
    },
    client: {
      full_name: clientData?.full_name ?? 'Unknown',
      dietary_restrictions: clientData?.dietary_restrictions ?? null,
      allergies: clientData?.allergies ?? null,
    },
    courses,
    totalComponentCount,
  }
}

/** Render execution sheet onto a PDFLayout instance */
export function renderExecutionSheet(pdf: PDFLayout, data: ExecutionSheetData) {
  const { event, client, courses, totalComponentCount } = data

  // Scale down for dense menus
  if (courses.length > 4) pdf.setFontScale(0.85)
  if (courses.length > 6 || totalComponentCount > 30) pdf.setFontScale(0.75)
  if (totalComponentCount > 40) pdf.setFontScale(0.7)

  // ===== TOP HALF: CLEAN MENU =====
  pdf.title('SERVICE EXECUTION SHEET', 13)

  const dateStr = format(new Date(event.event_date), 'EEE, MMM d, yyyy')
  pdf.headerBar([
    ['Client', client.full_name],
    ['Guests', String(event.guest_count)],
    ['Date', dateStr],
    ['Serve', event.serve_time],
  ])
  pdf.space(1)

  // Clean menu (client-facing view)
  pdf.sectionHeader('MENU', 11, true)
  for (const course of courses) {
    pdf.courseHeader(`Course ${course.courseNumber}: ${course.courseName}`)
    if (course.dishDescription) {
      pdf.text(course.dishDescription, 8, 'italic', 6)
    }
  }
  pdf.space(2)

  // ===== DIETARY WARNINGS — MOST PROMINENT =====
  // Merge event + client allergies and dietary restrictions
  const allAllergies = new Set<string>()
  for (const a of event.allergies) allAllergies.add(a)
  if (client.allergies) {
    for (const a of client.allergies) allAllergies.add(a)
  }

  const allDietary = new Set<string>()
  for (const d of event.dietary_restrictions) allDietary.add(d)
  if (client.dietary_restrictions) {
    for (const d of client.dietary_restrictions) allDietary.add(d)
  }

  if (allAllergies.size > 0) {
    const allergyText = Array.from(allAllergies).map(a => a.toUpperCase()).join(', ')
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

  // ===== BOTTOM HALF: EXECUTION PLAN =====
  pdf.sectionHeader('EXECUTION PLAN', 11, true)

  for (const course of courses) {
    pdf.courseHeader(`COURSE ${course.courseNumber} \u2014 ${course.courseName} (${course.componentCount} components)`)

    // On-site components (non make-ahead) first, then make-ahead arriving pre-made
    const onSite = course.components.filter(c => !c.is_make_ahead)
    const prepped = course.components.filter(c => c.is_make_ahead)

    for (const comp of onSite) {
      let desc = comp.name
      if (comp.execution_notes) desc += ` \u2014 ${comp.execution_notes}`
      pdf.bullet(desc, 8, 4)
    }
    for (const comp of prepped) {
      pdf.bullet(`${comp.name} (pre-made, plate/serve)`, 8, 4)
    }
    pdf.space(1)
  }

  // Component count summary
  pdf.hr()
  pdf.text(`TOTAL: ${totalComponentCount} components to pack and verify`, 9, 'bold')

  // Footer
  if (event.arrival_time) {
    pdf.footer(`Arrive by ${event.arrival_time} | Serve at ${event.serve_time}`)
  }
}

/** Generate a standalone execution sheet PDF */
export async function generateExecutionSheet(eventId: string): Promise<Buffer> {
  const data = await fetchExecutionSheetData(eventId)
  if (!data) throw new Error('Cannot generate execution sheet: missing event or menu data')

  const pdf = new PDFLayout()
  renderExecutionSheet(pdf, data)
  return pdf.toBuffer()
}

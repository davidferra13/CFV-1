// Front-of-House Menu Generator
// Clean, client-friendly printable menu intended for table placement.
// Uses a consistent template for all confirmed menus.

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout, LETTER_WIDTH, MARGIN_X, MAX_Y } from './pdf-layout'
import { format, parseISO } from 'date-fns'

export type FrontOfHouseMenuData = {
  event: {
    occasion: string | null
    event_date: string
    guest_count: number
    service_style: string | null
  }
  clientName: string
  courses: Array<{
    courseNumber: number
    courseName: string
    dishDescription: string | null
    dietaryTags: string[]
    allergenFlags: string[]
  }>
}

export async function fetchFrontOfHouseMenuData(
  eventId: string
): Promise<FrontOfHouseMenuData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, guest_count, service_style,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menuId = menus[0].id

  const { data: dishes } = await supabase
    .from('dishes')
    .select('course_number, course_name, description, dietary_tags, allergen_flags, sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
      service_style: event.service_style,
    },
    clientName: clientData?.full_name ?? 'Guest',
    courses: dishes.map((dish: any) => ({
      courseNumber: dish.course_number,
      courseName: dish.course_name,
      dishDescription: dish.description,
      dietaryTags: dish.dietary_tags ?? [],
      allergenFlags: dish.allergen_flags ?? [],
    })),
  }
}

export async function fetchFrontOfHouseMenuDataForClient(
  eventId: string
): Promise<FrontOfHouseMenuData | null> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, guest_count, service_style,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (!event) return null

  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menuId = menus[0].id

  const { data: dishes } = await supabase
    .from('dishes')
    .select('course_number, course_name, description, dietary_tags, allergen_flags, sort_order')
    .eq('menu_id', menuId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
      service_style: event.service_style,
    },
    clientName: clientData?.full_name ?? 'Guest',
    courses: dishes.map((dish: any) => ({
      courseNumber: dish.course_number,
      courseName: dish.course_name,
      dishDescription: dish.description,
      dietaryTags: dish.dietary_tags ?? [],
      allergenFlags: dish.allergen_flags ?? [],
    })),
  }
}

function drawCenteredText(
  pdf: PDFLayout,
  text: string,
  size: number,
  font: 'helvetica' | 'times',
  style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal'
) {
  pdf.doc.setFont(font, style)
  pdf.doc.setFontSize(size)
  pdf.doc.text(text, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
  pdf.y += size * 0.38
}

export function renderFrontOfHouseMenu(pdf: PDFLayout, data: FrontOfHouseMenuData) {
  const { event, clientName, courses } = data

  if (courses.length > 5) pdf.setFontScale(0.92)
  if (courses.length > 7) pdf.setFontScale(0.82)

  const title = event.occasion?.trim() ? `${event.occasion} Menu` : 'Seasonal Tasting Menu'
  const dateLabel = format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')

  // Title — serif for classic elegance
  drawCenteredText(pdf, title, 20, 'times', 'bold')
  pdf.space(1.5)

  // Date and guest count
  drawCenteredText(pdf, `${dateLabel}  ·  ${event.guest_count} Guests`, 10, 'times', 'italic')
  pdf.space(0.8)

  // "For [Client]" in muted sans
  pdf.doc.setFont('helvetica', 'normal')
  pdf.doc.setFontSize(8)
  pdf.doc.setTextColor(120, 120, 120)
  pdf.doc.text(`For ${clientName}`, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
  pdf.doc.setTextColor(0, 0, 0)
  pdf.y += 8 * 0.38
  pdf.space(2.5)

  // Decorative separator
  pdf.doc.setDrawColor(80, 80, 80)
  pdf.doc.setLineWidth(0.5)
  pdf.doc.line(MARGIN_X + 30, pdf.y, LETTER_WIDTH - MARGIN_X - 30, pdf.y)
  pdf.space(4)

  for (const course of courses) {
    if (pdf.y > MAX_Y - 26) break

    // Course name — serif bold, prominent
    drawCenteredText(pdf, course.courseName, 14, 'times', 'bold')

    if (course.dishDescription) {
      pdf.doc.setFont('times', 'italic')
      pdf.doc.setFontSize(9)
      const lines = pdf.doc.splitTextToSize(course.dishDescription, 145) as string[]
      for (const line of lines) {
        if (pdf.y > MAX_Y - 16) break
        pdf.doc.text(line, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
        pdf.y += 3.8
      }
    }

    const tags = [...course.dietaryTags, ...course.allergenFlags].filter(Boolean)
    if (tags.length > 0) {
      const label = tags.map((t) => t.toUpperCase()).join('  ·  ')
      pdf.doc.setFont('helvetica', 'italic')
      pdf.doc.setFontSize(7)
      pdf.doc.setTextColor(130, 130, 130)
      pdf.doc.text(label, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
      pdf.doc.setTextColor(0, 0, 0)
      pdf.y += 7 * 0.38
    }

    pdf.space(2)

    // Light divider between courses (skip after last course)
    if (course !== courses[courses.length - 1] && pdf.y <= MAX_Y - 16) {
      pdf.doc.setDrawColor(200, 200, 200)
      pdf.doc.setLineWidth(0.2)
      pdf.doc.line(MARGIN_X + 50, pdf.y, LETTER_WIDTH - MARGIN_X - 50, pdf.y)
      pdf.space(2.5)
    }
  }

  pdf.footer('Please notify your chef immediately about allergy concerns before service.')
}

export async function generateFrontOfHouseMenu(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchFrontOfHouseMenuData(eventId)
  if (!data) throw new Error('Cannot generate front-of-house menu: missing event or menu data')

  const pdf = new PDFLayout()
  renderFrontOfHouseMenu(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'FOH Menu')
  return pdf.toBuffer()
}

export async function generateFrontOfHouseMenuForClient(eventId: string): Promise<Buffer> {
  const data = await fetchFrontOfHouseMenuDataForClient(eventId)
  if (!data) throw new Error('Cannot generate front-of-house menu: missing event or menu data')

  const pdf = new PDFLayout()
  renderFrontOfHouseMenu(pdf, data)
  return pdf.toBuffer()
}

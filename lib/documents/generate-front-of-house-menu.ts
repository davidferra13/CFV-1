// Front-of-House Menu PDF Generator
// Clean, client-friendly printable menu intended for table placement.
// Uses mapToFOHMenuData() as the single source of truth for data mapping,
// shared with the React component, email template, and image generator.

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { mapToFOHMenuData, type FOHMenuData } from '@/lib/menus/foh-menu-data'
import { PDFLayout, LETTER_WIDTH, MARGIN_X, MAX_Y } from './pdf-layout'
import { FONT, COLOR } from './pdf-design-tokens'

/**
 * @deprecated Use FOHMenuData from '@/lib/menus/foh-menu-data' instead.
 * Kept for backward compatibility with interactive-specs.ts and other consumers.
 */
export type FrontOfHouseMenuData = FOHMenuData

/**
 * Fetch FOH menu data for an event (chef auth).
 * Finds the first menu for the event, then uses mapToFOHMenuData()
 * to produce the canonical FOHMenuData structure.
 */
export async function fetchFrontOfHouseMenuData(eventId: string): Promise<FOHMenuData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client name
  const { data: event } = await db
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

  // Find the first menu for this event
  const { data: menus } = await db
    .from('menus')
    .select(
      'id, name, description, service_style, cuisine_type, target_guest_count, notes, simple_mode, simple_mode_content'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menu = menus[0]

  // Fetch dishes for this menu
  const { data: dishes } = await db
    .from('dishes')
    .select(
      'course_number, course_name, name, description, dietary_tags, allergen_flags, beverage_pairing, sort_order'
    )
    .eq('menu_id', menu.id)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const clientData = event.client as unknown as { full_name: string } | null

  // Fetch chef profile data for attribution
  const chefData = await getChefLayoutData(user.tenantId!).catch(() => null)

  return mapToFOHMenuData({
    menu: {
      name: menu.name,
      description: menu.description,
      service_style: menu.service_style,
      cuisine_type: menu.cuisine_type,
      target_guest_count: menu.target_guest_count,
      notes: menu.notes,
      simple_mode: menu.simple_mode,
      simple_mode_content: menu.simple_mode_content,
      dishes: dishes.map((d: any) => ({
        course_name: d.course_name,
        course_number: d.course_number,
        name: d.name ?? null,
        description: d.description,
        dietary_tags: d.dietary_tags ?? [],
        allergen_flags: d.allergen_flags ?? [],
        beverage_pairing: d.beverage_pairing ?? null,
      })),
    },
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
      client_name: clientData?.full_name ?? null,
    },
    chefName: chefData?.business_name ?? null,
    tagline: chefData?.tagline ?? null,
  })
}

/**
 * Fetch FOH menu data for an event (client auth).
 * Same mapper, different auth gate.
 */
export async function fetchFrontOfHouseMenuDataForClient(
  eventId: string
): Promise<FOHMenuData | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, guest_count, service_style,
      client:clients(full_name),
      tenant_id
    `
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (!event) return null

  const tenantId = event.tenant_id as string

  const { data: menus } = await db
    .from('menus')
    .select(
      'id, name, description, service_style, cuisine_type, target_guest_count, notes, simple_mode, simple_mode_content'
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menu = menus[0]

  const { data: dishes } = await db
    .from('dishes')
    .select(
      'course_number, course_name, name, description, dietary_tags, allergen_flags, beverage_pairing, sort_order'
    )
    .eq('menu_id', menu.id)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const clientData = event.client as unknown as { full_name: string } | null

  // Fetch chef profile for attribution (uses admin client internally, no auth needed)
  const chefData = tenantId ? await getChefLayoutData(tenantId).catch(() => null) : null

  return mapToFOHMenuData({
    menu: {
      name: menu.name,
      description: menu.description,
      service_style: menu.service_style,
      cuisine_type: menu.cuisine_type,
      target_guest_count: menu.target_guest_count,
      notes: menu.notes,
      simple_mode: menu.simple_mode,
      simple_mode_content: menu.simple_mode_content,
      dishes: dishes.map((d: any) => ({
        course_name: d.course_name,
        course_number: d.course_number,
        name: d.name ?? null,
        description: d.description,
        dietary_tags: d.dietary_tags ?? [],
        allergen_flags: d.allergen_flags ?? [],
        beverage_pairing: d.beverage_pairing ?? null,
      })),
    },
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
      client_name: clientData?.full_name ?? null,
    },
    chefName: chefData?.business_name ?? null,
    tagline: chefData?.tagline ?? null,
  })
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

export function renderFrontOfHouseMenu(pdf: PDFLayout, data: FOHMenuData) {
  const {
    courses,
    clientName,
    title: menuTitle,
    date,
    guestCount,
    chefName,
    tagline,
    serviceStyle,
  } = data

  if (courses.length > 5) pdf.setFontScale(0.92)
  if (courses.length > 7) pdf.setFontScale(0.82)

  const displayTitle = menuTitle || 'Seasonal Tasting Menu'

  // Title, serif for classic elegance
  drawCenteredText(pdf, displayTitle, 20, 'times', 'bold')
  pdf.space(1.5)

  // Date and guest count
  const headerParts: string[] = []
  if (date) headerParts.push(date)
  if (guestCount) headerParts.push(`${guestCount} Guests`)
  if (headerParts.length > 0) {
    drawCenteredText(pdf, headerParts.join('  \u00B7  '), 10, 'times', 'italic')
    pdf.space(0.8)
  }

  // "For [Client]" in muted sans
  if (clientName) {
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(FONT.caption.size)
    pdf.doc.setTextColor(...COLOR.textMuted)
    pdf.doc.text(`For ${clientName}`, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
    pdf.doc.setTextColor(...COLOR.textPrimary)
    pdf.y += FONT.caption.size * 0.38
    pdf.space(0.8)
  }

  // Chef attribution
  if (chefName) {
    pdf.doc.setFont('helvetica', 'italic')
    pdf.doc.setFontSize(FONT.caption.size)
    pdf.doc.setTextColor(...COLOR.textMuted)
    const attribution = tagline ? `${chefName} \u00B7 ${tagline}` : chefName
    pdf.doc.text(attribution, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
    pdf.doc.setTextColor(...COLOR.textPrimary)
    pdf.y += FONT.caption.size * 0.38
  }

  pdf.space(2.5)

  // Decorative separator
  pdf.doc.setDrawColor(80, 80, 80)
  pdf.doc.setLineWidth(0.5)
  pdf.doc.line(MARGIN_X + 30, pdf.y, LETTER_WIDTH - MARGIN_X - 30, pdf.y)
  pdf.space(4)

  for (const course of courses) {
    if (pdf.y > MAX_Y - 26) break

    // Course label, serif bold, prominent
    drawCenteredText(pdf, course.label, 14, 'times', 'bold')

    // Dish name (if different from course label)
    if (course.dishName) {
      drawCenteredText(pdf, course.dishName, 11, 'times', 'italic')
    }

    if (course.description) {
      pdf.doc.setFont('times', 'italic')
      pdf.doc.setFontSize(9)
      const lines = pdf.doc.splitTextToSize(course.description, 145) as string[]
      for (const line of lines) {
        if (pdf.y > MAX_Y - 16) break
        pdf.doc.text(line, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
        pdf.y += 3.8
      }
    }

    // Beverage pairing
    if (course.beveragePairing) {
      pdf.doc.setFont('times', 'italic')
      pdf.doc.setFontSize(8)
      pdf.doc.setTextColor(...COLOR.textMuted)
      pdf.doc.text(`Paired with: ${course.beveragePairing}`, LETTER_WIDTH / 2, pdf.y, {
        align: 'center',
      })
      pdf.doc.setTextColor(...COLOR.textPrimary)
      pdf.y += 3.5
    }

    const tags = [...course.dietaryTags, ...course.allergenFlags].filter(Boolean)
    if (tags.length > 0) {
      const label = tags.map((t) => t.toUpperCase()).join('  \u00B7  ')
      pdf.doc.setFont('helvetica', 'italic')
      pdf.doc.setFontSize(FONT.footer.size)
      pdf.doc.setTextColor(...COLOR.textMuted)
      pdf.doc.text(label, LETTER_WIDTH / 2, pdf.y, { align: 'center' })
      pdf.doc.setTextColor(...COLOR.textPrimary)
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

  // Footer note from data, or default allergy disclaimer
  const footerText =
    data.footerNote || 'Please notify your chef immediately about allergy concerns before service.'
  pdf.footer(footerText)
}

export async function generateFrontOfHouseMenu(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchFrontOfHouseMenuData(eventId)
  if (!data) throw new Error('Cannot generate front-of-house menu: missing event or menu data')

  const pdf = new PDFLayout({
    docType: 'front-of-house-menu',
    clientName: data.clientName ?? undefined,
    eventDate: data.date ?? undefined,
  })
  renderFrontOfHouseMenu(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'FOH Menu')
  return pdf.toBuffer()
}

export async function generateFrontOfHouseMenuForClient(eventId: string): Promise<Buffer> {
  const data = await fetchFrontOfHouseMenuDataForClient(eventId)
  if (!data) throw new Error('Cannot generate front-of-house menu: missing event or menu data')

  const pdf = new PDFLayout({
    docType: 'front-of-house-menu',
    clientName: data.clientName ?? undefined,
    eventDate: data.date ?? undefined,
  })
  renderFrontOfHouseMenu(pdf, data)
  return pdf.toBuffer()
}

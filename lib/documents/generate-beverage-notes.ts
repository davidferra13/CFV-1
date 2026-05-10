// Beverage & Pairing Notes Generator
// Per-course pairing sheet with fill-in fields for wine, cocktails, and non-alcoholic pairings.
// Always ready: shows blank pairing slots even without a menu attached.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { FONT } from './pdf-design-tokens'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'

// ─── Types ───────────────────────────────────────────────────────────────────

type BeverageDish = {
  name: string
  course_label: string
  description: string | null
}

export type BeverageNotesData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string
    guest_count: number
    dietary_restrictions: string[] | null
  }
  clientName: string
  // Dishes grouped by course_label; empty array if no menu
  courseGroups: Array<{
    courseLabel: string
    dishes: BeverageDish[]
  }>
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchBeverageNotesData(eventId: string): Promise<BeverageNotesData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, serve_time, guest_count, dietary_restrictions,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null

  // Find menu attached to this event
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  let courseGroups: BeverageNotesData['courseGroups'] = []

  if (menus && menus.length > 0) {
    const menuId = menus[0].id

    const { data: dishes } = await db
      .from('dishes')
      .select('name, course_label, description')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (dishes && dishes.length > 0) {
      // Group by course_label
      const groupMap = new Map<string, BeverageDish[]>()
      for (const d of dishes) {
        const label = d.course_label || 'Uncategorized'
        const existing = groupMap.get(label)
        if (existing) {
          existing.push({ name: d.name, course_label: label, description: d.description })
        } else {
          groupMap.set(label, [{ name: d.name, course_label: label, description: d.description }])
        }
      }
      courseGroups = Array.from(groupMap.entries()).map(([courseLabel, dishes]) => ({
        courseLabel,
        dishes,
      }))
    }
  }

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      guest_count: event.guest_count,
      dietary_restrictions: event.dietary_restrictions,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    courseGroups,
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function renderPairingFields(pdf: PDFLayout) {
  pdf.text(
    'Pairing: _______________________________________________',
    FONT.metadata.size,
    'normal',
    10
  )
  pdf.text('Temp: ___________    Glassware: ___________', FONT.metadata.size, 'normal', 10)
  pdf.text(
    'Notes: _______________________________________________',
    FONT.metadata.size,
    'normal',
    10
  )
}

export function renderBeverageNotes(pdf: PDFLayout, data: BeverageNotesData) {
  const { event, clientName, courseGroups } = data

  pdf.title('BEVERAGE & PAIRING NOTES', 14)

  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEE, MMM d, yyyy'
  )
  const dietaryLine =
    event.dietary_restrictions && event.dietary_restrictions.length > 0
      ? `  |  Dietary: ${event.dietary_restrictions.join(', ')}`
      : ''
  pdf.text(
    `${clientName}  |  ${dateStr}  |  ${event.serve_time}  |  ${event.guest_count} guests${dietaryLine}`,
    FONT.metadata.size,
    'normal'
  )
  pdf.space(1)

  if (courseGroups.length > 0) {
    // Per-course sections with actual dishes
    for (const group of courseGroups) {
      pdf.courseHeader(group.courseLabel)

      for (const dish of group.dishes) {
        pdf.text(dish.name, FONT.bodyText.size, 'bold', 4)
        if (dish.description) {
          pdf.text(dish.description, FONT.caption.size, 'italic', 8)
        }
        renderPairingFields(pdf)
        pdf.space(1)
      }
    }
  } else {
    // No menu: generic course placeholders
    const placeholders = ['Course 1', 'Course 2', 'Course 3']
    for (const label of placeholders) {
      pdf.courseHeader(label)
      pdf.text(
        'Dish: _______________________________________________',
        FONT.metadata.size,
        'normal',
        4
      )
      renderPairingFields(pdf)
      pdf.space(1)
    }
  }

  // Additional sections
  pdf.sectionHeader('CLIENT PROVIDING', 11, true)
  pdf.text('_______________________________________________', FONT.metadata.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.metadata.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.metadata.size, 'normal', 4)
  pdf.space(1)

  pdf.sectionHeader('SPECIAL REQUESTS', 11, true)
  pdf.text('_______________________________________________', FONT.metadata.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.metadata.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.metadata.size, 'normal', 4)

  pdf.footer(`Beverage & Pairing Notes - ${clientName} - ${dateStr}`)
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateBeverageNotes(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchBeverageNotesData(eventId)
  if (!data) throw new Error('Cannot generate beverage notes: event not found')

  const dateStr = data.event.event_date
    ? format(parseISO(dateToDateString(data.event.event_date as Date | string)), 'MMMM d, yyyy')
    : undefined
  const pdf = new PDFLayout({
    docType: 'beverage-notes',
    clientName: data.clientName,
    eventDate: dateStr,
  })
  renderBeverageNotes(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Beverage & Pairing Notes')
  return pdf.toBuffer()
}

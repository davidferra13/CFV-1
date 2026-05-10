// Mise en Place Verification Generator
// Component-level checklist between prep and packing.
// Verifies every component is portioned, labeled, and tasted before transport.
// Requires menu + dishes + components to generate.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { FONT } from './pdf-design-tokens'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'

// ─── Types ───────────────────────────────────────────────────────────────────

type MiseComponent = {
  name: string
  quantity: number | null
  unit: string | null
  prep_notes: string | null
}

type MiseDish = {
  name: string
  course_label: string
  components: MiseComponent[]
}

export type MiseCheckData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string
    departure_time: string | null
    guest_count: number
  }
  clientName: string
  dishes: MiseDish[]
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchMiseCheckData(eventId: string): Promise<MiseCheckData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, serve_time, departure_time, guest_count,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null

  // Find menu
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menuId = menus[0].id

  // Fetch dishes
  const { data: rawDishes } = await db
    .from('dishes')
    .select('id, name, course_label')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!rawDishes || rawDishes.length === 0) return null

  const dishIds = rawDishes.map((d: any) => d.id)

  // Fetch components
  const { data: rawComponents } = await db
    .from('components')
    .select('name, quantity, unit, prep_notes, dish_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (!rawComponents || rawComponents.length === 0) return null

  // Group components by dish
  const componentsByDish = new Map<string, MiseComponent[]>()
  for (const c of rawComponents) {
    const existing = componentsByDish.get(c.dish_id)
    const comp: MiseComponent = {
      name: c.name,
      quantity: c.quantity,
      unit: c.unit,
      prep_notes: c.prep_notes,
    }
    if (existing) {
      existing.push(comp)
    } else {
      componentsByDish.set(c.dish_id, [comp])
    }
  }

  const dishes: MiseDish[] = rawDishes
    .filter((d: any) => componentsByDish.has(d.id))
    .map((d: any) => ({
      name: d.name,
      course_label: d.course_label || 'Uncategorized',
      components: componentsByDish.get(d.id) || [],
    }))

  if (dishes.length === 0) return null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      departure_time: event.departure_time,
      guest_count: event.guest_count,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    dishes,
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderMiseCheck(pdf: PDFLayout, data: MiseCheckData) {
  const { event, clientName, dishes } = data

  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEE, MMM d, yyyy'
  )

  // Estimate density for font scaling
  const totalComponents = dishes.reduce((sum, d) => sum + d.components.length, 0)
  if (totalComponents > 20) pdf.setFontScale(0.85)
  if (totalComponents > 30) pdf.setFontScale(0.75)

  pdf.title('MISE EN PLACE VERIFICATION', FONT.title.size - 2)

  const departureTime = event.departure_time
    ? format(new Date(event.departure_time), 'h:mm a')
    : 'TBD'
  pdf.text(
    `${clientName}  |  ${dateStr}  |  Serve: ${event.serve_time}  |  Depart: ${departureTime}  |  ${event.guest_count} guests`,
    FONT.metadata.size,
    'normal'
  )
  pdf.itemGap()

  // Per-dish sections with component verification checkboxes
  for (const dish of dishes) {
    pdf.sectionHeader(`${dish.name} (${dish.course_label})`, FONT.bodyText.size, true)

    for (const comp of dish.components) {
      // Component name with quantity/unit
      const qtyLabel =
        comp.quantity && comp.unit
          ? `${comp.quantity} ${comp.unit}`
          : comp.quantity
            ? `${comp.quantity}`
            : ''
      const compLabel = qtyLabel ? `${comp.name} (${qtyLabel})` : comp.name

      pdf.text(compLabel, FONT.metadata.size, 'bold', 4)

      if (comp.prep_notes) {
        pdf.text(comp.prep_notes, FONT.caption.size, 'italic', 8)
      }

      // Three verification checkboxes per component
      pdf.checkbox('Portioned', FONT.caption.size)
      pdf.checkbox('Labeled', FONT.caption.size)
      pdf.checkbox('Tasted', FONT.caption.size)
      pdf.itemGap()
    }
  }

  // Final checks section
  pdf.sectionHeader('FINAL CHECKS', FONT.courseHeader.size, true)
  pdf.checkbox('All containers sealed', FONT.metadata.size)
  pdf.checkbox('All items labeled with dish name', FONT.metadata.size)
  pdf.checkbox('Temperature zones verified', FONT.metadata.size)
  pdf.checkbox('Nothing left in prep area', FONT.metadata.size)
  pdf.checkbox('Cooler/transport containers ready', FONT.metadata.size)

  pdf.footer(`Mise en Place Verification - ${clientName} - ${dateStr} - Depart: ${departureTime}`)
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateMiseCheck(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchMiseCheckData(eventId)
  if (!data)
    throw new Error(
      'Cannot generate mise en place verification: missing menu, dishes, or components'
    )

  const dateStr = format(
    parseISO(dateToDateString(data.event.event_date as Date | string)),
    'EEE, MMM d, yyyy'
  )
  const pdf = new PDFLayout({
    docType: 'mise-check',
    clientName: data.clientName,
    eventDate: dateStr,
  })
  renderMiseCheck(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Mise en Place Verification')
  return pdf.toBuffer()
}

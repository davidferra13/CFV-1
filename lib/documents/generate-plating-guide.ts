// Plating Guide Generator
// Per-dish plating directions with auto-populated dish/component data
// and blank fields for plate type, garnish, portion notes, and presentation notes.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { FONT } from './pdf-design-tokens'

export type PlatingGuideData = {
  event: {
    occasion: string | null
    event_date: string
    guest_count: number
  }
  clientName: string
  dishes: {
    name: string
    course_label: string
    components: { name: string; quantity: string | null; unit: string | null }[]
  }[]
}

export async function fetchPlatingGuideData(eventId: string): Promise<PlatingGuideData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, guest_count,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Find menu for this event
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
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, course_label')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_label', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const dishIds = dishes.map((d: any) => d.id)

  // Fetch components for all dishes
  const { data: components } = await db
    .from('components')
    .select('name, quantity, unit, dish_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  const componentsByDish = new Map<
    string,
    { name: string; quantity: string | null; unit: string | null }[]
  >()
  for (const comp of components || []) {
    const list = componentsByDish.get(comp.dish_id) || []
    list.push({ name: comp.name, quantity: comp.quantity, unit: comp.unit })
    componentsByDish.set(comp.dish_id, list)
  }

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    dishes: dishes.map((d: any) => ({
      name: d.name,
      course_label: d.course_label || 'Uncategorized',
      components: componentsByDish.get(d.id) || [],
    })),
  }
}

export function renderPlatingGuide(pdf: PDFLayout, data: PlatingGuideData) {
  pdf.title('PLATING GUIDE', FONT.title.size)
  pdf.text(
    `${data.event.occasion || 'Event'} | ${data.clientName} | ${data.event.guest_count} covers`,
    FONT.bodyText.size,
    'normal',
    0
  )
  pdf.space(2)

  for (const dish of data.dishes) {
    pdf.courseHeader(`${dish.course_label}: ${dish.name}`)
    pdf.space(1)

    // List components
    if (dish.components.length > 0) {
      pdf.sectionHeader('Components', FONT.bodyText.size, false)
      for (const comp of dish.components) {
        const qty = comp.quantity && comp.unit ? ` (${comp.quantity} ${comp.unit})` : ''
        pdf.text(`- ${comp.name}${qty}`, FONT.metadata.size, 'normal', 10)
      }
      pdf.space(1)
    }

    // Blank fill-in fields
    pdf.text('Plate Type: ___________________________________', FONT.bodyText.size, 'normal', 0)
    pdf.space(1)
    pdf.text('Garnish: ___________________________________', FONT.bodyText.size, 'normal', 0)
    pdf.space(1)
    pdf.text('Portion Notes: ___________________________________', FONT.bodyText.size, 'normal', 0)
    pdf.space(1)
    pdf.text('Presentation Notes:', FONT.bodyText.size, 'bold', 0)
    pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
    pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
    pdf.space(3)
  }
}

export async function generatePlatingGuide(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchPlatingGuideData(eventId)
  if (!data) throw new Error('Cannot generate plating guide: event or menu not found')

  const pdf = new PDFLayout({
    docType: 'plating-guide',
    clientName: data.clientName,
    eventDate: data.event.event_date,
  })
  renderPlatingGuide(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Plating Guide')
  return pdf.toBuffer()
}

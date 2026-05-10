// Allergen Quick-Reference Card Generator
// Station-tape card with large bold per-guest allergen info
// and per-dish safety notes. Designed for readability at arm's length.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { FONT } from './pdf-design-tokens'

export type AllergenReferenceData = {
  event: {
    occasion: string | null
    event_date: string
    dietary_restrictions: string | null
    allergies: string | null
    guest_count: number
  }
  clientName: string
  guests: {
    name: string
    dietary_restrictions: string | null
    allergies: string | null
  }[]
  dishes: {
    name: string
    course_label: string
    notes: string | null
  }[]
}

export async function fetchAllergenReferenceData(
  eventId: string
): Promise<AllergenReferenceData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, dietary_restrictions, allergies, guest_count,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Fetch event guests
  const { data: guests } = await db
    .from('event_guests')
    .select('name, dietary_restrictions, allergies')
    .eq('event_id', eventId)

  // Find menu for dish notes
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  let dishes: { name: string; course_label: string; notes: string | null }[] = []
  if (menus && menus.length > 0) {
    const { data: rawDishes } = await db
      .from('dishes')
      .select('name, course_label, notes')
      .eq('menu_id', menus[0].id)
      .eq('tenant_id', user.tenantId!)
      .order('course_label', { ascending: true })

    dishes = (rawDishes || []).map((d: any) => ({
      name: d.name,
      course_label: d.course_label || 'Uncategorized',
      notes: d.notes,
    }))
  }

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      dietary_restrictions: event.dietary_restrictions,
      allergies: event.allergies,
      guest_count: event.guest_count,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    guests: (guests || []).map((g: any) => ({
      name: g.name,
      dietary_restrictions: g.dietary_restrictions,
      allergies: g.allergies,
    })),
    dishes,
  }
}

export function renderAllergenReference(pdf: PDFLayout, data: AllergenReferenceData) {
  pdf.title('ALLERGEN QUICK-REFERENCE', FONT.title.size)
  pdf.text(
    `${data.event.occasion || 'Event'} | ${data.clientName} | ${data.event.guest_count} guests`,
    FONT.bodyText.size,
    'normal',
    0
  )
  pdf.space(2)

  const hasGuestData = data.guests.some((g) => g.allergies || g.dietary_restrictions)
  const hasEventData = data.event.allergies || data.event.dietary_restrictions
  const hasDishNotes = data.dishes.some((d) => d.notes)

  // If no allergen data at all, show a clear message
  if (!hasGuestData && !hasEventData && data.guests.length === 0) {
    pdf.text(
      'No allergens or dietary restrictions recorded for this event.',
      FONT.sectionHeader.size + 2,
      'bold',
      0
    )
    return
  }

  // GUESTS section
  if (data.guests.length > 0) {
    pdf.sectionHeader('GUESTS', FONT.sectionHeader.size + 2, true)
    pdf.space(1)

    for (const guest of data.guests) {
      pdf.text(guest.name, FONT.sectionHeader.size + 1, 'bold', 0)

      const restrictions = guest.dietary_restrictions || 'None noted'
      const allergies = guest.allergies || 'None noted'

      pdf.text(`Dietary: ${restrictions}`, FONT.sectionHeader.size, 'normal', 10)
      pdf.text(`Allergies: ${allergies}`, FONT.sectionHeader.size, 'normal', 10)
      pdf.space(2)
    }
  }

  // EVENT-WIDE section
  pdf.sectionHeader('EVENT-WIDE', FONT.sectionHeader.size + 2, true)
  pdf.space(1)

  if (hasEventData) {
    if (data.event.dietary_restrictions) {
      pdf.text(
        `Dietary Restrictions: ${data.event.dietary_restrictions}`,
        FONT.sectionHeader.size,
        'normal',
        0
      )
    }
    if (data.event.allergies) {
      pdf.text(`Allergies: ${data.event.allergies}`, FONT.sectionHeader.size, 'normal', 0)
    }
  } else {
    pdf.text('No event-wide restrictions or allergies noted.', FONT.sectionHeader.size, 'normal', 0)
  }

  pdf.space(2)

  // DISHES section
  if (data.dishes.length > 0) {
    pdf.sectionHeader('DISHES', FONT.sectionHeader.size + 2, true)
    pdf.space(1)

    for (const dish of data.dishes) {
      const noteText = dish.notes || 'No notes'
      pdf.text(`${dish.course_label}: ${dish.name}`, FONT.sectionHeader.size, 'bold', 0)
      pdf.text(noteText, FONT.courseHeader.size, 'normal', 10)
      pdf.space(1)
    }
  }
}

export async function generateAllergenReference(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchAllergenReferenceData(eventId)
  if (!data) throw new Error('Cannot generate allergen reference: event not found')

  const pdf = new PDFLayout({
    docType: 'allergen-reference',
    clientName: data.clientName,
    eventDate: data.event.event_date,
  })
  renderAllergenReference(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Allergen Quick-Reference')
  return pdf.toBuffer()
}

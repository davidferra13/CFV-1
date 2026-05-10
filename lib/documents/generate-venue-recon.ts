// Venue / Kitchen Recon Sheet Generator
// Mostly blank checklist to fill in on-site or during venue walkthrough.
// Checkbox sections for kitchen equipment, utilities, refrigeration,
// service area, parking, and general notes.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { FONT } from './pdf-design-tokens'

export type VenueReconData = {
  event: {
    occasion: string | null
    event_date: string
    location_address: string | null
    location_city: string | null
    location_state: string | null
    access_instructions: string | null
  }
  clientName: string
}

export async function fetchVenueReconData(eventId: string): Promise<VenueReconData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date,
      location_address, location_city, location_state,
      access_instructions,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      access_instructions: event.access_instructions,
    },
    clientName: clientData?.full_name ?? 'Unknown',
  }
}

export function renderVenueRecon(pdf: PDFLayout, data: VenueReconData) {
  pdf.title('VENUE / KITCHEN RECON', FONT.title.size)
  pdf.text(
    `${data.event.occasion || 'Event'} | ${data.clientName}`,
    FONT.bodyText.size,
    'normal',
    0
  )
  pdf.itemGap()

  // Venue address
  const address = [data.event.location_address, data.event.location_city, data.event.location_state]
    .filter(Boolean)
    .join(', ')

  if (address) {
    pdf.text(`Address: ${address}`, FONT.courseHeader.size, 'bold', 0)
  } else {
    pdf.text('Address: (not recorded)', FONT.courseHeader.size, 'normal', 0)
  }

  if (data.event.access_instructions) {
    pdf.text(`Access: ${data.event.access_instructions}`, FONT.bodyText.size, 'normal', 0)
  }

  pdf.groupGap()

  // KITCHEN EQUIPMENT
  pdf.sectionHeader('KITCHEN EQUIPMENT', FONT.sectionHeader.size, true)
  pdf.text('Oven Type: ___________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.text('Burner Count: ___________', FONT.bodyText.size, 'normal', 0)
  pdf.text('Counter Space:   adequate  /  tight', FONT.bodyText.size, 'normal', 0)
  pdf.checkbox('Microwave', FONT.bodyText.size)
  pdf.checkbox('Blender', FONT.bodyText.size)
  pdf.checkbox('Food Processor', FONT.bodyText.size)
  pdf.checkbox('Sheet Pans', FONT.bodyText.size)
  pdf.checkbox('Mixing Bowls', FONT.bodyText.size)
  pdf.groupGap()

  // UTILITIES
  pdf.sectionHeader('UTILITIES', FONT.sectionHeader.size, true)
  pdf.checkbox('Hot Water', FONT.bodyText.size)
  pdf.checkbox('Garbage Disposal', FONT.bodyText.size)
  pdf.text('Outlets (count): ___________', FONT.bodyText.size, 'normal', 0)
  pdf.checkbox('Extension Cord Needed', FONT.bodyText.size)
  pdf.groupGap()

  // REFRIGERATION & STORAGE
  pdf.sectionHeader('REFRIGERATION & STORAGE', FONT.sectionHeader.size, true)
  pdf.text('Fridge Space:   full  /  partial  /  none', FONT.bodyText.size, 'normal', 0)
  pdf.checkbox('Freezer', FONT.bodyText.size)
  pdf.checkbox('Dry Storage', FONT.bodyText.size)
  pdf.checkbox('Cooler Staging Area', FONT.bodyText.size)
  pdf.groupGap()

  // SERVICE AREA
  pdf.sectionHeader('SERVICE AREA', FONT.sectionHeader.size, true)
  pdf.text('Table Count: ___________', FONT.bodyText.size, 'normal', 0)
  pdf.text('Seating Style: ___________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.checkbox('Buffet Space', FONT.bodyText.size)
  pdf.checkbox('Serving Platters Available', FONT.bodyText.size)
  pdf.groupGap()

  // PARKING & ACCESS
  pdf.sectionHeader('PARKING & ACCESS', FONT.sectionHeader.size, true)
  pdf.text('Parking:   Driveway  /  Street  /  Lot', FONT.bodyText.size, 'normal', 0)
  pdf.checkbox('Loading Zone', FONT.bodyText.size)
  pdf.checkbox('Key / Code Needed', FONT.bodyText.size)
  pdf.checkbox('Elevator / Stairs', FONT.bodyText.size)
  pdf.groupGap()

  // NOTES
  pdf.sectionHeader('NOTES', FONT.sectionHeader.size, true)
  pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
  pdf.text('_______________________________________________', FONT.bodyText.size, 'normal', 0)
}

export async function generateVenueRecon(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchVenueReconData(eventId)
  if (!data) throw new Error('Cannot generate venue recon: event not found')

  const pdf = new PDFLayout({
    docType: 'venue-recon',
    clientName: data.clientName,
    eventDate: data.event.event_date,
  })
  renderVenueRecon(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Venue Recon')
  return pdf.toBuffer()
}

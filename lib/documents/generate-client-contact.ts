// Client Contact & Access Generator
// Pocket-card format: all critical contact and access info for the car or pocket.
// Large readable text, compact layout. Always ready.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { FONT } from './pdf-design-tokens'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClientContactData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string
    arrival_time: string | null
    location_address: string | null
    location_city: string | null
    location_state: string | null
    access_instructions: string | null
    wifi_password: string | null
  }
  client: {
    full_name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
  }
  emergencyContacts: Array<{
    full_name: string
    phone: string | null
  }>
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchClientContactData(eventId: string): Promise<ClientContactData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, serve_time, arrival_time,
      location_address, location_city, location_state,
      access_instructions, wifi_password,
      client:clients(full_name, email, phone, address, city, state)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as {
    full_name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
  } | null

  // Fetch event guests for emergency contact info
  const { data: guests } = await db
    .from('event_guests')
    .select('full_name, phone')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .limit(5)

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      access_instructions: event.access_instructions,
      wifi_password: event.wifi_password,
    },
    client: {
      full_name: clientData?.full_name ?? 'Unknown',
      email: clientData?.email ?? null,
      phone: clientData?.phone ?? null,
      address: clientData?.address ?? null,
      city: clientData?.city ?? null,
      state: clientData?.state ?? null,
    },
    emergencyContacts: (guests ?? []).map((g: any) => ({
      full_name: g.full_name,
      phone: g.phone,
    })),
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderClientContact(pdf: PDFLayout, data: ClientContactData) {
  const { event, client, emergencyContacts } = data

  pdf.title('CLIENT CONTACT & ACCESS', FONT.sectionHeader.size + 2)

  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEE, MMM d, yyyy'
  )
  pdf.text(
    `${event.occasion || 'Event'}  |  ${dateStr}  |  Serve: ${event.serve_time}`,
    FONT.bodyText.size,
    'normal'
  )
  pdf.space(1)

  // ─── CLIENT ────────────────────────────────────────────────────────────────
  pdf.sectionHeader('CLIENT', FONT.sectionHeader.size, true)
  pdf.text(client.full_name, FONT.sectionHeader.size + 2, 'bold', 4)
  pdf.text(`Phone: ${client.phone || '___________________'}`, FONT.courseHeader.size, 'normal', 4)
  pdf.text(`Email: ${client.email || '___________________'}`, FONT.courseHeader.size, 'normal', 4)
  pdf.space(1)

  // ─── EVENT VENUE ───────────────────────────────────────────────────────────
  pdf.sectionHeader('EVENT VENUE', FONT.sectionHeader.size, true)
  const addressParts = [event.location_address, event.location_city, event.location_state].filter(
    Boolean
  )
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '___________________'
  pdf.text(fullAddress, FONT.sectionHeader.size, 'bold', 4)

  if (event.arrival_time) {
    pdf.text(`Arrival Time: ${event.arrival_time}`, FONT.courseHeader.size, 'normal', 4)
  }

  if (event.access_instructions) {
    pdf.text(`Access: ${event.access_instructions}`, FONT.courseHeader.size, 'normal', 4)
  }
  pdf.space(1)

  // ─── ACCESS DETAILS ────────────────────────────────────────────────────────
  pdf.sectionHeader('ACCESS DETAILS', FONT.sectionHeader.size, true)
  pdf.text('Gate Code: ___________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text('Parking: ___________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text('Door: ___________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text(
    `Wi-Fi: ${event.wifi_password || '___________________'}`,
    FONT.courseHeader.size,
    'normal',
    4
  )
  pdf.space(1)

  // ─── EMERGENCY ─────────────────────────────────────────────────────────────
  pdf.sectionHeader('EMERGENCY', FONT.sectionHeader.size, true)
  pdf.text('Nearest Hospital: ___________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text('Nearest Pharmacy: ___________________', FONT.courseHeader.size, 'normal', 4)

  // Show first guest with phone as potential emergency contact
  const emergencyGuest = emergencyContacts.find((g) => g.phone)
  if (emergencyGuest) {
    pdf.text(
      `Client Emergency Contact: ${emergencyGuest.full_name} (${emergencyGuest.phone})`,
      FONT.courseHeader.size,
      'normal',
      4
    )
  } else {
    pdf.text('Client Emergency Contact: ___________________', FONT.courseHeader.size, 'normal', 4)
  }
  pdf.space(1)

  // ─── NOTES ─────────────────────────────────────────────────────────────────
  pdf.sectionHeader('NOTES', FONT.sectionHeader.size, true)
  pdf.text('_______________________________________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.courseHeader.size, 'normal', 4)
  pdf.text('_______________________________________________', FONT.courseHeader.size, 'normal', 4)

  pdf.footer(`Client Contact & Access - ${client.full_name} - ${dateStr}`)
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateClientContact(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchClientContactData(eventId)
  if (!data) throw new Error('Cannot generate client contact card: event not found')

  const pdf = new PDFLayout({
    docType: 'client-contact',
    clientName: data.client.full_name,
    eventDate: dateToDateString(data.event.event_date as Date | string),
  })
  renderClientContact(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Client Contact & Access')
  return pdf.toBuffer()
}

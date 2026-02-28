// Non-Negotiables Checklist Generator (Printed Sheet #3)
// Checked before walking out the door. Last thing before departure.
// Large checkboxes — checked with a pen, possibly wet hands.
// Three sections: ALWAYS + THIS EVENT + LEARNED (forgotten before)
// MUST fit on ONE page — no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getChefChecklist, type ChecklistItem } from '@/lib/checklist/actions'
import { PDFLayout } from './pdf-layout'

export type ChecklistData = {
  event: {
    occasion: string | null
    event_date: string
    departure_time: string | null
    location_address: string
    location_city: string
    location_state: string
    access_instructions: string | null
  }
  clientName: string
  permanentItems: ChecklistItem[]
  eventSpecificItems: ChecklistItem[]
  learnedItems: ChecklistItem[]
}

/** Fetch all data needed for the checklist */
export async function fetchChecklistData(eventId: string): Promise<ChecklistData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event basics
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, departure_time,
      location_address, location_city, location_state,
      access_instructions,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Get checklist items (permanent + event-specific + learned)
  const allItems = await getChefChecklist(eventId)

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      departure_time: event.departure_time,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      access_instructions: event.access_instructions,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    permanentItems: allItems.filter((i) => i.category === 'permanent'),
    eventSpecificItems: allItems.filter((i) => i.category === 'event_specific'),
    learnedItems: allItems.filter((i) => i.category === 'learned'),
  }
}

/** Render checklist onto a PDFLayout instance */
export function renderChecklist(pdf: PDFLayout, data: ChecklistData) {
  const { event, permanentItems, eventSpecificItems, learnedItems } = data

  // Scale for very long checklists
  const totalItems = permanentItems.length + eventSpecificItems.length + learnedItems.length
  if (totalItems > 25) pdf.setFontScale(0.85)
  if (totalItems > 35) pdf.setFontScale(0.75)

  // Title
  pdf.title('NON-NEGOTIABLES', 16)
  pdf.text('CHECK BEFORE LEAVING', 10, 'bold', 0)
  pdf.space(3)

  // ALWAYS section
  pdf.sectionHeader('ALWAYS', 12, true)
  for (const item of permanentItems) {
    pdf.checkbox(item.item, 11)
  }
  pdf.space(2)

  // THIS EVENT section
  if (eventSpecificItems.length > 0) {
    pdf.sectionHeader('THIS EVENT', 12, true)
    for (const item of eventSpecificItems) {
      pdf.checkbox(item.item, 11)
    }
    pdf.space(2)
  }

  // LEARNED section
  if (learnedItems.length > 0) {
    pdf.sectionHeader('LEARNED (forgotten before)', 12, true)
    for (const item of learnedItems) {
      const extra = item.forgottenCount ? `(forgotten ${item.forgottenCount}x)` : undefined
      pdf.checkbox(item.item, 11, extra)
    }
    pdf.space(2)
  }

  // Footer with departure info
  const location = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')
  const footerParts: string[] = []
  if (event.departure_time) footerParts.push(`Leave by ${event.departure_time}`)
  footerParts.push(location)
  if (event.access_instructions) footerParts.push(`Access: ${event.access_instructions}`)

  pdf.footer(footerParts.join(' | '))
}

/** Generate a standalone checklist PDF */
export async function generateChecklist(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchChecklistData(eventId)
  if (!data) throw new Error('Cannot generate checklist: event not found')

  const pdf = new PDFLayout()
  renderChecklist(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Non-Negotiables')
  return pdf.toBuffer()
}

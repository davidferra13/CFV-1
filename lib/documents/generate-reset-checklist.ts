// Post-Service Reset Checklist Generator (Printed Sheet #7)
// The last document. Checked the night of service or by noon the next day.
// Covers everything needed to return chef's home, equipment, vehicle, and records
// to a clean baseline state. An event cannot reach terminal state without this.
// MUST fit on ONE page - no exceptions.
//
// Context: Two consecutive dinners (Feb 14–15, 2026) never reached terminal state.
// A cooler sat full on the deck for 48+ hours. Equipment bags stayed packed.
// Laundry wasn't started. Receipts weren't captured. The reset is the gate.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout, CONTENT_WIDTH, MARGIN_X, LETTER_WIDTH } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResetChecklistData = {
  event: {
    event_date: string
    payment_status: string
    quoted_price_cents: number
    service_style: string | null
    special_requests: string | null
  }
  clientName: string
  // Specialty equipment items derived from service_style / special_requests triggers
  specialtyEquipment: string[]
  // Payment state: whether chef has already received full payment
  paymentReceived: boolean
  paymentAmountCents: number
}

// ─── Equipment Triggers ───────────────────────────────────────────────────────

// Same logic as the packing list - only specialty items are surfaced dynamically
const SPECIALTY_EQUIPMENT_TRIGGERS: Record<string, string[]> = {
  sous_vide: ['Sous vide circulator'],
  ice_cream: ['Ice cream machine'],
  grill: ['Grill kit (tongs, brush, thermometer)'],
  cocktail: ['Cocktail kit (shaker, jigger, bar spoon)'],
  stand_mixer: ['Stand mixer'],
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchResetChecklistData(eventId: string): Promise<ResetChecklistData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      event_date, payment_status, quoted_price_cents,
      service_style, special_requests,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Cast the joined client relation - same pattern as other generators
  const clientData = event.client as unknown as { full_name: string } | null

  // Derive specialty items from service_style + special_requests keywords
  const specialtyEquipment: string[] = []
  const serviceStyle = (event.service_style ?? '').toLowerCase()
  const specialRequests = (event.special_requests ?? '').toLowerCase()

  if (specialRequests.includes('sous vide') || specialRequests.includes('sous-vide')) {
    specialtyEquipment.push(...SPECIALTY_EQUIPMENT_TRIGGERS.sous_vide)
  }
  if (specialRequests.includes('ice cream') || specialRequests.includes('ice-cream')) {
    specialtyEquipment.push(...SPECIALTY_EQUIPMENT_TRIGGERS.ice_cream)
  }
  if (specialRequests.includes('grill') || specialRequests.includes('bbq')) {
    specialtyEquipment.push(...SPECIALTY_EQUIPMENT_TRIGGERS.grill)
  }
  if (serviceStyle === 'cocktail' || specialRequests.includes('cocktail')) {
    specialtyEquipment.push(...SPECIALTY_EQUIPMENT_TRIGGERS.cocktail)
  }
  if (specialRequests.includes('stand mixer') || specialRequests.includes('mixer')) {
    specialtyEquipment.push(...SPECIALTY_EQUIPMENT_TRIGGERS.stand_mixer)
  }

  const paymentReceived = event.payment_status === 'paid'

  return {
    event: {
      event_date: event.event_date,
      payment_status: event.payment_status,
      quoted_price_cents: event.quoted_price_cents ?? 0,
      service_style: event.service_style,
      special_requests: event.special_requests,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    specialtyEquipment: [...new Set(specialtyEquipment)],
    paymentReceived,
    paymentAmountCents: paymentReceived ? (event.quoted_price_cents ?? 0) : 0,
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderResetChecklist(pdf: PDFLayout, data: ResetChecklistData) {
  const { event, clientName, specialtyEquipment, paymentReceived, paymentAmountCents } = data

  const dateStr = format(parseISO(event.event_date), 'EEE, MMMM d, yyyy')

  // ─── Dark Header Bar ────────────────────────────────────────────────────────
  // Drawn manually so we can use dark background + white text
  const headerHeight = 10
  pdf.doc.setFillColor(26, 26, 26)
  pdf.doc.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, headerHeight, 'F')

  // Left: Document title
  pdf.doc.setFontSize(12)
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setTextColor(255, 255, 255)
  pdf.doc.text('POST-SERVICE RESET', MARGIN_X + 3, pdf.y + 6.5)

  // Right: event date (top) + client name (bottom)
  pdf.doc.setFontSize(8)
  pdf.doc.setFont('helvetica', 'normal')
  pdf.doc.text(dateStr, LETTER_WIDTH - MARGIN_X - 3, pdf.y + 4, { align: 'right' })
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.text(clientName, LETTER_WIDTH - MARGIN_X - 3, pdf.y + 8, { align: 'right' })

  // Reset text color
  pdf.doc.setTextColor(0, 0, 0)
  pdf.y += headerHeight + 2

  // ─── Urgency Notice ─────────────────────────────────────────────────────────
  pdf.doc.setFontSize(8.5)
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setTextColor(204, 0, 0)
  pdf.doc.text(
    'Complete tonight or by noon tomorrow. Event cannot close until every box is checked.',
    MARGIN_X,
    pdf.y
  )
  pdf.doc.setTextColor(0, 0, 0)
  pdf.y += 5

  // ─── Helper: gray section header bar ────────────────────────────────────────
  function sectionBar(title: string) {
    const barH = 5
    pdf.doc.setFillColor(240, 240, 240)
    pdf.doc.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, barH, 'F')
    pdf.doc.setFontSize(8.5)
    pdf.doc.setFont('helvetica', 'bold')
    pdf.doc.text(title, MARGIN_X + 2, pdf.y + 3.5)
    pdf.y += barH + 1
  }

  function item(text: string, preChecked = false) {
    const s = 8
    pdf.doc.setFontSize(s)
    const boxSize = 3.2
    const lh = 4.5

    // Draw checkbox
    pdf.doc.setDrawColor(40, 40, 40)
    pdf.doc.setLineWidth(0.3)
    pdf.doc.rect(MARGIN_X + 2, pdf.y - boxSize + 0.5, boxSize, boxSize)

    // Pre-check mark (for payment received) - positioned at box center Y
    if (preChecked) {
      pdf.doc.setFont('helvetica', 'bold')
      pdf.doc.setTextColor(0, 130, 0)
      pdf.doc.text('\u2713', MARGIN_X + 2.3, pdf.y - 0.5)
      pdf.doc.setTextColor(0, 0, 0)
    }

    pdf.doc.setFont('helvetica', 'normal')
    const maxW = CONTENT_WIDTH - 8
    const lines = pdf.doc.splitTextToSize(text, maxW) as string[]
    for (let i = 0; i < lines.length; i++) {
      pdf.doc.text(lines[i], MARGIN_X + 2 + boxSize + 2, pdf.y)
      if (i < lines.length - 1) pdf.y += lh
    }
    pdf.y += lh
  }

  // ─── SECTION A: Bring Everything Inside ─────────────────────────────────────
  sectionBar('A - BRING EVERYTHING INSIDE')
  item('All equipment bags brought inside from car')
  item('Cooler brought inside from car')
  for (const eq of specialtyEquipment) {
    item(`${eq} brought inside`)
  }
  item('Any extra bags / dry goods brought inside')
  item('Car completely cleared - nothing left in vehicle')
  pdf.space(1)

  // ─── SECTION B: Cooler + Cold Storage ───────────────────────────────────────
  sectionBar('B - COOLER + COLD STORAGE')
  item('Cooler emptied completely')
  item('Cooler wiped down and dried')
  item('Cooler lid left open to air out')
  item('Leftover food sorted: keep vs toss')
  item('Kept leftovers stored in fridge with labels (item + date)')
  item('Fridge has space - cleared out old items if needed')
  pdf.space(1)

  // ─── SECTION C: Equipment + Tools ───────────────────────────────────────────
  sectionBar('C - EQUIPMENT + TOOLS')
  item('Equipment bags emptied')
  item('Dirty tools separated for washing')
  item('Clean tools put back in storage')
  item('Equipment bags collapsed / stored')
  if (specialtyEquipment.length > 0) {
    item(`Specialty items returned to place (${specialtyEquipment.join(', ')})`)
  } else {
    item('Specialty items returned to place (ice cream machine, sous vide, etc.)')
  }
  pdf.space(1)

  // ─── SECTION D: Dishes + Laundry ────────────────────────────────────────────
  sectionBar('D - DISHES + LAUNDRY')
  item('All dishes in dishwasher or hand washed')
  item('Deli containers washed and dried')
  item('Towels in washing machine')
  item('Chef uniform in washing machine')
  item('Apron in washing machine')
  item('Wash cycle started')
  pdf.space(1)

  // ─── SECTION E: Financial + Records ─────────────────────────────────────────
  sectionBar('E - FINANCIAL + RECORDS')
  if (paymentReceived) {
    item(`Payment received - ${formatCurrency(paymentAmountCents)}`, true)
  } else {
    item('Payment collected or Venmo / payment request sent')
  }
  item('All receipts photographed and uploaded')
  item('Tip recorded (if applicable)')
  pdf.space(1)

  // ─── SECTION F: Next Day (by noon) ──────────────────────────────────────────
  // Slightly different visual: label the deadline in the header
  const nextDayBarH = 5
  pdf.doc.setFillColor(240, 240, 240)
  pdf.doc.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, nextDayBarH, 'F')
  pdf.doc.setFontSize(8.5)
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.text('F - NEXT DAY', MARGIN_X + 2, pdf.y + 3.5)
  pdf.doc.setFont('helvetica', 'italic')
  pdf.doc.setFontSize(7.5)
  pdf.doc.text(
    '(complete by noon tomorrow)',
    MARGIN_X + 2 + pdf.doc.getTextWidth('F - NEXT DAY') + 3,
    pdf.y + 3.5
  )
  pdf.y += nextDayBarH + 1

  item('Laundry moved to dryer or hung')
  item('Follow-up / thank you message sent to client')
  item('Event Review completed')
  item('Unused ingredients flagged (kept / tossed / returned)')
  pdf.space(1.5)

  // ─── Compounding Warning Box ─────────────────────────────────────────────────
  pdf.doc.setFontSize(8)
  const warnTitle = 'COMPOUNDING WARNING'
  const warnBody =
    'If you have another dinner within 48 hours, incomplete resets stack. ' +
    'Dirty coolers mean no clean coolers. Full fridge means nowhere to put leftovers. ' +
    'Do the reset tonight. Future you will thank you.'
  const warnLines = pdf.doc.splitTextToSize(warnBody, CONTENT_WIDTH - 8) as string[]
  const warnLineH = 3.8
  const warnBoxH = warnLineH * (warnLines.length + 1) + 4

  // Orange box
  pdf.doc.setFillColor(255, 248, 240)
  pdf.doc.setDrawColor(204, 102, 0)
  pdf.doc.setLineWidth(0.8)
  pdf.doc.roundedRect(MARGIN_X, pdf.y, CONTENT_WIDTH, warnBoxH, 1.5, 1.5, 'FD')

  // Title
  pdf.doc.setFontSize(8.5)
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setTextColor(204, 102, 0)
  pdf.doc.text(warnTitle, MARGIN_X + 3, pdf.y + 4)
  pdf.y += warnLineH + 2

  // Body
  pdf.doc.setFontSize(8)
  pdf.doc.setFont('helvetica', 'normal')
  pdf.doc.setTextColor(80, 80, 80)
  for (const line of warnLines) {
    pdf.doc.text(line, MARGIN_X + 3, pdf.y + 1)
    pdf.y += warnLineH
  }
  pdf.doc.setTextColor(0, 0, 0)
  pdf.y += 3

  // ─── Footer ──────────────────────────────────────────────────────────────────
  pdf.footer(`ChefFlow Post-Service Reset - ${clientName} - ${dateStr}`)
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateResetChecklist(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchResetChecklistData(eventId)
  if (!data) throw new Error('Cannot generate reset checklist: event not found')

  const pdf = new PDFLayout()
  renderResetChecklist(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Reset Checklist')
  return pdf.toBuffer()
}

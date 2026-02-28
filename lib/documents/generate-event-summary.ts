// Event Summary Generator — DOC-EVENT-SUMMARY
// The index document: single-glance reorientation for any dinner at any lifecycle stage.
// Answers: who, where, what they're eating, dietary situation, payment status, what's next.
// Always generatable — adapts to available data at every stage from draft to terminal.
// MUST fit on ONE page — no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout, MARGIN_X, CONTENT_WIDTH, LETTER_WIDTH } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import type { jsPDF } from 'jspdf'

// ─── Column Geometry ────────────────────────────────────────────────────────
const COL_GAP = 9 // mm between columns
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP) / 2 // ~91.5mm each
const LEFT_X = MARGIN_X
const RIGHT_X = MARGIN_X + COL_WIDTH + COL_GAP

// ─── Status Label Map ────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Quote Sent',
  accepted: 'Client Accepted',
  paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  in_progress: 'Service In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// ─── Transition History Labels ───────────────────────────────────────────────
function transitionLabel(from: string | null, to: string): string {
  if (!from) return 'Event created'
  const key = `${from}→${to}`
  const map: Record<string, string> = {
    'draft→proposed': 'Quote sent to client',
    'draft→cancelled': 'Event cancelled (draft)',
    'proposed→accepted': 'Client accepted quote',
    'proposed→cancelled': 'Event cancelled (declined)',
    'accepted→paid': 'Deposit payment confirmed',
    'accepted→cancelled': 'Event cancelled',
    'paid→confirmed': 'Event confirmed',
    'paid→cancelled': 'Event cancelled after deposit',
    'confirmed→in_progress': 'Service started',
    'confirmed→cancelled': 'Event cancelled (confirmed)',
    'in_progress→completed': 'Service completed',
    'in_progress→cancelled': 'Event cancelled during service',
  }
  return map[key] ?? `${from} → ${to}`
}

// ─── Data Types ───────────────────────────────────────────────────────────────
export type EventSummaryData = {
  event: {
    id: string
    event_date: string
    serve_time: string | null
    arrival_time: string | null
    guest_count: number
    status: string
    occasion: string | null
    allergies: string[]
    dietary_restrictions: string[]
    special_requests: string | null
    location_address: string | null
    location_city: string | null
    location_state: string | null
    location_zip: string | null
    access_instructions: string | null
    kitchen_notes: string | null
    quoted_price_cents: number | null
    pricing_model: string | null
    payment_status: string | null
    payment_method_primary: string | null
    tip_amount_cents: number
    created_at: string
  }
  client: {
    full_name: string
    preferred_name: string | null
    partner_name: string | null
    allergies: string[] | null
    dietary_restrictions: string[] | null
    house_rules: string | null
    vibe_notes: string | null
    family_notes: string | null
    what_they_care_about: string | null
    payment_behavior: string | null
    tipping_pattern: string | null
  }
  guests: Array<{
    full_name: string
    allergies: string[] | null
    dietary_restrictions: string[] | null
    notes: string | null
  }>
  ledger: Array<{
    entry_type: string
    amount_cents: number
    description: string
    received_at: string | null
    payment_method: string | null
  }>
  transitions: Array<{
    from_status: string | null
    to_status: string
    transitioned_at: string
    reason: string | null
  }>
  courses: Array<{
    courseNumber: number
    courseName: string
    dishDescription: string | null
    dishAllergenFlags: string[]
    componentCount: number
    components: Array<{
      name: string
      category: string
      execution_notes: string | null
    }>
  }>
  totalComponentCount: number
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────
export async function fetchEventSummaryData(eventId: string): Promise<EventSummaryData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Core event + client
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, event_date, serve_time, arrival_time, guest_count, status, occasion,
      allergies, dietary_restrictions, special_requests,
      location_address, location_city, location_state, location_zip,
      access_instructions, kitchen_notes,
      quoted_price_cents, pricing_model, payment_status, payment_method_primary,
      tip_amount_cents, created_at,
      client:clients(
        full_name, preferred_name, partner_name,
        allergies, dietary_restrictions,
        house_rules, vibe_notes, family_notes, what_they_care_about,
        payment_behavior, tipping_pattern
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Parallel: guests, ledger, transitions
  const [guestsResult, ledgerResult, transitionsResult] = await Promise.all([
    supabase
      .from('event_guests')
      .select('full_name, allergies, dietary_restrictions, notes')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!),

    supabase
      .from('ledger_entries')
      .select('entry_type, amount_cents, description, received_at, payment_method')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: true }),

    supabase
      .from('event_state_transitions')
      .select('from_status, to_status, transitioned_at, reason')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .order('transitioned_at', { ascending: true }),
  ])

  // Menu → dishes → components (optional — gracefully absent)
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  let courses: EventSummaryData['courses'] = []
  let totalComponentCount = 0

  if (menus && menus.length > 0) {
    const menuId = menus[0].id

    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, course_name, course_number, description, allergen_flags, sort_order')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d) => d.id)
      const { data: components } = await supabase
        .from('components')
        .select('dish_id, name, category, execution_notes, sort_order')
        .in('dish_id', dishIds)
        .eq('tenant_id', user.tenantId!)
        .order('sort_order', { ascending: true })

      const compsByDish = new Map<string, typeof components>()
      for (const comp of components || []) {
        const arr = compsByDish.get(comp.dish_id) || []
        arr.push(comp)
        compsByDish.set(comp.dish_id, arr)
      }

      const courseMap = new Map<
        number,
        {
          courseName: string
          dishDescription: string | null
          dishAllergenFlags: string[]
          components: NonNullable<typeof components>
        }
      >()

      for (const dish of dishes) {
        const existing = courseMap.get(dish.course_number)
        const dishComps = compsByDish.get(dish.id) || []
        if (existing) {
          existing.components.push(...dishComps)
          for (const flag of dish.allergen_flags ?? []) {
            if (!existing.dishAllergenFlags.includes(flag)) {
              existing.dishAllergenFlags.push(flag)
            }
          }
        } else {
          courseMap.set(dish.course_number, {
            courseName: dish.course_name,
            dishDescription: dish.description,
            dishAllergenFlags: dish.allergen_flags ?? [],
            components: [...dishComps],
          })
        }
      }

      courses = Array.from(courseMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([courseNumber, data]) => {
          totalComponentCount += data.components.length
          return {
            courseNumber,
            courseName: data.courseName,
            dishDescription: data.dishDescription,
            dishAllergenFlags: data.dishAllergenFlags,
            componentCount: data.components.length,
            components: data.components.map((c) => ({
              name: c.name,
              category: c.category,
              execution_notes: c.execution_notes,
            })),
          }
        })
    }
  }

  const clientData = event.client as unknown as EventSummaryData['client'] | null

  return {
    event: {
      id: event.id,
      event_date: event.event_date,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      guest_count: event.guest_count,
      status: event.status,
      occasion: event.occasion,
      allergies: event.allergies ?? [],
      dietary_restrictions: event.dietary_restrictions ?? [],
      special_requests: event.special_requests,
      location_address: event.location_address ?? null,
      location_city: event.location_city ?? null,
      location_state: event.location_state ?? null,
      location_zip: event.location_zip ?? null,
      access_instructions: event.access_instructions ?? null,
      kitchen_notes: event.kitchen_notes ?? null,
      quoted_price_cents: event.quoted_price_cents ?? null,
      pricing_model: event.pricing_model ?? null,
      payment_status: event.payment_status ?? null,
      payment_method_primary: event.payment_method_primary ?? null,
      tip_amount_cents: event.tip_amount_cents ?? 0,
      created_at: event.created_at,
    },
    client: {
      full_name: clientData?.full_name ?? 'Unknown',
      preferred_name: clientData?.preferred_name ?? null,
      partner_name: clientData?.partner_name ?? null,
      allergies: clientData?.allergies ?? null,
      dietary_restrictions: clientData?.dietary_restrictions ?? null,
      house_rules: clientData?.house_rules ?? null,
      vibe_notes: clientData?.vibe_notes ?? null,
      family_notes: clientData?.family_notes ?? null,
      what_they_care_about: clientData?.what_they_care_about ?? null,
      payment_behavior: clientData?.payment_behavior ?? null,
      tipping_pattern: clientData?.tipping_pattern ?? null,
    },
    guests: (guestsResult.data || []).map((g) => ({
      full_name: g.full_name,
      allergies: g.allergies ?? null,
      dietary_restrictions: g.dietary_restrictions ?? null,
      notes: g.notes ?? null,
    })),
    ledger: (ledgerResult.data || []).map((l) => ({
      entry_type: l.entry_type,
      amount_cents: l.amount_cents,
      description: l.description,
      received_at: l.received_at ?? null,
      payment_method: l.payment_method ?? null,
    })),
    transitions: (transitionsResult.data || []).map((t) => ({
      from_status: t.from_status ?? null,
      to_status: t.to_status,
      transitioned_at: t.transitioned_at,
      reason: t.reason ?? null,
    })),
    courses,
    totalComponentCount,
  }
}

// ─── Column Rendering Helpers ─────────────────────────────────────────────────
// These helpers use jsPDF directly (via pdf.doc) for explicit X-positioned column rendering.
// Each returns the new Y position after rendering.

function colSectionHeader(
  doc: jsPDF,
  x: number,
  w: number,
  y: number,
  label: string,
  fontSize = 8
): number {
  const lh = fontSize * 0.38
  const boxH = lh + 2.5
  doc.setFillColor(240, 240, 240)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.rect(x, y, w, boxH, 'FD')
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text(label, x + 2, y + lh + 0.5)
  doc.setTextColor(0, 0, 0)
  return y + boxH + 1.5
}

function colKeyValue(
  doc: jsPDF,
  x: number,
  w: number,
  y: number,
  label: string,
  value: string,
  fontSize = 8
): number {
  const lh = fontSize * 0.38
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')
  doc.text(label + ':', x, y)
  const labelW = doc.getTextWidth(label + ': ')
  doc.setFont('helvetica', 'normal')
  // Wrap value if too long
  const maxW = w - labelW - 1
  const lines = doc.splitTextToSize(value, maxW) as string[]
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      doc.text(lines[i], x + labelW, y)
    } else {
      y += lh
      doc.text(lines[i], x + labelW, y)
    }
  }
  return y + lh + 0.3
}

function colText(
  doc: jsPDF,
  x: number,
  w: number,
  y: number,
  text: string,
  fontSize = 7.5,
  style: 'normal' | 'bold' | 'italic' = 'normal',
  color?: [number, number, number]
): number {
  const lh = fontSize * 0.38
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', style)
  if (color) doc.setTextColor(color[0], color[1], color[2])
  const lines = doc.splitTextToSize(text, w) as string[]
  for (const line of lines) {
    doc.text(line, x, y)
    y += lh
  }
  if (color) doc.setTextColor(0, 0, 0)
  return y + 0.3
}

function colHistoryEntry(doc: jsPDF, x: number, w: number, y: number, text: string): number {
  const fontSize = 7
  const lh = fontSize * 0.38
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  const lines = doc.splitTextToSize(text, w) as string[]
  for (const line of lines) {
    doc.text(line, x, y)
    y += lh
  }
  doc.setTextColor(0, 0, 0)
  return y + 0.2
}

// ─── Financial Summary Builder ────────────────────────────────────────────────
function buildFinancialSummary(data: EventSummaryData): string {
  const { event, ledger } = data

  // Determine status label
  const statusMap: Record<string, string> = {
    unpaid: 'PENDING — not yet paid',
    deposit_paid: 'Deposit received — balance outstanding',
    partial: 'Partially paid',
    paid: 'PAID IN FULL',
    refunded: 'REFUNDED',
  }
  const statusLabel = event.payment_status
    ? (statusMap[event.payment_status] ?? event.payment_status)
    : 'Not yet invoiced'

  // If we have ledger entries, show the most recent payment detail
  if (ledger.length > 0) {
    const lastPayment = [...ledger]
      .reverse()
      .find((l) => l.amount_cents > 0 && !l.entry_type.includes('refund'))
    if (lastPayment && lastPayment.received_at) {
      const dateStr = format(new Date(lastPayment.received_at), 'MMM d')
      const amount = `$${(lastPayment.amount_cents / 100).toFixed(0)}`

      if (event.payment_status === 'paid') {
        const tipNote =
          event.tip_amount_cents > 0 ? ` (+$${(event.tip_amount_cents / 100).toFixed(0)} tip)` : ''
        return `PAID — ${amount} received ${dateStr}${tipNote}`
      }
      if (event.payment_status === 'deposit_paid') {
        return `Deposit ${amount} — ${dateStr}. Balance due.`
      }
    }
  }

  return statusLabel
}

// ─── History Entries Builder ──────────────────────────────────────────────────
function buildHistoryEntries(data: EventSummaryData): string[] {
  const entries: { timestamp: Date; label: string }[] = []

  // Event created
  entries.push({ timestamp: new Date(data.event.created_at), label: 'Event created' })

  // State transitions
  for (const t of data.transitions) {
    entries.push({
      timestamp: new Date(t.transitioned_at),
      label: transitionLabel(t.from_status, t.to_status),
    })
  }

  // Sort chronological, take most recent 10
  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  const recent = entries.slice(-10)

  return recent.map((e) => {
    const dateStr = format(e.timestamp, 'MMM d h:mm a')
    return `${dateStr} — ${e.label}`
  })
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
export function renderEventSummary(pdf: PDFLayout, data: EventSummaryData) {
  const { event, client, guests, courses, totalComponentCount } = data
  const doc = pdf.doc

  // Font scale — denser menus need smaller text throughout
  if (totalComponentCount > 25) pdf.setFontScale(0.78)
  else if (totalComponentCount > 15) pdf.setFontScale(0.88)

  // ===== 1. HEADER BAR =====
  const headerH = 9
  doc.setFillColor(26, 26, 26)
  doc.setDrawColor(26, 26, 26)
  doc.roundedRect(MARGIN_X, pdf.y, CONTENT_WIDTH, headerH, 1, 1, 'F')

  // Left: "EVENT SUMMARY"
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('EVENT SUMMARY', MARGIN_X + 3, pdf.y + 6)

  // Right: date + lifecycle stage (stacked)
  const dateStr = format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')
  const stageLabel = STATUS_LABELS[event.status] ?? event.status

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(dateStr, LETTER_WIDTH - MARGIN_X - 2, pdf.y + 3.5, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(stageLabel.toUpperCase(), LETTER_WIDTH - MARGIN_X - 2, pdf.y + 7, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  pdf.y += headerH + 2.5

  // ===== 2. ALLERGY / DIETARY ALERT BAR =====
  // Merge all allergy sources: event, client, each guest
  const allAllergies = new Set<string>()
  for (const a of event.allergies) allAllergies.add(a.trim())
  for (const a of client.allergies ?? []) allAllergies.add(a.trim())
  for (const g of guests) {
    for (const a of g.allergies ?? []) allAllergies.add(a.trim())
  }

  const allDietary = new Set<string>()
  for (const d of event.dietary_restrictions) allDietary.add(d.trim())
  for (const d of client.dietary_restrictions ?? []) allDietary.add(d.trim())
  for (const g of guests) {
    for (const d of g.dietary_restrictions ?? []) allDietary.add(d.trim())
  }

  const hasAlerts = allAllergies.size > 0 || allDietary.size > 0

  if (hasAlerts) {
    const allergyLine =
      allAllergies.size > 0
        ? `ALLERGIES: ${Array.from(allAllergies)
            .map((a) => a.toUpperCase())
            .join(', ')}`
        : null
    const dietaryLine = allDietary.size > 0 ? `DIETARY: ${Array.from(allDietary).join(', ')}` : null

    const alertText = [allergyLine, dietaryLine].filter(Boolean).join('  |  ')
    const fullText = `!! ALLERGY / DIETARY !!  ${alertText}`

    const fs = 9
    const lh = fs * 0.38
    const lines = doc.splitTextToSize(fullText, CONTENT_WIDTH - 8) as string[]
    const boxH = lines.length * lh + 5

    doc.setFillColor(255, 240, 240)
    doc.setDrawColor(200, 0, 0)
    doc.setLineWidth(0.8)
    doc.rect(MARGIN_X, pdf.y, CONTENT_WIDTH, boxH, 'FD')

    doc.setFontSize(fs)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 0, 0)
    let alertY = pdf.y + lh + 1
    for (const line of lines) {
      doc.text(line, MARGIN_X + 3, alertY)
      alertY += lh
    }
    doc.setTextColor(0, 0, 0)
    pdf.y += boxH + 2.5
  }

  // ===== 3. TWO-COLUMN INFO SECTION =====
  let leftY = pdf.y
  let rightY = pdf.y

  // ── LEFT COLUMN ──

  // Section: CLIENT
  leftY = colSectionHeader(doc, LEFT_X, COL_WIDTH, leftY, 'CLIENT')

  leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Client', client.full_name)

  if (client.preferred_name) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Goes by', client.preferred_name)
  }

  // Guest count
  const guestLabel =
    guests.length > 0
      ? `${event.guest_count} (${guests.map((g) => g.full_name).join(', ')})`
      : `${event.guest_count}`
  leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Guests', guestLabel)

  // Relationship notes: combine vibe_notes + family_notes + what_they_care_about
  const relNotesParts = [
    client.vibe_notes,
    client.family_notes,
    client.what_they_care_about,
  ].filter(Boolean)
  if (relNotesParts.length > 0) {
    const combined = relNotesParts.join(' | ')
    // Truncate to ~3 lines worth of text
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Notes', combined)
  }

  leftY += 2

  // Section: LOCATION
  leftY = colSectionHeader(doc, LEFT_X, COL_WIDTH, leftY, 'LOCATION')

  const addressParts = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ].filter(Boolean)
  if (addressParts.length > 0) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Address', addressParts.join(', '))
  }

  if (event.access_instructions) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Access', event.access_instructions)
  }

  if (event.kitchen_notes) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Kitchen', event.kitchen_notes)
  }

  if (client.house_rules) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Rules', client.house_rules)
  }

  leftY += 2

  // Section: TIMING
  leftY = colSectionHeader(doc, LEFT_X, COL_WIDTH, leftY, 'TIMING')

  if (event.arrival_time) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Arrive', event.arrival_time)
  }
  if (event.serve_time) {
    leftY = colKeyValue(doc, LEFT_X, COL_WIDTH, leftY, 'Serve', event.serve_time)
  }
  if (!event.arrival_time && !event.serve_time) {
    leftY = colText(doc, LEFT_X, COL_WIDTH, leftY, 'Timing not yet confirmed', 7.5, 'italic')
  }

  // ── RIGHT COLUMN ──

  // Section: FINANCIAL
  rightY = colSectionHeader(doc, RIGHT_X, COL_WIDTH, rightY, 'FINANCIAL')

  // Rate
  if (event.quoted_price_cents) {
    const rateLabel =
      event.pricing_model === 'per_person'
        ? `$${(event.quoted_price_cents / 100).toFixed(0)}/person`
        : `$${(event.quoted_price_cents / 100).toFixed(0)} flat rate`
    rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Total', rateLabel)
  } else {
    rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Total', 'Not yet quoted')
  }

  // Payment status
  const financialSummary = buildFinancialSummary(data)
  rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Payment', financialSummary)

  if (event.payment_method_primary) {
    rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Method', event.payment_method_primary)
  }

  rightY += 2

  // Section: STATUS
  rightY = colSectionHeader(doc, RIGHT_X, COL_WIDTH, rightY, 'STATUS')

  const statusStageLabel = STATUS_LABELS[event.status] ?? event.status
  rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Stage', statusStageLabel)

  if (event.occasion) {
    rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Occasion', event.occasion)
  }

  if (event.special_requests) {
    rightY = colKeyValue(doc, RIGHT_X, COL_WIDTH, rightY, 'Special', event.special_requests)
  }

  rightY += 2

  // Section: HISTORY
  rightY = colSectionHeader(doc, RIGHT_X, COL_WIDTH, rightY, 'HISTORY')

  const historyEntries = buildHistoryEntries(data)
  for (const entry of historyEntries) {
    rightY = colHistoryEntry(doc, RIGHT_X, COL_WIDTH, rightY, entry)
  }

  // Advance main Y to the taller of the two columns
  pdf.y = Math.max(leftY, rightY) + 3

  // ===== 4. DIVIDER =====
  pdf.hr()

  // ===== 5. MENU SECTION =====
  if (courses.length === 0) {
    pdf.sectionHeader('MENU', 11, false)
    pdf.text('Menu not yet confirmed for this event.', 8, 'italic')
  } else {
    pdf.sectionHeader('MENU', 10, false)

    // ── Front of House ──
    for (const course of courses) {
      pdf.courseHeader(`Course ${course.courseNumber}: ${course.courseName}`)
      if (course.dishDescription) {
        pdf.text(course.dishDescription, 8, 'italic', 6)
      } else if (course.components.length > 0) {
        const compList = course.components.map((c) => c.name).join(', ')
        pdf.text(compList, 8, 'italic', 6)
      }
    }

    pdf.space(1.5)

    // Dashed line separator
    doc.setDrawColor(160, 160, 160)
    doc.setLineWidth(0.3)
    const dashLen = 2
    const gapLen = 1.5
    let dashX = MARGIN_X
    while (dashX < MARGIN_X + CONTENT_WIDTH) {
      doc.line(dashX, pdf.y, Math.min(dashX + dashLen, MARGIN_X + CONTENT_WIDTH), pdf.y)
      dashX += dashLen + gapLen
    }
    pdf.y += 2

    // ── Component Breakdown ──
    pdf.text('COMPONENT BREAKDOWN', 8, 'bold')
    pdf.space(0.5)

    // Merge allergies for conflict detection
    const mergedAllergies = new Set<string>()
    for (const a of event.allergies) mergedAllergies.add(a.toLowerCase())
    for (const a of client.allergies ?? []) mergedAllergies.add(a.toLowerCase())
    for (const g of guests) {
      for (const a of g.allergies ?? []) mergedAllergies.add(a.toLowerCase())
    }

    for (const course of courses) {
      const conflictingAllergens = course.dishAllergenFlags
        .filter((flag) => mergedAllergies.has(flag.toLowerCase()))
        .map((a) => a.toUpperCase())

      const courseHeaderText =
        conflictingAllergens.length > 0
          ? `COURSE ${course.courseNumber} — ${course.courseName} (${course.componentCount}) \u26a0 ${conflictingAllergens.join(', ')}`
          : `COURSE ${course.courseNumber} — ${course.courseName} (${course.componentCount} components)`

      if (!pdf.wouldOverflow(3)) {
        pdf.courseHeader(courseHeaderText)
      }

      course.components.forEach((comp, idx) => {
        const parts: string[] = [`${idx + 1}. ${comp.name}`]
        if (comp.execution_notes) parts.push(`(${comp.execution_notes})`)
        if (!pdf.wouldOverflow(2.5)) {
          pdf.text(parts.join(' '), 7.5, 'normal', 6)
        }
      })
    }

    // Total component count
    pdf.space(0.5)
    if (!pdf.wouldOverflow(3)) {
      pdf.hr()
      pdf.text(`TOTAL: ${totalComponentCount} COMPONENTS TO PACK + VERIFY`, 8, 'bold')
    }
  }

  // ===== 6. FOOTER =====
  const footerClientName = client.preferred_name ?? client.full_name
  const footerDate = format(parseISO(event.event_date), 'MMMM d, yyyy')
  pdf.footer(`ChefFlow Event Summary — ${footerClientName} — ${footerDate}`)
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
export async function generateEventSummary(eventId: string): Promise<Buffer> {
  const data = await fetchEventSummaryData(eventId)
  if (!data) throw new Error('Cannot generate event summary: event not found')

  const pdf = new PDFLayout()
  renderEventSummary(pdf, data)
  return pdf.toBuffer()
}

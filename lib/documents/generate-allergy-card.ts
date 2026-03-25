// Emergency Allergy Card Generator
// Produces a landscape PDF designed to be printed and placed in the kitchen during service.
// Aggregates allergies and dietary restrictions from event, client, and all attending guests
// (including plus-ones and guest event profile dietary notes).
// Color coded: RED = FDA Big 9 (CRITICAL), ORANGE = other allergies, YELLOW = dietary restrictions, GRAY = dislikes/preferences
// Uses the canonical allergen constants from lib/constants/allergens.ts for classification.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { jsPDF } from 'jspdf'
import { format, parseISO } from 'date-fns'
import { FDA_BIG_9, COMMON_ALLERGENS, allergenShortName } from '@/lib/constants/allergens'

// Build lookup sets from the canonical allergen lists (case-insensitive matching)
const FDA_BIG_9_LOWER = new Set(FDA_BIG_9.map((a) => a.toLowerCase()))
const COMMON_LOWER = new Set(COMMON_ALLERGENS.map((a) => a.toLowerCase()))

// Extended anaphylaxis-risk set: FDA Big 9 plus specific sub-items chefs might enter
const ANAPHYLAXIS_EXTRAS = new Set([
  'peanut',
  'almond',
  'almonds',
  'cashew',
  'cashews',
  'walnut',
  'walnuts',
  'pecan',
  'pecans',
  'pistachio',
  'pistachios',
  'macadamia',
  'hazelnut',
  'hazelnuts',
  'brazil nut',
  'brazil nuts',
  'shrimp',
  'crab',
  'lobster',
  'crawfish',
  'crayfish',
  'salmon',
  'tuna',
  'cod',
  'halibut',
  'clams',
  'mussels',
  'oysters',
  'scallops',
  'squid',
  'octopus',
  'dairy',
  'lactose',
  'egg',
  'soy',
  'soybean',
  'sesame seeds',
  'lupine',
  'mollusk',
  'shellfish',
  'sulphites',
])

function isCriticalAllergen(item: string): boolean {
  const lower = item.toLowerCase().trim()
  return FDA_BIG_9_LOWER.has(lower) || ANAPHYLAXIS_EXTRAS.has(lower)
}

function isCautionAllergen(item: string): boolean {
  return COMMON_LOWER.has(item.toLowerCase().trim())
}

// ---- Types ----

type AllergyCardData = {
  eventName: string
  eventDate: string
  clientName: string
  guestCount: number
  criticalAllergies: string[] // FDA Big 9 + anaphylaxis-risk items
  cautionAllergies: string[] // common allergens (not Big 9)
  dietaryRestrictions: string[] // dietary restrictions (vegan, kosher, etc.)
  dislikes: string[] // client dislikes/preferences
  freeTextNotes: string[] // kitchen notes, guest dietary notes
  guestBreakdown: Array<{
    name: string
    allergies: string[]
    dietaryRestrictions: string[]
  }>
}

// ---- Data fetching ----

async function fetchAllergyCardData(eventId: string): Promise<AllergyCardData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client data
  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, guest_count,
      allergies, dietary_restrictions, kitchen_notes,
      client:clients(full_name, allergies, dietary_restrictions, dislikes)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Fetch attending/maybe/pending guests (including plus-one data)
  const { data: guests } = await db
    .from('event_guests')
    .select(
      `
      full_name, allergies, dietary_restrictions, rsvp_status, notes,
      plus_one_allergies, plus_one_dietary, plus_one_name
    `
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .in('rsvp_status', ['attending', 'maybe', 'pending'])

  // Fetch guest event profile dietary notes
  const { data: guestProfiles } = (await (db as any)
    .from('guest_event_profiles')
    .select('dietary_notes')
    .eq('event_id', eventId)) as { data: Array<{ dietary_notes: string | null }> | null }

  const clientData = event.client as unknown as {
    full_name: string
    allergies: string[] | null
    dietary_restrictions: string[] | null
    dislikes: string[] | null
  } | null

  const clientName = clientData?.full_name ?? 'Unknown Client'

  // Aggregate all allergies from all sources
  const allAllergies = new Set<string>()
  const allDietary = new Set<string>()
  const allDislikes = new Set<string>()
  const freeTextNotes: string[] = []

  // Event-level
  for (const a of event.allergies ?? []) allAllergies.add(a.trim())
  for (const d of event.dietary_restrictions ?? []) allDietary.add(d.trim())

  // Kitchen notes
  if (event.kitchen_notes?.trim()) {
    freeTextNotes.push(`Kitchen: ${event.kitchen_notes.trim()}`)
  }

  // Client-level
  for (const a of clientData?.allergies ?? []) allAllergies.add(a.trim())
  for (const d of clientData?.dietary_restrictions ?? []) allDietary.add(d.trim())
  for (const d of clientData?.dislikes ?? []) allDislikes.add(d.trim())

  // Guest-level
  const guestList = guests ?? []
  for (const g of guestList) {
    for (const a of g.allergies ?? []) allAllergies.add(a.trim())
    for (const d of g.dietary_restrictions ?? []) allDietary.add(d.trim())

    // Plus-one data
    if ((g.plus_one_allergies?.length ?? 0) > 0 || (g.plus_one_dietary?.length ?? 0) > 0) {
      for (const a of g.plus_one_allergies ?? []) allAllergies.add(a.trim())
      for (const d of g.plus_one_dietary ?? []) allDietary.add(d.trim())
    }

    // Guest freetext notes
    if (g.notes?.trim()) {
      freeTextNotes.push(`${g.full_name}: ${g.notes.trim()}`)
    }
  }

  // Guest event profile dietary notes
  for (const profile of guestProfiles ?? []) {
    if (profile.dietary_notes?.trim()) {
      freeTextNotes.push(profile.dietary_notes.trim())
    }
  }

  // Split allergies into critical (Big 9 / anaphylaxis) and caution (common)
  const criticalAllergies: string[] = []
  const cautionAllergies: string[] = []
  for (const a of allAllergies) {
    if (isCriticalAllergen(a)) {
      criticalAllergies.push(a)
    } else if (isCautionAllergen(a)) {
      cautionAllergies.push(a)
    } else {
      // Unknown allergens go to caution (safe default)
      cautionAllergies.push(a)
    }
  }

  // Build per-guest breakdown (only guests that have allergies or restrictions)
  const guestBreakdown: AllergyCardData['guestBreakdown'] = []

  // Add client as first entry if they have any
  if (
    clientData &&
    ((clientData.allergies?.length ?? 0) > 0 || (clientData.dietary_restrictions?.length ?? 0) > 0)
  ) {
    guestBreakdown.push({
      name: `${clientData.full_name} (Client)`,
      allergies: (clientData.allergies ?? []).map((a) => a.trim()),
      dietaryRestrictions: (clientData.dietary_restrictions ?? []).map((d) => d.trim()),
    })
  }

  for (const g of guestList) {
    const gAllergies = (g.allergies ?? []).map((a: string) => a.trim())
    const gDietary = (g.dietary_restrictions ?? []).map((d: string) => d.trim())

    // Include plus-one data with the guest
    const poAllergies = (g.plus_one_allergies ?? []).map((a: string) => a.trim())
    const poDietary = (g.plus_one_dietary ?? []).map((d: string) => d.trim())

    if (gAllergies.length > 0 || gDietary.length > 0) {
      guestBreakdown.push({
        name: g.full_name,
        allergies: gAllergies,
        dietaryRestrictions: gDietary,
      })
    }

    // Plus-one as separate entry if they have data
    if (poAllergies.length > 0 || poDietary.length > 0) {
      const poName = g.plus_one_name ?? `${g.full_name}'s +1`
      guestBreakdown.push({
        name: poName,
        allergies: poAllergies,
        dietaryRestrictions: poDietary,
      })
    }
  }

  return {
    eventName: event.occasion ?? 'Event',
    eventDate: event.event_date,
    clientName,
    guestCount: event.guest_count,
    criticalAllergies: criticalAllergies.sort(),
    cautionAllergies: cautionAllergies.sort(),
    dietaryRestrictions: [...allDietary].sort(),
    dislikes: [...allDislikes].sort(),
    freeTextNotes,
    guestBreakdown,
  }
}

// ---- PDF Rendering (landscape, large font, color-coded) ----

function renderAllergyCard(data: AllergyCardData): Buffer {
  // Landscape US Letter
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const PAGE_W = 279.4 // landscape width
  const PAGE_H = 215.9 // landscape height
  const MARGIN = 12
  const CONTENT_W = PAGE_W - 2 * MARGIN
  let y = MARGIN

  // ---- TITLE BAR (red background) ----
  doc.setFillColor(220, 38, 38) // red-600
  doc.rect(0, 0, PAGE_W, 22, 'F')
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('ALLERGY ALERT', PAGE_W / 2, 15, { align: 'center' })
  y = 28

  // ---- Event info line ----
  const dateStr = format(parseISO(data.eventDate), 'EEEE, MMMM d, yyyy')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(
    `${data.eventName}  |  ${dateStr}  |  ${data.clientName}  |  ${data.guestCount} guests`,
    MARGIN,
    y
  )
  y += 6

  // ---- CRITICAL ALLERGIES (RED section - FDA Big 9) ----
  if (data.criticalAllergies.length > 0) {
    // Red background bar
    doc.setFillColor(254, 226, 226) // red-100
    doc.setDrawColor(220, 38, 38) // red-600
    doc.setLineWidth(0.8)

    // Pre-calculate height
    doc.setFontSize(16)
    const criticalText = data.criticalAllergies
      .map((a) => allergenShortName(a).toUpperCase())
      .join('    |    ')
    const critLines = doc.splitTextToSize(criticalText, CONTENT_W - 8) as string[]
    const sectionHeight = 14 + critLines.length * 7

    doc.rect(MARGIN, y, CONTENT_W, sectionHeight, 'FD')

    y += 6
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(185, 28, 28) // red-700
    doc.text('CRITICAL - FDA Big 9 (Anaphylaxis Risk)', MARGIN + 4, y)
    y += 7

    // List critical allergens in large bold red text
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38) // red-600
    for (const line of critLines) {
      doc.text(line, MARGIN + 4, y)
      y += 7
    }
    y += 4
  }

  // ---- CAUTION ALLERGIES (ORANGE section) ----
  if (data.cautionAllergies.length > 0) {
    doc.setFontSize(13)
    const allergyText = data.cautionAllergies.map((a) => allergenShortName(a)).join('    |    ')
    const allergyLines = doc.splitTextToSize(allergyText, CONTENT_W - 8) as string[]
    const sectionHeight = 12 + allergyLines.length * 6

    doc.setFillColor(255, 237, 213) // orange-100
    doc.setDrawColor(234, 88, 12) // orange-600
    doc.setLineWidth(0.5)
    doc.rect(MARGIN, y, CONTENT_W, sectionHeight, 'FD')

    y += 5
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(154, 52, 18) // orange-800
    doc.text('CAUTION - Other Allergens', MARGIN + 4, y)
    y += 6

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(234, 88, 12) // orange-600
    for (const line of allergyLines) {
      doc.text(line, MARGIN + 4, y)
      y += 6
    }
    y += 3
  }

  // ---- DIETARY RESTRICTIONS (YELLOW section) ----
  if (data.dietaryRestrictions.length > 0) {
    doc.setFontSize(12)
    const dietText = data.dietaryRestrictions.join('    |    ')
    const dietLines = doc.splitTextToSize(dietText, CONTENT_W - 8) as string[]
    const sectionHeight = 12 + dietLines.length * 5.5

    doc.setFillColor(254, 249, 195) // yellow-100
    doc.setDrawColor(202, 138, 4) // yellow-600
    doc.setLineWidth(0.5)
    doc.rect(MARGIN, y, CONTENT_W, sectionHeight, 'FD')

    y += 5
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(133, 77, 14) // yellow-800
    doc.text('DIETARY RESTRICTIONS', MARGIN + 4, y)
    y += 6

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(161, 98, 7) // yellow-700
    for (const line of dietLines) {
      doc.text(line, MARGIN + 4, y)
      y += 5.5
    }
    y += 3
  }

  // ---- DISLIKES / PREFERENCES (GRAY section) ----
  if (data.dislikes.length > 0) {
    doc.setFontSize(10)
    const dislikeText = data.dislikes.join('    |    ')
    const dislikeLines = doc.splitTextToSize(dislikeText, CONTENT_W - 8) as string[]
    const sectionHeight = 10 + dislikeLines.length * 4.5

    doc.setFillColor(243, 244, 246) // gray-100
    doc.setDrawColor(156, 163, 175) // gray-400
    doc.setLineWidth(0.3)
    doc.rect(MARGIN, y, CONTENT_W, sectionHeight, 'FD')

    y += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(75, 85, 99) // gray-600
    doc.text('DISLIKES / PREFERENCES', MARGIN + 4, y)
    y += 5

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // gray-500
    for (const line of dislikeLines) {
      doc.text(line, MARGIN + 4, y)
      y += 4.5
    }
    y += 3
  }

  // ---- NOTES (freetext dietary notes, kitchen notes) ----
  if (data.freeTextNotes.length > 0) {
    y += 1
    doc.setDrawColor(60, 60, 60)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 4

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('NOTES', MARGIN, y)
    y += 5

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    for (const note of data.freeTextNotes) {
      if (y > PAGE_H - 20) break // leave room for footer
      const noteLines = doc.splitTextToSize(`- ${note}`, CONTENT_W - 4) as string[]
      for (const line of noteLines) {
        if (y > PAGE_H - 20) break
        doc.text(line, MARGIN + 2, y)
        y += 4
      }
    }
    y += 2
  }

  // ---- PER-GUEST BREAKDOWN ----
  if (data.guestBreakdown.length > 0 && y < PAGE_H - 40) {
    y += 2
    doc.setDrawColor(60, 60, 60)
    doc.setLineWidth(0.4)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 4

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('PER-GUEST BREAKDOWN', MARGIN, y)
    y += 6

    // Determine column layout based on number of guests
    const colCount =
      data.guestBreakdown.length <= 3
        ? data.guestBreakdown.length
        : Math.min(4, data.guestBreakdown.length)
    const colWidth = CONTENT_W / colCount

    // Render in columns
    let col = 0
    let rowStartY = y

    for (const guest of data.guestBreakdown) {
      if (y > PAGE_H - 15) break // stop if near bottom
      const colX = MARGIN + col * colWidth
      let guestY = rowStartY

      // Guest name
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(guest.name, colX + 2, guestY)
      guestY += 4.5

      // Allergies (red or orange depending on severity)
      if (guest.allergies.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        for (const a of guest.allergies) {
          if (isCriticalAllergen(a)) {
            doc.setTextColor(220, 38, 38) // red
          } else {
            doc.setTextColor(234, 88, 12) // orange
          }
          const prefix = isCriticalAllergen(a) ? '!! ' : '! '
          doc.text(`${prefix}${allergenShortName(a)}`, colX + 4, guestY)
          guestY += 4
        }
      }

      // Dietary restrictions (dark yellow)
      if (guest.dietaryRestrictions.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(161, 98, 7) // yellow-700
        for (const d of guest.dietaryRestrictions) {
          doc.text(`- ${d}`, colX + 4, guestY)
          guestY += 4
        }
      }

      // Track max height for this row
      if (guestY > y) y = guestY

      col++
      if (col >= colCount) {
        col = 0
        rowStartY = y + 2
      }
    }

    // If we ended mid-row, advance y
    if (col > 0) y += 2
  }

  // ---- FOOTER ----
  const footerY = PAGE_H - 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150, 150, 150)
  const timestamp = format(new Date(), "MMM d, yyyy 'at' h:mm a")
  doc.text(
    `Generated by ChefFlow - ${timestamp}  |  Verify all allergies verbally before service.`,
    PAGE_W / 2,
    footerY,
    { align: 'center' }
  )

  return Buffer.from(doc.output('arraybuffer'))
}

// ---- Public API ----

export async function generateAllergyCard(eventId: string): Promise<Buffer> {
  const data = await fetchAllergyCardData(eventId)
  if (!data) throw new Error('Cannot generate allergy card: event not found')

  const hasAny =
    data.criticalAllergies.length > 0 ||
    data.cautionAllergies.length > 0 ||
    data.dietaryRestrictions.length > 0 ||
    data.dislikes.length > 0 ||
    data.freeTextNotes.length > 0

  if (!hasAny) throw new Error('No allergies or dietary restrictions found for this event')

  return renderAllergyCard(data)
}

/** Check whether an event has any allergy/dietary data worth printing */
export async function hasAllergyData(eventId: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      allergies, dietary_restrictions,
      client:clients(allergies, dietary_restrictions, dislikes)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return false

  const clientData = event.client as unknown as {
    allergies: string[] | null
    dietary_restrictions: string[] | null
    dislikes: string[] | null
  } | null

  if ((event.allergies ?? []).length > 0) return true
  if ((event.dietary_restrictions ?? []).length > 0) return true
  if ((clientData?.allergies ?? []).length > 0) return true
  if ((clientData?.dietary_restrictions ?? []).length > 0) return true
  if ((clientData?.dislikes ?? []).length > 0) return true

  // Check guests (including plus-one data)
  const { count } = await db
    .from('event_guests')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .or(
      'allergies.neq.{},dietary_restrictions.neq.{},plus_one_allergies.neq.{},plus_one_dietary.neq.{}'
    )

  return (count ?? 0) > 0
}

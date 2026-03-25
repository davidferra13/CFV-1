// Travel Route PDF Generator
// One page per leg (or multi-leg summary).
// Prints turn-by-turn route with stops, timing, and ingredient checklist for specialty runs.
// Unlike other documents this ALLOWS multiple pages - one per leg plus a cover summary.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import {
  LEG_TYPE_LABELS,
  LEG_STATUS_LABELS,
  formatLegTime,
  formatMinutes,
} from '@/lib/travel/types'
import type { TravelLegWithIngredients } from '@/lib/travel/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type TravelRouteData = {
  event: {
    id: string
    occasion: string | null
    event_date: string
    location_address: string | null
    location_city: string | null
  }
  clientName: string
  chefName: string
  legs: TravelLegWithIngredients[]
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchTravelRouteData(eventId: string): Promise<TravelRouteData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Event + client
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, location_address, location_city, clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', user.entityId!)
    .single()

  const chefName = chef?.business_name || chef?.display_name || 'Chef'

  // Travel legs (primary + any consolidated leg that includes this event)
  let legs: TravelLegWithIngredients[] = []
  try {
    const { data: legsRaw } = await db
      .from('event_travel_legs')
      .select('*')
      .or(`primary_event_id.eq.${eventId},linked_event_ids.cs.{${eventId}}`)
      .eq('tenant_id', user.tenantId!)
      .neq('status', 'cancelled')
      .order('leg_date', { ascending: true })
      .order('departure_time', { ascending: true })

    // For each leg, fetch ingredients (specialty legs only)
    for (const leg of (legsRaw ?? []) as any[]) {
      const { data: ings } = await db
        .from('travel_leg_ingredients')
        .select('*, ingredients(name)')
        .eq('leg_id', leg.id)

      legs.push({
        ...leg,
        stops: Array.isArray(leg.stops) ? leg.stops : [],
        linked_event_ids: Array.isArray(leg.linked_event_ids) ? leg.linked_event_ids : [],
        ingredients: (ings ?? []).map((i: any) => ({
          ...i,
          ingredient_name: (i.ingredients as { name: string } | null)?.name ?? i.ingredient_id,
        })),
      })
    }
  } catch {
    // Table may not exist yet - return empty legs
    legs = []
  }

  const clientData = event.clients as unknown as { full_name: string } | null
  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      location_address: event.location_address,
      location_city: event.location_city,
    },
    clientName: clientData?.full_name ?? 'Client',
    chefName,
    legs,
  }
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function legDateLine(legDate: string): string {
  return format(parseISO(legDate), 'EEEE, MMMM d, yyyy')
}

function renderLegPage(
  pdf: PDFLayout,
  leg: TravelLegWithIngredients,
  eventLabel: string,
  chefName: string
) {
  const typeLabel = LEG_TYPE_LABELS[leg.leg_type]
  const dateLabel = legDateLine(leg.leg_date)

  // ── Header ────────────────────────────────────────────────────────────────

  pdf.title(`TRAVEL ROUTE - ${typeLabel.toUpperCase()}`, 13)

  pdf.headerBar([
    ['Event', eventLabel],
    ['Date', dateLabel],
    ['Chef', chefName],
  ])

  const statusLabel = LEG_STATUS_LABELS[leg.status]
  pdf.text(`Status: ${statusLabel}`, 8, 'normal', 0)
  pdf.space(2)

  // ── Departure ─────────────────────────────────────────────────────────────

  pdf.sectionHeader('DEPARTURE', 10, true)
  if (leg.departure_time) {
    pdf.keyValue('Depart', formatLegTime(leg.departure_time))
  }
  const originParts = [leg.origin_label, leg.origin_address].filter(Boolean)
  pdf.keyValue('From', originParts.join(' - ') || 'Not specified')
  pdf.space(2)

  // ── Stops ─────────────────────────────────────────────────────────────────

  if (leg.stops.length > 0) {
    pdf.sectionHeader('STOPS', 10, true)
    const sortedStops = [...leg.stops].sort((a, b) => a.order - b.order)
    for (let i = 0; i < sortedStops.length; i++) {
      const stop = sortedStops[i]
      const label = `${i + 1}. ${stop.name}`
      pdf.text(label, 9, 'bold', 0)
      if (stop.address) pdf.text(stop.address, 8, 'normal', 4)
      if (stop.purpose) pdf.text(`Purpose: ${stop.purpose}`, 8, 'normal', 4)
      if (stop.estimated_minutes) {
        pdf.text(`Time on-site: ${formatMinutes(stop.estimated_minutes)}`, 8, 'normal', 4)
      }
      if (stop.notes) pdf.text(`Note: ${stop.notes}`, 8, 'italic', 4)
      pdf.space(1)
    }
  }

  // ── Arrival ───────────────────────────────────────────────────────────────

  pdf.sectionHeader('ARRIVAL', 10, true)
  const destParts = [leg.destination_label, leg.destination_address].filter(Boolean)
  pdf.keyValue('To', destParts.join(' - ') || 'Not specified')
  if (leg.estimated_return_time) {
    pdf.keyValue('ETA', formatLegTime(leg.estimated_return_time))
  }
  pdf.space(2)

  // ── Time Summary ──────────────────────────────────────────────────────────

  pdf.sectionHeader('TIME SUMMARY', 10, true)
  if (leg.total_drive_minutes != null) {
    pdf.text(`Drive time: ${formatMinutes(leg.total_drive_minutes)}`, 9, 'normal', 2)
  }
  if (leg.total_stop_minutes != null) {
    pdf.text(`Stop time:  ${formatMinutes(leg.total_stop_minutes)}`, 9, 'normal', 2)
  }
  if (leg.total_estimated_minutes != null) {
    pdf.text(`Total:      ${formatMinutes(leg.total_estimated_minutes)}`, 9, 'bold', 2)
  }
  pdf.space(2)

  // ── Notes ─────────────────────────────────────────────────────────────────

  if (leg.purpose_notes) {
    pdf.sectionHeader('NOTES', 10, true)
    pdf.text(leg.purpose_notes, 8, 'italic', 2)
    pdf.space(2)
  }

  // ── Ingredient Sourcing Checklist (specialty runs only) ───────────────────

  if (leg.leg_type === 'specialty_sourcing' && leg.ingredients.length > 0) {
    pdf.sectionHeader('INGREDIENTS TO SOURCE', 10, true)
    for (const ing of leg.ingredients) {
      const qty = ing.quantity != null ? `${ing.quantity} ${ing.unit ?? ''}`.trim() : ''
      const store = ing.store_name ? ` @ ${ing.store_name}` : ''
      const label = `${ing.ingredient_name ?? 'Unknown'}${qty ? ` - ${qty}` : ''}${store}`
      const isSourced = ing.status === 'sourced'
      const statusNote = isSourced
        ? 'sourced'
        : ing.status === 'unavailable'
          ? 'unavailable'
          : undefined
      pdf.checkbox(label, 8, statusNote, isSourced)
    }
    pdf.space(1)
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  const footerParts: string[] = [typeLabel, dateLabel]
  if (leg.total_estimated_minutes != null) {
    footerParts.push(`~${formatMinutes(leg.total_estimated_minutes)} total`)
  }
  pdf.footer(footerParts.join('  ·  '))
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export function renderTravelRoute(pdf: PDFLayout, data: TravelRouteData) {
  const { event, clientName, chefName, legs } = data

  const dateLabel = format(parseISO(event.event_date), 'EEE, MMM d, yyyy')
  const eventLabel = [event.occasion || 'Dinner', `for ${clientName}`].join(' ')

  if (legs.length === 0) {
    // No legs - summary placeholder
    pdf.title('TRAVEL ROUTE', 14)
    pdf.headerBar([
      ['Event', eventLabel],
      ['Date', dateLabel],
    ])
    pdf.space(3)
    pdf.text('No travel legs planned for this event.', 10, 'italic')
    pdf.text(
      'Open the Travel Plan tab on the event page to start planning your routes.',
      9,
      'normal'
    )
    return
  }

  // One page per leg (sorted by date then departure_time)
  const sortedLegs = [...legs].sort((a, b) => {
    if (a.leg_date !== b.leg_date) return a.leg_date.localeCompare(b.leg_date)
    return (a.departure_time ?? '').localeCompare(b.departure_time ?? '')
  })

  for (let i = 0; i < sortedLegs.length; i++) {
    if (i > 0) pdf.newPage()
    renderLegPage(pdf, sortedLegs[i], eventLabel, chefName)
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateTravelRoute(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchTravelRouteData(eventId)
  if (!data) throw new Error('Cannot generate travel route: event not found')

  const pdf = new PDFLayout()
  renderTravelRoute(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Travel Route')
  return pdf.toBuffer()
}

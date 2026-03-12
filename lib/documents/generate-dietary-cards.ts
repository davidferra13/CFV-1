// Guest Dietary Cards — Printable per-guest allergy/restriction reference
// Used AT EVENT for kitchen team to verify dietary needs per guest.
// One card per guest with dietary restrictions or allergies.
// Fits multiple cards per page (4 per page, 2x2 grid).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

export type GuestDietaryData = {
  guestName: string
  dietaryRestrictions: string[]
  allergies: string[]
  notes: string | null
  rsvpStatus: string
  plusOne: boolean
}

export type DietaryCardData = {
  eventTitle: string
  eventDate: string
  clientName: string
  guestCount: number
  guests: GuestDietaryData[]
  // Aggregate summary
  allDietaryRestrictions: string[]
  allAllergies: string[]
}

// ─── Data Fetch ─────────────────────────────────────────────────────────────

export async function fetchDietaryCardData(eventId: string): Promise<DietaryCardData | null> {
  await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, client:clients(full_name)')
    .eq('id', eventId)
    .single()

  if (!event) return null

  const { data: guestRows } = await supabase
    .from('event_guests')
    .select('full_name, dietary_restrictions, allergies, notes, rsvp_status, plus_one')
    .eq('event_id', eventId)
    .order('full_name')

  const guests: GuestDietaryData[] = (guestRows ?? [])
    .filter((g: any) => g.dietary_restrictions?.length > 0 || g.allergies?.length > 0)
    .map((g: any) => ({
      guestName: g.full_name ?? 'Guest',
      dietaryRestrictions: g.dietary_restrictions ?? [],
      allergies: g.allergies ?? [],
      notes: g.notes ?? null,
      rsvpStatus: g.rsvp_status ?? 'pending',
      plusOne: g.plus_one ?? false,
    }))

  // Aggregate unique restrictions and allergies
  const allDietaryRestrictions = [...new Set(guests.flatMap((g) => g.dietaryRestrictions))].sort()
  const allAllergies = [...new Set(guests.flatMap((g) => g.allergies))].sort()

  return {
    eventTitle: event.occasion ?? 'Event',
    eventDate: event.event_date,
    clientName: event.client?.full_name ?? 'Client',
    guestCount: event.guest_count ?? 0,
    guests,
    allDietaryRestrictions,
    allAllergies,
  }
}

// ─── PDF Render ─────────────────────────────────────────────────────────────

export function renderDietaryCards(pdf: PDFLayout, data: DietaryCardData) {
  const dateStr = data.eventDate ? format(parseISO(data.eventDate), 'MMM d, yyyy') : ''

  pdf.title('GUEST DIETARY REFERENCE')
  pdf.headerBar([
    ['Event', data.eventTitle],
    ['Date', dateStr],
    ['Client', data.clientName],
    ['Guests', String(data.guestCount)],
  ])
  pdf.space(2)

  // Summary section
  if (data.allAllergies.length > 0) {
    pdf.text(`ALLERGIES PRESENT: ${data.allAllergies.join(', ')}`, 9, 'bold')
    pdf.space(1)
  }
  if (data.allDietaryRestrictions.length > 0) {
    pdf.text(`DIETARY NEEDS: ${data.allDietaryRestrictions.join(', ')}`, 9, 'bold')
    pdf.space(1)
  }
  pdf.space(2)

  if (data.guests.length === 0) {
    pdf.text('No guests with dietary restrictions or allergies on file.', 10, 'italic')
    return
  }

  // Guest cards (compact list format to fit on one page)
  pdf.sectionHeader(`${data.guests.length} Guests with Dietary Needs`)

  for (const guest of data.guests) {
    if (pdf.wouldOverflow(12)) {
      pdf.newPage()
      pdf.title('GUEST DIETARY REFERENCE (continued)')
      pdf.space(2)
    }

    // Guest name with RSVP badge
    const rsvpBadge =
      guest.rsvpStatus === 'attending'
        ? ' [ATTENDING]'
        : guest.rsvpStatus === 'declined'
          ? ' [DECLINED]'
          : ''
    pdf.text(`${guest.guestName}${guest.plusOne ? ' (+1)' : ''}${rsvpBadge}`, 10, 'bold')

    // Allergies (critical, listed first)
    if (guest.allergies.length > 0) {
      pdf.text(`  ALLERGIES: ${guest.allergies.join(', ')}`, 9, 'bold', 4)
    }

    // Dietary restrictions
    if (guest.dietaryRestrictions.length > 0) {
      pdf.text(`  Dietary: ${guest.dietaryRestrictions.join(', ')}`, 9, 'normal', 4)
    }

    // Notes
    if (guest.notes) {
      pdf.text(`  Note: ${guest.notes}`, 8, 'italic', 4)
    }

    pdf.space(2)
  }

  pdf.space(4)
  pdf.generatedBy('ChefFlow', 'Dietary Reference')
}

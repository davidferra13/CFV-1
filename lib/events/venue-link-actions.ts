'use server'

// Venue Profile <-> Event linking
// Auto-link by fuzzy address match, create venue from event data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { VenueProfile } from '@/lib/venues/recon-types'

// ── Types ──────────────────────────────────────────────────────────────────

export interface VenueLinkResult {
  linked: boolean
  venueProfile: VenueProfile | null
  isNewSuggestion: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeAddress(addr: string): string {
  return addr.toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ').trim()
}

// ── 1. getLinkedVenueProfile ───────────────────────────────────────────────

export async function getLinkedVenueProfile(eventId: string): Promise<VenueLinkResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get event with venue_profile_id and address
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, venue_profile_id, location_address')
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!event) return { linked: false, venueProfile: null, isNewSuggestion: false }

  // If already linked, fetch the profile
  if (event.venue_profile_id) {
    const { data: venue } = await db
      .from('venue_profiles')
      .select('*')
      .eq('id', event.venue_profile_id)
      .eq('tenant_id', chef.tenantId!)
      .maybeSingle()

    if (venue) {
      return { linked: true, venueProfile: venue, isNewSuggestion: false }
    }
  }

  // Try fuzzy address match
  if (event.location_address) {
    const normalized = normalizeAddress(event.location_address)
    const { data: venues } = await db
      .from('venue_profiles')
      .select('*')
      .eq('tenant_id', chef.tenantId!)

    if (venues?.length) {
      const match = venues.find((v: VenueProfile) => {
        if (!v.address) return false
        const venueNorm = normalizeAddress(v.address)
        return venueNorm.includes(normalized) || normalized.includes(venueNorm)
      })

      if (match) {
        // Auto-link
        await db
          .from('events')
          .update({ venue_profile_id: match.id })
          .eq('id', eventId)
          .eq('tenant_id', chef.tenantId!)

        return { linked: true, venueProfile: match, isNewSuggestion: false }
      }
    }

    // No match found; suggest creating one
    return { linked: false, venueProfile: null, isNewSuggestion: true }
  }

  return { linked: false, venueProfile: null, isNewSuggestion: false }
}

// ── 2. linkVenueToEvent ────────────────────────────────────────────────────

export async function linkVenueToEvent(
  eventId: string,
  venueId: string
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Verify venue belongs to tenant
  const { data: venue } = await db
    .from('venue_profiles')
    .select('id')
    .eq('id', venueId)
    .eq('tenant_id', chef.tenantId!)
    .maybeSingle()

  if (!venue) return { success: false, error: 'Venue not found' }

  const { error } = await db
    .from('events')
    .update({ venue_profile_id: venueId })
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ── 3. createVenueFromEvent ────────────────────────────────────────────────

export async function createVenueFromEvent(
  eventId: string
): Promise<{ success: boolean; venueId?: string; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      'id, tenant_id, location_address, location_city, location_state, location_zip, kitchen_notes, site_notes, access_instructions'
    )
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  const venueName = event.location_address
    ? event.location_address.split(',')[0].trim()
    : 'Unnamed Venue'

  const fullAddress = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ]
    .filter(Boolean)
    .join(', ')

  const { data: venue, error: insertErr } = await db
    .from('venue_profiles')
    .insert({
      tenant_id: chef.tenantId!,
      venue_name: venueName,
      address: fullAddress || null,
      kitchen_notes: event.kitchen_notes || null,
      access_instructions: event.access_instructions || null,
      notes: event.site_notes || null,
      venue_type: 'other',
      equipment_available: [],
      photos: [],
      visit_count: 1,
      last_visited_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertErr) return { success: false, error: insertErr.message }

  // Link the new venue to the event
  await db
    .from('events')
    .update({ venue_profile_id: venue.id })
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/venues')
  return { success: true, venueId: venue.id }
}

// ── 4. unlinkVenueFromEvent ────────────────────────────────────────────────

export async function unlinkVenueFromEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({ venue_profile_id: null })
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

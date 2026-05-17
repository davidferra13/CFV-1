'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { VenueProfile } from './recon-types'

// ---------------------------------------------------------------------------
// 1. createVenueProfile
// ---------------------------------------------------------------------------
export async function createVenueProfile(
  profile: Partial<VenueProfile> & { venue_name: string }
): Promise<{ success: boolean; data?: VenueProfile; error?: string }> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const { data, error } = await db
      .from('venue_profiles')
      .insert({
        tenant_id: chef.tenantId!,
        venue_name: profile.venue_name,
        address: profile.address ?? null,
        venue_type: profile.venue_type ?? 'other',
        kitchen_notes: profile.kitchen_notes ?? null,
        equipment_available: profile.equipment_available ?? [],
        oven_type: profile.oven_type ?? null,
        oven_count: profile.oven_count ?? null,
        burner_count: profile.burner_count ?? null,
        counter_space_rating: profile.counter_space_rating ?? null,
        has_full_kitchen: profile.has_full_kitchen ?? null,
        has_refrigeration: profile.has_refrigeration ?? null,
        has_freezer: profile.has_freezer ?? null,
        has_running_water: profile.has_running_water ?? null,
        refrigeration_notes: profile.refrigeration_notes ?? null,
        parking_notes: profile.parking_notes ?? null,
        access_instructions: profile.access_instructions ?? null,
        power_outlets: profile.power_outlets ?? null,
        water_access: profile.water_access ?? null,
        photos: profile.photos ?? [],
        quirks: profile.quirks ?? null,
        notes: profile.notes ?? null,
        visit_count: profile.visit_count ?? 0,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/venues')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create venue profile' }
  }
}

// ---------------------------------------------------------------------------
// 2. getVenueProfile
// ---------------------------------------------------------------------------
export async function getVenueProfile(venueId: string): Promise<VenueProfile | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('venue_profiles')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .eq('id', venueId)
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// 3. getVenueByAddress (fuzzy match)
// ---------------------------------------------------------------------------
export async function getVenueByAddress(address: string): Promise<VenueProfile | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('venue_profiles')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .ilike('address', `%${address}%`)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// 4. updateVenueProfile
// ---------------------------------------------------------------------------
export async function updateVenueProfile(
  venueId: string,
  updates: Partial<VenueProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Strip id, tenant_id, created_at from updates
    const { id: _id, tenant_id: _tid, created_at: _ca, ...safeUpdates } = updates

    const { error } = await db
      .from('venue_profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', venueId)
      .eq('tenant_id', chef.tenantId!)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venues')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to update venue profile' }
  }
}

// ---------------------------------------------------------------------------
// 5. getVenueHistory - events held at this venue (matched by address or name)
// ---------------------------------------------------------------------------
export async function getVenueHistory(venueId: string): Promise<{
  success: boolean
  events?: Array<{
    id: string
    event_date: string
    occasion: string | null
    guest_count: number
    status: string
  }>
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Get venue first
    const { data: venue, error: venueErr } = await db
      .from('venue_profiles')
      .select('venue_name, address')
      .eq('id', venueId)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (venueErr || !venue) return { success: false, error: 'Venue not found' }

    // Match events by location_address (ilike) or by name via site_assessments
    let query = db
      .from('events')
      .select('id, event_date, occasion, guest_count, status, location_address')
      .eq('tenant_id', chef.tenantId!)
      .order('event_date', { ascending: false })

    if (venue.address) {
      query = query.ilike('location_address', `%${venue.address}%`)
    } else {
      // Fallback: no address, can't match events
      return { success: true, events: [] }
    }

    const { data, error } = await query

    if (error) return { success: false, error: error.message }
    return { success: true, events: data ?? [] }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to get venue history' }
  }
}

// ---------------------------------------------------------------------------
// 6. getVenues - list all venue profiles for the chef
// ---------------------------------------------------------------------------
export async function getVenues(limit?: number): Promise<VenueProfile[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('venue_profiles')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('updated_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// 7. recordVenueVisit - bump visit_count + update last_visited_at
// ---------------------------------------------------------------------------
export async function recordVenueVisit(
  venueId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Get current visit count
    const { data: current, error: fetchErr } = await db
      .from('venue_profiles')
      .select('visit_count, notes')
      .eq('id', venueId)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (fetchErr || !current) return { success: false, error: 'Venue not found' }

    const updatePayload: Record<string, unknown> = {
      visit_count: (current.visit_count ?? 0) + 1,
      last_visited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Append notes if provided
    if (notes) {
      const existing = current.notes ? `${current.notes}\n---\n` : ''
      updatePayload.notes = `${existing}${notes}`
    }

    const { error } = await db
      .from('venue_profiles')
      .update(updatePayload)
      .eq('id', venueId)
      .eq('tenant_id', chef.tenantId!)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venues')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to record visit' }
  }
}

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface ConsolidatedDietaryProfile {
  personal_dietary: {
    dietary_restrictions: string[]
    allergies: string[]
    dislikes: string[]
    favorites: string[]
    spice_tolerance: string | null
    cuisine_preferences: string[]
    texture_aversions: string[]
    portion_preference: string | null
    alcohol_preference: string | null
    cooking_style_preference: string | null
  }
  household_members_dietary: {
    id: string
    display_name: string
    relationship: string
    dietary_restrictions: string[]
    allergies: string[]
    notes: string | null
  }[]
  saved_guests_dietary: {
    id: string
    display_name: string
    known_dietary: string[]
    known_allergies: string[]
  }[]
  total_known_restrictions: number
}

/**
 * Aggregate all dietary data sources for the current client into one view.
 * Pulls from: hub_guest_profiles (self), hub_household_members, and
 * guest dietary data from past events.
 */
export async function getConsolidatedDietaryProfile(): Promise<ConsolidatedDietaryProfile> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Resolve client profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select(
      'id, known_dietary, known_allergies, dislikes, favorites, spice_tolerance, cuisine_preferences, texture_aversions, portion_preference, alcohol_preference, cooking_style_preference'
    )
    .eq('client_id', user.entityId)
    .maybeSingle()

  const personal_dietary = {
    dietary_restrictions: profile?.known_dietary || [],
    allergies: profile?.known_allergies || [],
    dislikes: profile?.dislikes || [],
    favorites: profile?.favorites || [],
    spice_tolerance: profile?.spice_tolerance || null,
    cuisine_preferences: profile?.cuisine_preferences || [],
    texture_aversions: profile?.texture_aversions || [],
    portion_preference: profile?.portion_preference || null,
    alcohol_preference: profile?.alcohol_preference || null,
    cooking_style_preference: profile?.cooking_style_preference || null,
  }

  // Household members
  let household_members_dietary: ConsolidatedDietaryProfile['household_members_dietary'] = []
  if (profile) {
    const { data: members } = await db
      .from('hub_household_members')
      .select('id, display_name, relationship, dietary_restrictions, allergies, notes')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true })

    household_members_dietary = (members || []).map((m: any) => ({
      id: m.id,
      display_name: m.display_name,
      relationship: m.relationship || '',
      dietary_restrictions: m.dietary_restrictions || [],
      allergies: m.allergies || [],
      notes: m.notes || null,
    }))
  }

  // Saved guest profiles from events this client hosted or was part of
  // Pull from event_guests where the client was the booker
  let saved_guests_dietary: ConsolidatedDietaryProfile['saved_guests_dietary'] = []
  try {
    const { data: events } = await db
      .from('events')
      .select('id')
      .eq('client_id', user.entityId)
      .limit(20)

    if (events && events.length > 0) {
      const eventIds = events.map((e: any) => e.id)
      const { data: guests } = await db
        .from('event_guests')
        .select('id, name, dietary_restrictions, allergies')
        .in('event_id', eventIds)
        .not('dietary_restrictions', 'is', null)
        .limit(50)

      if (guests) {
        // De-duplicate by name
        const seen = new Set<string>()
        for (const g of guests) {
          const key = (g.name || '').toLowerCase().trim()
          if (!key || seen.has(key)) continue
          seen.add(key)

          const dietary = Array.isArray(g.dietary_restrictions)
            ? g.dietary_restrictions
            : g.dietary_restrictions
              ? [g.dietary_restrictions]
              : []
          const allergies = Array.isArray(g.allergies)
            ? g.allergies
            : g.allergies
              ? [g.allergies]
              : []

          if (dietary.length > 0 || allergies.length > 0) {
            saved_guests_dietary.push({
              id: g.id,
              display_name: g.name || 'Guest',
              known_dietary: dietary,
              known_allergies: allergies,
            })
          }
        }
      }
    }
  } catch {
    // Non-critical: guest data lookup failure is tolerable
  }

  // Count total unique restrictions across all sources
  const allRestrictions = new Set<string>()
  for (const r of personal_dietary.dietary_restrictions) allRestrictions.add(r)
  for (const a of personal_dietary.allergies) allRestrictions.add(a)
  for (const m of household_members_dietary) {
    for (const r of m.dietary_restrictions) allRestrictions.add(r)
    for (const a of m.allergies) allRestrictions.add(a)
  }
  for (const g of saved_guests_dietary) {
    for (const r of g.known_dietary) allRestrictions.add(r)
    for (const a of g.known_allergies) allRestrictions.add(a)
  }

  return {
    personal_dietary,
    household_members_dietary,
    saved_guests_dietary,
    total_known_restrictions: allRestrictions.size,
  }
}

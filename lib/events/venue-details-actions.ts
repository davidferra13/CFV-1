// Venue Details - Farm/Venue Host Logistics
// Parking, access, rules, setup zones, farmer profile for co-hosted events.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export interface VenueDetails {
  id: string
  event_id: string

  // Parking
  parking_capacity: number | null
  parking_instructions: string | null
  overflow_plan: string | null

  // Access
  gate_code: string | null
  access_instructions: string | null
  directions_from_road: string | null

  // Rules
  property_rules: string[]
  no_smoking_areas: string | null
  pet_policy: string | null
  off_limits_areas: string | null

  // Weather
  rain_backup_plan: string | null
  cancel_weather_threshold: string | null

  // Infrastructure
  power_access_notes: string | null
  water_access_notes: string | null
  restroom_info: string | null
  portable_restrooms_needed: boolean

  // Setup Zones
  kitchen_zone: string | null
  dining_zone: string | null
  bar_zone: string | null
  other_zones: { name: string; description: string }[]

  // Guest Arrival
  welcome_message: string | null
  arrival_window_minutes: number
  stagger_arrivals: boolean

  // Farm Profile
  farm_name: string | null
  farm_bio: string | null
  farm_photo_url: string | null
  farm_website: string | null
  farm_social_url: string | null
  farm_logo_url: string | null

  // Farm Showcase
  farm_animals: FarmShowcaseItem[]
  farm_crops: FarmCropItem[]
}

export interface FarmShowcaseItem {
  name: string
  description?: string
  photo_url?: string
}

export interface FarmCropItem {
  name: string
  variety?: string
  description?: string
  photo_url?: string
}

/**
 * Get venue details for an event.
 * Accessible by event owner and accepted collaborators.
 */
export async function getVenueDetails(eventId: string): Promise<VenueDetails | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify access (owner or collaborator)
  const { data: event } = await db.from('events').select('tenant_id').eq('id', eventId).single()

  if (!event) return null

  const isOwner = event.tenant_id === user.entityId
  if (!isOwner) {
    const { data: collab } = await db
      .from('event_collaborators')
      .select('id')
      .eq('event_id', eventId)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .maybeSingle()
    if (!collab) return null
  }

  const { data } = await db
    .from('event_venue_details')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    event_id: data.event_id,
    parking_capacity: data.parking_capacity,
    parking_instructions: data.parking_instructions,
    overflow_plan: data.overflow_plan,
    gate_code: data.gate_code,
    access_instructions: data.access_instructions,
    directions_from_road: data.directions_from_road,
    property_rules: data.property_rules || [],
    no_smoking_areas: data.no_smoking_areas,
    pet_policy: data.pet_policy,
    off_limits_areas: data.off_limits_areas,
    rain_backup_plan: data.rain_backup_plan,
    cancel_weather_threshold: data.cancel_weather_threshold,
    power_access_notes: data.power_access_notes,
    water_access_notes: data.water_access_notes,
    restroom_info: data.restroom_info,
    portable_restrooms_needed: data.portable_restrooms_needed ?? false,
    kitchen_zone: data.kitchen_zone,
    dining_zone: data.dining_zone,
    bar_zone: data.bar_zone,
    other_zones: data.other_zones || [],
    welcome_message: data.welcome_message,
    arrival_window_minutes: data.arrival_window_minutes ?? 30,
    stagger_arrivals: data.stagger_arrivals ?? false,
    farm_name: data.farm_name,
    farm_bio: data.farm_bio,
    farm_photo_url: data.farm_photo_url,
    farm_website: data.farm_website,
    farm_social_url: data.farm_social_url,
    farm_logo_url: data.farm_logo_url,
    farm_animals: data.farm_animals || [],
    farm_crops: data.farm_crops || [],
  }
}

/**
 * Create or update venue details.
 * Both event owner and co-hosts can edit.
 */
export async function upsertVenueDetails(input: {
  eventId: string
  data: Partial<Omit<VenueDetails, 'id' | 'event_id'>>
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify access
  const { data: event } = await db
    .from('events')
    .select('tenant_id')
    .eq('id', input.eventId)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  const isOwner = event.tenant_id === user.entityId
  if (!isOwner) {
    const { data: collab } = await db
      .from('event_collaborators')
      .select('id')
      .eq('event_id', input.eventId)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .maybeSingle()
    if (!collab) return { success: false, error: 'Access denied' }
  }

  // Check existing
  const { data: existing } = await db
    .from('event_venue_details')
    .select('id')
    .eq('event_id', input.eventId)
    .maybeSingle()

  const row: Record<string, any> = {
    ...input.data,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await db.from('event_venue_details').update(row).eq('id', existing.id)

    if (error) return { success: false, error: 'Failed to update venue details' }
  } else {
    const { error } = await db.from('event_venue_details').insert({
      event_id: input.eventId,
      tenant_id: event.tenant_id,
      ...row,
    })

    if (error) return { success: false, error: 'Failed to create venue details' }
  }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Get venue details for the public event page (limited fields, no gate code).
 */
export async function getPublicVenueDetails(eventId: string): Promise<{
  farm_name: string | null
  farm_bio: string | null
  farm_photo_url: string | null
  farm_website: string | null
  farm_logo_url: string | null
  parking_instructions: string | null
  directions_from_road: string | null
  welcome_message: string | null
  property_rules: string[]
  restroom_info: string | null
  farm_animals: FarmShowcaseItem[]
  farm_crops: FarmCropItem[]
} | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('event_venue_details')
    .select(
      'farm_name, farm_bio, farm_photo_url, farm_website, farm_logo_url, parking_instructions, directions_from_road, welcome_message, property_rules, restroom_info, farm_animals, farm_crops'
    )
    .eq('event_id', eventId)
    .maybeSingle()

  if (!data) return null

  return {
    farm_name: data.farm_name,
    farm_bio: data.farm_bio,
    farm_photo_url: data.farm_photo_url,
    farm_website: data.farm_website,
    farm_logo_url: data.farm_logo_url,
    parking_instructions: data.parking_instructions,
    directions_from_road: data.directions_from_road,
    welcome_message: data.welcome_message,
    property_rules: data.property_rules || [],
    restroom_info: data.restroom_info,
    farm_animals: data.farm_animals || [],
    farm_crops: data.farm_crops || [],
  }
}

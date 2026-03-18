'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { geocodeAddress as geocodeWithGeocodio } from '@/lib/geo/geocodio'
import { geocodeAddress as geocodeWithNominatim } from '@/lib/geocoding/nominatim'
import { revalidatePath } from 'next/cache'

export async function geocodeEventAddress(eventId: string): Promise<{
  success: boolean
  lat?: number
  lng?: number
  displayName?: string
  error?: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the event (tenant-scoped)
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, location_address, location_city, location_state, location_zip, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (!event.location_address) {
    return { success: false, error: 'No address to geocode' }
  }

  // Build full address string for Geocodio (single string input)
  const fullAddress = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ]
    .filter(Boolean)
    .join(', ')

  // Try Geocodio first (more accurate for US addresses, 2500 req/day free)
  // Falls back to Nominatim if Geocodio fails or API key is not set
  let lat: number | undefined
  let lng: number | undefined
  let displayName: string | undefined

  try {
    const geocodioResult = await geocodeWithGeocodio(fullAddress)
    if (geocodioResult) {
      lat = geocodioResult.location.lat
      lng = geocodioResult.location.lng
      displayName = geocodioResult.formatted_address
    }
  } catch {
    // Geocodio failed (missing API key, network error, etc.) - fall through to Nominatim
  }

  // Fallback: Nominatim (free, no API key, works worldwide)
  if (lat === undefined || lng === undefined) {
    const nominatimResult = await geocodeWithNominatim(
      event.location_address,
      event.location_city,
      event.location_state,
      event.location_zip
    )
    if (nominatimResult) {
      lat = nominatimResult.lat
      lng = nominatimResult.lng
      displayName = nominatimResult.displayName
    }
  }

  if (lat === undefined || lng === undefined) {
    return { success: false, error: 'Address not found - try adding more detail' }
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      location_lat: lat,
      location_lng: lng,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    return { success: false, error: 'Failed to save coordinates' }
  }

  revalidatePath(`/events/${eventId}`)

  return { success: true, lat, lng, displayName }
}

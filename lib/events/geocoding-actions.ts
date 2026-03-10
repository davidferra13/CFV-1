'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { geocodeUsAddress } from '@/lib/public-data/census-geocoder'
import { geocodeAddress as geocodeWithGeocodio } from '@/lib/geo/geocodio'
import { geocodeAddress as geocodeWithNominatim } from '@/lib/geocoding/nominatim'

export async function geocodeEventAddress(eventId: string): Promise<{
  success: boolean
  lat?: number
  lng?: number
  displayName?: string
  error?: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

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

  const fullAddress = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ]
    .filter(Boolean)
    .join(', ')

  let lat: number | undefined
  let lng: number | undefined
  let displayName: string | undefined

  try {
    const censusResult = await geocodeUsAddress({
      address: event.location_address,
      city: event.location_city,
      state: event.location_state,
      zip: event.location_zip,
    })
    if (censusResult) {
      lat = censusResult.lat
      lng = censusResult.lng
      displayName = censusResult.matchedAddress
    }
  } catch {
    // Fall through to the next geocoder.
  }

  if (lat === undefined || lng === undefined) {
    try {
      const geocodioResult = await geocodeWithGeocodio(fullAddress)
      if (geocodioResult) {
        lat = geocodioResult.location.lat
        lng = geocodioResult.location.lng
        displayName = geocodioResult.formatted_address
      }
    } catch {
      // Fall through to the next geocoder.
    }
  }

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
    return { success: false, error: 'Address not found. Try adding more detail.' }
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

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/geocoding/nominatim'
import { revalidatePath } from 'next/cache'

export async function geocodeEventAddress(eventId: string): Promise<{
  success: boolean
  lat?: number
  lng?: number
  displayName?: string
  error?: string
}> {
  const user = await requireChef()
  const supabase = createServerClient()

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

  const result = await geocodeAddress(
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip
  )

  if (!result) {
    return { success: false, error: 'Address not found — try adding more detail' }
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      location_lat: result.lat,
      location_lng: result.lng,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    return { success: false, error: 'Failed to save coordinates' }
  }

  revalidatePath(`/events/${eventId}`)

  return { success: true, lat: result.lat, lng: result.lng, displayName: result.displayName }
}

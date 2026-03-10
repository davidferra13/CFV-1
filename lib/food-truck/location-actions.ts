'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { geocodeUsAddress } from '@/lib/public-data/census-geocoder'

// ---- Types ----

export type TruckLocation = {
  id: string
  tenant_id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  contact_name: string | null
  contact_phone: string | null
  permit_required: boolean
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TruckScheduleEntry = {
  id: string
  tenant_id: string
  location_id: string
  date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  expected_covers: number | null
  actual_covers: number | null
  revenue_cents: number | null
  weather_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  location?: TruckLocation
}

async function enrichTruckLocationAddress(input: { address?: string; lat?: number; lng?: number }) {
  if (!input.address || input.lat != null || input.lng != null) {
    return {
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    }
  }

  const censusMatch = await geocodeUsAddress({ address: input.address })
  if (!censusMatch) {
    return {
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    }
  }

  return {
    address: censusMatch.matchedAddress,
    lat: censusMatch.lat,
    lng: censusMatch.lng,
  }
}

// ---- Location CRUD ----

export async function getLocations(): Promise<TruckLocation[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_locations')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .order('name')

  if (error) throw new Error(`Failed to load locations: ${error.message}`)
  return (data ?? []) as TruckLocation[]
}

export async function createLocation(input: {
  name: string
  address?: string
  lat?: number
  lng?: number
  contact_name?: string
  contact_phone?: string
  permit_required?: boolean
  notes?: string
}): Promise<TruckLocation> {
  const user = await requireChef()
  const supabase = createServerClient()
  const enrichedAddress = await enrichTruckLocationAddress(input)

  const { data, error } = await supabase
    .from('truck_locations')
    .insert({
      tenant_id: user.entityId!,
      name: input.name,
      address: enrichedAddress.address,
      lat: enrichedAddress.lat,
      lng: enrichedAddress.lng,
      contact_name: input.contact_name ?? null,
      contact_phone: input.contact_phone ?? null,
      permit_required: input.permit_required ?? false,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create location: ${error.message}`)
  revalidatePath('/food-truck/locations')
  return data as TruckLocation
}

export async function updateLocation(
  id: string,
  input: Partial<{
    name: string
    address: string
    lat: number
    lng: number
    contact_name: string
    contact_phone: string
    permit_required: boolean
    notes: string
    is_active: boolean
  }>
): Promise<TruckLocation> {
  const user = await requireChef()
  const supabase = createServerClient()
  const { data: existing } =
    input.address !== undefined && input.lat === undefined && input.lng === undefined
      ? await supabase
          .from('truck_locations')
          .select('lat, lng')
          .eq('id', id)
          .eq('tenant_id', user.entityId!)
          .single()
      : { data: null }
  const enrichedAddress = await enrichTruckLocationAddress({
    address: input.address,
    lat: input.lat,
    lng: input.lng,
  })

  const { data, error } = await supabase
    .from('truck_locations')
    .update({
      ...input,
      address: input.address !== undefined ? enrichedAddress.address : input.address,
      lat:
        input.address !== undefined && input.lat === undefined
          ? (enrichedAddress.lat ?? existing?.lat ?? null)
          : input.lat,
      lng:
        input.address !== undefined && input.lng === undefined
          ? (enrichedAddress.lng ?? existing?.lng ?? null)
          : input.lng,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update location: ${error.message}`)
  revalidatePath('/food-truck/locations')
  return data as TruckLocation
}

export async function deleteLocation(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('truck_locations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId!)

  if (error) throw new Error(`Failed to delete location: ${error.message}`)
  revalidatePath('/food-truck/locations')
}

// ---- Schedule CRUD ----

export async function getWeeklySchedule(weekStart: string): Promise<TruckScheduleEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Calculate week end (6 days after start)
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const weekEnd = end.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('truck_schedule')
    .select('*, location:truck_locations(*)')
    .eq('tenant_id', user.entityId!)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date')
    .order('start_time')

  if (error) throw new Error(`Failed to load schedule: ${error.message}`)
  return (data ?? []) as TruckScheduleEntry[]
}

export async function createScheduleEntry(input: {
  location_id: string
  date: string
  start_time: string
  end_time: string
  expected_covers?: number
  notes?: string
}): Promise<TruckScheduleEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_schedule')
    .insert({
      tenant_id: user.entityId!,
      location_id: input.location_id,
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      expected_covers: input.expected_covers ?? null,
      notes: input.notes ?? null,
    })
    .select('*, location:truck_locations(*)')
    .single()

  if (error) throw new Error(`Failed to create schedule entry: ${error.message}`)
  revalidatePath('/food-truck/locations')
  return data as TruckScheduleEntry
}

export async function updateScheduleEntry(
  id: string,
  input: Partial<{
    location_id: string
    date: string
    start_time: string
    end_time: string
    status: string
    expected_covers: number
    actual_covers: number
    revenue_cents: number
    weather_notes: string
    notes: string
  }>
): Promise<TruckScheduleEntry> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_schedule')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select('*, location:truck_locations(*)')
    .single()

  if (error) throw new Error(`Failed to update schedule entry: ${error.message}`)
  revalidatePath('/food-truck/locations')
  return data as TruckScheduleEntry
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('truck_schedule')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId!)

  if (error) throw new Error(`Failed to delete schedule entry: ${error.message}`)
  revalidatePath('/food-truck/locations')
}

export async function getLocationHistory(locationId: string): Promise<TruckScheduleEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_schedule')
    .select('*, location:truck_locations(*)')
    .eq('tenant_id', user.entityId!)
    .eq('location_id', locationId)
    .order('date', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Failed to load location history: ${error.message}`)
  return (data ?? []) as TruckScheduleEntry[]
}

export async function copyWeekSchedule(fromWeek: string, toWeek: string): Promise<number> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get source week entries
  const fromStart = new Date(fromWeek)
  const fromEnd = new Date(fromStart)
  fromEnd.setDate(fromEnd.getDate() + 6)

  const { data: sourceEntries, error: fetchError } = await supabase
    .from('truck_schedule')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .gte('date', fromWeek)
    .lte('date', fromEnd.toISOString().split('T')[0])

  if (fetchError) throw new Error(`Failed to read source week: ${fetchError.message}`)
  if (!sourceEntries || sourceEntries.length === 0) return 0

  // Calculate day offset between weeks
  const toStart = new Date(toWeek)
  const dayOffset = Math.round((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24))

  // Create new entries with shifted dates
  const newEntries = sourceEntries.map((entry) => {
    const sourceDate = new Date(entry.date)
    sourceDate.setDate(sourceDate.getDate() + dayOffset)
    return {
      tenant_id: user.entityId!,
      location_id: entry.location_id,
      date: sourceDate.toISOString().split('T')[0],
      start_time: entry.start_time,
      end_time: entry.end_time,
      expected_covers: entry.expected_covers,
      notes: entry.notes,
    }
  })

  const { error: insertError } = await supabase
    .from('truck_schedule')
    .upsert(newEntries, { onConflict: 'tenant_id,date,location_id' })

  if (insertError) throw new Error(`Failed to copy week: ${insertError.message}`)
  revalidatePath('/food-truck/locations')
  return newEntries.length
}

export async function getScheduleForDate(date: string): Promise<TruckScheduleEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_schedule')
    .select('*, location:truck_locations(*)')
    .eq('tenant_id', user.entityId!)
    .eq('date', date)
    .order('start_time')

  if (error) throw new Error(`Failed to load schedule for date: ${error.message}`)
  return (data ?? []) as TruckScheduleEntry[]
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getAccountLocation } from '@/lib/location/account-location'
import { calculateDistanceMiles } from '@/lib/geo/public-location'

// ---------------------------------------------------------------------------
// Unified event type for the Current Events page
// ---------------------------------------------------------------------------

export type ChefPortalEvent = {
  id: string
  sourceType: 'chef_event' | 'farmers_market' | 'calendar_entry'
  sourceLabel: string
  title: string
  description?: string
  startsAt: string
  endsAt?: string
  locationName?: string
  address?: string
  distanceMiles?: number
  organizerName?: string
  href?: string
  status?: string
}

// ---------------------------------------------------------------------------
// Fetch upcoming chef events (own events, not completed/cancelled)
// ---------------------------------------------------------------------------

async function fetchUpcomingChefEvents(tenantId: string): Promise<ChefPortalEvent[]> {
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await db
    .from('events')
    .select(
      'id, event_date, occasion, guest_count, location_address, location_city, location_state, status, client:clients(full_name)'
    )
    .eq('tenant_id', tenantId)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .is('deleted_at', null)
    .order('event_date', { ascending: true })
    .limit(50)

  if (error || !data) return []

  return data.map((e: any) => {
    const locationParts = [e.location_address, e.location_city, e.location_state].filter(Boolean)
    return {
      id: e.id,
      sourceType: 'chef_event' as const,
      sourceLabel: 'Your Event',
      title: e.occasion || 'Event',
      description: e.client?.full_name
        ? `${e.guest_count ?? '?'} guests for ${e.client.full_name}`
        : `${e.guest_count ?? '?'} guests`,
      startsAt: e.event_date,
      locationName:
        e.location_city && e.location_state ? `${e.location_city}, ${e.location_state}` : undefined,
      address: locationParts.join(', ') || undefined,
      href: `/events/${e.id}`,
      status: e.status,
    }
  })
}

// ---------------------------------------------------------------------------
// Fetch nearby in-season farmers markets
// ---------------------------------------------------------------------------

async function fetchNearbyMarkets(
  lat: number | null,
  lng: number | null,
  radiusMiles: number
): Promise<ChefPortalEvent[]> {
  if (!lat || !lng) return []

  const db: any = createServerClient()
  const currentMonth = new Date().getMonth() + 1

  const { data, error } = await db
    .from('farmers_markets')
    .select(
      'id, name, address, city, state, zip, lat, lng, schedule, season_start, season_end, website'
    )
    .eq('is_active', true)
    .limit(500)

  if (error || !data) return []

  return data
    .filter((m: any) => {
      if (!m.lat || !m.lng) return false
      const dist = calculateDistanceMiles(lat, lng, Number(m.lat), Number(m.lng))
      if (dist > radiusMiles) return false
      if (m.season_start && m.season_end) {
        if (m.season_start <= m.season_end) {
          return currentMonth >= m.season_start && currentMonth <= m.season_end
        }
        return currentMonth >= m.season_start || currentMonth <= m.season_end
      }
      return true
    })
    .map((m: any) => {
      const dist = calculateDistanceMiles(lat, lng, Number(m.lat), Number(m.lng))
      return {
        id: `market-${m.id}`,
        sourceType: 'farmers_market' as const,
        sourceLabel: 'Farmers Market',
        title: m.name,
        description: m.schedule || undefined,
        startsAt: new Date().toISOString().split('T')[0],
        locationName: m.city && m.state ? `${m.city}, ${m.state}` : undefined,
        address: [m.address, m.city, m.state, m.zip].filter(Boolean).join(', ') || undefined,
        distanceMiles: Math.round(dist * 10) / 10,
        href: m.website || undefined,
      }
    })
    .sort(
      (a: ChefPortalEvent, b: ChefPortalEvent) =>
        (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999)
    )
    .slice(0, 20)
}

// ---------------------------------------------------------------------------
// Fetch chef calendar entries (markets, festivals, classes, etc.)
// ---------------------------------------------------------------------------

async function fetchCalendarEvents(chefId: string): Promise<ChefPortalEvent[]> {
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await db
    .from('chef_calendar_entries')
    .select(
      'id, entry_type, title, description, start_date, end_date, all_day, start_time, end_time'
    )
    .eq('chef_id', chefId)
    .gte('end_date', today)
    .in('entry_type', ['market', 'festival', 'class', 'photo_shoot', 'media', 'meeting', 'other'])
    .order('start_date', { ascending: true })
    .limit(50)

  if (error || !data) return []

  const typeLabels: Record<string, string> = {
    market: 'Market Visit',
    festival: 'Festival',
    class: 'Class',
    photo_shoot: 'Photo Shoot',
    media: 'Media',
    meeting: 'Meeting',
    other: 'Event',
  }

  return data.map((e: any) => ({
    id: `cal-${e.id}`,
    sourceType: 'calendar_entry' as const,
    sourceLabel: typeLabels[e.entry_type] || 'Event',
    title: e.title,
    description: e.description || undefined,
    startsAt: e.start_date,
    endsAt: e.end_date !== e.start_date ? e.end_date : undefined,
  }))
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export async function getCurrentEvents(): Promise<ChefPortalEvent[]> {
  const user = await requireChef()
  const location = await getAccountLocation()

  const [chefEvents, markets, calendarEvents] = await Promise.all([
    fetchUpcomingChefEvents(user.tenantId!),
    fetchNearbyMarkets(location?.lat ?? null, location?.lng ?? null, location?.radiusMiles ?? 25),
    fetchCalendarEvents(user.tenantId!),
  ])

  const all = [...chefEvents, ...calendarEvents, ...markets]

  all.sort((a, b) => {
    if (a.sourceType === 'farmers_market' && b.sourceType !== 'farmers_market') return 1
    if (b.sourceType === 'farmers_market' && a.sourceType !== 'farmers_market') return -1
    return a.startsAt.localeCompare(b.startsAt)
  })

  return all
}

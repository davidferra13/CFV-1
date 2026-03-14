'use server'

// Remy — Travel Time Estimates (Phase 6B)
// Estimates driving time between back-to-back events using OSRM (free, no API key).
// Alerts when two events are too close together to allow travel + setup.
// PRIVACY: Only sends location text to Open-Meteo geocoding → coordinates to OSRM.
// No client names, event details, or business data leaves the server.

interface GeoResult {
  latitude: number
  longitude: number
  name: string
}

export interface TravelEstimate {
  fromEventId: string
  toEventId: string
  fromLocation: string
  toLocation: string
  fromOccasion: string | null
  toOccasion: string | null
  fromDate: string
  toDate: string
  drivingMinutes: number
  distanceKm: number
  gapMinutes: number
  feasible: boolean
  warning: string | null
}

// Minimum buffer time (minutes) between events: travel + setup + breakdown
const MIN_BUFFER_MINUTES = 30

/**
 * Geocode a location string using Open-Meteo's geocoding API.
 */
async function geocodeLocation(location: string): Promise<GeoResult | null> {
  try {
    const query = encodeURIComponent(location.trim())
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.results?.[0]
    if (!result) return null
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    }
  } catch {
    return null
  }
}

/**
 * Get driving time and distance between two points using OSRM (free routing API).
 * Returns null if the route can't be computed.
 */
async function getDrivingTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<{ durationMinutes: number; distanceKm: number } | null> {
  try {
    // OSRM expects lng,lat order
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return null

    return {
      durationMinutes: Math.round(data.routes[0].duration / 60),
      distanceKm: Math.round((data.routes[0].distance / 1000) * 10) / 10,
    }
  } catch {
    return null
  }
}

/**
 * Check travel feasibility for back-to-back events within the next 7 days.
 * Returns estimates for each consecutive pair of events on the same day.
 */
export async function getTravelEstimates(tenantId: string): Promise<TravelEstimate[]> {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, location, occasion, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .lte('event_date', weekOut)
    .order('event_date', { ascending: true })
    .limit(20)

  if (!events || events.length < 2) return []

  // Group events by date (YYYY-MM-DD)
  const byDate = new Map<string, typeof events>()
  for (const e of events) {
    const d = new Date(e.event_date).toISOString().split('T')[0]
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(e)
  }

  const estimates: TravelEstimate[] = []
  const geoCache = new Map<string, GeoResult | null>()

  for (const [, dayEvents] of byDate) {
    if (dayEvents.length < 2) continue

    // Check consecutive pairs
    for (let i = 0; i < dayEvents.length - 1; i++) {
      const from = dayEvents[i]
      const to = dayEvents[i + 1]
      if (!from.location || !to.location) continue

      // Same location → no travel needed
      if (from.location.toLowerCase().trim() === to.location.toLowerCase().trim()) continue

      // Geocode both locations
      const fromKey = from.location.toLowerCase().trim()
      const toKey = to.location.toLowerCase().trim()
      if (!geoCache.has(fromKey)) geoCache.set(fromKey, await geocodeLocation(from.location))
      if (!geoCache.has(toKey)) geoCache.set(toKey, await geocodeLocation(to.location))

      const fromGeo = geoCache.get(fromKey)
      const toGeo = geoCache.get(toKey)
      if (!fromGeo || !toGeo) continue

      // Get driving time
      const route = await getDrivingTime(
        fromGeo.latitude,
        fromGeo.longitude,
        toGeo.latitude,
        toGeo.longitude
      )
      if (!route) continue

      // Calculate gap between events
      const fromTime = new Date(from.event_date).getTime()
      const toTime = new Date(to.event_date).getTime()
      const gapMinutes = Math.round((toTime - fromTime) / (1000 * 60))
      const totalNeeded = route.durationMinutes + MIN_BUFFER_MINUTES
      const feasible = gapMinutes >= totalNeeded

      let warning: string | null = null
      if (!feasible) {
        const shortBy = totalNeeded - gapMinutes
        warning = `Only ${gapMinutes} min gap but need ~${totalNeeded} min (${route.durationMinutes} min driving + ${MIN_BUFFER_MINUTES} min buffer). Short by ${shortBy} min.`
      }

      estimates.push({
        fromEventId: from.id,
        toEventId: to.id,
        fromLocation: from.location,
        toLocation: to.location,
        fromOccasion: from.occasion ?? null,
        toOccasion: to.occasion ?? null,
        fromDate: new Date(from.event_date).toISOString(),
        toDate: new Date(to.event_date).toISOString(),
        drivingMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
        gapMinutes,
        feasible,
        warning,
      })
    }
  }

  return estimates
}

/**
 * Format travel estimates as a Remy response.
 */
export async function formatTravelEstimates(estimates: TravelEstimate[]): Promise<string> {
  if (estimates.length === 0) {
    return "No back-to-back events this week that need travel time planning. You're good!"
  }

  const lines: string[] = ['**Travel time between back-to-back events:**\n']

  for (const est of estimates) {
    const icon = est.feasible ? '✅' : '⚠️'
    const fromLabel = est.fromOccasion ?? 'Event'
    const toLabel = est.toOccasion ?? 'Event'
    const distMi = Math.round(est.distanceKm * 0.621)

    lines.push(`${icon} **${fromLabel}** → **${toLabel}**`)
    lines.push(`  ${est.fromLocation} → ${est.toLocation}`)
    lines.push(`  ~${est.drivingMinutes} min drive (${distMi} mi)`)

    if (est.warning) {
      lines.push(`  ⚠️ ${est.warning}`)
    } else {
      lines.push(`  ${est.gapMinutes} min gap — plenty of time`)
    }
    lines.push('')
  }

  const infeasible = estimates.filter((e) => !e.feasible)
  if (infeasible.length > 0) {
    lines.push(
      `**${infeasible.length} scheduling conflict${infeasible.length > 1 ? 's' : ''} detected.** Consider adjusting event times or locations.`
    )
  }

  return lines.join('\n').trim()
}

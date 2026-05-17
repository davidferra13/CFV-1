'use server'

// Solar Actions - Server actions for injecting sunrise/sunset/golden-hour
// markers into event timelines. Non-destructive: skips if markers exist.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getSolarTimes, isOutdoorEvent, type SolarTimes } from './solar-times'
import { revalidatePath } from 'next/cache'
// ── Solar marker block labels (used for dedup) ──────────────────────────────

const SUNRISE_LABEL = 'Sunrise'
const SUNSET_LABEL = 'Sunset'
const GOLDEN_HOUR_LABEL = 'Golden Hour (photography)'

// ── Get Solar Times for Event ───────────────────────────────────────────────

/**
 * Fetch solar times for an event by looking up its location and date.
 * Returns null if the event has no coordinates, no date, or is out of forecast range.
 */
export async function getSolarTimesForEvent(
  eventId: string
): Promise<SolarTimes | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('event_date, location_lat, location_lng')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !event) return null
  if (event.location_lat == null || event.location_lng == null) return null
  if (!event.event_date) return null

  // Normalize date to YYYY-MM-DD
  const dateStr =
    typeof event.event_date === 'string'
      ? event.event_date.slice(0, 10)
      : new Date(event.event_date).toISOString().slice(0, 10)

  return getSolarTimes(event.location_lat, event.location_lng, dateStr)
}

// ── Inject Solar Markers into Timeline ──────────────────────────────────────

export interface InjectSolarResult {
  injected: string[] // labels of blocks that were inserted
  skipped: string[] // labels of blocks that already existed
  isOutdoor: boolean
  solar: SolarTimes | null
}

/**
 * Add sunrise, sunset, and golden-hour marker blocks to an event's timeline.
 * Non-destructive: checks for existing blocks by label and skips duplicates.
 * Golden hour block only added for outdoor events.
 *
 * Requires an existing timeline (generate one first).
 */
export async function injectSolarMarkers(
  eventId: string
): Promise<InjectSolarResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event details
  const { data: event, error: eventErr } = await db
    .from('events')
    .select(
      'id, event_date, location_lat, location_lng, venue_type, notes, title, weather_exposure'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    return { injected: [], skipped: [], isOutdoor: false, solar: null }
  }

  // Check coordinates
  if (event.location_lat == null || event.location_lng == null) {
    return { injected: [], skipped: [], isOutdoor: false, solar: null }
  }

  // Fetch solar times
  const dateStr =
    typeof event.event_date === 'string'
      ? event.event_date.slice(0, 10)
      : new Date(event.event_date).toISOString().slice(0, 10)

  const solar = await getSolarTimes(
    event.location_lat,
    event.location_lng,
    dateStr
  )

  if (!solar) {
    return { injected: [], skipped: [], isOutdoor: false, solar: null }
  }

  const outdoor = isOutdoorEvent(event)

  // Get the existing timeline
  const { data: timeline } = await db
    .from('event_timelines')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!timeline) {
    return { injected: [], skipped: [], isOutdoor: outdoor, solar }
  }

  // Fetch existing blocks to check for duplicates
  const { data: existingBlocks } = await db
    .from('timeline_blocks')
    .select('label, sequence')
    .eq('timeline_id', timeline.id)
    .order('sequence', { ascending: false })
    .limit(1)

  const { data: allBlocks } = await db
    .from('timeline_blocks')
    .select('label')
    .eq('timeline_id', timeline.id)

  const existingLabels = new Set(
    (allBlocks || []).map((b: { label: string }) => b.label)
  )
  const maxSequence = existingBlocks?.[0]?.sequence ?? 0

  const injected: string[] = []
  const skipped: string[] = []
  let nextSequence = maxSequence + 1

  // Sunrise marker (zero-duration marker block)
  if (existingLabels.has(SUNRISE_LABEL)) {
    skipped.push(SUNRISE_LABEL)
  } else {
    const sunriseTime = new Date(solar.sunrise)
    await db.from('timeline_blocks').insert({
      timeline_id: timeline.id,
      block_type: 'custom',
      label: SUNRISE_LABEL,
      start_time: sunriseTime.toISOString(),
      end_time: sunriseTime.toISOString(),
      duration_minutes: 0,
      sequence: nextSequence++,
      notes: `Sunrise at ${solar.sunriseFormatted}`,
      course_number: null,
      is_parallel: false,
    })
    injected.push(SUNRISE_LABEL)
  }

  // Golden hour marker (only for outdoor events, 60 min duration)
  if (outdoor) {
    if (existingLabels.has(GOLDEN_HOUR_LABEL)) {
      skipped.push(GOLDEN_HOUR_LABEL)
    } else {
      const goldenStart = new Date(solar.goldenHourStart)
      const goldenEnd = new Date(solar.goldenHourEnd)
      await db.from('timeline_blocks').insert({
        timeline_id: timeline.id,
        block_type: 'custom',
        label: GOLDEN_HOUR_LABEL,
        start_time: goldenStart.toISOString(),
        end_time: goldenEnd.toISOString(),
        duration_minutes: 60,
        sequence: nextSequence++,
        notes: `Best natural light for photos: ${solar.goldenHourFormatted} to ${solar.sunsetFormatted}`,
        course_number: null,
        is_parallel: false,
      })
      injected.push(GOLDEN_HOUR_LABEL)
    }
  }

  // Sunset marker (zero-duration marker block)
  if (existingLabels.has(SUNSET_LABEL)) {
    skipped.push(SUNSET_LABEL)
  } else {
    const sunsetTime = new Date(solar.sunset)
    await db.from('timeline_blocks').insert({
      timeline_id: timeline.id,
      block_type: 'custom',
      label: SUNSET_LABEL,
      start_time: sunsetTime.toISOString(),
      end_time: sunsetTime.toISOString(),
      duration_minutes: 0,
      sequence: nextSequence++,
      notes: `Sunset at ${solar.sunsetFormatted}. ${outdoor ? 'Plan lighting transition.' : ''}`.trim(),
      course_number: null,
      is_parallel: false,
    })
    injected.push(SUNSET_LABEL)
  }

  revalidatePath(`/events/${eventId}`)

  return { injected, skipped, isOutdoor: outdoor, solar }
}

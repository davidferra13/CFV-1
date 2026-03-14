import { UnknownAppError } from '@/lib/errors/app-error'
import {
  getDefaultServeTimeForMealSlot,
  type SeriesSessionPlan,
} from '@/lib/booking/series-planning'
import type { Database } from '@/types/database'

type EventSeriesRow = {
  id: string
  service_mode: Database['public']['Enums']['booking_service_mode']
}

type EventSessionRow = {
  id: string
  session_date: string
  meal_slot: Database['public']['Enums']['event_session_meal_slot']
  start_time: string | null
  end_time: string | null
  guest_count: number | null
  notes: string | null
  sort_order: number
  location_address?: string | null
  location_city?: string | null
  location_state?: string | null
  location_zip?: string | null
}

type EventRow = {
  id: string
  event_date: string
  created_at: string
  source_session_id?: string | null
}

type InquiryLike = {
  id: string
  client_id: string | null
  referral_partner_id?: string | null
  partner_location_id?: string | null
  confirmed_location?: string | null
  confirmed_occasion?: string | null
  confirmed_guest_count?: number | null
  confirmed_service_expectations?: string | null
  confirmed_dietary_restrictions?: string[] | null
}

function buildSessionIdentityKey(session: {
  session_date?: string | null
  meal_slot?: Database['public']['Enums']['event_session_meal_slot'] | null
  start_time?: string | null
}): string {
  return `${session.session_date || ''}|${session.meal_slot || 'other'}|${
    session.start_time || '00:00:00'
  }`
}

function buildSessionOccasionLabel(params: {
  baseOccasion: string | null
  sessionDate: string
  mealSlot: Database['public']['Enums']['event_session_meal_slot']
  totalSessions: number
}) {
  const { baseOccasion, sessionDate, mealSlot, totalSessions } = params
  const occasion = baseOccasion || 'Private Chef Service'
  if (totalSessions <= 1) return occasion
  return `${occasion} - ${mealSlot.replace('_', ' ')} (${sessionDate})`
}

export function mergeSpecialRequestNotes(
  ...notes: Array<string | null | undefined>
): string | null {
  const chunks = notes.map((note) => note?.trim()).filter(Boolean)
  if (chunks.length === 0) return null
  return chunks.join('\n\n')
}

export async function materializeSeriesSessions(params: {
  supabase: any
  tenantId: string
  actorId?: string | null
  series: EventSeriesRow
  inquiry: InquiryLike
  plannedSessions: SeriesSessionPlan[]
  parsedLocation: { city: string | null; state: string | null }
}): Promise<EventSessionRow[]> {
  const { supabase, tenantId, actorId, series, inquiry, plannedSessions, parsedLocation } = params

  const { data: existingSessions } = await supabase
    .from('event_service_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('series_id', series.id)
    .order('session_date', { ascending: true })
    .order('sort_order', { ascending: true })

  const existingByKey = new Map<string, EventSessionRow>()
  for (const existing of (existingSessions || []) as EventSessionRow[]) {
    existingByKey.set(buildSessionIdentityKey(existing), existing)
  }

  const toInsert = plannedSessions
    .filter((session) => !existingByKey.has(buildSessionIdentityKey(session)))
    .map((session) => ({
      series_id: series.id,
      tenant_id: tenantId,
      client_id: inquiry.client_id,
      inquiry_id: inquiry.id,
      session_date: session.session_date,
      meal_slot: session.meal_slot,
      execution_type: session.execution_type,
      start_time: session.start_time,
      end_time: session.end_time,
      guest_count: session.guest_count,
      service_style: 'plated',
      location_address: inquiry.confirmed_location || null,
      location_city: parsedLocation.city || 'TBD',
      location_state: parsedLocation.state || null,
      location_zip: null,
      status: 'draft',
      sort_order: session.sort_order,
      notes: session.notes,
      created_by: actorId || null,
      updated_by: actorId || null,
    }))

  let insertedSessions: EventSessionRow[] = []
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('event_service_sessions')
      .insert(toInsert)
      .select('*')

    if (error) {
      console.error('[materializeSeriesSessions] Insert error:', error)
      throw new UnknownAppError(`Failed to create series sessions: ${error.message}`)
    }

    insertedSessions = (data || []) as EventSessionRow[]
  }

  return [...((existingSessions || []) as EventSessionRow[]), ...insertedSessions].sort((a, b) => {
    const dateCompare = a.session_date.localeCompare(b.session_date)
    if (dateCompare !== 0) return dateCompare
    return a.sort_order - b.sort_order
  })
}

export async function materializeSeriesEvents(params: {
  supabase: any
  tenantId: string
  actorId?: string | null
  inquiry: InquiryLike
  series: EventSeriesRow
  sessions: EventSessionRow[]
  parsedLocation: { city: string | null; state: string | null }
  serveTimeFallback: string | null
  arrivalTimeFallback: string | null
  quotedPriceCents: number | null
  depositAmountCents: number | null
  pricingModel: Database['public']['Enums']['pricing_model'] | null
  cannabisPreference: boolean | null
}): Promise<EventRow[]> {
  const {
    supabase,
    tenantId,
    actorId,
    inquiry,
    series,
    sessions,
    parsedLocation,
    serveTimeFallback,
    arrivalTimeFallback,
    quotedPriceCents,
    depositAmountCents,
    pricingModel,
    cannabisPreference,
  } = params

  const { data: existingEvents } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_series_id', series.id)
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  const existingBySession = new Map<string, EventRow>()
  for (const existing of (existingEvents || []) as EventRow[]) {
    if (existing.source_session_id) {
      existingBySession.set(existing.source_session_id, existing)
    }
  }

  const payload = sessions
    .filter((session) => !existingBySession.has(session.id))
    .map((session) => {
      const sessionIndex = sessions.findIndex((candidate) => candidate.id === session.id)
      const serveTime =
        session.start_time || serveTimeFallback || getDefaultServeTimeForMealSlot(session.meal_slot)
      const arrivalTime = arrivalTimeFallback || session.start_time || null

      return {
        tenant_id: tenantId,
        client_id: inquiry.client_id,
        inquiry_id: inquiry.id,
        referral_partner_id: inquiry.referral_partner_id || null,
        partner_location_id: inquiry.partner_location_id || null,
        event_series_id: series.id,
        source_session_id: session.id,
        service_mode: series.service_mode,
        booking_source: 'series',
        event_date: session.session_date,
        serve_time: serveTime,
        arrival_time: arrivalTime,
        guest_count: session.guest_count || inquiry.confirmed_guest_count || 1,
        location_address: session.location_address || inquiry.confirmed_location || 'TBD',
        location_city: session.location_city || parsedLocation.city || 'TBD',
        location_state: session.location_state || parsedLocation.state || null,
        location_zip: session.location_zip || null,
        occasion: buildSessionOccasionLabel({
          baseOccasion: inquiry.confirmed_occasion || null,
          sessionDate: session.session_date,
          mealSlot: session.meal_slot,
          totalSessions: sessions.length,
        }),
        quoted_price_cents: sessionIndex === 0 ? quotedPriceCents : null,
        deposit_amount_cents: sessionIndex === 0 ? depositAmountCents : null,
        pricing_model: pricingModel,
        dietary_restrictions: inquiry.confirmed_dietary_restrictions || [],
        special_requests: mergeSpecialRequestNotes(
          inquiry.confirmed_service_expectations,
          session.notes
        ),
        cannabis_preference: cannabisPreference,
        created_by: actorId || null,
        updated_by: actorId || null,
      }
    })

  let insertedEvents: EventRow[] = []
  if (payload.length > 0) {
    const { data, error } = await supabase.from('events').insert(payload).select('*')

    if (error) {
      console.error('[materializeSeriesEvents] Event creation error:', error)
      throw new UnknownAppError(`Failed to create events for series: ${error.message}`)
    }
    insertedEvents = (data || []) as EventRow[]
  }

  if (insertedEvents.length > 0) {
    await supabase.from('event_state_transitions').insert(
      insertedEvents.map((event) => ({
        tenant_id: tenantId,
        event_id: event.id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: actorId || null,
        metadata: {
          action: 'created_from_series',
          inquiry_id: inquiry.id,
          series_id: series.id,
          source_session_id: event.source_session_id,
        },
      }))
    )

    await Promise.all(
      insertedEvents
        .filter((event) => Boolean(event.source_session_id))
        .map((event) =>
          supabase
            .from('event_service_sessions')
            .update({ event_id: event.id, updated_by: actorId || null })
            .eq('id', event.source_session_id)
            .eq('tenant_id', tenantId)
        )
    )
  }

  return [...((existingEvents || []) as EventRow[]), ...insertedEvents].sort((a, b) => {
    const dateCompare = a.event_date.localeCompare(b.event_date)
    if (dateCompare !== 0) return dateCompare
    return a.created_at.localeCompare(b.created_at)
  })
}

// Event CRUD Server Actions
// Enforces tenant scoping and RLS at database layer

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import { createConflictError } from '@/lib/mutations/conflict'
import { AuthError, UnknownAppError, ValidationError } from '@/lib/errors/app-error'
import { isMissingSoftDeleteColumn } from '@/lib/mutations/soft-delete-compat'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'
import { normalizeLocationTruthValue } from '@/lib/events/location-truth'
import {
  normalizeEventTimeTruthValue,
  normalizeEventTimezoneTruthValue,
} from '@/lib/events/time-truth'
import { executeInteraction } from '@/lib/interactions'
import {
  EVENT_TIME_ACTIVITY_TYPES,
  EVENT_TIME_ACTIVITY_CONFIG,
  type EventTimeActivityType,
  formatMinutesAsDuration,
  getEventActivityLabel,
  safeDurationMinutes,
} from './time-tracking'

// Validation schemas aligned with new events table
const CreateEventSchema = z.object({
  client_id: z.string().uuid(),
  event_date: z
    .string()
    .min(1, 'Event date required')
    .refine((v) => !isNaN(Date.parse(v)), { message: 'Event date must be a valid date string' }),
  serve_time: z.string().optional().default(''),
  guest_count: z.number().int().positive().optional().default(1),
  location_address: z.string().optional().default(''),
  location_city: z.string().optional().default(''),
  location_state: z.string().optional(),
  location_zip: z.string().optional().default(''),
  occasion: z.string().max(255).optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  quoted_price_cents: z.number().int().nonnegative().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
  dietary_restrictions: z.array(z.string().max(100)).max(50).optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
  special_requests: z.string().max(2000).optional(),
  site_notes: z.string().max(2000).optional(),
  access_instructions: z.string().max(2000).optional(),
  kitchen_notes: z.string().max(2000).optional(),
  location_notes: z.string().max(2000).optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  cannabis_preference: z.boolean().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  referral_partner_id: z.string().uuid().nullable().optional(),
  partner_location_id: z.string().uuid().nullable().optional(),
  event_timezone: z.string().optional(),
  idempotency_key: z.string().optional(),
})

const UpdateEventSchema = z.object({
  event_date: z.string().optional(),
  serve_time: z.string().optional(),
  guest_count: z.number().int().positive().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  occasion: z.string().max(255).optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  quoted_price_cents: z.number().int().nonnegative().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
  dietary_restrictions: z.array(z.string().max(100)).max(50).optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
  special_requests: z.string().max(2000).optional(),
  site_notes: z.string().max(2000).optional(),
  access_instructions: z.string().max(2000).optional(),
  kitchen_notes: z.string().max(2000).optional(),
  location_notes: z.string().max(2000).optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  pricing_notes: z.string().max(2000).optional(),
  cannabis_preference: z.boolean().optional(),
  payment_method_primary: z
    .enum(['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other'])
    .optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  referral_partner_id: z.string().uuid().nullable().optional(),
  partner_location_id: z.string().uuid().nullable().optional(),
  event_timezone: z.string().optional(),
  expected_updated_at: z.union([z.string(), z.date().transform((d) => d.toISOString())]).optional(),
  idempotency_key: z.string().optional(),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>
const EventTimeActivitySchema = z.enum(EVENT_TIME_ACTIVITY_TYPES)
const LogCharityHoursSchema = z.object({
  minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60 * 31),
  logged_for: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: z.string().trim().max(500).optional(),
})

export type LogCharityHoursInput = z.infer<typeof LogCharityHoursSchema>

export type DuplicateEventCandidate = {
  id: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  guest_count: number | null
  client_id: string | null
  reason: string
}

async function findDuplicateEventCandidatesForTenant(
  db: any,
  tenantId: string,
  input: {
    client_id?: string | null
    event_date?: string | null
    serve_time?: string | null
    occasion?: string | null
    location_city?: string | null
    exclude_event_id?: string | null
  }
): Promise<DuplicateEventCandidate[]> {
  const date = input.event_date?.slice(0, 10)
  if (!date) return []

  let query = db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, client_id, location_city')
    .eq('tenant_id', tenantId)
    .eq('event_date', date)
    .is('deleted_at' as any, null)
    .not('status', 'in', '("cancelled")')
    .limit(10)

  if (input.exclude_event_id) {
    query = query.neq('id', input.exclude_event_id)
  }

  const { data, error } = await query
  if (error || !data) return []

  const normalizedOccasion = input.occasion?.trim().toLowerCase() || ''
  const normalizedCity = input.location_city?.trim().toLowerCase() || ''
  const normalizedServeTime = input.serve_time?.trim() || ''

  return (data as any[])
    .map((event) => {
      const sameClient = input.client_id && event.client_id === input.client_id
      const sameTime = normalizedServeTime && event.serve_time === normalizedServeTime
      const sameOccasion =
        normalizedOccasion && (event.occasion || '').trim().toLowerCase() === normalizedOccasion
      const sameCity =
        normalizedCity && (event.location_city || '').trim().toLowerCase() === normalizedCity

      if (sameClient && sameTime) return { ...event, reason: 'same client and start time' }
      if (sameClient && sameOccasion) return { ...event, reason: 'same client and occasion' }
      if (sameOccasion && sameCity) return { ...event, reason: 'same occasion and city' }
      return null
    })
    .filter(Boolean) as DuplicateEventCandidate[]
}

export async function findDuplicateEventCandidates(input: {
  client_id?: string | null
  event_date?: string | null
  serve_time?: string | null
  occasion?: string | null
  location_city?: string | null
  exclude_event_id?: string | null
}): Promise<DuplicateEventCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  return findDuplicateEventCandidatesForTenant(db, user.tenantId!, input)
}

/**
 * Create event (chef-only)
 * Status starts as 'draft'
 */
export async function createEvent(input: CreateEventInput) {
  const user = await requireChef()

  // Validate input
  const validated = CreateEventSchema.parse(input)

  // Warn on past-date events (not a hard block - chefs sometimes back-date)
  const eventDate = new Date(validated.event_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPastDate = eventDate < today
  if (isPastDate) {
    console.warn(`[createEvent] Event created with past date: ${validated.event_date}`)
  }

  const db: any = createServerClient()

  const normalizedLocationAddress = normalizeLocationTruthValue(validated.location_address)
  const normalizedLocationCity = normalizeLocationTruthValue(validated.location_city)
  const normalizedLocationState = normalizeLocationTruthValue(validated.location_state)
  const normalizedLocationZip = normalizeLocationTruthValue(validated.location_zip)
  const normalizedServeTime = normalizeEventTimeTruthValue(validated.serve_time)
  const normalizedArrivalTime = normalizeEventTimeTruthValue(validated.arrival_time)
  const normalizedDepartureTime = normalizeEventTimeTruthValue(validated.departure_time)
  const normalizedEventTimezone = normalizeEventTimezoneTruthValue(validated.event_timezone)
  const hasMeaningfulLocation =
    normalizedLocationAddress !== null ||
    normalizedLocationCity !== null ||
    normalizedLocationState !== null ||
    normalizedLocationZip !== null

  // Verify client belongs to this tenant (include dietary data for fallback)
  const { data: client } = await db
    .from('clients')
    .select('tenant_id, dietary_restrictions, allergies')
    .eq('id', validated.client_id)
    .single()

  if (!client || client.tenant_id !== user.tenantId) {
    throw new AuthError('Client not found or does not belong to your tenant')
  }

  const duplicateCandidates = await findDuplicateEventCandidatesForTenant(db, user.tenantId!, {
    client_id: validated.client_id,
    event_date: validated.event_date,
    serve_time: normalizedServeTime,
    occasion: validated.occasion,
    location_city: normalizedLocationCity,
  })
  if (duplicateCandidates.length > 0) {
    console.warn('[createEvent] Possible duplicate event created after warning path', {
      duplicate_ids: duplicateCandidates.map((candidate) => candidate.id),
    })
  }

  // Seed ambiance from client taste profile (non-blocking, best-effort)
  let clientAmbianceDefault: string | null = null
  try {
    const { data: tasteProfile } = await db
      .from('client_taste_profiles')
      .select('ambiance_preferences')
      .eq('client_id', validated.client_id)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()
    clientAmbianceDefault = (tasteProfile as any)?.ambiance_preferences ?? null
  } catch {
    // Non-blocking: taste profile lookup failure doesn't block event creation
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'events.create',
    idempotencyKey: validated.idempotency_key,
    execute: async () => {
      // Create event (status defaults to 'draft' in DB)
      const insertPayload: Record<string, unknown> = {
        tenant_id: user.tenantId!,
        client_id: validated.client_id,
        event_date: validated.event_date,
        serve_time: normalizedServeTime,
        guest_count: validated.guest_count,
        location_address: normalizedLocationAddress,
        location_city: normalizedLocationCity,
        location_state: normalizedLocationState,
        location_zip: normalizedLocationZip,
        occasion: validated.occasion,
        service_style: validated.service_style,
        pricing_model:
          validated.pricing_model ?? (validated.quoted_price_cents ? 'flat_rate' : null),
        quoted_price_cents: validated.quoted_price_cents,
        deposit_amount_cents: validated.deposit_amount_cents,
        dietary_restrictions: validated.dietary_restrictions?.length
          ? validated.dietary_restrictions
          : (client.dietary_restrictions as string[]) || [],
        allergies: validated.allergies?.length
          ? validated.allergies
          : (client.allergies as string[]) || [],
        special_requests: validated.special_requests,
        site_notes: validated.site_notes,
        access_instructions: validated.access_instructions,
        kitchen_notes: validated.kitchen_notes,
        location_notes: validated.location_notes,
        arrival_time: normalizedArrivalTime,
        departure_time: normalizedDepartureTime,
        cannabis_preference: validated.cannabis_preference,
        location_lat: hasMeaningfulLocation ? (validated.location_lat ?? null) : null,
        location_lng: hasMeaningfulLocation ? (validated.location_lng ?? null) : null,
        referral_partner_id: validated.referral_partner_id ?? null,
        partner_location_id: validated.partner_location_id ?? null,
        event_timezone: normalizedEventTimezone,
        ambiance_notes: clientAmbianceDefault,
        created_by: user.id,
        updated_by: user.id,
      }

      const { data: event, error } = await db
        .from('events')
        .insert(insertPayload as any)
        .select()
        .single()

      if (error) {
        console.error('[createEvent] Error:', error)
        throw new UnknownAppError('Failed to create event')
      }

      // Log initial transition to 'draft'
      await db.from('event_state_transitions').insert({
        tenant_id: user.tenantId!,
        event_id: event.id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: user.id,
        metadata: { action: 'event_created' },
      })

      revalidatePath('/events')
      revalidatePath('/dashboard')
      revalidatePath('/my-events')
      revalidatePath('/calendar')
      invalidateRemyContextCache(user.tenantId!)
      return { success: true, event }
    },
  })

  await executeInteraction({
    action_type: 'create_event',
    actor_id: user.id,
    actor: { role: 'chef', actorId: user.id, entityId: user.entityId, tenantId: user.tenantId },
    target_type: 'event',
    target_id: result.event.id,
    context_type: 'client',
    context_id: validated.client_id,
    visibility: 'private',
    metadata: {
      tenant_id: user.tenantId!,
      client_id: validated.client_id,
      event_id: result.event.id,
      source: 'event_create',
      suppress_interaction_notifications: true,
      suppress_interaction_activity: true,
      suppress_interaction_automation: true,
    },
    idempotency_key: `create_event:${result.event.id}`,
  })

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const clientName = (result.event as any).client?.full_name || 'client'
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'event_created',
      domain: 'event',
      entityType: 'event',
      entityId: result.event.id,
      summary: `Created event: ${validated.occasion || 'Untitled'} for ${clientName}`,
      context: {
        client_name: clientName,
        event_date: validated.event_date,
        guest_count: validated.guest_count,
        occasion: validated.occasion,
      },
      clientId: validated.client_id,
    })
  } catch (err) {
    console.error('[createEvent] Activity log failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'event.created', {
      event_id: result.event.id,
      occasion: validated.occasion || null,
      event_date: validated.event_date,
      guest_count: validated.guest_count,
      client_id: validated.client_id,
    })
  } catch (err) {
    console.error('[createEvent] Webhook dispatch failed (non-blocking):', err)
  }

  return result
}

/**
 * Get events list (chef-only, tenant-scoped by RLS)
 */
export async function getEvents() {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('events')
      .select(
        `
      *,
      client:clients(id, full_name, email),
      referral_partner:referral_partners(id, name),
      partner_location:partner_locations(id, name, city, state)
    `
      )
      .eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.order('event_date', { ascending: true }).limit(2000)
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: events, error } = response

  if (error) {
    console.error('[getEvents] Error:', error)
    throw new UnknownAppError('Failed to fetch events')
  }

  return events
}

/**
 * Get single event by ID.
 * Access is enforced entirely by RLS:
 *   - Event owners via the existing tenant_id policy
 *   - Accepted collaborators via the collaborators_can_view_events policy (migration 20260304000008)
 * The explicit tenant_id filter has been removed so both groups can load the page.
 */
export async function getEventById(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const adminDb: any = createServerClient({ admin: true })

  const runBaseQuery = async (client: any, withSoftDeleteFilter: boolean, tenantId?: string) => {
    let query = client.from('events').select('*').eq('id', eventId)
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.maybeSingle()
  }

  let ownerResponse = await runBaseQuery(adminDb, true, user.tenantId ?? user.entityId)
  if (isMissingSoftDeleteColumn(ownerResponse.error)) {
    ownerResponse = await runBaseQuery(adminDb, false, user.tenantId ?? user.entityId)
  }

  let event = ownerResponse.data
  let error = ownerResponse.error

  // Collaborators still need the route. Fall back to the RLS-scoped read path
  // only after the explicit owner query misses.
  if (!event) {
    let collaboratorResponse = await runBaseQuery(db, true)
    if (isMissingSoftDeleteColumn(collaboratorResponse.error)) {
      collaboratorResponse = await runBaseQuery(db, false)
    }
    event = collaboratorResponse.data
    error = collaboratorResponse.error
  }

  if (error || !event) {
    if (error) {
      console.error('[getEventById] Error:', error)
    }
    return null
  }

  const [clientResponse, referralPartnerResponse, partnerLocationResponse] = await Promise.all([
    event.client_id
      ? adminDb
          .from('clients')
          .select('id, full_name, email, phone')
          .eq('id', event.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    event.referral_partner_id
      ? adminDb
          .from('referral_partners')
          .select('id, name')
          .eq('id', event.referral_partner_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    event.partner_location_id
      ? adminDb
          .from('partner_locations')
          .select('id, name, city, state')
          .eq('id', event.partner_location_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    ...event,
    client: clientResponse.data ?? null,
    referral_partner: referralPartnerResponse.data ?? null,
    partner_location: partnerLocationResponse.data ?? null,
  }
}

/**
 * Update event (chef-only, ONLY safe fields, NOT status)
 * Status changes go through transitionEvent()
 */
export async function updateEvent(eventId: string, input: UpdateEventInput) {
  const user = await requireChef()

  // Validate input
  const validated = UpdateEventSchema.parse(input)
  const { expected_updated_at, idempotency_key, ...updateFields } = validated
  const normalizedUpdateFields: Record<string, unknown> = {
    ...updateFields,
  }

  if (Object.prototype.hasOwnProperty.call(updateFields, 'location_address')) {
    normalizedUpdateFields.location_address = normalizeLocationTruthValue(
      updateFields.location_address
    )
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'location_city')) {
    normalizedUpdateFields.location_city = normalizeLocationTruthValue(updateFields.location_city)
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'location_state')) {
    normalizedUpdateFields.location_state = normalizeLocationTruthValue(updateFields.location_state)
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'location_zip')) {
    normalizedUpdateFields.location_zip = normalizeLocationTruthValue(updateFields.location_zip)
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'serve_time')) {
    normalizedUpdateFields.serve_time = normalizeEventTimeTruthValue(updateFields.serve_time)
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'arrival_time')) {
    normalizedUpdateFields.arrival_time = normalizeEventTimeTruthValue(updateFields.arrival_time)
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'departure_time')) {
    normalizedUpdateFields.departure_time = normalizeEventTimeTruthValue(
      updateFields.departure_time
    )
  }
  if (Object.prototype.hasOwnProperty.call(updateFields, 'event_timezone')) {
    normalizedUpdateFields.event_timezone = normalizeEventTimezoneTruthValue(
      updateFields.event_timezone
    )
  }

  const db: any = createServerClient()

  // Fetch current event to verify ownership and status
  const { data: currentEvent } = await (db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!currentEvent || (currentEvent as any).deleted_at) {
    throw new ValidationError('Event not found')
  }

  const touchedLocationFields = [
    'location_address',
    'location_city',
    'location_state',
    'location_zip',
  ].some((field) => Object.prototype.hasOwnProperty.call(normalizedUpdateFields, field))

  if (touchedLocationFields) {
    const effectiveLocationValues = [
      Object.prototype.hasOwnProperty.call(normalizedUpdateFields, 'location_address')
        ? (normalizedUpdateFields.location_address as string | null | undefined)
        : ((currentEvent as any).location_address as string | null | undefined),
      Object.prototype.hasOwnProperty.call(normalizedUpdateFields, 'location_city')
        ? (normalizedUpdateFields.location_city as string | null | undefined)
        : ((currentEvent as any).location_city as string | null | undefined),
      Object.prototype.hasOwnProperty.call(normalizedUpdateFields, 'location_state')
        ? (normalizedUpdateFields.location_state as string | null | undefined)
        : ((currentEvent as any).location_state as string | null | undefined),
      Object.prototype.hasOwnProperty.call(normalizedUpdateFields, 'location_zip')
        ? (normalizedUpdateFields.location_zip as string | null | undefined)
        : ((currentEvent as any).location_zip as string | null | undefined),
    ]

    const hasMeaningfulLocation = effectiveLocationValues.some(
      (value) => value !== null && value !== undefined && String(value).trim().length > 0
    )

    if (!hasMeaningfulLocation) {
      normalizedUpdateFields.location_lat = null
      normalizedUpdateFields.location_lng = null
    }
  }

  // Only allow updates if event is in draft or proposed state
  if (!['draft', 'proposed'].includes(currentEvent.status)) {
    throw new ValidationError('Cannot update event after it has been accepted')
  }

  const pricingFields = ['pricing_model', 'quoted_price_cents', 'deposit_amount_cents'] as const
  const isPricingFieldUpdate = pricingFields.some((field) =>
    Object.prototype.hasOwnProperty.call(normalizedUpdateFields, field)
  )

  if (isPricingFieldUpdate) {
    const convertingQuoteId = (currentEvent as any).converting_quote_id as string | null
    let acceptedQuoteExists = false

    if (convertingQuoteId) {
      const { data: acceptedConvertingQuote } = await db
        .from('quotes')
        .select('id')
        .eq('id', convertingQuoteId)
        .eq('tenant_id', user.tenantId!)
        .eq('status', 'accepted')
        .is('deleted_at' as any, null)
        .maybeSingle()

      acceptedQuoteExists = !!acceptedConvertingQuote
    }

    if (!acceptedQuoteExists) {
      const { data: acceptedLinkedQuote } = await db
        .from('quotes')
        .select('id')
        .eq('event_id', eventId)
        .eq('tenant_id', user.tenantId!)
        .eq('status', 'accepted')
        .is('deleted_at' as any, null)
        .limit(1)
        .maybeSingle()

      acceptedQuoteExists = !!acceptedLinkedQuote
    }

    if (acceptedQuoteExists) {
      throw new ValidationError(
        'Pricing is locked to the accepted quote. Revise and resend a new quote to change pricing.'
      )
    }
  }

  const _currentEventTs =
    currentEvent.updated_at instanceof Date
      ? currentEvent.updated_at.toISOString()
      : String(currentEvent.updated_at)
  if (expected_updated_at && _currentEventTs !== expected_updated_at) {
    throw createConflictError('This record changed elsewhere.', _currentEventTs)
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'events.update',
    idempotencyKey: idempotency_key,
    execute: async () => {
      // Update event (RLS enforces tenant_id match)
      const runUpdate = async (withSoftDeleteFilter: boolean) => {
        let query = db
          .from('events')
          .update({
            ...normalizedUpdateFields,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId)
          .eq('tenant_id', user.tenantId!)
        if (withSoftDeleteFilter) {
          query = query.is('deleted_at' as any, null)
        }
        if (expected_updated_at) {
          query = query.eq('updated_at', expected_updated_at)
        }
        return query.select().single()
      }

      let response = await runUpdate(true)
      if (isMissingSoftDeleteColumn(response.error)) {
        response = await runUpdate(false)
      }
      const { data: event, error } = response

      if (error || !event) {
        if (expected_updated_at) {
          const getLatest = async (withSoftDeleteFilter: boolean) => {
            let query = db
              .from('events')
              .select('updated_at')
              .eq('id', eventId)
              .eq('tenant_id', user.tenantId!)
            if (withSoftDeleteFilter) {
              query = query.is('deleted_at' as any, null)
            }
            return query.maybeSingle()
          }

          let latestResponse = await getLatest(true)
          if (isMissingSoftDeleteColumn(latestResponse.error)) {
            latestResponse = await getLatest(false)
          }
          const latest = latestResponse.data

          const _latestTs =
            latest.updated_at instanceof Date
              ? latest.updated_at.toISOString()
              : String(latest.updated_at)
          if (latest?.updated_at && _latestTs !== expected_updated_at) {
            throw createConflictError('This record changed elsewhere.', _latestTs)
          }
        }

        console.error('[updateEvent] Error:', error)
        throw new UnknownAppError('Failed to update event')
      }

      revalidatePath('/events')
      revalidatePath(`/events/${eventId}`)
      revalidatePath('/my-events')
      revalidatePath(`/my-events/${eventId}`)
      revalidatePath('/dashboard')
      revalidatePath('/scheduling')
      revalidatePath('/calendar')
      invalidateRemyContextCache(user.tenantId!)

      const updatedDate = (event as any).event_date ?? null
      const updatedTime = (event as any).serve_time ?? null
      if (
        currentEvent &&
        ((currentEvent as any).event_date !== updatedDate ||
          (currentEvent as any).serve_time !== updatedTime)
      ) {
        try {
          const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
          const dateStr = updatedDate
            ? new Date(updatedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : 'TBD'
          await circleFirstNotify({
            eventId: eventId,
            inquiryId: null,
            notificationType: 'guest_count_updated',
            body: `The event date has been updated to ${dateStr}${updatedTime ? ` at ${updatedTime}` : ''}.`,
            metadata: {
              type: 'date_changed',
              old_date: (currentEvent as any).event_date,
              new_date: updatedDate,
              old_time: (currentEvent as any).serve_time,
              new_time: updatedTime,
            },
          })
        } catch (err) {
          console.error('[updateEvent] Circle date-change notification failed (non-blocking):', err)
        }
      }

      // EC-G9 fix: if event_date changed, notify collaborators (non-blocking)
      if (updateFields.event_date && updateFields.event_date !== currentEvent.event_date) {
        try {
          const collabDb: any = createServerClient()
          const { data: collabs } = await collabDb
            .from('event_collaborators')
            .select('chef_id')
            .eq('event_id', eventId)
            .neq('chef_id', user.tenantId!)

          if (collabs && collabs.length > 0) {
            const { createChefNotification } = await import('@/lib/notifications/chef-actions')
            for (const c of collabs) {
              await createChefNotification({
                tenantId: c.chef_id,
                category: 'event',
                action: 'schedule_change',
                title: 'Event date changed',
                body: `"${event.occasion || 'Event'}" moved to ${updateFields.event_date}`,
                actionUrl: `/events/${eventId}`,
                eventId,
              }).catch(() => {})
            }
          }
        } catch (err) {
          console.error('[non-blocking] Collaborator date-change notification failed', err)
        }

        // EC-G10 fix: shift prep blocks by the same date delta (non-blocking)
        try {
          const oldDate = new Date(currentEvent.event_date + 'T00:00:00')
          const newDate = new Date(updateFields.event_date + 'T00:00:00')
          const deltaDays = Math.round(
            (newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (deltaDays !== 0) {
            const prepDb: any = createServerClient()
            const { data: blocks } = await prepDb
              .from('event_prep_blocks')
              .select('id, block_date')
              .eq('event_id', eventId)
              .eq('chef_id', user.tenantId!)

            if (blocks && blocks.length > 0) {
              for (const block of blocks) {
                const bd = new Date(block.block_date + 'T00:00:00')
                bd.setDate(bd.getDate() + deltaDays)
                const shifted = bd.toISOString().slice(0, 10)
                await prepDb
                  .from('event_prep_blocks')
                  .update({ block_date: shifted })
                  .eq('id', block.id)
                  .eq('chef_id', user.tenantId!)
              }
              revalidatePath('/scheduling')
            }
          }
        } catch (err) {
          console.error('[non-blocking] Prep block date shift failed', err)
        }
      }

      // Log chef activity (non-blocking)
      try {
        const { logChefActivity } = await import('@/lib/activity/log-chef')
        const changedFields = Object.keys(updateFields)
        const fieldDiffs = Object.fromEntries(
          changedFields.map((field) => [
            field,
            {
              before: (currentEvent as Record<string, unknown>)[field] ?? null,
              after: (event as Record<string, unknown>)[field] ?? null,
            },
          ])
        )
        await logChefActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'event_updated',
          domain: 'event',
          entityType: 'event',
          entityId: eventId,
          summary: `Updated event: ${event.occasion || 'Untitled'} - ${changedFields.join(', ')}`,
          context: {
            occasion: event.occasion,
            changed_fields: changedFields,
            field_diffs: fieldDiffs,
          },
          clientId: event.client_id,
        })
      } catch (err) {
        console.error('[updateEvent] Activity log failed (non-blocking):', err)
      }

      return { success: true, event }
    },
  })

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'event.updated', {
      event_id: eventId,
      changed_fields: Object.keys(updateFields),
    })
  } catch (err) {
    console.error('[updateEvent] Webhook dispatch failed (non-blocking):', err)
  }

  return result
}

/**
 * Delete event (chef-only)
 * Only allow delete if in draft status
 */
export async function deleteEvent(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event exists and is draft
  const { data: event } = await (db
    .from('events')
    .select('status, deleted_at')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!event || event.deleted_at) {
    throw new ValidationError('Event not found')
  }

  if (event.status !== 'draft') {
    throw new ValidationError('Can only delete events in draft status')
  }

  // Soft delete event
  const { error } = await db
    .from('events')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    } as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[deleteEvent] Error:', error)
    throw new UnknownAppError('Failed to delete event')
  }

  revalidatePath('/events')
  invalidateRemyContextCache(user.tenantId!)

  // Activity log (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'event_deleted',
      domain: 'event',
      entityType: 'event',
      entityId: eventId,
      summary: 'Deleted draft event',
    })
  } catch (err) {
    console.error('[deleteEvent] Activity log failed (non-blocking):', err)
  }

  return { success: true }
}

/**
 * Restore a soft-deleted event (chef-only)
 */
export async function restoreEvent(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_by: user.id,
    } as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreEvent] Error:', error)
    throw new UnknownAppError('Failed to restore event')
  }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// --- Event Closure Functions ---

export type EventClosureStatus = {
  aarFiled: boolean
  resetComplete: boolean
  followUpSent: boolean
  financiallyClosed: boolean
  allComplete: boolean
}

/**
 * Get closure status for a completed event
 * Returns which post-event requirements are met/pending
 */
export async function getEventClosureStatus(eventId: string): Promise<EventClosureStatus> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('aar_filed, reset_complete, follow_up_sent, financially_closed')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !event) {
    throw new ValidationError('Event not found')
  }

  return {
    aarFiled: event.aar_filed,
    resetComplete: event.reset_complete,
    followUpSent: event.follow_up_sent,
    financiallyClosed: event.financially_closed,
    allComplete:
      event.aar_filed && event.reset_complete && event.follow_up_sent && event.financially_closed,
  }
}

/**
 * Mark post-service reset as complete
 * (cooler cleaned, equipment put away, laundry started, car cleared)
 */
export async function markResetComplete(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new ValidationError('Event not found')

  const { error } = await db
    .from('events')
    .update({
      reset_complete: true,
      reset_completed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[markResetComplete] Error:', error)
    throw new UnknownAppError('Failed to mark reset complete')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Mark follow-up as sent (thank-you message to client)
 */
export async function markFollowUpSent(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new ValidationError('Event not found')

  const { error } = await db
    .from('events')
    .update({
      follow_up_sent: true,
      follow_up_sent_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[markFollowUpSent] Error:', error)
    throw new UnknownAppError('Failed to mark follow-up sent')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get events needing closure (completed but missing AAR/reset/follow-up/financial closure)
 */
export async function getEventsNeedingClosure() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .is('deleted_at' as any, null)
    .or(
      'aar_filed.eq.false,reset_complete.eq.false,follow_up_sent.eq.false,financially_closed.eq.false'
    )
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getEventsNeedingClosure] Error:', error)
    return []
  }

  return events
}

function getActiveEventActivity(event: {
  shopping_started_at: string | null
  shopping_completed_at: string | null
  prep_started_at: string | null
  prep_completed_at: string | null
  reset_started_at: string | null
  reset_completed_at: string | null
  travel_started_at: string | null
  travel_completed_at: string | null
  service_started_at: string | null
  service_completed_at: string | null
}): EventTimeActivityType | null {
  for (const activity of EVENT_TIME_ACTIVITY_TYPES) {
    const config = EVENT_TIME_ACTIVITY_CONFIG[activity]
    const startedAt = event[config.startedAtColumn]
    const completedAt = event[config.completedAtColumn]
    if (startedAt && !completedAt) {
      return activity
    }
  }

  return null
}

/**
 * Start a chef work phase timer on an event.
 * One phase can be active at a time to keep tracking simple.
 */
export async function startEventActivity(eventId: string, activityInput: EventTimeActivityType) {
  const user = await requireChef()
  const activity = EventTimeActivitySchema.parse(activityInput)
  const db: any = createServerClient()

  const { data: event, error: fetchError } = await db
    .from('events')
    .select(
      `
      id, tenant_id, client_id, occasion,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      reset_started_at, reset_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !event) {
    throw new ValidationError('Event not found')
  }

  const activeActivity = getActiveEventActivity(event)
  if (activeActivity && activeActivity !== activity) {
    throw new ValidationError(
      `${getEventActivityLabel(activeActivity)} is already running. Stop it before starting ${getEventActivityLabel(activity)}.`
    )
  }

  if (activeActivity === activity) {
    return { success: true, startedAt: event[EVENT_TIME_ACTIVITY_CONFIG[activity].startedAtColumn] }
  }

  const nowIso = new Date().toISOString()
  const config = EVENT_TIME_ACTIVITY_CONFIG[activity]

  const updatePayload: Record<string, string | null> = {
    [config.startedAtColumn]: nowIso,
    [config.completedAtColumn]: null,
    updated_by: user.id,
  }

  const { error: updateError } = await db
    .from('events')
    .update(updatePayload as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[startEventActivity] Error:', updateError)
    throw new UnknownAppError('Failed to start activity timer')
  }

  revalidatePath(`/events/${eventId}`)

  // Non-blocking activity log
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'event_updated',
      domain: 'operational',
      entityType: 'event',
      entityId: eventId,
      summary: `Started ${getEventActivityLabel(activity).toLowerCase()} timer for ${event.occasion || 'event'}`,
      context: {
        event_id: eventId,
        activity,
        started_at: nowIso,
      },
      clientId: event.client_id,
    })
  } catch {
    // non-fatal
  }

  return { success: true, startedAt: nowIso }
}

/**
 * Stop a chef work phase timer and add elapsed minutes to the event total.
 */
export async function stopEventActivity(eventId: string, activityInput: EventTimeActivityType) {
  const user = await requireChef()
  const activity = EventTimeActivitySchema.parse(activityInput)
  const db: any = createServerClient()

  const config = EVENT_TIME_ACTIVITY_CONFIG[activity]
  const { data: event, error: fetchError } = await db
    .from('events')
    .select(
      `
      id, tenant_id, client_id, occasion,
      ${config.startedAtColumn},
      ${config.completedAtColumn},
      ${config.minutesColumn}
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !event) {
    throw new ValidationError('Event not found')
  }

  const eventRecord = event as Record<string, string | number | null>
  const startedAt = eventRecord[config.startedAtColumn] as string | null
  if (!startedAt) {
    throw new ValidationError(
      `No active ${getEventActivityLabel(activity).toLowerCase()} timer to stop`
    )
  }

  const endedAt = new Date().toISOString()
  const elapsedMinutes = safeDurationMinutes(startedAt, endedAt)
  const currentMinutes = (eventRecord[config.minutesColumn] as number | null) ?? 0
  const totalMinutes = currentMinutes + elapsedMinutes

  const updatePayload: Record<string, string | number | null> = {
    [config.startedAtColumn]: null,
    [config.completedAtColumn]: endedAt,
    [config.minutesColumn]: totalMinutes,
    updated_by: user.id,
  }

  const { error: updateError } = await db
    .from('events')
    .update(updatePayload as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[stopEventActivity] Error:', updateError)
    throw new UnknownAppError('Failed to stop activity timer')
  }

  revalidatePath(`/events/${eventId}`)

  // Non-blocking activity log
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'event_updated',
      domain: 'operational',
      entityType: 'event',
      entityId: eventId,
      summary: `Stopped ${getEventActivityLabel(activity).toLowerCase()} timer (+${elapsedMinutes}m)`,
      context: {
        event_id: eventId,
        activity,
        started_at: startedAt,
        ended_at: endedAt,
        elapsed_minutes: elapsedMinutes,
        total_minutes: totalMinutes,
      },
      clientId: event.client_id,
    })
  } catch {
    // non-fatal
  }

  return {
    success: true,
    elapsedMinutes,
    totalMinutes,
    endedAt,
  }
}

/**
 * Update time tracking and card fields on an event
 */
export async function updateEventTimeAndCard(
  eventId: string,
  data: {
    time_shopping_minutes?: number | null
    time_prep_minutes?: number | null
    time_travel_minutes?: number | null
    time_service_minutes?: number | null
    time_reset_minutes?: number | null
    payment_card_used?: string | null
    card_cashback_percent?: number | null
  }
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update(data)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateEventTimeAndCard] Error:', error)
    throw new UnknownAppError('Failed to update event')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Log standalone charity/volunteer hours for the chef.
 * Stored in chef_activity_log so it appears in Activity feed.
 */
export async function logCharityHours(input: LogCharityHoursInput) {
  const user = await requireChef()
  const validated = LogCharityHoursSchema.parse(input)

  const _tnl = new Date()
  const loggedFor =
    validated.logged_for ??
    `${_tnl.getFullYear()}-${String(_tnl.getMonth() + 1).padStart(2, '0')}-${String(_tnl.getDate()).padStart(2, '0')}`
  const note = validated.note?.trim() || null

  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'charity_hours_logged',
      domain: 'operational',
      entityType: 'charity_hours',
      summary: `Logged charity hours: ${formatMinutesAsDuration(validated.minutes)}`,
      context: {
        minutes: validated.minutes,
        logged_for: loggedFor,
        note,
      },
    })
  } catch (err) {
    console.error('[logCharityHours] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/activity')
  revalidatePath('/dashboard')

  return {
    success: true,
    minutes: validated.minutes,
    loggedFor,
  }
}

/**
 * Set (or clear) an explicit food cost budget for an event.
 * Pass null to revert to the formula-derived guardrail.
 */
export async function setEventFoodCostBudget(eventId: string, budgetCents: number | null) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate the budget amount when provided
  if (budgetCents !== null && (budgetCents < 0 || !Number.isInteger(budgetCents))) {
    return { success: false, error: 'Budget must be a non-negative integer (cents)' }
  }

  const { error } = await db
    .from('events')
    .update({ food_cost_budget_cents: budgetCents })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setEventFoodCostBudget]', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// Inquiry Pipeline Server Actions
// Chef-only: Track inquiries from all channels through qualification to booking
// Adapts spec requirements to actual DB schema (confirmed_* fields, unknown_fields JSON)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import { createConflictError } from '@/lib/mutations/conflict'
import { UnknownAppError, ValidationError } from '@/lib/errors/app-error'
import { isMissingSoftDeleteColumn } from '@/lib/mutations/soft-delete-compat'
import { dateToDateString } from '@/lib/utils/format'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { ScheduleRequestSchema } from '@/lib/booking/schedule-schema'
import { checkSeriesSessionConflicts } from '@/lib/availability/actions'
import {
  buildSeriesSchedulePlan,
  getDefaultServeTimeForMealSlot,
} from '@/lib/booking/series-planning'
import {
  resolveInquiryDateForEvent,
  inferEventTimesFromConversation,
  parseCityStateFromConversation,
  buildAutoMenuCourseNamesFromConversation,
} from '@/lib/inquiries/conversation-scaffold'

type InquiryStatus = Database['public']['Enums']['inquiry_status']
type InquiryChannel = Database['public']['Enums']['inquiry_channel']
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

// Valid transitions map (matches DB trigger in 20260330000088)
// Skip paths: new -> quoted and awaiting_client -> quoted allow quote-sending
// to advance an inquiry even if manual statuses were skipped.
const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['awaiting_client', 'quoted', 'declined'],
  awaiting_client: ['awaiting_chef', 'quoted', 'declined', 'expired'],
  awaiting_chef: ['awaiting_client', 'quoted', 'declined'],
  quoted: ['confirmed', 'declined', 'expired'],
  confirmed: [], // terminal - converts to event
  declined: [], // terminal
  expired: ['new'], // can be reopened
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateInquirySchema = z.object({
  channel: z.enum([
    'text',
    'email',
    'instagram',
    'take_a_chef',
    'yhangry',
    'phone',
    'website',
    'referral',
    'walk_in',
    'other',
  ]),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1, 'Client name required'),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  referral_partner_id: z.string().uuid().nullable().optional(),
  partner_location_id: z.string().uuid().nullable().optional(),
  confirmed_date: z.string().optional().or(z.literal('')),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().optional().or(z.literal('')),
  confirmed_occasion: z.string().optional().or(z.literal('')),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  confirmed_service_expectations: z.string().optional().or(z.literal('')),
  confirmed_cannabis_preference: z.string().optional().or(z.literal('')),
  source_message: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  referral_source: z.string().optional().or(z.literal('')),
  idempotency_key: z.string().optional(),
})

const UpdateInquirySchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  confirmed_date: z.string().nullable().optional(),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().nullable().optional(),
  confirmed_occasion: z.string().nullable().optional(),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  confirmed_service_expectations: z.string().nullable().optional(),
  confirmed_cannabis_preference: z.string().nullable().optional(),
  source_message: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  next_action_required: z.string().nullable().optional(),
  next_action_by: z.string().nullable().optional(),
  follow_up_due_at: z.string().nullable().optional(),
  discussed_dishes: z.array(z.string()).nullable().optional(),
  selected_tier: z.string().nullable().optional(),
  expected_updated_at: z.string().optional(),
  idempotency_key: z.string().optional(),
})

export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>
export type UpdateInquiryInput = z.infer<typeof UpdateInquirySchema>

function inferComponentCategoryFromDishName(
  dishName: string
): Database['public']['Enums']['component_category'] {
  const value = dishName.toLowerCase()
  if (/\b(sauce|jus|vinaigrette|aioli|broth|glaze)\b/.test(value)) return 'sauce'
  if (/\b(steak|beef|ribeye|lobster|fish|haddock|chicken|duck|pork|shrimp|protein)\b/.test(value))
    return 'protein'
  if (/\b(potato|rice|grain|pasta|starch)\b/.test(value)) return 'starch'
  if (/\b(salad|vegetable|veggie|squash|broccoli|tomato|pickle)\b/.test(value)) return 'vegetable'
  if (/\b(berry|fruit|peach|apple|pear|citrus)\b/.test(value)) return 'fruit'
  if (/\b(cake|mousse|dessert|cheesecake|tart|custard|gelato)\b/.test(value)) return 'dessert'
  if (/\b(garnish|herb)\b/.test(value)) return 'garnish'
  if (/\b(bread|toast)\b/.test(value)) return 'bread'
  if (/\b(cheese|parmesan|ricotta|goat)\b/.test(value)) return 'cheese'
  if (/\b(condiment|mustard|ketchup|relish)\b/.test(value)) return 'condiment'
  if (/\b(drink|cocktail|wine|beverage)\b/.test(value)) return 'beverage'
  return 'other'
}

function mapCannabisPreferenceToBoolean(value?: string | null): boolean | null {
  if (!value) return null
  return ['yes', 'true', 'open'].some((option) => value.toLowerCase().includes(option))
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

function mergeSpecialRequestNotes(...notes: Array<string | null | undefined>): string | null {
  const chunks = notes.map((note) => note?.trim()).filter(Boolean)
  if (chunks.length === 0) return null
  return chunks.join('\n\n')
}

async function materializeSeriesSessions(params: {
  db: any
  tenantId: string
  actorId: string
  series: EventSeriesRow
  inquiry: Record<string, any>
  plannedSessions: Array<{
    session_date: string
    meal_slot: Database['public']['Enums']['event_session_meal_slot']
    execution_type: Database['public']['Enums']['event_session_execution_type']
    start_time: string | null
    end_time: string | null
    guest_count: number | null
    notes: string | null
    sort_order: number
  }>
  parsedLocation: { city: string | null; state: string | null }
}): Promise<EventSessionRow[]> {
  const { db, tenantId, actorId, series, inquiry, plannedSessions, parsedLocation } = params

  const { data: existingSessions } = await db
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
      location_state: parsedLocation.state || 'MA',
      location_zip: 'TBD',
      status: 'draft',
      sort_order: session.sort_order,
      notes: session.notes,
      created_by: actorId,
      updated_by: actorId,
    }))

  let insertedSessions: EventSessionRow[] = []
  if (toInsert.length > 0) {
    const { data, error } = await db.from('event_service_sessions').insert(toInsert).select('*')

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

async function materializeSeriesEvents(params: {
  db: any
  tenantId: string
  actorId: string
  inquiry: Record<string, any>
  series: EventSeriesRow
  sessions: EventSessionRow[]
  parsedLocation: { city: string | null; state: string | null }
  serveTimeFallback: string | null
  arrivalTimeFallback: string | null
  quotedPriceCents: number | null
  depositAmountCents: number | null
  pricingModel: Database['public']['Enums']['pricing_model'] | null
}): Promise<EventRow[]> {
  const {
    db,
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
  } = params

  const cannabisBoolean = mapCannabisPreferenceToBoolean(inquiry.confirmed_cannabis_preference)

  const { data: existingEvents } = await db
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
        location_state: session.location_state || parsedLocation.state || 'MA',
        location_zip: session.location_zip || 'TBD',
        occasion: buildSessionOccasionLabel({
          baseOccasion: inquiry.confirmed_occasion,
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
        cannabis_preference: cannabisBoolean,
        created_by: actorId,
        updated_by: actorId,
      }
    })

  let insertedEvents: EventRow[] = []
  if (payload.length > 0) {
    const { data, error } = await db.from('events').insert(payload).select('*')

    if (error) {
      console.error('[materializeSeriesEvents] Event creation error:', error)
      throw new UnknownAppError(`Failed to create events for series: ${error.message}`)
    }
    insertedEvents = (data || []) as EventRow[]
  }

  if (insertedEvents.length > 0) {
    await db.from('event_state_transitions').insert(
      insertedEvents.map((event) => ({
        tenant_id: tenantId,
        event_id: event.id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: actorId,
        metadata: {
          action: 'created_from_series',
          inquiry_id: inquiry.id,
          series_id: series.id,
          source_session_id: event.source_session_id,
        },
      }))
    )

    for (const event of insertedEvents) {
      if (!event.source_session_id) continue
      await db
        .from('event_service_sessions')
        .update({ event_id: event.id, updated_by: actorId })
        .eq('id', event.source_session_id)
        .eq('tenant_id', tenantId)
    }
  }

  return [...((existingEvents || []) as EventRow[]), ...insertedEvents].sort((a, b) => {
    const dateCompare = dateToDateString(a.event_date as Date | string).localeCompare(
      dateToDateString(b.event_date as Date | string)
    )
    if (dateCompare !== 0) return dateCompare
    return dateToDateString(a.created_at as Date | string).localeCompare(
      dateToDateString(b.created_at as Date | string)
    )
  })
}

// ============================================
// 1. CREATE INQUIRY
// ============================================

/**
 * Create inquiry (chef-only)
 * If client_id not provided, auto-link by email match
 * Stores lead contact info in unknown_fields for unlinked inquiries
 */
export async function createInquiry(input: CreateInquiryInput) {
  const user = await requireChef()
  const validated = CreateInquirySchema.parse(input)
  const db: any = createServerClient()

  // Email validation (local-only - no external API call during form submission)
  if (validated.client_email) {
    try {
      const emailCheck = validateEmailLocal(validated.client_email)
      if (!emailCheck.isValid) {
        const suggestion = suggestEmailCorrection(validated.client_email)
        return {
          success: false,
          error: emailCheck.reason || 'Invalid email address',
          emailSuggestion: suggestion || undefined,
        }
      }
    } catch (err) {
      // Non-blocking - if the validator itself fails, let the inquiry through
      console.error('[createInquiry] Email validation failed (non-blocking):', err)
    }
  }

  let clientId = validated.client_id || null

  // Auto-link by email if no client_id provided
  if (!clientId && validated.client_email) {
    const { data: existingClient } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', validated.client_email)
      .single()

    if (existingClient) {
      clientId = existingClient.id
    }
  }

  // Build unknown_fields for unlinked lead info and extra data
  const unknownFields: Record<string, string> = {}
  if (!clientId) {
    unknownFields.client_name = validated.client_name
    if (validated.client_email) unknownFields.client_email = validated.client_email
    if (validated.client_phone) unknownFields.client_phone = validated.client_phone
  }
  if (validated.notes) unknownFields.notes = validated.notes
  if (validated.referral_source) unknownFields.referral_source = validated.referral_source

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'inquiries.create',
    idempotencyKey: validated.idempotency_key,
    execute: async () => {
      const { data: inquiry, error } = await db
        .from('inquiries')
        .insert({
          tenant_id: user.tenantId!,
          channel: validated.channel as any, // 'yhangry' added via migration, not yet in generated types
          client_id: clientId,
          referral_partner_id: validated.referral_partner_id || null,
          partner_location_id: validated.partner_location_id || null,
          first_contact_at: new Date().toISOString(),
          confirmed_date: validated.confirmed_date || null,
          confirmed_guest_count: validated.confirmed_guest_count ?? null,
          confirmed_location: validated.confirmed_location || null,
          confirmed_occasion: validated.confirmed_occasion || null,
          confirmed_budget_cents: validated.confirmed_budget_cents ?? null,
          confirmed_dietary_restrictions: validated.confirmed_dietary_restrictions ?? null,
          confirmed_service_expectations: validated.confirmed_service_expectations || null,
          confirmed_cannabis_preference: validated.confirmed_cannabis_preference || null,
          source_message: validated.source_message || null,
          unknown_fields:
            Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
        })
        .select()
        .single()

      if (error || !inquiry) {
        console.error('[createInquiry] Error:', error)
        throw new UnknownAppError('Failed to create inquiry')
      }

      revalidatePath('/inquiries')
      return { success: true, inquiry }
    },
  })

  const inquiry = result.inquiry

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_created',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: inquiry.id,
      summary: `Created inquiry from ${validated.client_name} via ${validated.channel}`,
      context: {
        client_name: validated.client_name,
        channel: validated.channel,
        occasion: validated.confirmed_occasion,
      },
      clientId: clientId || undefined,
    })
  } catch (err) {
    console.error('[createInquiry] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    const clientName = validated.client_name || 'Unknown'
    const budgetMode = validated.confirmed_budget_cents != null ? 'exact' : 'unset'
    const budgetKnown = budgetMode === 'exact'
    await evaluateAutomations(user.tenantId!, 'inquiry_created', {
      entityId: inquiry.id,
      entityType: 'inquiry',
      fields: {
        channel: validated.channel,
        client_name: clientName,
        occasion: validated.confirmed_occasion || null,
        guest_count: validated.confirmed_guest_count ?? null,
        budget_mode: budgetMode,
        budget_known: budgetKnown,
        budget_range: null,
        budget_cents: validated.confirmed_budget_cents ?? null,
      },
    })
  } catch (err) {
    console.error('[createInquiry] Automation evaluation failed (non-blocking):', err)
  }

  // Enqueue Remy reactive AI task - auto-score lead (non-blocking)
  try {
    const { onInquiryCreated } = await import('@/lib/ai/reactive/hooks')
    await onInquiryCreated(user.tenantId!, inquiry.id, clientId ?? null, {
      channel: validated.channel,
      clientName: validated.client_name,
      occasion: validated.confirmed_occasion ?? undefined,
      budgetCents: validated.confirmed_budget_cents ?? undefined,
      budgetMode: validated.confirmed_budget_cents != null ? 'exact' : 'unset',
      guestCount: validated.confirmed_guest_count ?? undefined,
    })
  } catch (err) {
    console.error('[createInquiry] Remy reactive enqueue failed (non-blocking):', err)
  }

  // Push notification - new inquiry (non-blocking)
  try {
    const { notifyNewInquiry } = await import('@/lib/notifications/onesignal')
    await notifyNewInquiry(user.id, validated.client_name, validated.confirmed_date || 'date TBD')
  } catch (err) {
    console.error('[createInquiry] Push notification failed (non-blocking):', err)
  }

  // Zapier/Make webhook dispatch (non-blocking)
  try {
    const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
    await dispatchWebhookEvent(user.tenantId!, 'inquiry.created', {
      inquiry_id: inquiry.id,
      client_name: validated.client_name,
      channel: validated.channel,
      occasion: validated.confirmed_occasion ?? null,
      date: validated.confirmed_date ?? null,
      guest_count: validated.confirmed_guest_count ?? null,
      budget_cents: validated.confirmed_budget_cents ?? null,
    })
  } catch (err) {
    console.error('[createInquiry] Zapier dispatch failed (non-blocking):', err)
  }

  // Auto-create Dinner Circle (non-blocking)
  try {
    const { createInquiryCircle } = await import('@/lib/hub/inquiry-circle-actions')
    const { postFirstCircleMessage } = await import('@/lib/hub/inquiry-circle-first-message')
    const circle = await createInquiryCircle({
      inquiryId: inquiry.id,
      clientName: validated.client_name,
      clientEmail: validated.client_email || null,
      occasion: validated.confirmed_occasion || null,
    })
    // Post chef's first response in the circle
    await postFirstCircleMessage({
      groupId: circle.groupId,
      inquiryId: inquiry.id,
    })
  } catch (err) {
    console.error('[createInquiry] Circle creation failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'inquiry.received', {
      inquiry_id: inquiry.id,
      client_name: validated.client_name,
      channel: validated.channel,
      occasion: validated.confirmed_occasion ?? null,
      date: validated.confirmed_date ?? null,
      guest_count: validated.confirmed_guest_count ?? null,
      budget_cents: validated.confirmed_budget_cents ?? null,
    })
  } catch (err) {
    console.error('[non-blocking] Webhook dispatch failed', err)
  }

  // Lifecycle detection: seed + detect from initial fields (non-blocking)
  try {
    const { ensureTemplateSeeded } = await import('@/lib/lifecycle/seed')
    const { runFieldDetectionAndUpdate } = await import('@/lib/lifecycle/actions')
    await ensureTemplateSeeded(user.tenantId!)
    await runFieldDetectionAndUpdate(user.tenantId!, inquiry.id, inquiry as any)
  } catch (err) {
    console.error('[createInquiry] Lifecycle detection failed (non-blocking):', err)
  }

  return { success: true, inquiry }
}

// ============================================
// 2. GET INQUIRIES (LIST)
// ============================================

/**
 * Get inquiries (chef-only, tenant-scoped)
 * Joins with clients for display info
 */
export async function getInquiries(filters?: {
  status?: InquiryStatus | InquiryStatus[]
  channel?: InquiryChannel
  dateFrom?: string
  dateTo?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  const buildQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('inquiries')
      .select(
        `
      *,
      client:clients(id, full_name, email, phone)
    `
      )
      .eq('tenant_id', user.tenantId!)

    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.channel) {
      query = query.eq('channel', filters.channel)
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    return query
  }

  let response = await buildQuery(true).order('created_at', { ascending: false })
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await buildQuery(false).order('created_at', { ascending: false })
  }
  const { data: inquiries, error } = response

  if (error) {
    console.error('[getInquiries] Error:', error)
    throw new UnknownAppError('Failed to fetch inquiries')
  }

  return inquiries
}

// ============================================
// 3. GET INQUIRY BY ID
// ============================================

/**
 * Get single inquiry with full transition history
 */
export async function getInquiryById(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('inquiries')
      .select(
        `
      *,
      client:clients(id, full_name, email, phone)
    `
      )
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.single()
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: inquiry, error } = response

  if (error) {
    console.error('[getInquiryById] Error:', error)
    return null
  }

  // Get transition history
  const { data: transitions } = await db
    .from('inquiry_state_transitions')
    .select('*')
    .eq('inquiry_id', id)
    .order('transitioned_at', { ascending: true })

  return { ...inquiry, transitions: transitions || [] }
}

// ============================================
// 4. UPDATE INQUIRY
// ============================================

/**
 * Update inquiry fields (NOT status - use transitionInquiry)
 */
export async function updateInquiry(id: string, input: UpdateInquiryInput) {
  const user = await requireChef()
  const validated = UpdateInquirySchema.parse(input)
  const { expected_updated_at, idempotency_key, ...validatedFields } = validated
  const db: any = createServerClient()

  // Separate unknown_fields data from DB columns
  const { client_name, client_email, client_phone, notes, ...dbFields } = validatedFields

  // Fetch current inquiry to merge unknown_fields
  const { data: current } = await (db
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!current || (current as any).deleted_at) {
    throw new ValidationError('Inquiry not found')
  }

  if (expected_updated_at && current.updated_at !== expected_updated_at) {
    throw createConflictError('This record changed elsewhere.', current.updated_at)
  }

  // Merge unknown_fields
  const existingUnknown = (current.unknown_fields as Record<string, string | undefined>) || {}
  const updatedUnknown: Record<string, string | undefined> = { ...existingUnknown }
  if (client_name !== undefined) updatedUnknown.client_name = client_name
  if (client_email !== undefined) updatedUnknown.client_email = client_email ?? undefined
  if (client_phone !== undefined) updatedUnknown.client_phone = client_phone ?? undefined
  if (notes !== undefined) updatedUnknown.notes = notes ?? undefined

  // Clean out undefined values
  const cleanedUnknown: Record<string, string> = {}
  for (const [k, v] of Object.entries(updatedUnknown)) {
    if (v !== undefined) cleanedUnknown[k] = v
  }

  const result = await executeWithIdempotency({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    actionName: 'inquiries.update',
    idempotencyKey: idempotency_key,
    execute: async () => {
      const runUpdate = async (withSoftDeleteFilter: boolean) => {
        let query = db
          .from('inquiries')
          .update({
            ...dbFields,
            unknown_fields:
              Object.keys(cleanedUnknown).length > 0 ? (cleanedUnknown as unknown as Json) : null,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
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
      const { data: inquiry, error } = response

      if (error || !inquiry) {
        if (expected_updated_at) {
          const getLatest = async (withSoftDeleteFilter: boolean) => {
            let query = db
              .from('inquiries')
              .select('updated_at')
              .eq('id', id)
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

          if (latest?.updated_at && latest.updated_at !== expected_updated_at) {
            throw createConflictError('This record changed elsewhere.', latest.updated_at)
          }
        }

        console.error('[updateInquiry] Error:', error)
        throw new UnknownAppError('Failed to update inquiry')
      }

      revalidatePath('/inquiries')
      revalidatePath(`/inquiries/${id}`)
      return { success: true, inquiry }
    },
  })

  const inquiry = result.inquiry

  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const changedFields = [
      ...Object.keys(dbFields),
      ...Object.keys(cleanedUnknown).map((key) => `unknown_fields.${key}`),
    ]
    const fieldDiffs = Object.fromEntries([
      ...Object.keys(dbFields).map((field) => [
        field,
        {
          before: (current as Record<string, unknown>)[field] ?? null,
          after: (inquiry as Record<string, unknown>)[field] ?? null,
        },
      ]),
      ...Object.keys(cleanedUnknown).map((key) => [
        `unknown_fields.${key}`,
        {
          before: (existingUnknown as Record<string, unknown>)[key] ?? null,
          after: (cleanedUnknown as Record<string, unknown>)[key] ?? null,
        },
      ]),
    ])

    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_updated',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: id,
      summary: `Updated inquiry - ${changedFields.join(', ')}`,
      context: {
        changed_fields: changedFields,
        field_diffs: fieldDiffs,
      },
      clientId: inquiry.client_id ?? undefined,
    })
  } catch (err) {
    console.error('[updateInquiry] Activity log failed (non-blocking):', err)
  }

  // Outbound webhook dispatch (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(user.tenantId!, 'inquiry.updated', {
      inquiry_id: id,
      updated_fields: Object.keys(dbFields),
    })
  } catch (err) {
    console.error('[non-blocking] Webhook dispatch failed', err)
  }

  // Lifecycle detection: re-detect from updated fields (non-blocking)
  try {
    const { runFieldDetectionAndUpdate } = await import('@/lib/lifecycle/actions')
    await runFieldDetectionAndUpdate(user.tenantId!, id, inquiry as any)
  } catch (err) {
    console.error('[updateInquiry] Lifecycle detection failed (non-blocking):', err)
  }

  return result
}

// ============================================
// 5. TRANSITION INQUIRY
// ============================================

/**
 * Transition inquiry status
 * Validates in app code for better error messages
 * DB trigger also enforces and auto-inserts into inquiry_state_transitions
 */
export async function transitionInquiry(id: string, newStatus: InquiryStatus) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current status
  const { data: inquiry } = await (db
    .from('inquiries')
    .select('status, deleted_at, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!inquiry || (inquiry as any).deleted_at) {
    throw new ValidationError('Inquiry not found')
  }

  const currentStatus = inquiry.status as InquiryStatus
  const allowed = VALID_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
        `Allowed: ${allowed?.join(', ') || 'none (terminal state)'}`
    )
  }

  // Build atomic payload: status + follow-up timer in a single UPDATE
  const followUpMap: Record<string, number | null> = {
    awaiting_client: 48 * 60 * 60 * 1000, // 48h
    awaiting_chef: 24 * 60 * 60 * 1000, // 24h
    quoted: 72 * 60 * 60 * 1000, // 72h
    confirmed: null, // terminal
    declined: null, // terminal
    expired: null, // terminal
  }

  const followUpMs = followUpMap[newStatus]
  const updatePayload: Record<string, string | null> = {
    status: newStatus,
    follow_up_due_at: followUpMs != null ? new Date(Date.now() + followUpMs).toISOString() : null,
  }

  if (newStatus === 'awaiting_client') {
    updatePayload.next_action_by = 'client'
    updatePayload.next_action_required = 'Waiting for client response'
  } else if (newStatus === 'awaiting_chef') {
    updatePayload.next_action_by = 'chef'
    updatePayload.next_action_required = 'Chef needs to respond'
  } else if (newStatus === 'quoted') {
    updatePayload.next_action_by = 'client'
    updatePayload.next_action_required = 'Waiting for client to accept quote'
  } else {
    updatePayload.next_action_by = null
    updatePayload.next_action_required = null
  }

  const runUpdate = async (withSoftDeleteFilter: boolean) => {
    let query = db
      .from('inquiries')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query.select().single()
  }

  let updateResponse = await runUpdate(true)
  if (isMissingSoftDeleteColumn(updateResponse.error)) {
    updateResponse = await runUpdate(false)
  }
  const { data: updated, error } = updateResponse

  if (error) {
    console.error('[transitionInquiry] Error:', error)
    throw new UnknownAppError('Failed to transition inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_transitioned',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: id,
      summary: `Moved inquiry from ${currentStatus} → ${newStatus}`,
      context: { from_status: currentStatus, to_status: newStatus },
    })
  } catch (err) {
    console.error('[transitionInquiry] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(user.tenantId!, 'inquiry_status_changed', {
      entityId: id,
      entityType: 'inquiry',
      fields: {
        from_status: currentStatus,
        to_status: newStatus,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('[transitionInquiry] Automation evaluation failed (non-blocking):', err)
  }

  // Non-blocking: notify client of inquiry status change
  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')

      const statusNotifications: Record<
        string,
        { action: string; title: string; body: string; actionUrl: string }
      > = {
        quoted: {
          action: 'inquiry_quoted_to_client',
          title: 'Your quote is ready',
          body: 'A quote has been prepared for your inquiry',
          actionUrl: '/my-quotes',
        },
        declined: {
          action: 'inquiry_declined_to_client',
          title: 'Inquiry update',
          body: 'Your inquiry status has been updated',
          actionUrl: '/my-inquiries',
        },
        expired: {
          action: 'inquiry_expired_to_client',
          title: 'Inquiry expired',
          body: 'Your inquiry has expired - reach out to rebook',
          actionUrl: '/my-inquiries',
        },
      }

      const notif = statusNotifications[newStatus]
      if (notif) {
        await createClientNotification({
          tenantId: user.tenantId!,
          clientId: inquiry.client_id,
          category: newStatus === 'quoted' ? 'quote' : 'inquiry',
          action: notif.action as any,
          title: notif.title,
          body: notif.body,
          actionUrl: notif.actionUrl,
          inquiryId: id,
        })
      }
    }
  } catch (err) {
    console.error('[transitionInquiry] Client notification failed (non-blocking):', err)
  }

  // Client-side cache invalidation
  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${id}`)

  // Lifecycle detection: auto-check status-mapped checkpoints (non-blocking)
  try {
    const { runFieldDetectionAndUpdate } = await import('@/lib/lifecycle/actions')
    await runFieldDetectionAndUpdate(user.tenantId!, id, updated as any)
  } catch (err) {
    console.error('[transitionInquiry] Lifecycle detection failed (non-blocking):', err)
  }

  return { success: true, inquiry: updated }
}

// ============================================
// 6. CONVERT INQUIRY TO SERIES
// ============================================

/**
 * Convert a confirmed multi-day inquiry into:
 * 1) event_series master record
 * 2) event_service_sessions child records
 * 3) draft events linked to each session
 */
export async function createSeriesFromBookingRequest(inquiryId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: inquiry } = await db
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!inquiry) {
    throw new ValidationError('Inquiry not found')
  }

  if (inquiry.status !== 'confirmed') {
    throw new ValidationError('Only confirmed inquiries can be converted to a series')
  }

  if (!inquiry.client_id) {
    throw new ValidationError('Inquiry must be linked to a client before converting to a series')
  }

  if (!inquiry.confirmed_date) {
    throw new ValidationError('Confirmed date is required before converting to a series')
  }

  if (inquiry.service_mode !== 'multi_day') {
    throw new ValidationError('Only multi-day inquiries can be converted to a series')
  }

  const { data: existingSeries } = await db
    .from('event_series')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiry.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: inquiryMessages } = await db
    .from('messages')
    .select('body, sent_at')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiry.id)
    .order('sent_at', { ascending: true })
    .limit(100)

  const conversationText = [
    inquiry.source_message,
    ...(inquiryMessages || []).map((m: { body?: string | null }) => m.body ?? ''),
  ]
    .filter((chunk: string | null | undefined) => Boolean(chunk && chunk.trim().length > 0))
    .join('\n\n')

  const resolvedEventDate = resolveInquiryDateForEvent(
    inquiry.confirmed_date,
    inquiry.first_contact_at
  )
  if (!resolvedEventDate) {
    throw new ValidationError('Confirmed date could not be resolved to a calendar day')
  }

  const { serveTime, arrivalTime } = inferEventTimesFromConversation(conversationText)
  const parsedLocation = parseCityStateFromConversation(
    inquiry.confirmed_location,
    conversationText
  )

  const { data: acceptedQuote } = await db
    .from('quotes')
    .select('id, event_id, total_quoted_cents, deposit_amount_cents, pricing_model')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const quotedPriceCents =
    acceptedQuote?.total_quoted_cents ?? inquiry.confirmed_budget_cents ?? null
  const depositAmountCents = acceptedQuote?.deposit_amount_cents ?? null
  const pricingModel = acceptedQuote?.pricing_model ?? null

  const parsedScheduleRequest = ScheduleRequestSchema.safeParse(
    inquiry.schedule_request_jsonb ?? undefined
  )

  const schedulePlan = buildSeriesSchedulePlan({
    scheduleRequest: parsedScheduleRequest.success ? parsedScheduleRequest.data : null,
    fallbackDate: resolvedEventDate,
    fallbackGuestCount: inquiry.confirmed_guest_count ?? null,
  })

  if (existingSeries) {
    const [sessionsResponse, eventsResponse] = await Promise.all([
      db
        .from('event_service_sessions')
        .select('*')
        .eq('tenant_id', user.tenantId!)
        .eq('series_id', existingSeries.id)
        .order('session_date', { ascending: true })
        .order('sort_order', { ascending: true }),
      db
        .from('events')
        .select('*')
        .eq('tenant_id', user.tenantId!)
        .eq('event_series_id', existingSeries.id)
        .order('event_date', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    const existingSessions = (sessionsResponse.data || []) as EventSessionRow[]
    const sessions =
      existingSessions.length > 0
        ? existingSessions
        : await materializeSeriesSessions({
            db,
            tenantId: user.tenantId!,
            actorId: user.id,
            series: existingSeries as EventSeriesRow,
            inquiry,
            plannedSessions: schedulePlan.sessions,
            parsedLocation,
          })

    const existingEvents = (eventsResponse.data || []) as EventRow[]
    if (existingEvents.length === 0) {
      const conflictCheck = await checkSeriesSessionConflicts(
        sessions.map((session) => ({
          session_date: session.session_date,
          meal_slot: session.meal_slot,
          start_time: session.start_time,
          end_time: session.end_time,
        }))
      )
      if (conflictCheck.hasConflicts) {
        const preview = conflictCheck.conflicts
          .slice(0, 6)
          .map((conflict) => `${conflict.session_date} (${conflict.meal_slot}): ${conflict.reason}`)
          .join('; ')
        const suffix =
          conflictCheck.conflicts.length > 6
            ? `; +${conflictCheck.conflicts.length - 6} more conflict(s)`
            : ''
        throw new ValidationError(`Schedule conflicts detected: ${preview}${suffix}`)
      }
    }

    const events =
      existingEvents.length > 0
        ? existingEvents
        : await materializeSeriesEvents({
            db,
            tenantId: user.tenantId!,
            actorId: user.id,
            inquiry,
            series: existingSeries as EventSeriesRow,
            sessions,
            parsedLocation,
            serveTimeFallback: serveTime,
            arrivalTimeFallback: arrivalTime,
            quotedPriceCents,
            depositAmountCents,
            pricingModel,
          })

    const primaryEvent = events[0] || null
    if (!primaryEvent) {
      throw new UnknownAppError(
        'Series already exists for this inquiry, but no event could be created'
      )
    }

    if (!inquiry.converted_to_event_id) {
      await db
        .from('inquiries')
        .update({ converted_to_event_id: primaryEvent.id })
        .eq('id', inquiry.id)
        .eq('tenant_id', user.tenantId!)
        .is('deleted_at' as any, null)
    }

    if (acceptedQuote?.id && acceptedQuote.event_id !== primaryEvent.id) {
      await db
        .from('quotes')
        .update({ event_id: primaryEvent.id })
        .eq('id', acceptedQuote.id)
        .eq('tenant_id', user.tenantId!)
    }

    return {
      success: true,
      series: existingSeries as EventSeriesRow,
      sessions,
      events,
      event: primaryEvent as EventRow,
    }
  }

  const conflictCheck = await checkSeriesSessionConflicts(
    schedulePlan.sessions.map((session) => ({
      session_date: session.session_date,
      meal_slot: session.meal_slot,
      start_time: session.start_time,
      end_time: session.end_time,
    }))
  )

  if (conflictCheck.hasConflicts) {
    const preview = conflictCheck.conflicts
      .slice(0, 6)
      .map((conflict) => `${conflict.session_date} (${conflict.meal_slot}): ${conflict.reason}`)
      .join('; ')
    const suffix =
      conflictCheck.conflicts.length > 6
        ? `; +${conflictCheck.conflicts.length - 6} more conflict(s)`
        : ''
    throw new ValidationError(`Schedule conflicts detected: ${preview}${suffix}`)
  }

  const { data: series, error: seriesError } = await db
    .from('event_series')
    .insert({
      tenant_id: user.tenantId!,
      client_id: inquiry.client_id,
      inquiry_id: inquiry.id,
      service_mode: inquiry.service_mode || 'multi_day',
      status: 'draft',
      title: inquiry.confirmed_occasion || 'Multi-day service',
      start_date: schedulePlan.start_date,
      end_date: schedulePlan.end_date,
      base_guest_count: inquiry.confirmed_guest_count ?? null,
      location_address: inquiry.confirmed_location || null,
      location_city: parsedLocation.city || 'TBD',
      location_state: parsedLocation.state || 'MA',
      location_zip: 'TBD',
      pricing_model: pricingModel,
      quoted_total_cents: quotedPriceCents,
      deposit_total_cents: depositAmountCents,
      notes: mergeSpecialRequestNotes(
        inquiry.confirmed_service_expectations,
        parsedScheduleRequest.success ? parsedScheduleRequest.data.outline : null
      ),
      created_by: user.id,
      updated_by: user.id,
    })
    .select('*')
    .single()

  if (seriesError || !series) {
    console.error('[createSeriesFromBookingRequest] Series creation error:', seriesError)
    throw new UnknownAppError(`Failed to create event series: ${seriesError?.message}`)
  }

  const sessions = await materializeSeriesSessions({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    series,
    inquiry,
    plannedSessions: schedulePlan.sessions,
    parsedLocation,
  })

  const events = await materializeSeriesEvents({
    db,
    tenantId: user.tenantId!,
    actorId: user.id,
    inquiry,
    series,
    sessions,
    parsedLocation,
    serveTimeFallback: serveTime,
    arrivalTimeFallback: arrivalTime,
    quotedPriceCents,
    depositAmountCents,
    pricingModel,
  })

  const primaryEvent = events[0] || null
  if (!primaryEvent) {
    throw new UnknownAppError('Failed to create a primary event for the series')
  }

  await db
    .from('inquiries')
    .update({ converted_to_event_id: primaryEvent.id })
    .eq('id', inquiry.id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (acceptedQuote?.id) {
    await db
      .from('quotes')
      .update({ event_id: primaryEvent.id })
      .eq('id', acceptedQuote.id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/events')
  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${inquiryId}`)
  revalidatePath('/my-events')

  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: inquiry.client_id,
        category: 'event',
        action: 'inquiry_converted_to_client',
        title: 'Your service schedule is being set up',
        body: `Your multi-day request for "${inquiry.confirmed_occasion || 'your service'}" is now scheduled`,
        actionUrl: `/my-events/${primaryEvent.id}`,
        eventId: primaryEvent.id,
        inquiryId,
      })
    }
  } catch (err) {
    console.error(
      '[createSeriesFromBookingRequest] Client notification failed (non-blocking):',
      err
    )
  }

  return {
    success: true,
    series: series as EventSeriesRow,
    sessions,
    events,
    event: primaryEvent as EventRow,
  }
}

// ============================================
// 7. CONVERT INQUIRY TO EVENT
// ============================================

/**
 * Convert confirmed inquiry to draft event
 * Bridges the inquiry pipeline to the event lifecycle
 * Requires: client linked, date confirmed
 */
export async function convertInquiryToEvent(inquiryId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: inquiry } = await db
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!inquiry) {
    throw new ValidationError('Inquiry not found')
  }

  if (inquiry.status !== 'confirmed') {
    throw new ValidationError('Only confirmed inquiries can be converted to events')
  }

  if (!inquiry.client_id) {
    throw new ValidationError('Inquiry must be linked to a client before converting to an event')
  }

  if (!inquiry.confirmed_date) {
    throw new ValidationError('Confirmed date is required before converting to an event')
  }

  if (inquiry.service_mode === 'multi_day') {
    return createSeriesFromBookingRequest(inquiryId)
  }

  const { data: inquiryMessages } = await db
    .from('messages')
    .select('body, sent_at')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiry.id)
    .order('sent_at', { ascending: true })
    .limit(100)

  const conversationText = [
    inquiry.source_message,
    ...(inquiryMessages || []).map((m: { body?: string | null }) => m.body ?? ''),
  ]
    .filter((chunk: string | null | undefined) => Boolean(chunk && chunk.trim().length > 0))
    .join('\n\n')

  const resolvedEventDate = resolveInquiryDateForEvent(
    inquiry.confirmed_date,
    inquiry.first_contact_at
  )
  if (!resolvedEventDate) {
    throw new ValidationError('Confirmed date could not be resolved to a calendar day')
  }

  const { serveTime, arrivalTime } = inferEventTimesFromConversation(conversationText)
  const parsedLocation = parseCityStateFromConversation(
    inquiry.confirmed_location,
    conversationText
  )

  // Check for accepted quote on this inquiry - use its pricing if available
  const { data: acceptedQuote } = await db
    .from('quotes')
    .select('id, total_quoted_cents, deposit_amount_cents, pricing_model')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single()

  // Pricing: accepted quote wins over inquiry budget
  const quotedPriceCents =
    acceptedQuote?.total_quoted_cents ?? inquiry.confirmed_budget_cents ?? null
  const depositAmountCents = acceptedQuote?.deposit_amount_cents ?? null
  const pricingModel = acceptedQuote?.pricing_model ?? null

  // Map cannabis_preference string → boolean
  const cannabisBoolean = mapCannabisPreferenceToBoolean(inquiry.confirmed_cannabis_preference)

  // Create draft event from confirmed inquiry facts + accepted quote pricing
  const { data: event, error: eventError } = await db
    .from('events')
    .insert({
      tenant_id: user.tenantId!,
      client_id: inquiry.client_id,
      inquiry_id: inquiry.id,
      referral_partner_id: inquiry.referral_partner_id || null,
      partner_location_id: inquiry.partner_location_id || null,
      event_date: resolvedEventDate,
      serve_time: serveTime,
      arrival_time: arrivalTime,
      guest_count: inquiry.confirmed_guest_count || 1,
      location_address: inquiry.confirmed_location || 'TBD',
      location_city: parsedLocation.city || 'TBD',
      location_state: parsedLocation.state || 'MA',
      location_zip: 'TBD',
      occasion: inquiry.confirmed_occasion,
      quoted_price_cents: quotedPriceCents,
      deposit_amount_cents: depositAmountCents,
      pricing_model: pricingModel,
      dietary_restrictions: inquiry.confirmed_dietary_restrictions || [],
      special_requests: inquiry.confirmed_service_expectations,
      cannabis_preference: cannabisBoolean,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (eventError) {
    console.error('[convertInquiryToEvent] Event creation error:', eventError)
    throw new UnknownAppError(`Failed to create event: ${eventError.message}`)
  }

  // Log initial event transition to 'draft'
  await db.from('event_state_transitions').insert({
    tenant_id: user.tenantId!,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'converted_from_inquiry', inquiry_id: inquiry.id },
  })

  // Link inquiry to the created event
  await db
    .from('inquiries')
    .update({ converted_to_event_id: event.id })
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  // Link accepted quote to the new event
  if (acceptedQuote) {
    await db
      .from('quotes')
      .update({ event_id: event.id })
      .eq('id', acceptedQuote.id)
      .eq('tenant_id', user.tenantId!)
  }

  // Auto-scaffold an operational menu from inquiry conversation so event PDFs are
  // immediately usable even before manual menu entry.
  const { data: existingMenu } = await db
    .from('menus')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', event.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!existingMenu?.id) {
    const dishNames = buildAutoMenuCourseNamesFromConversation(conversationText)

    const { data: menu, error: menuError } = await db
      .from('menus')
      .insert({
        tenant_id: user.tenantId!,
        event_id: event.id,
        name: `${inquiry.confirmed_occasion || 'Event'} Auto Menu`,
        description: 'Auto-scaffolded from inquiry conversation. Refine before final service.',
        target_guest_count: inquiry.confirmed_guest_count || 1,
        notes: 'Generated from inquiry conversion',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single()

    if (menuError || !menu) {
      console.error('[convertInquiryToEvent] Menu scaffold creation error:', menuError)
      throw new UnknownAppError(`Failed to scaffold menu: ${menuError?.message || 'Unknown error'}`)
    }

    await db.from('menu_state_transitions').insert({
      tenant_id: user.tenantId!,
      menu_id: menu.id,
      from_status: null,
      to_status: 'draft',
      transitioned_by: user.id,
      reason: 'auto_scaffold_from_inquiry_conversion',
      metadata: { inquiry_id: inquiry.id, event_id: event.id },
    })

    const dishPayload = dishNames.map((dishName, index) => ({
      tenant_id: user.tenantId!,
      menu_id: menu.id,
      course_number: index + 1,
      course_name: `Course ${index + 1}`,
      name: dishName,
      description: dishName,
      dietary_tags: inquiry.confirmed_dietary_restrictions || [],
      allergen_flags: [],
      sort_order: index + 1,
      created_by: user.id,
      updated_by: user.id,
    }))

    const { data: insertedDishes, error: dishError } = await db
      .from('dishes')
      .insert(dishPayload)
      .select('id, name, course_number')

    if (dishError || !insertedDishes || insertedDishes.length === 0) {
      console.error('[convertInquiryToEvent] Dish scaffold creation error:', dishError)
      throw new UnknownAppError(
        `Failed to scaffold dishes: ${dishError?.message || 'Unknown error'}`
      )
    }

    const componentPayload = insertedDishes.map(
      (dish: { id: string; name: string | null; course_number: number }) => {
        const label = dish.name || `Course ${dish.course_number} Component`
        return {
          tenant_id: user.tenantId!,
          dish_id: dish.id,
          name: label,
          category: inferComponentCategoryFromDishName(label),
          is_make_ahead: true,
          execution_notes:
            'Auto-generated from inquiry conversation. Confirm final execution details.',
          storage_notes: 'Review storage and transport before service.',
          sort_order: 1,
          created_by: user.id,
          updated_by: user.id,
        }
      }
    )

    const { error: componentError } = await db.from('components').insert(componentPayload)
    if (componentError) {
      console.error('[convertInquiryToEvent] Component scaffold creation error:', componentError)
      throw new UnknownAppError(
        `Failed to scaffold components: ${componentError.message || 'Unknown error'}`
      )
    }

    await db
      .from('events')
      .update({
        menu_id: menu.id,
        course_count: insertedDishes.length,
        updated_by: user.id,
      })
      .eq('id', event.id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/events')
  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${inquiryId}`)
  revalidatePath('/my-events')

  // Non-blocking: notify client their inquiry became an event
  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: inquiry.client_id,
        category: 'event',
        action: 'inquiry_converted_to_client',
        title: 'Your event is being set up',
        body: `Your inquiry for "${inquiry.confirmed_occasion || 'your event'}" is now an event`,
        actionUrl: `/my-events/${event.id}`,
        eventId: event.id,
        inquiryId,
      })
    }
  } catch (err) {
    console.error('[convertInquiryToEvent] Client notification failed (non-blocking):', err)
  }

  // Link inquiry's Dinner Circle to the new event (non-blocking)
  try {
    const { linkInquiryCircleToEvent } = await import('@/lib/hub/inquiry-circle-actions')
    await linkInquiryCircleToEvent({
      inquiryId: inquiry.id,
      eventId: event.id,
    })
  } catch (err) {
    console.error('[convertInquiryToEvent] Circle-event link failed (non-blocking):', err)
  }

  return { success: true, event }
}

// ============================================
// 8. GET INQUIRY STATS
// ============================================

/**
 * Return counts by status for dashboard/pipeline overview
 */
export async function getInquiryStats() {
  const user = await requireChef()
  const db: any = createServerClient()

  const runQuery = (withSoftDeleteFilter: boolean) => {
    let query = db.from('inquiries').select('status').eq('tenant_id', user.tenantId!)
    if (withSoftDeleteFilter) {
      query = query.is('deleted_at' as any, null)
    }
    return query
  }

  let response = await runQuery(true)
  if (isMissingSoftDeleteColumn(response.error)) {
    response = await runQuery(false)
  }
  const { data: inquiries, error } = response

  if (error) {
    console.error('[getInquiryStats] Error:', error)
    throw new UnknownAppError('Failed to fetch inquiry stats')
  }

  const stats: Record<InquiryStatus, number> = {
    new: 0,
    awaiting_client: 0,
    awaiting_chef: 0,
    quoted: 0,
    confirmed: 0,
    declined: 0,
    expired: 0,
  }

  for (const inquiry of inquiries || []) {
    const status = inquiry.status as InquiryStatus
    if (status in stats) {
      stats[status]++
    }
  }

  return stats
}

// ============================================
// 9. DELETE INQUIRY
// ============================================

/**
 * Delete inquiry (chef-only)
 * Only allowed for 'new' or 'declined' status
 */
export async function deleteInquiry(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: inquiry } = await (db
    .from('inquiries')
    .select('status, deleted_at')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!inquiry || inquiry.deleted_at) {
    throw new ValidationError('Inquiry not found')
  }

  if (!['new', 'declined'].includes(inquiry.status)) {
    throw new ValidationError('Can only delete inquiries in "new" or "declined" status')
  }

  const { error } = await db
    .from('inquiries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    } as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[deleteInquiry] Error:', error)
    throw new UnknownAppError('Failed to delete inquiry')
  }

  revalidatePath('/inquiries')
  return { success: true }
}

export async function restoreInquiry(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('inquiries')
    .update({
      deleted_at: null,
      deleted_by: null,
    } as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[restoreInquiry] Error:', error)
    throw new UnknownAppError('Failed to restore inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
  return { success: true }
}

// ============================================
// 10. DECLINE WITH REASON
// ============================================

// COMMON_DECLINE_REASONS moved to lib/inquiries/constants.ts
// to avoid exporting a non-async value from a 'use server' file.

/**
 * Decline an inquiry and record the reason.
 * Combines the status transition + reason capture in one action.
 */
export async function declineInquiry(id: string, reason?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: inquiry } = await (db
    .from('inquiries')
    .select('status, deleted_at, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (!inquiry || inquiry.deleted_at) throw new ValidationError('Inquiry not found')

  const currentStatus = inquiry.status as InquiryStatus
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes('declined')) {
    throw new ValidationError(`Cannot decline from status "${currentStatus}"`)
  }

  const { error } = await db
    .from('inquiries')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
      next_action_required: null,
      next_action_by: null,
      follow_up_due_at: null,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  if (error) {
    console.error('[declineInquiry] Error:', error)
    throw new UnknownAppError('Failed to decline inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(user.tenantId!, 'inquiry_status_changed', {
      entityId: id,
      entityType: 'inquiry',
      fields: {
        status: 'declined',
        from_status: currentStatus,
        to_status: 'declined',
        decline_reason: reason,
      },
    })
  } catch {
    /* non-blocking */
  }

  // Non-blocking: notify client
  try {
    if (inquiry.client_id) {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: inquiry.client_id,
        category: 'inquiry',
        action: 'inquiry_declined_to_client',
        title: 'Inquiry update',
        body: 'Your inquiry status has been updated',
        actionUrl: '/my-inquiries',
        inquiryId: id,
      })
    }
  } catch (err) {
    console.error('[declineInquiry] Client notification failed (non-blocking):', err)
  }

  revalidatePath('/my-inquiries')
  revalidatePath(`/my-inquiries/${id}`)

  return { success: true }
}

// ============================================
// 11. LOST REASON ANALYTICS
// ============================================

export type LostReasonStat = { reason: string; count: number }

/**
 * Returns a breakdown of decline reasons, sorted by frequency.
 */
export async function getLostReasonStats(): Promise<LostReasonStat[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('inquiries')
    .select('decline_reason')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'declined')
    .not('decline_reason', 'is', null)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const r = row.decline_reason ?? 'Unknown'
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================
// NEEDS FIRST CONTACT
// ============================================

export interface FirstContactInquiry {
  id: string
  clientName: string
  channel: string
  confirmedDate: string | null
  confirmedOccasion: string | null
  confirmedLocation: string | null
  firstContactAt: string
  clientId: string | null
}

/**
 * Get inquiries that have never been contacted - no outbound messages,
 * no linked conversation. These leads need the chef's first response.
 */
export async function getInquiriesNeedingFirstContact(): Promise<FirstContactInquiry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all new/awaiting_chef inquiries (active leads waiting for chef action)
  const { data: inquiries } = await db
    .from('inquiries')
    .select(
      'id, client_id, channel, confirmed_date, confirmed_occasion, confirmed_location, first_contact_at, unknown_fields, source_message'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef'])
    .eq('next_action_by', 'chef')
    .order('first_contact_at', { ascending: false })
    .limit(50)

  if (!inquiries || inquiries.length === 0) return []

  // Filter out inquiries that already have outbound messages
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: outboundMessages } = await db
    .from('messages')
    .select('inquiry_id')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')

  const contactedInquiryIds = new Set(
    (outboundMessages || []).map((m: any) => m.inquiry_id).filter(Boolean)
  )

  // Also check if there's an existing conversation linked
  const { data: linkedConversations } = await db
    .from('conversations' as any)
    .select('context_id')
    .in('context_id', inquiryIds)
    .eq('context_type', 'inquiry')

  const conversationInquiryIds = new Set(
    (linkedConversations || []).map((c: any) => c.context_id).filter(Boolean)
  )

  // Build result - only inquiries without outbound contact
  const results: FirstContactInquiry[] = []

  for (const inq of inquiries) {
    if (contactedInquiryIds.has(inq.id)) continue
    if (conversationInquiryIds.has(inq.id)) continue

    // Resolve client name
    let clientName = 'Unknown'
    if (inq.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('full_name')
        .eq('id', inq.client_id)
        .single()
      if (client?.full_name) clientName = client.full_name
    }
    // Fallback to unknown_fields
    if (clientName === 'Unknown') {
      const fields = inq.unknown_fields as Record<string, string> | null
      clientName = fields?.original_sender_name || fields?.client_name || 'Unknown'
    }

    results.push({
      id: inq.id,
      clientName,
      channel: inq.channel,
      confirmedDate: inq.confirmed_date,
      confirmedOccasion: inq.confirmed_occasion,
      confirmedLocation: inq.confirmed_location,
      firstContactAt: inq.first_contact_at,
      clientId: inq.client_id,
    })
  }

  return results
}

// ============================================
// READINESS SCORE (data completeness for action)
// ============================================

const READINESS_FIELDS = [
  { key: 'confirmed_date', label: 'Event date' },
  { key: 'confirmed_guest_count', label: 'Guest count' },
  { key: 'confirmed_location', label: 'Location' },
  { key: 'confirmed_occasion', label: 'Occasion' },
  { key: 'confirmed_budget_cents', label: 'Budget' },
  { key: 'confirmed_dietary_restrictions', label: 'Dietary restrictions' },
  { key: 'confirmed_service_expectations', label: 'Service expectations' },
  { key: 'has_contact', label: 'Client contact info' },
] as const

export type ReadinessScore = {
  score: number
  total: number
  percent: number
  filled: string[]
  missing: string[]
  level: 'ready' | 'almost' | 'partial' | 'minimal'
}

export async function computeReadinessScore(
  inquiry: Record<string, unknown>
): Promise<ReadinessScore> {
  const filled: string[] = []
  const missing: string[] = []

  for (const field of READINESS_FIELDS) {
    if (field.key === 'has_contact') {
      // Contact info: client_id OR contact_name/contact_email
      const hasContact = !!(inquiry.client_id || inquiry.contact_name || inquiry.contact_email)
      if (hasContact) filled.push(field.label)
      else missing.push(field.label)
      continue
    }

    if (field.key === 'confirmed_dietary_restrictions') {
      const val = inquiry[field.key] as unknown[] | null
      if (val && val.length > 0) filled.push(field.label)
      else missing.push(field.label)
      continue
    }

    const val = inquiry[field.key]
    if (val !== null && val !== undefined && val !== '' && val !== 0) {
      filled.push(field.label)
    } else {
      missing.push(field.label)
    }
  }

  const total = READINESS_FIELDS.length
  const score = filled.length
  const percent = Math.round((score / total) * 100)

  let level: ReadinessScore['level'] = 'minimal'
  if (percent >= 100) level = 'ready'
  else if (percent >= 63)
    level = 'almost' // 5 of 8
  else if (percent >= 38) level = 'partial' // 3 of 8

  return { score, total, percent, filled, missing, level }
}

export async function computeReadinessScoresForInquiries(): Promise<Map<string, ReadinessScore>> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('inquiries')
    .select(
      'id, confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_budget_cents, confirmed_dietary_restrictions, confirmed_service_expectations, client_id, contact_name, contact_email'
    )
    .eq('tenant_id', user.tenantId!)
    .not('status', 'in', '(declined,expired)')

  const map = new Map<string, ReadinessScore>()
  if (!data) return map

  for (const row of data) {
    map.set(row.id, await computeReadinessScore(row))
  }
  return map
}

// ============================================
// RESPONSE QUEUE (urgency-sorted)
// ============================================

export type ResponseQueueItem = {
  id: string
  clientName: string
  occasion: string | null
  confirmedDate: string | null
  guestCount: number | null
  waitingHours: number
  readiness: ReadinessScore
  status: string
}

export async function getResponseQueue(limit = 10): Promise<ResponseQueueItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Only inquiries where chef needs to act
  const { data, error } = await db
    .from('inquiries')
    .select(
      'id, status, confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_budget_cents, confirmed_dietary_restrictions, confirmed_service_expectations, client_id, contact_name, contact_email, updated_at, next_action_by, client:clients(full_name), unknown_fields'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef'])

  if (error || !data) return []

  const now = new Date()
  const items: ResponseQueueItem[] = []
  for (const row of data) {
    const readiness = await computeReadinessScore(row)
    const waitingHours = Math.round(
      (now.getTime() - new Date(row.updated_at).getTime()) / (1000 * 60 * 60)
    )
    const clientName =
      row.client?.full_name ||
      (row.unknown_fields as Record<string, string> | null)?.client_name ||
      row.contact_name ||
      'Unknown Lead'

    items.push({
      id: row.id,
      clientName,
      occasion: row.confirmed_occasion,
      confirmedDate: row.confirmed_date,
      guestCount: row.confirmed_guest_count,
      waitingHours,
      readiness,
      status: row.status,
    })
  }

  // Sort by: waiting time (desc), then date proximity (asc), then readiness (desc)
  items.sort((a, b) => {
    // Longest wait first
    if (a.waitingHours !== b.waitingHours) return b.waitingHours - a.waitingHours

    // Closest event date first (null dates sort last)
    if (a.confirmedDate && b.confirmedDate) {
      return new Date(a.confirmedDate).getTime() - new Date(b.confirmedDate).getTime()
    }
    if (a.confirmedDate) return -1
    if (b.confirmedDate) return 1

    // Higher readiness first
    return b.readiness.percent - a.readiness.percent
  })

  return items.slice(0, limit)
}

/**
 * Returns the count of inquiries that need chef attention (status: new or awaiting_chef).
 * Lightweight - used only for the nav badge. Returns 0 on any error.
 */
export async function getPendingInquiryCount(): Promise<number> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data, error } = await db
      .from('inquiries')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['new', 'awaiting_chef'])

    if (error) return 0
    return (data ?? []).length
  } catch {
    return 0
  }
}

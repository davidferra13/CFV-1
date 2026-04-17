// API v2: Events - List & Create
// GET  /api/v2/events?status=draft&client_id=...&date_from=...&date_to=...&page=1&per_page=50
// POST /api/v2/events

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
  parsePagination,
  paginationMeta,
} from '@/lib/api/v2'

const CreateEventBody = z.object({
  client_id: z.string().uuid(),
  event_date: z
    .string()
    .min(1)
    .refine((v) => !isNaN(Date.parse(v)), { message: 'event_date must be a valid date string' }),
  serve_time: z.string().min(1),
  guest_count: z.number().int().positive(),
  location_address: z.string().min(1),
  location_city: z.string().min(1),
  location_state: z.string().optional(),
  location_zip: z.string().min(1),
  occasion: z.string().optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  quoted_price_cents: z.number().int().nonnegative().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  special_requests: z.string().optional(),
  site_notes: z.string().optional(),
  access_instructions: z.string().optional(),
  kitchen_notes: z.string().optional(),
  location_notes: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  cannabis_preference: z.boolean().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  event_timezone: z.string().optional(),
  ambiance_notes: z.string().max(5000).optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')

    let query = ctx.db
      .from('events')
      .select(
        'id, status, occasion, event_date, serve_time, guest_count, quoted_price_cents, location_city, location_state, service_style, created_at, updated_at, client:clients(id, full_name, email)',
        { count: 'exact' }
      )
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .order('event_date', { ascending: false })

    if (status) query = query.eq('status', status as any)
    if (clientId) query = query.eq('client_id', clientId)
    if (dateFrom) query = query.gte('event_date', dateFrom)
    if (dateTo) query = query.lte('event_date', dateTo)

    // Apply pagination
    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch events', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['events:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateEventBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Verify client belongs to this tenant
    const { data: client } = await ctx.db
      .from('clients')
      .select('id')
      .eq('id', input.client_id)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    if (!client) {
      return apiError(
        'client_not_found',
        'Client not found or does not belong to your account',
        404
      )
    }

    const insertPayload: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      client_id: input.client_id,
      event_date: input.event_date,
      serve_time: input.serve_time,
      guest_count: input.guest_count,
      location_address: input.location_address,
      location_city: input.location_city,
      location_state: input.location_state,
      location_zip: input.location_zip,
      occasion: input.occasion,
      service_style: input.service_style,
      pricing_model: input.pricing_model,
      quoted_price_cents: input.quoted_price_cents,
      deposit_amount_cents: input.deposit_amount_cents,
      dietary_restrictions: input.dietary_restrictions,
      allergies: input.allergies,
      special_requests: input.special_requests,
      site_notes: input.site_notes,
      access_instructions: input.access_instructions,
      kitchen_notes: input.kitchen_notes,
      location_notes: input.location_notes,
      arrival_time: input.arrival_time,
      departure_time: input.departure_time,
      cannabis_preference: input.cannabis_preference,
      location_lat: input.location_lat,
      location_lng: input.location_lng,
      event_timezone: input.event_timezone ?? null,
      ambiance_notes: input.ambiance_notes ?? null,
    }

    // Seed ambiance from client taste profile if not explicitly provided
    if (!insertPayload.ambiance_notes) {
      try {
        const { data: tp } = await ctx.db
          .from('client_taste_profiles')
          .select('ambiance_preferences')
          .eq('client_id', input.client_id)
          .eq('tenant_id', ctx.tenantId)
          .maybeSingle()
        if ((tp as any)?.ambiance_preferences) {
          insertPayload.ambiance_notes = (tp as any).ambiance_preferences
        }
      } catch {
        /* non-blocking */
      }
    }

    const { data: event, error } = await ctx.db
      .from('events')
      .insert(insertPayload as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/events] Create error:', error)
      return apiError('create_failed', 'Failed to create event', 500)
    }

    // Log initial draft transition
    try {
      await ctx.db.from('event_state_transitions').insert({
        tenant_id: ctx.tenantId,
        event_id: (event as any).id,
        from_status: null,
        to_status: 'draft',
        transitioned_by: null,
        metadata: { action: 'event_created', source: 'api_v2', api_key_id: ctx.keyId },
      })
    } catch (err) {
      console.error('[v2/events] State transition record failed (non-blocking):', err)
    }

    return apiCreated(event)
  },
  { scopes: ['events:write'] }
)

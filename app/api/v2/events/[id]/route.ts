// API v2: Events - Get, Update, Delete by ID
// GET    /api/v2/events/:id
// PATCH  /api/v2/events/:id
// DELETE /api/v2/events/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
  apiNoContent,
} from '@/lib/api/v2'

const UpdateEventBody = z
  .object({
    event_date: z.string().optional(),
    serve_time: z.string().optional(),
    guest_count: z.number().int().positive().optional(),
    location_address: z.string().min(1).optional(),
    location_city: z.string().min(1).optional(),
    location_state: z.string().optional(),
    location_zip: z.string().min(1).optional(),
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
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    const { data, error } = await ctx.db
      .from('events')
      .select('*, client:clients(id, full_name, email, phone, dietary_restrictions, allergies)')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (error || !data) return apiNotFound('Event')
    return apiSuccess(data)
  },
  { scopes: ['events:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateEventBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify event belongs to tenant
    const { data: existing } = await ctx.db
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!existing) return apiNotFound('Event')

    const { data, error } = await ctx.db
      .from('events')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/events] Update error:', error)
      return apiError('update_failed', 'Failed to update event', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['events:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    const { data: existing } = await ctx.db
      .from('events')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!existing) return apiNotFound('Event')

    if ((existing as any).status !== 'draft') {
      return apiError(
        'invalid_status',
        'Only draft events can be deleted. Use the archive endpoint for active or historical events.',
        422
      )
    }

    const { error } = await ctx.db
      .from('events')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)

    if (error) {
      console.error('[api/v2/events] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete event', 500)
    }

    return apiNoContent()
  },
  { scopes: ['events:write'] }
)

// API v2: Quotes - List & Create
// GET  /api/v2/quotes?status=draft&event_id=...&client_id=...&page=1&per_page=50
// POST /api/v2/quotes

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

const CreateQuoteBody = z.object({
  client_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
  inquiry_id: z.string().uuid().optional(),
  quote_name: z.string().min(1),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']),
  total_quoted_cents: z.number().int().nonnegative(),
  price_per_person_cents: z.number().int().nonnegative().nullable().optional(),
  guest_count_estimated: z.number().int().positive().optional(),
  deposit_required: z.boolean().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
  deposit_percentage: z.number().min(0).max(100).optional(),
  pricing_notes: z.string().optional(),
  valid_until: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const eventId = url.searchParams.get('event_id')
    const clientId = url.searchParams.get('client_id')

    let query = ctx.db
      .from('quotes')
      .select(
        'id, quote_name, status, pricing_model, total_quoted_cents, deposit_amount_cents, valid_until, created_at, updated_at, client:clients(id, full_name, email)',
        { count: 'exact' }
      )
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status as any)
    if (eventId) query = query.eq('event_id', eventId)
    if (clientId) query = query.eq('client_id', clientId)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch quotes', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['quotes:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateQuoteBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Verify client belongs to tenant
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

    // Verify event belongs to tenant (if provided)
    if (input.event_id) {
      const { data: event } = await ctx.db
        .from('events')
        .select('id')
        .eq('id', input.event_id)
        .eq('tenant_id' as any, ctx.tenantId)
        .single()

      if (!event) {
        return apiError(
          'event_not_found',
          'Event not found or does not belong to your account',
          404
        )
      }
    }

    const { data: quote, error } = await ctx.db
      .from('quotes')
      .insert({
        tenant_id: ctx.tenantId,
        client_id: input.client_id,
        event_id: input.event_id ?? null,
        inquiry_id: input.inquiry_id ?? null,
        quote_name: input.quote_name,
        pricing_model: input.pricing_model,
        total_quoted_cents: input.total_quoted_cents,
        price_per_person_cents: input.price_per_person_cents ?? null,
        guest_count_estimated: input.guest_count_estimated,
        deposit_required: input.deposit_required ?? true,
        deposit_amount_cents: input.deposit_amount_cents,
        deposit_percentage: input.deposit_percentage,
        pricing_notes: input.pricing_notes,
        valid_until: input.valid_until,
        status: 'draft',
      } as any)
      .select(
        'id, tenant_id, client_id, event_id, inquiry_id, quote_name, status, pricing_model, total_quoted_cents, price_per_person_cents, guest_count_estimated, deposit_required, deposit_amount_cents, deposit_percentage, pricing_notes, valid_until, sent_at, accepted_at, expires_at, rejected_at, created_at, updated_at'
      )
      .single()

    if (error) {
      console.error('[api/v2/quotes] Create error:', error)
      return apiError('create_failed', 'Failed to create quote', 500)
    }

    return apiCreated(quote)
  },
  { scopes: ['quotes:write'] }
)

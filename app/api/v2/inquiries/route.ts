// API v2: Inquiries - List & Create
// GET  /api/v2/inquiries?status=new&page=1&per_page=50
// POST /api/v2/inquiries

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

const CreateInquiryBody = z.object({
  client_name: z.string().min(1),
  client_email: z.string().email().optional(),
  client_phone: z.string().optional(),
  event_date: z.string().optional(),
  guest_count: z.number().int().positive().optional(),
  occasion: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
  budget_cents: z.number().int().nonnegative().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')

    let query = ctx.db
      .from('inquiries')
      .select(
        'id, tenant_id, client_name, client_email, client_phone, event_date, guest_count, occasion, message, source, budget_cents, dietary_restrictions, allergies, location_city, location_state, status, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at' as any, null)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status as any)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch inquiries', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['inquiries:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateInquiryBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    const { data: inquiry, error } = await ctx.db
      .from('inquiries')
      .insert({
        tenant_id: ctx.tenantId,
        client_name: input.client_name,
        client_email: input.client_email,
        client_phone: input.client_phone,
        event_date: input.event_date,
        guest_count: input.guest_count,
        occasion: input.occasion,
        message: input.message,
        source: input.source ?? 'api',
        budget_cents: input.budget_cents,
        dietary_restrictions: input.dietary_restrictions,
        allergies: input.allergies,
        location_city: input.location_city,
        location_state: input.location_state,
        status: 'new',
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/inquiries] Create error:', error)
      return apiError('create_failed', 'Failed to create inquiry', 500)
    }

    return apiCreated(inquiry)
  },
  { scopes: ['inquiries:write'] }
)

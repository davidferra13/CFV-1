// API v2: Expenses - List & Create
// GET  /api/v2/expenses?event_id=...&category=...&page=1&per_page=50
// POST /api/v2/expenses

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

const CreateExpenseBody = z.object({
  event_id: z.string().uuid().optional(),
  amount_cents: z.number().int().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  vendor: z.string().optional(),
  expense_date: z.string().optional(),
  receipt_url: z.string().url().optional(),
  is_reimbursable: z.boolean().optional(),
  payment_method: z.enum(['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other']).optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const eventId = url.searchParams.get('event_id')
    const category = url.searchParams.get('category')
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')

    let query = ctx.db
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('expense_date', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (category) query = query.eq('category', category as any)
    if (dateFrom) query = query.gte('expense_date', dateFrom)
    if (dateTo) query = query.lte('expense_date', dateTo)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch expenses', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['finance:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateExpenseBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // If event_id provided, verify it belongs to tenant
    if (input.event_id) {
      const { data: event } = await ctx.db
        .from('events')
        .select('id')
        .eq('id', input.event_id)
        .eq('tenant_id', ctx.tenantId)
        .single()

      if (!event) {
        return apiError(
          'event_not_found',
          'Event not found or does not belong to your account',
          404
        )
      }
    }

    const { data: expense, error } = await ctx.db
      .from('expenses')
      .insert({
        tenant_id: ctx.tenantId,
        event_id: input.event_id ?? null,
        amount_cents: input.amount_cents,
        category: input.category,
        description: input.description,
        vendor: input.vendor,
        expense_date: input.expense_date ?? new Date().toISOString().split('T')[0],
        receipt_url: input.receipt_url,
        is_reimbursable: input.is_reimbursable ?? false,
        payment_method: input.payment_method,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/expenses] Create error:', error)
      return apiError('create_failed', 'Failed to create expense', 500)
    }

    return apiCreated(expense)
  },
  { scopes: ['finance:write'] }
)

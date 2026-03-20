// API v2: Expenses - Get and Update by ID
// GET   /api/v2/expenses/:id
// PATCH /api/v2/expenses/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateExpenseBody = z
  .object({
    amount_cents: z.number().int().positive().optional(),
    category: z.string().min(1).optional(),
    vendor_name: z.string().optional(),
    description: z.string().optional(),
    expense_date: z.string().optional(),
    receipt_url: z.string().url().optional(),
    event_id: z.string().uuid().optional(),
    notes: z.string().optional(),
    is_reimbursable: z.boolean().optional(),
    payment_method: z.string().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Expense')

    const { data, error } = await ctx.supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Expense')
    return apiSuccess(data)
  },
  { scopes: ['finance:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Expense')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateExpenseBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify expense belongs to tenant
    const { data: existing } = await ctx.supabase
      .from('expenses')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Expense')

    const { data, error } = await ctx.supabase
      .from('expenses')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/expenses] Update error:', error)
      return apiError('update_failed', 'Failed to update expense', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['finance:write'] }
)

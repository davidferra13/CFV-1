// API v2: Expenses - Get by ID
// GET /api/v2/expenses/:id

import { withApiAuth, apiSuccess, apiNotFound } from '@/lib/api/v2'

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

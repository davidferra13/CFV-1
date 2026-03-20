// API v2: Recipes - Get by ID (Read-Only)
// GET /api/v2/recipes/:id

import { withApiAuth, apiSuccess, apiNotFound } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Recipe')

    const { data, error } = await ctx.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Recipe')
    return apiSuccess(data)
  },
  { scopes: ['recipes:read'] }
)

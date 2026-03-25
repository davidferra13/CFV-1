// API v2: Webhook Delivery Logs
// GET /api/v2/webhooks/:id/logs?limit=50

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Webhook subscription')

    // Verify subscription ownership
    const { data: endpoint } = await ctx.db
      .from('webhook_endpoints' as any)
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!endpoint) return apiNotFound('Webhook subscription')

    // Parse limit from query params
    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    let limit = 50
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 200)
      }
    }

    const { data, error } = await ctx.db
      .from('webhook_deliveries' as any)
      .select('*')
      .eq('endpoint_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return apiError('database_error', 'Failed to fetch delivery logs', 500)

    return apiSuccess(data ?? [], { count: (data ?? []).length })
  },
  { scopes: ['webhooks:manage'] }
)

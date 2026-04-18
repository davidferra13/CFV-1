// API v2: Loyalty - Draw raffle winner
// POST /api/v2/loyalty/raffles/:id/draw

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { drawWinnerForTenant } from '@/lib/loyalty/raffle-store'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Raffle')

    try {
      const result = await drawWinnerForTenant(ctx.tenantId, id)
      if (!result.success) return apiError('draw_failed', (result as any).error, 500)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('draw_failed', err.message ?? 'Failed to draw winner', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

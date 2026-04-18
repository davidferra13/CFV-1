// API v2: Loyalty Overview
// GET /api/v2/loyalty/overview

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import { getLoyaltyOverviewForTenant } from '@/lib/loyalty/store'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const overview = await getLoyaltyOverviewForTenant(ctx.tenantId)
      return apiSuccess(overview)
    } catch (err) {
      console.error('[api/v2/loyalty/overview] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch loyalty overview', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

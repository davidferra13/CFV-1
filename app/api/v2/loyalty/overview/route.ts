// API v2: Loyalty Overview
// GET /api/v2/loyalty/overview

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import { getLoyaltyOverview } from '@/lib/loyalty/actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const overview = await getLoyaltyOverview()
      return apiSuccess(overview)
    } catch (err) {
      console.error('[api/v2/loyalty/overview] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch loyalty overview', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

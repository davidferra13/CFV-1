// API v2: Partner Analytics - Source Distribution
// GET /api/v2/partners/analytics

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import { getSourceDistribution } from '@/lib/partners/analytics'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const data = await getSourceDistribution()
      return apiSuccess(data)
    } catch (err) {
      console.error('[api/v2/partners/analytics] Error:', err)
      return apiError('fetch_failed', 'Failed to fetch source distribution', 500)
    }
  },
  { scopes: ['partners:read'] }
)

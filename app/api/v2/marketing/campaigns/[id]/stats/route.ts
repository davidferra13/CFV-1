// API v2: Marketing Campaigns - Stats
// GET /api/v2/marketing/campaigns/:id/stats

import { withApiAuth, apiSuccess, apiError, apiNotFound } from '@/lib/api/v2'
import { getCampaignStats } from '@/lib/marketing/actions'

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Campaign')

    try {
      const stats = await getCampaignStats(id)
      return apiSuccess(stats)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch campaign stats', 500)
    }
  },
  { scopes: ['marketing:read'] }
)

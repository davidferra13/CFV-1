// API v2: Safety Recalls
// GET /api/v2/safety/recalls

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import { getActiveRecalls, getDismissedRecallIds } from '@/lib/safety/recall-actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const [recalls, dismissedIds] = await Promise.all([
        getActiveRecalls(),
        getDismissedRecallIds(),
      ])
      return apiSuccess({ recalls, dismissedIds })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch recalls', 500)
    }
  },
  { scopes: ['safety:read'] }
)

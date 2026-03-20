// API v2: Goals Dashboard
// GET /api/v2/goals/dashboard

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import { getGoalsDashboard } from '@/lib/goals/actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const dashboard = await getGoalsDashboard()
      return apiSuccess(dashboard)
    } catch (err) {
      console.error('[api/v2/goals/dashboard] Error:', err)
      return apiError('fetch_failed', 'Failed to fetch goals dashboard', 500)
    }
  },
  { scopes: ['goals:read'] }
)

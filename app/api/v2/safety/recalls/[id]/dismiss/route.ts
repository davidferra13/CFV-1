// API v2: Dismiss a recall
// POST /api/v2/safety/recalls/:id/dismiss

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { dismissRecall } from '@/lib/safety/recall-actions'

export const POST = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Recall')

    try {
      const result = await dismissRecall(id)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('dismiss_failed', err.message ?? 'Failed to dismiss recall', 500)
    }
  },
  { scopes: ['safety:write'] }
)

// API v2: Loyalty Rewards - Update & Deactivate by ID
// PATCH  /api/v2/loyalty/rewards/:id
// DELETE /api/v2/loyalty/rewards/:id

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiNoContent, apiNotFound, apiError } from '@/lib/api/v2'
import { updateReward, deactivateReward } from '@/lib/loyalty/actions'

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Reward')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await updateReward(id, body as any)
      return apiSuccess(result)
    } catch (err) {
      console.error('[api/v2/loyalty/rewards] PATCH error:', err)
      return apiError('update_failed', 'Failed to update reward', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

export const DELETE = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Reward')

    try {
      await deactivateReward(id)
      return apiNoContent()
    } catch (err) {
      console.error('[api/v2/loyalty/rewards] DELETE error:', err)
      return apiError('delete_failed', 'Failed to deactivate reward', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

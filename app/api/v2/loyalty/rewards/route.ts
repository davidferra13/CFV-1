// API v2: Loyalty Rewards - List & Create
// GET  /api/v2/loyalty/rewards
// POST /api/v2/loyalty/rewards

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { getRewards, createReward } from '@/lib/loyalty/actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const rewards = await getRewards()
      return apiSuccess(rewards)
    } catch (err) {
      console.error('[api/v2/loyalty/rewards] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch rewards', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await createReward(body as any)
      return apiCreated(result)
    } catch (err) {
      console.error('[api/v2/loyalty/rewards] POST error:', err)
      return apiError('create_failed', 'Failed to create reward', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

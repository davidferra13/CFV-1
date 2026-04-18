// API v2: Redeem Loyalty Reward for Client
// POST /api/v2/loyalty/clients/:id/redeem

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { redeemRewardForTenant } from '@/lib/loyalty/store'

const RedeemBody = z.object({
  rewardId: z.string().min(1),
  eventId: z.string().optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = RedeemBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await redeemRewardForTenant(
        ctx.tenantId,
        id,
        parsed.data.rewardId,
        undefined,
        parsed.data.eventId
      )
      return apiSuccess(result)
    } catch (err) {
      console.error('[api/v2/loyalty/clients/redeem] POST error:', err)
      return apiError('redeem_failed', 'Failed to redeem reward', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

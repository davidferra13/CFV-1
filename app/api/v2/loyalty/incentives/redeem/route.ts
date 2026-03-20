// API v2: Loyalty - Redeem incentive code
// POST /api/v2/loyalty/incentives/redeem

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { redeemIncentiveCode } from '@/lib/loyalty/redemption-actions'

const RedeemBody = z.object({
  code: z.string().min(1),
  eventId: z.string().uuid(),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = RedeemBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await redeemIncentiveCode(parsed.data.code, parsed.data.eventId)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('redeem_failed', err.message ?? 'Failed to redeem code', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

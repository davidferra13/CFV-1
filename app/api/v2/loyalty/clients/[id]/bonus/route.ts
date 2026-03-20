// API v2: Loyalty - Award bonus points
// POST /api/v2/loyalty/clients/:id/bonus

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { awardBonusPoints } from '@/lib/loyalty/actions'

const BonusBody = z.object({
  bonusPoints: z.number().int().positive(),
  reason: z.string().min(1, 'Reason is required'),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const clientId = params?.id
    if (!clientId) return apiNotFound('Client')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = BonusBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await awardBonusPoints(clientId, parsed.data.bonusPoints, parsed.data.reason)
      return apiSuccess({ awarded: true })
    } catch (err: any) {
      return apiError('award_failed', err.message ?? 'Failed to award bonus points', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

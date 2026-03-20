// API v2: Award Bonus Points to Client
// POST /api/v2/loyalty/clients/:id/points

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { awardBonusPoints } from '@/lib/loyalty/actions'

const AwardPointsBody = z.object({
  points: z.number().int().positive(),
  description: z.string().min(1),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = AwardPointsBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await awardBonusPoints(id, parsed.data.points, parsed.data.description)
      return apiSuccess(result)
    } catch (err) {
      console.error('[api/v2/loyalty/clients/points] POST error:', err)
      return apiError('award_failed', 'Failed to award bonus points', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

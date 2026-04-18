// API v2: Loyalty - Award event points
// POST /api/v2/loyalty/event-points

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { awardEventPointsForTenant } from '@/lib/loyalty/store'

const AwardBody = z.object({
  eventId: z.string().uuid(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = AwardBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await awardEventPointsForTenant(ctx.tenantId, parsed.data.eventId)
      return apiSuccess({ awarded: true })
    } catch (err: any) {
      return apiError('award_failed', err.message ?? 'Failed to award event points', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

// API v2: Loyalty - Adjust client loyalty (admin correction)
// POST /api/v2/loyalty/clients/:id/adjust

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { adjustClientLoyalty } from '@/lib/loyalty/actions'

const AdjustBody = z.object({
  adjustmentPoints: z.number().int().optional(),
  adjustmentReason: z.string().min(1).optional(),
  overrideTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  overrideEventsCompleted: z.number().int().min(0).optional(),
  overrideGuestsServed: z.number().int().min(0).optional(),
  resetPoints: z.boolean().optional(),
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

    const parsed = AdjustBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await adjustClientLoyalty({ clientId, ...parsed.data })
      return apiSuccess({ adjusted: true })
    } catch (err: any) {
      return apiError('adjust_failed', err.message ?? 'Failed to adjust loyalty', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

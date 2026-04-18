// API v2: Loyalty - Validate incentive code
// POST /api/v2/loyalty/incentives/validate

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { validateIncentiveCodeForTenant } from '@/lib/loyalty/redemption-store'

const ValidateBody = z.object({
  code: z.string().min(1),
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = ValidateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await validateIncentiveCodeForTenant(
        ctx.tenantId,
        parsed.data.code,
        parsed.data.eventId,
        parsed.data.clientId
      )
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('validate_failed', err.message ?? 'Failed to validate code', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

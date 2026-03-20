// API v2: Reset notification tiers
// POST /api/v2/notifications/tiers/reset

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { resetNotificationTier, resetAllNotificationTiers } from '@/lib/notifications/tier-actions'

const ResetBody = z.object({
  action: z.string().optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const parsed = ResetBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      if (parsed.data.action) {
        const result = await resetNotificationTier(parsed.data.action)
        if (result.error) return apiError('reset_failed', result.error, 500)
      } else {
        const result = await resetAllNotificationTiers()
        if (result.error) return apiError('reset_failed', result.error, 500)
      }
      return apiSuccess({ reset: true })
    } catch (err: any) {
      return apiError('reset_failed', err.message ?? 'Failed to reset tiers', 500)
    }
  },
  { scopes: ['notifications:write'] }
)

// API v2: Notification Tier Management
// GET   /api/v2/notifications/tiers
// PATCH /api/v2/notifications/tiers

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { getTierMapForTenant, updateTierForTenant } from '@/lib/notifications/store'

const UpdateTierBody = z.object({
  action: z.string().min(1),
  tier: z.enum(['critical', 'alert', 'info']),
})

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const tiers = await getTierMapForTenant(ctx.tenantId)
      return apiSuccess({ tiers })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch tiers', 500)
    }
  },
  { scopes: ['notifications:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateTierBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await updateTierForTenant(ctx.tenantId, parsed.data.action, parsed.data.tier)
      if (result.error) return apiError('update_failed', result.error, 500)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update tier', 500)
    }
  },
  { scopes: ['notifications:write'] }
)

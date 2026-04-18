// API v2: Client Loyalty Profile
// GET /api/v2/loyalty/clients/:id

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { getClientLoyaltyProfileForTenant } from '@/lib/loyalty/store'

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    try {
      const profile = await getClientLoyaltyProfileForTenant(ctx.tenantId, id)
      return apiSuccess(profile)
    } catch (err) {
      console.error('[api/v2/loyalty/clients] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch client loyalty profile', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

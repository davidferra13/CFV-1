// API v2: Partner Invite
// POST /api/v2/partners/:id/invite

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { generatePartnerInviteForTenant } from '@/lib/partners/store'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    try {
      const result = await generatePartnerInviteForTenant(ctx.tenantId, id)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('invite_failed', err.message ?? 'Failed to generate invite', 500)
    }
  },
  { scopes: ['partners:write'] }
)

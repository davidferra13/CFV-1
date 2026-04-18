// API v2: Generate partner share link
// POST /api/v2/partners/:id/share-link

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { generatePartnerShareLinkForTenant } from '@/lib/partners/store'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    try {
      const result = await generatePartnerShareLinkForTenant(ctx.tenantId, id)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('generate_failed', err.message ?? 'Failed to generate share link', 500)
    }
  },
  { scopes: ['partners:write'] }
)

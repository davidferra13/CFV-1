// API v2: Loyalty Voucher by ID - deactivate
// DELETE /api/v2/loyalty/vouchers/:id

import { withApiAuth, apiNoContent, apiNotFound, apiError } from '@/lib/api/v2'
import { deactivateIncentiveForTenant } from '@/lib/loyalty/voucher-store'

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Voucher')

    try {
      await deactivateIncentiveForTenant(ctx.tenantId, id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('deactivate_failed', err.message ?? 'Failed to deactivate voucher', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

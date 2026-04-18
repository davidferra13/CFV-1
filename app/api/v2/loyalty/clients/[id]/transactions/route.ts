// API v2: Client Loyalty Transactions
// GET /api/v2/loyalty/clients/:id/transactions

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { getLoyaltyTransactionsForTenant } from '@/lib/loyalty/store'

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    try {
      const transactions = await getLoyaltyTransactionsForTenant(ctx.tenantId, id)
      return apiSuccess(transactions)
    } catch (err) {
      console.error('[api/v2/loyalty/clients/transactions] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch loyalty transactions', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

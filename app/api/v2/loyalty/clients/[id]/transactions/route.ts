// API v2: Client Loyalty Transactions
// GET /api/v2/loyalty/clients/:id/transactions

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { getLoyaltyTransactions } from '@/lib/loyalty/actions'

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    try {
      const transactions = await getLoyaltyTransactions(id)
      return apiSuccess(transactions)
    } catch (err) {
      console.error('[api/v2/loyalty/clients/transactions] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch loyalty transactions', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

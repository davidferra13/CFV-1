// API v2: Loyalty Raffle by ID
// GET /api/v2/loyalty/raffles/:id  (results + eligible entries)

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { getRaffleResults, getEligibleEntries } from '@/lib/loyalty/raffle-actions'

export const GET = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Raffle')

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view')

    try {
      if (view === 'entries') {
        const entries = await getEligibleEntries(id)
        return apiSuccess({ entries })
      }
      const results = await getRaffleResults(id)
      return apiSuccess(results)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch raffle', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

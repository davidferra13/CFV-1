// API v2: Commerce Register Session History
// GET /api/v2/commerce/register/history

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiError, parsePagination, paginationMeta } from '@/lib/api/v2'
import { getRegisterSessionHistory } from '@/lib/commerce/register-actions'

export const GET = withApiAuth(
  async (req: NextRequest, _ctx) => {
    const { searchParams } = new URL(req.url)
    const { limit, offset } = parsePagination(searchParams)
    const status = searchParams.get('status') ?? undefined

    try {
      const result = await getRegisterSessionHistory({ limit, offset, status: status as any })
      return apiSuccess({
        sessions: result.sessions,
        ...paginationMeta(result.total, limit, offset),
      })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch register history', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

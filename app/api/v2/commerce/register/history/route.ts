// API v2: Commerce Register Session History
// GET /api/v2/commerce/register/history

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiError, parsePagination, paginationMeta } from '@/lib/api/v2'
import { getRegisterSessionHistory } from '@/lib/commerce/register-actions'

export const GET = withApiAuth(
  async (req: NextRequest, _ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status') ?? undefined
    const limit = pagination.per_page
    const offset = (pagination.page - 1) * limit

    try {
      const result = await getRegisterSessionHistory({ limit, offset, status: status as any })
      return apiSuccess({
        sessions: result.sessions,
        ...paginationMeta(pagination, result.total),
      })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch register history', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

// API v2: Commerce Register Session by ID
// GET /api/v2/commerce/register/:id

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { getRegisterSession } from '@/lib/commerce/register-actions'

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Register session')

    try {
      const session = await getRegisterSession(id)
      if (!session) return apiNotFound('Register session')
      return apiSuccess(session)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch register session', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

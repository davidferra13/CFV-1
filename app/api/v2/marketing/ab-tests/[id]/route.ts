// API v2: Marketing A/B Tests - Get Results & Resolve by ID
// GET   /api/v2/marketing/ab-tests/:id
// PATCH /api/v2/marketing/ab-tests/:id

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiError, apiNotFound } from '@/lib/api/v2'
import { getABTestResults, resolveABTest } from '@/lib/marketing/ab-test-actions'

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('A/B Test')

    try {
      const data = await getABTestResults(id)
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch A/B test results', 500)
    }
  },
  { scopes: ['marketing:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('A/B Test')

    let body: { winner?: 'a' | 'b' }
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    if (body.winner !== 'a' && body.winner !== 'b') {
      return apiError('validation_error', 'winner must be "a" or "b"', 400)
    }

    try {
      const result = await resolveABTest(id, body.winner)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('resolve_failed', err.message ?? 'Failed to resolve A/B test', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

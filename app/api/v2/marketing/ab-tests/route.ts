// API v2: Marketing A/B Tests - List & Create
// GET  /api/v2/marketing/ab-tests
// POST /api/v2/marketing/ab-tests

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { listABTests, createABTest } from '@/lib/marketing/ab-test-actions'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const data = await listABTests()
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch A/B tests', 500)
    }
  },
  { scopes: ['marketing:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await createABTest(body as any)
      return apiCreated(result)
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create A/B test', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

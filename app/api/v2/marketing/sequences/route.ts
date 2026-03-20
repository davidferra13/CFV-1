// API v2: Marketing Sequences - List & Create
// GET  /api/v2/marketing/sequences
// POST /api/v2/marketing/sequences

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { listSequences, createSequence } from '@/lib/marketing/actions'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const data = await listSequences()
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch sequences', 500)
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
      const id = await createSequence(body as any)
      return apiCreated({ id })
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create sequence', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

// API v2: Raffles - List & Create
// GET  /api/v2/loyalty/raffles
// POST /api/v2/loyalty/raffles

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { getRafflesForTenant, createRaffleForTenant } from '@/lib/loyalty/raffle-store'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const raffles = await getRafflesForTenant(ctx.tenantId)
      return apiSuccess(raffles)
    } catch (err) {
      console.error('[api/v2/loyalty/raffles] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch raffles', 500)
    }
  },
  { scopes: ['loyalty:read'] }
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
      const result = await createRaffleForTenant(ctx.tenantId, body as any)
      return apiCreated(result)
    } catch (err) {
      console.error('[api/v2/loyalty/raffles] POST error:', err)
      return apiError('create_failed', 'Failed to create raffle', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

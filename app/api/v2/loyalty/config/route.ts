// API v2: Loyalty Config - Get & Update
// GET   /api/v2/loyalty/config
// PATCH /api/v2/loyalty/config

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import { getLoyaltyConfig, updateLoyaltyConfig } from '@/lib/loyalty/actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const config = await getLoyaltyConfig()
      return apiSuccess(config)
    } catch (err) {
      console.error('[api/v2/loyalty/config] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch loyalty config', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await updateLoyaltyConfig(body as any)
      return apiSuccess(result)
    } catch (err) {
      console.error('[api/v2/loyalty/config] PATCH error:', err)
      return apiError('update_failed', 'Failed to update loyalty config', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

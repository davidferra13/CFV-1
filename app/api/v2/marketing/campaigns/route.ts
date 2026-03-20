// API v2: Marketing Campaigns - List & Create
// GET  /api/v2/marketing/campaigns
// POST /api/v2/marketing/campaigns

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { listCampaigns, createCampaign } from '@/lib/marketing/actions'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const data = await listCampaigns()
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch campaigns', 500)
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
      const id = await createCampaign(body as any)
      return apiCreated({ id })
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create campaign', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

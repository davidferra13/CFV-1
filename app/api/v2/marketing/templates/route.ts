// API v2: Marketing Campaign Templates - List & Create
// GET  /api/v2/marketing/templates
// POST /api/v2/marketing/templates

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { listCampaignTemplates, createCampaignTemplate } from '@/lib/marketing/actions'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const data = await listCampaignTemplates()
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch templates', 500)
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
      await createCampaignTemplate(body as any)
      return apiCreated({ success: true })
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create template', 500)
    }
  },
  { scopes: ['marketing:write'] }
)

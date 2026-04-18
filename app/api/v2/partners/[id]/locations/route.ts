// API v2: Partner Locations - List & Create
// GET  /api/v2/partners/:id/locations
// POST /api/v2/partners/:id/locations

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError, apiNotFound } from '@/lib/api/v2'
import { getPartnerLocationsForTenant, createPartnerLocationForTenant } from '@/lib/partners/store'

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    try {
      const locations = await getPartnerLocationsForTenant(ctx.tenantId, id)
      return apiSuccess(locations)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch locations'
      if (message === 'Partner not found') return apiNotFound('Partner')
      console.error('[api/v2/partners/locations] GET error:', err)
      return apiError('fetch_failed', message, 500)
    }
  },
  { scopes: ['partners:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await createPartnerLocationForTenant(ctx.tenantId, {
        partner_id: id,
        ...(body as any),
      })
      return apiCreated(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create location'
      if (message === 'Partner not found') return apiNotFound('Partner')
      console.error('[api/v2/partners/locations] POST error:', err)
      return apiError('create_failed', message, 500)
    }
  },
  { scopes: ['partners:write'] }
)

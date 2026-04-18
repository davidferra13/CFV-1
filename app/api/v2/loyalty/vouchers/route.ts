// API v2: Vouchers & Gift Cards - List & Create
// GET  /api/v2/loyalty/vouchers
// POST /api/v2/loyalty/vouchers

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import {
  getVoucherAndGiftCardsForTenant,
  createVoucherOrGiftCardForTenant,
} from '@/lib/loyalty/voucher-store'

export const GET = withApiAuth(
  async (_req, ctx) => {
    try {
      const vouchers = await getVoucherAndGiftCardsForTenant(ctx.tenantId)
      return apiSuccess(vouchers)
    } catch (err) {
      console.error('[api/v2/loyalty/vouchers] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch vouchers and gift cards', 500)
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
      const result = await createVoucherOrGiftCardForTenant(ctx.tenantId, body as any)
      return apiCreated(result)
    } catch (err) {
      console.error('[api/v2/loyalty/vouchers] POST error:', err)
      return apiError('create_failed', 'Failed to create voucher or gift card', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

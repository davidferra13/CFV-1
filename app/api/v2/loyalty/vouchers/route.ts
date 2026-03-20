// API v2: Vouchers & Gift Cards - List & Create
// GET  /api/v2/loyalty/vouchers
// POST /api/v2/loyalty/vouchers

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { getVoucherAndGiftCards, createVoucherOrGiftCard } from '@/lib/loyalty/voucher-actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const vouchers = await getVoucherAndGiftCards()
      return apiSuccess(vouchers)
    } catch (err) {
      console.error('[api/v2/loyalty/vouchers] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch vouchers and gift cards', 500)
    }
  },
  { scopes: ['loyalty:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const result = await createVoucherOrGiftCard(body as any)
      return apiCreated(result)
    } catch (err) {
      console.error('[api/v2/loyalty/vouchers] POST error:', err)
      return apiError('create_failed', 'Failed to create voucher or gift card', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

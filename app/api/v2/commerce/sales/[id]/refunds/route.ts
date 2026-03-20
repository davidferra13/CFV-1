// API v2: Commerce Sale Refunds
// GET  /api/v2/commerce/sales/:id/refunds
// POST /api/v2/commerce/sales/:id/refunds

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { createRefund, getRefundsForSale } from '@/lib/commerce/refund-actions'

const CreateRefundBody = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().min(1, 'Refund reason is required'),
  method: z.enum(['cash', 'card', 'original_method']).optional(),
  itemIds: z.array(z.string().uuid()).optional(),
})

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const saleId = params?.id
    if (!saleId) return apiNotFound('Sale')

    try {
      const refunds = await getRefundsForSale(saleId)
      return apiSuccess({ refunds })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch refunds', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const saleId = params?.id
    if (!saleId) return apiNotFound('Sale')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateRefundBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await createRefund({ saleId, ...parsed.data })
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('refund_failed', err.message ?? 'Failed to create refund', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

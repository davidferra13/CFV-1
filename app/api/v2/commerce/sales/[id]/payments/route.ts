// API v2: Commerce Sale Payments
// GET  /api/v2/commerce/sales/:id/payments
// POST /api/v2/commerce/sales/:id/payments

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { recordPayment, getPaymentsForSale } from '@/lib/commerce/payment-actions'

const RecordPaymentBody = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(['cash', 'card', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const saleId = params?.id
    if (!saleId) return apiNotFound('Sale')

    try {
      const payments = await getPaymentsForSale(saleId)
      return apiSuccess({ payments })
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch payments', 500)
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

    const parsed = RecordPaymentBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await recordPayment({ saleId, ...parsed.data })
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('payment_failed', err.message ?? 'Failed to record payment', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

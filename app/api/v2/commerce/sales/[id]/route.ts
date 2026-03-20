// API v2: Commerce Sales - Get & Void by ID
// GET    /api/v2/commerce/sales/:id
// DELETE /api/v2/commerce/sales/:id  (voids the sale)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNoContent,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/v2'
import { getSale, voidSale } from '@/lib/commerce/sale-actions'

const VoidSaleBody = z.object({
  reason: z.string().min(1, 'Void reason is required'),
})

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Sale')

    try {
      const sale = await getSale(id)
      if (!sale) return apiNotFound('Sale')
      return apiSuccess(sale)
    } catch (err: any) {
      return apiNotFound('Sale')
    }
  },
  { scopes: ['commerce:read'] }
)

export const DELETE = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Sale')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = VoidSaleBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await voidSale(id, parsed.data.reason)
      return apiNoContent()
    } catch (err: any) {
      if (err.message?.includes('not found')) return apiNotFound('Sale')
      return apiError('void_failed', err.message ?? 'Failed to void sale', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

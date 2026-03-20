// API v2: Commerce Sale Items
// POST   /api/v2/commerce/sales/:id/items  (add item)
// DELETE handled via POST with action

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
import { addSaleItem, removeSaleItem, updateSaleItemQuantity } from '@/lib/commerce/sale-actions'

const AddItemBody = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
})

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

    const parsed = AddItemBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await addSaleItem({ saleId, ...parsed.data })
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('add_item_failed', err.message ?? 'Failed to add item', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const saleId = params?.id
    if (!saleId) return apiNotFound('Sale')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = z
      .object({
        itemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
      .safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await updateSaleItemQuantity(saleId, parsed.data.itemId, parsed.data.quantity)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_item_failed', err.message ?? 'Failed to update item', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

export const DELETE = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const saleId = params?.id
    if (!saleId) return apiNotFound('Sale')

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    if (!itemId) return apiError('missing_item_id', 'itemId query parameter is required', 400)

    try {
      await removeSaleItem(saleId, itemId)
      return apiNoContent()
    } catch (err: any) {
      return apiError('remove_item_failed', err.message ?? 'Failed to remove item', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

// API v2: Commerce Products - Get & Update by ID
// GET   /api/v2/commerce/products/:id
// PATCH /api/v2/commerce/products/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { getProduct, updateProduct } from '@/lib/commerce/product-actions'

const UpdateProductBody = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    image_url: z.string().optional(),
    price_cents: z.number().int().nonnegative().optional(),
    cost_cents: z.number().int().nonnegative().nullable().optional(),
    tax_class: z
      .enum(['standard', 'reduced', 'exempt', 'alcohol', 'cannabis', 'prepared_food', 'zero'])
      .optional(),
    track_inventory: z.boolean().optional(),
    available_qty: z.number().int().nonnegative().nullable().optional(),
    low_stock_threshold: z.number().int().nonnegative().nullable().optional(),
    tags: z.array(z.string()).optional(),
    modifiers: z
      .array(
        z.object({
          name: z.string(),
          options: z.array(z.object({ label: z.string(), price_delta_cents: z.number().int() })),
        })
      )
      .optional(),
    dietary_tags: z.array(z.string()).optional(),
    allergen_flags: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Product')

    try {
      const product = await getProduct(id)
      if (!product) return apiNotFound('Product')
      return apiSuccess(product)
    } catch (err: any) {
      return apiNotFound('Product')
    }
  },
  { scopes: ['commerce:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Product')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateProductBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const product = await updateProduct({ id, ...parsed.data } as any)
      return apiSuccess(product)
    } catch (err: any) {
      if (err.message?.includes('not found')) return apiNotFound('Product')
      return apiError('update_failed', err.message ?? 'Failed to update product', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

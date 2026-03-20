// API v2: Commerce Products - List & Create
// GET  /api/v2/commerce/products?category=...&activeOnly=true&search=...&limit=50&offset=0
// POST /api/v2/commerce/products

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { listProducts, createProduct } from '@/lib/commerce/product-actions'

const CreateProductBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
  price_cents: z.number().int().nonnegative(),
  cost_cents: z.number().int().nonnegative().optional(),
  tax_class: z
    .enum(['standard', 'reduced', 'exempt', 'alcohol', 'cannabis', 'prepared_food', 'zero'])
    .optional(),
  track_inventory: z.boolean().optional(),
  available_qty: z.number().int().nonnegative().optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
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
  recipe_id: z.string().uuid().optional(),
  menu_id: z.string().uuid().optional(),
})

export const GET = withApiAuth(
  async (req, _ctx) => {
    const url = new URL(req.url)
    const category = url.searchParams.get('category') ?? undefined
    const activeOnly = url.searchParams.get('activeOnly') === 'true' ? true : undefined
    const search = url.searchParams.get('search') ?? undefined
    const limit = url.searchParams.get('limit')
      ? parseInt(url.searchParams.get('limit')!, 10)
      : undefined
    const offset = url.searchParams.get('offset')
      ? parseInt(url.searchParams.get('offset')!, 10)
      : undefined

    try {
      const data = await listProducts({ category, activeOnly, search, limit, offset })
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('list_failed', err.message ?? 'Failed to list products', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateProductBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const product = await createProduct(parsed.data as any)
      return apiCreated(product)
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create product', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

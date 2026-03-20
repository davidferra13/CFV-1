// API v2: Commerce Promotions - List & Create
// GET  /api/v2/commerce/promotions
// POST /api/v2/commerce/promotions

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { listPromotions, createPromotion } from '@/lib/commerce/promotion-actions'

const CreatePromotionBody = z.object({
  code: z.string().min(3).max(32),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(['percent_order', 'percent_item', 'fixed_order', 'fixed_item']),
  discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  discountCents: z.number().int().positive().nullable().optional(),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  maxDiscountCents: z.number().int().positive().nullable().optional(),
  targetTaxClasses: z
    .array(
      z.enum(['standard', 'reduced', 'exempt', 'alcohol', 'cannabis', 'prepared_food', 'zero'])
    )
    .optional(),
  autoApply: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
})

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const data = await listPromotions()
      return apiSuccess(data)
    } catch (err: any) {
      return apiError('list_failed', err.message ?? 'Failed to list promotions', 500)
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

    const parsed = CreatePromotionBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const promotion = await createPromotion(parsed.data as any)
      return apiCreated(promotion)
    } catch (err: any) {
      return apiError('create_failed', err.message ?? 'Failed to create promotion', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

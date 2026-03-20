// API v2: Commerce Checkout - Counter checkout
// POST /api/v2/commerce/checkout

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'
import { counterCheckout } from '@/lib/commerce/checkout-actions'

const CheckoutItemSchema = z.object({
  productProjectionId: z.string().uuid().optional(),
  name: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  taxClass: z
    .enum(['standard', 'reduced', 'exempt', 'alcohol', 'cannabis', 'prepared_food', 'zero'])
    .optional(),
  taxCents: z.number().int().nonnegative().optional(),
  modifiersApplied: z
    .array(
      z.object({
        name: z.string(),
        option: z.string(),
        price_delta_cents: z.number().int(),
      })
    )
    .optional(),
  unitCostCents: z.number().int().nonnegative().optional(),
})

const SplitTenderSchema = z.object({
  paymentMethod: z.string(),
  amountCents: z.number().int().positive(),
  amountTenderedCents: z.number().int().nonnegative().optional(),
  cardEntryMode: z.enum(['terminal', 'manual_keyed']).optional(),
  manualCardReference: z.string().optional(),
})

const CheckoutBody = z.object({
  registerSessionId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  items: z.array(CheckoutItemSchema).min(1),
  paymentMethod: z.string(),
  amountTenderedCents: z.number().int().nonnegative(),
  saleChannel: z.enum(['counter', 'order_ahead', 'invoice', 'online', 'phone']).optional(),
  splitTenders: z.array(SplitTenderSchema).optional(),
  ageVerified: z.boolean().optional(),
  promotionCode: z.string().optional(),
  tipCents: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().optional(),
  taxZipCode: z.string().optional(),
  cardEntryMode: z.enum(['terminal', 'manual_keyed']).optional(),
  manualCardReference: z.string().optional(),
  notes: z.string().optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CheckoutBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      const result = await counterCheckout(parsed.data as any)
      return apiCreated(result)
    } catch (err: any) {
      return apiError('checkout_failed', err.message ?? 'Checkout failed', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

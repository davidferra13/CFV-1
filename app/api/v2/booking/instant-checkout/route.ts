// API v2: Booking - Instant Book Checkout
// POST /api/v2/booking/instant-checkout

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { createInstantBookingCheckout } from '@/lib/booking/instant-book-actions'

const CheckoutBody = z
  .object({
    serviceId: z.string().uuid(),
    date: z.string(),
    timeSlot: z.string().optional(),
    guestCount: z.number().int().positive(),
    clientName: z.string().min(1),
    clientEmail: z.string().email(),
    clientPhone: z.string().optional(),
    notes: z.string().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
  })
  .passthrough()

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
      const result = await createInstantBookingCheckout(parsed.data as any)
      return apiSuccess(result)
    } catch (err: any) {
      return apiError('checkout_failed', err.message ?? 'Failed to create instant booking', 500)
    }
  },
  { scopes: ['booking:write'] }
)

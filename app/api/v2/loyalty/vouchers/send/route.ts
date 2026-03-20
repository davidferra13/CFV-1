// API v2: Loyalty - Send voucher/gift card to anyone
// POST /api/v2/loyalty/vouchers/send

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { sendVoucherOrGiftCardToAnyone } from '@/lib/loyalty/voucher-actions'

const SendBody = z.object({
  incentiveId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1),
  message: z.string().optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = SendBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await sendVoucherOrGiftCardToAnyone(parsed.data as any)
      return apiSuccess({ sent: true })
    } catch (err: any) {
      return apiError('send_failed', err.message ?? 'Failed to send voucher', 500)
    }
  },
  { scopes: ['loyalty:write'] }
)

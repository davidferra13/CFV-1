'use server'

import { sendDirectOutreach } from '@/lib/marketing/actions'
import { createVoucherOrGiftCard } from '@/lib/loyalty/voucher-actions'

/**
 * Send a one-click holiday outreach message to a specific client.
 * Wraps sendDirectOutreach and logs to direct_outreach_log.
 */
export async function sendHolidayOutreachToClient(input: {
  clientId: string
  body: string
  holidayName: string
  channel: 'email' | 'sms'
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendDirectOutreach({
      clientId: input.clientId,
      channel: input.channel,
      subject: `${input.holidayName} - a note from your chef`,
      body: input.body,
    })
    return { ok: true }
  } catch (err) {
    console.error('[sendHolidayOutreachToClient]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
  }
}

/**
 * Create a holiday promo code (discount voucher) that can be shared with clients.
 * Returns the normalized code on success.
 */
export async function createHolidayPromoCode(input: {
  holidayName: string
  code: string
  discountPercent?: number
  amountCents?: number
  maxRedemptions: number
  expiresAt: string
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  try {
    if (!input.discountPercent && !input.amountCents) {
      return { ok: false, error: 'Provide either a discount % or a fixed dollar amount' }
    }

    const result = await createVoucherOrGiftCard({
      type: 'voucher',
      title: `${input.holidayName} Promo`,
      code: input.code,
      discount_percent: input.discountPercent,
      amount_cents: input.amountCents,
      max_redemptions: input.maxRedemptions,
      expires_at: input.expiresAt,
      target_client_id: null,
    })

    return { ok: true, code: result.incentive.code }
  } catch (err) {
    console.error('[createHolidayPromoCode]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Could not create promo code' }
  }
}

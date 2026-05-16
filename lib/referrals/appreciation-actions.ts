// Referrer Appreciation Actions
// Post-event thank-you flow: chef sends personalized thank-you to referrer.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { createElement } from 'react'
import { ReferrerMilestoneEmail } from '@/lib/email/templates/referrer-milestone'

/**
 * Get pending thank-you prompts for a chef after event completion.
 * Returns referrals where the event is completed but no thank-you has been sent.
 */
export async function getPendingThankYouPrompts(): Promise<
  Array<{
    referralId: string
    referrerName: string | null
    referrerEmail: string
    eventId: string
    chefName: string
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: referrals } = await db
    .from('client_referrals')
    .select(
      `
      id,
      converted_event_id,
      thank_you_sent_at,
      referrer:clients!client_referrals_referrer_client_id_fkey(full_name, email)
    `
    )
    .eq('tenant_id', user.entityId)
    .eq('status', 'completed')
    .is('thank_you_sent_at', null)
    .not('converted_event_id', 'is', null)

  if (!referrals || referrals.length === 0) return []

  const { data: chef } = await db
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', user.entityId)
    .single()

  const chefName = chef?.business_name || chef?.full_name || 'Your Chef'

  return referrals
    .filter((r: any) => r.referrer?.email)
    .map((r: any) => ({
      referralId: r.id,
      referrerName: r.referrer.full_name || null,
      referrerEmail: r.referrer.email,
      eventId: r.converted_event_id,
      chefName,
    }))
}

/**
 * Send a thank-you to a referrer. One-click action for the chef.
 */
export async function sendReferrerThankYou(params: {
  referralId: string
  customMessage?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: referral } = await db
    .from('client_referrals')
    .select(
      `
      id,
      thank_you_sent_at,
      referrer:clients!client_referrals_referrer_client_id_fkey(full_name, email)
    `
    )
    .eq('id', params.referralId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (!referral) {
    return { success: false, error: 'Referral not found' }
  }

  if (referral.thank_you_sent_at) {
    return { success: false, error: 'Thank you already sent' }
  }

  const referrerEmail = referral.referrer?.email
  if (!referrerEmail) {
    return { success: false, error: 'Referrer has no email' }
  }

  const referrerName = referral.referrer?.full_name || 'there'

  // Get chef info
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', user.entityId)
    .single()

  const chefName = chef?.business_name || chef?.full_name || 'Your Chef'

  const body = params.customMessage
    ? params.customMessage
    : `Thank you so much for referring someone my way. Your support means the world to my business. I truly appreciate you spreading the word.`

  try {
    await sendEmail({
      to: referrerEmail,
      subject: `A personal thank you from ${chefName}`,
      react: createElement(ReferrerMilestoneEmail, {
        recipientName: referrerName,
        heading: `Thank you from ${chefName}`,
        body,
        chefName,
      }),
    })

    await db
      .from('client_referrals')
      .update({ thank_you_sent_at: new Date().toISOString() })
      .eq('id', params.referralId)

    return { success: true }
  } catch (error) {
    console.error('[sendReferrerThankYou] Failed:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

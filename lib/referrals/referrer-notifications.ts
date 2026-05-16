// Referrer Circle Visibility - Milestone Notifications
// Sends privacy-respecting updates to referrers at key lifecycle events.
// NEVER shares: client full name, event date, address, guest count, pricing, menu, private comms.

'use server'

import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { createElement } from 'react'
import { ReferrerMilestoneEmail } from '@/lib/email/templates/referrer-milestone'

export type ReferrerMilestone =
  | 'inquiry_received'
  | 'booking_confirmed'
  | 'event_completed'
  | 'review_posted'

type MilestoneConfig = {
  subject: string
  heading: string
  body: string
}

function getMilestoneConfig(
  milestone: ReferrerMilestone,
  chefName: string,
  starRating?: number
): MilestoneConfig {
  switch (milestone) {
    case 'inquiry_received':
      return {
        subject: `Your referral to ${chefName} was received!`,
        heading: 'Your referral was received!',
        body: `Someone you referred reached out to ${chefName}. We'll keep you posted on how it goes.`,
      }
    case 'booking_confirmed':
      return {
        subject: `${chefName} booked an event thanks to you!`,
        heading: 'Your referral turned into a booking!',
        body: `${chefName} booked an event thanks to your referral. You helped make that happen.`,
      }
    case 'event_completed':
      return {
        subject: 'The event you helped make happen was a success!',
        heading: 'Event complete!',
        body: `The event you helped make happen with ${chefName} was a success. Thank you for spreading the word.`,
      }
    case 'review_posted':
      return {
        subject: `Your referral left a ${starRating}-star review!`,
        heading: 'Your referral left a review!',
        body: `Your referral left a ${starRating}-star review for ${chefName}. Thanks for connecting great people with great food.`,
      }
  }
}

/**
 * Check whether referrer notifications are allowed for this referral.
 * Respects both client opt-out and chef global/per-event disable.
 */
export async function canNotifyReferrer(params: {
  referralId: string
  chefId: string
  eventId?: string | null
}): Promise<{ allowed: boolean; referrerEmail: string | null; referrerName: string | null }> {
  const db: any = createServerClient()

  // Load referral with referrer info
  const { data: referral } = await db
    .from('client_referrals')
    .select(
      `
      id,
      referrer_client_id,
      referred_client_id,
      referrer:clients!client_referrals_referrer_client_id_fkey(id, email, full_name, referrer_notifications_opt_out),
      referred:clients!client_referrals_referred_client_id_fkey(id, referrer_notifications_opt_out)
    `
    )
    .eq('id', params.referralId)
    .maybeSingle()

  if (!referral || !referral.referrer) {
    return { allowed: false, referrerEmail: null, referrerName: null }
  }

  const referrerEmail = referral.referrer.email as string | null
  const referrerName = referral.referrer.full_name as string | null

  // Client opted out of notifying their referrer
  if (referral.referred?.referrer_notifications_opt_out) {
    return { allowed: false, referrerEmail, referrerName }
  }

  // Chef disabled referrer notifications globally
  const { data: chefSettings } = await db
    .from('chef_settings')
    .select('referrer_notifications_enabled')
    .eq('chef_id', params.chefId)
    .maybeSingle()

  if (chefSettings && chefSettings.referrer_notifications_enabled === false) {
    return { allowed: false, referrerEmail, referrerName }
  }

  // Chef disabled for this specific event
  if (params.eventId) {
    const { data: eventSettings } = await db
      .from('events')
      .select('referrer_notifications_disabled')
      .eq('id', params.eventId)
      .eq('tenant_id', params.chefId)
      .maybeSingle()

    if (eventSettings?.referrer_notifications_disabled) {
      return { allowed: false, referrerEmail, referrerName }
    }
  }

  if (!referrerEmail) {
    return { allowed: false, referrerEmail: null, referrerName }
  }

  return { allowed: true, referrerEmail, referrerName }
}

/**
 * Send a milestone notification to a referrer.
 * Fire-and-forget; errors are logged, never thrown.
 */
export async function notifyReferrerMilestone(params: {
  referralId: string
  chefId: string
  milestone: ReferrerMilestone
  eventId?: string | null
  starRating?: number
}): Promise<{ sent: boolean }> {
  try {
    const { allowed, referrerEmail, referrerName } = await canNotifyReferrer({
      referralId: params.referralId,
      chefId: params.chefId,
      eventId: params.eventId,
    })

    if (!allowed || !referrerEmail) {
      return { sent: false }
    }

    // Get chef name for the notification
    const db: any = createServerClient()
    const { data: chef } = await db
      .from('chefs')
      .select('business_name, full_name')
      .eq('id', params.chefId)
      .single()

    const chefName = chef?.business_name || chef?.full_name || 'Your Chef'
    const config = getMilestoneConfig(params.milestone, chefName, params.starRating)

    await sendEmail({
      to: referrerEmail,
      subject: config.subject,
      react: createElement(ReferrerMilestoneEmail, {
        recipientName: referrerName || 'there',
        heading: config.heading,
        body: config.body,
        chefName,
      }),
    })

    // Update referral status based on milestone
    const statusMap: Record<ReferrerMilestone, string> = {
      inquiry_received: 'contacted',
      booking_confirmed: 'booked',
      event_completed: 'completed',
      review_posted: 'completed',
    }

    await db
      .from('client_referrals')
      .update({ status: statusMap[params.milestone], updated_at: new Date().toISOString() })
      .eq('id', params.referralId)

    return { sent: true }
  } catch (error) {
    console.error('[notifyReferrerMilestone] Failed:', error)
    return { sent: false }
  }
}

/**
 * Find a referral record for a given inquiry.
 * Returns the referral ID if one exists, null otherwise.
 */
export async function findReferralByInquiry(inquiryId: string): Promise<string | null> {
  const db: any = createServerClient()
  const { data } = await db
    .from('client_referrals')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .maybeSingle()

  return data?.id || null
}

/**
 * Find a referral record for a given event.
 */
export async function findReferralByEvent(eventId: string): Promise<string | null> {
  const db: any = createServerClient()
  const { data } = await db
    .from('client_referrals')
    .select('id')
    .eq('converted_event_id', eventId)
    .maybeSingle()

  return data?.id || null
}

'use server'

import { createServerClient } from '@/lib/db/server'
import { sendFollowUpDueChefEmail } from '@/lib/email/notifications'
import { getChefProfile } from '@/lib/notifications/actions'

type FollowUpDeliveryResult =
  | { emailSent: true }
  | { emailSent: false; skipped: true; reason: string }

function computeDaysOverdue(followUpDueAt: string): number {
  const dueAt = new Date(followUpDueAt)
  if (Number.isNaN(dueAt.getTime())) {
    throw new Error('Follow-up due timestamp is invalid for repair.')
  }

  return Math.max(0, Math.floor((Date.now() - dueAt.getTime()) / (1000 * 60 * 60 * 24)))
}

export async function sendFollowUpDueEmailDelivery(input: {
  tenantId: string
  inquiryId: string
  clientName: string
  occasion: string | null
  followUpNote: string | null
  daysOverdue: number
}): Promise<FollowUpDeliveryResult> {
  const chefProfile = await getChefProfile(input.tenantId)
  if (!chefProfile?.email) {
    return {
      emailSent: false,
      skipped: true,
      reason: 'Chef email is missing for follow-up alert delivery.',
    }
  }

  const emailSent = await sendFollowUpDueChefEmail({
    chefEmail: chefProfile.email,
    chefName: chefProfile.name,
    clientName: input.clientName,
    occasion: input.occasion,
    followUpNote: input.followUpNote,
    daysOverdue: input.daysOverdue,
    inquiryId: input.inquiryId,
  })

  if (!emailSent) {
    throw new Error('Follow-up alert email provider did not confirm delivery.')
  }

  return { emailSent: true }
}

export async function redeliverFollowUpDueEmail(input: {
  tenantId: string
  inquiryId: string
  clientName: string
  occasion: string | null
  followUpNote: string | null
  followUpDueAt: string
}): Promise<{ emailSent: true; message: string }> {
  const db: any = createServerClient({ admin: true })
  const { data: inquiry, error } = await db
    .from('inquiries')
    .select('status')
    .eq('id', input.inquiryId)
    .eq('tenant_id', input.tenantId)
    .single()

  if (error || !inquiry) {
    throw new Error('Inquiry no longer exists for follow-up repair.')
  }

  if (inquiry.status !== 'awaiting_client') {
    throw new Error(
      `Inquiry is ${inquiry.status}, not awaiting_client. Automatic follow-up redelivery is blocked.`
    )
  }

  const delivery = await sendFollowUpDueEmailDelivery({
    tenantId: input.tenantId,
    inquiryId: input.inquiryId,
    clientName: input.clientName,
    occasion: input.occasion,
    followUpNote: input.followUpNote,
    daysOverdue: computeDaysOverdue(input.followUpDueAt),
  })

  if (!delivery.emailSent) {
    throw new Error(delivery.reason)
  }

  return {
    emailSent: true,
    message: 'Follow-up alert redelivered.',
  }
}

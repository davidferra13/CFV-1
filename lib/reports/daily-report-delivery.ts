'use server'

import { createElement } from 'react'
import { buildDerivedOutputObservabilityMetadata } from '@/lib/platform-observability/context'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { DailyReportEmail } from '@/lib/email/templates/daily-report'
import type { DailyReportContent } from '@/lib/reports/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

type DailyReportDeliveryResult =
  | { emailSent: true; recipientEmail: string }
  | { emailSent: false; skipped: true; reason: string }

function getRecipientDomain(email: string) {
  const [, domain] = email.split('@')
  return domain ?? null
}

async function resolveDailyReportRecipient(input: { tenantId: string }): Promise<{
  chefName: string
  recipientEmail: string | null
}> {
  const db: any = createServerClient({ admin: true })
  const { data: chef, error } = await db
    .from('chefs')
    .select('auth_user_id, business_name')
    .eq('id', input.tenantId)
    .single()

  if (error || !chef) {
    throw new Error('Chef profile is unavailable for daily report delivery.')
  }

  if (!chef.auth_user_id) {
    return {
      chefName: chef.business_name || 'Chef',
      recipientEmail: null,
    }
  }

  const { data: authUser } = await db.auth.admin.getUserById(chef.auth_user_id)

  return {
    chefName: chef.business_name || 'Chef',
    recipientEmail: authUser?.user?.email ?? null,
  }
}

export async function sendDailyReportEmailDelivery(input: {
  tenantId: string
  reportDate: string
  content: DailyReportContent
}): Promise<DailyReportDeliveryResult> {
  const { chefName, recipientEmail } = await resolveDailyReportRecipient({
    tenantId: input.tenantId,
  })

  if (!recipientEmail) {
    return {
      emailSent: false,
      skipped: true,
      reason: 'Chef auth email is missing for daily report delivery.',
    }
  }

  const emailSent = await sendEmail({
    to: recipientEmail,
    subject: `Daily Report - ${new Date(input.reportDate + 'T00:00:00Z').toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }
    )}`,
    react: createElement(DailyReportEmail, {
      chefName,
      reportDate: input.reportDate,
      content: input.content,
      reportUrl: `${APP_URL}/analytics/daily-report`,
    }),
  })

  if (!emailSent) {
    throw new Error('Daily report email provider did not confirm delivery.')
  }

  await recordPlatformEvent({
    eventKey: 'feature.daily_report_delivered',
    source: 'daily-report-email',
    actorType: 'system',
    tenantId: input.tenantId,
    subjectType: 'daily_report',
    subjectId: input.reportDate,
    summary: `Daily report delivered for ${input.reportDate}`,
    metadata: input.content.provenance
      ? buildDerivedOutputObservabilityMetadata(input.content.provenance, {
          delivery_channel: 'email',
          recipient_domain: getRecipientDomain(recipientEmail),
          report_date: input.reportDate,
        })
      : {
          delivery_channel: 'email',
          recipient_domain: getRecipientDomain(recipientEmail),
          report_date: input.reportDate,
        },
  })

  return { emailSent: true, recipientEmail }
}

export async function redeliverDailyReportEmail(input: {
  tenantId: string
  reportDate: string
}): Promise<{ emailSent: true; message: string }> {
  const db: any = createServerClient({ admin: true })
  const { data: report, error } = await db
    .from('daily_reports')
    .select('content')
    .eq('tenant_id', input.tenantId)
    .eq('report_date', input.reportDate)
    .maybeSingle()

  if (error || !report?.content) {
    throw new Error('Daily report no longer exists for redelivery.')
  }

  const delivery = await sendDailyReportEmailDelivery({
    tenantId: input.tenantId,
    reportDate: input.reportDate,
    content: report.content as DailyReportContent,
  })

  if (!delivery.emailSent) {
    throw new Error(delivery.reason)
  }

  const emailedAt = new Date().toISOString()
  const { error: updateError } = await db
    .from('daily_reports')
    .update({ email_sent_at: emailedAt })
    .eq('tenant_id', input.tenantId)
    .eq('report_date', input.reportDate)

  if (updateError) {
    throw new Error(`Failed to mark daily report delivery: ${updateError.message}`)
  }

  return {
    emailSent: true,
    message: `Daily report for ${input.reportDate} redelivered.`,
  }
}

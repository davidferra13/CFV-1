'use server'

// Admin Email Actions - direct and broadcast email via Resend
// Uses the service role to query all chefs, then sends via Resend.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { getResendClient, FROM_EMAIL, FROM_NAME } from '@/lib/email/resend-client'
import { logAdminAction } from './audit'

/**
 * Send a plain-text/HTML email to a single recipient directly from the admin panel.
 */
export async function sendAdminDirectEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  if (!to.trim() || !subject.trim() || !body.trim()) {
    return { success: false, error: 'Recipient, subject, and body are required.' }
  }

  const admin = await requireAdmin()

  try {
    const resend = getResendClient()
    const htmlBody = body
      .split('\n')
      .map((line) => `<p style="margin:0 0 8px 0">${line || '&nbsp;'}</p>`)
      .join('')

    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: to.trim(),
      subject: subject.trim(),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          ${htmlBody}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:12px;color:#94a3b8">Sent by ChefFlow Admin · <a href="https://cheflowhq.com">cheflowhq.com</a></p>
        </div>
      `,
      replyTo: admin.email,
    })

    if (error) {
      console.error('[Admin] sendAdminDirectEmail Resend error:', error)
      return { success: false, error: (error as any).message ?? 'Email failed to send.' }
    }

    await logAdminAction({
      actorEmail: admin.email,
      actorUserId: admin.id,
      actionType: 'admin_sent_email',
      targetType: 'email',
      details: { to, subject },
    })

    return { success: true }
  } catch (err: any) {
    console.error('[Admin] sendAdminDirectEmail error:', err)
    return { success: false, error: err.message ?? 'Unexpected error.' }
  }
}

/**
 * Broadcast an email to all active chefs, or only chefs inactive 60+ days.
 */
export async function sendAdminBroadcastEmail(
  target: 'all_chefs' | 'inactive_chefs',
  subject: string,
  body: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  if (!subject.trim() || !body.trim()) {
    return { success: false, sentCount: 0, error: 'Subject and body are required.' }
  }

  const admin = await requireAdmin()
  const db: any = createAdminClient()

  // Fetch target chefs
  let query = db.from('chefs').select('id, email, business_name')

  if (target === 'inactive_chefs') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    query = (query as any).lte('updated_at', cutoff.toISOString())
  }

  const { data: chefs, error: fetchError } = await (query as any)

  if (fetchError) {
    return { success: false, sentCount: 0, error: 'Failed to fetch chefs.' }
  }

  const recipients: string[] = (chefs ?? [])
    .map((c: { email: string | null }) => c.email)
    .filter(Boolean) as string[]

  if (recipients.length === 0) {
    return { success: false, sentCount: 0, error: 'No recipients found.' }
  }

  try {
    const resend = getResendClient()
    const htmlBody = body
      .split('\n')
      .map((line) => `<p style="margin:0 0 8px 0">${line || '&nbsp;'}</p>`)
      .join('')

    // Send in batches of 50 to respect Resend rate limits
    const BATCH = 50
    let sentCount = 0
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH)
      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        bcc: batch,
        to: FROM_EMAIL, // BCC pattern - "to" is the sender, everyone else is BCC
        subject: subject.trim(),
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            ${htmlBody}
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">Sent by ChefFlow Admin · <a href="https://cheflowhq.com">cheflowhq.com</a></p>
          </div>
        `,
        replyTo: admin.email,
      })

      if (error) {
        console.error('[Admin] broadcast batch error:', error)
      } else {
        sentCount += batch.length
      }
    }

    await logAdminAction({
      actorEmail: admin.email,
      actorUserId: admin.id,
      actionType: 'admin_broadcast_email',
      details: { target, subject, sentCount, totalRecipients: recipients.length },
    })

    return { success: true, sentCount }
  } catch (err: any) {
    console.error('[Admin] sendAdminBroadcastEmail error:', err)
    return { success: false, sentCount: 0, error: err.message ?? 'Unexpected error.' }
  }
}

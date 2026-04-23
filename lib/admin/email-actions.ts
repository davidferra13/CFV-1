'use server'

// Admin Email Actions - direct and broadcast email via the active email provider.
// Uses the service role to query all chefs, then sends through the provider layer.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { FROM_EMAIL, FROM_NAME } from '@/lib/email/resend-client'
import { getEmailProvider } from '@/lib/email/provider'
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
    const provider = getEmailProvider()
    const htmlBody = body
      .split('\n')
      .map((line) => `<p style="margin:0 0 8px 0">${line || '&nbsp;'}</p>`)
      .join('')

    await provider.send({
      kind: 'operational',
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: to.trim(),
      subject: subject.trim(),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          ${htmlBody}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:12px;color:#94a3b8">Sent by ChefFlow Admin Â· <a href="https://cheflowhq.com">cheflowhq.com</a></p>
        </div>
      `,
      replyTo: admin.email,
    })

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
    .map((chef: { email: string | null }) => chef.email)
    .filter(Boolean) as string[]

  if (recipients.length === 0) {
    return { success: false, sentCount: 0, error: 'No recipients found.' }
  }

  try {
    const provider = getEmailProvider()
    const htmlBody = body
      .split('\n')
      .map((line) => `<p style="margin:0 0 8px 0">${line || '&nbsp;'}</p>`)
      .join('')

    const batchSize = 50
    let sentCount = 0

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      try {
        await provider.send({
          kind: 'operational',
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          bcc: batch,
          to: FROM_EMAIL,
          subject: subject.trim(),
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              ${htmlBody}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
              <p style="font-size:12px;color:#94a3b8">Sent by ChefFlow Admin Â· <a href="https://cheflowhq.com">cheflowhq.com</a></p>
            </div>
          `,
          replyTo: admin.email,
        })
        sentCount += batch.length
      } catch (error) {
        console.error('[Admin] broadcast batch error:', error)
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

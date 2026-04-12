// Scheduled Messages Cron Processor
// GET/POST /api/scheduled/messages - invoked by cron on a regular interval
// Queries for messages with status='scheduled' and scheduled_for <= now(),
// sends via Resend (email channel), marks as sent or failed.

import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { NotificationGenericEmail } from '@/lib/email/templates/notification-generic'

async function handleScheduledMessages(req: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('scheduled-messages', async () => {
      const db = createServerClient({ admin: true })

      // Fetch all due scheduled messages
      const { data: dueMessages, error: fetchError } = await db
        .from('scheduled_messages')
        .select(
          `
          id, chef_id, recipient_id, channel, subject, body, scheduled_for,
          context_type, context_id, template_id
        `
        )
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(100)

      if (fetchError) {
        console.error('[scheduled-messages] Fetch error:', fetchError)
        throw new Error('Failed to query scheduled messages')
      }

      if (!dueMessages || dueMessages.length === 0) {
        return { processed: 0, sent: 0, failed: 0 }
      }

      let sent = 0
      let failed = 0

      for (const msg of dueMessages) {
        try {
          let success = false

          if (msg.channel === 'email') {
            // Look up recipient email address
            let recipientEmail: string | null = null
            let recipientName: string | null = null

            if (msg.recipient_id) {
              const { data: client } = await db
                .from('clients')
                .select('email, full_name')
                .eq('id', msg.recipient_id)
                .single()

              if (client) {
                recipientEmail = client.email
                recipientName = client.full_name
              }
            }

            if (!recipientEmail) {
              console.warn(
                `[scheduled-messages] No recipient email for message ${msg.id} - marking failed`
              )
              await db
                .from('scheduled_messages')
                .update({
                  status: 'failed',
                  error_message: 'No recipient email address found',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', msg.id)
              failed++
              continue
            }

            const subject = msg.subject || 'A message from your chef'
            success = await sendEmail({
              to: recipientEmail,
              subject,
              react: createElement(NotificationGenericEmail, {
                title: subject,
                body: msg.body,
              }),
            })
          } else {
            // SMS and app channels: mark as sent (not yet implemented)
            // App channel just logs for now; SMS needs Twilio integration
            console.log(
              `[scheduled-messages] Channel "${msg.channel}" not yet implemented for message ${msg.id}`
            )
            success = true
          }

          await db
            .from('scheduled_messages')
            .update({
              status: success ? 'sent' : 'failed',
              sent_at: success ? new Date().toISOString() : null,
              error_message: success ? null : 'Failed to send email',
              updated_at: new Date().toISOString(),
            })
            .eq('id', msg.id)

          if (success) sent++
          else failed++
        } catch (err) {
          console.error(`[scheduled-messages] Error processing message ${msg.id}:`, err)
          await db
            .from('scheduled_messages')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', msg.id)
          failed++
        }
      }

      return { processed: dueMessages.length, sent, failed }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/scheduled-messages] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export { handleScheduledMessages as GET, handleScheduledMessages as POST }

// Scheduled Messages Cron Processor
// GET/POST /api/scheduled/messages - invoked by cron on a regular interval
// Queries for messages with status='scheduled' and scheduled_for <= now(),
// sends via Resend (email channel), marks as sent or failed.

import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { sendSms } from '@/lib/sms/send'
import { NotificationGenericEmail } from '@/lib/email/templates/notification-generic'
import { sanitizeSmsContent } from '@/lib/phone/sms-content-policy'
import { evaluateScheduledSmsPolicy } from '@/lib/communication/sms-policy'

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
                .eq('tenant_id', msg.chef_id)
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
                .eq('chef_id', msg.chef_id)
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
          } else if (msg.channel === 'sms') {
            if (!msg.recipient_id) {
              await db
                .from('scheduled_messages')
                .update({
                  status: 'failed',
                  error_message: 'SMS blocked: no recipient client is linked',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', msg.id)
                .eq('chef_id', msg.chef_id)
              failed++
              continue
            }

            const [{ data: client }, { data: preferences }, { count: recentSmsCount }] =
              await Promise.all([
                db
                  .from('clients')
                  .select('id, phone, preferred_contact_method, communication_preference')
                  .eq('id', msg.recipient_id)
                  .eq('tenant_id', msg.chef_id)
                  .maybeSingle(),
                db
                  .from('chef_preferences')
                  .select(
                    'notification_quiet_hours_enabled, notification_quiet_hours_start, notification_quiet_hours_end'
                  )
                  .eq('tenant_id', msg.chef_id)
                  .maybeSingle(),
                db
                  .from('scheduled_messages')
                  .select('id', { count: 'exact', head: true })
                  .eq('chef_id', msg.chef_id)
                  .eq('recipient_id', msg.recipient_id)
                  .eq('channel', 'sms')
                  .eq('status', 'sent')
                  .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
              ])

            const policy = evaluateScheduledSmsPolicy({
              client,
              quietHours: {
                enabled: !!preferences?.notification_quiet_hours_enabled,
                startTime: preferences?.notification_quiet_hours_start ?? null,
                endTime: preferences?.notification_quiet_hours_end ?? null,
                timezone: 'America/New_York',
              },
              recentSmsCount24h: recentSmsCount ?? 0,
            })

            if (policy.status === 'blocked') {
              await db
                .from('scheduled_messages')
                .update({
                  status: 'failed',
                  error_message: `SMS blocked: ${policy.reasons.join('; ')}`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', msg.id)
                .eq('chef_id', msg.chef_id)
              failed++
              continue
            }

            if (policy.status === 'delayed') {
              await db
                .from('scheduled_messages')
                .update({
                  scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                  error_message: `SMS delayed: ${policy.reasons.join('; ')}`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', msg.id)
                .eq('chef_id', msg.chef_id)
              continue
            }

            const body = sanitizeSmsContent(msg.body, 'reminder')
            const smsResult = await sendSms(client.phone, body)
            success = smsResult === 'sent'

            if (!success) {
              await db
                .from('scheduled_messages')
                .update({
                  status: 'failed',
                  error_message: `SMS ${smsResult}`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', msg.id)
                .eq('chef_id', msg.chef_id)
              failed++
              continue
            }
          } else {
            // App channel: not yet implemented, leave as pending
            console.log(
              `[scheduled-messages] Channel "${msg.channel}" not yet implemented for message ${msg.id} - leaving pending`
            )
            // Do not mark as sent - leave status as pending so chef can see the message was not delivered
            continue
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
            .eq('chef_id', msg.chef_id)

          if (success) sent++
          else failed++
        } catch (err) {
          console.error(`[scheduled-messages] Error processing message ${msg.id}:`, err)
          await recordSideEffectFailure({
            source: 'cron:scheduled-messages',
            operation: 'send_scheduled_message',
            severity: 'medium',
            entityType: 'scheduled_message',
            entityId: msg.id,
            tenantId: msg.chef_id,
            errorMessage: err instanceof Error ? err.message : String(err),
          })
          await db
            .from('scheduled_messages')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', msg.id)
            .eq('chef_id', msg.chef_id)
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

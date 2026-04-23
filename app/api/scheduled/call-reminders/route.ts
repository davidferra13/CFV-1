// Call Reminder Cron Endpoint
// GET /api/scheduled/call-reminders - invoked by scheduled cron (every 30 min)
// POST /api/scheduled/call-reminders - manual invocation
//
// Sends chef reminder emails for calls happening in the next 24h or next 1h.
// Tracks sent reminders with reminder_24h_sent_at and reminder_1h_sent_at
// so each reminder fires at most once per call.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import {
  CALL_REMINDER_1H_EMAIL_REPAIR_KIND,
  CALL_REMINDER_24H_EMAIL_REPAIR_KIND,
} from '@/lib/monitoring/failure-repair'
import { sendCallReminderEmailDelivery } from '@/lib/calls/call-reminder-delivery'

async function handleCallReminders(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('call-reminders', async () => {
      const db = createServerClient({ admin: true })
      const now = new Date()

      // 24-hour window
      const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()
      const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString()

      const { data: calls24h, error: err24 } = await db
        .from('scheduled_calls')
        .select(
          `
      id, tenant_id, call_type, title, scheduled_at, duration_minutes, timezone,
      contact_name, contact_company, reminder_24h_sent_at,
      client:clients(id, full_name, email)
    `
        )
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', window24hStart)
        .lte('scheduled_at', window24hEnd)
        .is('reminder_24h_sent_at', null)

      // 1-hour window
      const window1hStart = new Date(now.getTime() + 45 * 60 * 1000).toISOString()
      const window1hEnd = new Date(now.getTime() + 75 * 60 * 1000).toISOString()

      const { data: calls1h, error: err1 } = await db
        .from('scheduled_calls')
        .select(
          `
      id, tenant_id, call_type, title, scheduled_at, duration_minutes, timezone,
      contact_name, contact_company, reminder_1h_sent_at,
      client:clients(id, full_name, email)
    `
        )
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', window1hStart)
        .lte('scheduled_at', window1hEnd)
        .is('reminder_1h_sent_at', null)

      if (err24) {
        console.error('[CallReminders] 24h query failed:', err24)
        throw new Error('Query failed (24h)')
      }
      if (err1) {
        console.error('[CallReminders] 1h query failed:', err1)
        throw new Error('Query failed (1h)')
      }

      let sent = 0
      let errors = 0

      // Send 24h reminders
      for (const call of calls24h ?? []) {
        try {
          const contactLabel =
            (call.client as any)?.full_name ??
            call.contact_name ??
            call.contact_company ??
            'your contact'

          const delivery = await sendCallReminderEmailDelivery({
            tenantId: call.tenant_id,
            callType: call.call_type,
            title: call.title ?? null,
            scheduledAt: call.scheduled_at,
            durationMinutes: call.duration_minutes,
            reminderType: '24h',
            contactLabel,
          })

          if (!delivery.emailSent) continue

          const reminderSentAt = new Date().toISOString()
          const { error: updateError } = await db
            .from('scheduled_calls')
            .update({ reminder_24h_sent_at: reminderSentAt })
            .eq('id', call.id)
            .eq('tenant_id', call.tenant_id)

          if (updateError) {
            await recordSideEffectFailure({
              source: 'cron:call-reminders',
              operation: 'mark_24h_reminder_sent',
              severity: 'high',
              entityType: 'scheduled_call',
              entityId: call.id,
              tenantId: call.tenant_id,
              errorMessage: updateError.message,
              context: { reminderSentAt },
            })
            errors++
            continue
          }

          sent++
        } catch (err) {
          console.error(`[CallReminders] 24h reminder failed for call ${call.id}:`, err)
          await recordSideEffectFailure({
            source: 'cron:call-reminders',
            operation: 'send_24h_reminder',
            severity: 'medium',
            entityType: 'scheduled_call',
            entityId: call.id,
            tenantId: call.tenant_id,
            errorMessage: err instanceof Error ? err.message : String(err),
            context: {
              repairKind: CALL_REMINDER_24H_EMAIL_REPAIR_KIND,
              reminderType: '24h',
              scheduledAt: call.scheduled_at,
            },
          })
          errors++
        }
      }

      // Send 1h reminders
      for (const call of calls1h ?? []) {
        try {
          const contactLabel =
            (call.client as any)?.full_name ??
            call.contact_name ??
            call.contact_company ??
            'your contact'

          const delivery = await sendCallReminderEmailDelivery({
            tenantId: call.tenant_id,
            callType: call.call_type,
            title: call.title ?? null,
            scheduledAt: call.scheduled_at,
            durationMinutes: call.duration_minutes,
            reminderType: '1h',
            contactLabel,
          })

          if (!delivery.emailSent) continue

          const reminderSentAt = new Date().toISOString()
          const { error: updateError } = await db
            .from('scheduled_calls')
            .update({ reminder_1h_sent_at: reminderSentAt })
            .eq('id', call.id)
            .eq('tenant_id', call.tenant_id)

          if (updateError) {
            await recordSideEffectFailure({
              source: 'cron:call-reminders',
              operation: 'mark_1h_reminder_sent',
              severity: 'high',
              entityType: 'scheduled_call',
              entityId: call.id,
              tenantId: call.tenant_id,
              errorMessage: updateError.message,
              context: { reminderSentAt },
            })
            errors++
            continue
          }

          sent++
        } catch (err) {
          console.error(`[CallReminders] 1h reminder failed for call ${call.id}:`, err)
          await recordSideEffectFailure({
            source: 'cron:call-reminders',
            operation: 'send_1h_reminder',
            severity: 'medium',
            entityType: 'scheduled_call',
            entityId: call.id,
            tenantId: call.tenant_id,
            errorMessage: err instanceof Error ? err.message : String(err),
            context: {
              repairKind: CALL_REMINDER_1H_EMAIL_REPAIR_KIND,
              reminderType: '1h',
              scheduledAt: call.scheduled_at,
            },
          })
          errors++
        }
      }

      return {
        processed_24h: (calls24h ?? []).length,
        processed_1h: (calls1h ?? []).length,
        sent,
        errors,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[call-reminders] Cron failed:', error)
    return NextResponse.json({ error: 'Call reminders failed' }, { status: 500 })
  }
}

export { handleCallReminders as GET, handleCallReminders as POST }

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import {
  sendEventReminder14dEmail,
  sendEventPrepareEmail,
  sendEventReminder2dEmail,
  sendEventReminderEmail,
} from '@/lib/email/notifications'

// Pre-Event Communication Workflow Cron
// Module: clients
// Runs daily. Sends reminder emails to clients at T-14d, T-7d, T-2d, T-1d.
// Uses existing email templates. Idempotent via communication_log check.

type ReminderWindow = {
  daysOut: number
  label: string
  send: (params: any) => Promise<void>
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  { daysOut: 14, label: '14d', send: sendEventReminder14dEmail },
  { daysOut: 7, label: '7d', send: sendEventPrepareEmail },
  { daysOut: 2, label: '2d', send: sendEventReminder2dEmail },
  { daysOut: 1, label: '1d', send: sendEventReminderEmail },
]

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await runMonitoredCronJob('pre-event-reminders', async () => {
      const db: any = createAdminClient()
      const sent: string[] = []
      const skipped: string[] = []

      for (const window of REMINDER_WINDOWS) {
        // Find confirmed/paid events exactly N days from now
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + window.daysOut)
        const dateStr = targetDate.toISOString().split('T')[0]

        const events = await db
          .from('events')
          .select(
            'id, tenant_id, client_id, occasion, event_date, serve_time, location, guest_count, special_requests, status'
          )
          .eq('event_date', dateStr)
          .in('status', ['confirmed', 'paid', 'accepted'])

        for (const event of events) {
          if (!event.client_id) continue

          // Idempotency: check if we already sent this reminder
          const existingLogs = await db
            .from('communication_log')
            .select('id')
            .eq('tenant_id', event.tenant_id)
            .eq('entity_type', 'event')
            .eq('entity_id', event.id)
            .eq('subject', `pre-event-${window.label}`)

          if (existingLogs.length > 0) {
            skipped.push(`${event.id}/${window.label}`)
            continue
          }

          // Get client + chef info
          const [clients, chefs] = await Promise.all([
            db.from('clients').select('id, full_name, email').eq('id', event.client_id),
            db.from('chefs').select('id, full_name').eq('id', event.tenant_id),
          ])

          const client = clients[0]
          const chef = chefs[0]
          if (!client?.email || !chef) continue

          try {
            await window.send({
              clientEmail: client.email,
              clientName: client.full_name || 'there',
              chefName: chef.full_name || 'Your Chef',
              occasion: event.occasion || 'Your Event',
              eventDate: event.event_date,
              serveTime: event.serve_time || null,
              arrivalTime: null,
              location: event.location || null,
              guestCount: event.guest_count || null,
              specialRequests: event.special_requests || null,
              eventId: event.id,
            })

            // Log to communication_log for idempotency + audit
            try {
              await db.from('communication_log').insert({
                tenant_id: event.tenant_id,
                client_id: event.client_id,
                channel: 'email',
                direction: 'outbound',
                subject: `pre-event-${window.label}`,
                content: `Pre-event reminder (${window.label}) sent for ${event.occasion || 'event'}`,
                entity_type: 'event',
                entity_id: event.id,
              })
            } catch (logErr) {
              console.error('[non-blocking] Communication log write failed', logErr)
            }

            sent.push(`${event.id}/${window.label}`)
          } catch (sendErr) {
            console.error(
              `[pre-event-reminders] Failed to send ${window.label} for event ${event.id}`,
              sendErr
            )
          }
        }
      }

      return { sent: sent.length, skipped: skipped.length, details: sent }
    })

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - start,
      result,
    })
  } catch (err) {
    console.error('[pre-event-reminders] Cron failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

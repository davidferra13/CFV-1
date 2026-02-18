// Scheduled Lifecycle Maintenance Cron Endpoint
// POST /api/scheduled/lifecycle — expires stale inquiries, handles periodic checks.
// Secured with CRON_SECRET bearer token.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const STALE_INQUIRY_DAYS = 30 // Expire after 30 days of no activity

export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })
  const results = {
    inquiriesExpired: 0,
    quotesExpired: 0,
    eventReminders: 0,
    errors: [] as string[],
  }

  // ── 1. Expire stale inquiries ─────────────────────────────────────────────
  // Inquiries in awaiting_client with no activity for STALE_INQUIRY_DAYS

  const staleCutoff = new Date(
    Date.now() - STALE_INQUIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  try {
    const { data: staleInquiries } = await supabase
      .from('inquiries')
      .select('id, tenant_id, client:clients(id, full_name)')
      .eq('status', 'awaiting_client')
      .lt('updated_at', staleCutoff)

    if (staleInquiries && staleInquiries.length > 0) {
      for (const inquiry of staleInquiries) {
        try {
          // Transition to expired (DB trigger logs to inquiry_state_transitions)
          await supabase
            .from('inquiries')
            .update({
              status: 'expired',
              follow_up_due_at: null,
              next_action_required: 'Auto-expired after 30 days of inactivity',
              next_action_by: null,
            })
            .eq('id', inquiry.id)
            .eq('tenant_id', inquiry.tenant_id)

          // Notify chef (non-blocking)
          try {
            const { createNotification, getChefAuthUserId } = await import(
              '@/lib/notifications/actions'
            )
            const chefUserId = await getChefAuthUserId(inquiry.tenant_id)
            if (chefUserId) {
              const clientName =
                (inquiry.client as { full_name: string } | null)?.full_name ??
                'Unknown contact'
              await createNotification({
                tenantId: inquiry.tenant_id,
                recipientId: chefUserId,
                category: 'inquiry',
                action: 'inquiry_expired',
                title: 'Inquiry expired',
                body: `Inquiry from ${clientName} expired after 30 days of inactivity`,
                actionUrl: `/inquiries/${inquiry.id}`,
                inquiryId: inquiry.id,
                clientId:
                  (inquiry.client as { id: string } | null)?.id || undefined,
              })
            }
          } catch {
            // Non-fatal
          }

          results.inquiriesExpired++
        } catch (err) {
          results.errors.push(
            `Expire inquiry ${inquiry.id}: ${(err as Error).message}`,
          )
        }
      }
    }
  } catch (err) {
    results.errors.push(`Stale inquiry query: ${(err as Error).message}`)
  }

  // ── 2. Expire stale quotes ────────────────────────────────────────────────
  // Quotes with expires_at in the past and status still 'sent'

  try {
    const { data: expiredQuotes } = await supabase
      .from('quotes')
      .select('id, tenant_id, inquiry_id')
      .eq('status', 'sent')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())

    if (expiredQuotes && expiredQuotes.length > 0) {
      for (const quote of expiredQuotes) {
        try {
          await supabase
            .from('quotes')
            .update({ status: 'expired' })
            .eq('id', quote.id)
            .eq('tenant_id', quote.tenant_id)

          results.quotesExpired++
        } catch (err) {
          results.errors.push(
            `Expire quote ${quote.id}: ${(err as Error).message}`,
          )
        }
      }
    }
  } catch (err) {
    results.errors.push(`Expired quotes query: ${(err as Error).message}`)
  }

  // ── 3. Send event reminder emails (24-hour window) ───────────────────────
  // Events happening tomorrow that are confirmed or in_progress

  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    const { data: upcomingEvents } = await supabase
      .from('events')
      .select(`
        id, tenant_id, occasion, event_date, serve_time, arrival_time,
        location_address, location_city, location_state,
        guest_count, special_requests,
        client:clients(id, email, full_name)
      `)
      .eq('event_date', tomorrowDate)
      .in('status', ['confirmed', 'in_progress'])

    if (upcomingEvents && upcomingEvents.length > 0) {
      const { sendEventReminderEmail, buildLocation } = await import('@/lib/email/notifications')

      for (const event of upcomingEvents) {
        try {
          const client = event.client as { id: string; email: string; full_name: string } | null
          if (!client?.email) continue

          // Get chef name
          const { data: chef } = await supabase
            .from('chefs')
            .select('business_name')
            .eq('id', event.tenant_id)
            .single()

          await sendEventReminderEmail({
            clientEmail: client.email,
            clientName: client.full_name,
            chefName: chef?.business_name || 'Your Chef',
            occasion: event.occasion || 'your event',
            eventDate: event.event_date,
            serveTime: event.serve_time,
            arrivalTime: event.arrival_time,
            location: buildLocation(event),
            guestCount: event.guest_count,
            specialRequests: event.special_requests,
          })

          results.eventReminders++
        } catch (err) {
          results.errors.push(
            `Reminder for event ${event.id}: ${(err as Error).message}`,
          )
        }
      }
    }
  } catch (err) {
    results.errors.push(`Event reminders: ${(err as Error).message}`)
  }

  return NextResponse.json(results)
}

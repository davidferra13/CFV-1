// @ts-nocheck
// Scheduled Lifecycle Maintenance Cron Endpoint
// GET /api/scheduled/lifecycle — invoked by Vercel Cron Job (Vercel sends GET)
// POST /api/scheduled/lifecycle — invoked manually or by external schedulers
// Expires stale inquiries/quotes and sends client event reminders.
// Respects chef_automation_settings per tenant and clients.automated_emails_enabled.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAutomationSettingsForTenant } from '@/lib/automations/settings-actions'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'

async function handleLifecycle(request: NextRequest): Promise<NextResponse> {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })
  const results = {
    inquiriesExpired: 0,
    inquiriesSkipped: 0,
    quotesExpired: 0,
    quotesSkipped: 0,
    eventReminders: 0,
    remindersSkipped: 0,
    quoteExpiryWarnings: 0,
    quotesNotified: 0,
    errors: [] as string[],
  }

  // ── 1. Expire stale inquiries ─────────────────────────────────────────
  // Uses each tenant's configured expiry window (default 30 days).
  // Skipped for tenants with inquiry_auto_expiry_enabled = false.

  try {
    const { data: candidateInquiries } = await supabase
      .from('inquiries')
      .select('id, tenant_id, updated_at, client:clients(id, full_name)')
      .eq('status', 'awaiting_client')

    if (candidateInquiries && candidateInquiries.length > 0) {
      for (const inquiry of candidateInquiries) {
        try {
          const tenantSettings = await getAutomationSettingsForTenant(inquiry.tenant_id)

          if (!tenantSettings.inquiry_auto_expiry_enabled) {
            results.inquiriesSkipped++
            continue
          }

          const staleCutoff = new Date(
            Date.now() - tenantSettings.inquiry_expiry_days * 24 * 60 * 60 * 1000
          ).toISOString()

          if (inquiry.updated_at >= staleCutoff) {
            // Not stale enough yet
            continue
          }

          // Transition to expired
          await supabase
            .from('inquiries')
            .update({
              status: 'expired',
              follow_up_due_at: null,
              next_action_required: `Auto-expired after ${tenantSettings.inquiry_expiry_days} days of inactivity`,
              next_action_by: null,
            })
            .eq('id', inquiry.id)
            .eq('tenant_id', inquiry.tenant_id)

          // Notify chef (non-blocking)
          try {
            const { createNotification, getChefAuthUserId } =
              await import('@/lib/notifications/actions')
            const chefUserId = await getChefAuthUserId(inquiry.tenant_id)
            if (chefUserId) {
              const clientName =
                (inquiry.client as { full_name: string } | null)?.full_name ?? 'Unknown contact'
              await createNotification({
                tenantId: inquiry.tenant_id,
                recipientId: chefUserId,
                category: 'inquiry',
                action: 'inquiry_expired',
                title: 'Inquiry expired',
                body: `Inquiry from ${clientName} expired after ${tenantSettings.inquiry_expiry_days} days of inactivity`,
                actionUrl: `/inquiries/${inquiry.id}`,
                inquiryId: inquiry.id,
                clientId: (inquiry.client as { id: string } | null)?.id || undefined,
              })
            }
          } catch {
            // Non-fatal
          }

          results.inquiriesExpired++
        } catch (err) {
          results.errors.push(`Expire inquiry ${inquiry.id}: ${(err as Error).message}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Stale inquiry query: ${(err as Error).message}`)
  }

  // ── 2. Expire stale quotes ────────────────────────────────────────────
  // Quotes with expires_at in the past and status still 'sent'.
  // Skipped for tenants with quote_auto_expiry_enabled = false.
  // Notifies both chef and client when a quote expires.

  try {
    const { data: expiredQuotes } = await supabase
      .from('quotes')
      .select(
        `
        id, tenant_id, inquiry_id, client_id,
        quote_name,
        client:clients(id, email, full_name, automated_emails_enabled)
      `
      )
      .eq('status', 'sent')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())

    if (expiredQuotes && expiredQuotes.length > 0) {
      for (const quote of expiredQuotes) {
        try {
          const tenantSettings = await getAutomationSettingsForTenant(quote.tenant_id)

          if (!tenantSettings.quote_auto_expiry_enabled) {
            results.quotesSkipped++
            continue
          }

          await supabase
            .from('quotes')
            .update({ status: 'expired' })
            .eq('id', quote.id)
            .eq('tenant_id', quote.tenant_id)

          results.quotesExpired++

          // Notify chef + client that quote expired (non-blocking)
          try {
            const client = quote.client as unknown as {
              id: string
              email: string
              full_name: string
              automated_emails_enabled: boolean
            } | null

            const { data: chef } = await supabase
              .from('chefs')
              .select('business_name, email')
              .eq('id', quote.tenant_id)
              .single()

            const quoteName = quote.quote_name || 'Quote'
            const clientName = client?.full_name ?? 'Client'

            // Notify chef via in-app + email
            const { createNotification, getChefAuthUserId } =
              await import('@/lib/notifications/actions')
            const { sendQuoteExpiredChefEmail, sendQuoteExpiredClientEmail } =
              await import('@/lib/email/notifications')

            const chefUserId = await getChefAuthUserId(quote.tenant_id)
            if (chefUserId) {
              await createNotification({
                tenantId: quote.tenant_id,
                recipientId: chefUserId,
                category: 'quote',
                action: 'quote_rejected' as const, // reuse closest available action
                title: 'Quote expired',
                body: `Your quote for ${clientName} expired without a response`,
                actionUrl: quote.inquiry_id ? `/inquiries/${quote.inquiry_id}` : '/inquiries',
                inquiryId: quote.inquiry_id ?? undefined,
                clientId: client?.id ?? undefined,
              })
            }

            if (chef?.email) {
              await sendQuoteExpiredChefEmail({
                chefEmail: chef.email,
                chefName: chef.business_name || 'Chef',
                clientName,
                quoteName,
                inquiryId: quote.inquiry_id ?? null,
              })
            }

            // Email client if they haven't opted out
            if (client?.email && client.automated_emails_enabled !== false) {
              await sendQuoteExpiredClientEmail({
                clientEmail: client.email,
                clientName: client.full_name,
                chefName: chef?.business_name || 'Your Chef',
                quoteName,
                chefEmail: chef?.email ?? null,
              })
            }

            results.quotesNotified++
          } catch (notifErr) {
            console.error(`[lifecycle] Quote expiry notification failed for ${quote.id}:`, notifErr)
          }
        } catch (err) {
          results.errors.push(`Expire quote ${quote.id}: ${(err as Error).message}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Expired quotes query: ${(err as Error).message}`)
  }

  // ── 3. Send event reminder emails (24-hour window) ───────────────────
  // Events happening tomorrow. Two opt-out levels:
  //   1. Chef: client_event_reminders_enabled = false → skip all for that tenant
  //   2. Client: automated_emails_enabled = false → skip that individual client

  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    const { data: upcomingEvents } = await supabase
      .from('events')
      .select(
        `
        id, tenant_id, occasion, event_date, serve_time, arrival_time,
        location_address, location_city, location_state,
        guest_count, special_requests,
        client:clients(id, email, full_name, automated_emails_enabled)
      `
      )
      .eq('event_date', tomorrowDate)
      .in('status', ['paid', 'confirmed', 'in_progress'])

    if (upcomingEvents && upcomingEvents.length > 0) {
      const { sendEventReminderEmail, buildLocation } = await import('@/lib/email/notifications')

      for (const event of upcomingEvents) {
        try {
          const client = event.client as unknown as {
            id: string
            email: string
            full_name: string
            automated_emails_enabled: boolean
          } | null

          if (!client?.email) continue

          // ── Chef-level opt-out ───────────────────────────────────────
          const tenantSettings = await getAutomationSettingsForTenant(event.tenant_id)
          if (!tenantSettings.client_event_reminders_enabled) {
            results.remindersSkipped++
            continue
          }

          // ── Client-level opt-out ─────────────────────────────────────
          if (client.automated_emails_enabled === false) {
            results.remindersSkipped++
            continue
          }

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
          results.errors.push(`Reminder for event ${event.id}: ${(err as Error).message}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Event reminders: ${(err as Error).message}`)
  }

  // ── 4. Send payment reminders ─────────────────────────────────────────
  // For events in 'accepted' status with unpaid/deposit_paid payment_status,
  // send reminder emails at 7 days, 3 days, and 1 day before the event.
  // Tracks which reminders were sent via payment_reminder_*d_sent_at columns.

  try {
    const today = new Date()
    const reminderThresholds = [
      { days: 7, column: 'payment_reminder_7d_sent_at' as const },
      { days: 3, column: 'payment_reminder_3d_sent_at' as const },
      { days: 1, column: 'payment_reminder_1d_sent_at' as const },
    ]

    // Fetch events that are accepted and unpaid, within the next 7 days
    const sevenDaysOut = new Date(today)
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
    const sevenDaysOutDate = sevenDaysOut.toISOString().split('T')[0]
    const todayDate = today.toISOString().split('T')[0]

    // Cast to any: payment_reminder_*_sent_at columns are new (from migration 20260228000006)
    // and types/database.ts doesn't reflect them yet. Will resolve after supabase gen types.
    const { data: unpaidEvents } = (await (supabase as any)
      .from('events')
      .select(
        `
        id, tenant_id, occasion, event_date, deposit_amount_cents, quoted_price_cents,
        payment_reminder_7d_sent_at, payment_reminder_3d_sent_at, payment_reminder_1d_sent_at,
        client:clients(id, email, full_name, automated_emails_enabled)
      `
      )
      .eq('status', 'accepted')
      .in('payment_status', ['unpaid', 'deposit_paid'])
      .gte('event_date', todayDate)
      .lte('event_date', sevenDaysOutDate)) as { data: any[] | null }

    const paymentReminderResults = { sent: 0, skipped: 0 }

    if (unpaidEvents && unpaidEvents.length > 0) {
      const { sendPaymentReminderEmail } = await import('@/lib/email/notifications')

      for (const event of unpaidEvents) {
        try {
          const client = event.client as {
            id: string
            email: string
            full_name: string
            automated_emails_enabled: boolean
          } | null

          if (!client?.email) continue

          // Chef-level opt-out
          const tenantSettings = await getAutomationSettingsForTenant(event.tenant_id)
          if (!tenantSettings.client_event_reminders_enabled) {
            paymentReminderResults.skipped++
            continue
          }

          // Client-level opt-out
          if (client.automated_emails_enabled === false) {
            paymentReminderResults.skipped++
            continue
          }

          const eventDateMs = new Date(event.event_date).getTime()
          const daysUntilEvent = Math.round((eventDateMs - today.getTime()) / (1000 * 60 * 60 * 24))

          // Get chef details
          const { data: chef } = await supabase
            .from('chefs')
            .select('business_name')
            .eq('id', event.tenant_id)
            .single()

          // Get outstanding balance
          const { data: financial } = await supabase
            .from('event_financial_summary')
            .select('outstanding_balance_cents')
            .eq('event_id', event.id)
            .single()

          const amountDueCents =
            financial?.outstanding_balance_cents ?? (event as any).quoted_price_cents ?? 0
          const depositCents = (event as any).deposit_amount_cents ?? 0

          for (const threshold of reminderThresholds) {
            if (daysUntilEvent > threshold.days) continue

            // Check if this reminder was already sent
            const alreadySent = (event as any)[threshold.column] !== null
            if (alreadySent) continue

            // Send the reminder (use actual days, not just the threshold bucket)
            await sendPaymentReminderEmail({
              clientEmail: client.email,
              clientName: client.full_name,
              chefName: chef?.business_name || 'Your Chef',
              occasion: event.occasion || 'your event',
              eventDate: event.event_date,
              daysUntilEvent: daysUntilEvent,
              amountDueCents,
              depositAmountCents: depositCents > 0 ? depositCents : null,
              eventId: event.id,
            })

            // Mark as sent
            // Cast to any: new column not yet in generated types
            await (supabase as any)
              .from('events')
              .update({ [threshold.column]: new Date().toISOString() })
              .eq('id', event.id)
              .eq('tenant_id', event.tenant_id)

            paymentReminderResults.sent++
            break // Only send the most-urgent threshold per cron run
          }
        } catch (err) {
          results.errors.push(`Payment reminder for event ${event.id}: ${(err as Error).message}`)
        }
      }
    }

    results.eventReminders += paymentReminderResults.sent
    results.remindersSkipped += paymentReminderResults.skipped
  } catch (err) {
    results.errors.push(`Payment reminders: ${(err as Error).message}`)
  }

  // ── 5. Send 30d/14d/7d/2d/1d pre-event reminder emails ──────────────────
  // Mirrors the payment reminder pattern (Section 4) using dedup columns:
  // client_reminder_30d_sent_at, client_reminder_14d_sent_at,
  // client_reminder_7d_sent_at, client_reminder_2d_sent_at, client_reminder_1d_sent_at
  //
  // 30d and 14d added in migration 20260322000026; 7d/2d/1d from 20260303000015.
  // Each interval can be independently toggled via chef_automation_settings.

  try {
    const today5 = new Date()
    const thirtyDaysOut5 = new Date(today5)
    thirtyDaysOut5.setDate(thirtyDaysOut5.getDate() + 30)

    const reminderThresholds5 = [
      {
        days: 30,
        column: 'client_reminder_30d_sent_at',
        sendFn: 'sendEventReminder30dEmail',
        settingsKey: 'event_reminder_30d_enabled',
      },
      {
        days: 14,
        column: 'client_reminder_14d_sent_at',
        sendFn: 'sendEventReminder14dEmail',
        settingsKey: 'event_reminder_14d_enabled',
      },
      {
        days: 7,
        column: 'client_reminder_7d_sent_at',
        sendFn: 'sendEventPrepareEmail',
        settingsKey: 'event_reminder_7d_enabled',
      },
      {
        days: 2,
        column: 'client_reminder_2d_sent_at',
        sendFn: 'sendEventReminder2dEmail',
        settingsKey: 'event_reminder_2d_enabled',
      },
      {
        days: 1,
        column: 'client_reminder_1d_sent_at',
        sendFn: 'sendEventReminderEmail',
        settingsKey: 'event_reminder_1d_enabled',
      },
    ] as const

    const todayDate5 = today5.toISOString().split('T')[0]
    const thirtyDaysOutDate5 = thirtyDaysOut5.toISOString().split('T')[0]

    // Cast to any: new columns not yet in generated types
    const { data: upcomingEvents5 } = (await (supabase as any)
      .from('events')
      .select(
        `
        id, tenant_id, occasion, event_date, serve_time, arrival_time,
        location_address, location_city, location_state,
        guest_count, special_requests,
        client_reminder_30d_sent_at, client_reminder_14d_sent_at,
        client_reminder_7d_sent_at, client_reminder_2d_sent_at, client_reminder_1d_sent_at,
        client:clients(id, email, full_name, automated_emails_enabled)
      `
      )
      .in('status', ['paid', 'confirmed', 'in_progress'])
      .gte('event_date', todayDate5)
      .lte('event_date', thirtyDaysOutDate5)) as { data: any[] | null }

    if (upcomingEvents5 && upcomingEvents5.length > 0) {
      const {
        sendEventReminder30dEmail,
        sendEventReminder14dEmail,
        sendEventPrepareEmail,
        sendEventReminder2dEmail,
        sendEventReminderEmail,
        buildLocation,
      } = await import('@/lib/email/notifications')

      for (const event of upcomingEvents5) {
        try {
          const client = event.client as {
            id: string
            email: string
            full_name: string
            automated_emails_enabled: boolean
          } | null

          if (!client?.email) continue

          // Chef-level opt-out
          const tenantSettings = await getAutomationSettingsForTenant(event.tenant_id)
          if (!tenantSettings.client_event_reminders_enabled) {
            results.remindersSkipped++
            continue
          }

          // Client-level opt-out
          if (client.automated_emails_enabled === false) {
            results.remindersSkipped++
            continue
          }

          const { data: chef } = await supabase
            .from('chefs')
            .select('business_name')
            .eq('id', event.tenant_id)
            .single()

          const chefName5 = chef?.business_name || 'Your Chef'
          const occasion5 = event.occasion || 'your event'
          const location5 = buildLocation(event)

          const eventDateMs5 = new Date(event.event_date).getTime()
          const daysUntilEvent5 = Math.round(
            (eventDateMs5 - today5.getTime()) / (1000 * 60 * 60 * 24)
          )

          for (const threshold of reminderThresholds5) {
            if (daysUntilEvent5 > threshold.days) continue

            const alreadySent = (event as any)[threshold.column] !== null
            if (alreadySent) continue

            // Per-interval opt-out check
            if (!(tenantSettings as any)[threshold.settingsKey]) continue

            // Send the appropriate email
            if (threshold.sendFn === 'sendEventReminder30dEmail') {
              await sendEventReminder30dEmail({
                clientEmail: client.email,
                clientName: client.full_name,
                chefName: chefName5,
                occasion: occasion5,
                eventDate: event.event_date,
                guestCount: event.guest_count ?? null,
                location: location5,
                eventId: event.id,
              })
            } else if (threshold.sendFn === 'sendEventReminder14dEmail') {
              await sendEventReminder14dEmail({
                clientEmail: client.email,
                clientName: client.full_name,
                chefName: chefName5,
                occasion: occasion5,
                eventDate: event.event_date,
                serveTime: event.serve_time ?? null,
                guestCount: event.guest_count ?? null,
                location: location5,
                specialRequests: event.special_requests ?? null,
                eventId: event.id,
              })
            } else if (threshold.sendFn === 'sendEventPrepareEmail') {
              await sendEventPrepareEmail({
                clientEmail: client.email,
                clientName: client.full_name,
                chefName: chefName5,
                occasion: occasion5,
                eventDate: event.event_date,
                serveTime: event.serve_time ?? null,
                arrivalTime: event.arrival_time ?? null,
                location: location5,
                guestCount: event.guest_count ?? null,
                eventId: event.id,
              })
            } else if (threshold.sendFn === 'sendEventReminder2dEmail') {
              await sendEventReminder2dEmail({
                clientEmail: client.email,
                clientName: client.full_name,
                chefName: chefName5,
                occasion: occasion5,
                eventDate: event.event_date,
                serveTime: event.serve_time ?? null,
                arrivalTime: event.arrival_time ?? null,
                location: location5,
                guestCount: event.guest_count ?? null,
                specialRequests: event.special_requests ?? null,
                eventId: event.id,
              })
            } else {
              // 1-day reminder — reuse existing sendEventReminderEmail
              await sendEventReminderEmail({
                clientEmail: client.email,
                clientName: client.full_name,
                chefName: chefName5,
                occasion: occasion5,
                eventDate: event.event_date,
                serveTime: event.serve_time ?? null,
                arrivalTime: event.arrival_time ?? null,
                location: location5,
                guestCount: event.guest_count ?? null,
                specialRequests: event.special_requests ?? null,
              })
            }

            // Mark as sent
            await (supabase as any)
              .from('events')
              .update({ [threshold.column]: new Date().toISOString() })
              .eq('id', event.id)
              .eq('tenant_id', event.tenant_id)

            results.eventReminders++
            break // Only send the most urgent threshold per cron run
          }
        } catch (err) {
          results.errors.push(`Pre-event reminder for event ${event.id}: ${(err as Error).message}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Pre-event reminders: ${(err as Error).message}`)
  }

  // ── 6. Send quote expiry warning emails (48-hour window) ─────────────────
  // Queries quotes with status='sent' and valid_until within the next 48 hours
  // that haven't had a warning sent yet (expiry_warning_sent_at IS NULL).
  // Added in migration 20260303000015.

  try {
    const now6 = new Date()
    const fortyEightHoursOut6 = new Date(now6.getTime() + 48 * 60 * 60 * 1000)

    // Cast to any: expiry_warning_sent_at column not yet in generated types
    const { data: expiringQuotes } = (await (supabase as any)
      .from('quotes')
      .select(
        `
        id, tenant_id, total_quoted_cents, valid_until,
        inquiry_id, event_id, client_id,
        expiry_warning_sent_at
      `
      )
      .eq('status', 'sent')
      .not('valid_until', 'is', null)
      .gte('valid_until', now6.toISOString())
      .lte('valid_until', fortyEightHoursOut6.toISOString())
      .is('expiry_warning_sent_at', null)) as { data: any[] | null }

    if (expiringQuotes && expiringQuotes.length > 0) {
      const { sendQuoteExpiringEmail } = await import('@/lib/email/notifications')
      const { createClientNotification } = await import('@/lib/notifications/client-actions')

      for (const quote of expiringQuotes) {
        try {
          // Chef-level opt-out
          const tenantSettings = await getAutomationSettingsForTenant(quote.tenant_id)
          if (!tenantSettings.client_event_reminders_enabled) continue

          // Fetch client
          const { data: client } = await supabase
            .from('clients')
            .select('id, email, full_name, automated_emails_enabled')
            .eq('id', quote.client_id)
            .single()

          if (!client?.email) continue

          // Client-level opt-out
          if (client.automated_emails_enabled === false) continue

          // Fetch chef name
          const { data: chef } = await supabase
            .from('chefs')
            .select('business_name')
            .eq('id', quote.tenant_id)
            .single()

          // Fetch occasion from inquiry or event
          let occasion6: string | null = null
          if (quote.inquiry_id) {
            const { data: inq } = await supabase
              .from('inquiries')
              .select('confirmed_occasion')
              .eq('id', quote.inquiry_id)
              .single()
            occasion6 = inq?.confirmed_occasion ?? null
          }
          if (!occasion6 && quote.event_id) {
            const { data: evt } = await supabase
              .from('events')
              .select('occasion')
              .eq('id', quote.event_id)
              .single()
            occasion6 = evt?.occasion ?? null
          }

          await sendQuoteExpiringEmail({
            clientEmail: client.email,
            clientName: client.full_name,
            chefName: chef?.business_name || 'Your Chef',
            occasion: occasion6,
            validUntil: quote.valid_until,
            totalCents: quote.total_quoted_cents,
            quoteId: quote.id,
          })

          // In-app notification (non-blocking — silently skips if no portal account)
          await createClientNotification({
            tenantId: quote.tenant_id,
            clientId: client.id,
            category: 'quote',
            action: 'quote_expiring_soon',
            title: 'Your quote expires soon',
            body: `The quote for ${occasion6 || 'your event'} expires in less than 48 hours.`,
            actionUrl: `/my-quotes/${quote.id}`,
            inquiryId: quote.inquiry_id ?? undefined,
          })

          // Mark warning as sent
          await (supabase as any)
            .from('quotes')
            .update({ expiry_warning_sent_at: new Date().toISOString() })
            .eq('id', quote.id)
            .eq('tenant_id', quote.tenant_id)

          results.quoteExpiryWarnings++
        } catch (err) {
          results.errors.push(
            `Quote expiry warning for quote ${quote.id}: ${(err as Error).message}`
          )
        }
      }
    }
  } catch (err) {
    results.errors.push(`Quote expiry warnings: ${(err as Error).message}`)
  }

  // ── 7. Send automated post-event review requests (3–10 days post-completion) ──
  // Finds events that completed 3–10 days ago without a review request yet.
  // Sends a warm, template-based review request email. Chef can still send
  // the AI-crafted version manually from the event detail page.

  const reviewResults = { sent: 0, skipped: 0 }

  try {
    const now7 = new Date()
    const tenDaysAgo = new Date(now7.getTime() - 10 * 86_400_000).toISOString().split('T')[0]
    const threeDaysAgo = new Date(now7.getTime() - 3 * 86_400_000).toISOString().split('T')[0]

    const { data: completedEvents } = (await (supabase as any)
      .from('events')
      .select(
        `
        id, tenant_id, occasion, event_date, guest_count,
        review_request_sent_at,
        client:clients(id, email, full_name, automated_emails_enabled)
      `
      )
      .eq('status', 'completed')
      .is('review_request_sent_at', null)
      .gte('event_date', tenDaysAgo)
      .lte('event_date', threeDaysAgo)) as { data: any[] | null }

    if (completedEvents && completedEvents.length > 0) {
      for (const event of completedEvents) {
        try {
          const client = event.client as {
            id: string
            email: string
            full_name: string
            automated_emails_enabled: boolean
          } | null

          if (!client?.email) continue

          // Chef-level opt-out
          const tenantSettings = await getAutomationSettingsForTenant(event.tenant_id)
          if (!tenantSettings.client_event_reminders_enabled) {
            reviewResults.skipped++
            continue
          }

          // Client-level opt-out
          if (client.automated_emails_enabled === false) {
            reviewResults.skipped++
            continue
          }

          // Get chef name
          const { data: chef } = await supabase
            .from('chefs')
            .select('business_name, full_name')
            .eq('id', event.tenant_id)
            .single()

          const chefName = (chef as any)?.business_name || (chef as any)?.full_name || 'Your Chef'
          const firstName = client.full_name.split(' ')[0]
          const occasion = event.occasion || 'your dinner'
          const eventDateLabel = new Date(event.event_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          })

          const { sendEmail } = await import('@/lib/email/send')
          const { CampaignEmail } = await import('@/lib/email/templates/campaign')
          const React = await import('react')

          const body = `Hi ${firstName},

I've been thinking about ${occasion} on ${eventDateLabel} — it was genuinely one of my favorite evenings.

If you have a moment, I'd love it if you left a quick review on Google. It means a lot and helps others find me.

Thank you again for having me.

${chefName}`

          await sendEmail({
            to: client.email,
            subject: `Thank you for having me — would you leave a quick review?`,
            react: React.default.createElement(CampaignEmail, {
              chefName,
              bodyText: body,
              previewText: `It was a pleasure cooking for you — a quick review would mean a lot.`,
              unsubscribeUrl: '',
            }),
          })

          // Mark as sent
          await (supabase as any)
            .from('events')
            .update({ review_request_sent_at: now7.toISOString() })
            .eq('id', event.id)
            .eq('tenant_id', event.tenant_id)

          reviewResults.sent++
        } catch (err) {
          results.errors.push(`Review request for event ${event.id}: ${(err as Error).message}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Review requests: ${(err as Error).message}`)
  }

  await recordCronHeartbeat('lifecycle', { ...results, ...reviewResults } as Record<
    string,
    unknown
  >)
  return NextResponse.json({
    ...results,
    reviewRequestsSent: reviewResults.sent,
    reviewRequestsSkipped: reviewResults.skipped,
  })
}

export { handleLifecycle as GET, handleLifecycle as POST }

// Post-Event Follow-Up Jobs - Inngest Background Functions
//
// These jobs run on a delayed schedule after an event is marked as completed:
//   - Guest feedback:    1 day after completion  (to event guests, not the host client)
//   - Thank-you email:   3 days after completion
//   - Review request:    7 days after completion
//   - Referral ask:     14 days after completion
//
// Each job:
//   1. Looks up the event and client from the database
//   2. Skips if the event was cancelled or client opted out of marketing
//   3. Sends the email via the existing Resend-based email system
//   4. Logs success/failure
//
// All jobs are non-blocking side effects - failures are logged, never thrown.

import { inngest } from './inngest-client'
import { createAdminClient } from '@/lib/db/admin'
import { createLogger } from '@/lib/logger'

const log = createLogger('inngest-jobs')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/**
 * Shared helper: fetch event + client + chef data for a post-event job.
 * Returns null if the job should be skipped (cancelled event, no client email,
 * client opted out of marketing, etc).
 */
async function getPostEventContext(eventId: string, tenantId: string, clientId: string) {
  const db: any = createAdminClient()

  // Fetch event - verify it's still completed (not somehow cancelled after trigger)
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, status, occasion, event_date, tenant_id, client_id')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    log.warn('Post-event job: event not found', { context: { eventId, error: eventErr } })
    return null
  }

  if (event.status === 'cancelled') {
    log.info('Post-event job: skipping - event was cancelled', { context: { eventId } })
    return null
  }

  // Fetch client
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id, email, full_name, marketing_unsubscribed, loyalty_tier, loyalty_points')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) {
    log.warn('Post-event job: client not found', { context: { clientId, error: clientErr } })
    return null
  }

  if (!client.email) {
    log.info('Post-event job: skipping - client has no email', { context: { clientId } })
    return null
  }

  if (client.marketing_unsubscribed) {
    log.info('Post-event job: skipping - client opted out of marketing', {
      context: { clientId },
    })
    return null
  }

  // Fetch chef/business name
  const { data: chef } = await db.from('chefs').select('business_name').eq('id', tenantId).single()

  const { data: loyaltyEarnRows } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .in('type', ['earned', 'bonus'])

  const loyaltyPointsEarned = (loyaltyEarnRows || []).reduce(
    (sum: any, row: any) => sum + (row.points || 0),
    0
  )

  return {
    event,
    client: {
      email: client.email,
      name: client.full_name || 'there',
    },
    chefName: chef?.business_name || 'Your Chef',
    occasion: event.occasion || 'your event',
    eventDate: event.event_date,
    loyalty: {
      tier: (client as any).loyalty_tier ?? null,
      pointsBalance: (client as any).loyalty_points ?? null,
      pointsEarned: loyaltyPointsEarned,
    },
  }
}

// ─── Job 0: Weather Snapshot (immediate on completion) ─────────────────────
//
// Captures weather conditions for the event location/date right when the event
// is marked complete. Non-blocking: failures are logged, never thrown.

export const postEventWeatherSnapshot = inngest.createFunction(
  {
    id: 'post-event-weather-snapshot',
    name: 'Post-Event Weather Snapshot Capture',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    const result = await step.run('capture-weather-snapshot', async () => {
      try {
        const { captureWeatherSnapshot } = await import(
          '@/lib/weather/weather-snapshot-actions'
        )
        const outcome = await captureWeatherSnapshot(
          event.data.tenantId,
          event.data.eventId
        )
        log.info('Weather snapshot capture attempted', {
          context: { eventId: event.data.eventId, outcome },
        })
        return outcome
      } catch (err) {
        log.warn('Weather snapshot capture failed (non-blocking)', {
          context: {
            eventId: event.data.eventId,
            error: err instanceof Error ? err.message : String(err),
          },
        })
        return { captured: false, error: 'exception in capture' }
      }
    })

    return result
  }
)

// ─── Job 1: Thank-You Email (3 days after completion) ───────────────────────

export const postEventThankYou = inngest.createFunction(
  {
    id: 'post-event-thank-you',
    name: 'Post-Event Thank You Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 3 days
    await step.sleep('wait-3-days', '3d')

    const result = await step.run('send-thank-you-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      // Look up circle for this event to include join CTA
      let circleJoinUrl: string | null = null
      let circleGroupName: string | null = null
      try {
        const { getCircleForEvent } = await import('@/lib/hub/circle-lookup')
        const circle = await getCircleForEvent(event.data.eventId)
        if (circle) {
          const { createServerClient } = await import('@/lib/db/server')
          const db: any = createServerClient({ admin: true })

          // Check if client is already a member via email
          const { data: clientProfile } = await db
            .from('hub_guest_profiles')
            .select('id')
            .eq('email', ctx.client.email)
            .limit(1)
            .maybeSingle()

          let alreadyMember = false
          if (clientProfile) {
            const { data: membership } = await db
              .from('hub_group_members')
              .select('id')
              .eq('group_id', circle.groupId)
              .eq('profile_id', clientProfile.id)
              .maybeSingle()
            alreadyMember = !!membership
          }

          if (!alreadyMember) {
            circleJoinUrl = `${APP_URL}/hub/join/${circle.groupToken}`

            const { data: groupData } = await db
              .from('hub_groups')
              .select('name')
              .eq('id', circle.groupId)
              .single()
            circleGroupName = groupData?.name ?? null
          }
        }
      } catch (err) {
        console.error('[non-blocking] Circle lookup for thank-you email failed', err)
      }

      const { sendPostEventThankYouEmail } = await import('@/lib/email/notifications')

      await sendPostEventThankYouEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        bookAgainUrl: `${APP_URL}/book`,
        loyaltyTier: ctx.loyalty.tier,
        loyaltyPointsEarned: ctx.loyalty.pointsEarned,
        loyaltyPointsBalance: ctx.loyalty.pointsBalance,
        circleJoinUrl,
        circleGroupName,
      })

      log.info('Post-event thank-you email sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 2: Review Request (48 hours after completion) ──────────────────────

export const postEventReviewRequest = inngest.createFunction(
  {
    id: 'post-event-review-request',
    name: 'Post-Event Review Request Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 48 hours
    await step.sleep('wait-48-hours', '48h')

    const result = await step.run('send-review-request-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const { sendPostEventReviewRequestEmail } = await import('@/lib/email/notifications')

      await sendPostEventReviewRequestEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        reviewUrl: `${APP_URL}/my-events/${event.data.eventId}#review`,
      })

      log.info('Post-event review request email sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 3: Referral Ask (14 days after completion) ─────────────────────────

export const postEventReferralAsk = inngest.createFunction(
  {
    id: 'post-event-referral-ask',
    name: 'Post-Event Referral Ask Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 14 days
    await step.sleep('wait-14-days', '14d')

    const result = await step.run('send-referral-ask-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const { sendPostEventReferralAskEmail } = await import('@/lib/email/notifications')

      await sendPostEventReferralAskEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        bookingUrl: `${APP_URL}/book`,
      })

      log.info('Post-event referral ask email sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 4: Tip Prompt (2 days after completion) ──────────────────────────
//
// Auto-creates a tip_request row (Uber-style) and emails the client a link
// to the public /tip/[token] page. Skips if a tip request already exists.

export const postEventTipPrompt = inngest.createFunction(
  {
    id: 'post-event-tip-prompt',
    name: 'Post-Event Tip Prompt Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 2 days
    await step.sleep('wait-2-days', '2d')

    const result = await step.run('create-tip-request-and-send', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const db: any = createAdminClient()

      // Check if tip request already exists (chef may have manually created one)
      const { data: existing } = await db
        .from('tip_requests')
        .select('id')
        .eq('event_id', event.data.eventId)
        .eq('tenant_id', event.data.tenantId)
        .maybeSingle()

      if (existing) {
        return { skipped: true, reason: 'tip request already exists' }
      }

      // Create tip request row
      const { data: tipRequest, error: tipError } = await db
        .from('tip_requests')
        .insert({
          tenant_id: event.data.tenantId,
          event_id: event.data.eventId,
          client_id: event.data.clientId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select('request_token')
        .single()

      if (tipError || !tipRequest?.request_token) {
        log.warn('Failed to create tip request (non-blocking)', {
          context: { eventId: event.data.eventId, error: tipError },
        })
        return { skipped: true, reason: 'tip request creation failed' }
      }

      const { sendPostEventTipEmail } = await import('@/lib/email/notifications')

      await sendPostEventTipEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        tipUrl: `${APP_URL}/tip/${tipRequest.request_token}`,
      })

      log.info('Post-event tip prompt sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 5: Guest Feedback Request (1 day after completion) ─────────────────
//
// Unlike jobs 1-3 which target the host client, this job targets the event
// guests. It creates guest_feedback rows (with unique tokens) for all
// attending guests who have email addresses, then emails each one a link
// to the public /guest-feedback/[token] page.
//
// Guests are not subject to the marketing opt-out check - this is a direct
// service follow-up, not marketing.

export const postEventGuestFeedback = inngest.createFunction(
  {
    id: 'post-event-guest-feedback',
    name: 'Post-Event Guest Feedback Request',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 1 day - give guests time to settle before asking for feedback
    await step.sleep('wait-1-day', '1d')

    const result = await step.run('send-guest-feedback-emails', async () => {
      const db: any = (await import('@/lib/db/admin')).createAdminClient()

      // Verify event is still completed
      const { data: evt } = await db
        .from('events')
        .select('id, status, occasion, tenant_id')
        .eq('id', event.data.eventId)
        .single()

      if (!evt || evt.status === 'cancelled') {
        return { skipped: true, reason: 'event not found or cancelled' }
      }

      // Fetch chef name for the email
      const { data: chef } = await db
        .from('chefs')
        .select('business_name')
        .eq('id', event.data.tenantId)
        .single()

      const chefName: string = chef?.business_name || 'Your Chef'
      const occasion: string = event.data.occasion || 'your event'

      // Create feedback rows + get back tokens
      const { createGuestFeedbackForEventByTenant } = await import('@/lib/sharing/actions')
      const feedbackRows = await createGuestFeedbackForEventByTenant(
        event.data.eventId,
        event.data.tenantId
      )

      if (feedbackRows.length === 0) {
        return { skipped: true, reason: 'no attending guests with email addresses' }
      }

      // Send each guest their unique feedback link
      const { sendGuestFeedbackEmail } = await import('@/lib/email/notifications')
      let sent = 0
      const errors: string[] = []

      for (const row of feedbackRows) {
        try {
          await sendGuestFeedbackEmail({
            guestEmail: row.guestEmail,
            guestName: row.guestName,
            chefName,
            occasion,
            feedbackUrl: `${APP_URL}/guest-feedback/${row.token}`,
          })
          sent++
        } catch (err) {
          errors.push(`${row.guestEmail}: ${err instanceof Error ? err.message : String(err)}`)
          log.warn('Guest feedback email failed (non-blocking)', {
            context: { guestEmail: row.guestEmail, error: err },
          })
        }
      }

      log.info('Post-event guest feedback emails sent', {
        context: {
          eventId: event.data.eventId,
          totalGuests: feedbackRows.length,
          sent,
          errors: errors.length,
        },
      })

      return { sent, total: feedbackRows.length, errors }
    })

    return result
  }
)

// ─── Job 5: Review Reminder (7 days after completion, if no review yet) ─────

export const postEventReviewReminder = inngest.createFunction(
  {
    id: 'post-event-review-reminder',
    name: 'Post-Event Review Reminder (One-Time)',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 7 days (5 days after the initial 48h request)
    await step.sleep('wait-7-days-for-reminder', '7d')

    const result = await step.run('send-review-reminder-if-needed', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const db: any = createAdminClient()

      // Check if a review was already submitted (client_reviews or testimonials)
      const { data: existingReview } = await db
        .from('client_reviews')
        .select('id')
        .eq('event_id', event.data.eventId)
        .limit(1)
        .single()

      if (existingReview) {
        return { skipped: true, reason: 'review already submitted (client_reviews)' }
      }

      // Also check testimonials table for token-based submissions
      const { data: existingTestimonial } = await db
        .from('testimonials')
        .select('id, submitted_at')
        .eq('event_id', event.data.eventId)
        .not('submitted_at', 'is', null)
        .limit(1)
        .single()

      if (existingTestimonial) {
        return { skipped: true, reason: 'review already submitted (testimonials)' }
      }

      // Check for a reminder_sent flag to ensure one reminder only
      const { data: testimonialRow } = await db
        .from('testimonials')
        .select('id, reminder_sent_at')
        .eq('event_id', event.data.eventId)
        .single()

      if (testimonialRow?.reminder_sent_at) {
        return { skipped: true, reason: 'reminder already sent' }
      }

      const { sendPostEventReviewRequestEmail } = await import('@/lib/email/notifications')

      await sendPostEventReviewRequestEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        reviewUrl: `${APP_URL}/my-events/${event.data.eventId}#review`,
      })

      // Mark reminder as sent (if testimonial row exists)
      if (testimonialRow) {
        await db
          .from('testimonials')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', testimonialRow.id)
      }

      log.info('Post-event review reminder sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 7: Guest Conversion Email (3 days after positive feedback) ────────
//
// When a guest rates 4+ stars, wait 3 days then send a "book your own dinner"
// email. Only sends to guests who are NOT already clients of the chef and
// have not already submitted an inquiry.

export const postGuestFeedbackConversion = inngest.createFunction(
  {
    id: 'post-guest-feedback-conversion',
    name: 'Guest Conversion Email (Positive Feedback)',
    retries: 2,
  },
  { event: 'chefflow/guest-feedback.positive' },
  async ({ event, step }) => {
    // Wait 3 days before sending conversion email
    await step.sleep('wait-3-days-conversion', '3d')

    const result = await step.run('send-guest-conversion-email', async () => {
      const db: any = createAdminClient()
      const {
        eventId,
        tenantId,
        guestEmail,
        guestName,
      } = event.data

      // Check: is this guest already a client of the chef?
      const { data: existingClient } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('email', guestEmail.toLowerCase().trim())
        .maybeSingle()

      if (existingClient) {
        log.info('Guest conversion: skipping, guest is already a client', {
          context: { guestEmail, tenantId },
        })
        return { skipped: true, reason: 'guest is already a client' }
      }

      // Check: has the guest already submitted an inquiry?
      const { data: existingInquiry } = await db
        .from('inquiries')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('contact_email', guestEmail.toLowerCase().trim())
        .limit(1)
        .maybeSingle()

      if (existingInquiry) {
        log.info('Guest conversion: skipping, guest already has an inquiry', {
          context: { guestEmail, tenantId },
        })
        return { skipped: true, reason: 'guest already has an inquiry' }
      }

      // Also check via client_id linkage
      const { data: clientInquiry } = await db
        .from('inquiries')
        .select('id, client:clients!inner(email)')
        .eq('tenant_id', tenantId)
        .ilike('clients.email' as any, guestEmail.toLowerCase().trim())
        .limit(1)
        .maybeSingle()

      if (clientInquiry) {
        log.info('Guest conversion: skipping, guest has inquiry via client record', {
          context: { guestEmail, tenantId },
        })
        return { skipped: true, reason: 'guest has inquiry via client record' }
      }

      // Fetch chef details for the email
      const { data: chef } = await db
        .from('chefs')
        .select('business_name, booking_slug')
        .eq('id', tenantId)
        .single()

      const chefName: string = chef?.business_name || 'Your Chef'
      const chefSlug: string | null = chef?.booking_slug ?? null

      // Fetch event occasion for context
      const { data: evt } = await db
        .from('events')
        .select('occasion')
        .eq('id', eventId)
        .single()

      const occasion: string = evt?.occasion || 'your recent dinner'

      if (!chefSlug) {
        log.warn('Guest conversion: skipping, chef has no booking slug', {
          context: { tenantId },
        })
        return { skipped: true, reason: 'chef has no booking slug' }
      }

      const inquiryUrl = `${APP_URL}/chef/${chefSlug}/inquire?ref=guest-feedback&via=${encodeURIComponent(guestName)}&source_event_id=${eventId}`

      const { sendGuestConversionEmail } = await import('@/lib/email/notifications')

      await sendGuestConversionEmail({
        guestEmail,
        guestName,
        chefName,
        occasion,
        inquiryUrl,
      })

      log.info('Guest conversion email sent', {
        context: { eventId, guestEmail, tenantId },
      })

      return { sent: true, to: guestEmail }
    })

    return result
  }
)
